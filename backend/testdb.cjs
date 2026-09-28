const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'citrus',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alnour_erp_db'
  });
  
  const [rows] = await connection.query("SHOW CREATE TABLE student_guardians");
  console.log(rows[0]['Create Table']);
  
  await connection.end();
}
run();
