const {app,BrowserWindow,ipcMain,screen,dialog}=require('electron');
const path=require('path'),fs=require('fs'),MAPS=require('./maps');
let editor,streak,mapWin,control;
const defaults={style:0,title:'WIN STREAK',value:0,accent:'#d7b84a',text:'#ffffff',bg:'#111318',font:'Segoe UI',scale:1,
 streak:{x:null,y:null,w:340,h:104,visible:true},map:{x:null,y:null,w:420,h:420,visible:false,name:'',image:''}};
let settings;
function settingsPath(){return path.join(app.getPath('userData'),'settings.json')}
function load(){try{settings={...defaults,...JSON.parse(fs.readFileSync(settingsPath(),'utf8'))};settings.streak={...defaults.streak,...settings.streak};settings.map={...defaults.map,...settings.map}}catch{settings=structuredClone(defaults)}}
function save(){fs.writeFileSync(settingsPath(),JSON.stringify(settings,null,2));broadcast()}
function opts(w,h){return {width:w,height:h,frame:false,transparent:true,hasShadow:false,show:false,skipTaskbar:true,resizable:true,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}}}
function place(win,cfg,defX,defY){const wa=screen.getPrimaryDisplay().workArea;let x=cfg.x??defX,y=cfg.y??defY;win.setBounds({x,y,width:cfg.w,height:cfg.h})}
function makeEditor(){editor=new BrowserWindow({width:1080,height:760,minWidth:900,minHeight:650,backgroundColor:'#0e1014',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});editor.setMenuBarVisibility(false);editor.loadFile('app.html');editor.on('close',e=>{if(!app.quitting){e.preventDefault();editor.hide()}})}
function makeOverlays(){
 streak=new BrowserWindow(opts(settings.streak.w,settings.streak.h));streak.loadFile('overlay.html');streak.setAlwaysOnTop(true,'screen-saver');streak.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});streak.setIgnoreMouseEvents(true,{forward:true});place(streak,settings.streak,40,40);if(settings.streak.visible)streak.showInactive();
 mapWin=new BrowserWindow(opts(settings.map.w,settings.map.h));mapWin.loadFile('map-overlay.html');mapWin.setAlwaysOnTop(true,'screen-saver');mapWin.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});mapWin.setIgnoreMouseEvents(true,{forward:true});place(mapWin,settings.map,screen.getPrimaryDisplay().workArea.width-settings.map.w-30,100);if(settings.map.visible)mapWin.showInactive();
 // Separate protected control window: intended to be visible locally but excluded from capture on supported Windows capture paths.
 control=new BrowserWindow({width:34,height:34,x:0,y:0,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,alwaysOnTop:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 control.loadFile('control.html');control.setAlwaysOnTop(true,'screen-saver');control.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});control.setContentProtection(true);control.showInactive();
}
function broadcast(){for(const w of [editor,streak,mapWin])if(w&&!w.isDestroyed())w.webContents.send('settings',settings)}
function syncBounds(){for(const [w,k] of [[streak,'streak'],[mapWin,'map']])if(w&&!w.isDestroyed()){let b=w.getBounds();settings[k]={...settings[k],x:b.x,y:b.y,w:b.width,h:b.height}}save()}
function editMode(on){for(const w of [streak,mapWin])if(w&&!w.isDestroyed()){w.setIgnoreMouseEvents(!on,{forward:true});w.setResizable(on);w.webContents.send('edit-mode',on)}}
app.whenReady().then(()=>{load();makeEditor();makeOverlays();setTimeout(broadcast,500)});
app.on('before-quit',()=>{app.quitting=true;syncBounds()});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
ipcMain.handle('get-settings',()=>({settings,maps:MAPS}));
ipcMain.handle('patch',(_,p)=>{settings={...settings,...p};if(p.streak)settings.streak={...settings.streak,...p.streak};if(p.map)settings.map={...settings.map,...p.map};save();if(streak)settings.streak.visible?streak.showInactive():streak.hide();if(mapWin)settings.map.visible?mapWin.showInactive():mapWin.hide();return settings});
ipcMain.handle('edit-mode',(_,on)=>{editMode(on);return true});
ipcMain.handle('save-bounds',()=>{syncBounds();editMode(false);return settings});
ipcMain.handle('open-editor',(_,tab='maps')=>{editor.show();editor.focus();editor.webContents.send('open-tab',tab);return true});
ipcMain.handle('choose-map-image',async()=>{let r=await dialog.showOpenDialog(editor,{title:'Escolher imagem do mapa',properties:['openFile'],filters:[{name:'Imagens',extensions:['png','jpg','jpeg','webp']}]});if(r.canceled)return null;settings.map.image=r.filePaths[0];settings.map.visible=true;save();mapWin.showInactive();return settings.map.image});
ipcMain.handle('reset-map-image',()=>{settings.map.image='';save();return true});
