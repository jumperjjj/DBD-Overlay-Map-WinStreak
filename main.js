const {app,BrowserWindow,ipcMain,screen}=require('electron');
const screenshot=require('screenshot-desktop');
const sharp=require('sharp');
const {createWorker}=require('tesseract.js');
const MAPS=require('./maps');
let win=null,worker=null,timer=null,perfTimer=null,running=false,busy=false,attempts=0,startAt=0,detected=null;
const INTERVAL=1200, TIMEOUT=45000;

function send(c,d){if(win&&!win.isDestroyed())win.webContents.send(c,d)}
function norm(s){return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){a=norm(a);b=norm(b);let m=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let p=m[0];m[0]=i;for(let j=1;j<=b.length;j++){let t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return m[b.length]}
function match(text){
 const t=norm(text); if(t.length<4)return null; let best=null;
 for(const name of MAPS){const n=norm(name);let d=lev(t,n),score=1-d/Math.max(t.length,n.length);
   if(t.includes(n)||n.includes(t))score=Math.max(score,0.92);
   if(!best||score>best.score)best={name,score};
 } return best;
}
async function initOCR(){
 if(worker)return; send('status','Carregando OCR local...');
 worker=await createWorker('eng',1,{logger:()=>{}});
 send('status','OCR pronto. Clique em Iniciar detecção.');
}
async function oneShot(){
 if(!running||busy)return; busy=true;
 try{
  const img=await screenshot({format:'png'});
  const meta=await sharp(img).metadata();
  // DBD title normally appears around the lower-middle/center area during intro.
  // Crop is intentionally limited to reduce OCR work.
  const left=Math.floor(meta.width*0.10), top=Math.floor(meta.height*0.52);
  const width=Math.floor(meta.width*0.80), height=Math.floor(meta.height*0.30);
  const crop=await sharp(img).extract({left,top,width,height}).grayscale().normalize().resize({width:Math.min(1400,width),withoutEnlargement:true}).png().toBuffer();
  attempts++;
  const r=await worker.recognize(crop);
  const text=(r.data.text||'').trim();
  const best=match(text);
  send('ocr',{attempts,text:text.slice(0,400),best});
  if(best&&best.score>=0.72){detected=best;stop('Mapa detectado: '+best.name);send('detected',best);return}
  if(Date.now()-startAt>=TIMEOUT)stop('Tempo limite atingido. Detector desligado para não consumir recursos.');
 }catch(e){send('ocr',{attempts,error:String(e)});if(Date.now()-startAt>=TIMEOUT)stop('Detector encerrado após erro/timeout.')}
 finally{busy=false}
}
function start(){
 if(running)return;running=true;attempts=0;detected=null;startAt=Date.now();
 send('status','Detecção leve ativa: 1 captura a cada 1,2 s, máximo 45 s.');
 oneShot();timer=setInterval(oneShot,INTERVAL);
}
function stop(msg='Detecção parada.'){running=false;if(timer){clearInterval(timer);timer=null}send('status',msg);send('state',{running:false})}
function perf(){
 const mem=process.memoryUsage();send('perf',{ramMB:mem.rss/1048576,heapMB:mem.heapUsed/1048576,running,busy,attempts,elapsed:startAt?Math.min(TIMEOUT,Date.now()-startAt):0})
}
function create(){win=new BrowserWindow({width:980,height:780,minWidth:780,minHeight:640,backgroundColor:'#0e0f12',webPreferences:{preload:require('path').join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.setMenuBarVisibility(false);win.loadFile('index.html')}
app.whenReady().then(async()=>{create();perfTimer=setInterval(perf,1000);try{await initOCR()}catch(e){send('status','Falha ao carregar OCR: '+e.message)}});
app.on('window-all-closed',async()=>{stop();if(perfTimer)clearInterval(perfTimer);if(worker)await worker.terminate();if(process.platform!=='darwin')app.quit()});
ipcMain.handle('start',()=>{start();return true});ipcMain.handle('stop',()=>{stop();return true});
ipcMain.handle('info',()=>({interval:INTERVAL,timeout:TIMEOUT,maps:MAPS.length}));
