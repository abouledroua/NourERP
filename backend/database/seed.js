import bcrypt from 'bcryptjs';
import { getPool } from '../config/db.js';

export async function seedDatabase() {
  const pool = await getPool();
  console.log('[SEED] Checking and seeding initial data...');

  // 1. Settings
  const defaultSettings = [
    { key: 'school_name_ar', value: 'مؤسسة ونظام النور الأكاديمي والتربوي', desc: 'School Name (Arabic)' },
    { key: 'school_name_en', value: 'Al-Nour Academic & School Institute', desc: 'School Name (English)' },
    { key: 'school_name_fr', value: 'Établissement Scolaire & Académique Al-Nour', desc: 'School Name (French)' },
    { key: 'school_address', value: 'شارع النهضة والتربية، مجمع النور التعليمي', desc: 'Official Address' },
    { key: 'school_phone', value: '+213 (0) 550 12 34 56', desc: 'Phone Contact' },
    { key: 'school_email', value: 'administration@alnour-school.edu', desc: 'Official Email' },
    { key: 'currency', value: 'DA', desc: 'Official Currency Symbol' },
    { key: 'tax_number', value: 'NIF: 099817263544001', desc: 'Tax / Registration Identifier' },
    { key: 'print_receipt_footer', value: '«التربية ركيزتنا والامتياز غايتنا» - شكراً لثقتكم بمؤسستنا', desc: 'Receipt Footer Slogan' }
  ];

  for (const s of defaultSettings) {
    await pool.query(
      `INSERT INTO school_settings (key_name, key_value, description)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [s.key, s.value, s.desc]
    );
  }

  // 2. Users (Admin, Cashier, Teacher)
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('admin123', salt);
  const cashierHash = await bcrypt.hash('cashier123', salt);
  const teacherHash = await bcrypt.hash('teacher123', salt);

  await pool.query(`
    INSERT INTO users (username, password_hash, full_name, email, role, status)
    VALUES 
      ('admin', ?, 'الإدارة العامة للنظام', 'admin@alnour-school.edu', 'SUPER_ADMIN', 'ACTIVE'),
      ('cashier', ?, 'محاسب الخزينة والمالية', 'finance@alnour-school.edu', 'CASHIER', 'ACTIVE'),
      ('teacher', ?, 'الأستاذ عبد الرحمن بوزيد', 'bouzid@alnour-school.edu', 'TEACHER', 'ACTIVE')
    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
  `, [adminHash, cashierHash, teacherHash]);

  // 3. Academic Tracks
  const tracks = [
    { code: 'PRE_SCHOOL', ar: 'التعليم التحضيري والروضة', en: 'Early Childhood & Preschool', fr: 'Enseignement Préscolaire', desc: 'تنمية المهارات السلوكية والحركية واللغوية للطفولة المبكرة' },
    { code: 'K12_PRIMARY', ar: 'التعليم الابتدائي', en: 'Primary Elementary School', fr: 'Enseignement Primaire', desc: 'المرحلة الابتدائية من السنة الأولى إلى الخامسة' },
    { code: 'K12_MIDDLE', ar: 'التعليم المتوسط', en: 'Middle School / Junior High', fr: 'Enseignement Moyen', desc: 'المرحلة المتوسطة من الأولى إلى الرابعة متوسط' },
    { code: 'K12_HIGH', ar: 'التعليم الثانوي', en: 'High School / Secondary', fr: 'Enseignement Secondaire', desc: 'المرحلة الثانوية - جذوع مشتركة وشعب تخصصية' },
    { code: 'ACADEMIC_TUTORING', ar: 'دروس الدعم والتقوية الأكاديمية', en: 'Academic Tutoring & Remedial', fr: 'Soutien Scolaire et Rattrapage', desc: 'حصص مسائية وأسبوعية مكثفة للمراجعة والتحضير للامتحانات الرسمية' }
  ];

  for (const t of tracks) {
    await pool.query(
      `INSERT INTO academic_tracks (code, name_ar, name_en, name_fr, description, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar), name_en = VALUES(name_en), name_fr = VALUES(name_fr)`,
      [t.code, t.ar, t.en, t.fr, t.desc]
    );
  }

  // 4. Academic Year & Terms
  const [existingYears] = await pool.query(`SELECT id FROM academic_years WHERE name = '2025-2026'`);
  let yearId;
  if (existingYears.length === 0) {
    const [res] = await pool.query(
      `INSERT INTO academic_years (name, start_date, end_date, is_current, status)
       VALUES ('2025-2026', '2025-09-01', '2026-06-30', TRUE, 'ACTIVE')`
    );
    yearId = res.insertId;

    await pool.query(
      `INSERT INTO academic_terms (academic_year_id, name, term_number, start_date, end_date, is_current)
       VALUES 
        (?, 'الفصل الدراسي الأول / Trimestre 1', 1, '2025-09-01', '2025-12-15', FALSE),
        (?, 'الفصل الدراسي الثاني / Trimestre 2', 2, '2026-01-05', '2026-03-25', TRUE),
        (?, 'الفصل الدراسي الثالث / Trimestre 3', 3, '2026-04-05', '2026-06-30', FALSE)`,
      [yearId, yearId, yearId]
    );
  } else {
    yearId = existingYears[0].id;
  }

  // 5. Teachers
  await pool.query(`
    INSERT INTO teachers (employee_code, national_id, first_name, last_name, gender, specialty, qualification, hire_date, monthly_salary, status)
    VALUES
      ('TEA-001', '1098234712', 'عبد الرحمن', 'بوزيد', 'MALE', 'الرياضيات والفيزياء', 'ماستر في التعليمية', '2022-09-01', 65000.00, 'ACTIVE'),
      ('TEA-002', '1087162534', 'فاطمة الزهراء', 'قاسمي', 'FEMALE', 'اللغة العربية والآداب', 'ليسانس أدب عربي', '2021-09-01', 58000.00, 'ACTIVE'),
      ('TEA-003', '1076253412', 'سمير', 'مرابط', 'MALE', 'العلوم الطبيعية والحياة', 'ماستر بيولوجيا', '2023-01-10', 60000.00, 'ACTIVE'),
      ('TEA-004', '1099887766', 'مريم', 'منصوري', 'FEMALE', 'التربية التحضيرية والطفولة المبكرة', 'دبلوم مربية أطفال', '2024-09-01', 48000.00, 'ACTIVE')
    ON DUPLICATE KEY UPDATE first_name = VALUES(first_name)
  `);

  // 6. Subjects
  const [trackRows] = await pool.query(`SELECT id, code FROM academic_tracks`);
  const trackMap = Object.fromEntries(trackRows.map(r => [r.code, r.id]));

  const subjects = [
    { code: 'MATH-PRIM', ar: 'الرياضيات', en: 'Mathematics', fr: 'Mathématiques', track: trackMap['K12_PRIMARY'], coeff: 3.0, color: '#3b82f6' },
    { code: 'ARAB-PRIM', ar: 'اللغة العربية', en: 'Arabic Language', fr: 'Langue Arabe', track: trackMap['K12_PRIMARY'], coeff: 3.0, color: '#10b981' },
    { code: 'FRAN-PRIM', ar: 'اللغة الفرنسية', en: 'French Language', fr: 'Langue Française', track: trackMap['K12_PRIMARY'], coeff: 2.0, color: '#8b5cf6' },
    { code: 'SCI-MID', ar: 'العلوم الفيزيائية والتكنولوجيا', en: 'Physics & Technology', fr: 'Physique et Technologie', track: trackMap['K12_MIDDLE'], coeff: 2.0, color: '#f59e0b' },
    { code: 'PRE-ACTIV', ar: 'الأنشطة الحركية والإدراكية', en: 'Motor & Cognitive Activities', fr: 'Activités Motrices et Cognitives', track: trackMap['PRE_SCHOOL'], coeff: 1.0, color: '#ec4899' },
    { code: 'TUTOR-BAC', ar: 'مراجعة الرياضيات المركزة (بكالوريا)', en: 'Advanced Math Remedial (BAC)', fr: 'Mathématiques Approfondies (BAC)', track: trackMap['ACADEMIC_TUTORING'], coeff: 1.0, color: '#6366f1' }
  ];

  for (const sub of subjects) {
    if (sub.track) {
      await pool.query(
        `INSERT INTO subjects (code, name_ar, name_en, name_fr, academic_track_id, default_coefficient, color_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar), name_en = VALUES(name_en)`,
        [sub.code, sub.ar, sub.en, sub.fr, sub.track, sub.coeff, sub.color]
      );
    }
  }

  // 7. Classes
  const [teacherRows] = await pool.query(`SELECT id FROM teachers LIMIT 3`);
  const t1 = teacherRows[0]?.id || null;
  const t2 = teacherRows[1]?.id || null;

  await pool.query(`
    INSERT INTO classes (academic_year_id, academic_track_id, name, grade_level, section, capacity, homeroom_teacher_id, classroom, status)
    VALUES
      (?, ?, 'فوج الفراشات - قسم التحضيري', 'KG2', 'A', 20, ?, 'قاعة الألوان 1', 'ACTIVE'),
      (?, ?, 'السنة الثالثة ابتدائي - فوج 1', '3AP', 'A', 28, ?, 'القاعة 04', 'ACTIVE'),
      (?, ?, 'السنة الرابعة متوسط (شهادة BEM)', '4AM', 'B', 30, ?, 'القاعة 09', 'ACTIVE'),
      (?, ?, 'فوج الدعم المكثف - رياضيات ثانوية', 'SUP-BAC', 'S1', 25, ?, 'قاعة المحاضرات ب', 'ACTIVE')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `, [
    yearId, trackMap['PRE_SCHOOL'], t2,
    yearId, trackMap['K12_PRIMARY'], t1,
    yearId, trackMap['K12_MIDDLE'], t1,
    yearId, trackMap['ACADEMIC_TUTORING'], t1
  ]);

  // 8. Students
  const [classRows] = await pool.query(`SELECT id, academic_track_id, name FROM classes`);
  const cPre = classRows.find(c => c.name.includes('تحضيري'))?.id;
  const cPrim = classRows.find(c => c.name.includes('ابتدائي'))?.id;
  const cMid = classRows.find(c => c.name.includes('متوسط'))?.id;

  await pool.query(`
    INSERT INTO students (matricule, national_id, first_name_ar, last_name_ar, first_name_en, last_name_en, gender, birth_date, birth_place, blood_group, current_class_id, academic_track_id, enrollment_date, status, parent_name, parent_phone, parent_email, address)
    VALUES
      ('STU-2026-0001', '1202016254', 'إياد', 'حليمي', 'Iyad', 'Halimi', 'MALE', '2020-04-12', 'الجزائر العاصمة', 'O+', ?, ?, '2025-09-01', 'ACTIVE', 'محمد حليمي', '0551234567', 'halimi.mohamed@gmail.com', 'حي المستقبل، عمارة 12'),
      ('STU-2026-0002', '1201725364', 'ريان', 'بن سالم', 'Rayan', 'Ben Salem', 'MALE', '2017-08-22', 'بومرداس', 'A+', ?, ?, '2025-09-01', 'ACTIVE', 'كمال بن سالم', '0662345678', 'bensalem.kamel@yahoo.fr', 'شارع الشهداء رقم 45'),
      ('STU-2026-0003', '1201736452', 'سارة', 'عمراوي', 'Sara', 'Amraoui', 'FEMALE', '2017-02-14', 'البليدة', 'B+', ?, ?, '2025-09-01', 'ACTIVE', 'ياسين عمراوي', '0773456789', 'amraoui.yassine@outlook.com', 'حي الزهور، فيلا 8'),
      ('STU-2026-0004', '1201198765', 'يوسف', 'قادري', 'Youssef', 'Kadri', 'MALE', '2011-11-05', 'الجزائر العاصمة', 'AB+', ?, ?, '2025-09-01', 'ACTIVE', 'رشيد قادري', '0554567890', 'kadri.rachid@gmail.com', 'نهج الحرية، رقم 102')
    ON DUPLICATE KEY UPDATE first_name_ar = VALUES(first_name_ar)
  `, [
    cPre, trackMap['PRE_SCHOOL'],
    cPrim, trackMap['K12_PRIMARY'],
    cPrim, trackMap['K12_PRIMARY'],
    cMid, trackMap['K12_MIDDLE']
  ]);

  // 9. Fee Types
  await pool.query(`
    INSERT INTO fee_types (name_ar, name_en, name_fr, default_amount, frequency, academic_track_id, is_active)
    VALUES
      ('حقوق التسجيل وإعادة القيد السنوية', 'Annual Registration Fee', 'Frais d''Inscription Annuelle', 15000.00, 'ANNUAL', ?, TRUE),
      ('الاشتراك الشهري - التعليم التحضيري', 'Preschool Monthly Tuition', 'Frais de Scolarité Maternelle', 18000.00, 'MONTHLY', ?, TRUE),
      ('الاشتراك الشهري - المرحلة الابتدائية', 'Primary Monthly Tuition', 'Frais de Scolarité Primaire', 16000.00, 'MONTHLY', ?, TRUE),
      ('الاشتراك الشهري - المرحلة المتوسطة', 'Middle School Monthly Tuition', 'Frais de Scolarité Moyen', 19000.00, 'MONTHLY', ?, TRUE),
      ('اشتراك حصص الدعم والتقوية (شهري)', 'Academic Tutoring Monthly Fee', 'Frais Mensuels de Soutien', 8000.00, 'MONTHLY', ?, TRUE)
    ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar)
  `, [
    trackMap['K12_PRIMARY'],
    trackMap['PRE_SCHOOL'],
    trackMap['K12_PRIMARY'],
    trackMap['K12_MIDDLE'],
    trackMap['ACADEMIC_TUTORING']
  ]);

  // 10. Store Products (Inventory POS)
  await pool.query(`
    INSERT INTO products (sku, barcode, name, category, academic_track_id, cost_price, selling_price, stock_quantity, min_stock_alert)
    VALUES
      ('UNI-BOY-P3', '613000000001', 'المئزر المدرسي الرسمي للأولاد (3 ابتدائي)', 'UNIFORM', ?, 1800.00, 2600.00, 45, 10),
      ('UNI-GIRL-P3', '613000000002', 'المئزر المدرسي الرسمي للبنات (3 ابتدائي)', 'UNIFORM', ?, 1900.00, 2750.00, 38, 10),
      ('BOOK-MATH-P3', '613000000003', 'كتاب الرياضيات والأنشطة (طبعة 2026)', 'TEXTBOOK', ?, 950.00, 1400.00, 60, 15),
      ('BOOK-ARAB-P3', '613000000004', 'كتاب القراءة واللغة العربية المدرسي', 'TEXTBOOK', ?, 880.00, 1300.00, 55, 15),
      ('KIT-PRE-COLOR', '613000000005', 'حقيبة الأنشطة والتلوين التحضيرية المتكاملة', 'SUPPLIES', ?, 2200.00, 3200.00, 30, 8),
      ('BAG-ALNOUR-LOGO', '613000000006', 'محفظة مدرسية طبية مع شعار النور الرسمي', 'SUPPLIES', ?, 3400.00, 4900.00, 25, 5)
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `, [
    trackMap['K12_PRIMARY'],
    trackMap['K12_PRIMARY'],
    trackMap['K12_PRIMARY'],
    trackMap['K12_PRIMARY'],
    trackMap['PRE_SCHOOL'],
    trackMap['K12_PRIMARY']
  ]);

  // 11. Initial Financial Transactions (Tuition Payments, Product Sales, Cash Register)
  const [studentRows] = await pool.query(`SELECT id, matricule FROM students`);
  const [feeRows] = await pool.query(`SELECT id, default_amount FROM fee_types WHERE frequency = 'MONTHLY' LIMIT 2`);
  const [userAdmin] = await pool.query(`SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`);
  const adminId = userAdmin[0]?.id || null;

  if (studentRows.length > 0 && feeRows.length > 0) {
    const s1 = studentRows[0].id;
    const s2 = studentRows[1]?.id || s1;

    // Payment 1: Full paid tuition
    await pool.query(`
      INSERT INTO payments (receipt_number, student_id, fee_type_id, amount_due, discount_type, discount_value, amount_paid, remaining_debt, payment_date, payment_method, status, covered_months, cashier_id, notes)
      VALUES 
        ('REC-2026-0001', ?, ?, 18000.00, 'NONE', 0.00, 18000.00, 0.00, '2026-02-01', 'CASH', 'PAID', '["2026-02"]', ?, 'سداد اشتراك شهر فيفري كاملاً'),
        ('REC-2026-0002', ?, ?, 16000.00, 'PERCENTAGE', 10.00, 10000.00, 4400.00, '2026-02-03', 'CASH', 'PARTIAL', '["2026-02"]', ?, 'دفعة أولى من اشتراك شهر فيفري مع تخفيض الإخوة')
      ON DUPLICATE KEY UPDATE notes = VALUES(notes)
    `, [s1, feeRows[0].id, adminId, s2, feeRows[1].id, adminId]);

    // Product Sale 1: Store POS with remaining debt
    const [existingSale] = await pool.query(`SELECT id FROM product_sales WHERE invoice_number = 'POS-2026-0001'`);
    let saleId;
    if (existingSale.length === 0) {
      const [saleRes] = await pool.query(`
        INSERT INTO product_sales (invoice_number, student_id, buyer_name, total_amount, discount_amount, paid_amount, remaining_debt, payment_status, cashier_id, notes)
        VALUES ('POS-2026-0001', ?, 'ولي التلميذ ريان بن سالم', 5350.00, 350.00, 3000.00, 2000.00, 'PARTIAL', ?, 'شراء المئزر الرسمي وكتاب القراءة')
      `, [s2, adminId]);
      saleId = saleRes.insertId;

      const [pRows] = await pool.query(`SELECT id, selling_price FROM products LIMIT 2`);
      if (pRows.length >= 2) {
        await pool.query(`
          INSERT INTO product_sale_items (sale_id, product_id, quantity, unit_price, total_price)
          VALUES 
            (?, ?, 1, ?, ?),
            (?, ?, 1, ?, ?)
        `, [saleId, pRows[0].id, pRows[0].selling_price, pRows[0].selling_price, saleId, pRows[1].id, pRows[1].selling_price, pRows[1].selling_price]);
      }
    }

    // Cash transaction: Petty cash
    await pool.query(`
      INSERT INTO cash_transactions (voucher_number, transaction_type, category, amount, description, payment_method, performed_by, transaction_date)
      VALUES
        ('CSH-2026-0001', 'EXPENSE', 'SUPPLIES_PURCHASE', 4500.00, 'شراء مستلزمات مكتبية وأوراق طباعة A4 لقسم الإدارة', 'CASH', ?, '2026-02-02'),
        ('CSH-2026-0002', 'INCOME', 'OTHER', 6000.00, 'استرداد مصاريف نقل مدرسي من التأمين', 'BANK_TRANSFER', ?, '2026-02-05')
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `, [adminId, adminId]);
  }

  console.log('[SEED] Database seeding completed successfully.');
}
