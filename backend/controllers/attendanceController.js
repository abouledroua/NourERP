import { query, executeTransaction } from '../config/db.js';

export async function getClassAttendanceRoster(req, res) {
  const { classId, date } = req.query;

  if (!classId || !date) {
    return res.status(400).json({ success: false, message: 'معرف القسم والتاريخ مطلوبان / Class ID and Date required' });
  }

  try {
    const students = await query(`
      SELECT 
        s.id AS student_id,
        s.matricule,
        s.first_name_ar,
        s.last_name_ar,
        s.parent_name,
        s.parent_phone,
        IFNULL(a.id, NULL) AS attendance_id,
        IFNULL(a.status, 'PRESENT') AS status,
        a.arrival_time,
        IFNULL(a.minutes_late, 0) AS minutes_late,
        a.reason,
        IFNULL(a.parent_notified, FALSE) AS parent_notified
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
      WHERE s.current_class_id = ? AND s.status = 'ACTIVE'
      ORDER BY s.last_name_ar ASC, s.first_name_ar ASC
    `, [date, classId]);

    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function saveAttendanceBatch(req, res) {
  const { classId, date, records } = req.body;

  if (!classId || !date || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'بيانات الحضور غير صالحة / Invalid attendance data' });
  }

  try {
    await executeTransaction(async (conn) => {
      for (const rec of records) {
        if (rec.student_id) {
          await conn.query(`
            INSERT INTO attendance (student_id, class_id, date, status, minutes_late, reason, parent_notified, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              status = VALUES(status),
              minutes_late = VALUES(minutes_late),
              reason = VALUES(reason),
              parent_notified = VALUES(parent_notified),
              recorded_by = VALUES(recorded_by)
          `, [
            rec.student_id,
            classId,
            date,
            rec.status || 'PRESENT',
            rec.minutes_late || 0,
            rec.reason || null,
            rec.parent_notified ? 1 : 0,
            req.user?.id || null
          ]);
        }
      }
    });

    res.json({ success: true, message: 'تم حفظ سجل الحضور والغياب بنجاح / Attendance recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleParentNotified(req, res) {
  const { id } = req.params;
  const { parent_notified } = req.body;

  try {
    await query('UPDATE attendance SET parent_notified = ? WHERE id = ?', [parent_notified ? 1 : 0, id]);
    res.json({ success: true, message: 'تم تحديث حالة إشعار الولي / Parent notification status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
