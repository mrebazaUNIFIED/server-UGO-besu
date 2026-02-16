import logger from './logger.js';

/**
 * Validate Ethereum address
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate transaction hash
 */
export function isValidTxHash(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate loan data
 */
export function validateLoanData(loan) {
  const required = ['loanId', 'currentBalance', 'interestRate', 'status'];
  
  for (const field of required) {
    if (!loan[field]) {
      logger.error(`Missing required field: ${field}`);
      return false;
    }
  }

  return true;
}

/**
 * Sanitize loan data for public visibility
 */
export function sanitizeLoanData(loan) {
  return {
    loanId: loan.ID,
    currentBalance: loan.CurrentPrincipalBal,
    monthlyPayment: loan.ScheduledPayment,
    interestRate: loan.NoteRate,
    status: loan.Status,
    location: `${loan.BorrowerCity}, ${loan.BorrowerState}`,
    originalAmount: loan.OriginalLoanAmount,
    nextPaymentDue: loan.NextPaymentDue
    // NO incluir: BorrowerFullName, BorrowerEmail, BorrowerHomePhone, etc.
  };
}