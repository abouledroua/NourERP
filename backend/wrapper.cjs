/**
 * CommonJS Utility Process Wrapper for Electron
 * Dynamically imports ESM server.js
 */
(async () => {
  try {
    await import('./server.js');
  } catch (err) {
    console.error('[WRAPPER] Failed to launch backend server:', err);
    process.exit(1);
  }
})();
