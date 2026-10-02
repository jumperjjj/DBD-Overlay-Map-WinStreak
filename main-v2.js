const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const TIMER_PORT = 17385;
const TIMER_BASES = {
  0: { w: 210, h: 250 }, // Side Stack — compact independent cards
  1: { w: 258, h: 292 }, // Split Tower
  2: { w: 520, h: 116 }, // Center Beam
  3: { w: 520, h: 116 }, // Corner Rail
  4: { w: 526, h: 118 }, // Glass Wings
  5: { w: 520, h: 116 }  // Glass Ribbon
};
const TIMER_SCALE_UI = { min: 70, max: 100 };

const TIMER_DEF = {
  schema: 223,
  enabled: false,
  x: 70,
  y: 360,
  scaleUi: 100,
  scale: 1,
  style: 2,
  player1: 'PLAYER 1',
  player2: 'PLAYER 2',
  score1: 0,
  score2: 0,
  active: 1,
  time1: 0,
  time2: 0,
  done1: false,
  done2: false,
  running: false,
  runningPlayer: 0,
  startedAt: 0,
  accent: '#22c55e',
  accentMode: 'solid',
  opacity: 0.88,
  hotkeyAction: 'F1',
  hotkeySwap: 'F2',
  autoSwap: false,
  bestOf: 3,
  matchWinner: 0,
  celebrationWinner: 0,
  celebrationUntil: 0,
  celebrationId: 0,
  audioEventId: 0,
  audioEventType: '',
  lastWinner: 0,
  lastDelta: 0,
  round: 1
};

let T = null;
let timerWin = null;
let timerServer = null;
let timerQuitting = false;
let registeredAction = '';
let registeredSwap = '';
let lastActionAt = 0;
let saveMoveTimer = null;
let uIOhook = null;
let mouseHookStarted = false;
const mouseShortcuts = new Map();

function isMouseAccel(v) { return /^MOUSE[3-5]$/i.test(String(v || '').trim()); }
function normalizeMouseAccel(v) { const m=String(v||'').trim().toUpperCase(); return isMouseAccel(m)?m:''; }
function buttonToMouseAccel(button) {
  const b = Number(button);
  if (b === 3) return 'MOUSE3';
  if (b === 4) return 'MOUSE4';
  if (b === 5) return 'MOUSE5';
  return '';
}
function ensureMouseHook() {
  if (mouseHookStarted) return true;
  try {
    if (!uIOhook) ({ uIOhook } = require('uiohook-napi'));
    uIOhook.on('mousedown', e => {
      const key = buttonToMouseAccel(e?.button);
      if (!key) return;
      for (const entry of mouseShortcuts.values()) {
        if (entry?.key === key) { try { entry.cb(); } catch {} }
      }
    });
    uIOhook.start();
    mouseHookStarted = true;
    return true;
  } catch { return false; }
}
function registerMouseShortcut(owner, accel, cb) {
  const key = normalizeMouseAccel(accel);
  mouseShortcuts.delete(owner);
  if (!key) return true;
  if (!ensureMouseHook()) return false;
  mouseShortcuts.set(owner, { key, cb });
  return true;
}
function unregisterMouseShortcut(owner) { mouseShortcuts.delete(owner); }
global.__dbdRegisterMouseShortcut = registerMouseShortcut;
global.__dbdUnregisterMouseShortcut = unregisterMouseShortcut;
global.__dbdIsMouseAccel = isMouseAccel;

const rawUnregisterAll = globalShortcut.unregisterAll.bind(globalShortcut);
const rawUnregister = globalShortcut.unregister.bind(globalShortcut);

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, Number(v) || 0)); }
function clampInt(v, min, max) { return Math.round(clamp(v, min, max)); }
function timerFile() { return path.join(app.getPath('userData'), 'timer-v200.json'); }
function legacySettingsFile() { return path.join(app.getPath('userData'), 'settings-v270.json'); }
function currentLanguage() {
  try {
    const saved = JSON.parse(fs.readFileSync(legacySettingsFile(), 'utf8'));
    return ['pt','en','es'].includes(saved?.language) ? saved.language : 'pt';
  } catch { return 'pt'; }
}
function timerSnapshot() { return { ...T, language: currentLanguage() }; }
function baseFor(style = T?.style ?? 2) { return TIMER_BASES[clampInt(style, 0, 5)] || TIMER_BASES[2]; }

// Timer Test 3: compact scale range. 70% is reduced but still readable;
// 100% is now the true maximum requested for the 1v1 Timer.
function scaleFactorFromUi(value) {
  const ui = clamp(Number(value) || 100, TIMER_SCALE_UI.min, TIMER_SCALE_UI.max);
  return 0.78 + ((ui - 70) / 30) * 0.22;
}

function migrateOldScale(oldScale) {
  const s = Number(oldScale);
  if (!Number.isFinite(s) || s <= 0) return 100;
  return clampInt(70 + ((Math.min(1, s) - 0.78) / 0.22) * 30, 70, 100);
}

function normalizeTimer() {
  if (!T) T = clone(TIMER_DEF);
  if (!Number.isFinite(Number(T.scaleUi))) T.scaleUi = migrateOldScale(T.scale);
  T.scaleUi = clampInt(T.scaleUi, TIMER_SCALE_UI.min, TIMER_SCALE_UI.max);
  T.scale = scaleFactorFromUi(T.scaleUi);
  T.style = clampInt(T.style, 0, 5);
  T.opacity = clamp(T.opacity, 0, 1);
  T.score1 = Math.max(0, Math.floor(Number(T.score1) || 0));
  T.score2 = Math.max(0, Math.floor(Number(T.score2) || 0));
  T.active = Number(T.active) === 2 ? 2 : 1;
  T.time1 = Math.max(0, Number(T.time1) || 0);
  T.time2 = Math.max(0, Number(T.time2) || 0);
  T.done1 = !!T.done1;
  T.done2 = !!T.done2;
  T.running = !!T.running;
  T.runningPlayer = T.running ? (Number(T.runningPlayer) === 2 ? 2 : 1) : 0;
  T.player1 = String(T.player1 || 'PLAYER 1').slice(0, 48);
  T.player2 = String(T.player2 || 'PLAYER 2').slice(0, 48);
  T.accent = /^#[0-9a-f]{6}$/i.test(String(T.accent || '')) ? T.accent : '#22c55e';
  // Beta 2.0.1: Rainbow preset removed; keep one solid accent color.
  T.accentMode = 'solid';
  T.hotkeyAction = String(T.hotkeyAction || 'F1');
  T.hotkeySwap = String(T.hotkeySwap || 'F2');
  T.autoSwap = !!T.autoSwap;
  T.bestOf = [1,3,5,7].includes(Number(T.bestOf)) ? Number(T.bestOf) : 3;
  T.matchWinner = [1,2].includes(Number(T.matchWinner)) ? Number(T.matchWinner) : 0;
  T.celebrationWinner = [1,2].includes(Number(T.celebrationWinner)) ? Number(T.celebrationWinner) : 0;
  T.celebrationUntil = Math.max(0, Number(T.celebrationUntil) || 0);
  T.celebrationId = Math.max(0, Math.floor(Number(T.celebrationId) || 0));
  T.audioEventId = Math.max(0, Math.floor(Number(T.audioEventId) || 0));
  T.audioEventType = ['start','stop','victory'].includes(String(T.audioEventType || '')) ? String(T.audioEventType) : '';
  T.schema = 223;
}

function loadTimer() {
  T = clone(TIMER_DEF);
  try {
    const saved = JSON.parse(fs.readFileSync(timerFile(), 'utf8'));
    if (saved && typeof saved === 'object') T = { ...T, ...saved };
  } catch {}
  T.running = false;
  T.runningPlayer = 0;
  T.startedAt = 0;
  normalizeTimer();
}

function writeTimerFile() {
  normalizeTimer();
  try { fs.writeFileSync(timerFile(), JSON.stringify(T, null, 2)); } catch {}
}
function saveTimer() { writeTimerFile(); pushTimer(); }

function pushTimer() {
  if (!T) return;
  const snapshot = timerSnapshot();
  BrowserWindow.getAllWindows().forEach(w => {
    if (!w || w.isDestroyed() || w.webContents.isDestroyed()) return;
    try { w.webContents.send('timer-state', snapshot); } catch {}
  });
}

function timerWindowSize() {
  const b = baseFor();
  return { width: Math.round(b.w * T.scale), height: Math.round(b.h * T.scale) };
}

function clampTimerToDisplay(rect) {
  const d = screen.getDisplayMatching(rect);
  const b = d.bounds;
  const width = Math.min(rect.width, b.width);
  const height = Math.min(rect.height, b.height);
  let x = Math.max(b.x, Math.min(rect.x, b.x + b.width - width));
  let y = Math.max(b.y, Math.min(rect.y, b.y + b.height - height));
  if (Math.abs(x - b.x) <= 10) x = b.x;
  if (Math.abs(y - b.y) <= 10) y = b.y;
  if (Math.abs((x + width) - (b.x + b.width)) <= 10) x = b.x + b.width - width;
  if (Math.abs((y + height) - (b.y + b.height)) <= 10) y = b.y + b.height - height;
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function applyTimerGeometry(keepCenter = false) {
  if (!timerWin || timerWin.isDestroyed()) return;
  const old = timerWin.getBounds();
  const size = timerWindowSize();
  let x = Number.isFinite(+T.x) ? +T.x : old.x;
  let y = Number.isFinite(+T.y) ? +T.y : old.y;
  if (keepCenter) {
    x = Math.round(old.x + old.width / 2 - size.width / 2);
    y = Math.round(old.y + old.height / 2 - size.height / 2);
  }
  const next = clampTimerToDisplay({ x, y, ...size });
  timerWin.setBounds(next);
  try { timerWin.webContents.setZoomFactor(T.scale); } catch {}
  T.x = next.x;
  T.y = next.y;
}

function timerVisibility() {
  if (!timerWin || timerWin.isDestroyed()) return;
  if (T.enabled) {
    if (!timerWin.isVisible()) timerWin.showInactive();
    timerWin.moveTop();
  } else if (timerWin.isVisible()) {
    timerWin.hide();
  }
}

function createTimerWindow() {
  const size = timerWindowSize();
  timerWin = new BrowserWindow({
    title: 'DBD Overlay Studio — 1v1 Timer Overlay',
    x: T.x,
    y: T.y,
    width: size.width,
    height: size.height,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: true,
    focusable: true,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  timerWin.setAlwaysOnTop(true, 'screen-saver');
  timerWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // The overlay itself is the drag handle now; no separate edit-position mode.
  timerWin.setIgnoreMouseEvents(false);
  timerWin.loadFile('timer.html');
  timerWin.webContents.once('did-finish-load', () => {
    try { timerWin.webContents.setZoomFactor(T.scale); } catch {}
    pushTimer();
    timerVisibility();
  });
  timerWin.on('move', () => {
    if (!timerWin || timerWin.isDestroyed() || !T) return;
    const [x, y] = timerWin.getPosition();
    T.x = x;
    T.y = y;
    clearTimeout(saveMoveTimer);
    saveMoveTimer = setTimeout(() => { writeTimerFile(); pushTimer(); }, 160);
  });
}

function startTimerServer() {
  timerServer = http.createServer((req, res) => {
    const url = (req.url || '').split('?')[0];
    if (url === '/state') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify(timerSnapshot()));
    }
    const files = {
      '/obs-timer': ['obs-timer.html', 'text/html; charset=utf-8'],
      '/timer-render.js': ['timer-render.js', 'application/javascript; charset=utf-8'],
      '/timer-render.css': ['timer-render.css', 'text/css; charset=utf-8']
    };
    if (files[url]) {
      const [file, type] = files[url];
      try {
        const body = fs.readFileSync(path.join(__dirname, file));
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
        return res.end(body);
      } catch {
        res.writeHead(404); return res.end();
      }
    }
    res.writeHead(404); res.end();
  });
  timerServer.on('error', () => {});
  timerServer.listen(TIMER_PORT, '127.0.0.1');
}

function currentMs(player, now = Date.now()) {
  if (T.running && T.runningPlayer === player) return Math.max(0, now - T.startedAt);
  return player === 1 ? T.time1 : T.time2;
}

function setTimerAudioEvent(type) {
  T.audioEventType = ['start','stop','victory'].includes(type) ? type : '';
  T.audioEventId = (Number(T.audioEventId) || 0) + 1;
}

function startActiveTimer() {
  const p = T.active;
  const alreadyDone = p === 1 ? T.done1 : T.done2;
  if (alreadyDone) return false;
  if (p === 1) T.time1 = 0; else T.time2 = 0;
  T.running = true;
  T.runningPlayer = p;
  T.startedAt = Date.now();
  T.lastWinner = 0;
  T.lastDelta = 0;
  setTimerAudioEvent('start');
  saveTimer();
  return true;
}

function stopRunningTimer() {
  if (!T.running) return false;
  const p = T.runningPlayer;
  const elapsed = currentMs(p);
  if (p === 1) { T.time1 = elapsed; T.done1 = true; }
  else { T.time2 = elapsed; T.done2 = true; }
  T.running = false;
  T.runningPlayer = 0;
  T.startedAt = 0;
  if (T.autoSwap && !(T.done1 && T.done2)) T.active = p === 1 ? 2 : 1;
  setTimerAudioEvent('stop');
  saveTimer();
  return true;
}

function winsNeeded() {
  return Math.floor((Number(T.bestOf) || 3) / 2) + 1;
}

function evaluateMatchWinner(triggerCelebration = false) {
  const need = winsNeeded();
  const s1 = Number(T.score1) || 0;
  const s2 = Number(T.score2) || 0;
  let winner = 0;
  if (s1 >= need && s1 > s2) winner = 1;
  else if (s2 >= need && s2 > s1) winner = 2;

  if (!winner) {
    T.matchWinner = 0;
    if (T.celebrationUntil > Date.now()) {
      T.celebrationUntil = 0;
      T.celebrationWinner = 0;
    }
    return 0;
  }

  const changed = winner !== T.matchWinner;
  T.matchWinner = winner;
  T.active = winner;
  T.running = false;
  T.runningPlayer = 0;
  T.startedAt = 0;

  if (triggerCelebration && changed) {
    T.celebrationWinner = winner;
    T.celebrationUntil = Date.now() + 4000;
    T.celebrationId = (Number(T.celebrationId) || 0) + 1;
    setTimerAudioEvent('victory');
  }
  return winner;
}

function resolveRound() {
  if (!T.done1 || !T.done2 || T.running || T.matchWinner) return false;
  const a = Number(T.time1) || 0;
  const b = Number(T.time2) || 0;
  if (a < b) { T.score1 += 1; T.lastWinner = 1; T.lastDelta = b - a; }
  else if (b < a) { T.score2 += 1; T.lastWinner = 2; T.lastDelta = a - b; }
  else { T.lastWinner = 3; T.lastDelta = 0; }
  T.time1 = 0; T.time2 = 0;
  T.done1 = false; T.done2 = false;
  T.active = 1;
  T.round += 1;
  evaluateMatchWinner(true);
  saveTimer();
  return true;
}

function timerAction() {
  const now = Date.now();
  const cooldown = T.autoSwap ? 1000 : 180;
  if (now - lastActionAt < cooldown) return T;
  lastActionAt = now;
  if (T.matchWinner) return T;
  if (T.running) stopRunningTimer();
  else if (T.done1 && T.done2) resolveRound();
  else startActiveTimer();
  return T;
}

function timerSwap() {
  if (T.running || T.matchWinner) return T;
  T.active = T.active === 1 ? 2 : 1;
  saveTimer();
  return T;
}

function resetTimerMatch() {
  const keep = {
    enabled: T.enabled,
    x: T.x, y: T.y,
    scaleUi: T.scaleUi,
    style: T.style,
    player1: T.player1,
    player2: T.player2,
    accent: T.accent,
    accentMode: T.accentMode,
    opacity: T.opacity,
    hotkeyAction: T.hotkeyAction,
    hotkeySwap: T.hotkeySwap,
    autoSwap: T.autoSwap,
    bestOf: T.bestOf
  };
  T = { ...clone(TIMER_DEF), ...keep };
  T.active = 1;
  T.audioEventType = '';
  lastActionAt = 0;
  normalizeTimer();
  saveTimer();
  timerVisibility();
  return T;
}

function normalizeAccel(v) { return String(v || '').trim().toLowerCase(); }
function legacyWinStreakHotkey() {
  try {
    const saved = JSON.parse(fs.readFileSync(legacySettingsFile(), 'utf8'));
    return String(saved?.streak?.hotkey || '');
  } catch { return ''; }
}
function hotkeyConflict(accel, owner = '') {
  const wanted = normalizeAccel(accel);
  if (!wanted) return null;
  const candidates = [
    { owner: 'timer.action', key: T?.hotkeyAction || '', label: '1v1 Timer — Iniciar / Parar / Pontuar' },
    { owner: 'timer.swap', key: T?.hotkeySwap || '', label: '1v1 Timer — Trocar player' },
    { owner: 'streak.hotkey', key: legacyWinStreakHotkey(), label: 'WinStreak' }
  ];
  return candidates.find(c => c.owner !== owner && normalizeAccel(c.key) === wanted) || null;
}

global.__dbdCheckHotkeyConflict = hotkeyConflict;

function unregisterTimerHotkeys() {
  if (registeredAction && !isMouseAccel(registeredAction)) { try { rawUnregister(registeredAction); } catch {} }
  if (registeredSwap && registeredSwap !== registeredAction && !isMouseAccel(registeredSwap)) { try { rawUnregister(registeredSwap); } catch {} }
  unregisterMouseShortcut('timer.action');
  unregisterMouseShortcut('timer.swap');
  registeredAction = '';
  registeredSwap = '';
}

function registerTimerHotkeys() {
  if (!app.isReady() || timerQuitting || !T) return { action: false, swap: false };
  unregisterTimerHotkeys();
  let actionOk = true;
  let swapOk = true;
  if (T.hotkeyAction && !hotkeyConflict(T.hotkeyAction, 'timer.action')) {
    if (isMouseAccel(T.hotkeyAction)) actionOk = registerMouseShortcut('timer.action', T.hotkeyAction, timerAction);
    else { try { actionOk = globalShortcut.register(T.hotkeyAction, timerAction); } catch { actionOk = false; } }
    if (actionOk) registeredAction = T.hotkeyAction;
  } else if (T.hotkeyAction) actionOk = false;
  if (T.hotkeySwap && !hotkeyConflict(T.hotkeySwap, 'timer.swap')) {
    if (isMouseAccel(T.hotkeySwap)) swapOk = registerMouseShortcut('timer.swap', T.hotkeySwap, timerSwap);
    else { try { swapOk = globalShortcut.register(T.hotkeySwap, timerSwap); } catch { swapOk = false; } }
    if (swapOk) registeredSwap = T.hotkeySwap;
  } else if (T.hotkeySwap) swapOk = false;
  return { action: actionOk, swap: swapOk };
}

function setTimerHotkey(which, accel) {
  accel = String(accel || '');
  const owner = which === 'swap' ? 'timer.swap' : 'timer.action';
  const conflict = hotkeyConflict(accel, owner);
  if (conflict && accel) return { ok: false, reason: 'internal', conflict: conflict.label, state: T };
  const old = which === 'swap' ? T.hotkeySwap : T.hotkeyAction;
  if (which === 'swap') T.hotkeySwap = accel; else T.hotkeyAction = accel;
  const result = registerTimerHotkeys();
  const ok = which === 'swap' ? result.swap : result.action;
  if (!ok && accel) {
    if (which === 'swap') T.hotkeySwap = old; else T.hotkeyAction = old;
    registerTimerHotkeys();
    return { ok: false, reason: 'system', state: T };
  }
  saveTimer();
  return { ok: true, state: T };
}

// The legacy WinStreak module clears all Electron global shortcuts when its
// shortcut changes. Re-register the timer shortcuts immediately afterwards.
globalShortcut.unregisterAll = function patchedUnregisterAll() {
  rawUnregisterAll();
  registeredAction = '';
  registeredSwap = '';
  if (!timerQuitting && app.isReady()) setTimeout(() => registerTimerHotkeys(), 0);
};

app.on('before-quit', () => {
  timerQuitting = true;
  clearTimeout(saveMoveTimer);
  try { unregisterTimerHotkeys(); } catch {}
  try { if (mouseHookStarted && uIOhook) uIOhook.stop(); } catch {}
  mouseHookStarted = false;
  mouseShortcuts.clear();
  try { timerServer?.close(); } catch {}
});

// Keep WinStreak + Confronto intact while the new Timer is tested.
require('./main.js');

ipcMain.handle('hotkey-conflict-check', (_, accel, owner) => {
  const c = hotkeyConflict(accel, String(owner || ''));
  return c ? { conflict: true, label: c.label } : { conflict: false };
});
ipcMain.handle('timer-get', () => ({ state: timerSnapshot(), url: `http://127.0.0.1:${TIMER_PORT}/obs-timer`, editing: false }));
ipcMain.handle('timer-patch', (_, patch) => {
  const prevStyle = T.style;
  const prevScaleUi = T.scaleUi;
  const bestOfChanged = Object.prototype.hasOwnProperty.call(patch || {}, 'bestOf');
  T = { ...T, ...(patch || {}) };
  normalizeTimer();
  if (bestOfChanged) evaluateMatchWinner(false);
  if (T.style !== prevStyle || T.scaleUi !== prevScaleUi) applyTimerGeometry(true);
  saveTimer();
  timerVisibility();
  return T;
});
ipcMain.handle('timer-action', () => timerAction());
ipcMain.handle('timer-swap', () => timerSwap());
ipcMain.handle('timer-score', (_, player, delta) => {
  const key = Number(player) === 2 ? 'score2' : 'score1';
  const d = Number(delta) || 0;
  T[key] = Math.max(0, (Number(T[key]) || 0) + d);
  evaluateMatchWinner(d > 0);
  saveTimer();
  return T;
});
ipcMain.handle('timer-reset', () => resetTimerMatch());
ipcMain.handle('timer-hotkey', (_, which, accel) => setTimerHotkey(which === 'swap' ? 'swap' : 'action', accel));
// Kept only for compatibility with the first Timer test; position editing is now direct.
ipcMain.handle('timer-edit', () => T);

app.whenReady().then(() => {
  loadTimer();
  createTimerWindow();
  startTimerServer();
  registerTimerHotkeys();
  setTimeout(pushTimer, 400);
});
