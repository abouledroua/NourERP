import { Router } from 'express';
import { 
  login, 
  getProfile, 
  listUsers, 
  createUser, 
  listDevices, 
  updateDeviceStatus,
  getDeviceIdentity,
  registerDevice
} from '../controllers/authController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/device-identity', getDeviceIdentity);
router.post('/register-device', registerDevice);
router.get('/profile', authenticateToken, getProfile);
router.get('/users', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), listUsers);
router.post('/users', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createUser);
router.get('/devices', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), listDevices);
router.put('/devices/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateDeviceStatus);

export default router;
