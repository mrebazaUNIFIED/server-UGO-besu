// controllers/authController.js
const authService = require('../services/AuthService');

const login = async (req, res, next) => {
  try {
    const { address, password } = req.body;

    if (!address || !password) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address and password are required'
      });
    }

    const result = await authService.login(address, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
};


module.exports = {
  login,
  
};