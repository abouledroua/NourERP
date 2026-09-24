import bcrypt from "bcryptjs";
import { getPool } from "../config/db.js";

export async function seedDatabase() {
  const pool = await getPool();
  console.log("[SEED] Checking and seeding initial data...");

  // 1. Settings
  const [existingSettings] = await pool.query('SELECT COUNT(*) as count FROM school_settings');
  if (existingSettings[0].count === 0) {
    const defaultSettings = [
      { key: 'school_name_ar', value: 'مؤسسة ونظام النور الأكاديمي والتربوي', desc: 'School Name (Arabic)' },
      { key: 'school_name_en', value: 'Al-Nour Academic & School Institute', desc: 'School Name (English)' },
      { key: 'school_name_fr', value: 'Établissement Scolaire & Académique Al-Nour', desc: 'School Name (French)' },
      { key: 'school_address', value: 'شارع النهضة والتربية، مجمع النور التعليمي', desc: 'Official Address' },
      { key: 'school_phone', value: '+213 (0) 550 12 34 56', desc: 'Phone Contact' },
      { key: 'school_email', value: 'administration@alnour-school.edu', desc: 'Official Email' },
      { key: 'currency', value: 'DA', desc: 'Official Currency Symbol' },
      { key: 'tax_number', value: 'NIF: 099817263544001', desc: 'Tax / Registration Identifier' },
      { key: 'print_receipt_footer', value: '«التربية ركيزتنا والامتياز غايتنا» - شكراً لثقتكم بمؤسستنا', desc: 'Receipt Footer Slogan' },
    ];
    for (const s of defaultSettings) {
      await pool.query(
        'INSERT INTO school_settings (key_name, key_value, description) VALUES (?, ?, ?)',
        [s.key, s.value, s.desc]
      );
    }
  }

  // 2. Users (Admin, Cashier, Teacher)
  const [existingUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (existingUsers[0].count === 0) {
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin123', salt);
    const cashierHash = await bcrypt.hash('cashier123', salt);
    const teacherHash = await bcrypt.hash('teacher123', salt);

    await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email, role, status) VALUES 
        ('admin', ?, 'الإدارة العامة للنظام', 'admin@alnour-school.edu', 'SUPER_ADMIN', 'ACTIVE'),
        ('cashier', ?, 'محاسب الخزينة والمالية', 'finance@alnour-school.edu', 'CASHIER', 'ACTIVE'),
        ('teacher', ?, 'الأستاذ عبد الرحمن بوزيد', 'bouzid@alnour-school.edu', 'TEACHER', 'ACTIVE')`,
      [adminHash, cashierHash, teacherHash]
    );
  }

  // 3. Financial Accounts
  const [existingAccounts] = await pool.query('SELECT COUNT(*) as count FROM financial_accounts');
  if (existingAccounts[0].count === 0) {
    await pool.query(
      `INSERT INTO financial_accounts (name, balance, is_default) VALUES ('Main Safe (الخزينة الرئيسية)', 0.00, TRUE)`
    );
  }

  console.log("[SEED] Database seeding completed successfully.");
}
