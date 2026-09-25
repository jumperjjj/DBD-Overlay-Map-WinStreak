const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let win = null;
let timer = null;
let logPath = null;
let position = 0;
let partial = '';
let captureLines = [];
let capturing = true;

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function candidates() {
  const local = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
  return [
    path.join(local, 'DeadByDaylight', 'Saved', 'Logs', 'DeadByDaylight.log'),
    path.join(local, 'DeadByDaylight', 'Saved', 'Logs', 'DeadByDaylight-backup.log')
  ];
}

function findLog() {
  return candidates().find(p => fs.existsSync(p)) || candidates()[0];
}

function status(message) {
  send('status', { message, logPath, time: new Date().toISOString() });
}

function candidateFromLine(line) {
  const patterns = [
    /(?:MapName|SelectedMap|LevelName|PersistentLevel|WorldName)\s*[:=]\s*["']?([^,"'\]\[\r\n]+)/i,
    /(?:LoadMap|Loading map|Travel(?:ing)? to)\s*[:=]?\s*["']?([^,"'\]\[\r\n]+)/i,
    /(?:\/Game\/[^ \t\r\n"'.,]+\/)([^\/ \t\r\n"'.,]+)/i
  ];

  for (const re of patterns) {
    const m = line.match(re);
    if (m && m[1]) {
      const value = m[1].trim();
      if (value.length >= 3 && value.length <= 180) return value;
    }
  }
  return null;
}

function processLine(line) {
  if (!line) return;
  if (capturing) captureLines.push(line);

  const interesting = /map|realm|level|world|procedural|travel|trial|match|gameplay|persistent|load/i.test(line);
  if (!interesting) return;

  send('raw-hit', line.slice(0, 1800));

  const value = candidateFromLine(line);
  if (value) send('map-candidate', {
    value,
    source: line.slice(0, 1800),
    time: new Date().toISOString()
  });
}

function consume(text) {
  partial += text;
  const lines = partial.split(/\r?\n/);
  partial = lines.pop() || '';
  for (const line of lines) processLine(line);
}

function readNew() {
  if (!logPath) return;
  fs.stat(logPath, (err, stat) => {
    if (err) {
      status('Aguardando o log do DBD aparecer...');
      return;
    }

    if (stat.size < position) {
      position = 0;
      partial = '';
    }
    if (stat.size === position) return;

    const start = position;
    const end = stat.size - 1;
    const stream = fs.createReadStream(logPath, { encoding: 'utf8', start, end });
    let bytes = 0;

    stream.on('data', chunk => {
      bytes += Buffer.byteLength(chunk, 'utf8');
      consume(chunk);
    });
    stream.on('end', () => { position = start + bytes; });
    stream.on('error', () => status('Erro ao ler o log. Tentando novamente...'));
  });
}

function start({fromEnd = true} = {}) {
  stop();
  logPath = findLog();
  partial = '';

  fs.stat(logPath, (err, stat) => {
    if (err) {
      position = 0;
      status('Log ainda não encontrado. Abra o Dead by Daylight.');
    } else {
      position = fromEnd ? stat.size : Math.max(0, stat.size - 300000);
      status('Monitorando o log do Dead by Daylight.');
    }
    timer = setInterval(readNew, 750);
  });
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#0f1013',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  start();
});

app.on('window-all-closed', () => {
  stop();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-log-path', () => findLog());

ipcMain.handle('restart', () => {
  captureLines = [];
  capturing = true;
  start({fromEnd:true});
  return { ok:true, logPath };
});

ipcMain.handle('capture-toggle', (_, enabled) => {
  capturing = !!enabled;
  status(capturing ? 'Captura de diagnóstico ativada.' : 'Captura pausada.');
  return { capturing };
});

ipcMain.handle('export-diagnostic', async () => {
  const result = await dialog.showSaveDialog(win, {
    title: 'Salvar diagnóstico',
    defaultPath: `DBD-Map-Detector-Diagnostic-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`,
    filters: [{ name: 'Texto', extensions: ['txt'] }]
  });
  if (result.canceled || !result.filePath) return { ok:false };

  const header = [
    'DBD Map Detector Beta 1.0.0',
    `Generated: ${new Date().toISOString()}`,
    `Log: ${logPath}`,
    `Lines captured: ${captureLines.length}`,
    '------------------------------------------------------------',
    ''
  ].join('\r\n');

  fs.writeFileSync(result.filePath, header + captureLines.join('\r\n'), 'utf8');
  return { ok:true, filePath: result.filePath };
});
