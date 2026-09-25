const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('detector', {
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  restart: () => ipcRenderer.invoke('restart'),
  toggleCapture: enabled => ipcRenderer.invoke('capture-toggle', enabled),
  exportDiagnostic: () => ipcRenderer.invoke('export-diagnostic'),
  onStatus: cb => ipcRenderer.on('status', (_, data) => cb(data)),
  onCandidate: cb => ipcRenderer.on('map-candidate', (_, data) => cb(data)),
  onRawHit: cb => ipcRenderer.on('raw-hit', (_, data) => cb(data))
});
