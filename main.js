const {app,BrowserWindow,ipcMain,screen,Tray,Menu,nativeImage,globalShortcut,shell}=require('electron');
const path=require('path'),fs=require('fs'),http=require('http'),url=require('url'),MAPS=require('./maps');
let editor,streak,mapWin,control,tray,server,quitting=false,lastHotkey=0;
const PORT=17384,EXTS=['.png','.jpg','.jpeg','.webp'];
const defaults={language:'pt',style:0,title:'WIN STREAK',value:0,nameColor:'#ffffff',numberColor:'#d7b84a',accent:'#d7b84a',nameFont:'Segoe UI',numberFont:'Impact',nameFontSize:18,numberFontSize:58,nameOffsetX:0,numberOffsetX:0,shadow:true,transparentBg:false,streakEnabled:true,mapEnabled:true,hotkey:'',
streak:{x:40,y:40,w:380,h:120,visible:true,scale:1},map:{x:1400,y:120,w:420,h:420,visible:false,name:'',image:'',scale:1}};
let S;
const sp=()=>path.join(app.getPath('userData'),'settings.json'), userMaps=()=>path.join(app.getPath('userData'),'maps');
function syncBundledMaps(){const bundled=path.join(__dirname,'maps');fs.mkdirSync(userMaps(),{recursive:true});if(!fs.existsSync(bundled))return;for(const f of fs.readdirSync(bundled)){const ext=path.extname(f).toLowerCase();if(!EXTS.includes(ext))continue;const a=path.join(bundled,f),b=path.join(userMaps(),f);if(!fs.existsSync(b))try{fs.copyFileSync(a,b)}catch{}}}
function load(){
 try{
  let j=JSON.parse(fs.readFileSync(sp(),'utf8'));
  S={...defaults,...j,streak:{...defaults.streak,...(j.streak||{})},map:{...defaults.map,...(j.map||{})}};
 }catch{
  S=structuredClone(defaults);
 }
 fs.mkdirSync(userMaps(),{recursive:true});syncBundledMaps();
 S.streak.scale=Math.max(.55,Math.min(1.5,+S.streak.scale||1));
 S.map.scale=Math.max(.40,Math.min(.77,+S.map.scale||.77));
 S.streak.w=Math.round(380*S.streak.scale); S.streak.h=Math.round(120*S.streak.scale);
 S.map.w=Math.round(420*S.map.scale); S.map.h=Math.round(420*S.map.scale);
 S.nameFontSize=Math.max(10,Math.min(42,+S.nameFontSize||18));
 S.numberFontSize=Math.max(24,Math.min(100,+S.numberFontSize||58));
}
function save(){fs.writeFileSync(sp(),JSON.stringify(S,null,2));broadcast();applyVisibility()}
function send(w,c,d){if(w&&!w.isDestroyed())w.webContents.send(c,d)}
function dirty(v=true){send(editor,'dirty',v)}
function broadcast(){[editor,streak,mapWin].forEach(w=>send(w,'settings',S))}
function overlayOpts(w,h){return{width:w,height:h,frame:false,transparent:true,hasShadow:false,show:false,skipTaskbar:true,resizable:true,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}}}
function clampRect(b,prev=null){
 const d=screen.getDisplayMatching(b),wa=d.workArea;
 const width=Math.min(Math.max(120,b.width),wa.width),height=Math.min(Math.max(70,b.height),wa.height);
 let x=Math.max(wa.x,Math.min(b.x,wa.x+wa.width-width)),y=Math.max(wa.y,Math.min(b.y,wa.y+wa.height-height));
 const snap=18,release=30;
 const nearL=Math.abs(x-wa.x)<=snap,nearR=Math.abs((x+width)-(wa.x+wa.width))<=snap,nearT=Math.abs(y-wa.y)<=snap,nearB=Math.abs((y+height)-(wa.y+wa.height))<=snap;
 if(prev){
   const wasL=Math.abs(prev.x-wa.x)<2,wasR=Math.abs((prev.x+prev.width)-(wa.x+wa.width))<2,wasT=Math.abs(prev.y-wa.y)<2,wasB=Math.abs((prev.y+prev.height)-(wa.y+wa.height))<2;
   if(wasL && b.x>wa.x+release){} else if(nearL)x=wa.x;
   if(wasR && b.x+width<wa.x+wa.width-release){} else if(nearR)x=wa.x+wa.width-width;
   if(wasT && b.y>wa.y+release){} else if(nearT)y=wa.y;
   if(wasB && b.y+height<wa.y+wa.height-release){} else if(nearB)y=wa.y+wa.height-height;
 }else{
   if(nearL)x=wa.x; else if(nearR)x=wa.x+wa.width-width;
   if(nearT)y=wa.y; else if(nearB)y=wa.y+wa.height-height;
 }
 return{x,y,width,height};
}
function bounds(c){return clampRect({x:c.x,y:c.y,width:c.w,height:c.h})}
function makeEditor(){editor=new BrowserWindow({width:1140,height:830,minWidth:950,minHeight:690,backgroundColor:'#0e1014',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});editor.setMenuBarVisibility(false);editor.loadFile('app.html');editor.on('close',e=>{if(!quitting){e.preventDefault();editor.hide()}})}
function setup(w){w.setAlwaysOnTop(true,'screen-saver');w.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});w.setIgnoreMouseEvents(true,{forward:true})}
function makeWindows(){
 streak=new BrowserWindow(overlayOpts(S.streak.w,S.streak.h));streak.loadFile('overlay.html');setup(streak);streak.setBounds(bounds(S.streak));
 mapWin=new BrowserWindow(overlayOpts(S.map.w,S.map.h));mapWin.loadFile('map-overlay.html');setup(mapWin);mapWin.setBounds(bounds(S.map));
 for(const w of [streak,mapWin]){
  let fixing=false,last=w.getBounds();
  const constrain=()=>{if(fixing)return;fixing=true;const raw=w.getBounds(),c=clampRect(raw,last);if(raw.x!==c.x||raw.y!==c.y||raw.width!==c.width||raw.height!==c.height)w.setBounds(c);last=c;dirty(true);fixing=false};
  w.on('move',constrain);w.on('resize',constrain);
 }
 control=new BrowserWindow({width:36,height:36,x:0,y:0,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 control.loadFile('control.html');control.setAlwaysOnTop(true,'screen-saver');control.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});control.setContentProtection(true);control.showInactive();applyVisibility();
}
function applyVisibility(){if(!streak)return;(S.streakEnabled&&S.streak.visible)?streak.showInactive():streak.hide();(S.mapEnabled&&S.map.visible)?mapWin.showInactive():mapWin.hide()}
function edit(on){for(const w of [streak,mapWin]){w.setIgnoreMouseEvents(!on,{forward:true});w.setResizable(on);send(w,'edit-mode',on)}if(on){if(S.streakEnabled)streak.show();if(S.mapEnabled&&S.map.visible)mapWin.show()}else applyVisibility()}
function persistBounds(){for(const [w,k] of [[streak,'streak'],[mapWin,'map']]){const b=clampRect(w.getBounds());w.setBounds(b);S[k]={...S[k],x:b.x,y:b.y,w:b.width,h:b.height}}save();dirty(false)}
function scaleOverlay(k,v){
 const lim=k==='streak'?[.78,1.22]:[.48,.72];
 v=Math.max(lim[0],Math.min(lim[1],Number(v)||1));
 const base=k==='streak'?{w:380,h:120}:{w:420,h:420};
 const w=k==='streak'?streak:mapWin,old=w.getBounds();
 const nw=Math.round(base.w*v),nh=Math.round(base.h*v);
 const b=clampRect({x:Math.round(old.x+(old.width-nw)/2),y:Math.round(old.y+(old.height-nh)/2),width:nw,height:nh});
 S[k].scale=v;S[k].x=b.x;S[k].y=b.y;S[k].w=b.width;S[k].h=b.height;
 w.setBounds(b);save();dirty(true);
}
function mapCatalog(){return MAPS.map(name=>({name,hasImage:!!mapImage(name)}))}
function mapImage(name){for(const dir of [userMaps(),path.join(__dirname,'maps')])for(const ext of EXTS){let p=path.join(dir,name+ext);if(fs.existsSync(p))return p}return ''}
function chooseMap(name){S.map.name=name;S.map.image=mapImage(name);S.map.visible=true;S.mapEnabled=true;save();dirty(true);return S.map.image}
function inc(){let now=Date.now();if(now-lastHotkey<2000)return;lastHotkey=now;S.value=(+S.value||0)+1;save()}
function registerHotkey(acc){globalShortcut.unregisterAll();S.hotkey=acc||'';if(acc){try{if(!globalShortcut.register(acc,inc))return false}catch{return false}}save();return true}
function trayMenu(){return Menu.buildFromTemplate([{label:'Abrir programa',click:()=>{editor.show();editor.focus()}},{label:'Selecionar mapa',click:()=>{editor.show();editor.focus();send(editor,'open-tab','maps')}},{type:'separator'},{label:'Sair completamente',click:()=>{quitting=true;app.quit()}}])}
function makeTray(){tray=new Tray(nativeImage.createEmpty());tray.setToolTip('DBD Overlay Map & WinStreak');tray.setContextMenu(trayMenu());tray.on('double-click',()=>{editor.show();editor.focus()})}
function browserHTML(){return fs.readFileSync(path.join(__dirname,'browser-overlay.html'),'utf8')}
function startServer(){server=http.createServer((req,res)=>{let u=url.parse(req.url,true);
 if(u.pathname==='/state'){res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});return res.end(JSON.stringify(S))}
 if(u.pathname==='/overlay'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(browserHTML())}
 if(u.pathname==='/map-image'){
   if(!S.map.image||!fs.existsSync(S.map.image)){res.writeHead(404);return res.end()}
   const ext=path.extname(S.map.image).toLowerCase(),types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
   res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});
   return fs.createReadStream(S.map.image).pipe(res);
 }
 res.writeHead(404);res.end()
 }).listen(PORT,'127.0.0.1')}
app.whenReady().then(()=>{load();makeEditor();makeWindows();makeTray();startServer();if(S.hotkey)registerHotkey(S.hotkey);setTimeout(broadcast,400)});
app.on('before-quit',()=>{quitting=true;globalShortcut.unregisterAll();if(server)server.close()});app.on('window-all-closed',()=>{if(quitting)app.quit()});
ipcMain.handle('get-settings',()=>({settings:S,maps:mapCatalog(),urls:{overlay:`http://127.0.0.1:${PORT}/overlay`},mapsDir:userMaps()}));
ipcMain.handle('patch',(_,p)=>{
 S={...S,...p};if(p.streak)S.streak={...S.streak,...p.streak};if(p.map)S.map={...S.map,...p.map};
 S.nameFontSize=Math.max(10,Math.min(42,+S.nameFontSize||18));
 S.numberFontSize=Math.max(24,Math.min(100,+S.numberFontSize||58));
 save();
 const nonVisual=Object.keys(p).every(k=>['language','hotkey'].includes(k)); if(!nonVisual)dirty(true);
 return S
});
ipcMain.handle('refresh-maps',()=>mapCatalog());ipcMain.handle('open-maps-dir',()=>{syncBundledMaps();shell.openPath(userMaps());return userMaps()});ipcMain.handle('select-map',(_,n)=>chooseMap(n));ipcMain.handle('edit',(_,x)=>{edit(x);return true});ipcMain.handle('save-pos',()=>{persistBounds();edit(false);return S});
ipcMain.handle('scale',(_,k,v)=>{scaleOverlay(k,v);return S});ipcMain.handle('hotkey',(_,a)=>registerHotkey(a));
ipcMain.handle('open-editor',(_,t='maps')=>{editor.show();editor.focus();send(editor,'open-tab',t);return true});
ipcMain.handle('quit',()=>{quitting=true;app.quit()});
