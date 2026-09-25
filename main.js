const {app,BrowserWindow,ipcMain,desktopCapturer,screen}=require('electron');
const sharp=require('sharp');
const {createWorker}=require('tesseract.js');
const MAPS=require('./maps');

let win,worker,timer,perfTimer;
let running=false,busy=false,attempts=0,captures=0,startAt=0,consecutiveErrors=0;
let lastCpu=process.cpuUsage(),lastCpuAt=process.hrtime.bigint();
const INTERVAL=1500, TIMEOUT=45000;

// Intentionally tiny LOWER-LEFT ROI. Percentages scale across resolutions.
// x=0..48%, y=66..94% captures the DBD map title area with margin.
const ROI={x:0.00,y:0.66,w:0.48,h:0.28};

function send(c,d){if(win&&!win.isDestroyed())win.webContents.send(c,d)}
function norm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){a=norm(a);b=norm(b);let m=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=m[0];m[0]=i;for(let j=1;j<=b.length;j++){let t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return m[b.length]}
function match(text){
 const variants=String(text||'').split(/\r?\n/).map(norm).filter(x=>x.length>=4);
 variants.push(norm(text));
 let best=null;
 for(const t of variants)for(const name of MAPS){
   const n=norm(name); let score=1-lev(t,n)/Math.max(t.length,n.length);
   if(t.includes(n)||n.includes(t))score=Math.max(score,0.94);
   if(!best||score>best.score)best={name,score,source:t};
 }
 return best;
}
async function initOCR(){
 send('status','Carregando OCR local...');
 worker=await createWorker('eng',1,{logger:()=>{}});
 await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
 send('status','OCR pronto. Inicie a detecção antes do título do mapa aparecer.');
}
async function captureLowerLeft(){
 const display=screen.getPrimaryDisplay();
 const scale=display.scaleFactor||1;
 const W=Math.round(display.size.width*scale), H=Math.round(display.size.height*scale);
 // Electron's native desktopCapturer replaces screenshot-desktop:
 // no external .BAT to disappear during electron-builder packaging.
 const sources=await desktopCapturer.getSources({
   types:['screen'],
   thumbnailSize:{width:W,height:H},
   fetchWindowIcons:false
 });
 if(!sources.length)throw new Error('Nenhuma tela disponível para captura.');
 let src=sources.find(s=>/screen 1|display 1/i.test(s.name))||sources[0];
 const full=src.thumbnail.toPNG();
 const meta=await sharp(full).metadata();
 const left=Math.max(0,Math.floor(meta.width*ROI.x));
 const top=Math.max(0,Math.floor(meta.height*ROI.y));
 const width=Math.min(meta.width-left,Math.floor(meta.width*ROI.w));
 const height=Math.min(meta.height-top,Math.floor(meta.height*ROI.h));
 // OCR gets only the lower-left crop; upscale modestly only when useful.
 const crop=await sharp(full).extract({left,top,width,height})
   .grayscale().normalize().sharpen()
   .resize({width:Math.min(1100,Math.max(width,900)),withoutEnlargement:false})
   .png().toBuffer();
 return {crop,region:{left,top,width,height,screenW:meta.width,screenH:meta.height}};
}
async function shot(){
 if(!running||busy)return;
 if(Date.now()-startAt>=TIMEOUT){stop('Tempo limite atingido. Detector desligado.');return}
 busy=true;
 try{
   const {crop,region}=await captureLowerLeft(); captures++; consecutiveErrors=0;
   const r=await worker.recognize(crop); attempts++;
   const text=(r.data.text||'').trim(),best=match(text);
   send('ocr',{captures,attempts,text:text.slice(0,500),best,region});
   if(best&&best.score>=0.72){
     stop('Mapa detectado: '+best.name);
     send('detected',best);
   }
 }catch(e){
   consecutiveErrors++;
   send('ocr',{captures,attempts,error:String(e)});
   // Unlike 1.1.0, capture failure stops immediately instead of wasting 45 seconds.
   if(consecutiveErrors>=1)stop('Erro de captura. Detector interrompido imediatamente.');
 }finally{busy=false}
}
function start(){
 if(running)return;
 if(!worker){send('status','OCR ainda está carregando...');return}
 running=true;busy=false;attempts=0;captures=0;consecutiveErrors=0;startAt=Date.now();
 send('state',{running:true});
 send('status','Detectando apenas o canto inferior esquerdo — 1 captura a cada 1,5 s.');
 shot(); timer=setInterval(shot,INTERVAL);
}
function stop(msg='Detecção parada.'){
 running=false;
 if(timer){clearInterval(timer);timer=null}
 send('state',{running:false});send('status',msg);
}
function perf(){
 const now=process.hrtime.bigint(),u=process.cpuUsage(),elapsedUs=Number(now-lastCpuAt)/1000;
 const used=(u.user-lastCpu.user)+(u.system-lastCpu.system);
 const cpu=elapsedUs>0?(used/elapsedUs*100):0;
 lastCpu=u;lastCpuAt=now;
 const m=process.memoryUsage();
 send('perf',{cpu,ramMB:m.rss/1048576,running,busy,captures,attempts,elapsed:startAt&&running?Date.now()-startAt:0});
}
function create(){
 win=new BrowserWindow({width:980,height:780,minWidth:800,minHeight:640,backgroundColor:'#0e0f12',
 webPreferences:{preload:require('path').join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 win.setMenuBarVisibility(false);win.loadFile('index.html');
}
app.whenReady().then(async()=>{
 create();perfTimer=setInterval(perf,1000);
 try{await initOCR()}catch(e){send('status','Falha ao carregar OCR: '+e.message)}
});
app.on('window-all-closed',async()=>{
 stop();if(perfTimer)clearInterval(perfTimer);
 if(worker)await worker.terminate();
 if(process.platform!=='darwin')app.quit();
});
ipcMain.handle('start',()=>{start();return true});
ipcMain.handle('stop',()=>{stop();return true});
ipcMain.handle('info',()=>({interval:INTERVAL,timeout:TIMEOUT,roi:ROI,maps:MAPS.length}));
