import { Router } from 'express';
import { listRooms, createRoom, updateRoom, deleteRoom } from '../controllers/roomController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, listRooms);
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), createRoom);
router.put('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'), updateRoom);
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteRoom);

export default router;
