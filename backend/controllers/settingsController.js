import fs from "fs";
import path from "path";
import { query } from "../config/db.js";
import { logAudit } from "../middlewares/deviceGuard.js";
import {
  createDatabaseBackup,
  listBackups,
  restoreDatabaseBackup,
} from "../services/backupService.js";
import { checkAndInitializeDefaults } from "../services/startupCheck.js";

export async function getSettings(req, res) {
  try {
    let rows = await query(
      "SELECT key_name, key_value, description FROM school_settings",
    );
    const requiredKeys = [
      "school_name_ar",
      "school_name_en",
      "school_name_fr",
      "school_address",
      "school_phone",
      "school_email",
      "currency",
      "tax_number",
      "print_receipt_footer",
    ];
    const existingKeys = new Set(rows.map((row) => row.key_name));
    if (
      rows.length === 0 ||
      requiredKeys.some((key) => !existingKeys.has(key))
    ) {
      await checkAndInitializeDefaults();
      rows = await query(
        "SELECT key_name, key_value, description FROM school_settings",
      );
    }
    const settingsMap = {};
    rows.forEach((r) => {
      settingsMap[r.key_name] = r.key_value;
    });

    const tracks = await query("SELECT * FROM academic_tracks ORDER BY id ASC");
    const years = await query(`
      SELECT y.*, (SELECT COUNT(id) FROM classes WHERE academic_year_id = y.id) AS classes_count
      FROM academic_years y 
      ORDER BY y.start_date DESC
    `);
    const terms = await query(
      "SELECT * FROM academic_terms ORDER BY term_number ASC",
    );

    res.json({
      success: true,
      data: {
        settings: settingsMap,
        tracks,
        years,
        terms,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSettings(req, res) {
  const { settings } = req.body;

  if (!settings || typeof settings !== "object") {
    return res
      .status(400)
      .json({
        success: false,
        message: "بيانات الإعدادات غير صالحة / Invalid settings object",
      });
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO school_settings (key_name, key_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [key, String(value)],
      );
    }

    await logAudit(
      req.user?.id,
      req.deviceId,
      req.workstationName,
      "UPDATE",
      "settings",
      null,
      settings,
      req.ip,
    );
    res.json({
      success: true,
      message: "تم حفظ إعدادات المؤسسة بنجاح / Settings saved successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleTrack(req, res) {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    await query("UPDATE academic_tracks SET is_active = ? WHERE id = ?", [
      is_active ? 1 : 0,
      id,
    ]);
    await logAudit(
      req.user?.id,
      req.deviceId,
      req.workstationName,
      "UPDATE",
      "academic_tracks",
      id,
      { is_active },
      req.ip,
    );
    res.json({
      success: true,
      message: "تم تحديث حالة المسار الدراسي بنجاح / Track status updated",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function triggerBackup(req, res) {
  try {
    const backup = await createDatabaseBackup();
    await logAudit(
      req.user?.id,
      req.deviceId,
      req.workstationName,
      "BACKUP",
      "database",
      null,
      { filename: backup.filename },
      req.ip,
    );
    res.json({
      success: true,
      message:
        "تم إنشاء النسخة الاحتياطية لقاعدة البيانات بنجاح / Backup created successfully",
      data: backup,
    });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطأ في إنشاء النسخة الاحتياطية: " + err.message,
      });
  }
}

export async function getBackupsList(req, res) {
  try {
    const backups = await listBackups();
    res.json({ success: true, data: backups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function restoreBackup(req, res) {
  const { sqlContent } = req.body;
  if (!sqlContent) {
    return res
      .status(400)
      .json({
        success: false,
        message: "محتوى ملف النسخة الاحتياطية مطلوب / SQL content required",
      });
  }

  try {
    const result = await restoreDatabaseBackup(sqlContent);
    await logAudit(
      req.user?.id,
      req.deviceId,
      req.workstationName,
      "UPDATE",
      "database_restore",
      null,
      { statements: result.statementsExecuted },
      req.ip,
    );
    res.json({
      success: true,
      message: `تمت استعادة قاعدة البيانات بنجاح (${result.statementsExecuted} أمر تنفيذي) / Database restored successfully`,
    });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطأ أثناء استعادة البيانات: " + err.message,
      });
  }
}
export async function createAcademicYear(req, res) {
  const { name, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  try {
    const existing = await query('SELECT id FROM academic_years WHERE is_current = 1');
    const is_current = existing.length === 0 ? 1 : 0;
    const status = is_current ? 'ACTIVE' : 'PLANNED';
    const result = await query(
      'INSERT INTO academic_years (name, start_date, end_date, is_current, status) VALUES (?, ?, ?, ?, ?)',
      [name, start_date, end_date, is_current, status]
    );
    await query(
      `INSERT INTO academic_terms (academic_year_id, name, term_number, start_date, end_date, is_current) VALUES (?, 'الفصل الدراسي الأول / Trimestre 1', 1, ?, ?, TRUE), (?, 'الفصل الدراسي الثاني / Trimestre 2', 2, ?, ?, FALSE), (?, 'الفصل الدراسي الثالث / Trimestre 3', 3, ?, ?, FALSE)`,
      [result.insertId, start_date, end_date, result.insertId, start_date, end_date, result.insertId, start_date, end_date]
    );
    res.json({ success: true, message: 'Academic year created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

