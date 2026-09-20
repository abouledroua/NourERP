import { query, executeTransaction } from '../config/db.js';
import { logAudit } from '../middlewares/deviceGuard.js';

export async function listProducts(req, res) {
  const { category, trackId, search, lowStock } = req.query;

  try {
    let sql = `
      SELECT p.*, t.name_ar AS track_name_ar
      FROM products p
      LEFT JOIN academic_tracks t ON p.academic_track_id = t.id
      WHERE p.is_active = TRUE
    `;
    const params = [];

    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }
    if (trackId) {
      sql += ' AND p.academic_track_id = ?';
      params.push(trackId);
    }
    if (lowStock === 'true') {
      sql += ' AND p.stock_quantity <= p.min_stock_alert';
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY p.name ASC';
    const products = await query(sql, params);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createProduct(req, res) {
  const { sku, barcode, name, category, academic_track_id, cost_price, selling_price, stock_quantity, min_stock_alert } = req.body;

  if (!name || selling_price === undefined) {
    return res.status(400).json({ success: false, message: 'اسم المنتج وسعر البيع مطلوبان / Product name and selling price required' });
  }

  try {
    const autoSku = sku || `SKU-${Date.now().toString().slice(-6)}`;
    const result = await query(`
      INSERT INTO products (sku, barcode, name, category, academic_track_id, cost_price, selling_price, stock_quantity, min_stock_alert)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      autoSku, barcode || null, name, category || 'SUPPLIES', academic_track_id || null,
      cost_price || 0.00, selling_price, stock_quantity || 0, min_stock_alert || 5
    ]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'products', result.insertId, { name, sku: autoSku }, req.ip);
    res.status(201).json({ success: true, message: 'تمت إضافة المنتج بنجاح / Product created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProduct(req, res) {
  const { id } = req.params;
  const { barcode, name, category, academic_track_id, cost_price, selling_price, stock_quantity, min_stock_alert } = req.body;

  try {
    await query(`
      UPDATE products 
      SET barcode = ?, name = ?, category = ?, academic_track_id = ?, cost_price = ?, selling_price = ?, stock_quantity = ?, min_stock_alert = ?
      WHERE id = ?
    `, [barcode || null, name, category, academic_track_id || null, cost_price, selling_price, stock_quantity, min_stock_alert, id]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'products', id, req.body, req.ip);
    res.json({ success: true, message: 'تم تحديث بيانات المنتج / Product updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POS Sale Creation (with immediate stock decrement & debt tracking)
 */
export async function createPOSSale(req, res) {
  const { student_id, buyer_name, items, discount_amount = 0, paid_amount = 0, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'يرجى إضافة منتجات إلى السلة / Cart items required' });
  }

  try {
    const saleResult = await executeTransaction(async (conn) => {
      // 1. Calculate items total and verify stock
      let calculatedTotal = 0;
      for (const item of items) {
        const [productRows] = await conn.query('SELECT selling_price, stock_quantity, name FROM products WHERE id = ?', [item.product_id]);
        const product = productRows[0];
        if (!product) {
          throw new Error(`المنتج رقم ${item.product_id} غير موجود في النظام`);
        }
        if (product.stock_quantity < item.quantity) {
          throw new Error(`الكمية غير متوفرة في المخزون للمنتج: ${product.name} (المتوفر: ${product.stock_quantity})`);
        }
        calculatedTotal += Number(product.selling_price) * Number(item.quantity);
      }

      const totalAfterDiscount = Math.max(0, calculatedTotal - Number(discount_amount || 0));
      const remaining_debt = Math.max(0, totalAfterDiscount - Number(paid_amount || 0));
      let payment_status = 'PAID';
      if (remaining_debt > 0) {
        payment_status = Number(paid_amount) > 0 ? 'PARTIAL' : 'UNPAID';
      }

      // 2. Generate invoice number
      const year = new Date().getFullYear();
      const [countRows] = await conn.query('SELECT COUNT(id) AS count FROM product_sales');
      const invoice_number = `POS-${year}-${(countRows[0].count + 1).toString().padStart(4, '0')}`;

      // 3. Insert into product_sales
      const [saleRes] = await conn.query(`
        INSERT INTO product_sales (invoice_number, student_id, buyer_name, total_amount, discount_amount, paid_amount, remaining_debt, payment_status, cashier_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoice_number, student_id || null, buyer_name || null, totalAfterDiscount,
        discount_amount || 0.00, paid_amount || 0.00, remaining_debt, payment_status,
        req.user?.id || null, notes || null
      ]);

      const saleId = saleRes.insertId;

      // 4. Insert items and decrement stock
      for (const item of items) {
        const [itemProdRows] = await conn.query('SELECT selling_price FROM products WHERE id = ?', [item.product_id]);
        const lineTotal = Number(itemProdRows[0].selling_price) * Number(item.quantity);

        await conn.query(`
          INSERT INTO product_sale_items (sale_id, product_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?)
        `, [saleId, item.product_id, item.quantity, product.selling_price, lineTotal]);

        await conn.query(`
          UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
        `, [item.quantity, item.product_id]);
      }

      return {
        saleId,
        invoice_number,
        total_amount: totalAfterDiscount,
        paid_amount,
        remaining_debt,
        payment_status
      };
    });

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'product_sales', saleResult.saleId, saleResult, req.ip);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل عملية البيع وتحديث المخزون بنجاح / Sale completed successfully',
      data: saleResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Settle Store Outstanding Debt (سداد دين المتجر)
 */
export async function settleStoreDebt(req, res) {
  const { sale_id, payment_amount, payment_method, notes } = req.body;

  if (!sale_id || !payment_amount || Number(payment_amount) <= 0) {
    return res.status(400).json({ success: false, message: 'معرف الفاتورة ومبلغ السداد مطلوبان / Sale ID and positive payment amount required' });
  }

  try {
    const settlementResult = await executeTransaction(async (conn) => {
      const [saleRows] = await conn.query('SELECT * FROM product_sales WHERE id = ?', [sale_id]);
      const sale = saleRows[0];
      if (!sale) {
        throw new Error('فاتورة المبيعات غير موجودة / Sale invoice not found');
      }

      const currentDebt = Number(sale.remaining_debt);
      const payment = Math.min(currentDebt, Number(payment_amount));
      const newDebt = Math.max(0, currentDebt - payment);
      const newPaid = Number(sale.paid_amount) + payment;
      const newStatus = newDebt === 0 ? 'PAID' : 'PARTIAL';

      // Generate settlement receipt number
      const year = new Date().getFullYear();
      const [stlCountRows] = await conn.query('SELECT COUNT(id) AS count FROM product_sale_payments');
      const receipt_number = `STL-${year}-${(stlCountRows[0].count + 1).toString().padStart(4, '0')}`;

      // Insert into product_sale_payments
      await conn.query(`
        INSERT INTO product_sale_payments (sale_id, receipt_number, amount, payment_date, payment_method, cashier_id, notes)
        VALUES (?, ?, ?, CURDATE(), ?, ?, ?)
      `, [sale_id, receipt_number, payment, payment_method || 'CASH', req.user?.id || null, notes || 'سداد دفعة من مستحقات المتجر المدرسي']);

      // Update product_sales
      await conn.query(`
        UPDATE product_sales 
        SET paid_amount = ?, remaining_debt = ?, payment_status = ?
        WHERE id = ?
      `, [newPaid, newDebt, newStatus, sale_id]);

      return {
        receipt_number,
        amount_settled: payment,
        remaining_debt: newDebt,
        new_status: newStatus
      };
    });

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'SETTLE_DEBT', 'product_sales', sale_id, settlementResult, req.ip);

    res.json({
      success: true,
      message: 'تم تسجيل دفعة سداد الدين بنجاح / Debt settlement recorded successfully',
      data: settlementResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * List POS Sales / Invoices (فواتير المتجر)
 */
export async function listPOSSales(req, res) {
  const { student_id, payment_status, limit } = req.query;
  try {
    let sql = `
      SELECT ps.*, s.first_name_ar, s.last_name_ar, s.matricule, u.full_name AS cashier_name
      FROM product_sales ps
      LEFT JOIN students s ON ps.student_id = s.id
      LEFT JOIN users u ON ps.cashier_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (student_id) {
      sql += ' AND ps.student_id = ?';
      params.push(student_id);
    }
    if (payment_status) {
      sql += ' AND ps.payment_status = ?';
      params.push(payment_status);
    }
    sql += ' ORDER BY ps.created_at DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit, 10));
    }
    const sales = await query(sql, params);
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get POS Sale Details with Items & Debt Payments
 */
export async function getPOSSaleDetails(req, res) {
  const { id } = req.params;
  try {
    const saleRows = await query(`
      SELECT ps.*, s.first_name_ar, s.last_name_ar, s.matricule, u.full_name AS cashier_name
      FROM product_sales ps
      LEFT JOIN students s ON ps.student_id = s.id
      LEFT JOIN users u ON ps.cashier_id = u.id
      WHERE ps.id = ?
    `, [id]);

    if (!saleRows || saleRows.length === 0) {
      return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة / Invoice not found' });
    }

    const items = await query(`
      SELECT psi.*, p.name AS product_name, p.sku
      FROM product_sale_items psi
      JOIN products p ON psi.product_id = p.id
      WHERE psi.sale_id = ?
    `, [id]);

    const payments = await query(`
      SELECT psp.*, u.full_name AS cashier_name
      FROM product_sale_payments psp
      LEFT JOIN users u ON psp.cashier_id = u.id
      WHERE psp.sale_id = ?
      ORDER BY psp.payment_date ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...saleRows[0],
        items,
        payments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
