const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

class DatabaseManager {
  constructor() {
    this.embeddedProcess = null;
    this.activePort = null;
    this.appDataDir = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local'), 'AlNourERP');
    this.dbDataDir = path.join(this.appDataDir, 'database_data');
  }

  /**
   * Test TCP socket connectivity on specified port
   */
  async isPortOpen(port, host = '127.0.0.1', timeout = 1200) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Find binaries directory in development or production extraResources
   */
  getEmbeddedDbPaths() {
    // 1. Packaged extraResources
    const prodBin = path.join(process.resourcesPath, 'embedded-db', 'bin');
    // 2. Development path
    const devBin = path.join(__dirname, '..', 'bin', 'embedded-db', 'bin');

    const binDir = fs.existsSync(prodBin) ? prodBin : devBin;
    return {
      mysqldPath: path.join(binDir, 'mysqld.exe'),
      installDbPath: path.join(binDir, 'mysql_install_db.exe')
    };
  }

  /**
   * Initialize and start embedded engine on port 3308
   */
  async startEmbeddedDatabase() {
    console.log('[DB-MGR] Starting embedded MariaDB engine on port 3308...');
    const { mysqldPath, installDbPath } = this.getEmbeddedDbPaths();

    if (!fs.existsSync(this.dbDataDir)) {
      fs.mkdirSync(this.dbDataDir, { recursive: true });
    }

    // Zero-config data initialization if directory is empty
    const files = fs.readdirSync(this.dbDataDir);
    if (files.length === 0) {
      console.log('[DB-MGR] First run detected. Initializing database storage...');
      if (fs.existsSync(installDbPath)) {
        try {
          execSync(`"${installDbPath}" --datadir="${this.dbDataDir}"`, { stdio: 'inherit' });
          console.log('[DB-MGR] mysql_install_db completed successfully.');
        } catch (err) {
          console.error('[DB-MGR] Warning initializing data directory:', err.message);
        }
      }
    }

    // Launch mysqld.exe on isolated port 3308
    if (fs.existsSync(mysqldPath)) {
      console.log(`[DB-MGR] Spawning ${mysqldPath} with datadir: ${this.dbDataDir}`);
      this.embeddedProcess = spawn(mysqldPath, [
        `--datadir=${this.dbDataDir}`,
        '--port=3308',
        '--bind-address=127.0.0.1',
        '--console'
      ], {
        detached: false,
        stdio: 'ignore'
      });

      this.embeddedProcess.on('error', (err) => {
        console.error('[DB-MGR] Failed to start mysqld process:', err);
      });
    } else {
      console.warn('[DB-MGR] Embedded mysqld.exe not found. Falling back to active system MySQL.');
    }

    // Poll port 3308 until active (up to 25 attempts with backoff)
    console.log('[DB-MGR] Polling port 3308 for readiness...');
    for (let i = 1; i <= 25; i++) {
      const open = await this.isPortOpen(3308);
      if (open) {
        console.log(`[DB-MGR] Embedded MariaDB is ready on port 3308 (attempt ${i}).`);
        this.activePort = 3308;
        return 3308;
      }
      await new Promise(r => setTimeout(r, 400 + i * 50));
    }

    throw new Error('[DB-MGR] Timed out waiting for embedded database on port 3308.');
  }

  /**
   * Main Supervisor: Detects ports 3307 / 3306 or starts embedded MariaDB on 3308
   */
  async ensureDatabaseReady() {
    console.log('[DB-MGR] Inspecting database availability...');

    // Priority 1: Check port 3306 (Standard WampServer MySQL)
    if (await this.isPortOpen(3306)) {
      console.log('[DB-MGR] Detected active MySQL service on port 3306.');
      this.activePort = 3306;
      process.env.DB_PORT = '3306';
      return 3306;
    }

    // Priority 2: Check isolated port 3308 (Already running embedded instance)
    if (await this.isPortOpen(3308)) {
      console.log('[DB-MGR] Found existing embedded engine running on port 3308.');
      this.activePort = 3308;
      process.env.DB_PORT = '3308';
      return 3308;
    }

    // Priority 3: Launch embedded engine on port 3308
    const port = await this.startEmbeddedDatabase();
    process.env.DB_PORT = String(port);
    return port;
  }

  /**
   * Clean Process Termination
   */
  terminate() {
    if (this.embeddedProcess && this.embeddedProcess.pid) {
      console.log(`[DB-MGR] Terminating embedded database process (PID: ${this.embeddedProcess.pid})...`);
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${this.embeddedProcess.pid} /T /F`);
        } else {
          this.embeddedProcess.kill('SIGTERM');
        }
        console.log('[DB-MGR] Embedded DB process terminated cleanly.');
      } catch (err) {
        console.warn('[DB-MGR] Warning terminating process:', err.message);
      }
      this.embeddedProcess = null;
    }
  }
}

module.exports = DatabaseManager;
