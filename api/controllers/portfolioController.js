// controllers/portfolioController.js
const portfolioService = require('../services/PortfolioService');

// Función helper para convertir BigInt a string
const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

/**
 * Crear certificado de portafolio
 */
const createPortfolioCertificate = async (req, res, next) => {
  try {
    const { privateKey, userId, userAddress, loanIds, totalPrincipal } = req.body;
    
    // Validaciones
    if (!privateKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Private key is required' 
      });
    }
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }
    
    if (!userAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'userAddress is required' 
      });
    }
    
    if (!loanIds) {
      return res.status(400).json({ 
        success: false, 
        error: 'loanIds is required' 
      });
    }
    
    if (!Array.isArray(loanIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'loanIds must be an array' 
      });
    }
    
    if (loanIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'loanIds array cannot be empty' 
      });
    }
    
    if (!totalPrincipal) {
      return res.status(400).json({ 
        success: false, 
        error: 'totalPrincipal is required' 
      });
    }
    
    const result = await portfolioService.createPortfolioCertificate(
      privateKey,
      userId,
      userAddress,
      loanIds,
      totalPrincipal
    );
    
    const serializedResult = serializeBigInt(result);
    
    res.status(201).json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar certificado de portafolio
 */
const updatePortfolioCertificate = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { privateKey, loanIds, totalPrincipal } = req.body;
    
    // Validaciones
    if (!privateKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Private key is required' 
      });
    }
    
    if (!loanIds) {
      return res.status(400).json({ 
        success: false, 
        error: 'loanIds is required' 
      });
    }
    
    if (!Array.isArray(loanIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'loanIds must be an array' 
      });
    }
    
    if (loanIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'loanIds array cannot be empty' 
      });
    }
    
    if (!totalPrincipal) {
      return res.status(400).json({ 
        success: false, 
        error: 'totalPrincipal is required' 
      });
    }
    
    const result = await portfolioService.updatePortfolioCertificate(
      privateKey,
      userId,
      loanIds,
      totalPrincipal
    );
    
    const serializedResult = serializeBigInt(result);
    
    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener certificado por userId
 */
const getPortfolioCertificate = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const certificate = await portfolioService.getPortfolioCertificate(userId);
    const serializedCertificate = serializeBigInt(certificate);
    
    res.json({ success: true, data: serializedCertificate });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener certificado por address
 */
const getPortfolioCertificateByAddress = async (req, res, next) => {
  try {
    const { userAddress } = req.params;
    
    const certificate = await portfolioService.getPortfolioCertificateByAddress(userAddress);
    const serializedCertificate = serializeBigInt(certificate);
    
    res.json({ success: true, data: serializedCertificate });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener solo el TxId de un certificado
 */
const getPortfolioCertificateTxId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const txId = await portfolioService.getPortfolioCertificateTxId(userId);
    
    res.json({ success: true, data: { txId } });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los certificados
 */
const getAllCertificates = async (req, res, next) => {
  try {
    const certificates = await portfolioService.getAllCertificates();
    const serializedCertificates = serializeBigInt(certificates);
    
    res.json({ 
      success: true, 
      data: serializedCertificates,
      count: serializedCertificates.length 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verificar si existe un certificado
 */
const portfolioCertificateExists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const exists = await portfolioService.portfolioCertificateExists(userId);
    
    res.json({ success: true, data: { exists } });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadísticas de un certificado
 */
const getCertificateStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const stats = await portfolioService.getCertificateStats(userId);
    const serializedStats = serializeBigInt(stats);
    
    res.json({ success: true, data: serializedStats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPortfolioCertificate,
  updatePortfolioCertificate,
  getPortfolioCertificate,
  getPortfolioCertificateByAddress,
  getPortfolioCertificateTxId,
  getAllCertificates,
  portfolioCertificateExists,
  getCertificateStats
};