const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, fork } = require('child_process');
const DatabaseManager = require('./databaseManager.cjs');

let mainWindow = null;
let splashWindow = null;
let backendProcess = null;
const dbManager = new DatabaseManager();

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const BACKEND_PORT = process.env.PORT || 5000;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'نظام النور الأكاديمي والإداري المتكامل للمدارس | Al-Nour Academic ERP',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load URL
  if (isDev && process.env.ELECTRON_DEV_URL) {
    mainWindow.loadURL(process.env.ELECTRON_DEV_URL);
  } else if (isDev) {
    mainWindow.loadURL(`http://localhost:5173`);
  } else {
    // In production, load the Express server serving static frontend
    mainWindow.loadURL(`http://localhost:${BACKEND_PORT}`);
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Launch backend Express process
 */
function startBackendProcess(dbPort) {
  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, '..', 'backend', 'wrapper.cjs');
    console.log(`[ELECTRON] Spawning backend supervisor: ${backendPath} with DB_PORT=${dbPort}...`);

    backendProcess = fork(backendPath, [], {
      env: {
        ...process.env,
        PORT: String(BACKEND_PORT),
        DB_PORT: String(dbPort),
        NODE_ENV: isDev ? 'development' : 'production'
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[BACKEND-OUT] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[BACKEND-ERR] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      console.error('[ELECTRON] Backend process failed to spawn:', err);
      reject(err);
    });

    // Poll health endpoint until online
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(() => {
      attempts++;
      http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          console.log('[ELECTRON] Backend server is healthy and responding!');
          resolve();
        }
      }).on('error', () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Backend server failed to respond in time.'));
        }
      });
    }, 600);
  });
}

// IPC Handlers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('print-page', async (event, options = {}) => {
  if (!mainWindow) return false;
  return new Promise((resolve) => {
    mainWindow.webContents.print({
      silent: options.silent || false,
      printBackground: true,
      deviceName: options.deviceName || ''
    }, (success, failureReason) => {
      resolve({ success, failureReason });
    });
  });
});

// App lifecycle
app.whenReady().then(async () => {
  createSplashWindow();

  try {
    // 1. Ensure DB is responsive (external port or embedded MariaDB)
    const activeDbPort = await dbManager.ensureDatabaseReady();

    // 2. Start Backend
    await startBackendProcess(activeDbPort);

    // 3. Show Main App
    createMainWindow();
  } catch (err) {
    console.error('[ELECTRON FATAL] Initialization error:', err);
    // Show window anyway to display error/reconnect
    createMainWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

function cleanupProcesses() {
  console.log('[ELECTRON] Cleaning up backend and database processes...');
  if (backendProcess && backendProcess.pid) {
    try {
      backendProcess.kill();
    } catch (e) {}
    backendProcess = null;
  }
  dbManager.terminate();
}

app.on('window-all-closed', () => {
  cleanupProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanupProcesses();
});
