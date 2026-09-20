import { query } from '../config/db.js';

export async function getTimetable(req, res) {
  const { classId, teacherId } = req.query;

  try {
    let sql = `
      SELECT 
        tt.*,
        c.name AS class_name,
        c.grade_level,
        sub.name_ar AS subject_name_ar,
        sub.name_en AS subject_name_en,
        sub.color_code,
        CONCAT(tea.first_name, ' ', tea.last_name) AS teacher_name
      FROM timetables tt
      JOIN classes c ON tt.class_id = c.id
      JOIN subjects sub ON tt.subject_id = sub.id
      JOIN teachers tea ON tt.teacher_id = tea.id
      WHERE 1=1
    `;
    const params = [];

    if (classId) {
      sql += ' AND tt.class_id = ?';
      params.push(classId);
    }
    if (teacherId) {
      sql += ' AND tt.teacher_id = ?';
      params.push(teacherId);
    }

    sql += ' ORDER BY tt.day_of_week ASC, tt.start_time ASC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function addTimetableSlot(req, res) {
  const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = req.body;

  if (!classId || !subjectId || !teacherId || dayOfWeek === undefined || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'بيانات الحصة غير مكتملة / Incomplete timetable slot data' });
  }

  try {
    // 1. Conflict check for Teacher
    const teacherConflicts = await query(`
      SELECT tt.*, c.name AS class_name
      FROM timetables tt
      JOIN classes c ON tt.class_id = c.id
      WHERE tt.teacher_id = ? 
        AND tt.day_of_week = ?
        AND (
          (tt.start_time <= ? AND tt.end_time > ?) OR
          (tt.start_time < ? AND tt.end_time >= ?) OR
          (tt.start_time >= ? AND tt.end_time <= ?)
        )
    `, [teacherId, dayOfWeek, startTime, startTime, endTime, endTime, startTime, endTime]);

    if (teacherConflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: `تعارض في جدول الأستاذ: الأستاذ مرتبط بالفعل مع (${teacherConflicts[0].class_name}) في هذا التوقيت / Teacher conflict detected`
      });
    }

    // 2. Conflict check for Class
    const classConflicts = await query(`
      SELECT tt.*, sub.name_ar AS subject_name_ar
      FROM timetables tt
      JOIN subjects sub ON tt.subject_id = sub.id
      WHERE tt.class_id = ?
        AND tt.day_of_week = ?
        AND (
          (tt.start_time <= ? AND tt.end_time > ?) OR
          (tt.start_time < ? AND tt.end_time >= ?) OR
          (tt.start_time >= ? AND tt.end_time <= ?)
        )
    `, [classId, dayOfWeek, startTime, startTime, endTime, endTime, startTime, endTime]);

    if (classConflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: `تعارض في جدول القسم: القسم مبرمج بالفعل مع مادة (${classConflicts[0].subject_name_ar}) في هذا التوقيت / Class conflict detected`
      });
    }

    const result = await query(`
      INSERT INTO timetables (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room || null]);

    res.status(201).json({ success: true, message: 'تمت برمجة الحصة بنجاح / Timetable slot added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteTimetableSlot(req, res) {
  const { id } = req.params;
  try {
    await query('DELETE FROM timetables WHERE id = ?', [id]);
    res.json({ success: true, message: 'تم حذف الحصة من جدول التوقيت / Slot removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
