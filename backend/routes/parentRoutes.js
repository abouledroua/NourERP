import { Router } from 'express';
import { 
  parentLogin, 
  getParentChildren, 
  getChildDetails, 
  getParentAnnouncements 
} from '../controllers/parentController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// Public login for parents
router.post('/login', parentLogin);

// Protected routes for authenticated parent
router.get('/children', authenticateToken, getParentChildren);
router.get('/children/:studentId', authenticateToken, getChildDetails);
router.get('/announcements', authenticateToken, getParentAnnouncements);

export default router;
