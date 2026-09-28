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
    await connection.query("START TRANSACTION");

    // 1. Create the new guardians table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS guardians (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        nin VARCHAR(30) NULL,
        phone VARCHAR(30) NULL,
        email VARCHAR(100) NULL,
        job VARCHAR(100) NULL,
        password_hash VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_guardian_nin (nin)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create the mapping table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_guardian_mapping (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        guardian_id INT NOT NULL,
        relationship VARCHAR(50) DEFAULT 'FATHER',
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE,
        UNIQUE KEY uk_mapping (student_id, guardian_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Migrate distinct guardians
    // We get distinct guardians by grouping on NIN if it exists, otherwise we keep them separate
    const [oldGuardians] = await connection.query("SELECT * FROM student_guardians");
    
    // Process records in JS to avoid complex SQL
    const guardianMap = new Map(); // key: NIN or "null_id", value: new guardian ID
    
    for (const og of oldGuardians) {
      let key = og.nin ? `nin_${og.nin}` : `id_${og.id}`;
      let newGuardianId;
      
      if (!guardianMap.has(key)) {
        // insert into guardians
        const [res] = await connection.query(`
          INSERT INTO guardians (name, nin, phone, email, job, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [og.name, og.nin || null, og.phone, og.email, og.job, og.password_hash, og.created_at, og.updated_at]);
        newGuardianId = res.insertId;
        guardianMap.set(key, newGuardianId);
      } else {
        newGuardianId = guardianMap.get(key);
      }

      // 4. Insert mapping
      await connection.query(`
        INSERT INTO student_guardian_mapping (student_id, guardian_id, relationship, is_primary)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE relationship = VALUES(relationship), is_primary = VALUES(is_primary)
      `, [og.student_id, newGuardianId, og.relationship, og.is_primary]);
    }

    // 5. Drop old table (Optional but safe if we are fully replacing it)
    await connection.query("DROP TABLE IF EXISTS student_guardians");

    await connection.query("COMMIT");
    console.log("Migration successful!");
  } catch (err) {
    await connection.query("ROLLBACK");
    console.error("Migration failed:", err);
  }
  
  await connection.end();
}
run();
