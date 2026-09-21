import { query } from './backend/config/db.js';

async function addMatriculeToClasses() {
  try {
    console.log("Adding matricule column to classes table...");
    await query(`ALTER TABLE classes ADD COLUMN matricule VARCHAR(50) UNIQUE AFTER id`);
    console.log("Column added successfully!");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column 'matricule' already exists in 'classes' table.");
    } else {
      console.error("Error adding column:", err.message);
    }
  } finally {
    process.exit(0);
  }
}

addMatriculeToClasses();
