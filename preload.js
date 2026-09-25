const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('dbd',{
start:()=>ipcRenderer.invoke('start'),stop:()=>ipcRenderer.invoke('stop'),info:()=>ipcRenderer.invoke('info'),
status:f=>ipcRenderer.on('status',(_,x)=>f(x)),ocr:f=>ipcRenderer.on('ocr',(_,x)=>f(x)),perf:f=>ipcRenderer.on('perf',(_,x)=>f(x)),detected:f=>ipcRenderer.on('detected',(_,x)=>f(x))
});