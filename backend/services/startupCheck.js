import bcrypt from "bcryptjs";
import { query } from "../config/db.js";

/**
 * Ensures system baseline integrity:
 * 1. If 'users' table is empty, automatically inserts default super-admin user ('admin' / 'admin123').
 * 2. If 'school_settings' table is empty, automatically inserts default empty/initial configuration row(s).
 */
export async function checkAndInitializeDefaults() {
  try {
    // 1. Check if 'users' table is empty
    const userCountRows = await query("SELECT COUNT(*) AS count FROM users");
    const userCount = Number(userCountRows[0]?.count || 0);

    if (userCount === 0) {
      console.log(
        "[STARTUP-CHECK] 'users' table is empty. Creating default super admin user...",
      );
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash("admin123", salt);
      await query(
        `INSERT INTO users (username, password_hash, full_name, email, role, status)
         VALUES ('admin', ?, 'الإدارة العامة للنظام', 'admin@alnour-school.edu', 'SUPER_ADMIN', 'ACTIVE')`,
        [adminHash],
      );
      console.log(
        "[STARTUP-CHECK] Successfully added default admin user (Username: admin | Password: admin123).",
      );
    }

    // 2. Ensure required 'school_settings' rows exist even if the table is not empty
    const defaultEmptySettings = [
      {
        key: "school_name_ar",
        value: "مؤسسة ونظام النور الأكاديمي والتربوي",
        desc: "School Name (Arabic)",
      },
      {
        key: "school_name_en",
        value: "Al-Nour Academic & School Institute",
        desc: "School Name (English)",
      },
      {
        key: "school_name_fr",
        value: "Établissement Scolaire & Académique Al-Nour",
        desc: "School Name (French)",
      },
      {
        key: "school_address",
        value: "شارع النهضة والتربية، مجمع النور التعليمي",
        desc: "Official Address",
      },
      {
        key: "school_phone",
        value: "+213 (0) 550 12 34 56",
        desc: "Phone Contact",
      },
      {
        key: "school_email",
        value: "administration@alnour-school.edu",
        desc: "Official Email",
      },
      { key: "currency", value: "DA", desc: "Official Currency Symbol" },
      {
        key: "tax_number",
        value: "NIF: 099817263544001",
        desc: "Tax / Registration Identifier",
      },
      {
        key: "print_receipt_footer",
        value: "«التربية ركيزتنا والامتياز غايتنا» - شكراً لثقتكم بمؤسستنا",
        desc: "Receipt Footer Slogan",
      },
    ];

    const existingSettings = await query(
      "SELECT key_name FROM school_settings WHERE key_name IN (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      defaultEmptySettings.map((item) => item.key),
    );
    const existingKeys = new Set(existingSettings.map((row) => row.key_name));
    const missingSettings = defaultEmptySettings.filter(
      (item) => !existingKeys.has(item.key),
    );

    if (missingSettings.length > 0) {
      console.log(
        "[STARTUP-CHECK] Missing default rows found in 'school_settings'. Restoring them...",
      );
      for (const item of missingSettings) {
        await query(
          `INSERT INTO school_settings (key_name, key_value, description)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE key_value = VALUES(key_value), description = VALUES(description)`,
          [item.key, item.value, item.desc],
        );
      }
      console.log(
        "[STARTUP-CHECK] Successfully restored missing default rows in 'school_settings'.",
      );
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
      const studentCols = await query(
        "SHOW COLUMNS FROM students LIKE 'phone'",
      );
      if (studentCols.length === 0) {
        await query("ALTER TABLE students ADD COLUMN phone VARCHAR(30) NULL");
        console.log(
          "[STARTUP-CHECK] Added column 'phone' to 'students' table.",
        );
      }
      const studentEmailCols = await query(
        "SHOW COLUMNS FROM students LIKE 'email'",
      );
      if (studentEmailCols.length === 0) {
        await query("ALTER TABLE students ADD COLUMN email VARCHAR(100) NULL");
        console.log(
          "[STARTUP-CHECK] Added column 'email' to 'students' table.",
        );
      }
      // 5. Legacy parent summary columns are intentionally no longer used; the canonical
      // storage is the student_guardians table.
    } catch (colErr) {
      console.error(
        "[STARTUP-CHECK] Error checking students columns:",
        colErr.message,
      );
    }

    // 6. Ensure 'guardians' and mapping tables exist
    try {
      await query(`
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

      await query(`
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

      console.log(
        "[STARTUP-CHECK] Initialized and verified 'guardians' and 'student_guardian_mapping' tables.",
      );
    } catch (guardErr) {
      console.error(
        "[STARTUP-CHECK] Error setting up guardian tables:",
        guardErr.message,
      );
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
      console.log(
        "[STARTUP-CHECK] Initialized and verified 'announcements' table.",
      );
    } catch (annErr) {
      console.error(
        "[STARTUP-CHECK] Error setting up announcements table:",
        annErr.message,
      );
    }
    // 8. Auto-populate academic_tracks if empty
    try {
      const trackCountRows = await query("SELECT COUNT(*) AS count FROM academic_tracks");
      const trackCount = Number(trackCountRows[0]?.count || 0);

      if (trackCount === 0) {
        console.log("[STARTUP-CHECK] 'academic_tracks' table is empty. Auto-populating default tracks...");
        await query(`
          INSERT INTO academic_tracks (id, code, name_ar, name_en, name_fr, description, is_active) VALUES
          (1, 'PRE_SCHOOL', 'التعليم التحضيري والروضة', 'Early Childhood & Preschool', 'Enseignement Préscolaire', 'تنمية المهارات السلوكية والحركية واللغوية للطفولة المبكرة', 1),
          (2, 'K12_PRIMARY', 'التعليم الابتدائي', 'Primary Elementary School', 'Enseignement Primaire', 'المرحلة الابتدائية من السنة الأولى إلى الخامسة', 1),
          (3, 'K12_MIDDLE', 'التعليم المتوسط', 'Middle School / Junior High', 'Enseignement Moyen', 'المرحلة المتوسطة من الأولى إلى الرابعة متوسط', 1),
          (4, 'K12_HIGH', 'التعليم الثانوي', 'High School / Secondary', 'Enseignement Secondaire', 'المرحلة الثانوية - جذوع مشتركة وشعب تخصصية', 1),
          (5, 'ACADEMIC_TUTORING', 'دروس الدعم والتقوية الأكاديمية', 'Academic Tutoring & Remedial', 'Soutien Scolaire et Rattrapage', 'حصص مسائية وأسبوعية مكثفة للمراجعة والتحضير للامتحانات الرسمية', 1)
        `);
        console.log("[STARTUP-CHECK] Successfully added default academic tracks.");
      }
    } catch (trackErr) {
      console.error("[STARTUP-CHECK] Error auto-populating academic_tracks table:", trackErr.message);
    }
  } catch (err) {
    console.error(
      "[STARTUP-CHECK] Error verifying default records:",
      err.message,
    );
  }
}

export default checkAndInitializeDefaults;
