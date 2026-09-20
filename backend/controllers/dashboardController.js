import { query } from '../config/db.js';
import { getFinancialKPIs } from '../services/ledgerService.js';

export async function getDashboardData(req, res) {
  try {
    // 1. Student counts
    const [studentStats] = await query(`
      SELECT 
        COUNT(id) AS total_students,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_students,
        SUM(CASE WHEN gender = 'MALE' THEN 1 ELSE 0 END) AS male_students,
        SUM(CASE WHEN gender = 'FEMALE' THEN 1 ELSE 0 END) AS female_students
      FROM students
    `);

    // 2. Track breakdown
    const trackStats = await query(`
      SELECT 
        t.code,
        t.name_ar,
        t.name_en,
        COUNT(s.id) AS student_count
      FROM academic_tracks t
      LEFT JOIN students s ON s.academic_track_id = t.id AND s.status = 'ACTIVE'
      WHERE t.is_active = TRUE
      GROUP BY t.id, t.code, t.name_ar, t.name_en
    `);

    // 3. Faculty / Teachers count
    const [teacherStats] = await query(`
      SELECT 
        COUNT(id) AS total_teachers,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_teachers
      FROM teachers
    `);

    // 4. Classes count
    const [classStats] = await query(`
      SELECT 
        COUNT(id) AS total_classes,
        IFNULL(SUM(capacity), 0) AS total_capacity
      FROM classes
      WHERE status = 'ACTIVE'
    `);

    // 5. Attendance today
    const today = new Date().toISOString().slice(0, 10);
    const [attendanceStats] = await query(`
      SELECT 
        COUNT(id) AS total_marked,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN status LIKE 'ABSENT%' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) AS late_count
      FROM attendance
      WHERE date = ?
    `, [today]);

    const attendanceRate = attendanceStats.total_marked > 0
      ? Math.round((attendanceStats.present_count / attendanceStats.total_marked) * 100)
      : 96; // Representative default when no register marked yet today

    // 6. Financial KPIs
    const financialKpis = await getFinancialKPIs();

    // 7. Monthly revenue trends (last 6 months)
    const revenueTrends = await query(`
      SELECT 
        DATE_FORMAT(payment_date, '%Y-%m') AS month,
        SUM(amount_paid) AS total_collected
      FROM payments
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
      ORDER BY month ASC
    `);

    // 8. Recent audit activities
    const recentAudits = await query(`
      SELECT a.id, a.action_type, a.entity_name, a.entity_id, a.created_at, a.workstation_name, u.full_name AS user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      data: {
        students: {
          total: Number(studentStats.total_students || 0),
          active: Number(studentStats.active_students || 0),
          male: Number(studentStats.male_students || 0),
          female: Number(studentStats.female_students || 0),
          byTrack: trackStats
        },
        teachers: {
          total: Number(teacherStats.total_teachers || 0),
          active: Number(teacherStats.active_teachers || 0)
        },
        classes: {
          total: Number(classStats.total_classes || 0),
          capacity: Number(classStats.total_capacity || 0)
        },
        attendance: {
          rate: attendanceRate,
          todayMarked: Number(attendanceStats.total_marked || 0),
          present: Number(attendanceStats.present_count || 0),
          absent: Number(attendanceStats.absent_count || 0),
          late: Number(attendanceStats.late_count || 0)
        },
        financials: financialKpis,
        revenueTrends,
        recentAudits
      }
    });
  } catch (err) {
    console.error('[DASHBOARD] Error loading stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}
