// routes/user.routes.js
const express = require('express');
const router = express.Router();

// Import controller
const {
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
} = require('../controllers/userController');

// Middleware para logging en esta ruta
router.use((req, res, next) => {
  console.log(`\n📋 USER ROUTE: ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// ==========================================
// RUTAS ESPECÍFICAS PRIMERO
// ==========================================

// Obtener total de usuarios
router.get('/total', (req, res, next) => {
  console.log('🎯 Route handler: GET /total');
  getTotalUsers(req, res, next);
});

// Obtener conteo de activos
router.get('/active/count', (req, res, next) => {
  console.log('🎯 Route handler: GET /active/count');
  getActiveUsersCount(req, res, next);
});

// Obtener usuarios por organización
router.get('/organization/:organization', (req, res, next) => {
  console.log('🎯 Route handler: GET /organization/:organization');
  getUsersByOrganization(req, res, next);
});

// Obtener usuario por userId
router.get('/id/:userId', (req, res, next) => {
  console.log('🎯 Route handler: GET /id/:userId');
  getUserByUserId(req, res, next);
});

// ==========================================
// RUTAS CON PARÁMETROS DINÁMICOS
// ==========================================

// Registrar usuario - LA CLAVE ESTÁ AQUÍ
router.post('/', (req, res, next) => {
  console.log('🎯 Route handler: POST / (registerUser)');
  console.log('About to call registerUser controller...');
  registerUser(req, res, next);
});

// Actualizar usuario
router.put('/wallet/:walletAddress', (req, res, next) => {
  console.log('🎯 Route handler: PUT /wallet/:walletAddress');
  updateUser(req, res, next);
});

// Desactivar usuario
router.post('/wallet/:walletAddress/deactivate', (req, res, next) => {
  console.log('🎯 Route handler: POST /wallet/:walletAddress/deactivate');
  deactivateUser(req, res, next);
});

// Reactivar usuario
router.post('/wallet/:walletAddress/reactivate', (req, res, next) => {
  console.log('🎯 Route handler: POST /wallet/:walletAddress/reactivate');
  reactivateUser(req, res, next);
});

// Verificar si activo
router.get('/wallet/:walletAddress/active', (req, res, next) => {
  console.log('🎯 Route handler: GET /wallet/:walletAddress/active');
  isUserActive(req, res, next);
});

// Verificar si registrado
router.get('/wallet/:walletAddress/registered', (req, res, next) => {
  console.log('🎯 Route handler: GET /wallet/:walletAddress/registered');
  userRegistered(req, res, next);
});

// Obtener usuario por walletAddress (AL FINAL)
router.get('/wallet/:walletAddress', (req, res, next) => {
  console.log('🎯 Route handler: GET /wallet/:walletAddress');
  getUser(req, res, next);
});

console.log('✅ User routes loaded');

module.exports = router;