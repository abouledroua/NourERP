import { query, executeTransaction } from '../config/db.js';
import { logAudit } from '../middlewares/deviceGuard.js';
import { exportToExcel } from '../services/excelService.js';

export async function listStudents(req, res) {
  const { trackId, classId, status, search, debtStatus, limit = 100, offset = 0 } = req.query;

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
    if (debtStatus === 'DEBT' || debtStatus === 'HAS_DEBT') {
      sql += ` AND (
        IFNULL((SELECT SUM(remaining_debt) FROM payments WHERE student_id = s.id), 0) +
        IFNULL((SELECT SUM(remaining_debt) FROM product_sales WHERE student_id = s.id), 0)
      ) > 0`;
    } else if (debtStatus === 'CLEARED' || debtStatus === 'NO_DEBT') {
      sql += ` AND (
        IFNULL((SELECT SUM(remaining_debt) FROM payments WHERE student_id = s.id), 0) +
        IFNULL((SELECT SUM(remaining_debt) FROM product_sales WHERE student_id = s.id), 0)
      ) <= 0`;
    }
    if (search) {
      sql += ` AND (
        s.matricule LIKE ? 
        OR s.first_name_ar LIKE ? 
        OR s.last_name_ar LIKE ? 
        OR s.first_name_en LIKE ? 
        OR s.last_name_en LIKE ? 
        OR s.phone LIKE ?
        OR s.email LIKE ?
        OR s.parent_name LIKE ? 
        OR s.parent_phone LIKE ?
        OR EXISTS (
          SELECT 1 FROM student_guardians sg 
          WHERE sg.student_id = s.id 
          AND (sg.name LIKE ? OR sg.phone LIKE ?)
        )
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term, term, term, term, term);
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

    // 1.1 Guardians (Multiple Parents & Emergency Contacts)
    const guardiansRaw = await query(`
      SELECT id, student_id, relationship, name, phone, email, job, is_primary
      FROM student_guardians
      WHERE student_id = ?
      ORDER BY is_primary DESC, id ASC
    `, [id]);

    const guardians = guardiansRaw.length > 0 ? guardiansRaw : (student.parent_name ? [{
      id: 'legacy',
      student_id: student.id,
      relationship: 'FATHER',
      name: student.parent_name,
      phone: student.parent_phone,
      email: student.parent_email,
      job: student.parent_job,
      is_primary: 1
    }] : []);

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
        guardians,
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
  let {
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
    phone,
    email,
    parent_email,
    parent_job,
    parents,
    address,
    maladies,
    medical_notes,
    photo_url
  } = req.body;

  if (!first_name_ar || !last_name_ar || !birth_date || !academic_track_id) {
    return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول الإلزامية للتلميذ / Required fields missing' });
  }

  try {
    // Check for potential duplicate student (same name and birth date)
    const existing = await query(`
      SELECT id, matricule FROM students 
      WHERE first_name_ar = ? AND last_name_ar = ? AND birth_date = ?
    `, [first_name_ar.trim(), last_name_ar.trim(), birth_date]);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `يوجد تلميذ مسجل مسبقاً بنفس الاسم وتاريخ الميلاد (رقم القيد: ${existing[0].matricule})`
      });
    }

    const year = new Date().getFullYear();

    // If multiple parents are sent, synchronize the primary one to the main record
    if (Array.isArray(parents) && parents.length > 0) {
      const validParents = parents.filter(p => p && (p.name?.trim() || p.phone?.trim()));
      if (validParents.length > 0) {
        const primaryParent = validParents.find(p => p.is_primary) || validParents[0];
        parent_name = primaryParent.name?.trim() || parent_name || null;
        parent_phone = primaryParent.phone?.trim() || parent_phone || null;
        parent_email = primaryParent.email?.trim()?.toLowerCase() || parent_email || null;
        parent_job = primaryParent.job?.trim() || parent_job || null;
      }
    }
    
    // Get Track Code
    let trackShort = 'GEN';
    if (academic_track_id) {
      const [track] = await query('SELECT code FROM academic_tracks WHERE id = ?', [academic_track_id]);
      if (track) {
        const trackShortNames = {
          'PRE_SCHOOL': 'PRE',
          'K12_PRIMARY': 'PRI',
          'K12_MIDDLE': 'MID',
          'K12_HIGH': 'HIG',
          'ACADEMIC_TUTORING': 'TUT'
        };
        trackShort = trackShortNames[track.code] || track.code.substring(0, 3).toUpperCase();
      }
    }

    // Sequence specific to the group (Track)
    const [maxRow] = await query('SELECT COUNT(*) AS total FROM students WHERE academic_track_id = ?', [academic_track_id]);
    const nextNum = (maxRow.total + 1).toString().padStart(4, '0');
    
    const matricule = `${trackShort}-${year}-${nextNum}`;

    const result = await query(`
      INSERT INTO students (
        matricule, national_id, first_name_ar, last_name_ar, first_name_en, last_name_en,
        gender, birth_date, birth_place, blood_group, current_class_id, academic_track_id,
        enrollment_date, status, parent_name, parent_phone, phone, email, parent_email, parent_job,
        address, maladies, medical_notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      matricule, 
      national_id || null, 
      first_name_ar, 
      last_name_ar, 
      first_name_en ? first_name_en.trim().toUpperCase() : null, 
      last_name_en ? last_name_en.trim().toUpperCase() : null,
      gender || 'MALE', birth_date, birth_place || null, blood_group || null, current_class_id || null, academic_track_id,
      parent_name || null, parent_phone || null, phone || null, email ? email.trim().toLowerCase() : null, parent_email || null, parent_job || null, address || null, maladies || null, medical_notes || null,
      photo_url || null
    ]);

    const newStudentId = result.insertId;

    // Save multiple guardians in student_guardians
    if (Array.isArray(parents) && parents.length > 0) {
      const validParents = parents.filter(p => p && (p.name?.trim() || p.phone?.trim()));
      for (const p of validParents) {
        await query(`
          INSERT INTO student_guardians (student_id, relationship, name, phone, email, job, is_primary)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          newStudentId,
          p.relationship || 'FATHER',
          p.name?.trim() || 'ولي أمر',
          p.phone?.trim() || null,
          p.email?.trim()?.toLowerCase() || null,
          p.job?.trim() || null,
          p.is_primary ? 1 : 0
        ]);
      }
    } else if (parent_name?.trim() || parent_phone?.trim()) {
      await query(`
        INSERT INTO student_guardians (student_id, relationship, name, phone, email, job, is_primary)
        VALUES (?, 'FATHER', ?, ?, ?, ?, 1)
      `, [
        newStudentId,
        parent_name?.trim() || 'ولي أمر',
        parent_phone?.trim() || null,
        parent_email?.trim()?.toLowerCase() || null,
        parent_job?.trim() || null
      ]);
    }

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
    // Handle multiple guardians update
    if (fields.parents !== undefined && Array.isArray(fields.parents)) {
      const validParents = fields.parents.filter(p => p && (p.name?.trim() || p.phone?.trim()));
      await query('DELETE FROM student_guardians WHERE student_id = ?', [id]);
      
      if (validParents.length > 0) {
        const primaryParent = validParents.find(p => p.is_primary) || validParents[0];
        fields.parent_name = primaryParent.name?.trim() || null;
        fields.parent_phone = primaryParent.phone?.trim() || null;
        fields.parent_email = primaryParent.email?.trim()?.toLowerCase() || null;
        fields.parent_job = primaryParent.job?.trim() || null;

        for (const p of validParents) {
          await query(`
            INSERT INTO student_guardians (student_id, relationship, name, phone, email, job, is_primary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            p.relationship || 'FATHER',
            p.name?.trim() || 'ولي أمر',
            p.phone?.trim() || null,
            p.email?.trim()?.toLowerCase() || null,
            p.job?.trim() || null,
            p.is_primary ? 1 : 0
          ]);
        }
      } else {
        fields.parent_name = null;
        fields.parent_phone = null;
        fields.parent_email = null;
        fields.parent_job = null;
      }
    }

    const updateCols = [];
    const updateVals = [];

    const allowed = [
      'national_id', 'first_name_ar', 'last_name_ar', 'first_name_en', 'last_name_en',
      'gender', 'birth_date', 'birth_place', 'blood_group', 'current_class_id',
      'academic_track_id', 'status', 'parent_name', 'parent_phone', 'phone', 'email', 'parent_email',
      'parent_job', 'address', 'maladies', 'medical_notes', 'photo_url'
    ];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        let val = fields[key];
        if ((key === 'first_name_en' || key === 'last_name_en') && typeof val === 'string') {
          val = val.trim().toUpperCase();
        } else if (key === 'email' && typeof val === 'string') {
          val = val.trim() ? val.trim().toLowerCase() : null;
        }
        updateCols.push(`\`${key}\` = ?`);
        updateVals.push(val);
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
        s.phone AS 'هاتف_التلميذ',
        s.email AS 'بريد_التلميذ',
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
