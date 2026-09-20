import { query } from '../config/db.js';

export async function listAuditLogs(req, res) {
  const { userId, actionType, entityName, search, limit = 100, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT 
        a.*,
        u.username,
        u.full_name AS user_full_name,
        u.role AS user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      sql += ' AND a.user_id = ?';
      params.push(userId);
    }
    if (actionType) {
      sql += ' AND a.action_type = ?';
      params.push(actionType);
    }
    if (entityName) {
      sql += ' AND a.entity_name = ?';
      params.push(entityName);
    }
    if (search) {
      sql += ` AND (a.workstation_name LIKE ? OR a.entity_id LIKE ? OR u.full_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const logs = await query(sql, params);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
