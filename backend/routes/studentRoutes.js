import { Router } from 'express';
import { 
  listStudents, 
  getStudentDossier, 
  createStudent, 
  updateStudent, 
  deleteStudent, 
  exportStudentsExcel,
  assignStudentToClass,
  removeStudentFromClass
} from '../controllers/studentController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, listStudents);
router.get('/export/excel', authenticateToken, exportStudentsExcel);
router.get('/:id', authenticateToken, getStudentDossier);
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'CASHIER'), createStudent);
router.put('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'CASHIER'), updateStudent);
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteStudent);

// Multi-class enrollment management
router.post('/:id/classes', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'CASHIER'), assignStudentToClass);
router.delete('/:id/classes/:classId', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), removeStudentFromClass);

export default router;
