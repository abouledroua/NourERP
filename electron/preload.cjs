const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getSystemInfo: () => ({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB'
  }),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printPage: (options) => ipcRenderer.invoke('print-page', options)
});
