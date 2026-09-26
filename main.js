const {app,BrowserWindow,ipcMain,screen,Tray,Menu,nativeImage,globalShortcut,shell}=require('electron');
const fs=require('fs'),path=require('path'),http=require('http'); const PORT=17384;
let ui,streakWin,matchWin,tray,server,quitting=false,editing=false,lastHotkey=0;
const DEF={
 language:'pt',
 streak:{enabled:true,x:40,y:40,w:380,h:120,style:0,title:'WIN STREAK',value:0,nameColor:'#ffffff',valueColor:'#d7b84a',accent:'#d7b84a',bg1:'#15191f',bg2:'#09090b',opacity:1,nameSize:18,valueSize:58,nameX:0,valueX:0,bold:true,shadow:true,fontName:'Segoe UI',fontValue:'Impact',hotkey:''},
 match:{enabled:false,x:500,y:55,w:820,h:220,style:0,teamA:'TIME A',teamB:'TIME B',scoreA:0,scoreB:0,colorA:'#a86cff',colorB:'#6cff8d',bg:'#15181d',panel:'#282c31',text:'#ffffff',muted:'#c7c9cc',setText:'SET 1/1',footerShow:true,footer:'SET 1: THE COAL TOWER',headerH:68,rowH:30,gap:4,padding:10,teamSize:22,scoreSize:32,rows:[
  {show:true,label:'SURVIVOR RESULT',a:'7 STAGES - 3F',b:'6 STAGES - 2F'},
  {show:true,label:'KILLER WINCON',a:'6 STAGES',b:'7 STAGES'},
  {show:false,label:'INFO 3',a:'',b:''},{show:false,label:'INFO 4',a:'',b:''}
 ]}
};
let S;
const settingsFile=()=>path.join(app.getPath('userData'),'settings-v250.json');
function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){S=clone(DEF);try{const x=JSON.parse(fs.readFileSync(settingsFile(),'utf8'));S.streak={...S.streak,...(x.streak||{})};S.match={...S.match,...(x.match||{})};if(Array.isArray(x.match?.rows))S.match.rows=x.match.rows.slice(0,4).map((v,i)=>({...DEF.match.rows[i],...v}));S.language=x.language||'pt'}catch{}}
function save(){fs.writeFileSync(settingsFile(),JSON.stringify(S,null,2));push()}
function push(){[ui,streakWin,matchWin].forEach(w=>{if(w&&!w.isDestroyed())w.webContents.send('state',S)})}
function displayClamp(rect){const d=screen.getDisplayMatching(rect),b=d.bounds,w=Math.min(rect.width,b.width),h=Math.min(rect.height,b.height);let x=Math.max(b.x,Math.min(rect.x,b.x+b.width-w)),y=Math.max(b.y,Math.min(rect.y,b.y+b.height-h));const snap=12;if(Math.abs(x-b.x)<=snap)x=b.x;if(Math.abs((x+w)-(b.x+b.width))<=snap)x=b.x+b.width-w;if(Math.abs(y-b.y)<=snap)y=b.y;if(Math.abs((y+h)-(b.y+b.height))<=snap)y=b.y+b.height-h;return{x,y,width:w,height:h}}
function overlay(file,cfg){const w=new BrowserWindow({x:cfg.x,y:cfg.y,width:cfg.w,height:cfg.h,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});w.loadFile(file);w.setAlwaysOnTop(true,'screen-saver');w.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});w.setIgnoreMouseEvents(true,{forward:true});return w}
function visibility(){if(!streakWin)return;S.streak.enabled?streakWin.showInactive():streakWin.hide();S.match.enabled?matchWin.showInactive():matchWin.hide()}
function setEdit(v){editing=!!v;for(const [w,c] of [[streakWin,S.streak],[matchWin,S.match]]){w.setIgnoreMouseEvents(!editing,{forward:true});w.setResizable(editing);w.setMovable(editing);w.setMinimumSize(w===streakWin?280:560,w===streakWin?88:145);w.setMaximumSize(w===streakWin?520:1050,w===streakWin?165:420);w.webContents.send('edit',editing);if(editing&&c.enabled)w.show()}if(!editing)visibility();ui?.webContents.send('edit',editing)}
function syncBounds(){for(const [w,k] of [[streakWin,'streak'],[matchWin,'match']]){const b=displayClamp(w.getBounds());w.setBounds(b);Object.assign(S[k],{x:b.x,y:b.y,w:b.width,h:b.height})}save()}
function attachBounds(w,k){let t;const f=()=>{if(!editing)return;clearTimeout(t);t=setTimeout(()=>{const b=displayClamp(w.getBounds());if(JSON.stringify(b)!==JSON.stringify(w.getBounds()))w.setBounds(b);Object.assign(S[k],{x:b.x,y:b.y,w:b.width,h:b.height});ui?.webContents.send('dirty',true);push()},25)};w.on('move',f);w.on('resize',f)}
function create(){ui=new BrowserWindow({width:1160,height:820,minWidth:980,minHeight:680,backgroundColor:'#0d0f13',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});ui.setMenuBarVisibility(false);ui.loadFile('app.html');ui.on('close',e=>{if(!quitting){e.preventDefault();ui.hide()}});
 streakWin=overlay('streak.html',S.streak);matchWin=overlay('match.html',S.match);attachBounds(streakWin,'streak');attachBounds(matchWin,'match');visibility();
 tray=new Tray(nativeImage.createEmpty());tray.setToolTip('DBD Overlay Studio');tray.setContextMenu(Menu.buildFromTemplate([{label:'Abrir',click:()=>ui.show()},{label:'Sair',click:()=>{quitting=true;app.quit()}}]));
}
function hotkey(k){globalShortcut.unregisterAll();S.streak.hotkey=k||'';if(k){try{if(!globalShortcut.register(k,()=>{const n=Date.now();if(n-lastHotkey<2000)return;lastHotkey=n;S.streak.value++;save()}))return false}catch{return false}}save();return true}
function startServer(){server=http.createServer((req,res)=>{if(req.url.startsWith('/state')){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});return res.end(JSON.stringify(S))}if(req.url==='/overlay'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'obs.html'),'utf8'))}if(req.url==='/obs-streak'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'obs-streak.html'),'utf8'))}if(req.url==='/obs-match'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'obs-match.html'),'utf8'))}res.writeHead(404);res.end()}).listen(PORT,'127.0.0.1')}
ipcMain.handle('get',()=>({state:S,url:`http://127.0.0.1:${PORT}/overlay`}));
ipcMain.handle('patch',(_,section,p)=>{if(section==='root')S={...S,...p};else S[section]={...S[section],...p};
 if(section==='streak'&&(p.w!==undefined||p.h!==undefined)){const b=displayClamp({...streakWin.getBounds(),width:S.streak.w,height:S.streak.h});streakWin.setBounds(b);Object.assign(S.streak,{x:b.x,y:b.y,w:b.width,h:b.height})}
 if(section==='match'&&(p.w!==undefined||p.h!==undefined)){const b=displayClamp({...matchWin.getBounds(),width:S.match.w,height:S.match.h});matchWin.setBounds(b);Object.assign(S.match,{x:b.x,y:b.y,w:b.width,h:b.height})}
 save();visibility();return S});
ipcMain.handle('edit',(_,v)=>{setEdit(v);return S});ipcMain.handle('save-bounds',()=>{syncBounds();setEdit(false);ui.webContents.send('dirty',false);return S});
ipcMain.handle('reset',(_,section)=>{if(section==='streak'){const keep={value:S.streak.value,hotkey:S.streak.hotkey,x:S.streak.x,y:S.streak.y,w:S.streak.w,h:S.streak.h,enabled:S.streak.enabled};S.streak={...clone(DEF.streak),...keep}}else{const pos={x:S.match.x,y:S.match.y,w:S.match.w,h:S.match.h,enabled:S.match.enabled};S.match={...clone(DEF.match),...pos}}save();visibility();return S});
ipcMain.handle('hotkey',(_,k)=>hotkey(k));
app.whenReady().then(()=>{load();create();startServer();if(S.streak.hotkey)hotkey(S.streak.hotkey);setTimeout(push,300)});
app.on('before-quit',()=>{quitting=true;globalShortcut.unregisterAll();server?.close()});app.on('window-all-closed',()=>{if(quitting)app.quit()});
