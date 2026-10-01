import { query } from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateParentPassword } from "./parentController.js";

// Fetch all guardians along with the number of students linked
export async function getAllGuardians(req, res) {
  try {
    const guardians = await query(`
      SELECT 
        g.id, g.name, g.nin, g.phone, g.email, g.job,
        g.created_at,
        COUNT(sgm.student_id) as linked_students_count,
        GROUP_CONCAT(CONCAT(s.first_name_ar, ' ', s.last_name_ar) SEPARATOR ', ') as children_names
      FROM guardians g
      LEFT JOIN student_guardian_mapping sgm ON g.id = sgm.guardian_id
      LEFT JOIN students s ON sgm.student_id = s.id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);
    res.json({ success: true, data: guardians });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Create a new guardian manually
export async function createGuardian(req, res) {
  const { name, nin, phone, email, job } = req.body;
  try {
    const [existing] = await query("SELECT id FROM guardians WHERE nin = ?", [nin]);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: {
          en: "A guardian with this NIN already exists",
          fr: "Un tuteur avec ce NIN existe déjà",
          ar: "يوجد ولي بهذا الرقم التعريفي مسبقاً"
        }
      });
    }

    const rawPassword = generateParentPassword(6);
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const result = await query(
      "INSERT INTO guardians (name, nin, phone, email, job, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
      [name, nin, phone, email, job, passwordHash]
    );

    res.json({
      success: true,
      message: {
        en: "Guardian created successfully",
        fr: "Tuteur créé avec succès",
        ar: "تم إضافة الولي بنجاح"
      },
      guardian: { id: result.insertId, name, nin, phone, email, job },
      password: rawPassword
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Update guardian details (excluding password)
export async function updateGuardian(req, res) {
  const { id } = req.params;
  const { name, phone, email, job } = req.body;
  try {
    await query(
      "UPDATE guardians SET name = ?, phone = ?, email = ?, job = ? WHERE id = ?",
      [name, phone, email, job, id]
    );
    res.json({
      success: true,
      message: {
        en: "Guardian details updated successfully",
        fr: "Détails du tuteur mis à jour avec succès",
        ar: "تم تحديث بيانات الولي بنجاح"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Delete guardian (only if not linked to any student)
export async function deleteGuardian(req, res) {
  const { id } = req.params;
  try {
    const [links] = await query("SELECT COUNT(*) as count FROM student_guardian_mapping WHERE guardian_id = ?", [id]);
    if (links.count > 0) {
      return res.status(400).json({
        success: false,
        message: {
          en: "Cannot delete a guardian linked to students. Please remove the student links first.",
          fr: "Impossible de supprimer un tuteur lié à des élèves. Veuillez d'abord supprimer les liens.",
          ar: "لا يمكن حذف ولي مرتبط بتلاميذ. الرجاء حذف ارتباطه بالتلاميذ أولاً."
        }
      });
    }

    await query("DELETE FROM guardians WHERE id = ?", [id]);
    res.json({
      success: true,
      message: {
        en: "Guardian deleted successfully",
        fr: "Tuteur supprimé avec succès",
        ar: "تم حذف الولي بنجاح"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Reset password for a guardian
export async function resetGuardianPassword(req, res) {
  const { id } = req.params;
  try {
    const newPassword = generateParentPassword(6);
    const newHash = await bcrypt.hash(newPassword, 10);

    await query("UPDATE guardians SET password_hash = ? WHERE id = ?", [newHash, id]);

    res.json({
      success: true,
      message: {
        en: "Password reset successfully",
        fr: "Mot de passe réinitialisé avec succès",
        ar: "تم إعادة تعيين كلمة المرور بنجاح"
      },
      password: newPassword
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get children of a specific guardian
export async function getGuardianChildren(req, res) {
  const { id } = req.params;
  try {
    const children = await query(`
      SELECT 
        s.id, s.first_name_ar, s.last_name_ar, s.first_name_en, s.last_name_en, 
        s.matricule, s.photo_url, s.status, s.gender,
        t.name_ar as track_name,
        c.name as class_name
      FROM students s
      JOIN student_guardian_mapping sgm ON s.id = sgm.student_id
      LEFT JOIN academic_tracks t ON s.academic_track_id = t.id
      LEFT JOIN classes c ON s.current_class_id = c.id
      WHERE sgm.guardian_id = ?
    `, [id]);
    res.json({ success: true, data: children });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
