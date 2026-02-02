
const userService = require('../services/UserRegistryService');
console.log('UserRegistryService loaded');

// Función helper para convertir BigInt a string
const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

const registerUser = async (req, res, next) => {
  try {
    console.log('\n CONTROLLER: registerUser - ENTERED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { funderPrivateKey, initialBalance, ...userData } = req.body;
    
    if (!funderPrivateKey) {
      console.log(' Missing funderPrivateKey');
      return res.status(400).json({ 
        success: false, 
        error: 'Funder/Owner private key is required for registration' 
      });
    }
    
    console.log('✓ funderPrivateKey present');
    console.log('✓ userData:', userData);
    console.log('✓ initialBalance:', initialBalance);
    
    console.log('\n Calling userService.registerUser...');
    const result = await userService.registerUser(funderPrivateKey, { 
      ...userData, 
      initialBalance 
    });
    
    console.log('Service returned result');
    
    // Serializar BigInt antes de enviar
    const serializedResult = serializeBigInt(result);
    
    console.log('CONTROLLER: registerUser - SUCCESS, sending response');
    res.status(201).json({ success: true, data: serializedResult });
  } catch (error) {
    console.error('\n❌ CONTROLLER: registerUser - ERROR');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    console.log('\n CONTROLLER: updateUser - ENTERED');
    const { walletAddress } = req.params;
    const { privateKey, ...updateData } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Private key is required' 
      });
    }
    
    const result = await userService.updateUser(privateKey, walletAddress, updateData);
    const serializedResult = serializeBigInt(result);
    
    res.json({ success: true, data: serializedResult });
  } catch (error) {
    console.error('CONTROLLER: updateUser - ERROR:', error.message);
    next(error);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    console.log('\nCONTROLLER: deactivateUser - ENTERED');
    const { walletAddress } = req.params;
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Private key is required' 
      });
    }
    
    const result = await userService.deactivateUser(privateKey, walletAddress);
    const serializedResult = serializeBigInt(result);
    
    res.json({ success: true, data: serializedResult });
  } catch (error) {
    console.error(' CONTROLLER: deactivateUser - ERROR:', error.message);
    next(error);
  }
};

const reactivateUser = async (req, res, next) => {
  try {
    console.log('\n CONTROLLER: reactivateUser - ENTERED');
    const { walletAddress } = req.params;
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Private key is required' 
      });
    }
    
    const result = await userService.reactivateUser(privateKey, walletAddress);
    const serializedResult = serializeBigInt(result);
    
    res.json({ success: true, data: serializedResult });
  } catch (error) {
    console.error(' CONTROLLER: reactivateUser - ERROR:', error.message);
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    console.log('\nCONTROLLER: getUser - ENTERED');
    const { walletAddress } = req.params;
    const user = await userService.getUser(walletAddress);
    const serializedUser = serializeBigInt(user);
    
    res.json({ success: true, data: serializedUser });
  } catch (error) {
    console.error(' CONTROLLER: getUser - ERROR:', error.message);
    next(error);
  }
};

const getUserByUserId = async (req, res, next) => {
  try {
    console.log('\n CONTROLLER: getUserByUserId - ENTERED');
    const { userId } = req.params;
    const user = await userService.getUserByUserId(userId);
    const serializedUser = serializeBigInt(user);
    
    res.json({ success: true, data: serializedUser });
  } catch (error) {
    console.error(' CONTROLLER: getUserByUserId - ERROR:', error.message);
    next(error);
  }
};

const getUsersByOrganization = async (req, res, next) => {
  try {
    console.log('\n🟢 CONTROLLER: getUsersByOrganization - ENTERED');
    const { organization } = req.params;
    const start = parseInt(req.query.start) || 0;
    const limit = parseInt(req.query.limit) || 10;
    
    const users = await userService.getUsersByOrganization(organization, start, limit);
    const serializedUsers = serializeBigInt(users);
    
    res.json({ success: true, data: serializedUsers });
  } catch (error) {
    console.error(' CONTROLLER: getUsersByOrganization - ERROR:', error.message);
    next(error);
  }
};

const isUserActive = async (req, res, next) => {
  try {
    console.log('\n CONTROLLER: isUserActive - ENTERED');
    const { walletAddress } = req.params;
    const isActive = await userService.isUserActive(walletAddress);
    
    res.json({ success: true, data: { isActive } });
  } catch (error) {
    console.error(' CONTROLLER: isUserActive - ERROR:', error.message);
    next(error);
  }
};

const userRegistered = async (req, res, next) => {
  try {
    console.log('\n🟢 CONTROLLER: userRegistered - ENTERED');
    const { walletAddress } = req.params;
    const registered = await userService.userRegistered(walletAddress);
    
    res.json({ success: true, data: { registered } });
  } catch (error) {
    console.error('CONTROLLER: userRegistered - ERROR:', error.message);
    next(error);
  }
};

const getTotalUsers = async (req, res, next) => {
  try {
    console.log('\nCONTROLLER: getTotalUsers - ENTERED');
    const total = await userService.getTotalUsers();
    
    res.json({ success: true, data: { total } });
  } catch (error) {
    console.error('CONTROLLER: getTotalUsers - ERROR:', error.message);
    next(error);
  }
};

const getActiveUsersCount = async (req, res, next) => {
  try {
    console.log('\n CONTROLLER: getActiveUsersCount - ENTERED');
    const count = await userService.getActiveUsersCount();
    
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error(' CONTROLLER: getActiveUsersCount - ERROR:', error.message);
    next(error);
  }
};

console.log(' userController exports ready');

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