// routes/portfolio.routes.js
const express = require('express');
const {
  createPortfolioCertificate,
  updatePortfolioCertificate,
  getPortfolioCertificate,
  getPortfolioCertificateByAddress,
  getPortfolioCertificateTxId,
  getAllCertificates,
  portfolioCertificateExists,
  getCertificateStats
} = require('../controllers/portfolioController');

const router = express.Router();

// ==========================================
// RUTAS ESPECÍFICAS PRIMERO (sin parámetros dinámicos)
// ==========================================

// Obtener todos los certificados
router.get('/all', getAllCertificates);

// Obtener certificado por address
router.get('/address/:userAddress', getPortfolioCertificateByAddress);

// ==========================================
// RUTAS CON PARÁMETROS DINÁMICOS AL FINAL
// ==========================================

// Crear certificado
router.post('/', createPortfolioCertificate);

// Actualizar certificado
router.put('/:userId', updatePortfolioCertificate);

// Verificar si existe (DEBE IR ANTES de /:userId para no confundir "exists" como userId)
router.get('/:userId/exists', portfolioCertificateExists);

// Obtener estadísticas
router.get('/:userId/stats', getCertificateStats);

// Obtener solo TxId
router.get('/:userId/txid', getPortfolioCertificateTxId);

// Obtener certificado por userId (ESTA VA AL FINAL)
router.get('/:userId', getPortfolioCertificate);

module.exports = router;