// routes/usfci.routes.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const {
  // Admin
  initLedger,
  pause,
  unpause,
  getSystemConfig,
  getStatistics,
  
  // Wallet
  registerWallet,
  getAccountDetails,
  getBalance,
  
  // Tokens
  mintTokens,
  burnTokens,
  transfer,
  
  // Compliance
  updateComplianceStatus,
  
  // Historial
  getAllMintRecords,
  getMintHistory,
  getAllBurnRecords,
  getBurnHistory,
  getAllTransferRecords,
  getTransactionHistory,
  getMyTransactions,
  getWalletCompleteHistory
} = require('../controllers/usfciController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ==========================================
// ADMIN - Solo admin
// ==========================================
router.post('/admin/init', authorize('admin'), initLedger);
router.post('/admin/pause', authorize('admin'), pause);
router.post('/admin/unpause', authorize('admin'), unpause);
router.get('/admin/config', getSystemConfig);
router.get('/admin/statistics', getStatistics);

// ==========================================
// TOKENS
// ==========================================
router.post('/tokens/mint', authorize('admin', 'operator'), mintTokens);
router.post('/tokens/burn', authorize('admin', 'operator'), burnTokens);
router.post('/tokens/transfer', transfer);

// ==========================================
// HISTORIAL - Rutas globales
// ==========================================
router.get('/history/mints', authorize('admin', 'operator'), getAllMintRecords);
router.get('/history/burns', authorize('admin', 'operator'), getAllBurnRecords);
router.get('/history/transfers', authorize('admin', 'operator'), getAllTransferRecords);

// ==========================================
// HISTORIAL - Mis transacciones
// ==========================================
router.get('/history/my-transactions', getMyTransactions);

// ==========================================
// WALLET - Rutas con parámetros
// ==========================================
router.post('/wallet/register', registerWallet);
router.get('/wallet/:walletAddress', getAccountDetails);
router.get('/wallet/:walletAddress/balance', getBalance);

// Historial específico de una wallet
router.get('/wallet/:walletAddress/history', getWalletCompleteHistory);
router.get('/wallet/:walletAddress/history/mints', getMintHistory);
router.get('/wallet/:walletAddress/history/burns', getBurnHistory);
router.get('/wallet/:walletAddress/history/transactions', getTransactionHistory);

// ==========================================
// COMPLIANCE
// ==========================================
router.put('/wallet/:walletAddress/compliance', 
  authorize('admin', 'operator'), 
  updateComplianceStatus
);

module.exports = router;