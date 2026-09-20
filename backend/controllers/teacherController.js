import { query } from '../config/db.js';
import { logAudit } from '../middlewares/deviceGuard.js';

export async function listTeachers(req, res) {
  const { status, search } = req.query;

  try {
    let sql = `
      SELECT 
        t.*,
        (SELECT COUNT(DISTINCT class_id) FROM timetables WHERE teacher_id = t.id) AS classes_count,
        (SELECT COUNT(DISTINCT subject_id) FROM timetables WHERE teacher_id = t.id) AS subjects_count
      FROM teachers t
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ` AND (t.first_name LIKE ? OR t.last_name LIKE ? OR t.specialty LIKE ? OR t.phone LIKE ? OR t.employee_code LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY t.last_name ASC, t.first_name ASC';
    const teachers = await query(sql, params);
    res.json({ success: true, data: teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createTeacher(req, res) {
  const { national_id, first_name, last_name, gender, email, phone, specialty, qualification, hire_date, monthly_salary, status, photo_url } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ success: false, message: 'الاسم واللقب مطلوبان / First name and last name required' });
  }

  try {
    const [maxRow] = await query('SELECT COALESCE(MAX(id), 0) AS max_id FROM teachers');
    const code = `TEA-${(maxRow.max_id + 1).toString().padStart(3, '0')}`;

    const result = await query(`
      INSERT INTO teachers (employee_code, national_id, first_name, last_name, gender, email, phone, specialty, qualification, hire_date, monthly_salary, status, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code, national_id || null, first_name, last_name, gender || 'MALE', email || null,
      phone || null, specialty || null, qualification || null, hire_date || new Date(),
      monthly_salary || 0.00, status || 'ACTIVE', photo_url || null
    ]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'teachers', result.insertId, { code, first_name, last_name }, req.ip);
    res.status(201).json({ success: true, message: 'تمت إضافة الأستاذ بنجاح / Teacher added successfully', id: result.insertId, employee_code: code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateTeacher(req, res) {
  const { id } = req.params;
  const fields = req.body;

  try {
    const cols = [];
    const vals = [];
    const allowed = ['national_id', 'first_name', 'last_name', 'gender', 'email', 'phone', 'specialty', 'qualification', 'hire_date', 'monthly_salary', 'status', 'photo_url'];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        cols.push(`\`${key}\` = ?`);
        vals.push(fields[key]);
      }
    }

    if (cols.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد حقول للتعديل / No fields to update' });
    }

    vals.push(id);
    await query(`UPDATE teachers SET ${cols.join(', ')} WHERE id = ?`, vals);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'teachers', id, fields, req.ip);
    res.json({ success: true, message: 'تم تحديث بيانات الأستاذ بنجاح / Teacher updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteTeacher(req, res) {
  const { id } = req.params;
  try {
    await query('DELETE FROM teachers WHERE id = ?', [id]);
    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'DELETE', 'teachers', id, {}, req.ip);
    res.json({ success: true, message: 'تم حذف الأستاذ بنجاح / Teacher deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function listSubstitutions(req, res) {
  try {
    const items = await query(`
      SELECT 
        ts.*,
        CONCAT(t1.first_name, ' ', t1.last_name) AS original_teacher_name,
        CONCAT(t2.first_name, ' ', t2.last_name) AS substitute_teacher_name,
        c.name AS class_name,
        sub.name_ar AS subject_name_ar
      FROM teacher_substitutions ts
      JOIN teachers t1 ON ts.original_teacher_id = t1.id
      JOIN teachers t2 ON ts.substitute_teacher_id = t2.id
      JOIN classes c ON ts.class_id = c.id
      JOIN subjects sub ON ts.subject_id = sub.id
      ORDER BY ts.substitution_date DESC
    `);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createSubstitution(req, res) {
  const { substitution_date, original_teacher_id, substitute_teacher_id, class_id, subject_id, start_time, end_time, reason } = req.body;
  try {
    const result = await query(`
      INSERT INTO teacher_substitutions (substitution_date, original_teacher_id, substitute_teacher_id, class_id, subject_id, start_time, end_time, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
    `, [substitution_date, original_teacher_id, substitute_teacher_id, class_id, subject_id, start_time, end_time, reason || null]);

    res.status(201).json({ success: true, message: 'تم تسجيل حصة الاستخلاف / Substitution registered', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function listSubjects(req, res) {
  const { trackId } = req.query;
  try {
    let sql = `
      SELECT s.*, t.name_ar AS track_name_ar 
      FROM subjects s 
      JOIN academic_tracks t ON s.academic_track_id = t.id
      WHERE 1=1
    `;
    const params = [];
    if (trackId) {
      sql += ' AND s.academic_track_id = ?';
      params.push(trackId);
    }
    sql += ' ORDER BY s.name_ar ASC';
    const subjects = await query(sql, params);
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
