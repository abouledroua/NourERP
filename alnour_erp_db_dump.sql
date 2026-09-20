-- ========================================================
-- Al-Nour Academic & School ERP - Complete MySQL 5.7/8.0 Dump
-- Database: alnour_erp_db
-- ========================================================

CREATE DATABASE IF NOT EXISTS `alnour_erp_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `alnour_erp_db`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `academic_terms`;
CREATE TABLE `academic_terms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `academic_year_id` int(11) NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `term_number` tinyint(4) NOT NULL DEFAULT 1,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `academic_terms_ibfk_1` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `academic_terms` (`id`, `academic_year_id`, `name`, `term_number`, `start_date`, `end_date`, `is_current`, `created_at`) VALUES
(1, 1, 'الفصل الدراسي الأول / Trimestre 1', 1, '2025-08-31 23:00:00', '2025-12-14 23:00:00', 0, '2026-09-18 13:36:11'),
(2, 1, 'الفصل الدراسي الثاني / Trimestre 2', 2, '2026-01-04 23:00:00', '2026-03-24 23:00:00', 1, '2026-09-18 13:36:11'),
(3, 1, 'الفصل الدراسي الثالث / Trimestre 3', 3, '2026-04-04 23:00:00', '2026-06-29 23:00:00', 0, '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `academic_tracks`;
CREATE TABLE `academic_tracks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_ar` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_fr` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `academic_tracks` (`id`, `code`, `name_ar`, `name_en`, `name_fr`, `description`, `is_active`, `created_at`) VALUES
(1, 'PRE_SCHOOL', 'التعليم التحضيري والروضة', 'Early Childhood & Preschool', 'Enseignement Préscolaire', 'تنمية المهارات السلوكية والحركية واللغوية للطفولة المبكرة', 1, '2026-09-18 13:36:11'),
(2, 'K12_PRIMARY', 'التعليم الابتدائي', 'Primary Elementary School', 'Enseignement Primaire', 'المرحلة الابتدائية من السنة الأولى إلى الخامسة', 1, '2026-09-18 13:36:11'),
(3, 'K12_MIDDLE', 'التعليم المتوسط', 'Middle School / Junior High', 'Enseignement Moyen', 'المرحلة المتوسطة من الأولى إلى الرابعة متوسط', 1, '2026-09-18 13:36:11'),
(4, 'K12_HIGH', 'التعليم الثانوي', 'High School / Secondary', 'Enseignement Secondaire', 'المرحلة الثانوية - جذوع مشتركة وشعب تخصصية', 1, '2026-09-18 13:36:11'),
(5, 'ACADEMIC_TUTORING', 'دروس الدعم والتقوية الأكاديمية', 'Academic Tutoring & Remedial', 'Soutien Scolaire et Rattrapage', 'حصص مسائية وأسبوعية مكثفة للمراجعة والتحضير للامتحانات الرسمية', 1, '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `academic_years`;
CREATE TABLE `academic_years` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) DEFAULT 0,
  `status` enum('ACTIVE','ARCHIVED','LOCKED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `academic_years` (`id`, `name`, `start_date`, `end_date`, `is_current`, `status`, `created_at`) VALUES
(1, '2025-2026', '2025-08-31 23:00:00', '2026-06-29 23:00:00', 1, 'ACTIVE', '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `status` enum('PRESENT','ABSENT_JUSTIFIED','ABSENT_UNJUSTIFIED','LATE') COLLATE utf8mb4_unicode_ci DEFAULT 'PRESENT',
  `arrival_time` time DEFAULT NULL,
  `minutes_late` int(11) DEFAULT 0,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_notified` tinyint(1) DEFAULT 0,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_date` (`student_id`,`date`),
  KEY `class_id` (`class_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `device_id` int(11) DEFAULT NULL,
  `workstation_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_type` enum('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VOID_PAYMENT','SETTLE_DEBT','EXPORT','BACKUP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_entity` (`entity_name`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `audit_logs` (`id`, `user_id`, `device_id`, `workstation_name`, `action_type`, `entity_name`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 1, 'localhost', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:04:01'),
(2, 1, 1, 'localhost', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:08:14'),
(3, 1, 1, 'localhost', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:10:40'),
(4, 1, 1, 'localhost', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:11:03'),
(5, 1, 1, 'localhost', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:13:37'),
(6, 1, 2, 'Station-Win32', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:14:30'),
(7, 1, 1, 'localhost', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:18:19'),
(8, 1, 1, 'localhost', 'LOGIN', 'users', '1', '{\"username\":\"admin\"}', '127.0.0.1', '2026-09-18 14:20:36');

DROP TABLE IF EXISTS `cash_transactions`;
CREATE TABLE `cash_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `voucher_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_type` enum('INCOME','EXPENSE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method` enum('CASH','BANK_TRANSFER','CHEQUE') COLLATE utf8mb4_unicode_ci DEFAULT 'CASH',
  `receipt_ref` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `performed_by` int(11) DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `voucher_number` (`voucher_number`),
  KEY `performed_by` (`performed_by`),
  KEY `idx_cash_date` (`transaction_date`),
  CONSTRAINT `cash_transactions_ibfk_1` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cash_transactions` (`id`, `voucher_number`, `transaction_type`, `category`, `amount`, `description`, `payment_method`, `receipt_ref`, `performed_by`, `transaction_date`, `created_at`) VALUES
(1, 'CSH-2026-0001', 'EXPENSE', 'SUPPLIES_PURCHASE', '4500.00', 'شراء مستلزمات مكتبية وأوراق طباعة A4 لقسم الإدارة', 'CASH', NULL, 1, '2026-02-01 23:00:00', '2026-09-18 13:36:11'),
(2, 'CSH-2026-0002', 'INCOME', 'OTHER', '6000.00', 'استرداد مصاريف نقل مدرسي من التأمين', 'BANK_TRANSFER', NULL, 1, '2026-02-04 23:00:00', '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `class_subjects`;
CREATE TABLE `class_subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) DEFAULT NULL,
  `coefficient` decimal(4,2) DEFAULT 1.00,
  `hours_per_week` decimal(3,1) DEFAULT 2.0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_subject` (`class_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `class_subjects_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_subjects_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `academic_year_id` int(11) NOT NULL,
  `academic_track_id` int(11) NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade_level` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'A',
  `capacity` int(11) DEFAULT 30,
  `homeroom_teacher_id` int(11) DEFAULT NULL,
  `classroom` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','ACTIVE','STOPPED','ARCHIVED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `academic_track_id` (`academic_track_id`),
  KEY `homeroom_teacher_id` (`homeroom_teacher_id`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `classes_ibfk_2` FOREIGN KEY (`academic_track_id`) REFERENCES `academic_tracks` (`id`),
  CONSTRAINT `classes_ibfk_3` FOREIGN KEY (`homeroom_teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `classes` (`id`, `academic_year_id`, `academic_track_id`, `name`, `grade_level`, `section`, `capacity`, `homeroom_teacher_id`, `classroom`, `status`, `created_at`) VALUES
(1, 1, 1, 'فوج الفراشات - قسم التحضيري', 'KG2', 'A', 20, 2, 'قاعة الألوان 1', 'ACTIVE', '2026-09-18 13:36:11'),
(2, 1, 2, 'السنة الثالثة ابتدائي - فوج 1', '3AP', 'A', 28, 1, 'القاعة 04', 'ACTIVE', '2026-09-18 13:36:11'),
(3, 1, 3, 'السنة الرابعة متوسط (شهادة BEM)', '4AM', 'B', 30, 1, 'القاعة 09', 'ACTIVE', '2026-09-18 13:36:11'),
(4, 1, 5, 'فوج الدعم المكثف - رياضيات ثانوية', 'SUP-BAC', 'S1', 25, 1, 'قاعة المحاضرات ب', 'ACTIVE', '2026-09-18 13:36:11'),
(5, 1, 1, 'فوج الفراشات - قسم التحضيري', 'KG2', 'A', 20, 2, 'قاعة الألوان 1', 'ACTIVE', '2026-09-18 13:40:28'),
(6, 1, 2, 'السنة الثالثة ابتدائي - فوج 1', '3AP', 'A', 28, 1, 'القاعة 04', 'ACTIVE', '2026-09-18 13:40:28'),
(7, 1, 3, 'السنة الرابعة متوسط (شهادة BEM)', '4AM', 'B', 30, 1, 'القاعة 09', 'ACTIVE', '2026-09-18 13:40:28'),
(8, 1, 5, 'فوج الدعم المكثف - رياضيات ثانوية', 'SUP-BAC', 'S1', 25, 1, 'قاعة المحاضرات ب', 'ACTIVE', '2026-09-18 13:40:28'),
(9, 1, 1, 'فوج الفراشات - قسم التحضيري', 'KG2', 'A', 20, 2, 'قاعة الألوان 1', 'ACTIVE', '2026-09-18 14:03:59'),
(10, 1, 2, 'السنة الثالثة ابتدائي - فوج 1', '3AP', 'A', 28, 1, 'القاعة 04', 'ACTIVE', '2026-09-18 14:03:59'),
(11, 1, 3, 'السنة الرابعة متوسط (شهادة BEM)', '4AM', 'B', 30, 1, 'القاعة 09', 'ACTIVE', '2026-09-18 14:03:59'),
(12, 1, 5, 'فوج الدعم المكثف - رياضيات ثانوية', 'SUP-BAC', 'S1', 25, 1, 'قاعة المحاضرات ب', 'ACTIVE', '2026-09-18 14:03:59'),
(13, 1, 1, 'فوج الفراشات - قسم التحضيري', 'KG2', 'A', 20, 2, 'قاعة الألوان 1', 'ACTIVE', '2026-09-18 14:06:20'),
(14, 1, 2, 'السنة الثالثة ابتدائي - فوج 1', '3AP', 'A', 28, 1, 'القاعة 04', 'ACTIVE', '2026-09-18 14:06:20'),
(15, 1, 3, 'السنة الرابعة متوسط (شهادة BEM)', '4AM', 'B', 30, 1, 'القاعة 09', 'ACTIVE', '2026-09-18 14:06:20'),
(16, 1, 5, 'فوج الدعم المكثف - رياضيات ثانوية', 'SUP-BAC', 'S1', 25, 1, 'قاعة المحاضرات ب', 'ACTIVE', '2026-09-18 14:06:20'),
(17, 1, 1, 'فوج الفراشات - قسم التحضيري', 'KG2', 'A', 20, 2, 'قاعة الألوان 1', 'ACTIVE', '2026-09-18 14:10:33'),
(18, 1, 2, 'السنة الثالثة ابتدائي - فوج 1', '3AP', 'A', 28, 1, 'القاعة 04', 'ACTIVE', '2026-09-18 14:10:33'),
(19, 1, 3, 'السنة الرابعة متوسط (شهادة BEM)', '4AM', 'B', 30, 1, 'القاعة 09', 'ACTIVE', '2026-09-18 14:10:33'),
(20, 1, 5, 'فوج الدعم المكثف - رياضيات ثانوية', 'SUP-BAC', 'S1', 25, 1, 'قاعة المحاضرات ب', 'ACTIVE', '2026-09-18 14:10:33'),
(21, 1, 1, 'فوج الفراشات - قسم التحضيري', 'KG2', 'A', 20, 2, 'قاعة الألوان 1', 'ACTIVE', '2026-09-18 14:14:16'),
(22, 1, 2, 'السنة الثالثة ابتدائي - فوج 1', '3AP', 'A', 28, 1, 'القاعة 04', 'ACTIVE', '2026-09-18 14:14:16'),
(23, 1, 3, 'السنة الرابعة متوسط (شهادة BEM)', '4AM', 'B', 30, 1, 'القاعة 09', 'ACTIVE', '2026-09-18 14:14:16'),
(24, 1, 5, 'فوج الدعم المكثف - رياضيات ثانوية', 'SUP-BAC', 'S1', 25, 1, 'قاعة المحاضرات ب', 'ACTIVE', '2026-09-18 14:14:16');

DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `device_fingerprint` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workstation_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mac_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os_info` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','BLOCKED') COLLATE utf8mb4_unicode_ci DEFAULT 'APPROVED',
  `last_seen` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_fingerprint` (`device_fingerprint`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `devices` (`id`, `device_fingerprint`, `workstation_name`, `ip_address`, `mac_address`, `os_info`, `status`, `last_seen`, `approved_by`, `approved_at`, `created_at`) VALUES
(1, 'default-host-workstation', 'localhost', '127.0.0.1', NULL, NULL, 'APPROVED', '2026-09-18 14:20:36', NULL, NULL, '2026-09-18 13:41:02'),
(2, 'WS-LU189RP', 'Station-Win32', '127.0.0.1', NULL, NULL, 'APPROVED', '2026-09-18 14:20:00', NULL, NULL, '2026-09-18 14:14:23');

DROP TABLE IF EXISTS `fee_types`;
CREATE TABLE `fee_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_fr` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `frequency` enum('MONTHLY','TERMLY','ANNUAL','ONCE') COLLATE utf8mb4_unicode_ci DEFAULT 'MONTHLY',
  `academic_track_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `academic_track_id` (`academic_track_id`),
  CONSTRAINT `fee_types_ibfk_1` FOREIGN KEY (`academic_track_id`) REFERENCES `academic_tracks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `fee_types` (`id`, `name_ar`, `name_en`, `name_fr`, `default_amount`, `frequency`, `academic_track_id`, `is_active`) VALUES
(1, 'حقوق التسجيل وإعادة القيد السنوية', 'Annual Registration Fee', 'Frais d\'Inscription Annuelle', '15000.00', 'ANNUAL', 2, 1),
(2, 'الاشتراك الشهري - التعليم التحضيري', 'Preschool Monthly Tuition', 'Frais de Scolarité Maternelle', '18000.00', 'MONTHLY', 1, 1),
(3, 'الاشتراك الشهري - المرحلة الابتدائية', 'Primary Monthly Tuition', 'Frais de Scolarité Primaire', '16000.00', 'MONTHLY', 2, 1),
(4, 'الاشتراك الشهري - المرحلة المتوسطة', 'Middle School Monthly Tuition', 'Frais de Scolarité Moyen', '19000.00', 'MONTHLY', 3, 1),
(5, 'اشتراك حصص الدعم والتقوية (شهري)', 'Academic Tutoring Monthly Fee', 'Frais Mensuels de Soutien', '8000.00', 'MONTHLY', 5, 1),
(6, 'حقوق التسجيل وإعادة القيد السنوية', 'Annual Registration Fee', 'Frais d\'Inscription Annuelle', '15000.00', 'ANNUAL', 2, 1),
(7, 'الاشتراك الشهري - التعليم التحضيري', 'Preschool Monthly Tuition', 'Frais de Scolarité Maternelle', '18000.00', 'MONTHLY', 1, 1),
(8, 'الاشتراك الشهري - المرحلة الابتدائية', 'Primary Monthly Tuition', 'Frais de Scolarité Primaire', '16000.00', 'MONTHLY', 2, 1),
(9, 'الاشتراك الشهري - المرحلة المتوسطة', 'Middle School Monthly Tuition', 'Frais de Scolarité Moyen', '19000.00', 'MONTHLY', 3, 1),
(10, 'اشتراك حصص الدعم والتقوية (شهري)', 'Academic Tutoring Monthly Fee', 'Frais Mensuels de Soutien', '8000.00', 'MONTHLY', 5, 1),
(11, 'حقوق التسجيل وإعادة القيد السنوية', 'Annual Registration Fee', 'Frais d\'Inscription Annuelle', '15000.00', 'ANNUAL', 2, 1),
(12, 'الاشتراك الشهري - التعليم التحضيري', 'Preschool Monthly Tuition', 'Frais de Scolarité Maternelle', '18000.00', 'MONTHLY', 1, 1),
(13, 'الاشتراك الشهري - المرحلة الابتدائية', 'Primary Monthly Tuition', 'Frais de Scolarité Primaire', '16000.00', 'MONTHLY', 2, 1),
(14, 'الاشتراك الشهري - المرحلة المتوسطة', 'Middle School Monthly Tuition', 'Frais de Scolarité Moyen', '19000.00', 'MONTHLY', 3, 1),
(15, 'اشتراك حصص الدعم والتقوية (شهري)', 'Academic Tutoring Monthly Fee', 'Frais Mensuels de Soutien', '8000.00', 'MONTHLY', 5, 1),
(16, 'حقوق التسجيل وإعادة القيد السنوية', 'Annual Registration Fee', 'Frais d\'Inscription Annuelle', '15000.00', 'ANNUAL', 2, 1),
(17, 'الاشتراك الشهري - التعليم التحضيري', 'Preschool Monthly Tuition', 'Frais de Scolarité Maternelle', '18000.00', 'MONTHLY', 1, 1),
(18, 'الاشتراك الشهري - المرحلة الابتدائية', 'Primary Monthly Tuition', 'Frais de Scolarité Primaire', '16000.00', 'MONTHLY', 2, 1),
(19, 'الاشتراك الشهري - المرحلة المتوسطة', 'Middle School Monthly Tuition', 'Frais de Scolarité Moyen', '19000.00', 'MONTHLY', 3, 1),
(20, 'اشتراك حصص الدعم والتقوية (شهري)', 'Academic Tutoring Monthly Fee', 'Frais Mensuels de Soutien', '8000.00', 'MONTHLY', 5, 1),
(21, 'حقوق التسجيل وإعادة القيد السنوية', 'Annual Registration Fee', 'Frais d\'Inscription Annuelle', '15000.00', 'ANNUAL', 2, 1),
(22, 'الاشتراك الشهري - التعليم التحضيري', 'Preschool Monthly Tuition', 'Frais de Scolarité Maternelle', '18000.00', 'MONTHLY', 1, 1),
(23, 'الاشتراك الشهري - المرحلة الابتدائية', 'Primary Monthly Tuition', 'Frais de Scolarité Primaire', '16000.00', 'MONTHLY', 2, 1),
(24, 'الاشتراك الشهري - المرحلة المتوسطة', 'Middle School Monthly Tuition', 'Frais de Scolarité Moyen', '19000.00', 'MONTHLY', 3, 1),
(25, 'اشتراك حصص الدعم والتقوية (شهري)', 'Academic Tutoring Monthly Fee', 'Frais Mensuels de Soutien', '8000.00', 'MONTHLY', 5, 1),
(26, 'حقوق التسجيل وإعادة القيد السنوية', 'Annual Registration Fee', 'Frais d\'Inscription Annuelle', '15000.00', 'ANNUAL', 2, 1),
(27, 'الاشتراك الشهري - التعليم التحضيري', 'Preschool Monthly Tuition', 'Frais de Scolarité Maternelle', '18000.00', 'MONTHLY', 1, 1),
(28, 'الاشتراك الشهري - المرحلة الابتدائية', 'Primary Monthly Tuition', 'Frais de Scolarité Primaire', '16000.00', 'MONTHLY', 2, 1),
(29, 'الاشتراك الشهري - المرحلة المتوسطة', 'Middle School Monthly Tuition', 'Frais de Scolarité Moyen', '19000.00', 'MONTHLY', 3, 1),
(30, 'اشتراك حصص الدعم والتقوية (شهري)', 'Academic Tutoring Monthly Fee', 'Frais Mensuels de Soutien', '8000.00', 'MONTHLY', 5, 1);

DROP TABLE IF EXISTS `grades`;
CREATE TABLE `grades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `academic_term_id` int(11) NOT NULL,
  `evaluation_type` enum('CONTINUOUS','HOMEWORK','MIDTERM','FINAL_EXAM') COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `max_score` decimal(5,2) DEFAULT 20.00,
  `coefficient` decimal(4,2) DEFAULT 1.00,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `class_id` (`class_id`),
  KEY `subject_id` (`subject_id`),
  KEY `academic_term_id` (`academic_term_id`),
  CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_ibfk_4` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` int(11) NOT NULL,
  `fee_type_id` int(11) NOT NULL,
  `amount_due` decimal(10,2) NOT NULL,
  `discount_type` enum('NONE','PERCENTAGE','FIXED') COLLATE utf8mb4_unicode_ci DEFAULT 'NONE',
  `discount_value` decimal(10,2) DEFAULT 0.00,
  `amount_paid` decimal(10,2) NOT NULL,
  `remaining_debt` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_date` date NOT NULL,
  `payment_method` enum('CASH','BANK_TRANSFER','CHEQUE','CARD') COLLATE utf8mb4_unicode_ci DEFAULT 'CASH',
  `status` enum('PAID','PARTIAL','EXEMPTED') COLLATE utf8mb4_unicode_ci DEFAULT 'PAID',
  `covered_months` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`covered_months`)),
  `cashier_id` int(11) DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `fee_type_id` (`fee_type_id`),
  KEY `cashier_id` (`cashier_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_payment_student` (`student_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`fee_type_id`) REFERENCES `fee_types` (`id`),
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `payments` (`id`, `receipt_number`, `student_id`, `fee_type_id`, `amount_due`, `discount_type`, `discount_value`, `amount_paid`, `remaining_debt`, `payment_date`, `payment_method`, `status`, `covered_months`, `cashier_id`, `notes`, `created_at`) VALUES
(1, 'REC-2026-0001', 1, 2, '18000.00', 'NONE', '0.00', '18000.00', '0.00', '2026-01-31 23:00:00', 'CASH', 'PAID', '[\"2026-02\"]', 1, 'سداد اشتراك شهر فيفري كاملاً', '2026-09-18 13:36:11'),
(2, 'REC-2026-0002', 2, 3, '16000.00', 'PERCENTAGE', '10.00', '10000.00', '4400.00', '2026-02-02 23:00:00', 'CASH', 'PARTIAL', '[\"2026-02\"]', 1, 'دفعة أولى من اشتراك شهر فيفري مع تخفيض الإخوة', '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `preschool_milestones`;
CREATE TABLE `preschool_milestones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `academic_term_id` int(11) NOT NULL,
  `motor_skills` enum('NEEDS_SUPPORT','DEVELOPING','PROFICIENT','EXCELLENT') COLLATE utf8mb4_unicode_ci DEFAULT 'DEVELOPING',
  `cognitive_skills` enum('NEEDS_SUPPORT','DEVELOPING','PROFICIENT','EXCELLENT') COLLATE utf8mb4_unicode_ci DEFAULT 'DEVELOPING',
  `social_behavior` enum('NEEDS_SUPPORT','DEVELOPING','PROFICIENT','EXCELLENT') COLLATE utf8mb4_unicode_ci DEFAULT 'DEVELOPING',
  `language_skills` enum('NEEDS_SUPPORT','DEVELOPING','PROFICIENT','EXCELLENT') COLLATE utf8mb4_unicode_ci DEFAULT 'DEVELOPING',
  `alphabet_progress` int(11) DEFAULT 0,
  `numbers_progress` int(11) DEFAULT 0,
  `general_remarks` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `academic_term_id` (`academic_term_id`),
  CONSTRAINT `preschool_milestones_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `preschool_milestones_ibfk_2` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_sale_items`;
CREATE TABLE `product_sale_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `product_sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `total_price`) VALUES
(1, 1, 1, 1, '2600.00', '2600.00'),
(2, 1, 2, 1, '2750.00', '2750.00');

DROP TABLE IF EXISTS `product_sale_payments`;
CREATE TABLE `product_sale_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sale_id` int(11) NOT NULL,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('CASH','BANK_TRANSFER','CHEQUE','CARD') COLLATE utf8mb4_unicode_ci DEFAULT 'CASH',
  `cashier_id` int(11) DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `sale_id` (`sale_id`),
  KEY `cashier_id` (`cashier_id`),
  CONSTRAINT `product_sale_payments_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `product_sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_sale_payments_ibfk_2` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_sales`;
CREATE TABLE `product_sales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `buyer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `remaining_debt` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('PAID','PARTIAL','UNPAID') COLLATE utf8mb4_unicode_ci DEFAULT 'PAID',
  `cashier_id` int(11) DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `cashier_id` (`cashier_id`),
  KEY `idx_sale_created` (`created_at`),
  KEY `idx_sale_student` (`student_id`),
  CONSTRAINT `product_sales_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL,
  CONSTRAINT `product_sales_ibfk_2` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_sales` (`id`, `invoice_number`, `student_id`, `buyer_name`, `total_amount`, `discount_amount`, `paid_amount`, `remaining_debt`, `payment_status`, `cashier_id`, `notes`, `created_at`) VALUES
(1, 'POS-2026-0001', 2, 'ولي التلميذ ريان بن سالم', '5350.00', '350.00', '3000.00', '2000.00', 'PARTIAL', 1, 'شراء المئزر الرسمي وكتاب القراءة', '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `barcode` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('TEXTBOOK','UNIFORM','SUPPLIES','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUPPLIES',
  `academic_track_id` int(11) DEFAULT NULL,
  `cost_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `min_stock_alert` int(11) NOT NULL DEFAULT 5,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `academic_track_id` (`academic_track_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`academic_track_id`) REFERENCES `academic_tracks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `products` (`id`, `sku`, `barcode`, `name`, `category`, `academic_track_id`, `cost_price`, `selling_price`, `stock_quantity`, `min_stock_alert`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'UNI-BOY-P3', '613000000001', 'المئزر المدرسي الرسمي للأولاد (3 ابتدائي)', 'UNIFORM', 2, '1800.00', '2600.00', 45, 10, NULL, 1, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(2, 'UNI-GIRL-P3', '613000000002', 'المئزر المدرسي الرسمي للبنات (3 ابتدائي)', 'UNIFORM', 2, '1900.00', '2750.00', 38, 10, NULL, 1, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(3, 'BOOK-MATH-P3', '613000000003', 'كتاب الرياضيات والأنشطة (طبعة 2026)', 'TEXTBOOK', 2, '950.00', '1400.00', 60, 15, NULL, 1, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(4, 'BOOK-ARAB-P3', '613000000004', 'كتاب القراءة واللغة العربية المدرسي', 'TEXTBOOK', 2, '880.00', '1300.00', 55, 15, NULL, 1, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(5, 'KIT-PRE-COLOR', '613000000005', 'حقيبة الأنشطة والتلوين التحضيرية المتكاملة', 'SUPPLIES', 1, '2200.00', '3200.00', 30, 8, NULL, 1, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(6, 'BAG-ALNOUR-LOGO', '613000000006', 'محفظة مدرسية طبية مع شعار النور الرسمي', 'SUPPLIES', 2, '3400.00', '4900.00', 25, 5, NULL, 1, '2026-09-18 13:36:11', '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `report_cards`;
CREATE TABLE `report_cards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `academic_term_id` int(11) NOT NULL,
  `overall_gpa` decimal(5,2) NOT NULL,
  `class_rank` int(11) DEFAULT NULL,
  `total_students` int(11) DEFAULT NULL,
  `attendance_rate` decimal(5,2) DEFAULT 100.00,
  `appreciation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decision` enum('PROMOTED','RETAINED','PENDING') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `issued_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_term_card` (`student_id`,`academic_term_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_term_id` (`academic_term_id`),
  CONSTRAINT `report_cards_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `report_cards_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `report_cards_ibfk_3` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `school_settings`;
CREATE TABLE `school_settings` (
  `key_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `school_settings` (`key_name`, `key_value`, `description`, `updated_at`) VALUES
('currency', 'DA', 'Official Currency Symbol', '2026-09-18 13:36:10'),
('print_receipt_footer', '«التربية ركيزتنا والامتياز غايتنا» - شكراً لثقتكم بمؤسستنا', 'Receipt Footer Slogan', '2026-09-18 13:36:10'),
('school_address', 'شارع النهضة والتربية، مجمع النور التعليمي', 'Official Address', '2026-09-18 13:36:10'),
('school_email', 'administration@alnour-school.edu', 'Official Email', '2026-09-18 13:36:10'),
('school_name_ar', 'مؤسسة ونظام النور الأكاديمي والتربوي', 'School Name (Arabic)', '2026-09-18 13:36:10'),
('school_name_en', 'Al-Nour Academic & School Institute', 'School Name (English)', '2026-09-18 13:36:10'),
('school_name_fr', 'Établissement Scolaire & Académique Al-Nour', 'School Name (French)', '2026-09-18 13:36:10'),
('school_phone', '+213 (0) 550 12 34 56', 'Phone Contact', '2026-09-18 13:36:10'),
('tax_number', 'NIF: 099817263544001', 'Tax / Registration Identifier', '2026-09-18 13:36:10');

DROP TABLE IF EXISTS `student_enrollments`;
CREATE TABLE `student_enrollments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `roll_number` int(11) DEFAULT NULL,
  `enrollment_status` enum('ACTIVE','PROMOTED','RETAINED','TRANSFERRED','GRADUATED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enrolled_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_year` (`student_id`,`academic_year_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `student_enrollments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_enrollments_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_enrollments_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `matricule` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `national_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name_ar` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name_ar` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('MALE','FEMALE') COLLATE utf8mb4_unicode_ci DEFAULT 'MALE',
  `birth_date` date NOT NULL,
  `birth_place` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_group` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_class_id` int(11) DEFAULT NULL,
  `academic_track_id` int(11) NOT NULL,
  `enrollment_date` date NOT NULL,
  `status` enum('ACTIVE','TRANSFERRED','GRADUATED','SUSPENDED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `photo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_job` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `medical_notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `matricule` (`matricule`),
  KEY `current_class_id` (`current_class_id`),
  KEY `academic_track_id` (`academic_track_id`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`current_class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `students_ibfk_2` FOREIGN KEY (`academic_track_id`) REFERENCES `academic_tracks` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `students` (`id`, `matricule`, `national_id`, `first_name_ar`, `last_name_ar`, `first_name_en`, `last_name_en`, `gender`, `birth_date`, `birth_place`, `blood_group`, `current_class_id`, `academic_track_id`, `enrollment_date`, `status`, `photo_url`, `parent_name`, `parent_phone`, `parent_email`, `parent_job`, `address`, `medical_notes`, `created_at`, `updated_at`) VALUES
(1, 'STU-2026-0001', '1202016254', 'إياد', 'حليمي', 'Iyad', 'Halimi', 'MALE', '2020-04-11 23:00:00', 'الجزائر العاصمة', 'O+', 1, 1, '2025-08-31 23:00:00', 'ACTIVE', NULL, 'محمد حليمي', '0551234567', 'halimi.mohamed@gmail.com', NULL, 'حي المستقبل، عمارة 12', NULL, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(2, 'STU-2026-0002', '1201725364', 'ريان', 'بن سالم', 'Rayan', 'Ben Salem', 'MALE', '2017-08-21 23:00:00', 'بومرداس', 'A+', 2, 2, '2025-08-31 23:00:00', 'ACTIVE', NULL, 'كمال بن سالم', '0662345678', 'bensalem.kamel@yahoo.fr', NULL, 'شارع الشهداء رقم 45', NULL, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(3, 'STU-2026-0003', '1201736452', 'سارة', 'عمراوي', 'Sara', 'Amraoui', 'FEMALE', '2017-02-13 23:00:00', 'البليدة', 'B+', 2, 2, '2025-08-31 23:00:00', 'ACTIVE', NULL, 'ياسين عمراوي', '0773456789', 'amraoui.yassine@outlook.com', NULL, 'حي الزهور، فيلا 8', NULL, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(4, 'STU-2026-0004', '1201198765', 'يوسف', 'قادري', 'Youssef', 'Kadri', 'MALE', '2011-11-04 23:00:00', 'الجزائر العاصمة', 'AB+', 3, 3, '2025-08-31 23:00:00', 'ACTIVE', NULL, 'رشيد قادري', '0554567890', 'kadri.rachid@gmail.com', NULL, 'نهج الحرية، رقم 102', NULL, '2026-09-18 13:36:11', '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `subjects`;
CREATE TABLE `subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_ar` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_fr` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `academic_track_id` int(11) NOT NULL,
  `default_coefficient` decimal(4,2) DEFAULT 1.00,
  `color_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#3b82f6',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `academic_track_id` (`academic_track_id`),
  CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`academic_track_id`) REFERENCES `academic_tracks` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subjects` (`id`, `code`, `name_ar`, `name_en`, `name_fr`, `academic_track_id`, `default_coefficient`, `color_code`) VALUES
(1, 'MATH-PRIM', 'الرياضيات', 'Mathematics', 'Mathématiques', 2, '3.00', '#3b82f6'),
(2, 'ARAB-PRIM', 'اللغة العربية', 'Arabic Language', 'Langue Arabe', 2, '3.00', '#10b981'),
(3, 'FRAN-PRIM', 'اللغة الفرنسية', 'French Language', 'Langue Française', 2, '2.00', '#8b5cf6'),
(4, 'SCI-MID', 'العلوم الفيزيائية والتكنولوجيا', 'Physics & Technology', 'Physique et Technologie', 3, '2.00', '#f59e0b'),
(5, 'PRE-ACTIV', 'الأنشطة الحركية والإدراكية', 'Motor & Cognitive Activities', 'Activités Motrices et Cognitives', 1, '1.00', '#ec4899'),
(6, 'TUTOR-BAC', 'مراجعة الرياضيات المركزة (بكالوريا)', 'Advanced Math Remedial (BAC)', 'Mathématiques Approfondies (BAC)', 5, '1.00', '#6366f1');

DROP TABLE IF EXISTS `teacher_substitutions`;
CREATE TABLE `teacher_substitutions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `substitution_date` date NOT NULL,
  `original_teacher_id` int(11) NOT NULL,
  `substitute_teacher_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('SCHEDULED','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci DEFAULT 'SCHEDULED',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `original_teacher_id` (`original_teacher_id`),
  KEY `substitute_teacher_id` (`substitute_teacher_id`),
  KEY `class_id` (`class_id`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `teacher_substitutions_ibfk_1` FOREIGN KEY (`original_teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_substitutions_ibfk_2` FOREIGN KEY (`substitute_teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_substitutions_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_substitutions_ibfk_4` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `teachers`;
CREATE TABLE `teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `national_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('MALE','FEMALE') COLLATE utf8mb4_unicode_ci DEFAULT 'MALE',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialty` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qualification` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `monthly_salary` decimal(10,2) DEFAULT 0.00,
  `status` enum('ACTIVE','ON_LEAVE','RESIGNED','TERMINATED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `photo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `teachers` (`id`, `employee_code`, `national_id`, `first_name`, `last_name`, `gender`, `email`, `phone`, `specialty`, `qualification`, `hire_date`, `monthly_salary`, `status`, `photo_url`, `created_at`) VALUES
(1, 'TEA-001', '1098234712', 'عبد الرحمن', 'بوزيد', 'MALE', NULL, NULL, 'الرياضيات والفيزياء', 'ماستر في التعليمية', '2022-08-31 23:00:00', '65000.00', 'ACTIVE', NULL, '2026-09-18 13:36:11'),
(2, 'TEA-002', '1087162534', 'فاطمة الزهراء', 'قاسمي', 'FEMALE', NULL, NULL, 'اللغة العربية والآداب', 'ليسانس أدب عربي', '2021-08-31 23:00:00', '58000.00', 'ACTIVE', NULL, '2026-09-18 13:36:11'),
(3, 'TEA-003', '1076253412', 'سمير', 'مرابط', 'MALE', NULL, NULL, 'العلوم الطبيعية والحياة', 'ماستر بيولوجيا', '2023-01-09 23:00:00', '60000.00', 'ACTIVE', NULL, '2026-09-18 13:36:11'),
(4, 'TEA-004', '1099887766', 'مريم', 'منصوري', 'FEMALE', NULL, NULL, 'التربية التحضيرية والطفولة المبكرة', 'دبلوم مربية أطفال', '2024-08-31 23:00:00', '48000.00', 'ACTIVE', NULL, '2026-09-18 13:36:11');

DROP TABLE IF EXISTS `timetables`;
CREATE TABLE `timetables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `day_of_week` tinyint(4) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `class_id` (`class_id`),
  KEY `subject_id` (`subject_id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `timetables_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `timetables_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `timetables_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('SUPER_ADMIN','ADMIN','DIRECTOR','TEACHER','CASHIER','SUPERVISOR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ADMIN',
  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `email`, `phone`, `role`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2a$10$x47.hsze3yQUzuwugmJkp.ISVqPnn1hoqGkVp19TW/hqyGHOKPVc.', 'الإدارة العامة للنظام', 'admin@alnour-school.edu', NULL, 'SUPER_ADMIN', 'ACTIVE', '2026-09-18 14:20:36', '2026-09-18 13:36:11', '2026-09-18 14:20:36'),
(2, 'cashier', '$2a$10$x47.hsze3yQUzuwugmJkp.73aFGM2NbDyaIrKmIo0xJWKTgQOj7qq', 'محاسب الخزينة والمالية', 'finance@alnour-school.edu', NULL, 'CASHIER', 'ACTIVE', NULL, '2026-09-18 13:36:11', '2026-09-18 13:36:11'),
(3, 'teacher', '$2a$10$x47.hsze3yQUzuwugmJkp.gIpC.48.4J8zx4x799W1S69ugxAOF.y', 'الأستاذ عبد الرحمن بوزيد', 'bouzid@alnour-school.edu', NULL, 'TEACHER', 'ACTIVE', NULL, '2026-09-18 13:36:11', '2026-09-18 13:36:11');

SET FOREIGN_KEY_CHECKS = 1;
