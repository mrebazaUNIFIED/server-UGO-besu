// middleware/auth.js
const authService = require('../services/AuthService');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    console.log('🎫 Token received:', token.substring(0, 20) + '...'); 
    
    const decoded = authService.verifyToken(token);
    
    console.log('✅ Token decoded:', decoded); 
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };