// share.routes.js
const express = require('express');
const {
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
} = require('../controllers/shareController');

const router = express.Router();

// ==========================================
// RUTAS ESPECÍFICAS PRIMERO
// ==========================================

// Obtener todos los shares (admin)
router.get('/all', queryAllShareAssets);

// Obtener shares creados por usuario (usando userId en lugar de address)
router.get('/by-user/:userId', querySharedByUser);

// Obtener shares compartidos con usuario (usando userId)
router.get('/with-me/:userId', querySharedWithMe);

// ==========================================
// RUTAS CON PARÁMETROS DINÁMICOS
// ==========================================

// Crear share (BODY: userId, key, accounts, name, sharedWithUserIds)
router.post('/', createShareAsset);

// Actualizar cuentas con acceso (BODY: userId, sharedWithUserIds)
router.put('/:key/accounts', updateShareAssetAccounts);

// Deshabilitar share (BODY: userId)
router.post('/:key/disable', disableShareAsset);

// Habilitar share (BODY: userId)
router.post('/:key/enable', enableShareAsset);

// Leer share (no requiere autenticación)
router.get('/:key', readShareAsset);

// Verificar si existe (no requiere autenticación)
router.get('/:key/exists', shareAssetExists);

// Verificar acceso de usuario (usando userId en lugar de address)
router.get('/:key/access/:userId', checkUserAccess);

module.exports = router;