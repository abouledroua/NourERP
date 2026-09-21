import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

/**
 * Ensures system baseline integrity:
 * 1. If 'users' table is empty, automatically inserts default super-admin user ('admin' / 'admin123').
 * 2. If 'school_settings' table is empty, automatically inserts default empty/initial configuration row(s).
 */
export async function checkAndInitializeDefaults() {
  try {
    // 1. Check if 'users' table is empty
    const userCountRows = await query('SELECT COUNT(*) AS count FROM users');
    const userCount = Number(userCountRows[0]?.count || 0);

    if (userCount === 0) {
      console.log("[STARTUP-CHECK] 'users' table is empty. Creating default super admin user...");
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('admin123', salt);
      await query(
        `INSERT INTO users (username, password_hash, full_name, email, role, status)
         VALUES ('admin', ?, 'الإدارة العامة للنظام', 'admin@alnour-school.edu', 'SUPER_ADMIN', 'ACTIVE')`,
        [adminHash]
      );
      console.log("[STARTUP-CHECK] Successfully added default admin user (Username: admin | Password: admin123).");
    }

    // 2. Check if 'school_settings' table is empty
    const settingsCountRows = await query('SELECT COUNT(*) AS count FROM school_settings');
    const settingsCount = Number(settingsCountRows[0]?.count || 0);

    if (settingsCount === 0) {
      console.log("[STARTUP-CHECK] 'school_settings' table is empty. Adding initial configuration rows...");
      const defaultEmptySettings = [
        { key: 'school_name_ar', value: '', desc: 'School Name (Arabic)' },
        { key: 'school_name_en', value: '', desc: 'School Name (English)' },
        { key: 'school_name_fr', value: '', desc: 'School Name (French)' },
        { key: 'school_address', value: '', desc: 'Official Address' },
        { key: 'school_phone', value: '', desc: 'Phone Contact' },
        { key: 'school_email', value: '', desc: 'Official Email' },
        { key: 'currency', value: 'DA', desc: 'Official Currency Symbol' },
        { key: 'tax_number', value: '', desc: 'Tax / Registration Identifier' },
        { key: 'print_receipt_footer', value: '', desc: 'Receipt Footer Slogan' }
      ];

      for (const item of defaultEmptySettings) {
        await query(
          `INSERT INTO school_settings (key_name, key_value, description)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE description = VALUES(description)`,
          [item.key, item.value, item.desc]
        );
      }
      console.log("[STARTUP-CHECK] Successfully initialized empty/default rows in 'school_settings'.");
    }

    // 3. Ensure 'rooms' table exists
    await query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NULL,
        capacity INT DEFAULT 30,
        building VARCHAR(100) NULL,
        floor VARCHAR(50) NULL,
        room_type VARCHAR(50) DEFAULT 'CLASSROOM',
        status ENUM('AVAILABLE', 'MAINTENANCE', 'OCCUPIED') DEFAULT 'AVAILABLE',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Ensure 'students.phone' & 'students.email' columns exist
    try {
      const studentCols = await query("SHOW COLUMNS FROM students LIKE 'phone'");
      if (studentCols.length === 0) {
        await query("ALTER TABLE students ADD COLUMN phone VARCHAR(30) NULL AFTER parent_phone");
        console.log("[STARTUP-CHECK] Added column 'phone' to 'students' table.");
      }
      const studentEmailCols = await query("SHOW COLUMNS FROM students LIKE 'email'");
      if (studentEmailCols.length === 0) {
        await query("ALTER TABLE students ADD COLUMN email VARCHAR(100) NULL AFTER phone");
        console.log("[STARTUP-CHECK] Added column 'email' to 'students' table.");
      }
      // 5. Ensure parent_name and parent_phone are nullable
      await query("ALTER TABLE students MODIFY COLUMN parent_name VARCHAR(100) NULL, MODIFY COLUMN parent_phone VARCHAR(30) NULL");
    } catch (colErr) {
      console.error("[STARTUP-CHECK] Error checking students columns:", colErr.message);
    }

    // 6. Ensure 'student_guardians' table exists and backfill existing parent records
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS student_guardians (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          relationship VARCHAR(50) DEFAULT 'FATHER',
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(30) NULL,
          email VARCHAR(100) NULL,
          job VARCHAR(100) NULL,
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          INDEX idx_guardian_student (student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await query(`
        INSERT INTO student_guardians (student_id, relationship, name, phone, email, job, is_primary)
        SELECT s.id, 'FATHER', s.parent_name, s.parent_phone, s.parent_email, s.parent_job, 1
        FROM students s
        WHERE s.parent_name IS NOT NULL 
          AND TRIM(s.parent_name) != ''
          AND s.id NOT IN (SELECT DISTINCT student_id FROM student_guardians);
      `);
      console.log("[STARTUP-CHECK] Initialized and verified 'student_guardians' table.");
    } catch (guardErr) {
      console.error("[STARTUP-CHECK] Error setting up student_guardians table:", guardErr.message);
    }

    // 7. Ensure announcements table exists
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS announcements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          priority ENUM('NORMAL', 'IMPORTANT', 'URGENT') DEFAULT 'NORMAL',
          target_type ENUM('ALL', 'TRACK', 'CLASS', 'STUDENT') NOT NULL DEFAULT 'ALL',
          target_id INT NULL,
          author_id INT NULL,
          expires_at DATE NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_announcement_target (target_type, target_id),
          INDEX idx_announcement_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("[STARTUP-CHECK] Initialized and verified 'announcements' table.");
    } catch (annErr) {
      console.error("[STARTUP-CHECK] Error setting up announcements table:", annErr.message);
    }
  } catch (err) {
    console.error('[STARTUP-CHECK] Error verifying default records:', err.message);
  }
}

export default checkAndInitializeDefaults;
