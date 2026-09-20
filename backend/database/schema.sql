-- =========================================================================
-- Al-Nour Academic & School ERP Database Schema
-- نظام النور الأكاديمي والإداري المتكامل للمدارس
-- Target: MySQL 8+ / MariaDB 10.5+ | Engine: InnoDB | Charset: UTF8MB4
-- =========================================================================

CREATE DATABASE IF NOT EXISTS alnour_erp_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE alnour_erp_db;

-- -------------------------------------------------------------------------
-- 1. SYSTEM CONFIGURATION & WORKSTATION AUTHORIZATION
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_settings (
    key_name VARCHAR(100) PRIMARY KEY,
    key_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_fingerprint VARCHAR(191) NOT NULL UNIQUE,
    workstation_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    mac_address VARCHAR(50) NULL,
    os_info VARCHAR(100) NULL,
    status ENUM('PENDING', 'APPROVED', 'BLOCKED') DEFAULT 'APPROVED',
    last_seen TIMESTAMP NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NULL,
    phone VARCHAR(30) NULL,
    role ENUM('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'TEACHER', 'CASHIER', 'SUPERVISOR') NOT NULL DEFAULT 'ADMIN',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    device_id INT NULL,
    workstation_name VARCHAR(100) NULL,
    action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VOID_PAYMENT', 'SETTLE_DEBT', 'EXPORT', 'BACKUP') NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_entity (entity_name, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 2. ACADEMIC TRACKS, YEARS, TERMS & CLASSIFICATION
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'PRE_SCHOOL', 'K12_PRIMARY', 'K12_MIDDLE', 'K12_HIGH', 'ACADEMIC_TUTORING'
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_years (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g., '2025-2026'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'ARCHIVED', 'LOCKED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_terms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year_id INT NOT NULL,
    name VARCHAR(50) NOT NULL, -- e.g. 'الفصل الأول / Term 1'
    term_number TINYINT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 3. FACULTY, SUBJECTS & TIMETABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    national_id VARCHAR(50) NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender ENUM('MALE', 'FEMALE') DEFAULT 'MALE',
    email VARCHAR(100) NULL,
    phone VARCHAR(30) NULL,
    specialty VARCHAR(100) NULL,
    qualification VARCHAR(100) NULL,
    hire_date DATE NULL,
    monthly_salary DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED') DEFAULT 'ACTIVE',
    photo_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    academic_track_id INT NOT NULL,
    default_coefficient DECIMAL(4,2) DEFAULT 1.00,
    color_code VARCHAR(20) DEFAULT '#3b82f6',
    FOREIGN KEY (academic_track_id) REFERENCES academic_tracks(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year_id INT NOT NULL,
    academic_track_id INT NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g. 'القسم 1 تحضيري - أ' or 'السنة الأولى متوسط - فوج 2'
    grade_level VARCHAR(50) NOT NULL, -- 'KG1', 'KG2', '1AP', '2AP', '1AM', etc.
    section VARCHAR(20) DEFAULT 'A',
    capacity INT DEFAULT 30,
    homeroom_teacher_id INT NULL,
    classroom VARCHAR(50) NULL,
    status ENUM('PENDING', 'ACTIVE', 'STOPPED', 'ARCHIVED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_track_id) REFERENCES academic_tracks(id) ON DELETE RESTRICT,
    FOREIGN KEY (homeroom_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NULL,
    coefficient DECIMAL(4,2) DEFAULT 1.00,
    hours_per_week DECIMAL(3,1) DEFAULT 2.0,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    UNIQUE KEY uk_class_subject (class_id, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    day_of_week TINYINT NOT NULL, -- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50) NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_substitutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    substitution_date DATE NOT NULL,
    original_teacher_id INT NOT NULL,
    substitute_teacher_id INT NOT NULL,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255) NULL,
    status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (substitute_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 4. STUDENTS, ENROLLMENTS, ATTENDANCE & GRADES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'STU-2026-0001'
    national_id VARCHAR(50) NULL,
    first_name_ar VARCHAR(50) NOT NULL,
    last_name_ar VARCHAR(50) NOT NULL,
    first_name_en VARCHAR(50) NULL,
    last_name_en VARCHAR(50) NULL,
    gender ENUM('MALE', 'FEMALE') DEFAULT 'MALE',
    birth_date DATE NOT NULL,
    birth_place VARCHAR(100) NULL,
    blood_group VARCHAR(10) NULL,
    current_class_id INT NULL,
    academic_track_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    status ENUM('ACTIVE', 'TRANSFERRED', 'GRADUATED', 'SUSPENDED') DEFAULT 'ACTIVE',
    photo_url VARCHAR(255) NULL,
    parent_name VARCHAR(100) NOT NULL,
    parent_phone VARCHAR(30) NOT NULL,
    parent_email VARCHAR(100) NULL,
    parent_job VARCHAR(100) NULL,
    address TEXT NULL,
    maladies TEXT NULL,
    medical_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (current_class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_track_id) REFERENCES academic_tracks(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    roll_number INT NULL,
    enrollment_status ENUM('ACTIVE', 'PROMOTED', 'RETAINED', 'TRANSFERRED', 'GRADUATED') DEFAULT 'ACTIVE',
    remarks VARCHAR(255) NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_student_enroll (student_id),
    UNIQUE KEY uk_student_class (student_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS preschool_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    academic_term_id INT NOT NULL,
    motor_skills ENUM('NEEDS_SUPPORT', 'DEVELOPING', 'PROFICIENT', 'EXCELLENT') DEFAULT 'DEVELOPING',
    cognitive_skills ENUM('NEEDS_SUPPORT', 'DEVELOPING', 'PROFICIENT', 'EXCELLENT') DEFAULT 'DEVELOPING',
    social_behavior ENUM('NEEDS_SUPPORT', 'DEVELOPING', 'PROFICIENT', 'EXCELLENT') DEFAULT 'DEVELOPING',
    language_skills ENUM('NEEDS_SUPPORT', 'DEVELOPING', 'PROFICIENT', 'EXCELLENT') DEFAULT 'DEVELOPING',
    alphabet_progress INT DEFAULT 0, -- percentage 0-100
    numbers_progress INT DEFAULT 0,   -- percentage 0-100
    general_remarks TEXT NULL,
    recorded_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('PRESENT', 'ABSENT_JUSTIFIED', 'ABSENT_UNJUSTIFIED', 'LATE') DEFAULT 'PRESENT',
    arrival_time TIME NULL,
    minutes_late INT DEFAULT 0,
    reason VARCHAR(255) NULL,
    parent_notified BOOLEAN DEFAULT FALSE,
    recorded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_date (student_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_term_id INT NOT NULL,
    evaluation_type ENUM('CONTINUOUS', 'HOMEWORK', 'MIDTERM', 'FINAL_EXAM') NOT NULL,
    score DECIMAL(5,2) NOT NULL, -- e.g. 16.50 out of 20
    max_score DECIMAL(5,2) DEFAULT 20.00,
    coefficient DECIMAL(4,2) DEFAULT 1.00,
    remarks VARCHAR(255) NULL,
    recorded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    academic_term_id INT NOT NULL,
    overall_gpa DECIMAL(5,2) NOT NULL, -- e.g. 15.42
    class_rank INT NULL,
    total_students INT NULL,
    attendance_rate DECIMAL(5,2) DEFAULT 100.00,
    appreciation VARCHAR(100) NULL, -- 'ممتاز', 'جيد جدا', 'لوحة شرف', etc.
    decision ENUM('PROMOTED', 'RETAINED', 'PENDING') DEFAULT 'PENDING',
    issued_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_term_card (student_id, academic_term_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 5. FUSED FINANCIAL TRANSACTIONS LEDGER & SCHOOL STORE POS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    default_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    frequency ENUM('MONTHLY', 'TERMLY', 'ANNUAL', 'ONCE') DEFAULT 'MONTHLY',
    academic_track_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (academic_track_id) REFERENCES academic_tracks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'REC-2026-0001'
    student_id INT NOT NULL,
    fee_type_id INT NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    discount_type ENUM('NONE', 'PERCENTAGE', 'FIXED') DEFAULT 'NONE',
    discount_value DECIMAL(10,2) DEFAULT 0.00,
    amount_paid DECIMAL(10,2) NOT NULL,
    remaining_debt DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD') DEFAULT 'CASH',
    status ENUM('PAID', 'PARTIAL', 'EXEMPTED') DEFAULT 'PAID',
    covered_months JSON NULL, -- e.g. ["2026-09", "2026-10"]
    cashier_id INT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(100) NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category ENUM('TEXTBOOK', 'UNIFORM', 'SUPPLIES', 'OTHER') NOT NULL DEFAULT 'SUPPLIES',
    academic_track_id INT NULL,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 5,
    image_url VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (academic_track_id) REFERENCES academic_tracks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'POS-2026-0001'
    student_id INT NULL,
    buyer_name VARCHAR(100) NULL, -- Optional if not an enrolled student
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    remaining_debt DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('PAID', 'PARTIAL', 'UNPAID') DEFAULT 'PAID',
    cashier_id INT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sale_created (created_at),
    INDEX idx_sale_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES product_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_sale_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    receipt_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'STL-2026-0001'
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD') DEFAULT 'CASH',
    cashier_id INT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES product_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'CSH-2026-0001'
    transaction_type ENUM('INCOME', 'EXPENSE') NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'SALARY', 'MAINTENANCE', 'SUPPLIES_PURCHASE', 'RENT', 'OTHER'
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'CHEQUE') DEFAULT 'CASH',
    receipt_ref VARCHAR(100) NULL,
    performed_by INT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cash_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
