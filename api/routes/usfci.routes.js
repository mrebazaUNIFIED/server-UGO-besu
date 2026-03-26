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
  bridgeToAvalanche,

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
  getWalletCompleteHistory,

  // Avalanche
  mintAvalanche,
  bridgeToBesuFromAvalanche,
  getAvalancheBalance,
  getAvalancheStatistics,
  getAvalancheMintRecords
} = require('../controllers/usfciController');


const router = express.Router();


router.get('/wallet/:walletAddress/balance', getBalance);

//  rutas que requieren autenticación
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
router.post('/tokens/mint', authorize('admin'), mintTokens);
router.post('/tokens/burn', authorize('admin'), burnTokens);
router.post('/tokens/transfer', transfer);
router.post('/tokens/bridge-to-avalanche', bridgeToAvalanche);

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

// ==========================================
// AVALANCHE - Mint directo y Bridge
// ==========================================

// Solo Sunwest (admin con MINTER_ROLE en Avalanche) puede mintear capital nuevo
router.post('/avalanche/mint', authorize('admin'), mintAvalanche);

// Cualquier usuario autenticado puede iniciar bridge Avalanche → Besu
// (quema en Avalanche, el Relayer mintea en Besu automáticamente)
router.post('/avalanche/bridge-to-besu', bridgeToBesuFromAvalanche);

// Consultas públicas de Avalanche (no requieren auth)
router.get('/avalanche/balance/:walletAddress', getAvalancheBalance);
router.get('/avalanche/statistics', getAvalancheStatistics);
router.get('/avalanche/history/mints', authorize('admin', 'operator'), getAvalancheMintRecords);

module.exports = router;