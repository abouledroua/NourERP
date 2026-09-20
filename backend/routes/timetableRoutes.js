import { Router } from 'express';
import { getTimetable, addTimetableSlot, deleteTimetableSlot } from '../controllers/timetableController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, getTimetable);
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), addTimetableSlot);
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), deleteTimetableSlot);

export default router;
