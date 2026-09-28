import { Router } from 'express';
import { getSettings, updateSettings, toggleTrack, triggerBackup, getBackupsList, restoreBackup, createAcademicYear, createTrack, editTrack, deleteTrack } from '../controllers/settingsController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, getSettings);
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateSettings);
router.put('/tracks/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), toggleTrack);

router.post('/backup', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), triggerBackup);
router.get('/backups', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getBackupsList);
router.post('/restore', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), restoreBackup);
router.post('/years', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createAcademicYear);
router.post('/tracks', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createTrack);
router.put('/tracks/:id/edit', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), editTrack);
router.delete('/tracks/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteTrack);

export default router;
