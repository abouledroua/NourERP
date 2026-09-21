import { Router } from 'express';
import { getLedgerFeed, getKPIs, createTuitionPayment, getSingleReceipt, voidTransaction, listFeeTypes, listCashTransactions, createCashTransaction, listAccounts, createAccount, updateAccount, deleteAccount, transferFunds } from '../controllers/financeController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

router.get('/ledger', authenticateToken, getLedgerFeed);
router.get('/kpis', authenticateToken, getKPIs);
router.get('/fee-types', authenticateToken, listFeeTypes);
router.get('/receipt/:id', authenticateToken, getSingleReceipt);
router.post('/payments', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CASHIER'), createTuitionPayment);
router.delete('/void/:category/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), voidTransaction);

router.get('/cash-transactions', authenticateToken, listCashTransactions);
router.post('/cash-transactions', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CASHIER'), createCashTransaction);

router.get('/accounts', authenticateToken, listAccounts);
router.post('/accounts', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createAccount);
router.put('/accounts/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateAccount);
router.delete('/accounts/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteAccount);
router.post('/accounts/transfer', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), transferFunds);

export default router;
