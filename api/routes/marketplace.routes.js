const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');

// Aprobar loan para tokenización
router.post('/approve', marketplaceController.approveLoanForSale);

// Cancelar aprobación de venta
router.post('/cancel', marketplaceController.cancelSaleListing);

// Obtener datos de aprobación
router.get('/approval/:lenderUid/:loanUid', marketplaceController.getApprovalData);

// Obtener estado de tokenización
router.get('/status/:lenderUid/:loanUid', marketplaceController.getTokenizationStatus);

// Obtener loans aprobados de un lender
router.get('/approved/:lenderAddress', marketplaceController.getApprovedLoansByLender);

// Obtener loans tokenizados
router.get('/tokenized', marketplaceController.getTokenizedLoans);

// Relayer: Establecer token ID de Avalanche
router.post('/set-token-id', marketplaceController.setAvalancheTokenId);

// Relayer: Registrar transferencia de propiedad
router.post('/record-transfer', marketplaceController.recordOwnershipTransfer);

// Relayer: Registrar pago
router.post('/record-payment', marketplaceController.recordPayment);

// Relayer: Marcar loan como pagado
router.post('/mark-paid-off', marketplaceController.markLoanAsPaidOff);

// Verificar si lender puede aprobar
router.get('/can-approve/:lenderUid/:loanUid', marketplaceController.canLenderApproveLoan);

// Relayer: Registrar hash de transacción
router.post('/register-txhash', marketplaceController.registerApprovalTxHash);

// Obtener loanId por hash de transacción
router.get('/txhash/:txHash', marketplaceController.getLoanIdByTxHash);

// Obtener aprobación por hash de transacción
router.get('/approval-by-txhash/:txHash', marketplaceController.getApprovalDataByTxHash);

// Owner: Desbloqueo de emergencia
router.post('/emergency-unlock', marketplaceController.emergencyUnlock);

// Relayer: Forzar desbloqueo de loan pagado
router.post('/force-unlock-paid-off', marketplaceController.forceUnlockPaidOffLoan);

// Obtener dirección del relayer
router.get('/relayer-address', marketplaceController.getRelayerAddress);


// Verificar si puede cancelar y si necesita burn
router.get('/can-cancel/:lenderUid/:loanUid', marketplaceController.canCancel);

// Solicitar burn y cancelación (para NFTs minteados)
router.post('/request-burn-cancel', marketplaceController.requestBurnAndCancel);

// Relayer: Confirmar burn y completar cancelación
router.post('/confirm-burn-cancel', marketplaceController.confirmBurnAndCancel);

// Obtener token ID de Avalanche
router.get('/token-id/:lenderUid/:loanUid', marketplaceController.getTokenId);


module.exports = router;