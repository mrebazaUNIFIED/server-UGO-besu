const userService = require('../services/UserRegistryService');

const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

const registerUser = async (req, res, next) => {
  try {
    const { initialBalance, ...userData } = req.body;
    const result = await userService.registerUser({ ...userData, initialBalance });
    res.status(201).json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ registerUser:', error.message);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const result = await userService.updateUser(walletAddress, req.body);
    res.json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ updateUser:', error.message);
    next(error);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const result = await userService.deactivateUser(walletAddress);
    res.json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ deactivateUser:', error.message);
    next(error);
  }
};

const reactivateUser = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const result = await userService.reactivateUser(walletAddress);
    res.json({ success: true, data: serializeBigInt(result) });
  } catch (error) {
    console.error('❌ reactivateUser:', error.message);
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const user = await userService.getUser(walletAddress);
    res.json({ success: true, data: serializeBigInt(user) });
  } catch (error) {
    console.error('❌ getUser:', error.message);
    next(error);
  }
};

const getUserByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserByUserId(userId);
    res.json({ success: true, data: serializeBigInt(user) });
  } catch (error) {
    console.error('❌ getUserByUserId:', error.message);
    next(error);
  }
};

const getUsersByOrganization = async (req, res, next) => {
  try {
    const { organization } = req.params;
    const start = parseInt(req.query.start) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const users = await userService.getUsersByOrganization(organization, start, limit);
    res.json({ success: true, data: serializeBigInt(users) });
  } catch (error) {
    console.error('❌ getUsersByOrganization:', error.message);
    next(error);
  }
};

const isUserActive = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const isActive = await userService.isUserActive(walletAddress);
    res.json({ success: true, data: { isActive } });
  } catch (error) {
    console.error('❌ isUserActive:', error.message);
    next(error);
  }
};

const userRegistered = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const registered = await userService.userRegistered(walletAddress);
    res.json({ success: true, data: { registered } });
  } catch (error) {
    console.error('❌ userRegistered:', error.message);
    next(error);
  }
};

const getTotalUsers = async (req, res, next) => {
  try {
    const total = await userService.getTotalUsers();
    res.json({ success: true, data: { total } });
  } catch (error) {
    console.error('❌ getTotalUsers:', error.message);
    next(error);
  }
};

const getActiveUsersCount = async (req, res, next) => {
  try {
    const count = await userService.getActiveUsersCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('❌ getActiveUsersCount:', error.message);
    next(error);
  }
};

module.exports = {
  registerUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  getUser,
  getUserByUserId,
  getUsersByOrganization,
  isUserActive,
  userRegistered,
  getTotalUsers,
  getActiveUsersCount
};