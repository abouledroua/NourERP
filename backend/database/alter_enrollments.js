import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nourerp',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('Adding columns payment_amount and reduction to student_enrollments...');
    await connection.query(`ALTER TABLE student_enrollments ADD COLUMN payment_amount DECIMAL(10,2) DEFAULT 0.00;`);
    await connection.query(`ALTER TABLE student_enrollments ADD COLUMN reduction DECIMAL(10,2) DEFAULT 0.00;`);
    console.log('Columns added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Error adding columns:', err);
    }
  } finally {
    await connection.end();
  }
}

run();
