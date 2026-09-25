const {app,BrowserWindow,ipcMain,desktopCapturer,screen}=require('electron');
const path=require('path'),sharp=require('sharp'),{createWorker}=require('tesseract.js'),MAPS=require('./maps');
let win,worker,timer,perfTimer,running=false,busy=false,ocrReady=false,attempts=0,captures=0,startAt=0;
let lastCpu=process.cpuUsage(),lastCpuAt=process.hrtime.bigint();
const INTERVAL=1500,TIMEOUT=45000,ROI={x:0,y:.66,w:.48,h:.28};

function send(c,d){if(win&&!win.isDestroyed())win.webContents.send(c,d)}
function norm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){a=norm(a);b=norm(b);let m=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=m[0];m[0]=i;for(let j=1;j<=b.length;j++){let t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return m[b.length]}
function match(text){let v=String(text||'').split(/\r?\n/).map(norm).filter(x=>x.length>3);v.push(norm(text));let best=null;for(const t of v)for(const name of MAPS){const n=norm(name);let s=1-lev(t,n)/Math.max(t.length,n.length);if(t.includes(n)||n.includes(t))s=Math.max(s,.94);if(!best||s>best.score)best={name,score:s,source:t}}return best}

async function initOCR(){
 ocrReady=false;send('ocr-state',{state:'loading',message:'OCR carregando...'});
 let timeout;
 try{
  const promise=createWorker('eng',1,{logger:m=>{
   if(m&&m.status)send('ocr-load',{status:m.status,progress:Math.round((m.progress||0)*100)});
  }});
  const timeoutPromise=new Promise((_,rej)=>timeout=setTimeout(()=>rej(new Error('OCR não carregou em 20 segundos.')),20000));
  worker=await Promise.race([promise,timeoutPromise]);
  clearTimeout(timeout);
  await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
  ocrReady=true;
  send('ocr-state',{state:'ready',message:'OCR pronto ✓'});
  send('status','OCR pronto. Inicie a detecção antes do nome do mapa aparecer.');
 }catch(e){
  clearTimeout(timeout);ocrReady=false;
  send('ocr-state',{state:'error',message:'Falha ao carregar OCR'});
  send('status','Erro do OCR: '+e.message);
 }
}
async function captureROI(){
 const d=screen.getPrimaryDisplay(),scale=d.scaleFactor||1;
 const W=Math.round(d.size.width*scale),H=Math.round(d.size.height*scale);
 const srcs=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:W,height:H},fetchWindowIcons:false});
 if(!srcs.length)throw new Error('Nenhuma tela disponível.');
 const full=srcs[0].thumbnail.toPNG(),meta=await sharp(full).metadata();
 const left=0,top=Math.floor(meta.height*ROI.y),width=Math.floor(meta.width*ROI.w),height=Math.floor(meta.height*ROI.h);
 const crop=await sharp(full).extract({left,top,width,height}).grayscale().normalize().sharpen()
  .resize({width:Math.min(1050,Math.max(850,width)),withoutEnlargement:false}).png().toBuffer();
 return {crop,region:{width,height}};
}
async function shot(){
 if(!running||busy)return;
 if(Date.now()-startAt>=TIMEOUT){stop('Tempo limite atingido. Detector desligado.');return}
 busy=true;
 try{
  const {crop,region}=await captureROI();captures++;
  const r=await worker.recognize(crop);attempts++;
  const text=(r.data.text||'').trim(),best=match(text);
  send('ocr',{text:text.slice(0,500),best,region});
  if(best&&best.score>=.72){stop('Mapa detectado: '+best.name);send('detected',best)}
 }catch(e){send('ocr',{error:String(e)});stop('Erro de captura/OCR. Detector interrompido.')}
 finally{busy=false}
}
function start(){
 if(!ocrReady){send('status','Aguarde: o OCR ainda não está pronto.');return false}
 if(running)return true;
 running=true;busy=false;attempts=0;captures=0;startAt=Date.now();
 send('state',{running:true});send('status','Detectando o canto inferior esquerdo a cada 1,5 s.');
 shot();timer=setInterval(shot,INTERVAL);return true
}
function stop(msg='Detecção parada.'){running=false;if(timer){clearInterval(timer);timer=null}send('state',{running:false});send('status',msg)}
function perf(){
 const now=process.hrtime.bigint(),u=process.cpuUsage(),elapsed=Number(now-lastCpuAt)/1000,used=(u.user-lastCpu.user)+(u.system-lastCpu.system);
 lastCpu=u;lastCpuAt=now;const m=process.memoryUsage();
 send('perf',{cpu:elapsed?used/elapsed*100:0,ramMB:m.rss/1048576,captures,attempts,busy,elapsed:startAt&&running?Date.now()-startAt:0});
}
function create(){win=new BrowserWindow({width:980,height:780,minWidth:800,minHeight:640,backgroundColor:'#0e0f12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.setMenuBarVisibility(false);win.loadFile('index.html')}
app.whenReady().then(()=>{create();perfTimer=setInterval(perf,1000);setTimeout(initOCR,500)});
app.on('window-all-closed',async()=>{stop();if(perfTimer)clearInterval(perfTimer);if(worker)try{await worker.terminate()}catch{}if(process.platform!=='darwin')app.quit()});
ipcMain.handle('start',()=>start());ipcMain.handle('stop',()=>{stop();return true});ipcMain.handle('retry-ocr',()=>{if(!ocrReady)initOCR();return true});
