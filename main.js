const {app,BrowserWindow,ipcMain,screen,Tray,Menu,nativeImage,globalShortcut,shell}=require('electron');
const fs=require('fs'),path=require('path'),http=require('http'); const PORT=17384;
let ui,streakWin,matchWin,tray,server,quitting=false,editing=false,lastHotkey=0;
const DEF={
 language:'pt',
 streak:{enabled:true,x:40,y:40,w:350,h:285,scale:1,style:0,title:'WIN STREAK',value:0,nameColor:'#ffffff',valueColor:'#d7b84a',accent:'#d7b84a',bg1:'#15191f',opacity:1,nameSize:18,valueSize:36,nameX:0,valueX:0,bold:true,shadow:true,glow:8,fontName:'Segoe UI',fontValue:'Impact',hotkey:'',recordShow:false,recordTitle:'RECORD',recordValue:0,recordNameColor:'#ffffff',recordValueColor:'#d7b84a',recordBg:'#15191f',recordAccent:'#d7b84a',recordX:0,recordY:0,
 record2Show:false,record2Title:'OPCIONAL',record2Value:0,record2NameColor:'#ffffff',record2ValueColor:'#d7b84a',record2Bg:'#15191f',record2Accent:'#d7b84a',record2X:0,record2Y:0},
 match:{enabled:false,x:500,y:55,w:820,h:250,scale:1,style:0,mode:'manual',
 autoStages:3,autoFresh:2,autoUseFresh:true,
 killerImage:'',killerName:'',showKillerName:true,killerLeft:true,fontName:'Segoe UI',fontNumber:'Segoe UI',fontSet:'Segoe UI',glow:22,
teamA:'TIME A',teamB:'TIME B',scoreA:0,scoreB:0,colorA:'#3b82f6',colorB:'#22c55e',bg:'#15181d',panel:'#282c31',text:'#ffffff',muted:'#c7c9cc',setText:'CAMPEONATO',footerShow:true,footer:'SET / MAP',footerBg:'#15181d',footerCenter:false,edgeBorder:false,headerH:68,rowH:30,gap:4,padding:10,teamSize:22,scoreSize:32,rows:[
  {show:true,label:'INFO 1',a:'',b:'',color:'#3b82f6'},
  {show:true,label:'INFO 2',a:'',b:'',color:'#22c55e'},
  {show:false,label:'INFO 3',a:'',b:'',color:'#f0b84b'},{show:false,label:'INFO 4',a:'',b:'',color:'#4bb7f0'}
 ]}
};
let S;
const settingsFile=()=>path.join(app.getPath('userData'),'settings-v250.json');
function clone(x){return JSON.parse(JSON.stringify(x))}
const killerDir=()=>path.join(__dirname,'killers');
function killerFiles(){try{return fs.readdirSync(killerDir()).filter(x=>/\.(png|jpe?g|webp)$/i.test(x)).sort()}catch{return []}}

function load(){S=clone(DEF);try{const x=JSON.parse(fs.readFileSync(settingsFile(),'utf8'));S.streak={...S.streak,...(x.streak||{})};S.match={...S.match,...(x.match||{})};if(Array.isArray(x.match?.rows))S.match.rows=x.match.rows.slice(0,4).map((v,i)=>({...DEF.match.rows[i],...v}));S.language=x.language||'pt'}catch{}
 // Estado inicial deliberado: sempre inicia com WinStreak visível e Confronto oculto.
 if(S.match.setText==='SET 1/1')S.match.setText=S.language==='en'?'CHAMPIONSHIP':'CAMPEONATO';if(S.match.footer==='MAP / MATCH')S.match.footer='SET / MAP';
 if(!S._migrated269){S.streak.style=Math.max(0,(+S.streak.style||0)-1);S._migrated269=true}
 if(!S._migrated2611){S.streak.h=Math.max(180,+S.streak.h||180);S._migrated2611=true}
 if(!S._migrated2614){S.streak.w=Math.max(350,+S.streak.w||350);S.streak.h=Math.max(285,+S.streak.h||285);S._migrated2614=true}
 if(!S._migrated2615){S.streak.recordX=0;S.streak.recordY=0;S.streak.record2X=0;S.streak.record2Y=0;if(!S.streak.record2Title)S.streak.record2Title='OPCIONAL';S._migrated2615=true}
 if(!S._migrated2617){S.streak.recordShow=false;S.streak.record2Show=false;S.streak.recordX=0;S.streak.recordY=0;S.streak.record2X=0;S.streak.record2Y=0;S._migrated2617=true}
 if(!S._migrated2618){S.streak.recordX=0;S.streak.recordY=0;S.streak.record2X=0;S.streak.record2Y=0;S._migrated2618=true}
 if(!S._migrated2619){if((+S.streak.style||0)>9)S.streak.style=9;S.streak.valueSize=Math.min(+S.streak.valueSize||46,46);if(S.match.footerCenter==null)S.match.footerCenter=false;S._migrated2619=true}
 if(!S._migrated2620){
  if(S.streak.scale==null)S.streak.scale=1;
  if(S.match.scale==null)S.match.scale=1;
  if((+S.streak.valueSize||46)>=46)S.streak.valueSize=36;
  const oldStyle=+S.streak.style||0;
  if(oldStyle===2)S.streak.style=9; else if(oldStyle>2)S.streak.style=oldStyle-1;
  S._migrated2620=true;

 if(!S._migrated2621){if(S.match.scale==null||Math.abs((+S.match.scale)-.82)<.001)S.match.scale=1;S._migrated2621=true}
 if(!S._migrated2622){S.streak.record2Y=0;if(S.match.scale==null)S.match.scale=1;S._migrated2622=true}
 }
 if(S.match.style===4||S.match.style===5)S.match.style=0;else if(S.match.style===6)S.match.style=4;
 S.streak.enabled=true; S.match.enabled=false;
}
function save(){fs.writeFileSync(settingsFile(),JSON.stringify(S,null,2));push()}
function push(){[ui,streakWin,matchWin].forEach(w=>{if(w&&!w.isDestroyed())w.webContents.send('state',S)})}
function displayClamp(rect){const d=screen.getDisplayMatching(rect),b=d.bounds,w=Math.min(rect.width,b.width),h=Math.min(rect.height,b.height);let x=Math.max(b.x,Math.min(rect.x,b.x+b.width-w)),y=Math.max(b.y,Math.min(rect.y,b.y+b.height-h));const snap=12;if(Math.abs(x-b.x)<=snap)x=b.x;if(Math.abs((x+w)-(b.x+b.width))<=snap)x=b.x+b.width-w;if(Math.abs(y-b.y)<=snap)y=b.y;if(Math.abs((y+h)-(b.y+b.height))<=snap)y=b.y+b.height-h;return{x,y,width:w,height:h}}
function overlay(file,cfg,key){
 const w=new BrowserWindow({
  x:cfg.x,y:cfg.y,width:cfg.w,height:cfg.h,
  show:false,frame:false,transparent:true,hasShadow:false,resizable:false,
  skipTaskbar:true,focusable:true,backgroundColor:'#00000000',
  webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}
 });
 w.setAlwaysOnTop(true,'screen-saver');
 w.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
 w.setIgnoreMouseEvents(true,{forward:true});
 w.loadFile(file);
 w.webContents.on('did-finish-load',()=>{
   w.webContents.send('state',S);
   w.webContents.send('edit',editing);
  const g=guideFor(w);if(g&&!g.isDestroyed()){if(editing){g.setBounds(w.getBounds());g.showInactive();g.moveTop()}else g.hide()}
   if(S[key].enabled) w.showInactive(); else w.hide();
 });
 w.webContents.on('did-fail-load',(_,code,desc)=>console.error('Overlay load failed:',key,code,desc));
 return w
}
function safeVisible(w,on){if(!w||w.isDestroyed())return;if(!on){w.hide();return}if(w.webContents.isLoading())return;w.showInactive();w.moveTop();w.setAlwaysOnTop(true,'screen-saver')}
function visibility(){if(editing){safeVisible(streakWin,true);safeVisible(matchWin,true);return}safeVisible(streakWin,S.streak.enabled);safeVisible(matchWin,S.match.enabled)}
function setEdit(v){
 editing=!!v;
 for(const [w,c] of [[streakWin,S.streak],[matchWin,S.match]]){
  if(!w||w.isDestroyed())continue;
  w.setResizable(editing);w.setMovable(editing);
  w.setMinimumSize(w===streakWin?280:560,w===streakWin?88:145);
  w.setMaximumSize(w===streakWin?520:1050,w===streakWin?165:420);
  if(editing){
   w.setIgnoreMouseEvents(false);
   w.setFocusable(true);
   // Position mode deliberately shows BOTH overlays, even if one is disabled,
   // so both can always be positioned.
   w.showInactive();w.moveTop();
  }else{
   w.setIgnoreMouseEvents(true,{forward:true});
   w.setFocusable(false);
  }
  w.webContents.send('edit',editing);
  const g=guideFor(w);if(g&&!g.isDestroyed()){if(editing){g.setBounds(w.getBounds());g.showInactive();g.moveTop()}else g.hide()}
 }
 if(!editing)visibility();
 ui?.webContents.send('edit',editing)
}
function syncBounds(){for(const [w,k] of [[streakWin,'streak'],[matchWin,'match']]){const b=displayClamp(w.getBounds());w.setBounds(b);Object.assign(S[k],{x:b.x,y:b.y,w:b.width,h:b.height})}save()}
function attachBounds(w,k){
 const remember=()=>{if(!editing)return;const b=w.getBounds();Object.assign(S[k],{x:b.x,y:b.y,w:b.width,h:b.height});syncGuide(w);ui?.webContents.send('dirty',true);push()};
 w.on('move',remember);w.on('resize',remember);
}

function makeGuide(){
 const g=new BrowserWindow({show:false,frame:false,transparent:true,hasShadow:false,resizable:false,movable:false,focusable:false,skipTaskbar:true,alwaysOnTop:true,backgroundColor:'#00000000'});
 g.setIgnoreMouseEvents(true);
 g.setAlwaysOnTop(true,'screen-saver');
 g.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html><body style="margin:0;box-sizing:border-box;width:100vw;height:100vh;border:4px solid #ff2525;background:transparent"></body></html>'));
 return g
}
function guideFor(w){return w===streakWin?streakGuide:matchGuide}
function syncGuide(w){
 if(!editing||!w||w.isDestroyed())return;
 const g=guideFor(w);if(!g||g.isDestroyed())return;
 g.setBounds(w.getBounds());if(!g.isVisible())g.showInactive();g.moveTop()
}

function create(){ui=new BrowserWindow({width:1160,height:820,minWidth:980,minHeight:680,backgroundColor:'#0d0f13',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});ui.setMenuBarVisibility(false);ui.loadFile('app.html');ui.on('close',e=>{if(!quitting){e.preventDefault();ui.hide()}});
 streakWin=overlay('streak.html',S.streak,'streak');matchWin=overlay('match.html',S.match,'match');streakGuide=makeGuide();matchGuide=makeGuide();attachBounds(streakWin,'streak');attachBounds(matchWin,'match');visibility();
 tray=new Tray(nativeImage.createEmpty());tray.setToolTip('DBD Overlay Studio');tray.setContextMenu(Menu.buildFromTemplate([{label:'Abrir',click:()=>ui.show()},{label:'Sair',click:()=>{quitting=true;app.quit()}}]));
}
function recreateOverlays(){
 try{streakWin?.destroy()}catch{} try{matchWin?.destroy()}catch{}
 streakWin=overlay('streak.html',S.streak,'streak'); matchWin=overlay('match.html',S.match,'match');
 attachBounds(streakWin,'streak'); attachBounds(matchWin,'match');
 setTimeout(()=>{visibility();push()},250); return S
}
function hotkey(k){globalShortcut.unregisterAll();S.streak.hotkey=k||'';if(k){try{if(!globalShortcut.register(k,()=>{const n=Date.now();if(n-lastHotkey<2000)return;lastHotkey=n;S.streak.value++;save()}))return false}catch{return false}}save();return true}
function startServer(){server=http.createServer((req,res)=>{
 if(req.url.startsWith('/killer?')){try{const u=new URL(req.url,'http://127.0.0.1');const name=path.basename(u.searchParams.get('name')||'');const file=path.join(killerDir(),name);if(!name||!fs.existsSync(file)){res.writeHead(404);return res.end()}const ext=path.extname(name).toLowerCase();const type=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});return fs.createReadStream(file).pipe(res)}catch{res.writeHead(400);return res.end()}}
if(req.url.startsWith('/state')){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});return res.end(JSON.stringify(S))}if(req.url==='/overlay'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'obs.html'),'utf8'))}if(req.url==='/obs-streak'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'obs-streak.html'),'utf8'))}if(req.url==='/obs-match'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'obs-match.html'),'utf8'))}res.writeHead(404);res.end()}).listen(PORT,'127.0.0.1')}
ipcMain.handle('get',()=>({state:S,url:`http://127.0.0.1:${PORT}/overlay`,killers:killerFiles()}));
ipcMain.handle('patch',(_,section,p)=>{
 const oldK=section==='match'?S.match.killerImage:'';const oldLeft=section==='match'?S.match.killerLeft:true;
 if(section==='root')S={...S,...p};else S[section]={...S[section],...p};
 if(section==='match'&&Object.prototype.hasOwnProperty.call(p,'killerImage')&&!!oldK!==!!S.match.killerImage){
   let b=matchWin.getBounds();
   if(S.match.killerImage){b.width+=140;if(S.match.killerLeft)b.x-=140}
   else{b.width=Math.max(560,b.width-140);if(oldLeft)b.x+=140}
   b=displayClamp(b);matchWin.setBounds(b);Object.assign(S.match,{x:b.x,y:b.y,w:b.width,h:b.height});
 }
 if(section==='match'&&Object.prototype.hasOwnProperty.call(p,'killerLeft')&&S.match.killerImage&&oldLeft!==S.match.killerLeft){
   let b=matchWin.getBounds();b.x+=S.match.killerLeft?-140:140;b=displayClamp(b);matchWin.setBounds(b);Object.assign(S.match,{x:b.x,y:b.y,w:b.width,h:b.height});
 }
 if(section==='streak'&&(p.w!==undefined||p.h!==undefined)){const b=displayClamp({...streakWin.getBounds(),width:S.streak.w,height:S.streak.h});streakWin.setBounds(b);Object.assign(S.streak,{x:b.x,y:b.y,w:b.width,h:b.height})}
 if(section==='match'&&(p.w!==undefined||p.h!==undefined)){const b=displayClamp({...matchWin.getBounds(),width:S.match.w,height:S.match.h});matchWin.setBounds(b);Object.assign(S.match,{x:b.x,y:b.y,w:b.width,h:b.height})}
 save();visibility();push();return S});
ipcMain.handle('edit',(_,v)=>{setEdit(v);return S});ipcMain.handle('save-bounds',()=>{syncBounds();setEdit(false);ui.webContents.send('dirty',false);return S});
ipcMain.handle('reset',(_,section)=>{if(section==='streak'){const keep={value:S.streak.value,hotkey:S.streak.hotkey,x:S.streak.x,y:S.streak.y,w:S.streak.w,h:S.streak.h,enabled:S.streak.enabled};S.streak={...clone(DEF.streak),...keep}}else{const pos={x:S.match.x,y:S.match.y,w:S.match.w,h:S.match.h,enabled:S.match.enabled};S.match={...clone(DEF.match),...pos}}save();visibility();return S});
ipcMain.handle('hotkey',(_,k)=>hotkey(k));ipcMain.handle('quit-app',()=>{quitting=true;app.quit()});
let dragSession=null;
ipcMain.on('drag-start',(e,key,mouse)=>{
 if(!editing)return;const w=key==='streak'?streakWin:matchWin;if(!w||w.isDestroyed())return;
 dragSession={w,key,start:w.getBounds(),mx:mouse.x,my:mouse.y};
});
ipcMain.on('drag-move',(e,mouse)=>{
 const z=dragSession;if(!z||!editing)return;
 const d=screen.getDisplayMatching(z.start),b=d.bounds;
 let x=z.start.x+(mouse.x-z.mx),y=z.start.y+(mouse.y-z.my);
 // Hard monitor bounds while dragging. Small edge magnet, but no persistent lock.
 const maxX=b.x+b.width-z.start.width,maxY=b.y+b.height-z.start.height,snap=10;
 x=Math.max(b.x,Math.min(x,maxX));y=Math.max(b.y,Math.min(y,maxY));
 if(Math.abs(x-b.x)<=snap)x=b.x;if(Math.abs(x-maxX)<=snap)x=maxX;
 if(Math.abs(y-b.y)<=snap)y=b.y;if(Math.abs(y-maxY)<=snap)y=maxY;
 z.w.setPosition(Math.round(x),Math.round(y));syncGuide(z.w);
});
ipcMain.on('drag-end',()=>{dragSession=null});
let resizeSession=null;
ipcMain.on('resize-start',(e,key,edge,mouse)=>{
 if(!editing)return;const w=key==='streak'?streakWin:matchWin;if(!w||w.isDestroyed())return;
 resizeSession={w,key,edge,start:w.getBounds(),mx:mouse.x,my:mouse.y};
});
ipcMain.on('resize-move',(e,mouse)=>{
 const z=resizeSession;if(!z||!editing)return;let {x,y,width,height}=z.start;const dx=mouse.x-z.mx,dy=mouse.y-z.my;
 if(z.edge.includes('e'))width+=dx;if(z.edge.includes('s'))height+=dy;
 if(z.edge.includes('w')){x+=dx;width-=dx}if(z.edge.includes('n')){y+=dy;height-=dy}
 const minW=z.key==='streak'?280:560,minH=z.key==='streak'?88:145,maxW=z.key==='streak'?520:1050,maxH=z.key==='streak'?165:420;
 if(width<minW){if(z.edge.includes('w'))x-=minW-width;width=minW}if(height<minH){if(z.edge.includes('n'))y-=minH-height;height=minH}
 width=Math.min(maxW,width);height=Math.min(maxH,height);z.w.setBounds({x:Math.round(x),y:Math.round(y),width:Math.round(width),height:Math.round(height)});syncGuide(z.w);
});
ipcMain.on('resize-end',()=>{resizeSession=null});
app.whenReady().then(()=>{load();startServer();create();if(S.streak.hotkey)hotkey(S.streak.hotkey);setTimeout(push,300)});
app.on('before-quit',()=>{quitting=true;globalShortcut.unregisterAll();server?.close()});app.on('window-all-closed',()=>{if(quitting)app.quit()});
