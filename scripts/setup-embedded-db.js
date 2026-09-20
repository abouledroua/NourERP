/**
 * Embedded Database Verification & Provisioning Script
 * Checks for MariaDB portable binaries or sets up isolated runtime directory.
 */
const fs = require('fs');
const path = require('path');

const targetBinDir = path.join(__dirname, '..', 'bin', 'embedded-db', 'bin');
const targetShareDir = path.join(__dirname, '..', 'bin', 'embedded-db', 'share');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[setup-embedded-db] Created directory: ${dirPath}`);
  }
}

function verifyEmbeddedDb() {
  console.log('[setup-embedded-db] Verifying embedded MariaDB structure...');
  ensureDir(targetBinDir);
  ensureDir(targetShareDir);

  const mysqldPath = path.join(targetBinDir, 'mysqld.exe');
  const installDbPath = path.join(targetBinDir, 'mysql_install_db.exe');

  if (!fs.existsSync(mysqldPath)) {
    console.log('[setup-embedded-db] Notice: mysqld.exe binary placeholder ready in bin/embedded-db/bin');
    console.log('[setup-embedded-db] In development, Al-Nour ERP automatically connects to active MySQL on port 3306.');
    console.log('[setup-embedded-db] For standalone redistribution without external MySQL, place portable MariaDB binaries into bin/embedded-db/.');
    
    // Create a README in the folder for documentation
    fs.writeFileSync(
      path.join(__dirname, '..', 'bin', 'embedded-db', 'README.txt'),
      `Al-Nour ERP Embedded MariaDB Directory\n======================================\nPlace portable MariaDB Windows x64 binaries here:\n- bin/mysqld.exe\n- bin/mysql_install_db.exe\n- share/english/errmsg.sys (and other language files)\n\nWhen external MySQL (port 3306) is not running, the application will auto-launch this embedded engine on port 3308.`
    );
  } else {
    console.log('[setup-embedded-db] Embedded database binaries found.');
  }

  console.log('[setup-embedded-db] Embedded DB check complete.');
}

verifyEmbeddedDb();
