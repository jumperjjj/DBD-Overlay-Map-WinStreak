const {app,BrowserWindow,ipcMain,screen,Tray,Menu,nativeImage,globalShortcut}=require('electron');
const path=require('path'),fs=require('fs'),http=require('http'),url=require('url'),MAPS=require('./maps');
let editor,streak,mapWin,control,tray,server,quitting=false,lastHotkey=0;
const PORT=17384,EXTS=['.png','.jpg','.jpeg','.webp'];
const defaults={language:'pt',style:0,title:'WIN STREAK',value:0,nameColor:'#ffffff',numberColor:'#d7b84a',accent:'#d7b84a',nameFont:'Segoe UI',numberFont:'Impact',streakEnabled:true,mapEnabled:true,hotkey:'',
streak:{x:40,y:40,w:380,h:120,visible:true,scale:1},map:{x:1400,y:120,w:420,h:420,visible:false,name:'',image:'',scale:1}};
let S;
const sp=()=>path.join(app.getPath('userData'),'settings.json'), userMaps=()=>path.join(app.getPath('userData'),'maps');
function load(){
 try{
  let j=JSON.parse(fs.readFileSync(sp(),'utf8'));
  S={...defaults,...j,streak:{...defaults.streak,...(j.streak||{})},map:{...defaults.map,...(j.map||{})}};
 }catch{
  S=structuredClone(defaults);
 }
 fs.mkdirSync(userMaps(),{recursive:true});
}
function save(){fs.writeFileSync(sp(),JSON.stringify(S,null,2));broadcast();applyVisibility()}
function send(w,c,d){if(w&&!w.isDestroyed())w.webContents.send(c,d)}
function broadcast(){[editor,streak,mapWin].forEach(w=>send(w,'settings',S))}
function overlayOpts(w,h){return{width:w,height:h,frame:false,transparent:true,hasShadow:false,show:false,skipTaskbar:true,resizable:true,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}}}
function bounds(c){let wa=screen.getPrimaryDisplay().workArea;return{x:Math.max(0,Math.min(c.x,wa.width-80)),y:Math.max(0,Math.min(c.y,wa.height-50)),width:Math.max(120,c.w),height:Math.max(70,c.h)}}
function makeEditor(){editor=new BrowserWindow({width:1140,height:830,minWidth:950,minHeight:690,backgroundColor:'#0e1014',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});editor.setMenuBarVisibility(false);editor.loadFile('app.html');editor.on('close',e=>{if(!quitting){e.preventDefault();editor.hide()}})}
function setup(w){w.setAlwaysOnTop(true,'screen-saver');w.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});w.setIgnoreMouseEvents(true,{forward:true})}
function makeWindows(){streak=new BrowserWindow(overlayOpts(S.streak.w,S.streak.h));streak.loadFile('overlay.html');setup(streak);streak.setBounds(bounds(S.streak));
 mapWin=new BrowserWindow(overlayOpts(S.map.w,S.map.h));mapWin.loadFile('map-overlay.html');setup(mapWin);mapWin.setBounds(bounds(S.map));
 control=new BrowserWindow({width:36,height:36,x:0,y:0,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 control.loadFile('control.html');control.setAlwaysOnTop(true,'screen-saver');control.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});control.setContentProtection(true);control.showInactive();applyVisibility()}
function applyVisibility(){if(!streak)return;(S.streakEnabled&&S.streak.visible)?streak.showInactive():streak.hide();(S.mapEnabled&&S.map.visible)?mapWin.showInactive():mapWin.hide()}
function edit(on){for(const w of [streak,mapWin]){w.setIgnoreMouseEvents(!on,{forward:true});w.setResizable(on);send(w,'edit-mode',on)}if(on){if(S.streakEnabled)streak.show();if(S.mapEnabled&&S.map.visible)mapWin.show()}else applyVisibility()}
function persistBounds(){for(const [w,k] of [[streak,'streak'],[mapWin,'map']]){let b=w.getBounds();S[k]={...S[k],x:b.x,y:b.y,w:b.width,h:b.height}}save()}
function scaleOverlay(k,v){v=Math.max(.55,Math.min(1.8,+v));S[k].scale=v;let base=k==='streak'?{w:380,h:120}:{w:420,h:420},w=k==='streak'?streak:mapWin;S[k].w=Math.round(base.w*v);S[k].h=Math.round(base.h*v);w.setSize(S[k].w,S[k].h);save()}
function mapImage(name){for(const dir of [userMaps(),path.join(__dirname,'maps')])for(const ext of EXTS){let p=path.join(dir,name+ext);if(fs.existsSync(p))return p}return ''}
function chooseMap(name){S.map.name=name;S.map.image=mapImage(name);S.map.visible=true;S.mapEnabled=true;save();return S.map.image}
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
ipcMain.handle('get-settings',()=>({settings:S,maps:MAPS,urls:{overlay:`http://127.0.0.1:${PORT}/overlay`},mapsDir:userMaps()}));
ipcMain.handle('patch',(_,p)=>{S={...S,...p};if(p.streak)S.streak={...S.streak,...p.streak};if(p.map)S.map={...S.map,...p.map};save();return S});
ipcMain.handle('select-map',(_,n)=>chooseMap(n));ipcMain.handle('edit',(_,x)=>{edit(x);return true});ipcMain.handle('save-pos',()=>{persistBounds();edit(false);return S});
ipcMain.handle('scale',(_,k,v)=>{scaleOverlay(k,v);return S});ipcMain.handle('hotkey',(_,a)=>registerHotkey(a));
ipcMain.handle('open-editor',(_,t='maps')=>{editor.show();editor.focus();send(editor,'open-tab',t);return true});
ipcMain.handle('quit',()=>{quitting=true;app.quit()});
