import { query } from '../config/db.js';
import { logAudit } from '../middlewares/deviceGuard.js';

export async function listRooms(req, res) {
  const { search, status, type } = req.query;

  try {
    let sql = `
      SELECT 
        r.*,
        (SELECT COUNT(*) FROM classes WHERE classroom = r.name) AS classes_count
      FROM rooms r
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (type) {
      sql += ' AND r.room_type = ?';
      params.push(type);
    }
    if (search) {
      sql += ' AND (r.name LIKE ? OR r.code LIKE ? OR r.building LIKE ? OR r.notes LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY r.name ASC';
    const rooms = await query(sql, params);
    res.json({ success: true, data: rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createRoom(req, res) {
  const { name, code, capacity, building, floor, room_type, status, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'اسم القاعة مطلوب / Nom de la salle requis' });
  }

  try {
    let roomCode = code;
    if (!roomCode || !roomCode.trim()) {
      const [maxRow] = await query('SELECT COALESCE(MAX(id), 0) AS max_id FROM rooms');
      roomCode = `S-${(maxRow.max_id + 1).toString().padStart(2, '0')}`;
    }

    const result = await query(`
      INSERT INTO rooms (name, code, capacity, building, floor, room_type, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      roomCode.trim(),
      capacity ? Number(capacity) : 30,
      building?.trim() || null,
      floor?.trim() || null,
      room_type || 'CLASSROOM',
      status || 'AVAILABLE',
      notes?.trim() || null
    ]);

    await logAudit(
      req.user?.id, 
      req.deviceId, 
      req.workstationName, 
      'CREATE', 
      'rooms', 
      result.insertId, 
      { name, code: roomCode, capacity }, 
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'تمت إضافة القاعة بنجاح / Salle ajoutée avec succès',
      id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateRoom(req, res) {
  const { id } = req.params;
  const { name, code, capacity, building, floor, room_type, status, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'اسم القاعة مطلوب / Nom de la salle requis' });
  }

  try {
    // Get existing room to see if name changed
    const existing = await query('SELECT name FROM rooms WHERE id = ?', [id]);
    const oldName = existing[0]?.name;

    await query(`
      UPDATE rooms 
      SET name = ?, code = ?, capacity = ?, building = ?, floor = ?, room_type = ?, status = ?, notes = ?
      WHERE id = ?
    `, [
      name.trim(),
      code?.trim() || null,
      capacity !== undefined ? Number(capacity) : 30,
      building?.trim() || null,
      floor?.trim() || null,
      room_type || 'CLASSROOM',
      status || 'AVAILABLE',
      notes?.trim() || null,
      id
    ]);

    // If room name changed, update classes classroom if it was using oldName
    if (oldName && oldName !== name.trim()) {
      await query('UPDATE classes SET classroom = ? WHERE classroom = ?', [name.trim(), oldName]);
    }

    await logAudit(
      req.user?.id,
      req.deviceId,
      req.workstationName,
      'UPDATE',
      'rooms',
      id,
      { name, code, capacity, status },
      req.ip
    );

    res.json({
      success: true,
      message: 'تم تحديث بيانات القاعة بنجاح / Salle mise à jour avec succès'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteRoom(req, res) {
  const { id } = req.params;

  try {
    const existing = await query('SELECT name FROM rooms WHERE id = ?', [id]);
    const roomName = existing[0]?.name;

    // Check if any class is currently using this room
    if (roomName) {
      const usingClasses = await query('SELECT id, name FROM classes WHERE classroom = ?', [roomName]);
      if (usingClasses.length > 0) {
        // Unlink or alert
        await query('UPDATE classes SET classroom = NULL WHERE classroom = ?', [roomName]);
      }
    }

    await query('DELETE FROM rooms WHERE id = ?', [id]);

    await logAudit(
      req.user?.id,
      req.deviceId,
      req.workstationName,
      'DELETE',
      'rooms',
      id,
      { name: roomName },
      req.ip
    );

    res.json({
      success: true,
      message: 'تم حذف القاعة بنجاح / Salle supprimée avec succès'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
