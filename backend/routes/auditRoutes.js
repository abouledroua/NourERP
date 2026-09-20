import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), listAuditLogs);

export default router;
