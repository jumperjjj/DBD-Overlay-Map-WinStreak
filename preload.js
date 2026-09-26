const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('dbd',{
rearm:()=>ipcRenderer.invoke('rearm'),state:f=>ipcRenderer.on('state',(_,x)=>f(x)),diag:f=>ipcRenderer.on('diag',(_,x)=>f(x)),
perf:f=>ipcRenderer.on('perf',(_,x)=>f(x)),detected:f=>ipcRenderer.on('detected',(_,x)=>f(x))
});