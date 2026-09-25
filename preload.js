const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('detector',{
  getLogPath:()=>ipcRenderer.invoke('get-log-path'),
  restart:()=>ipcRenderer.invoke('restart'),
  toggleCapture:e=>ipcRenderer.invoke('capture-toggle',e),
  exportDiagnostic:()=>ipcRenderer.invoke('export-diagnostic'),
  onStatus:cb=>ipcRenderer.on('status',(_,d)=>cb(d)),
  onCandidate:cb=>ipcRenderer.on('map-candidate',(_,d)=>cb(d)),
  onRawHit:cb=>ipcRenderer.on('raw-hit',(_,d)=>cb(d)),
  onStats:cb=>ipcRenderer.on('stats',(_,d)=>cb(d))
});
