import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { logAudit, cleanIp, generateDeviceKey } from '../middlewares/deviceGuard.js';
import { checkAndInitializeDefaults } from '../services/startupCheck.js';

const JWT_SECRET = process.env.JWT_SECRET || 'alnour_secret_key_2026_secure_jwt_token_academic';

export async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور / Username and password are required' });
  }

  try {
    let users = await query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      // Check if users table is empty and re-seed admin if needed
      await checkAndInitializeDefaults();
      users = await query('SELECT * FROM users WHERE username = ?', [username]);
    }
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة / Invalid credentials' });
    }

    const user = users[0];
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'الحساب معطل حالياً من طرف الإدارة / Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة / Invalid credentials' });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const tokenPayload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Device identification logic
    const clientIp = cleanIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
    const rawDeviceKey = req.headers['x-device-fingerprint'] || req.body.deviceKey;
    let deviceKey = (rawDeviceKey || '').trim().toUpperCase();

    // Ensure device key format [A-Z0-9]{5,8}
    if (!/^[A-Z0-9]{5,8}$/.test(deviceKey)) {
      deviceKey = generateDeviceKey();
    }

    let devices = await query('SELECT * FROM devices WHERE device_fingerprint = ?', [deviceKey]);
    let deviceExists = devices.length > 0;
    let workstationName = deviceExists ? devices[0].workstation_name : null;

    if (deviceExists && devices[0]?.status === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        code: 'DEVICE_BLOCKED',
        message: 'محطة العمل هذه محظورة من قبل الإدارة / This workstation has been blocked by administrator'
      });
    }

    if (deviceExists) {
      await query('UPDATE devices SET last_seen = NOW(), ip_address = ? WHERE device_fingerprint = ?', [clientIp, deviceKey]);
    }

    // Log audit
    await logAudit(user.id, deviceExists ? devices[0]?.id : null, workstationName || 'Unregistered Workstation', 'LOGIN', 'users', user.id, { username }, clientIp);

    res.json({
      success: true,
      token,
      user: tokenPayload,
      deviceExists,
      deviceKey,
      workstationName
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الخادم / Server error: ' + err.message });
  }
}

export async function getDeviceIdentity(req, res) {
  try {
    const clientIp = cleanIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
    const requestedKey = (req.query.key || req.headers['x-device-fingerprint'] || '').trim().toUpperCase();

    // 1. If incoming key is valid and exists in DB
    if (/^[A-Z0-9]{5,8}$/.test(requestedKey)) {
      const devices = await query('SELECT * FROM devices WHERE device_fingerprint = ?', [requestedKey]);
      if (devices.length > 0) {
        return res.json({
          success: true,
          deviceKey: requestedKey,
          exists: true,
          workstationName: devices[0].workstation_name,
          status: devices[0].status
        });
      }
    }

    // 2. Cross-browser preservation: check if valid device exists for this machine IP
    const ipDevices = await query('SELECT * FROM devices WHERE ip_address = ? AND CHAR_LENGTH(device_fingerprint) BETWEEN 5 AND 8 ORDER BY last_seen DESC LIMIT 1', [clientIp]);
    if (ipDevices.length > 0) {
      return res.json({
        success: true,
        deviceKey: ipDevices[0].device_fingerprint,
        exists: true,
        workstationName: ipDevices[0].workstation_name,
        status: ipDevices[0].status
      });
    }

    // 3. Brand new device
    const finalKey = /^[A-Z0-9]{5,8}$/.test(requestedKey) ? requestedKey : generateDeviceKey();
    res.json({
      success: true,
      deviceKey: finalKey,
      exists: false,
      workstationName: null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function registerDevice(req, res) {
  const { deviceKey, workstationName } = req.body;
  const clientIp = cleanIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');

  const cleanKey = (deviceKey || '').trim().toUpperCase();
  const cleanName = (workstationName || '').trim();

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'اسم محطة العمل إجباري (حرفين على الأقل) / Workstation name is mandatory (at least 2 characters)'
    });
  }

  if (!/^[A-Z0-9]{5,8}$/.test(cleanKey)) {
    return res.status(400).json({
      success: false,
      message: 'رمز الجهاز غير صالح (يجب أن يتكون من 5 إلى 8 أحرف وأرقام كبيرة) / Invalid device key (must be 5-8 uppercase alphanumeric characters)'
    });
  }

  try {
    await query(
      `INSERT INTO devices (device_fingerprint, workstation_name, ip_address, status, last_seen)
       VALUES (?, ?, ?, 'APPROVED', NOW())
       ON DUPLICATE KEY UPDATE 
         workstation_name = VALUES(workstation_name),
         last_seen = NOW(),
         ip_address = VALUES(ip_address)`,
      [cleanKey, cleanName, clientIp]
    );

    const [device] = await query('SELECT * FROM devices WHERE device_fingerprint = ?', [cleanKey]);
    await logAudit(req.user?.id || null, device?.id || null, cleanName, 'CREATE', 'devices', cleanKey, { workstation_name: cleanName, deviceKey: cleanKey }, clientIp);

    res.json({
      success: true,
      message: 'تم تسجيل وتسمية محطة العمل بنجاح / Workstation registered successfully',
      device: {
        device_fingerprint: cleanKey,
        workstation_name: cleanName,
        status: device?.status || 'APPROVED'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getProfile(req, res) {
  try {
    const users = await query('SELECT id, username, full_name, email, phone, role, status, last_login, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود / User not found' });
    }
    res.json({ success: true, user: users[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function listUsers(req, res) {
  try {
    const users = await query('SELECT id, username, full_name, email, phone, role, status, last_login, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createUser(req, res) {
  const { username, password, full_name, email, phone, role } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'الحقول الأساسية مطلوبة / Required fields missing' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const result = await query(
      `INSERT INTO users (username, password_hash, full_name, email, phone, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [username, hash, full_name, email || null, phone || null, role || 'TEACHER']
    );

    await logAudit(req.user.id, req.deviceId, req.workstationName, 'CREATE', 'users', result.insertId, { username, role }, req.ip);
    res.status(201).json({ success: true, message: 'تم إنشاء المستخدم بنجاح / User created successfully', id: result.insertId });
  } catch (err) {
    res.status(400).json({ success: false, message: 'اسم المستخدم موجود مسبقاً أو حدث خطأ / Username already exists or error: ' + err.message });
  }
}

export async function listDevices(req, res) {
  try {
    const devices = await query('SELECT * FROM devices ORDER BY last_seen DESC');
    res.json({ success: true, data: devices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateDeviceStatus(req, res) {
  const { id } = req.params;
  const { status, workstation_name } = req.body;

  try {
    await query(
      `UPDATE devices SET status = ?, workstation_name = IFNULL(?, workstation_name), approved_by = ?, approved_at = NOW() WHERE id = ?`,
      [status, workstation_name, req.user.id, id]
    );
    await logAudit(req.user.id, req.deviceId, req.workstationName, 'UPDATE', 'devices', id, { status, workstation_name }, req.ip);
    res.json({ success: true, message: 'تم تحديث حالة محطة العمل بنجاح / Workstation status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
