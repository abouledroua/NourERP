import { query, executeTransaction } from '../config/db.js';

export async function getClassGradeMatrix(req, res) {
  const { classId, subjectId, termId } = req.query;

  if (!classId || !termId) {
    return res.status(400).json({ success: false, message: 'معرف القسم والفصل الدراسي مطلوبان / Class ID and Term ID required' });
  }

  try {
    // 1. Get enrolled students
    const students = await query(`
      SELECT s.id, s.matricule, s.first_name_ar, s.last_name_ar
      FROM students s
      WHERE s.current_class_id = ? AND s.status = 'ACTIVE'
      ORDER BY s.last_name_ar ASC, s.first_name_ar ASC
    `, [classId]);

    // 2. Get grades for specified subject (or all if subjectId not given)
    let gradeSql = `
      SELECT g.*, sub.name_ar AS subject_name_ar, sub.default_coefficient
      FROM grades g
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE g.class_id = ? AND g.academic_term_id = ?
    `;
    const gradeParams = [classId, termId];
    if (subjectId) {
      gradeSql += ' AND g.subject_id = ?';
      gradeParams.push(subjectId);
    }

    const existingGrades = await query(gradeSql, gradeParams);

    res.json({
      success: true,
      data: {
        students,
        grades: existingGrades
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function saveGradesBatch(req, res) {
  const { classId, subjectId, termId, grades } = req.body;

  if (!classId || !subjectId || !termId || !Array.isArray(grades)) {
    return res.status(400).json({ success: false, message: 'بيانات الدرجات غير صحيحة / Invalid grades submission data' });
  }

  try {
    await executeTransaction(async (conn) => {
      for (const g of grades) {
        if (g.studentId && g.score !== undefined && g.score !== null && g.score !== '') {
          // Check if grade exists for this student + subject + term + type
          const [existing] = await conn.query(`
            SELECT id FROM grades 
            WHERE student_id = ? AND class_id = ? AND subject_id = ? AND academic_term_id = ? AND evaluation_type = ?
          `, [g.studentId, classId, subjectId, termId, g.evaluationType || 'CONTINUOUS']);

          if (existing.length > 0) {
            await conn.query(`
              UPDATE grades 
              SET score = ?, max_score = ?, coefficient = ?, remarks = ?, recorded_by = ?
              WHERE id = ?
            `, [g.score, g.maxScore || 20.00, g.coefficient || 1.0, g.remarks || null, req.user?.id || null, existing[0].id]);
          } else {
            await conn.query(`
              INSERT INTO grades (student_id, class_id, subject_id, academic_term_id, evaluation_type, score, max_score, coefficient, remarks, recorded_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [g.studentId, classId, subjectId, termId, g.evaluationType || 'CONTINUOUS', g.score, g.maxScore || 20.00, g.coefficient || 1.0, g.remarks || null, req.user?.id || null]);
          }
        }
      }
    });

    res.json({ success: true, message: 'تم حفظ الدرجات وتحديث السجل بنجاح / Grades recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function computeClassReportCards(req, res) {
  const { classId, termId } = req.body;

  if (!classId || !termId) {
    return res.status(400).json({ success: false, message: 'القسم والفصل مطلوبان / Class and Term required' });
  }

  try {
    const students = await query(`SELECT id FROM students WHERE current_class_id = ? AND status = 'ACTIVE'`, [classId]);
    const computed = [];

    for (const st of students) {
      const studentGrades = await query(`
        SELECT g.score, g.max_score, IFNULL(g.coefficient, sub.default_coefficient) AS coefficient
        FROM grades g
        JOIN subjects sub ON g.subject_id = sub.id
        WHERE g.student_id = ? AND g.academic_term_id = ?
      `, [st.id, termId]);

      let totalPoints = 0;
      let totalCoeffs = 0;

      for (const gr of studentGrades) {
        const normalized = (gr.score / gr.max_score) * 20.0;
        const c = Number(gr.coefficient) || 1;
        totalPoints += (normalized * c);
        totalCoeffs += c;
      }

      const gpa = totalCoeffs > 0 ? (totalPoints / totalCoeffs) : 0;
      let appreciation = 'متوسط';
      if (gpa >= 16) appreciation = 'ممتاز - لوحة شرف';
      else if (gpa >= 14) appreciation = 'جيد جداً - تشجيع';
      else if (gpa >= 12) appreciation = 'جيد';
      else if (gpa >= 10) appreciation = 'مقبول';
      else appreciation = 'دون المتوسط - يحتاج مضاعفة الجهد';

      computed.push({
        studentId: st.id,
        gpa: parseFloat(gpa.toFixed(2)),
        appreciation
      });
    }

    // Sort by GPA descending to assign class rank
    computed.sort((a, b) => b.gpa - a.gpa);

    await executeTransaction(async (conn) => {
      let rank = 1;
      for (const item of computed) {
        await conn.query(`
          INSERT INTO report_cards (student_id, class_id, academic_term_id, overall_gpa, class_rank, total_students, appreciation, decision, issued_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', CURDATE())
          ON DUPLICATE KEY UPDATE 
            overall_gpa = VALUES(overall_gpa),
            class_rank = VALUES(class_rank),
            total_students = VALUES(total_students),
            appreciation = VALUES(appreciation),
            issued_date = CURDATE()
        `, [item.studentId, classId, termId, item.gpa, rank++, computed.length, item.appreciation]);
      }
    });

    res.json({
      success: true,
      message: `تم احتساب كشوف النقاط وتصنيف الرتب لـ ${computed.length} تلميذ بنجاح / Report cards computed successfully`,
      data: computed
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getStudentReportCard(req, res) {
  const { studentId, termId } = req.params;

  try {
    const [reportCard] = await query(`
      SELECT rc.*, term.name AS term_name, y.name AS academic_year_name, c.name AS class_name, c.grade_level
      FROM report_cards rc
      JOIN academic_terms term ON rc.academic_term_id = term.id
      JOIN academic_years y ON term.academic_year_id = y.id
      JOIN classes c ON rc.class_id = c.id
      WHERE rc.student_id = ? AND rc.academic_term_id = ?
    `, [studentId, termId]);

    const [student] = await query('SELECT * FROM students WHERE id = ?', [studentId]);
    const subjectsGrades = await query(`
      SELECT 
        sub.code AS subject_code,
        sub.name_ar AS subject_name_ar,
        sub.name_en AS subject_name_en,
        IFNULL(g.coefficient, sub.default_coefficient) AS coefficient,
        g.score,
        g.max_score,
        g.evaluation_type,
        g.remarks
      FROM subjects sub
      LEFT JOIN grades g ON g.subject_id = sub.id AND g.student_id = ? AND g.academic_term_id = ?
      WHERE sub.academic_track_id = ?
      ORDER BY sub.name_ar ASC
    `, [studentId, termId, student.academic_track_id]);

    res.json({
      success: true,
      data: {
        student,
        reportCard: reportCard || null,
        grades: subjectsGrades
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
