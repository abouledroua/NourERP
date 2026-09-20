import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function createDatabaseBackup() {
  const pool = await getPool();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `alnour_backup_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  const [tables] = await pool.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  let sqlDump = `-- ========================================================\n`;
  sqlDump += `-- Al-Nour Academic ERP Database Backup\n`;
  sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
  sqlDump += `-- ========================================================\n\n`;
  sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  for (const tableRow of tables) {
    const tableName = Object.values(tableRow)[0];
    const [[createTableRes]] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
    sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sqlDump += `${createTableRes['Create Table']};\n\n`;

    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      for (const row of rows) {
        const columns = Object.keys(row).map(c => `\`${c}\``).join(', ');
        const values = Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');
        sqlDump += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
      }
      sqlDump += `\n`;
    }
  }

  sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  fs.writeFileSync(filePath, sqlDump, 'utf8');

  return {
    filename,
    filePath,
    size: fs.statSync(filePath).size,
    createdAt: new Date()
  };
}

export async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
  return files.map(file => {
    const stat = fs.statSync(path.join(BACKUP_DIR, file));
    return {
      filename: file,
      size: stat.size,
      createdAt: stat.birthtime
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

export async function restoreDatabaseBackup(sqlContent) {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    // Split statements safely
    const statements = sqlContent
      .split(/;\s*[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    return { success: true, statementsExecuted: statements.length };
  } finally {
    conn.release();
  }
}
