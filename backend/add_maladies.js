import { query } from './config/db.js';

async function alterDB() {
  try {
    await query('ALTER TABLE students ADD COLUMN maladies TEXT NULL AFTER address;');
    console.log('maladies column added successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('maladies column already exists.');
    } else {
      console.error('Error adding column:', error);
    }
  }
  process.exit();
}

alterDB();
