const usfciService = require('../services/USFCIService');
const authService = require('../services/AuthService');

// Función helper para convertir BigInt a string
const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// ==================== ADMIN ====================

const initLedger = async (req, res, next) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key is required'
      });
    }

    const result = await usfciService.initLedger(privateKey);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

const pause = async (req, res, next) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key is required'
      });
    }

    const result = await usfciService.pause(privateKey);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

const unpause = async (req, res, next) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key is required'
      });
    }

    const result = await usfciService.unpause(privateKey);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

const getSystemConfig = async (req, res, next) => {
  try {
    const config = await usfciService.getSystemConfig();
    const serializedConfig = serializeBigInt(config);

    res.json({ success: true, data: serializedConfig });
  } catch (error) {
    next(error);
  }
};

// ==================== WALLET ====================

const registerWallet = async (req, res, next) => {
  try {
    const { privateKey, mspId, userId, accountType } = req.body;

    if (!privateKey || !mspId || !userId || !accountType) {
      return res.status(400).json({
        success: false,
        error: 'Private key, mspId, userId and accountType are required'
      });
    }

    const result = await usfciService.registerWallet(privateKey, mspId, userId, accountType);
    const serializedResult = serializeBigInt(result);

    res.status(201).json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

const getAccountDetails = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    const account = await usfciService.getAccountDetails(walletAddress);
    const serializedAccount = serializeBigInt(account);

    res.json({ success: true, data: serializedAccount });
  } catch (error) {
    next(error);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    const balance = await usfciService.getBalance(walletAddress);

    res.json({ success: true, data: { balance } });
  } catch (error) {
    next(error);
  }
};

// ==================== TOKENS ====================

const mintTokens = async (req, res, next) => {
  try {
    const { walletAddress, amount, reserveProof } = req.body;

    if (!walletAddress || !amount || !reserveProof) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress, amount and reserveProof are required'
      });
    }

    const privateKey = await authService.getUserPrivateKey(req.user.userId);

    const result = await usfciService.mintTokens(privateKey, walletAddress, amount, reserveProof);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

const burnTokens = async (req, res, next) => {
  try {
    const { walletAddress, amount, reason } = req.body;

    if (!walletAddress || !amount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress, amount and reason are required'
      });
    }

    const privateKey = await authService.getUserPrivateKey(req.user.userId);

    const result = await usfciService.burnTokens(privateKey, walletAddress, amount, reason);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

const transfer = async (req, res, next) => {
  try {
    const { recipient, amount } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({
        success: false,
        error: 'recipient and amount are required'
      });
    }

    const privateKey = await authService.getUserPrivateKey(req.user.userId);

    const result = await usfciService.transfer(privateKey, recipient, amount);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};


const updateComplianceStatus = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const { kycStatus, riskScore } = req.body;

    if (!kycStatus || !riskScore) {
      return res.status(400).json({
        success: false,
        error: 'kycStatus and riskScore are required'
      });
    }

    const privateKey = await authService.getUserPrivateKey(req.user.userId);

    const result = await usfciService.updateComplianceStatus(privateKey, walletAddress, kycStatus, riskScore);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

// ==================== HISTORIAL ====================

/**
 * Obtener todos los registros de minteo (solo admin/Sunwest)
 */
const getAllMintRecords = async (req, res, next) => {
  try {
    const records = await usfciService.getAllMintRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener historial de minteo de una wallet específica
 */
const getMintHistory = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const records = await usfciService.getMintHistory(walletAddress);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los registros de quemado (solo admin/Sunwest)
 */
const getAllBurnRecords = async (req, res, next) => {
  try {
    const records = await usfciService.getAllBurnRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener historial de quemado de una wallet específica
 */
const getBurnHistory = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const records = await usfciService.getBurnHistory(walletAddress);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los registros de transferencias (admin)
 */
const getAllTransferRecords = async (req, res, next) => {
  try {
    const records = await usfciService.getAllTransferRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener historial de transacciones de una wallet (enviadas y recibidas)
 */
const getTransactionHistory = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const records = await usfciService.getTransactionHistory(walletAddress);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener mis transacciones (del usuario autenticado)
 */
const getMyTransactions = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    const records = await usfciService.getTransactionHistory(user.address);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener historial completo de una wallet
 */
const getWalletCompleteHistory = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const history = await usfciService.getWalletCompleteHistory(walletAddress);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadísticas generales del sistema
 */
const getStatistics = async (req, res, next) => {
  try {
    const stats = await usfciService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initLedger,
  pause,
  unpause,
  getSystemConfig,
  registerWallet,
  getAccountDetails,
  getBalance,
  mintTokens,
  burnTokens,
  transfer,
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
  getStatistics
};