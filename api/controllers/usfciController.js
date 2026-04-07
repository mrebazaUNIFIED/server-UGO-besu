const usfciService = require('../services/USFCIService');
const usfciAvalancheService = require('../services/USFCIAvalancheService');
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

const bridgeToAvalanche = async (req, res, next) => {
  try {
    const { targetAvalanche, amount } = req.body;

    if (!targetAvalanche || !amount) {
      return res.status(400).json({
        success: false,
        error: 'targetAvalanche and amount are required'
      });
    }

    const privateKey = await authService.getUserPrivateKey(req.user.userId);
    const result = await usfciService.bridgeToAvalanche(privateKey, targetAvalanche, amount);
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


// ==================== AVALANCHE ====================

/**
 * POST /api/usfci/avalanche/mint
 * Mintea USFCI directamente en Avalanche C-Chain.
 * Solo Sunwest (admin con MINTER_ROLE en el contrato Avalanche) puede usarlo.
 */
const mintAvalanche = async (req, res, next) => {
  try {
    const { recipient, amount, reserveProof } = req.body;

    if (!recipient || !amount || !reserveProof) {
      return res.status(400).json({
        success: false,
        error: 'recipient, amount y reserveProof son requeridos'
      });
    }

    // Recuperar la PK de quien está autenticado (debe ser Sunwest con MINTER_ROLE en Avalanche)
    const privateKey = await authService.getUserPrivateKey(req.user.userId);
    const result = await usfciAvalancheService.mintTokens(privateKey, recipient, amount, reserveProof);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usfci/avalanche/bridge-to-besu
 * El usuario quema tokens en Avalanche → el Relayer mintea en Besu automáticamente.
 */
const bridgeToBesuFromAvalanche = async (req, res, next) => {
  try {
    const { targetBesu, amount } = req.body;

    if (!targetBesu || !amount) {
      return res.status(400).json({
        success: false,
        error: 'targetBesu y amount son requeridos'
      });
    }

    const privateKey = await authService.getUserPrivateKey(req.user.userId);
    const result = await usfciAvalancheService.bridgeToBesu(privateKey, targetBesu, amount);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usfci/avalanche/transfer
 * Transferencia estándar de USFCI en Avalanche C-Chain.
 */
const transferAvalanche = async (req, res, next) => {
  try {
    const { recipient, amount } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({
        success: false,
        error: 'recipient y amount son requeridos'
      });
    }

    const privateKey = await authService.getUserPrivateKey(req.user.userId);
    const result = await usfciAvalancheService.transfer(privateKey, recipient, amount);
    const serializedResult = serializeBigInt(result);

    res.json({ success: true, data: serializedResult });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usfci/avalanche/balance/:walletAddress
 * Balance disponible de una wallet en Avalanche C-Chain.
 */
const getAvalancheBalance = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const balance = await usfciAvalancheService.getBalance(walletAddress);
    const available = await usfciAvalancheService.getAvailableBalance(walletAddress);
    res.json({
      success: true,
      data: { walletAddress, balance, availableBalance: available, network: 'avalanche-fuji' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usfci/avalanche/statistics
 * Estadísticas del token USFCI en Avalanche.
 */
const getAvalancheStatistics = async (req, res, next) => {
  try {
    const stats = await usfciAvalancheService.getStatistics();
    res.json({ success: true, data: { ...stats, network: 'avalanche-fuji' } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usfci/avalanche/history/mints
 */
const getAvalancheMintRecords = async (req, res, next) => {
  try {
    const records = await usfciAvalancheService.getAllMintRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usfci/avalanche/history/transfers
 */
const getAvalancheTransferRecords = async (req, res, next) => {
  try {
    const records = await usfciAvalancheService.getAllTransferRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usfci/avalanche/history/burns
 */
const getAvalancheBurnRecords = async (req, res, next) => {
  try {
    const records = await usfciAvalancheService.getAllBurnRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usfci/avalanche/wallet/:walletAddress/history
 */
const getAvalancheWalletHistory = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const history = await usfciAvalancheService.getWalletCompleteHistory(walletAddress);
    res.json({ success: true, data: history });
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
  bridgeToAvalanche,
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
  getStatistics,
  // Avalanche
  mintAvalanche,
  bridgeToBesuFromAvalanche,
  getAvalancheBalance,
  getAvalancheStatistics,
  getAvalancheMintRecords,
  getAvalancheTransferRecords,
  getAvalancheBurnRecords,
  getAvalancheWalletHistory,
  transferAvalanche
};