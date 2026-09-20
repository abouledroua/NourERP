import { query, executeTransaction } from '../config/db.js';
import { logAudit } from '../middlewares/deviceGuard.js';
import { exportToExcel } from '../services/excelService.js';

export async function listStudents(req, res) {
  const { trackId, classId, status, search, limit = 100, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT 
        s.*,
        c.name AS class_name,
        c.grade_level,
        t.code AS track_code,
        t.name_ar AS track_name_ar,
        t.name_en AS track_name_en,
        (
          SELECT GROUP_CONCAT(DISTINCT cl.name ORDER BY cl.name SEPARATOR ', ')
          FROM student_enrollments se2
          JOIN classes cl ON se2.class_id = cl.id
          WHERE se2.student_id = s.id
        ) AS all_classes_names,
        IFNULL((SELECT SUM(remaining_debt) FROM payments WHERE student_id = s.id), 0) +
        IFNULL((SELECT SUM(remaining_debt) FROM product_sales WHERE student_id = s.id), 0) AS total_debt
      FROM students s
      LEFT JOIN classes c ON s.current_class_id = c.id
      JOIN academic_tracks t ON s.academic_track_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (trackId) {
      sql += ' AND s.academic_track_id = ?';
      params.push(trackId);
    }
    if (classId) {
      sql += ' AND (s.current_class_id = ? OR EXISTS (SELECT 1 FROM student_enrollments se WHERE se.student_id = s.id AND se.class_id = ?))';
      params.push(classId, classId);
    }
    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ` AND (
        s.matricule LIKE ? 
        OR s.first_name_ar LIKE ? 
        OR s.last_name_ar LIKE ? 
        OR s.first_name_en LIKE ? 
        OR s.last_name_en LIKE ? 
        OR s.parent_name LIKE ? 
        OR s.parent_phone LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term);
    }

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const students = await query(sql, params);
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getStudentDossier(req, res) {
  const { id } = req.params;

  try {
    // 1. Basic Student Info
    const students = await query(`
      SELECT 
        s.*,
        c.name AS class_name,
        c.grade_level,
        t.code AS track_code,
        t.name_ar AS track_name_ar,
        t.name_en AS track_name_en
      FROM students s
      LEFT JOIN classes c ON s.current_class_id = c.id
      JOIN academic_tracks t ON s.academic_track_id = t.id
      WHERE s.id = ?
    `, [id]);

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'التلميذ غير موجود / Student not found' });
    }
    const student = students[0];

    // 2. Assigned Classes / Cohorts (Multi-class enrollment)
    const assignedClasses = await query(`
      SELECT 
        c.id,
        c.name,
        c.id AS class_id,
        c.name AS class_name,
        c.grade_level,
        c.section,
        c.classroom,
        c.capacity,
        c.status AS class_status,
        y.name AS academic_year_name,
        t.code AS track_code,
        t.name_ar AS track_name_ar,
        t.name_en AS track_name_en,
        CONCAT(tea.first_name, ' ', tea.last_name) AS homeroom_teacher_name,
        tea.phone AS homeroom_teacher_phone,
        COALESCE(se.enrollment_status, 'ACTIVE') AS enrollment_status,
        se.roll_number,
        se.enrolled_at,
        se.remarks
      FROM classes c
      JOIN academic_tracks t ON c.academic_track_id = t.id
      JOIN academic_years y ON c.academic_year_id = y.id
      LEFT JOIN teachers tea ON c.homeroom_teacher_id = tea.id
      LEFT JOIN student_enrollments se ON se.class_id = c.id AND se.student_id = ?
      WHERE se.student_id = ? OR c.id = ?
      ORDER BY c.grade_level ASC, c.name ASC
    `, [id, id, student.current_class_id || 0]);

    // 3. Grades & Terms
    const grades = await query(`
      SELECT 
        g.*,
        sub.name_ar AS subject_name_ar,
        sub.name_en AS subject_name_en,
        sub.code AS subject_code,
        term.name AS term_name
      FROM grades g
      JOIN subjects sub ON g.subject_id = sub.id
      JOIN academic_terms term ON g.academic_term_id = term.id
      WHERE g.student_id = ?
      ORDER BY term.term_number ASC, sub.name_ar ASC
    `, [id]);

    // 4. Attendance Records Summary
    const [attendanceSummary] = await query(`
      SELECT 
        COUNT(id) AS total_sessions,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN status LIKE 'ABSENT%' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) AS late_count
      FROM attendance
      WHERE student_id = ?
    `, [id]);

    // 5. Financial Statement (Tuition + Store)
    const tuitionPayments = await query(`
      SELECT p.*, ft.name_ar AS fee_name_ar
      FROM payments p
      JOIN fee_types ft ON p.fee_type_id = ft.id
      WHERE p.student_id = ?
      ORDER BY p.payment_date DESC
    `, [id]);

    const storePurchases = await query(`
      SELECT ps.*
      FROM product_sales ps
      WHERE ps.student_id = ?
      ORDER BY ps.created_at DESC
    `, [id]);

    // 6. Preschool Milestones (if preschool)
    const milestones = await query(`
      SELECT pm.*, term.name AS term_name
      FROM preschool_milestones pm
      JOIN academic_terms term ON pm.academic_term_id = term.id
      WHERE pm.student_id = ?
      ORDER BY term.term_number DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        student,
        assignedClasses,
        grades,
        attendance: attendanceSummary,
        financials: {
          tuitionPayments,
          storePurchases
        },
        milestones
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createStudent(req, res) {
  const {
    national_id,
    first_name_ar,
    last_name_ar,
    first_name_en,
    last_name_en,
    gender,
    birth_date,
    birth_place,
    blood_group,
    current_class_id,
    academic_track_id,
    parent_name,
    parent_phone,
    parent_email,
    parent_job,
    address,
    maladies,
    medical_notes,
    photo_url
  } = req.body;

  if (!first_name_ar || !last_name_ar || !birth_date || !parent_name || !parent_phone || !academic_track_id) {
    return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول الإلزامية للتلميذ / Required fields missing' });
  }

  try {
    const year = new Date().getFullYear();
    const [maxRow] = await query('SELECT COALESCE(MAX(id), 0) AS max_id FROM students');
    const nextNum = (maxRow.max_id + 1).toString().padStart(4, '0');
    const matricule = `STU-${year}-${nextNum}`;

    const result = await query(`
      INSERT INTO students (
        matricule, national_id, first_name_ar, last_name_ar, first_name_en, last_name_en,
        gender, birth_date, birth_place, blood_group, current_class_id, academic_track_id,
        enrollment_date, status, parent_name, parent_phone, parent_email, parent_job,
        address, maladies, medical_notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      matricule, national_id || null, first_name_ar, last_name_ar, first_name_en || null, last_name_en || null,
      gender || 'MALE', birth_date, birth_place || null, blood_group || null, current_class_id || null, academic_track_id,
      parent_name, parent_phone, parent_email || null, parent_job || null, address || null, maladies || null, medical_notes || null,
      photo_url || null
    ]);

    const newStudentId = result.insertId;

    // If assigned to class, create enrollment record
    if (current_class_id) {
      const [cls] = await query('SELECT academic_year_id FROM classes WHERE id = ?', [current_class_id]);
      if (cls) {
        await query(`
          INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status)
          VALUES (?, ?, ?, 'ACTIVE')
          ON DUPLICATE KEY UPDATE class_id = VALUES(class_id)
        `, [newStudentId, current_class_id, cls.academic_year_id]);
      }
    }

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'CREATE', 'students', newStudentId, { matricule, first_name_ar, last_name_ar }, req.ip);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل التلميذ بنجاح / Student enrolled successfully',
      data: { id: newStudentId, matricule }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateStudent(req, res) {
  const { id } = req.params;
  const fields = req.body;

  try {
    const updateCols = [];
    const updateVals = [];

    const allowed = [
      'national_id', 'first_name_ar', 'last_name_ar', 'first_name_en', 'last_name_en',
      'gender', 'birth_date', 'birth_place', 'blood_group', 'current_class_id',
      'academic_track_id', 'status', 'parent_name', 'parent_phone', 'parent_email',
      'parent_job', 'address', 'maladies', 'medical_notes', 'photo_url'
    ];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updateCols.push(`\`${key}\` = ?`);
        updateVals.push(fields[key]);
      }
    }

    if (updateCols.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد حقول للتعديل / No fields to update' });
    }

    updateVals.push(id);
    await query(`UPDATE students SET ${updateCols.join(', ')} WHERE id = ?`, updateVals);

    if (fields.current_class_id) {
      const [cls] = await query('SELECT academic_year_id FROM classes WHERE id = ?', [fields.current_class_id]);
      if (cls) {
        await query(`
          INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status)
          VALUES (?, ?, ?, 'ACTIVE')
          ON DUPLICATE KEY UPDATE class_id = VALUES(class_id)
        `, [id, fields.current_class_id, cls.academic_year_id]);
      }
    }

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'students', id, fields, req.ip);
    res.json({ success: true, message: 'تم تحديث بيانات التلميذ بنجاح / Student updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteStudent(req, res) {
  const { id } = req.params;
  try {
    await query('DELETE FROM students WHERE id = ?', [id]);
    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'DELETE', 'students', id, {}, req.ip);
    res.json({ success: true, message: 'تم حذف ملف التلميذ بنجاح / Student record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function exportStudentsExcel(req, res) {
  try {
    const students = await query(`
      SELECT 
        s.matricule AS 'رقم_التسجيل',
        s.first_name_ar AS 'الاسم_بالعربية',
        s.last_name_ar AS 'اللقب_بالعربية',
        s.gender AS 'الجنس',
        s.birth_date AS 'تاريخ_الميلاد',
        c.name AS 'القسم_الحالي',
        t.name_ar AS 'المسار_الدراسي',
        s.parent_name AS 'اسم_الولي',
        s.parent_phone AS 'هاتف_الولي',
        s.status AS 'الحالة_الأكاديمية'
      FROM students s
      LEFT JOIN classes c ON s.current_class_id = c.id
      JOIN academic_tracks t ON s.academic_track_id = t.id
      ORDER BY s.matricule ASC
    `);

    const excelBuffer = exportToExcel(students, 'Students');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students_directory.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function assignStudentToClass(req, res) {
  const { id } = req.params;
  const { class_id, roll_number, remarks } = req.body;

  if (!class_id) {
    return res.status(400).json({ success: false, message: 'يرجى تحديد الفوج / Class ID required' });
  }

  try {
    const [cls] = await query('SELECT academic_year_id, name FROM classes WHERE id = ?', [class_id]);
    if (!cls) {
      return res.status(404).json({ success: false, message: 'الفوج غير موجود / Class not found' });
    }

    await query(`
      INSERT INTO student_enrollments (student_id, class_id, academic_year_id, roll_number, remarks, enrollment_status)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
      ON DUPLICATE KEY UPDATE 
        enrollment_status = 'ACTIVE', 
        roll_number = COALESCE(VALUES(roll_number), roll_number),
        remarks = COALESCE(VALUES(remarks), remarks)
    `, [id, class_id, cls.academic_year_id, roll_number || null, remarks || null]);

    // Update students.current_class_id if empty
    await query(`UPDATE students SET current_class_id = COALESCE(current_class_id, ?) WHERE id = ?`, [class_id, id]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'students', id, { action: 'ASSIGN_CLASS', class_id, className: cls.name }, req.ip);

    res.json({ success: true, message: 'تم إلحاق التلميذ بهذا القسم بنجاح / Student assigned to class successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function removeStudentFromClass(req, res) {
  const { id, classId } = req.params;

  try {
    await query('DELETE FROM student_enrollments WHERE student_id = ? AND class_id = ?', [id, classId]);

    // If this was current_class_id, set to another assigned class or NULL
    const remaining = await query('SELECT class_id FROM student_enrollments WHERE student_id = ? LIMIT 1', [id]);
    const nextClassId = remaining.length > 0 ? remaining[0].class_id : null;
    await query('UPDATE students SET current_class_id = ? WHERE id = ? AND current_class_id = ?', [nextClassId, id, classId]);

    await logAudit(req.user?.id, req.deviceId, req.workstationName, 'UPDATE', 'students', id, { action: 'UNASSIGN_CLASS', classId }, req.ip);

    res.json({ success: true, message: 'تم إلغاء قيد التلميذ من هذا القسم بنجاح / Student removed from class' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
