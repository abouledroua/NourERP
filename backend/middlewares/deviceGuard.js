import { query } from '../config/db.js';

export function cleanIp(rawIp) {
  if (!rawIp) return '127.0.0.1';
  let ip = String(rawIp);
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  return ip;
}

export function generateDeviceKey() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function deviceGuard(req, res, next) {
  const rawKey = req.headers['x-device-fingerprint'] || req.headers['x-workstation-id'];
  const clientIp = cleanIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
  const workstationName = req.headers['x-workstation-name'] || null;

  req.clientIp = clientIp;
  req.deviceId = null;
  req.workstationName = workstationName || 'Unregistered Workstation';
  req.isDeviceRegistered = false;

  if (rawKey) {
    const fingerprint = String(rawKey).trim().toUpperCase();
    try {
      const existing = await query('SELECT * FROM devices WHERE device_fingerprint = ?', [fingerprint]);
      if (existing.length > 0) {
        const device = existing[0];
        if (device.status === 'BLOCKED') {
          return res.status(403).json({
            success: false,
            code: 'DEVICE_BLOCKED',
            message: 'محطة العمل هذه محظورة من قبل الإدارة / This workstation has been blocked by administrator'
          });
        }
        await query('UPDATE devices SET last_seen = NOW(), ip_address = ? WHERE id = ?', [clientIp, device.id]);
        req.deviceId = device.id;
        req.workstationName = device.workstation_name;
        req.isDeviceRegistered = true;
      }
    } catch (err) {
      console.warn('[DeviceGuard] Warning checking device:', err.message);
    }
  }

  next();
}

export async function logAudit(userId, deviceId, workstationName, actionType, entityName, entityId, details, ipAddress) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, device_id, workstation_name, action_type, entity_name, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        deviceId || null,
        workstationName || 'Unknown',
        actionType,
        entityName,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        ipAddress || '127.0.0.1'
      ]
    );
  } catch (err) {
    console.error('[AUDIT-LOG] Failed to write audit log:', err.message);
  }
}
