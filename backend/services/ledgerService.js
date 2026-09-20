import { query } from '../config/db.js';

export async function getConsolidatedLedger({ type, studentId, search, startDate, endDate, status, limit = 100, offset = 0 }) {
  let whereClauses = [];
  let params = [];

  // 1. Tuition Payments query
  let tuitionSql = `
    SELECT 
      p.id,
      'TUITION' AS transaction_category,
      p.receipt_number AS reference_number,
      p.payment_date AS transaction_date,
      p.amount_due AS total_amount,
      p.amount_paid AS paid_amount,
      p.remaining_debt AS debt_amount,
      p.status,
      p.payment_method,
      p.discount_type,
      p.discount_value,
      p.covered_months,
      p.notes,
      s.id AS student_id,
      s.matricule AS student_matricule,
      CONCAT(s.first_name_ar, ' ', s.last_name_ar) AS student_name_ar,
      CONCAT(IFNULL(s.first_name_en, ''), ' ', IFNULL(s.last_name_en, '')) AS student_name_en,
      c.name AS class_name,
      ft.name_ar AS item_description_ar,
      ft.name_en AS item_description_en,
      u.full_name AS cashier_name,
      p.created_at
    FROM payments p
    JOIN students s ON p.student_id = s.id
    LEFT JOIN classes c ON s.current_class_id = c.id
    JOIN fee_types ft ON p.fee_type_id = ft.id
    LEFT JOIN users u ON p.cashier_id = u.id
    WHERE 1=1
  `;

  // 2. Store Sales query
  let storeSql = `
    SELECT 
      ps.id,
      'STORE_POS' AS transaction_category,
      ps.invoice_number AS reference_number,
      DATE(ps.created_at) AS transaction_date,
      ps.total_amount AS total_amount,
      ps.paid_amount AS paid_amount,
      ps.remaining_debt AS debt_amount,
      ps.payment_status AS status,
      'CASH' AS payment_method,
      'NONE' AS discount_type,
      ps.discount_amount AS discount_value,
      NULL AS covered_months,
      ps.notes,
      s.id AS student_id,
      IFNULL(s.matricule, 'EXT-CLIENT') AS student_matricule,
      IFNULL(CONCAT(s.first_name_ar, ' ', s.last_name_ar), ps.buyer_name) AS student_name_ar,
      IFNULL(CONCAT(s.first_name_en, ' ', s.last_name_en), ps.buyer_name) AS student_name_en,
      c.name AS class_name,
      'مبيعات المتجر والكتب والمآزر المدرسية' AS item_description_ar,
      'School Store, Uniforms & Book Sales' AS item_description_en,
      u.full_name AS cashier_name,
      ps.created_at
    FROM product_sales ps
    LEFT JOIN students s ON ps.student_id = s.id
    LEFT JOIN classes c ON s.current_class_id = c.id
    LEFT JOIN users u ON ps.cashier_id = u.id
    WHERE 1=1
  `;

  // Combine queries according to category filter
  let unionQuery = '';
  if (type === 'TUITION') {
    unionQuery = tuitionSql;
  } else if (type === 'STORE_POS') {
    unionQuery = storeSql;
  } else {
    unionQuery = `(${tuitionSql}) UNION ALL (${storeSql})`;
  }

  // Wrap in outer query for search, date, status, sorting, and pagination
  let finalSql = `SELECT * FROM (${unionQuery}) AS consolidated WHERE 1=1`;
  const finalParams = [];

  if (studentId) {
    finalSql += ` AND student_id = ?`;
    finalParams.push(studentId);
  }
  if (status) {
    finalSql += ` AND status = ?`;
    finalParams.push(status);
  }
  if (startDate) {
    finalSql += ` AND transaction_date >= ?`;
    finalParams.push(startDate);
  }
  if (endDate) {
    finalSql += ` AND transaction_date <= ?`;
    finalParams.push(endDate);
  }
  if (search) {
    finalSql += ` AND (
      reference_number LIKE ? 
      OR student_matricule LIKE ? 
      OR student_name_ar LIKE ? 
      OR student_name_en LIKE ?
      OR notes LIKE ?
    )`;
    const sTerm = `%${search}%`;
    finalParams.push(sTerm, sTerm, sTerm, sTerm, sTerm);
  }

  finalSql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  finalParams.push(parseInt(limit, 10), parseInt(offset, 10));

  const items = await query(finalSql, finalParams);
  return items;
}

export async function getFinancialKPIs() {
  // 1. Tuition stats
  const [tuitionStats] = await query(`
    SELECT 
      IFNULL(SUM(amount_paid), 0) AS total_tuition_paid,
      IFNULL(SUM(remaining_debt), 0) AS total_tuition_debt,
      COUNT(id) AS total_tuition_receipts
    FROM payments
  `);

  // 2. Store POS stats
  const [storeStats] = await query(`
    SELECT 
      IFNULL(SUM(paid_amount), 0) AS total_store_paid,
      IFNULL(SUM(remaining_debt), 0) AS total_store_debt,
      COUNT(id) AS total_store_invoices
    FROM product_sales
  `);

  // 3. Petty Cash stats
  const [cashStats] = await query(`
    SELECT 
      IFNULL(SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_cash_income,
      IFNULL(SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_cash_expense
    FROM cash_transactions
  `);

  const totalPaid = Number(tuitionStats.total_tuition_paid) + Number(storeStats.total_store_paid) + Number(cashStats.total_cash_income);
  const totalDebt = Number(tuitionStats.total_tuition_debt) + Number(storeStats.total_store_debt);
  const totalExpense = Number(cashStats.total_cash_expense);
  const netOperatingBalance = totalPaid - totalExpense;

  return {
    totalOverallPaid: totalPaid,
    totalOutstandingDebt: totalDebt,
    tuitionPaid: Number(tuitionStats.total_tuition_paid),
    tuitionDebt: Number(tuitionStats.total_tuition_debt),
    storePaid: Number(storeStats.total_store_paid),
    storeDebt: Number(storeStats.total_store_debt),
    pettyCashIncome: Number(cashStats.total_cash_income),
    pettyCashExpense: totalExpense,
    netOperatingBalance
  };
}
