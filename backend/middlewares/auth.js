import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'alnour_secret_key_2026_secure_jwt_token_academic';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'مطلوب تسجيل الدخول للوصول / Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'جلسة العمل غير صالحة أو منتهية / Invalid or expired session' });
    }
    req.user = user;
    next();
  });
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتنفيذ هذا الإجراء / Unauthorized access for your role'
      });
    }
    next();
  };
}
