import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportDump() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: '',
      database: 'alnour_erp_db'
    });

    const [tables] = await conn.query('SHOW TABLES');
    let sql = `-- ========================================================\n-- Al-Nour Academic & School ERP - Complete MySQL 5.7/8.0 Dump\n-- Database: alnour_erp_db\n-- ========================================================\n\nCREATE DATABASE IF NOT EXISTS \`alnour_erp_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE \`alnour_erp_db\`;\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const t of tables) {
      const name = Object.values(t)[0];
      const [createRes] = await conn.query(`SHOW CREATE TABLE \`${name}\``);
      sql += `DROP TABLE IF EXISTS \`${name}\`;\n` + createRes[0]['Create Table'] + ';\n\n';

      const [rows] = await conn.query(`SELECT * FROM \`${name}\``);
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
        const valRows = rows.map(r => {
          const vals = Object.values(r).map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'number') return v;
            if (v instanceof Date) return "'" + v.toISOString().slice(0, 19).replace('T', ' ') + "'";
            return conn.escape(v);
          });
          return '(' + vals.join(', ') + ')';
        });
        sql += `INSERT INTO \`${name}\` (${cols}) VALUES\n` + valRows.join(',\n') + ';\n\n';
      }
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
    const outputPath = path.join(__dirname, '..', '..', 'alnour_erp_db_dump.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');
    console.log(`[DUMP] Exported ${tables.length} tables to ${outputPath} (${sql.length} bytes)`);
    await conn.end();
  } catch (err) {
    console.error('[DUMP] Error:', err.message);
  }
}

exportDump();
