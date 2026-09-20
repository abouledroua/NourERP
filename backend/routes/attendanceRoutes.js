import { Router } from 'express';
import { getClassAttendanceRoster, saveAttendanceBatch, toggleParentNotified } from '../controllers/attendanceController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/roster', authenticateToken, getClassAttendanceRoster);
router.post('/batch', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'TEACHER', 'SUPERVISOR'), saveAttendanceBatch);
router.put('/:id/notify-parent', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'SUPERVISOR'), toggleParentNotified);

export default router;
