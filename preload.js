const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('dbd',{
rearm:()=>ipcRenderer.invoke('rearm'),wakeOCR:()=>ipcRenderer.invoke('wake-ocr'),
state:f=>ipcRenderer.on('state',(_,x)=>f(x)),sentinel:f=>ipcRenderer.on('sentinel',(_,x)=>f(x)),
ocr:f=>ipcRenderer.on('ocr',(_,x)=>f(x)),perf:f=>ipcRenderer.on('perf',(_,x)=>f(x)),
detected:f=>ipcRenderer.on('detected',(_,x)=>f(x)),error:f=>ipcRenderer.on('error',(_,x)=>f(x))
});