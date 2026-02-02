// ShareController.js (COMPLETE FIX - with userIds conversion)
const shareLoansService = require('../services/ShareLoansService');
const walletService = require('../services/WalletService');

// Función helper para convertir BigInt a string
const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

const createShareAsset = async (req, res, next) => {
  try {
    const { 
      userId,           // userId del owner
      key, 
      accounts, 
      name, 
      sharedWithAddresses // Array de wallet addresses con quienes compartir
    } = req.body;
    
    console.log('📋 Received request to create share asset:');
    console.log('  - userId:', userId);
    console.log('  - key:', key);
    console.log('  - accounts:', accounts);
    console.log('  - name:', name);
    console.log('  - sharedWithAddresses:', sharedWithAddresses);
    
    // Validaciones básicas
    if (!userId || !key || !accounts || !sharedWithAddresses) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, key, accounts and sharedWithAddresses are required' 
      });
    }
    
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ 
        success: false, 
        error: 'accounts must be an array' 
      });
    }
    
    if (!Array.isArray(sharedWithAddresses)) {
      return res.status(400).json({ 
        success: false, 
        error: 'sharedWithAddresses must be an array' 
      });
    }
    
    if (sharedWithAddresses.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'sharedWithAddresses cannot be empty' 
      });
    }
    
    // Verificar que el userId existe
    if (!walletService.userExists(userId)) {
      return res.status(404).json({ 
        success: false, 
        error: `User ${userId} not found` 
      });
    }
    
    // Obtener la privateKey del owner
    const privateKey = walletService.getPrivateKeyByUserId(userId);
    
    // ✅ CONVERTIR ADDRESSES A USERIDS
    let sharedWithUserIds;
    try {
      sharedWithUserIds = walletService.convertAddressesToUserIds(sharedWithAddresses);
      console.log('✅ Converted addresses to userIds:', sharedWithUserIds);
    } catch (error) {
      console.error('❌ Error converting addresses to userIds:', error.message);
      return res.status(400).json({ 
        success: false, 
        error: `Error converting addresses to userIds: ${error.message}` 
      });
    }
    
    // Verificar que la conversión fue exitosa
    if (sharedWithUserIds.length !== sharedWithAddresses.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Some wallet addresses could not be converted to userIds' 
      });
    }
    
    console.log('✅ User validated, creating share asset on blockchain...');
    
    // Crear el share con AMBOS arrays: addresses Y userIds
    const result = await shareLoansService.createShareAsset(
      privateKey,
      key,
      userId,              // ownerUserId
      accounts,
      name || '',
      sharedWithAddresses, // Array de addresses
      sharedWithUserIds    // Array de userIds correspondientes
    );
    
    const serializedResult = serializeBigInt(result);
    
    console.log('✅ Share asset created successfully:', serializedResult);
    
    res.status(201).json({ success: true, data: serializedResult });
  } catch (error) {
    console.error('❌ Error in createShareAsset controller:', error);
    next(error);
  }
};

const updateShareAssetAccounts = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { userId, sharedWithAddresses } = req.body;
    
    console.log('📋 Updating share asset accounts:');
    console.log('  - key:', key);
    console.log('  - userId:', userId);
    console.log('  - sharedWithAddresses:', sharedWithAddresses);
    
    if (!userId || !sharedWithAddresses) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and sharedWithAddresses are required' 
      });
    }
    
    if (!Array.isArray(sharedWithAddresses)) {
      return res.status(400).json({ 
        success: false, 
        error: 'sharedWithAddresses must be an array' 
      });
    }
    
    if (sharedWithAddresses.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'sharedWithAddresses cannot be empty' 
      });
    }
    
    // Verificar que el userId existe
    if (!walletService.userExists(userId)) {
      return res.status(404).json({ 
        success: false, 
        error: `User ${userId} not found` 
      });
    }
    
    // Obtener la privateKey del owner
    const privateKey = walletService.getPrivateKeyByUserId(userId);
    
    // ✅ CONVERTIR ADDRESSES A USERIDS
    let sharedWithUserIds;
    try {
      sharedWithUserIds = walletService.convertAddressesToUserIds(sharedWithAddresses);
      console.log('✅ Converted addresses to userIds:', sharedWithUserIds);
    } catch (error) {
      console.error('❌ Error converting addresses to userIds:', error.message);
      return res.status(400).json({ 
        success: false, 
        error: `Error converting addresses to userIds: ${error.message}` 
      });
    }
    
    const result = await shareLoansService.updateShareAssetAccounts(
      privateKey,
      key,
      sharedWithAddresses,
      sharedWithUserIds
    );
    
    const serializedResult = serializeBigInt(result);
    
    console.log('✅ Share asset accounts updated successfully');
    
    res.json({ success: true, data: serializedResult });
  } catch (error) {
    console.error('❌ Error in updateShareAssetAccounts controller:', error);
    next(error);
  }
};

const disableShareAsset = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { userId } = req.body;
    
    console.log('🔒 Disabling share asset:', { key, userId });
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }
    
    // Verificar que el userId existe
    if (!walletService.userExists(userId)) {
      return res.status(404).json({ 
        success: false, 
        error: `User ${userId} not found` 
      });
    }
    
    // Obtener la privateKey
    const privateKey = walletService.getPrivateKeyByUserId(userId);
    
    const result = await shareLoansService.disableShareAsset(privateKey, key);
    const serializedResult = serializeBigInt(result);
    
    console.log('✅ Share asset disabled successfully');
    
    res.json({ success: true, data: serializedResult });
  } catch (error) {
    console.error('❌ Error in disableShareAsset controller:', error);
    next(error);
  }
};

const enableShareAsset = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { userId } = req.body;
    
    console.log('🔓 Enabling share asset:', { key, userId });
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }
    
    // Verificar que el userId existe
    if (!walletService.userExists(userId)) {
      return res.status(404).json({ 
        success: false, 
        error: `User ${userId} not found` 
      });
    }
    
    // Obtener la privateKey
    const privateKey = walletService.getPrivateKeyByUserId(userId);
    
    const result = await shareLoansService.enableShareAsset(privateKey, key);
    const serializedResult = serializeBigInt(result);
    
    console.log('✅ Share asset enabled successfully');
    
    res.json({ success: true, data: serializedResult });
  } catch (error) {
    console.error('❌ Error in enableShareAsset controller:', error);
    next(error);
  }
};

const readShareAsset = async (req, res, next) => {
  try {
    const { key } = req.params;
    
    console.log('📖 Reading share asset:', key);
    
    const share = await shareLoansService.readShareAsset(key);
    const serializedShare = serializeBigInt(share);
    
    res.json({ success: true, data: serializedShare });
  } catch (error) {
    console.error('❌ Error in readShareAsset controller:', error);
    next(error);
  }
};

const checkUserAccess = async (req, res, next) => {
  try {
    const { key, userId } = req.params;
    
    console.log('🔍 Checking user access:', { key, userId });
    
    // Convertir userId a address
    const userAddress = walletService.getAddressByUserId(userId);
    
    if (!userAddress) {
      return res.status(404).json({ 
        success: false, 
        error: `Address not found for user ${userId}` 
      });
    }
    
    const access = await shareLoansService.checkUserAccess(key, userAddress);
    
    res.json({ success: true, data: access });
  } catch (error) {
    console.error('❌ Error in checkUserAccess controller:', error);
    next(error);
  }
};

const querySharedByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Querying shares by user:', userId);
    
    // Convertir userId a address
    const userAddress = walletService.getAddressByUserId(userId);
    
    if (!userAddress) {
      return res.status(404).json({ 
        success: false, 
        error: `Address not found for user ${userId}` 
      });
    }
    
    const shares = await shareLoansService.querySharedByUser(userAddress);
    const serializedShares = serializeBigInt(shares);
    
    res.json({ success: true, data: serializedShares });
  } catch (error) {
    console.error('❌ Error in querySharedByUser controller:', error);
    next(error);
  }
};

const querySharedWithMe = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Querying shares with me:', userId);
    
    // Convertir userId a address
    const userAddress = walletService.getAddressByUserId(userId);
    
    if (!userAddress) {
      return res.status(404).json({ 
        success: false, 
        error: `Address not found for user ${userId}` 
      });
    }
    
    const shares = await shareLoansService.querySharedWithMe(userAddress);
    const serializedShares = serializeBigInt(shares);
    
    res.json({ success: true, data: serializedShares });
  } catch (error) {
    console.error('❌ Error in querySharedWithMe controller:', error);
    next(error);
  }
};

const queryAllShareAssets = async (req, res, next) => {
  try {
    console.log('🔍 Querying all share assets');
    
    const shares = await shareLoansService.queryAllShareAssets();
    const serializedShares = serializeBigInt(shares);
    
    res.json({ success: true, data: serializedShares });
  } catch (error) {
    console.error('❌ Error in queryAllShareAssets controller:', error);
    next(error);
  }
};

const shareAssetExists = async (req, res, next) => {
  try {
    const { key } = req.params;
    
    console.log('🔍 Checking if share asset exists:', key);
    
    const exists = await shareLoansService.shareAssetExists(key);
    
    res.json({ success: true, data: { exists } });
  } catch (error) {
    console.error('❌ Error in shareAssetExists controller:', error);
    next(error);
  }
};

module.exports = {
  createShareAsset,
  updateShareAssetAccounts,
  disableShareAsset,
  enableShareAsset,
  readShareAsset,
  checkUserAccess,
  querySharedByUser,
  querySharedWithMe,
  queryAllShareAssets,
  shareAssetExists
};