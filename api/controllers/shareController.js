const shareLoansService = require('../services/ShareLoansService');
const walletService = require('../services/WalletService');

const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

const createShareAsset = async (req, res, next) => {
  try {
    const { userId, key, accounts, name, sharedWithAddresses } = req.body;

    if (!userId || !key || !accounts || !sharedWithAddresses) {
      return res.status(400).json({ success: false, error: 'userId, key, accounts and sharedWithAddresses are required' });
    }
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ success: false, error: 'accounts must be an array' });
    }
    if (!Array.isArray(sharedWithAddresses) || sharedWithAddresses.length === 0) {
      return res.status(400).json({ success: false, error: 'sharedWithAddresses must be a non-empty array' });
    }

    if (!await walletService.userExists(userId)) {
      return res.status(404).json({ success: false, error: `User ${userId} not found` });
    }

    const privateKey = await walletService.getPrivateKeyByUserId(userId);

    let sharedWithUserIds;
    try {
      sharedWithUserIds = await walletService.convertAddressesToUserIds(sharedWithAddresses);
    } catch (error) {
      return res.status(400).json({ success: false, error: `Error converting addresses to userIds: ${error.message}` });
    }

    const result = await shareLoansService.createShareAsset(
      privateKey, key, userId, accounts, name || '', sharedWithAddresses, sharedWithUserIds
    );

    res.status(201).json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ Error in createShareAsset controller:', error);
    next(error);
  }
};

const updateShareAssetAccounts = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { userId, sharedWithAddresses } = req.body;

    if (!userId || !sharedWithAddresses) {
      return res.status(400).json({ success: false, error: 'userId and sharedWithAddresses are required' });
    }
    if (!Array.isArray(sharedWithAddresses) || sharedWithAddresses.length === 0) {
      return res.status(400).json({ success: false, error: 'sharedWithAddresses must be a non-empty array' });
    }

    if (!await walletService.userExists(userId)) {
      return res.status(404).json({ success: false, error: `User ${userId} not found` });
    }

    const privateKey = await walletService.getPrivateKeyByUserId(userId);

    let sharedWithUserIds;
    try {
      sharedWithUserIds = await walletService.convertAddressesToUserIds(sharedWithAddresses);
    } catch (error) {
      return res.status(400).json({ success: false, error: `Error converting addresses to userIds: ${error.message}` });
    }

    const result = await shareLoansService.updateShareAssetAccounts(privateKey, key, sharedWithAddresses, sharedWithUserIds);
    res.json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ Error in updateShareAssetAccounts controller:', error);
    next(error);
  }
};

const disableShareAsset = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    if (!await walletService.userExists(userId)) {
      return res.status(404).json({ success: false, error: `User ${userId} not found` });
    }

    const privateKey = await walletService.getPrivateKeyByUserId(userId);
    const result = await shareLoansService.disableShareAsset(privateKey, key);
    res.json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ Error in disableShareAsset controller:', error);
    next(error);
  }
};

const enableShareAsset = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    if (!await walletService.userExists(userId)) {
      return res.status(404).json({ success: false, error: `User ${userId} not found` });
    }

    const privateKey = await walletService.getPrivateKeyByUserId(userId);
    const result = await shareLoansService.enableShareAsset(privateKey, key);
    res.json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ Error in enableShareAsset controller:', error);
    next(error);
  }
};

const readShareAsset = async (req, res, next) => {
  try {
    const { key } = req.params;
    const share = await shareLoansService.readShareAsset(key);
    res.json({ success: true, data: serializeBigInt(share) });
  } catch (error) {
    console.error('❌ Error in readShareAsset controller:', error);
    next(error);
  }
};

const checkUserAccess = async (req, res, next) => {
  try {
    const { key, userId } = req.params;
    const userAddress = await walletService.getAddressByUserId(userId);
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
    const userAddress = await walletService.getAddressByUserId(userId);
    const shares = await shareLoansService.querySharedByUser(userAddress);
    res.json({ success: true, data: serializeBigInt(shares) });
  } catch (error) {
    console.error('❌ Error in querySharedByUser controller:', error);
    next(error);
  }
};

const querySharedWithMe = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userAddress = await walletService.getAddressByUserId(userId);
    const shares = await shareLoansService.querySharedWithMe(userAddress);
    res.json({ success: true, data: serializeBigInt(shares) });
  } catch (error) {
    console.error('❌ Error in querySharedWithMe controller:', error);
    next(error);
  }
};

const queryAllShareAssets = async (req, res, next) => {
  try {
    const shares = await shareLoansService.queryAllShareAssets();
    res.json({ success: true, data: serializeBigInt(shares) });
  } catch (error) {
    console.error('❌ Error in queryAllShareAssets controller:', error);
    next(error);
  }
};

const shareAssetExists = async (req, res, next) => {
  try {
    const { key } = req.params;
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
