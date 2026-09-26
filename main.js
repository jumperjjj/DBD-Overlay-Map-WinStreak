const {app,BrowserWindow,ipcMain,desktopCapturer,screen}=require('electron');
const path=require('path'),sharp=require('sharp'),{createWorker}=require('tesseract.js'),MAPS=require('./maps');
let win,worker,watchTimer,perfTimer,state='BOOT',ready=false,busy=false,captures=0,ocrAttempts=0,triggerHits=0,lastMap=null;
let lastCpu=process.cpuUsage(),lastCpuAt=process.hrtime.bigint(),lastSignature=null,ocrUntil=0,lastOcrAt=0;
const WATCH_MS=3000, OCR_MS=1800, OCR_WINDOW=9000;
// Tiny lower-left band. Sentinel uses only 160x36 grayscale pixels.
const ROI={x:.015,y:.74,w:.34,h:.13};

function send(c,d){if(win&&!win.isDestroyed())win.webContents.send(c,d)}
function setState(s,msg){state=s;send('state',{state:s,message:msg})}
function norm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){a=norm(a);b=norm(b);let m=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=m[0];m[0]=i;for(let j=1;j<=b.length;j++){let t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return m[b.length]}
function match(text){let ls=String(text||'').split(/\r?\n/).map(norm).filter(x=>x.length>=5&&x.length<=60),best=null;
 for(const t of ls)for(const name of MAPS){let n=norm(name),s=1-lev(t,n)/Math.max(t.length,n.length);if(t===n)s=1;else if(t.includes(n)&&n.length>=8)s=Math.max(s,.97);if(!best||s>best.score)best={name,score:s,source:t}}return best}
async function initOCR(){
 setState('BOOT','Preparando OCR em segundo plano...');
 try{let to;worker=await Promise.race([createWorker('eng',1,{logger:()=>{}}),new Promise((_,r)=>to=setTimeout(()=>r(Error('Timeout OCR')),20000))]);clearTimeout(to);
 await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '-."});
 ready=true;setState('ARMED','Sentinela automática ativa. Nenhum clique necessário.');
 }catch(e){setState('ERROR','OCR indisponível: '+e.message)}
}
async function getCrop(small=false){
 const d=screen.getPrimaryDisplay(),sf=d.scaleFactor||1,W=Math.round(d.size.width*sf),H=Math.round(d.size.height*sf);
 const src=(await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:W,height:H},fetchWindowIcons:false}))[0];if(!src)throw Error('Tela não encontrada');
 const full=src.thumbnail.toPNG(),m=await sharp(full).metadata(),left=Math.floor(m.width*ROI.x),top=Math.floor(m.height*ROI.y),width=Math.floor(m.width*ROI.w),height=Math.floor(m.height*ROI.h);
 let p=sharp(full).extract({left,top,width,height}).grayscale().normalize();
 if(small)p=p.resize({width:160,height:36,fit:'fill'}).raw();
 else {p=p.sharpen();if(width>650)p=p.resize({width:650,withoutEnlargement:true});p=p.png()}
 return {buf:await p.toBuffer(),region:{width,height}};
}
function signature(buf){
 // Very cheap visual gate: brightness/contrast + horizontal edge energy.
 let sum=0,sum2=0,edges=0;for(let i=0;i<buf.length;i++){let v=buf[i];sum+=v;sum2+=v*v;if(i%160&&Math.abs(v-buf[i-1])>38)edges++}
 let mean=sum/buf.length,variance=Math.max(0,sum2/buf.length-mean*mean),edgeRatio=edges/buf.length;
 return {mean,sd:Math.sqrt(variance),edgeRatio};
}
async function sentinel(){
 if(busy||!ready||state==='SLEEP')return;
 busy=true;
 try{
  const c=await getCrop(true);captures++;let s=signature(c.buf);
  // Text-title gate: require contrast + enough local edges, twice consecutively.
  const looksLikeTitle=s.sd>28 && s.edgeRatio>.055;
  triggerHits=looksLikeTitle?triggerHits+1:0;
  send('sentinel',{...s,triggerHits,region:c.region});
  if(triggerHits>=2){ocrUntil=Date.now()+OCR_WINDOW;triggerHits=0;setState('OCR','Possível título detectado. OCR temporariamente ativo.')}
 }catch(e){send('error',String(e))}
 finally{busy=false}
}
async function ocrTick(){
 if(state!=='OCR'||busy)return;
 if(Date.now()>ocrUntil){setState('ARMED','Título não confirmado. Voltando à sentinela leve.');return}
 if(Date.now()-lastOcrAt<OCR_MS)return;
 lastOcrAt=Date.now();busy=true;
 try{const c=await getCrop(false);const r=await worker.recognize(c.buf);ocrAttempts++;let text=(r.data.text||'').trim(),best=match(text);send('ocr',{text:text.slice(0,300),best});
  if(best&&best.score>=.90){lastMap=best.name;setState('SLEEP','Mapa confirmado. Detector de mapa dormindo.');send('detected',best)}
 }catch(e){send('error',String(e));setState('ARMED','Falha no OCR. Sentinela continua ativa.')}
 finally{busy=false}
}
function forceRearm(){lastMap=null;triggerHits=0;ocrUntil=0;setState('ARMED','Sentinela rearmada manualmente.');return true}
async function loop(){if(state==='ARMED')await sentinel();else if(state==='OCR')await ocrTick()}
function perf(){const now=process.hrtime.bigint(),u=process.cpuUsage(),dt=Number(now-lastCpuAt)/1000,du=(u.user-lastCpu.user)+(u.system-lastCpu.system);lastCpu=u;lastCpuAt=now;let m=process.memoryUsage();send('perf',{cpu:dt?du/dt*100:0,ramMB:m.rss/1048576,captures,ocrAttempts,state,lastMap})}
function create(){win=new BrowserWindow({width:980,height:760,minWidth:800,minHeight:620,backgroundColor:'#0e0f12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.setMenuBarVisibility(false);win.loadFile('index.html')}
app.whenReady().then(()=>{create();perfTimer=setInterval(perf,1000);watchTimer=setInterval(loop,500);setTimeout(initOCR,400)});
app.on('window-all-closed',async()=>{if(watchTimer)clearInterval(watchTimer);if(perfTimer)clearInterval(perfTimer);if(worker)try{await worker.terminate()}catch{}if(process.platform!=='darwin')app.quit()});
ipcMain.handle('rearm',()=>forceRearm());ipcMain.handle('wake-ocr',()=>{ocrUntil=Date.now()+OCR_WINDOW;setState('OCR','OCR forçado para diagnóstico.');return true});
