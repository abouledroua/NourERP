import { Router } from 'express';
import { listClasses, getClassById, getClassRoster, createClass, updateClass, deleteClass, batchRolloverStudents } from '../controllers/classController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, listClasses);
router.get('/:id', authenticateToken, getClassById);
router.get('/:id/roster', authenticateToken, getClassRoster);
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), createClass);
router.put('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), updateClass);
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteClass);
router.post('/rollover', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), batchRolloverStudents);

export default router;
