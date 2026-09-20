import { Router } from 'express';
import { getClassGradeMatrix, saveGradesBatch, computeClassReportCards, getStudentReportCard } from '../controllers/gradeController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/matrix', authenticateToken, getClassGradeMatrix);
router.post('/batch', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'TEACHER'), saveGradesBatch);
router.post('/compute-cards', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), computeClassReportCards);
router.get('/report-card/:studentId/:termId', authenticateToken, getStudentReportCard);

export default router;
