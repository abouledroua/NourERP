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
  } catch (err) {
    console.error('[STARTUP-CHECK] Error verifying default records:', err.message);
  }
}

export default checkAndInitializeDefaults;
