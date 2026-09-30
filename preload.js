const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  get: () => ipcRenderer.invoke('get'),
  patch: (section, patch) => ipcRenderer.invoke('patch', section, patch),
  reset: section => ipcRenderer.invoke('reset', section),
  streakValue: (mode, n) => ipcRenderer.invoke('streak-value', mode, n),
  hotkey: k => ipcRenderer.invoke('hotkey', k),
  edit: v => ipcRenderer.invoke('edit', v),
  saveBounds: () => ipcRenderer.invoke('save-bounds'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  copy: text => ipcRenderer.invoke('copy', text),
  dragStart: (key, mouse) => ipcRenderer.send('drag-start', key, mouse),
  dragMove: mouse => ipcRenderer.send('drag-move', mouse),
  dragEnd: () => ipcRenderer.send('drag-end'),
  resizeStart: (key, edge, mouse) => ipcRenderer.send('resize-start', key, edge, mouse),
  resizeMove: mouse => ipcRenderer.send('resize-move', mouse),
  resizeEnd: () => ipcRenderer.send('resize-end'),
  onState: cb => ipcRenderer.on('state', (_, s) => cb(s)),
  onEdit: cb => ipcRenderer.on('edit', (_, v) => cb(v)),
  onDirty: cb => ipcRenderer.on('dirty', (_, v) => cb(v))
});
