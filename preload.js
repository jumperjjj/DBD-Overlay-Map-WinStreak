const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('dbd',{
start:()=>ipcRenderer.invoke('start'),stop:()=>ipcRenderer.invoke('stop'),retryOCR:()=>ipcRenderer.invoke('retry-ocr'),
status:f=>ipcRenderer.on('status',(_,x)=>f(x)),state:f=>ipcRenderer.on('state',(_,x)=>f(x)),
ocrState:f=>ipcRenderer.on('ocr-state',(_,x)=>f(x)),ocrLoad:f=>ipcRenderer.on('ocr-load',(_,x)=>f(x)),
ocr:f=>ipcRenderer.on('ocr',(_,x)=>f(x)),perf:f=>ipcRenderer.on('perf',(_,x)=>f(x)),detected:f=>ipcRenderer.on('detected',(_,x)=>f(x))
});