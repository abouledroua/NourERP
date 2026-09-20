import { query, executeTransaction } from '../config/db.js';
import { logAudit } from '../middlewares/deviceGuard.js';

export async function listClasses(req, res) {
  const { academicYearId, trackId, status } = req.query;

  try {
    let sql = `
      SELECT 
        c.*,
        y.name AS academic_year_name,
        t.code AS track_code,
        t.name_ar AS track_name_ar,
        t.name_en AS track_name_en,
        CONCAT(tea.first_name, ' ', tea.last_name) AS homeroom_teacher_name,
        tea.phone AS homeroom_teacher_phone,
        COUNT(s.id) AS enrolled_students_count
      FROM classes c
      JOIN academic_years y ON c.academic_year_id = y.id
      JOIN academic_tracks t ON c.academic_track_id = t.id
      LEFT JOIN teachers tea ON c.homeroom_teacher_id = tea.id
      LEFT JOIN students s ON s.current_class_id = c.id AND s.status = 'ACTIVE'
      WHERE 1=1
    `;
    const params = [];

    if (academicYearId) {
      sql += ' AND c.academic_year_id = ?';
      params.push(academicYearId);
    }
    if (trackId) {
      sql += ' AND c.academic_track_id = ?';
      params.push(trackId);
    }
    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY c.id ORDER BY c.grade_level ASC, c.section ASC, c.name ASC';
    const classes = await query(sql, params);
    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getClassRoster(req, res) {
  const { id } = req.params;
  try {
    const students = await query(`
      SELECT 
        s.id,
        s.matricule,
        s.first_name_ar,
        s.last_name_ar,
        s.first_name_en,
        s.last_name_en,
        s.gender,
        s.birth_date,
        s.parent_name,
        s.parent_phone,
        s.status
      FROM students s
      WHERE s.current_class_id = ?
      ORDER BY s.last_name_ar ASC, s.first_name_ar ASC
    `, [id]);

    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createClass(req, res) {
  const { academic_year_id, academic_track_id, name, grade_level, section, capacity, homeroom_teacher_id, classroom, status } = req.body;
  if (!academic_year_id || !academic_track_id || !name || !grade_level) {
    return res.status(400).json({ success: false, message: 'يرجى ملء كافة بيانات القسم الإلزامية / Required fields missing' });
  }

  try {
    const result = await query(`
      INSERT INTO classes (academic_year_id, academic_track_id, name, grade_level, section, capacity, homeroom_teacher_id, classroom, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      academic_year_id, academic_track_id, name, grade_level, section || 'A',
      capacity || 30, homeroom_teacher_id || null, classroom || null, status || 'ACTIVE'
    ]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'classes', result.insertId, { name, grade_level }, req.ip);
    res.status(201).json({ success: true, message: 'تم إنشاء الفوج/القسم بنجاح / Class created successfully', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateClass(req, res) {
  const { id } = req.params;
  const { name, grade_level, section, capacity, homeroom_teacher_id, classroom, status } = req.body;

  try {
    await query(`
      UPDATE classes 
      SET name = ?, grade_level = ?, section = ?, capacity = ?, homeroom_teacher_id = ?, classroom = ?, status = ?
      WHERE id = ?
    `, [name, grade_level, section, capacity, homeroom_teacher_id || null, classroom || null, status, id]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'classes', id, req.body, req.ip);
    res.json({ success: true, message: 'تم تعديل بيانات القسم بنجاح / Class updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteClass(req, res) {
  const { id } = req.params;
  try {
    await query('DELETE FROM classes WHERE id = ?', [id]);
    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'DELETE', 'classes', id, {}, req.ip);
    res.json({ success: true, message: 'تم حذف الفوج بنجاح / Class deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Multi-Year Rollover & Student Promotion Wizard
 * Batch actions: PROMOTE, RETAIN, GRADUATE, REASSIGN
 */
export async function batchRolloverStudents(req, res) {
  const { studentIds, action, targetClassId, targetAcademicYearId, remarks } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !action) {
    return res.status(400).json({ success: false, message: 'يرجى تحديد التلاميذ والإجراء المطلوب / Please specify students and action' });
  }

  try {
    const result = await executeTransaction(async (conn) => {
      let updatedCount = 0;

      for (const studentId of studentIds) {
        if (action === 'PROMOTE' || action === 'REASSIGN') {
          if (!targetClassId) throw new Error('القسم المستهدف مطلوب للترقية أو إعادة التوجيه / Target class required');

          // Update student current class
          await conn.query('UPDATE students SET current_class_id = ?, status = "ACTIVE" WHERE id = ?', [targetClassId, studentId]);

          // Record or update enrollment
          if (targetAcademicYearId) {
            await conn.query(`
              INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status, remarks)
              VALUES (?, ?, ?, 'PROMOTED', ?)
              ON DUPLICATE KEY UPDATE class_id = VALUES(class_id), enrollment_status = 'PROMOTED', remarks = VALUES(remarks)
            `, [studentId, targetClassId, targetAcademicYearId, remarks || null]);
          }
        } else if (action === 'RETAIN') {
          // Keep current class, update enrollment status
          if (targetAcademicYearId && targetClassId) {
            await conn.query('UPDATE students SET current_class_id = ? WHERE id = ?', [targetClassId, studentId]);
            await conn.query(`
              INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status, remarks)
              VALUES (?, ?, ?, 'RETAINED', ?)
              ON DUPLICATE KEY UPDATE enrollment_status = 'RETAINED', remarks = VALUES(remarks)
            `, [studentId, targetClassId, targetAcademicYearId, remarks || null]);
          }
        } else if (action === 'GRADUATE') {
          await conn.query('UPDATE students SET current_class_id = NULL, status = "GRADUATED" WHERE id = ?', [studentId]);
          if (targetAcademicYearId) {
            await conn.query(`
              UPDATE student_enrollments SET enrollment_status = 'GRADUATED'
              WHERE student_id = ? AND academic_year_id = ?
            `, [studentId, targetAcademicYearId]);
          }
        }
        updatedCount++;
      }

      return updatedCount;
    });

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'students_rollover', null, { action, studentCount: result }, req.ip);

    res.json({
      success: true,
      message: `تم تنفيذ عملية الترحيل/الترقية بنجاح على ${result} تلميذ / Rollover executed successfully on ${result} students`,
      affectedStudents: result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
