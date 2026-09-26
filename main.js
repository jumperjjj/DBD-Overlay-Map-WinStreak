const {app,BrowserWindow,ipcMain,screen,dialog,Tray,Menu,nativeImage,shell,clipboard}=require('electron');
const path=require('path'),fs=require('fs'),http=require('http'),url=require('url'),MAPS=require('./maps');
let editor,streak,mapWin,control,tray,server,quitting=false,editMode=false;
const PORT=17384;
const defaults={style:0,title:'WIN STREAK',value:0,nameColor:'#ffffff',numberColor:'#d7b84a',accent:'#d7b84a',
 nameFont:'Segoe UI',numberFont:'Segoe UI',streakEnabled:true,mapEnabled:true,
 streak:{x:40,y:40,w:380,h:120,visible:true},map:{x:1400,y:120,w:420,h:420,visible:false,name:'',image:''}};
let S;
const sp=()=>path.join(app.getPath('userData'),'settings.json');
const mapsDir=()=>path.join(app.getPath('userData'),'maps');
function load(){
  try {
    const j=JSON.parse(fs.readFileSync(sp(),'utf8'));
    S={...defaults,...j,streak:{...defaults.streak,...(j.streak||{})},map:{...defaults.map,...(j.map||{})}};
  } catch {
    S=structuredClone(defaults);
  }
  fs.mkdirSync(mapsDir(),{recursive:true});
}
function save(){fs.writeFileSync(sp(),JSON.stringify(S,null,2));broadcast();applyVisibility()}
function send(w,c,d){if(w&&!w.isDestroyed())w.webContents.send(c,d)}
function broadcast(){[editor,streak,mapWin].forEach(w=>send(w,'settings',S))}
function overlayOpts(w,h){return {width:w,height:h,frame:false,transparent:true,hasShadow:false,show:false,skipTaskbar:true,resizable:true,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}}}
function clampBounds(cfg){let wa=screen.getPrimaryDisplay().workArea;return{x:Math.max(0,Math.min(cfg.x,wa.width-80)),y:Math.max(0,Math.min(cfg.y,wa.height-50)),width:Math.max(120,cfg.w),height:Math.max(70,cfg.h)}}
function makeEditor(){editor=new BrowserWindow({width:1120,height:820,minWidth:940,minHeight:680,backgroundColor:'#0e1014',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});editor.setMenuBarVisibility(false);editor.loadFile('app.html');editor.on('close',e=>{if(!quitting){e.preventDefault();editor.hide()}})}
function setupOverlay(w){w.setAlwaysOnTop(true,'screen-saver');w.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});w.setIgnoreMouseEvents(true,{forward:true})}
function makeWindows(){
 streak=new BrowserWindow(overlayOpts(S.streak.w,S.streak.h));streak.loadFile('overlay.html');setupOverlay(streak);streak.setBounds(clampBounds(S.streak));
 mapWin=new BrowserWindow(overlayOpts(S.map.w,S.map.h));mapWin.loadFile('map-overlay.html');setupOverlay(mapWin);mapWin.setBounds(clampBounds(S.map));
 control=new BrowserWindow({width:36,height:36,x:0,y:0,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 control.loadFile('control.html');control.setAlwaysOnTop(true,'screen-saver');control.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});control.setContentProtection(true);control.showInactive();
 applyVisibility();
}
function applyVisibility(){if(!streak||!mapWin)return;(S.streakEnabled&&S.streak.visible)?streak.showInactive():streak.hide();(S.mapEnabled&&S.map.visible)?mapWin.showInactive():mapWin.hide()}
function setEdit(on){editMode=on;for(const w of [streak,mapWin]){w.setIgnoreMouseEvents(!on,{forward:true});w.setResizable(on);send(w,'edit-mode',on)}if(on){if(S.streakEnabled)streak.show();if(S.mapEnabled&&S.map.visible)mapWin.show()}else applyVisibility()}
function saveBounds(){for(const [w,k] of [[streak,'streak'],[mapWin,'map']]){let b=w.getBounds();S[k]={...S[k],x:b.x,y:b.y,w:b.width,h:b.height}}setEdit(false);save();return S}
function setBounds(k,b){let w=k==='map'?mapWin:streak,Sb=S[k];S[k]={...Sb,...b};w.setBounds(clampBounds(S[k]));save()}
function makeTray(){
 const ico=nativeImage.createEmpty();tray=new Tray(ico);tray.setToolTip('DBD Overlay Map & WinStreak');
 tray.setContextMenu(Menu.buildFromTemplate([
  {label:'Abrir programa',click:()=>{editor.show();editor.focus()}},
  {label:'Selecionar mapa',click:()=>{editor.show();editor.focus();send(editor,'open-tab','maps')}},
  {type:'separator'},
  {label:'Ligar/Desligar WinStreak',click:()=>{S.streakEnabled=!S.streakEnabled;save()}},
  {label:'Ligar/Desligar Mapa',click:()=>{S.mapEnabled=!S.mapEnabled;save()}},
  {type:'separator'},{label:'Sair completamente',click:()=>{quitting=true;app.quit()}}
 ]));
 tray.on('double-click',()=>{editor.show();editor.focus()});
}
function browserHTML(){
 const p=path.join(__dirname,'browser-overlay.html');return fs.readFileSync(p,'utf8');
}
function startServer(){server=http.createServer((req,res)=>{let u=url.parse(req.url,true);
 if(u.pathname==='/state'){res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});return res.end(JSON.stringify(S))}
 if(u.pathname==='/winstreak'||u.pathname==='/map'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(browserHTML().replace('__MODE__',u.pathname.slice(1)))}
 res.writeHead(404);res.end('Not found')}).listen(PORT,'127.0.0.1')}
app.whenReady().then(()=>{load();makeEditor();makeWindows();makeTray();startServer();setTimeout(broadcast,500)});
app.on('before-quit',()=>{quitting=true;if(server)server.close()});app.on('window-all-closed',e=>{if(quitting)app.quit()});
ipcMain.handle('get-settings',()=>({settings:S,maps:MAPS,urls:{streak:`http://127.0.0.1:${PORT}/winstreak`,map:`http://127.0.0.1:${PORT}/map`},mapsDir:mapsDir()}));
ipcMain.handle('patch',(_,p)=>{S={...S,...p};if(p.streak)S.streak={...S.streak,...p.streak};if(p.map)S.map={...S.map,...p.map};save();return S});
ipcMain.handle('edit-mode',(_,on)=>{setEdit(on);return true});ipcMain.handle('save-bounds',()=>saveBounds());
ipcMain.handle('set-bounds',(_,k,b)=>{setBounds(k,b);return S});
ipcMain.handle('open-editor',(_,tab='maps')=>{editor.show();editor.focus();send(editor,'open-tab',tab);return true});
ipcMain.handle('choose-map-image',async()=>{let r=await dialog.showOpenDialog(editor,{title:'Escolher imagem do mapa',defaultPath:mapsDir(),properties:['openFile'],filters:[{name:'Imagens',extensions:['png','jpg','jpeg','webp']}]});if(r.canceled)return null;S.map.image=r.filePaths[0];S.map.visible=true;S.mapEnabled=true;save();return S.map.image});
ipcMain.handle('open-maps-folder',()=>shell.openPath(mapsDir()));
ipcMain.handle('copy',(_,t)=>{clipboard.writeText(t);return true});
ipcMain.handle('quit',()=>{quitting=true;app.quit();return true});
