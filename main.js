const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const fs=require('fs'), path=require('path');
let win,timer,logPath,position=0,capturing=true;
const st={startedAt:null,bytesRead:0,chunks:0,format:'Aguardando dados...',printablePct:0,nullPct:0,entropy:0,magic:'',textLines:0};
const diagnostics=[];
const MAX_CHUNKS=180, MAX_BYTES_PER_CHUNK=4096;

function send(c,d){if(win&&!win.isDestroyed())win.webContents.send(c,d)}
function base(){return process.env.LOCALAPPDATA||path.join(process.env.USERPROFILE||'','AppData','Local')}
function getLog(){return path.join(base(),'DeadByDaylight','Saved','Logs','DeadByDaylight.log')}
function entropy(buf){if(!buf.length)return 0;let f=new Array(256).fill(0);for(const b of buf)f[b]++;let h=0;for(const n of f)if(n){let p=n/buf.length;h-=p*Math.log2(p)}return h}
function analyze(buf){
 let printable=0,nulls=0;
 for(const b of buf){if(b===0)nulls++;if(b===9||b===10||b===13||(b>=32&&b<=126))printable++}
 const pp=buf.length?printable/buf.length*100:0,np=buf.length?nulls/buf.length*100:0,h=entropy(buf);
 let format='Binário / possivelmente criptografado ou compactado';
 if(buf.slice(0,3).equals(Buffer.from([0xEF,0xBB,0xBF])))format='UTF-8 com BOM';
 else if(buf.slice(0,2).equals(Buffer.from([0xFF,0xFE])))format='UTF-16 LE';
 else if(buf.slice(0,2).equals(Buffer.from([0xFE,0xFF])))format='UTF-16 BE';
 else if(pp>88&&np<2&&h<7.7)format='Texto provável (UTF-8/ANSI)';
 else if(np>20)format='Possível UTF-16 ou estrutura binária';
 else if(h>7.5)format='Alta entropia: provável criptografia/compactação';
 return {format,printablePct:pp,nullPct:np,entropy:h,magic:buf.slice(0,32).toString('hex').match(/../g)?.join(' ')||''};
}
function safeAscii(buf){return buf.toString('latin1').replace(/[^\x20-\x7E\r\n\t]/g,'.').slice(0,900)}
function hex(buf){return Array.from(buf.slice(0,256)).map(b=>b.toString(16).padStart(2,'0')).join(' ')}
function emit(){send('stats',st)}
function reset(){
 st.startedAt=new Date().toISOString();st.bytesRead=0;st.chunks=0;st.format='Aguardando dados novos...';st.printablePct=0;st.nullPct=0;st.entropy=0;st.magic='';st.textLines=0;diagnostics.length=0;
}
function readNew(){
 if(!capturing)return;
 fs.stat(logPath,(e,s)=>{
  if(e){send('status','Log não encontrado. Abra o DBD.');return}
  if(s.size<position)position=0;
  if(s.size===position)return;
  // Limit each poll so diagnostics cannot explode. We inspect bytes, not "lines".
  const end=Math.min(s.size-1,position+1024*1024-1);
  const rs=fs.createReadStream(logPath,{start:position,end});
  const parts=[];let n=0;
  rs.on('data',c=>{parts.push(c);n+=c.length});
  rs.on('end',()=>{
    position+=n;st.bytesRead+=n;st.chunks++;
    const b=Buffer.concat(parts);
    const a=analyze(b.slice(0,Math.min(b.length,65536)));
    Object.assign(st,a);
    if(st.chunks<=MAX_CHUNKS){
      diagnostics.push(`\n=== CHUNK ${st.chunks} offset=${position-n} bytes=${n} ===`);
      diagnostics.push(`format=${a.format}; printable=${a.printablePct.toFixed(2)}%; null=${a.nullPct.toFixed(2)}%; entropy=${a.entropy.toFixed(4)}`);
      diagnostics.push(`magic32=${a.magic}`);
      diagnostics.push('HEX256='+hex(b));
      diagnostics.push('ASCII_PREVIEW='+safeAscii(b.slice(0,MAX_BYTES_PER_CHUNK)));
    }
    if(a.format.startsWith('Texto provável')){
      const txt=b.toString('utf8');
      const hits=txt.split(/\r?\n/).filter(x=>/map|realm|level|world|procedural|travel|trial|persistent|gameplay|session/i.test(x)).slice(0,100);
      st.textLines+=hits.length;
      if(hits.length)diagnostics.push('TEXT_HITS:\n'+hits.join('\n'));
    }
    send('preview',{format:a.format,preview:safeAscii(b.slice(0,800))});
    emit();
  });
 })
}
function start(){
 if(timer)clearInterval(timer);logPath=getLog();reset();
 fs.stat(logPath,(e,s)=>{position=e?0:s.size;send('status',e?'Aguardando DeadByDaylight.log...':'Monitorando bytes NOVOS do arquivo.');emit();timer=setInterval(readNew,1000)})
}
function create(){win=new BrowserWindow({width:960,height:760,minWidth:780,minHeight:620,backgroundColor:'#0e0f12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.setMenuBarVisibility(false);win.loadFile('index.html')}
app.whenReady().then(()=>{create();start()});app.on('window-all-closed',()=>{if(timer)clearInterval(timer);if(process.platform!=='darwin')app.quit()});
ipcMain.handle('restart',()=>{capturing=true;start();return true});
ipcMain.handle('toggle',(_,v)=>{capturing=!!v;send('status',capturing?'Captura ativa.':'Captura pausada.');return capturing});
ipcMain.handle('path',()=>getLog());
ipcMain.handle('export',async()=>{
 const r=await dialog.showSaveDialog(win,{defaultPath:`DBD-Overlay-Format-Diagnostic-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`,filters:[{name:'Text',extensions:['txt']}]});
 if(r.canceled||!r.filePath)return{ok:false};
 const body=[
 'DBD Overlay Map & WinStreak - Beta 1.0.2',
 `Generated: ${new Date().toISOString()}`,`Log: ${logPath}`,`Capture started: ${st.startedAt}`,
 `Bytes inspected: ${st.bytesRead}`,`Chunks: ${st.chunks}`,`Detected format: ${st.format}`,
 `Printable: ${st.printablePct.toFixed(2)}%`,`Null: ${st.nullPct.toFixed(2)}%`,`Entropy: ${st.entropy.toFixed(4)}`,
 `Magic32: ${st.magic}`,'',...diagnostics
 ].join('\r\n');
 fs.writeFileSync(r.filePath,body,'utf8');return{ok:true,filePath:r.filePath,size:Buffer.byteLength(body)}
});
