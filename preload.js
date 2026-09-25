const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('d',{
restart:()=>ipcRenderer.invoke('restart'),toggle:v=>ipcRenderer.invoke('toggle',v),path:()=>ipcRenderer.invoke('path'),export:()=>ipcRenderer.invoke('export'),
status:f=>ipcRenderer.on('status',(_,x)=>f(x)),stats:f=>ipcRenderer.on('stats',(_,x)=>f(x)),preview:f=>ipcRenderer.on('preview',(_,x)=>f(x))
});