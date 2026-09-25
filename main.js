const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let win = null;
let timer = null;
let logPath = null;
let position = 0;
let partial = '';
let capturing = true;

const stats = { bytesRead:0, linesRead:0, relevant:0, samples:0, startedAt:null };
const relevantLines = [];
const samples = [];
const MAX_RELEVANT = 4000;
const MAX_SAMPLES = 2500;
let sampleEvery = 250;

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}
function localBase() {
  return process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
}
function possibleLogs() {
  return [
    path.join(localBase(),'DeadByDaylight','Saved','Logs','DeadByDaylight.log'),
    path.join(localBase(),'DeadByDaylight','Saved','Logs','DeadByDaylight-backup.log')
  ];
}
function findLog() { return possibleLogs().find(fs.existsSync) || possibleLogs()[0]; }
function emitStatus(message) { send('status',{message,logPath,time:new Date().toISOString()}); }
function emitStats() { send('stats',{...stats,relevantStored:relevantLines.length,samplesStored:samples.length}); }

const keywords = /map|realm|level|world|procedural|travel|trial|match|gameplay|persistent|load|gameinstance|gamemode|environment|theme|tile|spawn|lobby|session|transition|streaming|package|asset|dedicated|server/i;

function mapCandidate(line) {
  const patterns = [
    /(?:MapName|SelectedMap|LevelName|PersistentLevel|WorldName)\s*[:=]\s*["']?([^,"'\]\[\r\n]+)/i,
    /(?:LoadMap|Loading map|Travel(?:ing)? to)\s*[:=]?\s*["']?([^,"'\]\[\r\n]+)/i,
    /\/Game\/(?:[^\/\s"'.,]+\/)+([^\/\s"'.,]+)/i
  ];
  for (const re of patterns) {
    const m=line.match(re);
    if(m && m[1]) {
      const v=m[1].trim();
      if(v.length>=3 && v.length<=180) return v;
    }
  }
  return null;
}

function pushBounded(arr, value, max) {
  arr.push(value);
  if(arr.length>max) arr.splice(0, arr.length-max);
}

function processLine(line) {
  if(!line) return;
  stats.linesRead++;

  if(capturing && stats.linesRead % sampleEvery === 0) {
    pushBounded(samples, `[SAMPLE line=${stats.linesRead}] ${line.slice(0,2200)}`, MAX_SAMPLES);
    stats.samples++;
  }

  if(keywords.test(line)) {
    stats.relevant++;
    if(capturing) pushBounded(relevantLines, line.slice(0,3000), MAX_RELEVANT);
    send('raw-hit', line.slice(0,1800));
  }

  const candidate=mapCandidate(line);
  if(candidate) send('map-candidate',{value:candidate,source:line.slice(0,1800),time:new Date().toISOString()});

  if(stats.linesRead % 200 === 0) emitStats();
}

function consume(text) {
  partial += text;
  const lines=partial.split(/\r?\n/);
  partial=lines.pop() || '';
  for(const line of lines) processLine(line);
}

function readNew() {
  fs.stat(logPath,(err,stat)=>{
    if(err){ emitStatus('Aguardando o log do DBD aparecer...'); return; }
    if(stat.size < position){ position=0; partial=''; }
    if(stat.size===position) return;

    const start=position, end=stat.size-1;
    const stream=fs.createReadStream(logPath,{encoding:'utf8',start,end});
    let bytes=0;
    stream.on('data',chunk=>{
      bytes += Buffer.byteLength(chunk,'utf8');
      stats.bytesRead += Buffer.byteLength(chunk,'utf8');
      consume(chunk);
    });
    stream.on('end',()=>{ position=start+bytes; emitStats(); });
    stream.on('error',()=>emitStatus('Erro ao ler o log; tentando novamente...'));
  });
}

function resetCapture() {
  stats.bytesRead=0; stats.linesRead=0; stats.relevant=0; stats.samples=0; stats.startedAt=new Date().toISOString();
  relevantLines.length=0; samples.length=0; partial='';
}

function start() {
  if(timer) clearInterval(timer);
  logPath=findLog();
  resetCapture();
  fs.stat(logPath,(err,stat)=>{
    position=err?0:stat.size; // IMPORTANT: only new data after user starts capture
    emitStatus(err?'Log não encontrado ainda. Abra o DBD.':'Monitorando somente eventos NOVOS do DBD.');
    emitStats();
    timer=setInterval(readNew,750);
  });
}

function createWindow(){
  win=new BrowserWindow({
    width:960,height:760,minWidth:760,minHeight:600,backgroundColor:'#0f1013',
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
}

app.whenReady().then(()=>{createWindow();start();});
app.on('window-all-closed',()=>{if(timer)clearInterval(timer);if(process.platform!=='darwin')app.quit();});

ipcMain.handle('get-log-path',()=>findLog());
ipcMain.handle('restart',()=>{capturing=true;start();return{ok:true,logPath};});
ipcMain.handle('capture-toggle',(_,enabled)=>{capturing=!!enabled;emitStatus(capturing?'Captura ativada.':'Captura pausada.');return{capturing};});
ipcMain.handle('export-diagnostic',async()=>{
  const result=await dialog.showSaveDialog(win,{
    title:'Salvar diagnóstico compacto',
    defaultPath:`DBD-Overlay-Diagnostic-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`,
    filters:[{name:'Texto',extensions:['txt']}]
  });
  if(result.canceled||!result.filePath)return{ok:false};

  const header=[
    'DBD Overlay Map & WinStreak - Beta 1.0.1',
    `Generated: ${new Date().toISOString()}`,
    `Log: ${logPath}`,
    `Capture started: ${stats.startedAt}`,
    `Bytes read: ${stats.bytesRead}`,
    `Lines read: ${stats.linesRead}`,
    `Relevant matches: ${stats.relevant}`,
    `Relevant stored (max ${MAX_RELEVANT}): ${relevantLines.length}`,
    `Periodic samples stored (max ${MAX_SAMPLES}): ${samples.length}`,
    '',
    '=== RELEVANT FILTERED LINES ===',
    ...relevantLines,
    '',
    '=== PERIODIC SAMPLES (1 every '+sampleEvery+' lines) ===',
    ...samples
  ].join('\r\n');

  fs.writeFileSync(result.filePath,header,'utf8');
  const size=fs.statSync(result.filePath).size;
  return{ok:true,filePath:result.filePath,size};
});
