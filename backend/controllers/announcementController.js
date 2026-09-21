import { query } from '../config/db.js';
import { logAudit } from '../middlewares/deviceGuard.js';

export async function listAnnouncements(req, res) {
  try {
    const { target_type, priority, search } = req.query;
    let sql = `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.priority,
        a.target_type,
        a.target_id,
        a.expires_at,
        a.created_at,
        a.updated_at,
        u.full_name AS author_name,
        u.role AS author_role,
        CASE 
          WHEN a.target_type = 'ALL' THEN 'الجميع / All'
          WHEN a.target_type = 'TRACK' THEN (SELECT name_ar FROM academic_tracks WHERE id = a.target_id)
          WHEN a.target_type = 'CLASS' THEN (SELECT name FROM classes WHERE id = a.target_id)
          WHEN a.target_type = 'STUDENT' THEN (SELECT CONCAT(first_name_ar, ' ', last_name_ar, ' (', matricule, ')') FROM students WHERE id = a.target_id)
          ELSE 'محدد'
        END AS target_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (target_type && target_type !== 'ALL_TYPES') {
      sql += ` AND a.target_type = ?`;
      params.push(target_type);
    }

    if (priority) {
      sql += ` AND a.priority = ?`;
      params.push(priority);
    }

    if (search && search.trim()) {
      sql += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ` ORDER BY a.created_at DESC`;

    const announcements = await query(sql, params);
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createAnnouncement(req, res) {
  const { title, content, priority = 'NORMAL', target_type = 'ALL', target_id = null, expires_at = null } = req.body;

  if (!title || !title.trim() || !content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'عنوان الإعلان ومحتواه مطلوبان / Title and content are required' });
  }

  if (target_type !== 'ALL' && !target_id) {
    return res.status(400).json({ success: false, message: 'يرجى تحديد الجهة المستهدفة للإعلان / Target ID is required for non-general announcements' });
  }

  try {
    const result = await query(`
      INSERT INTO announcements (title, content, priority, target_type, target_id, author_id, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      content.trim(),
      priority,
      target_type,
      target_type === 'ALL' ? null : target_id,
      req.user?.id || null,
      expires_at || null
    ]);

    const newId = result.insertId;
    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'announcements', newId, { title, target_type, target_id }, req.ip);

    res.status(201).json({
      success: true,
      message: 'تم نشر الإعلان بنجاح / Announcement published successfully',
      data: { id: newId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateAnnouncement(req, res) {
  const { id } = req.params;
  const { title, content, priority, target_type, target_id, expires_at } = req.body;

  if (!title || !title.trim() || !content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'عنوان الإعلان ومحتواه مطلوبان / Title and content are required' });
  }

  try {
    await query(`
      UPDATE announcements
      SET title = ?, content = ?, priority = ?, target_type = ?, target_id = ?, expires_at = ?
      WHERE id = ?
    `, [
      title.trim(),
      content.trim(),
      priority || 'NORMAL',
      target_type || 'ALL',
      target_type === 'ALL' ? null : target_id,
      expires_at || null,
      id
    ]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'announcements', id, { title, target_type }, req.ip);

    res.json({
      success: true,
      message: 'تم تحديث الإعلان بنجاح / Announcement updated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteAnnouncement(req, res) {
  const { id } = req.params;
  try {
    await query('DELETE FROM announcements WHERE id = ?', [id]);
    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'DELETE', 'announcements', id, null, req.ip);

    res.json({
      success: true,
      message: 'تم حذف الإعلان بنجاح / Announcement deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
