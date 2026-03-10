// controllers/portfolioController.js
const portfolioService = require('../services/PortfolioService');

// ===== HELPER: serializar BigInt =====
const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// ===== HELPER: extraer Bearer token =====
const extractBearerToken = (req) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') return parts[1];
  return authHeader;
};

// ==========================================
// NUEVOS ENDPOINTS — GraphQL + Blockchain
// ==========================================

/**
 * GET /portfolio/me
 * Header: Authorization: Bearer <userToken>
 */
const getUserPortfolio = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authorization token is required' });
    }

    const result = await portfolioService.getPortfolio(token);

    res.json({
      success: true,
      userId: result.userId,
      totalLoans: result.totalLoans,
      data: serializeBigInt(result.loans),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /portfolio/certify
 * Header: Authorization: Bearer <userToken>
 * Body: { userId, wait? }
 *
 * El backend resuelve la walletAddress internamente desde UserRegistryService.
 * El frontend solo necesita mandar el userId.
 */
const certifyUserPortfolio = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authorization token is required' });
    }

    const { userId, wait } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // 1. Resolver portfolio actual del usuario (GraphQL + blockchain)
    const portfolioResult = await portfolioService.getPortfolio(token);
    if (!portfolioResult.loans.length) {
      return res.status(400).json({ success: false, error: 'No loans found to certify' });
    }

    // 2. Certificar en Portfolio.sol
    //    La walletAddress se resuelve internamente desde UserRegistryService
    const result = await portfolioService.certifyPortfolio(
      userId,
      portfolioResult.loans,
      { wait: wait !== false }
    );

    res.status(201).json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ENDPOINTS EXISTENTES — Portfolio.sol directo
// ==========================================

const createPortfolioCertificate = async (req, res, next) => {
  try {
    const { privateKey, userId, userAddress, loanIds, totalPrincipal } = req.body;

    if (!privateKey) return res.status(400).json({ success: false, error: 'Private key is required' });
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    if (!userAddress) return res.status(400).json({ success: false, error: 'userAddress is required' });
    if (!loanIds) return res.status(400).json({ success: false, error: 'loanIds is required' });
    if (!Array.isArray(loanIds)) return res.status(400).json({ success: false, error: 'loanIds must be an array' });
    if (loanIds.length === 0) return res.status(400).json({ success: false, error: 'loanIds array cannot be empty' });
    if (!totalPrincipal) return res.status(400).json({ success: false, error: 'totalPrincipal is required' });

    const result = await portfolioService.createPortfolioCertificate(privateKey, userId, userAddress, loanIds, totalPrincipal);
    res.status(201).json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    next(error);
  }
};

const updatePortfolioCertificate = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { privateKey, loanIds, totalPrincipal } = req.body;

    if (!privateKey) return res.status(400).json({ success: false, error: 'Private key is required' });
    if (!loanIds) return res.status(400).json({ success: false, error: 'loanIds is required' });
    if (!Array.isArray(loanIds)) return res.status(400).json({ success: false, error: 'loanIds must be an array' });
    if (loanIds.length === 0) return res.status(400).json({ success: false, error: 'loanIds array cannot be empty' });
    if (!totalPrincipal) return res.status(400).json({ success: false, error: 'totalPrincipal is required' });

    const result = await portfolioService.updatePortfolioCertificate(privateKey, userId, loanIds, totalPrincipal);
    res.json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    next(error);
  }
};

const getPortfolioCertificate = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const certificate = await portfolioService.getPortfolioCertificate(userId);
    res.json({ success: true, data: serializeBigInt(certificate) });
  } catch (error) {
    next(error);
  }
};

const getPortfolioCertificateByAddress = async (req, res, next) => {
  try {
    const { userAddress } = req.params;
    const certificate = await portfolioService.getPortfolioCertificateByAddress(userAddress);
    res.json({ success: true, data: serializeBigInt(certificate) });
  } catch (error) {
    next(error);
  }
};

const getPortfolioCertificateTxId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const txId = await portfolioService.getPortfolioCertificateTxId(userId);
    res.json({ success: true, data: { txId } });
  } catch (error) {
    next(error);
  }
};

const getAllCertificates = async (req, res, next) => {
  try {
    const certificates = await portfolioService.getAllCertificates();
    const serialized = serializeBigInt(certificates);
    res.json({ success: true, data: serialized, count: serialized.length });
  } catch (error) {
    next(error);
  }
};

const portfolioCertificateExists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const exists = await portfolioService.portfolioCertificateExists(userId);
    res.json({ success: true, data: { exists } });
  } catch (error) {
    next(error);
  }
};

const getCertificateStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const stats = await portfolioService.getCertificateStats(userId);
    res.json({ success: true, data: serializeBigInt(stats) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};