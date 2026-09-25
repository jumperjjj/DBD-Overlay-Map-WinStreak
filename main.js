const {app,BrowserWindow,ipcMain,desktopCapturer,screen}=require('electron');
const path=require('path'),sharp=require('sharp'),{createWorker}=require('tesseract.js'),MAPS=require('./maps');
let win,worker,timer,perfTimer,running=false,busy=false,ready=false,captures=0,attempts=0,startAt=0,lastCandidate=null,confirmCount=0;
let lastCpu=process.cpuUsage(),lastCpuAt=process.hrtime.bigint();
const INTERVAL=2200,TIMEOUT=40000;
// Much smaller target: lower-left title band only.
// 1920x1080 ~= 672x151 before OCR downscale.
const ROI={x:.015,y:.735,w:.35,h:.14};

function send(c,d){if(win&&!win.isDestroyed())win.webContents.send(c,d)}
function norm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){a=norm(a);b=norm(b);let m=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=m[0];m[0]=i;for(let j=1;j<=b.length;j++){let t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return m[b.length]}
function match(text){
 let lines=String(text||'').split(/\r?\n/).map(norm).filter(x=>x.length>=5&&x.length<=60);
 let best=null;
 for(const t of lines)for(const name of MAPS){
  const n=norm(name); let score=1-lev(t,n)/Math.max(t.length,n.length);
  if(t===n)score=1; else if(t.includes(n)&&n.length>=8)score=Math.max(score,.97);
  if(!best||score>best.score)best={name,score,source:t};
 }
 return best;
}
async function initOCR(){
 ready=false;send('ocr-state',{state:'loading',message:'OCR carregando...'});
 try{
  let to;const w=createWorker('eng',1,{logger:m=>{if(m?.status)send('ocr-load',{status:m.status,progress:Math.round((m.progress||0)*100)})}});
  worker=await Promise.race([w,new Promise((_,rej)=>to=setTimeout(()=>rej(new Error('Timeout do OCR (20s)')),20000))]);clearTimeout(to);
  await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '-.",preserve_interword_spaces:'1'});
  ready=true;send('ocr-state',{state:'ready',message:'OCR pronto ✓'});send('status','Pronto. Inicie antes do nome do mapa aparecer.');
 }catch(e){send('ocr-state',{state:'error',message:'Falha no OCR'});send('status','Erro OCR: '+e.message)}
}
async function crop(){
 const d=screen.getPrimaryDisplay(),sf=d.scaleFactor||1,W=Math.round(d.size.width*sf),H=Math.round(d.size.height*sf);
 const src=(await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:W,height:H},fetchWindowIcons:false}))[0];
 if(!src)throw Error('Tela não encontrada');
 const buf=src.thumbnail.toPNG(),m=await sharp(buf).metadata();
 const left=Math.floor(m.width*ROI.x),top=Math.floor(m.height*ROI.y),width=Math.floor(m.width*ROI.w),height=Math.floor(m.height*ROI.h);
 // Crucial performance change: never enlarge to ~1000px. OCR receives max 700px wide.
 let p=sharp(buf).extract({left,top,width,height}).grayscale().normalize().sharpen();
 if(width>700)p=p.resize({width:700,withoutEnlargement:true});
 return {buf:await p.png().toBuffer(),region:{left,top,width,height}};
}
async function shot(){
 if(!running||busy)return;
 if(Date.now()-startAt>=TIMEOUT){stop('Tempo limite. Detector desligado.');return}
 busy=true;
 try{
  const c=await crop();captures++;
  const r=await worker.recognize(c.buf);attempts++;
  const text=(r.data.text||'').trim(),best=match(text);
  let accepted=false;
  // High threshold + repeated confirmation eliminates "The Game" style false positives.
  if(best&&best.score>=.88){
   if(lastCandidate===best.name)confirmCount++; else {lastCandidate=best.name;confirmCount=1}
   if(best.score>=.97||confirmCount>=2)accepted=true;
  } else {lastCandidate=null;confirmCount=0}
  send('ocr',{text:text.slice(0,300),best,confirmCount,region:c.region});
  if(accepted){stop('Mapa detectado: '+best.name);send('detected',best)}
 }catch(e){send('ocr',{error:String(e)});stop('Erro de captura/OCR. Detector parado.')}
 finally{busy=false}
}
function start(){if(!ready){send('status','OCR ainda não está pronto.');return false}if(running)return true;
 running=true;busy=false;captures=attempts=0;lastCandidate=null;confirmCount=0;startAt=Date.now();
 send('status','Detecção otimizada ativa — recorte pequeno a cada 2,2 s.');shot();timer=setInterval(shot,INTERVAL);return true}
function stop(msg='Detecção parada.'){running=false;if(timer){clearInterval(timer);timer=null}send('status',msg)}
function perf(){const now=process.hrtime.bigint(),u=process.cpuUsage(),dt=Number(now-lastCpuAt)/1000,du=(u.user-lastCpu.user)+(u.system-lastCpu.system);lastCpu=u;lastCpuAt=now;let m=process.memoryUsage();send('perf',{cpu:dt?du/dt*100:0,ramMB:m.rss/1048576,captures,attempts,busy,elapsed:startAt&&running?Date.now()-startAt:0})}
function create(){win=new BrowserWindow({width:980,height:760,minWidth:800,minHeight:620,backgroundColor:'#0e0f12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.setMenuBarVisibility(false);win.loadFile('index.html')}
app.whenReady().then(()=>{create();perfTimer=setInterval(perf,1000);setTimeout(initOCR,400)});
app.on('window-all-closed',async()=>{stop();if(perfTimer)clearInterval(perfTimer);if(worker)try{await worker.terminate()}catch{}if(process.platform!=='darwin')app.quit()});
ipcMain.handle('start',()=>start());ipcMain.handle('stop',()=>{stop();return true});ipcMain.handle('retry',()=>{if(!ready)initOCR();return true});
