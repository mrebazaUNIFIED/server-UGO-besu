// routes/auth.routes.js
const express = require('express');
const { login} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Públicas
router.post('/login', login);

module.exports = router;