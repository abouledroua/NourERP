import { Router } from 'express';
import { 
  listProducts, 
  createProduct, 
  updateProduct, 
  createPOSSale, 
  settleStoreDebt,
  listPOSSales,
  getPOSSaleDetails
} from '../controllers/posController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/products', authenticateToken, listProducts);
router.post('/products', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CASHIER'), createProduct);
router.put('/products/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CASHIER'), updateProduct);
router.get('/sales', authenticateToken, listPOSSales);
router.get('/sales/:id', authenticateToken, getPOSSaleDetails);
router.post('/sales', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CASHIER'), createPOSSale);
router.post('/settle-debt', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CASHIER'), settleStoreDebt);

export default router;

