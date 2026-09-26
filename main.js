const {app,BrowserWindow,ipcMain,screen,Tray,Menu,nativeImage,globalShortcut}=require('electron');
const path=require('path'),fs=require('fs'),http=require('http'),url=require('url');
let editor,streak,teamWin,control,tray,server,quitting=false,lastHotkey=0,resizeJob=null;
const PORT=17384;
const defaults={
 language:'pt',style:0,title:'WIN STREAK',value:0,nameColor:'#ffffff',numberColor:'#d7b84a',accent:'#d7b84a',boxColor:'#15191f',boxColor2:'#09090b',nameFont:'Segoe UI',numberFont:'Impact',nameFontSize:18,numberFontSize:58,nameOffsetX:0,numberOffsetX:0,shadow:true,nameBold:true,bgOpacity:1,letterSpacing:0,numberSpacing:0,nameUpper:false,streakEnabled:true,hotkey:'',
 streak:{x:40,y:40,w:380,h:120,visible:true,scale:1},
 teamEnabled:false,teamStyle:0,teamLabel:'CONFRONTO',teamA:'TIME A',teamB:'TIME B',teamScoreA:0,teamScoreB:0,teamColorA:'#d7b84a',teamColorB:'#ffffff',teamBg:'#11151b',teamText:'#ffffff',
 team:{x:610,y:40,w:700,h:110,visible:true,scale:1}
};
let S;
const sp=()=>path.join(app.getPath('userData'),'settings.json');
function load(){try{const j=JSON.parse(fs.readFileSync(sp(),'utf8'));S={...defaults,...j,streak:{...defaults.streak,...(j.streak||{})},team:{...defaults.team,...(j.team||{})}}}catch{S=structuredClone(defaults)}
 S.streak.scale=Math.max(.78,Math.min(1.22,+S.streak.scale||1));S.team.scale=Math.max(.65,Math.min(1.15,+S.team.scale||1));
 S.streak.w=Math.round(380*S.streak.scale);S.streak.h=Math.round(120*S.streak.scale);S.team.w=Math.round(700*S.team.scale);S.team.h=Math.round(110*S.team.scale);
}
function save(){fs.writeFileSync(sp(),JSON.stringify(S,null,2));broadcast()}
function send(w,ch,x){if(w&&!w.isDestroyed())w.webContents.send(ch,x)}
function broadcast(){for(const w of [editor,streak,teamWin])send(w,'settings',S)}
function dirty(x=true){send(editor,'dirty',x)}
function overlayOpts(width,height){return{width,height,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}}}
function bounds(o){return{x:o.x,y:o.y,width:o.w,height:o.h}}
function clampRect(b){const d=screen.getDisplayMatching(b),wa=d.workArea;const width=Math.min(Math.max(120,b.width),wa.width),height=Math.min(Math.max(70,b.height),wa.height);return{x:Math.max(wa.x,Math.min(b.x,wa.x+wa.width-width)),y:Math.max(wa.y,Math.min(b.y,wa.y+wa.height-height)),width,height}}
function makeEditor(){editor=new BrowserWindow({width:1140,height:830,minWidth:950,minHeight:690,backgroundColor:'#0e1014',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});editor.setMenuBarVisibility(false);editor.loadFile('app.html');editor.on('close',e=>{if(!quitting){e.preventDefault();editor.hide()}})}
function setup(w){w.setAlwaysOnTop(true,'screen-saver');w.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});w.setIgnoreMouseEvents(true,{forward:true})}
function constrainWindow(w){let fixing=false;const fn=()=>{if(fixing)return;fixing=true;const raw=w.getBounds(),c=clampRect(raw);if(JSON.stringify(raw)!==JSON.stringify(c))w.setBounds(c);dirty(true);fixing=false};w.on('move',fn);w.on('resize',fn)}
function makeWindows(){
 streak=new BrowserWindow(overlayOpts(S.streak.w,S.streak.h));streak.loadFile('overlay.html');setup(streak);streak.setBounds(bounds(S.streak));constrainWindow(streak);
 teamWin=new BrowserWindow(overlayOpts(S.team.w,S.team.h));teamWin.loadFile('team-overlay.html');setup(teamWin);teamWin.setBounds(bounds(S.team));constrainWindow(teamWin);
 control=new BrowserWindow({width:36,height:36,x:0,y:0,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 control.loadFile('control.html');control.setAlwaysOnTop(true,'screen-saver');control.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});control.setContentProtection(true);control.showInactive();applyVisibility();
}
function applyVisibility(){if(!streak)return;(S.streakEnabled&&S.streak.visible)?streak.showInactive():streak.hide();(S.teamEnabled&&S.team.visible)?teamWin.showInactive():teamWin.hide()}
function edit(on){for(const w of [streak,teamWin]){w.setIgnoreMouseEvents(!on,{forward:true});w.setResizable(false);send(w,'edit-mode',on)}if(on){if(S.streakEnabled)streak.show();if(S.teamEnabled)teamWin.show()}else applyVisibility()}
function persistBounds(){for(const [w,k] of [[streak,'streak'],[teamWin,'team']]){const b=clampRect(w.getBounds());w.setBounds(b);S[k]={...S[k],x:b.x,y:b.y,w:b.width,h:b.height}}save();dirty(false)}
function scaleOverlay(k,v){const cfg=k==='streak'?{min:.78,max:1.22,w:380,h:120}:{min:.65,max:1.15,w:700,h:110};v=Math.max(cfg.min,Math.min(cfg.max,Number(v)||1));const w=k==='streak'?streak:teamWin,old=w.getBounds(),nw=Math.round(cfg.w*v),nh=Math.round(cfg.h*v),b=clampRect({x:Math.round(old.x+(old.width-nw)/2),y:Math.round(old.y+(old.height-nh)/2),width:nw,height:nh});S[k].scale=v;Object.assign(S[k],{x:b.x,y:b.y,w:b.width,h:b.height});w.setBounds(b);save();dirty(true)}
function beginResize(kind,edge){const w=kind==='team'?teamWin:streak;if(!w)return false;if(resizeJob)clearInterval(resizeJob.timer);const start=w.getBounds(),mouse=screen.getCursorScreenPoint(),lim=kind==='team'?{minW:455,minH:72,maxW:805,maxH:127}:{minW:296,minH:94,maxW:464,maxH:146};resizeJob={w,kind,edge,start,mouse,timer:setInterval(()=>{const pt=screen.getCursorScreenPoint(),dx=pt.x-mouse.x,dy=pt.y-mouse.y;let b={...start};if(edge.includes('e'))b.width=Math.max(lim.minW,Math.min(lim.maxW,start.width+dx));if(edge.includes('s'))b.height=Math.max(lim.minH,Math.min(lim.maxH,start.height+dy));if(edge.includes('w')){let nw=Math.max(lim.minW,Math.min(lim.maxW,start.width-dx));b.x=start.x+start.width-nw;b.width=nw}if(edge.includes('n')){let nh=Math.max(lim.minH,Math.min(lim.maxH,start.height-dy));b.y=start.y+start.height-nh;b.height=nh}b=clampRect(b);w.setBounds(b);Object.assign(S[kind],{x:b.x,y:b.y,w:b.width,h:b.height});dirty(true)},16)};return true}
function endResize(){if(resizeJob){clearInterval(resizeJob.timer);resizeJob=null}return true}
function inc(){const now=Date.now();if(now-lastHotkey<2000)return;lastHotkey=now;S.value=(+S.value||0)+1;save()}
function registerHotkey(acc){globalShortcut.unregisterAll();S.hotkey=acc||'';if(acc){try{if(!globalShortcut.register(acc,inc))return false}catch{return false}}save();return true}
function trayMenu(){return Menu.buildFromTemplate([{label:'Abrir programa',click:()=>{editor.show();editor.focus()}},{type:'separator'},{label:'Sair completamente',click:()=>{quitting=true;app.quit()}}])}
function makeTray(){tray=new Tray(nativeImage.createEmpty());tray.setToolTip('DBD WinStreak & Match Overlay');tray.setContextMenu(trayMenu());tray.on('double-click',()=>{editor.show();editor.focus()})}
function browserHTML(){return fs.readFileSync(path.join(__dirname,'browser-overlay.html'),'utf8')}
function startServer(){server=http.createServer((req,res)=>{const u=url.parse(req.url,true);if(u.pathname==='/state'){res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});return res.end(JSON.stringify(S))}if(u.pathname==='/overlay'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(browserHTML())}if(u.pathname==='/streak-frame'||u.pathname==='/team-frame'){const f=u.pathname==='/streak-frame'?'streak-frame.html':'team-frame.html';res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,f),'utf8'))}res.writeHead(404);res.end('Not found')}).listen(PORT,'127.0.0.1')}
function resetCustomization(){const d=defaults;for(const k of ['style','nameColor','numberColor','accent','boxColor','boxColor2','nameFont','numberFont','nameFontSize','numberFontSize','nameOffsetX','numberOffsetX','shadow','nameBold','bgOpacity','letterSpacing','numberSpacing','nameUpper'])S[k]=d[k];save();dirty(true);return S}
app.whenReady().then(()=>{load();makeEditor();makeWindows();makeTray();startServer();if(S.hotkey)registerHotkey(S.hotkey);setTimeout(broadcast,400)});
app.on('before-quit',()=>{quitting=true;globalShortcut.unregisterAll();if(server)server.close()});app.on('window-all-closed',()=>{if(quitting)app.quit()});
ipcMain.handle('get-settings',()=>({settings:S,urls:{overlay:`http://127.0.0.1:${PORT}/overlay`}}));
ipcMain.handle('reset-customization',()=>resetCustomization());
ipcMain.handle('patch',(_,p)=>{S={...S,...p};if(p.streak)S.streak={...S.streak,...p.streak};if(p.team)S.team={...S.team,...p.team};S.nameFontSize=Math.max(10,Math.min(42,+S.nameFontSize||18));S.numberFontSize=Math.max(24,Math.min(100,+S.numberFontSize||58));S.bgOpacity=Math.max(0,Math.min(1,Number(S.bgOpacity??1)));save();if(!Object.keys(p).every(k=>['language','hotkey'].includes(k)))dirty(true);return S});
ipcMain.handle('edit',(_,x)=>{edit(x);return true});ipcMain.handle('save-pos',()=>{persistBounds();edit(false);return S});ipcMain.handle('scale',(_,k,v)=>{scaleOverlay(k,v);return S});ipcMain.handle('resize-start',(_,kind,edge)=>beginResize(kind,edge));ipcMain.handle('resize-end',()=>endResize());ipcMain.handle('hotkey',(_,a)=>registerHotkey(a));
ipcMain.handle('open-editor',(_,t='streak')=>{editor.show();editor.focus();send(editor,'open-tab',t);return true});ipcMain.handle('quit',()=>{quitting=true;app.quit()});
