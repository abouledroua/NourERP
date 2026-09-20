import { Router } from 'express';
import { listTeachers, createTeacher, updateTeacher, deleteTeacher, listSubstitutions, createSubstitution, listSubjects } from '../controllers/teacherController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, listTeachers);
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), createTeacher);
router.put('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), updateTeacher);
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteTeacher);

router.get('/substitutions', authenticateToken, listSubstitutions);
router.post('/substitutions', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), createSubstitution);
router.get('/subjects', authenticateToken, listSubjects);

export default router;
