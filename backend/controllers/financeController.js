import { query, executeTransaction } from '../config/db.js';
import { getConsolidatedLedger, getFinancialKPIs } from '../services/ledgerService.js';
import { logAudit } from '../middlewares/deviceGuard.js';

export async function getLedgerFeed(req, res) {
  try {
    const { type, studentId, search, startDate, endDate, status, limit, offset } = req.query;
    const items = await getConsolidatedLedger({
      type,
      studentId,
      search,
      startDate,
      endDate,
      status,
      limit: limit || 100,
      offset: offset || 0
    });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getKPIs(req, res) {
  try {
    const kpis = await getFinancialKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createTuitionPayment(req, res) {
  const {
    student_id,
    fee_type_id,
    amount_due,
    discount_type,
    discount_value,
    amount_paid,
    payment_date,
    payment_method,
    covered_months,
    notes
  } = req.body;

  if (!student_id || !fee_type_id || amount_paid === undefined || amount_due === undefined) {
    return res.status(400).json({ success: false, message: 'بيانات الوصل المالي غير مكتملة / Incomplete payment details' });
  }

  try {
    const year = new Date().getFullYear();
    const [countRow] = await query('SELECT COUNT(id) AS count FROM payments');
    const receipt_number = `REC-${year}-${(countRow.count + 1).toString().padStart(4, '0')}`;

    // Calculate discount amount
    let effectiveDiscount = 0;
    if (discount_type === 'PERCENTAGE') {
      effectiveDiscount = (Number(amount_due) * Number(discount_value || 0)) / 100;
    } else if (discount_type === 'FIXED') {
      effectiveDiscount = Number(discount_value || 0);
    }

    const finalPayable = Math.max(0, Number(amount_due) - effectiveDiscount);
    const remaining_debt = Math.max(0, finalPayable - Number(amount_paid));
    let status = 'PAID';
    if (remaining_debt > 0) {
      status = Number(amount_paid) > 0 ? 'PARTIAL' : 'EXEMPTED';
    }

    const result = await query(`
      INSERT INTO payments (
        receipt_number, student_id, fee_type_id, amount_due, discount_type, discount_value,
        amount_paid, remaining_debt, payment_date, payment_method, status, covered_months, cashier_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      receipt_number, student_id, fee_type_id, amount_due, discount_type || 'NONE', discount_value || 0.00,
      amount_paid, remaining_debt, payment_date || new Date().toISOString().slice(0, 10),
      payment_method || 'CASH', status, covered_months ? JSON.stringify(covered_months) : null,
      req.user?.id || null, notes || null
    ]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'payments', result.insertId, { receipt_number, amount_paid, remaining_debt }, req.ip);

    res.status(201).json({
      success: true,
      message: 'تم إصدار وصل السداد بنجاح / Receipt generated successfully',
      data: {
        id: result.insertId,
        receipt_number,
        amount_paid,
        remaining_debt,
        status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSingleReceipt(req, res) {
  const { id } = req.params;
  try {
    const [payment] = await query(`
      SELECT 
        p.*,
        ft.name_ar AS fee_name_ar,
        ft.name_en AS fee_name_en,
        s.matricule,
        s.first_name_ar,
        s.last_name_ar,
        s.parent_name,
        s.parent_phone,
        c.name AS class_name,
        u.full_name AS cashier_name
      FROM payments p
      JOIN fee_types ft ON p.fee_type_id = ft.id
      JOIN students s ON p.student_id = s.id
      LEFT JOIN classes c ON s.current_class_id = c.id
      LEFT JOIN users u ON p.cashier_id = u.id
      WHERE p.id = ?
    `, [id]);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'وصل السداد غير موجود / Receipt not found' });
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function voidTransaction(req, res) {
  const { category, id } = req.params;
  const { reason } = req.body;

  try {
    if (category === 'TUITION') {
      await query('DELETE FROM payments WHERE id = ?', [id]);
    } else if (category === 'STORE_POS') {
      await executeTransaction(async (conn) => {
        // Return products to inventory
        const items = await conn.query('SELECT product_id, quantity FROM product_sale_items WHERE sale_id = ?', [id]);
        for (const it of items[0]) {
          await conn.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [it.quantity, it.product_id]);
        }
        await conn.query('DELETE FROM product_sales WHERE id = ?', [id]);
      });
    } else {
      return res.status(400).json({ success: false, message: 'صنف المعاملة غير صالح / Invalid transaction category' });
    }

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'VOID_PAYMENT', category, id, { reason }, req.ip);
    res.json({ success: true, message: 'تم إلغاء/إبطال المعاملة بنجاح واسترجاع المخزون إذا وجد / Transaction voided' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function listFeeTypes(req, res) {
  try {
    const types = await query('SELECT * FROM fee_types WHERE is_active = TRUE ORDER BY id ASC');
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function listCashTransactions(req, res) {
  try {
    const items = await query(`
      SELECT ct.*, u.full_name AS performed_by_name
      FROM cash_transactions ct
      LEFT JOIN users u ON ct.performed_by = u.id
      ORDER BY ct.transaction_date DESC, ct.id DESC
    `);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCashTransaction(req, res) {
  const { transaction_type, category, amount, description, payment_method, receipt_ref, transaction_date } = req.body;

  if (!transaction_type || !category || !amount || !description) {
    return res.status(400).json({ success: false, message: 'بيانات العملية المالية غير مكتملة / Required fields missing' });
  }

  try {
    const year = new Date().getFullYear();
    const [countRow] = await query('SELECT COUNT(id) AS count FROM cash_transactions');
    const voucher_number = `CSH-${year}-${(countRow.count + 1).toString().padStart(4, '0')}`;

    const result = await query(`
      INSERT INTO cash_transactions (voucher_number, transaction_type, category, amount, description, payment_method, receipt_ref, performed_by, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      voucher_number, transaction_type, category, amount, description,
      payment_method || 'CASH', receipt_ref || null, req.user?.id || null,
      transaction_date || new Date().toISOString().slice(0, 10)
    ]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'cash_transactions', result.insertId, { voucher_number, transaction_type, amount }, req.ip);
    res.status(201).json({ success: true, message: 'تم تقييد العملية في سجل الخزينة / Cash entry recorded', voucher_number });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
