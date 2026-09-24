import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "alnour_secret_key_2026_secure_jwt_token_academic";

export function normalizePhone(rawPhone) {
  if (!rawPhone) return "";
  return String(rawPhone)
    .replace(/[\s\-\(\)\.]/g, "")
    .replace(/^(\+213|00213)/, "0");
}

export function normalizeNin(rawNin) {
  if (!rawNin) return "";
  return String(rawNin).replace(/\s+/g, "").replace(/[-_]/g, "");
}

export function generateParentPassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * chars.length);
    password += chars[index];
  }
  return password;
}

export async function lookupParentByNin(req, res) {
  const nin = normalizeNin(req.query?.nin || req.body?.nin || "");

  if (!nin) {
    return res.status(400).json({ success: false, message: "NIN is required" });
  }

  try {
    const [guardian] = await query(
      `SELECT id, student_id, relationship, name, nin, phone, email, job, is_primary
       FROM student_guardians
       WHERE nin = ?
       LIMIT 1`,
      [nin],
    );

    if (!guardian) {
      return res.json({ success: true, found: false, data: null });
    }

    return res.json({ success: true, found: true, data: guardian });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function parentLogin(req, res) {
  const nin = normalizeNin(req.body?.nin || "");
  const password = String(req.body?.password || "").trim();

  if (!nin) {
    return res.status(400).json({
      success: false,
      message: "يرجى إدخال رقم التعريف الوطني / NIN is required",
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "يرجى إدخال كلمة المرور / Password is required",
    });
  }

  try {
    const [guardian] = await query(
      `SELECT sg.*
       FROM student_guardians sg
       WHERE sg.nin = ?
       LIMIT 1`,
      [nin],
    );

    if (!guardian) {
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة / Invalid credentials",
      });
    }

    if (!guardian.password_hash) {
      return res.status(401).json({
        success: false,
        message:
          "لم يتم إعداد كلمة مرور لهذا الوصي بعد. يرجى مراجعة الإدارة / Password not configured for this parent. Please contact the school administration.",
      });
    }

    const isMatch = await bcrypt.compare(password, guardian.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة / Invalid credentials",
      });
    }

    const childRows = await query(
      `
      SELECT DISTINCT
        s.id,
        s.matricule,
        s.first_name_ar,
        s.last_name_ar,
        s.first_name_en,
        s.last_name_en,
        s.gender,
        s.birth_date,
        s.photo_url,
        s.status,
        s.academic_track_id,
        t.code AS track_code,
        t.name_ar AS track_name_ar,
        t.name_fr AS track_name_fr,
        c.id AS current_class_id,
        c.name AS class_name,
        c.grade_level,
        c.classroom
      FROM students s
      JOIN academic_tracks t ON s.academic_track_id = t.id
      LEFT JOIN classes c ON s.current_class_id = c.id
      LEFT JOIN student_guardians sg ON sg.student_id = s.id
      WHERE sg.nin = ?
      ORDER BY s.id ASC
    `,
      [nin],
    );

    const tokenPayload = {
      role: "PARENT",
      guardianId: guardian.id,
      nin,
      phone: guardian.phone,
      guardian_name: guardian.name,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      success: true,
      message: "مرحباً بك في فضاء أولياء التلاميذ / Welcome to Parent Portal",
      token,
      parent: {
        id: guardian.id,
        name: guardian.name,
        phone: guardian.phone,
        nin,
        childrenCount: childRows.length,
      },
      children: childRows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getParentChildren(req, res) {
  const guardianId = req.user?.guardianId;
  const nin = req.user?.nin;
  const phone = req.user?.phone;

  if (!guardianId && !nin && !phone) {
    return res
      .status(401)
      .json({ success: false, message: "غير مصرح / Unauthorized" });
  }

  try {
    const baseQuery = `
      SELECT DISTINCT
        s.id,
        s.matricule,
        s.first_name_ar,
        s.last_name_ar,
        s.first_name_en,
        s.last_name_en,
        s.gender,
        s.birth_date,
        s.blood_group,
        s.photo_url,
        s.status,
        s.academic_track_id,
        t.code AS track_code,
        t.name_ar AS track_name_ar,
        t.name_fr AS track_name_fr,
        c.id AS current_class_id,
        c.name AS class_name,
        c.grade_level,
        c.classroom
      FROM students s
      JOIN academic_tracks t ON s.academic_track_id = t.id
      LEFT JOIN classes c ON s.current_class_id = c.id
      LEFT JOIN student_guardians sg ON sg.student_id = s.id
      WHERE 1=1`;

    let sql = baseQuery;
    const params = [];

    if (guardianId) {
      sql += " AND sg.id = ?";
      params.push(guardianId);
    } else if (nin) {
      sql += " AND sg.nin = ?";
      params.push(nin);
    } else {
      const clean = normalizePhone(phone);
      sql += ` AND (
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(sg.phone, ''), ' ', ''), '-', ''), '+213', '0'), '00213', '0'), '.', '') = ?
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(s.phone, ''), ' ', ''), '-', ''), '+213', '0'), '00213', '0'), '.', '') = ?
      )`;
      params.push(clean, clean);
    }

    sql += " ORDER BY s.id ASC";
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getChildDetails(req, res) {
  const guardianId = req.user?.guardianId;
  const nin = req.user?.nin;
  const phone = req.user?.phone;
  const { studentId } = req.params;

  if (!guardianId && !nin && !phone) {
    return res
      .status(401)
      .json({ success: false, message: "غير مصرح / Unauthorized" });
  }

  try {
    let verifySql = `
      SELECT s.id
      FROM students s
      LEFT JOIN student_guardians sg ON sg.student_id = s.id
      WHERE s.id = ? AND (`;
    const params = [studentId];

    if (guardianId) {
      verifySql += " sg.id = ? )";
      params.push(guardianId);
    } else if (nin) {
      verifySql += " sg.nin = ? )";
      params.push(nin);
    } else {
      const clean = normalizePhone(phone);
      verifySql += `
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(sg.phone, ''), ' ', ''), '-', ''), '+213', '0'), '00213', '0'), '.', '') = ?
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(s.phone, ''), ' ', ''), '-', ''), '+213', '0'), '00213', '0'), '.', '') = ?
      )`;
      params.push(clean, clean);
    }

    const verifyRows = await query(verifySql, params);
    if (verifyRows.length === 0) {
      return res.status(403).json({
        success: false,
        message:
          "لا تملك صلاحية الوصول لبيانات هذا التلميذ / Unauthorized access for this student",
      });
    }

    const [student] = await query(
      `SELECT s.id, s.matricule, s.first_name_ar, s.last_name_ar, s.first_name_en, s.last_name_en, s.gender, s.birth_date, s.birth_place, s.blood_group, s.enrollment_date, s.status, s.photo_url, s.address, s.academic_track_id, t.name_ar AS track_name_ar, t.name_fr AS track_name_fr, t.code AS track_code, c.id AS class_id, c.name AS class_name, c.grade_level, c.classroom FROM students s JOIN academic_tracks t ON s.academic_track_id = t.id LEFT JOIN classes c ON s.current_class_id = c.id WHERE s.id = ?`,
      [studentId],
    );

    const enrolledClasses = await query(
      `SELECT c.id, c.name, c.grade_level, c.section, c.classroom, CONCAT(tea.first_name, ' ', tea.last_name) AS homeroom_teacher_name FROM student_enrollments se JOIN classes c ON se.class_id = c.id LEFT JOIN teachers tea ON c.homeroom_teacher_id = tea.id WHERE se.student_id = ?`,
      [studentId],
    );

    const classIds = enrolledClasses.map((c) => c.id);
    if (student.class_id && !classIds.includes(student.class_id))
      classIds.push(student.class_id);

    let timetable = [];
    if (classIds.length > 0) {
      const placeholders = classIds.map(() => "?").join(",");
      timetable = await query(
        `SELECT tt.id, tt.class_id, tt.day_of_week, tt.start_time, tt.end_time, tt.room, sub.name_ar AS subject_name_ar, sub.name_fr AS subject_name_fr, sub.color_code, CONCAT(tea.first_name, ' ', tea.last_name) AS teacher_name, c.name AS class_name FROM timetables tt JOIN subjects sub ON tt.subject_id = sub.id JOIN teachers tea ON tt.teacher_id = tea.id JOIN classes c ON tt.class_id = c.id WHERE tt.class_id IN (${placeholders}) ORDER BY tt.day_of_week ASC, tt.start_time ASC`,
        classIds,
      );
    }

    const tuitionPayments = await query(
      `SELECT p.id, p.receipt_number, p.amount_due, p.discount_type, p.discount_value, p.amount_paid, p.remaining_debt, p.payment_date, p.payment_method, p.status, p.covered_months, p.notes, ft.name_ar AS fee_type_name_ar, ft.name_fr AS fee_type_name_fr FROM payments p JOIN fee_types ft ON p.fee_type_id = ft.id WHERE p.student_id = ? ORDER BY p.payment_date DESC, p.id DESC`,
      [studentId],
    );

    const storePurchases = await query(
      `SELECT ps.id, ps.invoice_number, ps.total_amount, ps.discount_amount, ps.paid_amount, ps.remaining_debt, ps.payment_status, ps.notes, ps.created_at FROM product_sales ps WHERE ps.student_id = ? ORDER BY ps.created_at DESC`,
      [studentId],
    );

    const tuitionDebt = tuitionPayments.reduce(
      (acc, p) => acc + Number(p.remaining_debt || 0),
      0,
    );
    const storeDebt = storePurchases.reduce(
      (acc, s) => acc + Number(s.remaining_debt || 0),
      0,
    );
    const totalRemainingDebt = tuitionDebt + storeDebt;
    const totalTuitionPaid = tuitionPayments.reduce(
      (acc, p) => acc + Number(p.amount_paid || 0),
      0,
    );
    const totalStorePaid = storePurchases.reduce(
      (acc, s) => acc + Number(s.paid_amount || 0),
      0,
    );
    const totalPaidOverall = totalTuitionPaid + totalStorePaid;

    const attendanceStats = await query(
      `SELECT COUNT(*) AS total_recorded, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count, SUM(CASE WHEN status = 'ABSENT_JUSTIFIED' THEN 1 ELSE 0 END) AS absent_justified_count, SUM(CASE WHEN status = 'ABSENT_UNJUSTIFIED' THEN 1 ELSE 0 END) AS absent_unjustified_count, SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) AS late_count, COALESCE(SUM(minutes_late), 0) AS total_minutes_late FROM attendance WHERE student_id = ?`,
      [studentId],
    );

    const recentAttendance = await query(
      `SELECT a.id, a.date, a.status, a.arrival_time, a.minutes_late, a.reason, c.name AS class_name FROM attendance a JOIN classes c ON a.class_id = c.id WHERE a.student_id = ? ORDER BY a.date DESC LIMIT 30`,
      [studentId],
    );

    const grades = await query(
      `SELECT g.id, g.evaluation_type, g.score, g.max_score, g.coefficient, g.remarks, sub.name_ar AS subject_name_ar, sub.name_fr AS subject_name_fr, term.name AS term_name FROM grades g JOIN subjects sub ON g.subject_id = sub.id JOIN academic_terms term ON g.academic_term_id = term.id WHERE g.student_id = ? ORDER BY term.term_number ASC, g.created_at DESC`,
      [studentId],
    );

    const milestones = await query(
      `SELECT pm.*, term.name AS term_name FROM preschool_milestones pm JOIN academic_terms term ON pm.academic_term_id = term.id WHERE pm.student_id = ? ORDER BY term.term_number DESC`,
      [studentId],
    );

    res.json({
      success: true,
      data: {
        student,
        enrolledClasses,
        timetable,
        financials: {
          tuitionPayments,
          storePurchases,
          summary: {
            tuitionDebt,
            storeDebt,
            totalRemainingDebt,
            totalPaidOverall,
          },
        },
        attendance: {
          stats: attendanceStats[0] || {},
          recent: recentAttendance,
        },
        grades,
        milestones,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getParentAnnouncements(req, res) {
  const guardianId = req.user?.guardianId;
  const nin = req.user?.nin;
  const phone = req.user?.phone;

  if (!guardianId && !nin && !phone) {
    return res
      .status(401)
      .json({ success: false, message: "غير مصرح / Unauthorized" });
  }

  try {
    const params = [];
    let childrenSql = `SELECT s.id AS student_id, s.academic_track_id, s.current_class_id FROM students s LEFT JOIN student_guardians sg ON sg.student_id = s.id WHERE 1=1`;

    if (guardianId) {
      childrenSql += " AND sg.id = ?";
      params.push(guardianId);
    } else if (nin) {
      childrenSql += " AND sg.nin = ?";
      params.push(nin);
    } else {
      const clean = normalizePhone(phone);
      childrenSql += ` AND (
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(sg.phone, ''), ' ', ''), '-', ''), '+213', '0'), '00213', '0'), '.', '') = ?
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(s.phone, ''), ' ', ''), '-', ''), '+213', '0'), '00213', '0'), '.', '') = ?
      )`;
      params.push(clean, clean);
    }

    const childrenInfo = await query(childrenSql, params);
    if (childrenInfo.length === 0) return res.json({ success: true, data: [] });

    const studentIds = [
      ...new Set(childrenInfo.map((c) => c.student_id).filter(Boolean)),
    ];
    const trackIds = [
      ...new Set(childrenInfo.map((c) => c.academic_track_id).filter(Boolean)),
    ];
    let classIds = [
      ...new Set(childrenInfo.map((c) => c.current_class_id).filter(Boolean)),
    ];

    if (studentIds.length > 0) {
      const enrollClassRows = await query(
        `SELECT DISTINCT class_id FROM student_enrollments WHERE student_id IN (${studentIds.map(() => "?").join(",")})`,
        studentIds,
      );
      enrollClassRows.forEach((r) => {
        if (r.class_id && !classIds.includes(r.class_id))
          classIds.push(r.class_id);
      });
    }

    let sql = `SELECT a.id, a.title, a.content, a.priority, a.target_type, a.target_id, a.created_at, u.full_name AS author_name, CASE WHEN a.target_type = 'ALL' THEN 'جميع الأولياء والتلاميذ' WHEN a.target_type = 'TRACK' THEN (SELECT name_ar FROM academic_tracks WHERE id = a.target_id) WHEN a.target_type = 'CLASS' THEN (SELECT name FROM classes WHERE id = a.target_id) WHEN a.target_type = 'STUDENT' THEN (SELECT CONCAT(first_name_ar, ' ', last_name_ar) FROM students WHERE id = a.target_id) ELSE '' END AS target_label FROM announcements a LEFT JOIN users u ON a.author_id = u.id WHERE (a.expires_at IS NULL OR a.expires_at >= CURDATE()) AND (a.target_type = 'ALL'`;
    const announcementParams = [];

    if (trackIds.length > 0) {
      sql += ` OR (a.target_type = 'TRACK' AND a.target_id IN (${trackIds.map(() => "?").join(",")}))`;
      announcementParams.push(...trackIds);
    }

    if (classIds.length > 0) {
      sql += ` OR (a.target_type = 'CLASS' AND a.target_id IN (${classIds.map(() => "?").join(",")}))`;
      announcementParams.push(...classIds);
    }

    if (studentIds.length > 0) {
      sql += ` OR (a.target_type = 'STUDENT' AND a.target_id IN (${studentIds.map(() => "?").join(",")}))`;
      announcementParams.push(...studentIds);
    }

    sql += `) ORDER BY CASE a.priority WHEN 'URGENT' THEN 1 WHEN 'IMPORTANT' THEN 2 ELSE 3 END, a.created_at DESC`;
    const announcements = await query(sql, announcementParams);
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
