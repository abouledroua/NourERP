const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'citrus',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alnour_erp_db'
  });
  
  try {
    await connection.query("ALTER TABLE student_guardians DROP INDEX uk_guardian_nin");
    console.log("Successfully dropped UNIQUE KEY uk_guardian_nin");
  } catch (err) {
    if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log("Index already dropped.");
    } else {
      console.error(err);
    }
  }
  
  await connection.end();
}
run();
