import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const database = process.env.DB_NAME || 'alnour_erp_db';
  const user = process.env.DB_USER || 'citrus';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'citrus21012013';

  console.log(`Connecting to ${host}:${port} as ${user}...`);
  let connection;
  try {
    connection = await mysql.createConnection({
      host, port, user, password, database, multipleStatements: true
    });
  } catch (err) {
    console.error('Failed to connect:', err.message);
    // try fallback root
    connection = await mysql.createConnection({
      host, port, user: 'root', password: '', database, multipleStatements: true
    });
  }

  const sql = `
CREATE TABLE IF NOT EXISTS financial_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    balance DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'DZD',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_account_id INT NOT NULL,
    to_account_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transfer_date DATE NOT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (to_account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    account_id INT NULL,
    hours_taught DECIMAL(6,2) DEFAULT 0.00,
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add hourly_rate to teachers if not exists
SET @dbname = DATABASE();
SET @tablename = 'teachers';
SET @columnname = 'hourly_rate';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " DECIMAL(10,2) DEFAULT 0.00;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add account_id to payments
SET @tablename = 'payments';
SET @columnname = 'account_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " INT NULL, ADD FOREIGN KEY (", @columnname, ") REFERENCES financial_accounts(id) ON DELETE SET NULL;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add account_id to product_sale_payments
SET @tablename = 'product_sale_payments';
SET @columnname = 'account_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " INT NULL, ADD FOREIGN KEY (", @columnname, ") REFERENCES financial_accounts(id) ON DELETE SET NULL;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add account_id to cash_transactions
SET @tablename = 'cash_transactions';
SET @columnname = 'account_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " INT NULL, ADD FOREIGN KEY (", @columnname, ") REFERENCES financial_accounts(id) ON DELETE SET NULL;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add pricing and schedule fields to classes
SET @tablename = 'classes';
SET @columnname = 'pricing_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD pricing_type ENUM('MONTH_BASED', 'SESSION_BASED', 'HOUR_BASED') DEFAULT 'MONTH_BASED', ADD pricing_value DECIMAL(10,2) DEFAULT 0.00, ADD schedule_info TEXT NULL;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Insert default account if table is empty
INSERT INTO financial_accounts (name, balance, is_default)
SELECT 'Main Safe (الخزينة الرئيسية)', 0.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM financial_accounts);
  `;

  console.log('Running migration...');
  await connection.query(sql);
  console.log('Migration successful.');
  await connection.end();
}

runMigration().catch(console.error);
