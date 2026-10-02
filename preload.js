const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Existing app API
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
  onDirty: cb => ipcRenderer.on('dirty', (_, v) => cb(v)),

  // Beta 2.0.0 — 1v1 Timer API
  timerGet: () => ipcRenderer.invoke('timer-get'),
  timerPatch: patch => ipcRenderer.invoke('timer-patch', patch),
  timerAction: () => ipcRenderer.invoke('timer-action'),
  timerSwap: () => ipcRenderer.invoke('timer-swap'),
  timerScore: (player, delta) => ipcRenderer.invoke('timer-score', player, delta),
  timerReset: () => ipcRenderer.invoke('timer-reset'),
  timerHotkey: (which, accel) => ipcRenderer.invoke('timer-hotkey', which, accel),
  timerEdit: v => ipcRenderer.invoke('timer-edit', v),
  onTimerState: cb => ipcRenderer.on('timer-state', (_, s) => cb(s)),
  onTimerEdit: cb => ipcRenderer.on('timer-edit', (_, v) => cb(v))
});

// Inject the timer control tab into the existing app without touching the large
// legacy app.html. This keeps WinStreak and Confronto stable while Beta 2.0.0 is tested.
window.addEventListener('DOMContentLoaded', () => {
  try {
    if (!window.location.pathname.toLowerCase().endsWith('/app.html')) return;
    const script = document.createElement('script');
    script.src = 'timer-ui.js';
    document.body.appendChild(script);
  } catch {}
});
