// routes/portfolio.routes.js
const express = require('express');
const {
  getUserPortfolio,
  certifyUserPortfolio,
  createPortfolioCertificate,
  updatePortfolioCertificate,
  getPortfolioCertificate,
  getPortfolioCertificateByAddress,
  getPortfolioCertificateTxId,
  getAllCertificates,
  portfolioCertificateExists,
  getCertificateStats,
} = require('../controllers/portfolioController');

const router = express.Router();


router.get('/me', getUserPortfolio);


router.post('/certify', certifyUserPortfolio);

// ==========================================
// RUTAS ESPECÍFICAS PRIMERO
// ==========================================

router.get('/all', getAllCertificates);
router.get('/address/:userAddress', getPortfolioCertificateByAddress);
router.post('/', createPortfolioCertificate);

// ==========================================
// RUTAS CON PARÁMETROS DINÁMICOS AL FINAL
// ==========================================

router.put('/:userId', updatePortfolioCertificate);
router.get('/:userId/exists', portfolioCertificateExists);
router.get('/:userId/stats', getCertificateStats);
router.get('/:userId/txid', getPortfolioCertificateTxId);
router.get('/:userId', getPortfolioCertificate);

module.exports = router;