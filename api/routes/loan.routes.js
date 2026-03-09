const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

// POST INTELIGENTE: Crear O Actualizar (detecta automáticamente)
router.post('/', loanController.createLoan);

// Actualización PARCIAL explícita
router.put('/:loanId/partial', loanController.updateLoanPartial);

// Actualizar loan bloqueado/tokenizado
router.put('/:loanId/locked', loanController.updateLockedLoan);

// Obtener loan por ID
router.get('/:loanId', loanController.getLoan);

// Obtener loan por LenderUid + LoanUid
router.get('/by-uids/:lenderUid/:loanUid', loanController.getLoanByUids);

// Obtener loans de un lender
router.get('/lender/:lenderUid', loanController.getLoansByLenderUid);

// Contar loans de un lender
router.get('/lender/:lenderUid/count', loanController.countLoansByLenderUid);

// Obtener loan por LoanUid
router.get('/loanuid/:loanUid', loanController.getLoanByLoanUid);

// Buscar loan por LenderUid y Account
router.get('/by-account/:lenderUid/:account', loanController.getLoanByLenderAndAccount);

// Obtener historial de loan
router.get('/:loanId/history', loanController.getLoanHistory);

// Obtener loan por TxId
router.get('/tx/:txId', loanController.getLoanByTxId);

// Eliminar loan
router.delete('/:loanId', loanController.deleteLoan);

// Obtener todos los loans (paginado)
router.get('/', loanController.getAllLoans);

// Obtener conteo total de loans
router.get('/count', loanController.getTotalLoansCount);

// Verificar si existe loan por ID
router.get('/:loanId/exists', loanController.checkLoanExists);

// Verificar si existe loan por UIDs
router.get('/uids/:lenderUid/:loanUid/exists', loanController.checkLoanExistsByUids);

// Verificar si loan está bloqueado
router.get('/:loanId/is-locked', loanController.checkLoanIsLocked);

// Verificar si loan está tokenizado
router.get('/:loanId/is-tokenized', loanController.checkLoanIsTokenized);

// Obtener token ID de Avalanche
router.get('/:loanId/avalanche-token-id', loanController.getAvalancheTokenId);

// Obtener transacción actual de loan
router.get('/:loanId/current-tx', loanController.getCurrentTransaction);

// Generar loanId
router.post('/generate-id', loanController.generateLoanId);

router.get('/get/portfolio', loanController.getPortfolio);


module.exports = router;