const {app,BrowserWindow,ipcMain,desktopCapturer,screen}=require('electron');
const path=require('path'),sharp=require('sharp'),{createWorker}=require('tesseract.js'),MAPS=require('./maps');
let win,worker,loopTimer,perfTimer,ready=false,busy=false,state='BOOT',map=null;
let captures=0,ocrAttempts=0,visualHits=0,ocrUntil=0,nextWatch=0,nextOCR=0,sleepUntil=0;
let lastCpu=process.cpuUsage(),lastCpuAt=process.hrtime.bigint();
// Sentinel: sparse and low resolution. OCR: short burst only.
const WATCH_MS=2500, OCR_MS=1700, OCR_WINDOW=9500, SLEEP_MS=90000;
const ROI={x:.012,y:.715,w:.37,h:.17};
function send(c,d){if(win&&!win.isDestroyed())win.webContents.send(c,d)}
function setState(s,msg){state=s;send('state',{state:s,message:msg,map})}
function norm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){a=norm(a);b=norm(b);let m=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=m[0];m[0]=i;for(let j=1;j<=b.length;j++){let t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return m[b.length]}
function bestMatch(text){const lines=String(text||'').split(/\r?\n/).map(norm).filter(x=>x.length>=5&&x.length<=64);let best=null;
 for(const t of lines)for(const name of MAPS){const n=norm(name);let s=1-lev(t,n)/Math.max(t.length,n.length);if(t===n)s=1;else if(Math.abs(t.length-n.length)<=5&&(t.includes(n)||n.includes(t)))s=Math.max(s,.96);if(!best||s>best.score)best={name,score:s,source:t}}
 return best}
async function grab(kind){
 const d=screen.getPrimaryDisplay(),sf=d.scaleFactor||1,physW=Math.round(d.size.width*sf),physH=Math.round(d.size.height*sf);
 // IMPORTANT: request a reduced desktop thumbnail at the source instead of full-resolution capture.
 const targetW=kind==='watch'?640:960,targetH=Math.max(360,Math.round(targetW*physH/physW));
 const src=(await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:targetW,height:targetH},fetchWindowIcons:false}))[0];
 if(!src)throw Error('Tela não encontrada');
 const png=src.thumbnail.toPNG(),md=await sharp(png).metadata();
 const left=Math.max(0,Math.floor(md.width*ROI.x)),top=Math.max(0,Math.floor(md.height*ROI.y));
 const width=Math.min(md.width-left,Math.floor(md.width*ROI.w)),height=Math.min(md.height-top,Math.floor(md.height*ROI.h));
 let p=sharp(png).extract({left,top,width,height}).grayscale().normalize();
 if(kind==='watch')p=p.resize({width:150,height:42,fit:'fill'}).raw();
 else p=p.resize({width:600,withoutEnlargement:false}).sharpen().png();
 return {buf:await p.toBuffer(),region:{width,height},source:{w:md.width,h:md.height}};
}
function visualScore(buf){
 let sum=0,sum2=0,edge=0,bright=0;
 for(let i=0;i<buf.length;i++){let v=buf[i];sum+=v;sum2+=v*v;if(v>185)bright++;if(i%150&&Math.abs(v-buf[i-1])>42)edge++}
 const mean=sum/buf.length,sd=Math.sqrt(Math.max(0,sum2/buf.length-mean*mean));
 return {sd,edge:edge/buf.length,bright:bright/buf.length};
}
async function watch(){
 if(busy||!ready)return;busy=true;
 try{let c=await grab('watch');captures++;let v=visualScore(c.buf);
  // Broad enough to wake OCR, but needs persistence. False wakeups are harmless: OCR window expires.
  const candidate=v.sd>24&&v.edge>.035&&v.bright>.035;
  visualHits=candidate?visualHits+1:Math.max(0,visualHits-1);
  send('diag',{kind:'watch',...v,hits:visualHits,region:c.region,source:c.source});
  if(visualHits>=2){visualHits=0;ocrUntil=Date.now()+OCR_WINDOW;nextOCR=0;setState('OCR','Título provável encontrado. Confirmando mapa...')}
 }catch(e){send('diag',{error:e.message})}finally{busy=false}
}
async function doOCR(){
 if(busy||!ready)return;if(Date.now()>ocrUntil){setState('ARMED','Aguardando automaticamente o título do mapa.');return}
 busy=true;
 try{let c=await grab('ocr'),r=await worker.recognize(c.buf);ocrAttempts++;let text=(r.data.text||'').trim(),best=bestMatch(text);send('diag',{kind:'ocr',text:text.slice(0,320),best,region:c.region,source:c.source});
  if(best&&best.score>=.90){map=best.name;sleepUntil=Date.now()+SLEEP_MS;setState('SLEEP','Mapa confirmado. Detector descansando para não afetar o jogo.');send('detected',best)}
 }catch(e){send('diag',{error:e.message});setState('ARMED','OCR falhou; sentinela continua.')}finally{busy=false}
}
async function tick(){
 const now=Date.now();if(!ready)return;
 if(state==='SLEEP'){
   // Automatic rearm: no transition/menu detection. A pause/settings screen cannot trigger it.
   if(now>=sleepUntil){visualHits=0;setState('ARMED','Rearmado automaticamente para a próxima Trial.');nextWatch=now}
   return;
 }
 if(state==='ARMED'&&now>=nextWatch){nextWatch=now+WATCH_MS;await watch();return}
 if(state==='OCR'&&now>=nextOCR){nextOCR=now+OCR_MS;await doOCR()}
}
async function init(){
 setState('BOOT','Preparando detector...');
 try{worker=await createWorker('eng',1,{logger:()=>{}});await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '-."});
 ready=true;setState('ARMED','Aguardando automaticamente o título do mapa.');nextWatch=Date.now();
 }catch(e){setState('ERROR','Falha ao carregar OCR: '+e.message)}
}
function rearm(){map=null;visualHits=0;ocrUntil=0;sleepUntil=0;setState('ARMED','Rearmado. Aguardando título.');nextWatch=Date.now();return true}
function perf(){const n=process.hrtime.bigint(),u=process.cpuUsage(),dt=Number(n-lastCpuAt)/1000,du=(u.user-lastCpu.user)+(u.system-lastCpu.system);lastCpu=u;lastCpuAt=n;send('perf',{cpu:dt?du/dt*100:0,ram:process.memoryUsage().rss/1048576,captures,ocrAttempts,state,map,sleepLeft:state==='SLEEP'?Math.max(0,sleepUntil-Date.now()):0})}
function create(){win=new BrowserWindow({width:850,height:620,minWidth:720,minHeight:540,backgroundColor:'#0e0f12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.setMenuBarVisibility(false);win.loadFile('index.html')}
app.whenReady().then(()=>{create();loopTimer=setInterval(tick,250);perfTimer=setInterval(perf,1000);setTimeout(init,350)});
app.on('window-all-closed',async()=>{clearInterval(loopTimer);clearInterval(perfTimer);if(worker)try{await worker.terminate()}catch{}if(process.platform!=='darwin')app.quit()});
ipcMain.handle('rearm',()=>rearm());
