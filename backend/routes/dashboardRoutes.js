import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, getDashboardData);

export default router;
