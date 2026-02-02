const express = require('express');
const router = express.Router();
const migrationController = require('../controllers/migrationController');

/**
 * POST /api/migrate/loans
 * Migrar todos los loans desde GraphQL
 * Body: { privateKey, userId }
 */
router.post('/loans', migrationController.migrateLoans);

/**
 * POST /api/migrate/loan/:loanId
 * Migrar un loan específico
 * Body: { privateKey, userId, loanUid }
 */
router.post('/loan/:loanId', migrationController.migrateSingleLoan);

/**
 * GET /api/migrate/status
 * Ver estado de migración
 */
router.get('/status', migrationController.getMigrationStatus);

module.exports = router;