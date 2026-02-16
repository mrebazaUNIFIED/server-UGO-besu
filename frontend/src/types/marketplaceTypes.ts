// src/types/marketplaceTypes.ts

/**
 * Datos de aprobación de un loan para tokenización
 */
export interface LoanApprovalData {
  loanId: string;
  lenderUid: string;
  loanUid: string;
  isApproved: boolean;
  askingPrice: string; // En USD (formato string)
  lenderAddress: string;
  approvalTimestamp: Date;
  isMinted: boolean;
  isCancelled: boolean;
  approvalTxHash: string | null;
}

/**
 * Request para aprobar un loan
 */
export interface ApproveLoanRequest {
  lenderUid: string;
  loanUid: string;
  askingPrice: number; // En USD
}

/**
 * Request para cancelar aprobación
 */
export interface CancelSaleRequest {
  lenderUid: string;
  loanUid: string;
}

/**
 * Request para establecer token ID de Avalanche
 */
export interface SetTokenIdRequest {
  lenderUid: string;
  loanUid: string;
  tokenId: string;
}

/**
 * Request para registrar transferencia de ownership
 */
export interface RecordTransferRequest {
  lenderUid: string;
  loanUid: string;
  newOwnerAddress: string;
  salePrice: number; // En USD
}

/**
 * Request para registrar pago
 */
export interface RecordPaymentRequest {
  lenderUid: string;
  loanUid: string;
  amount: number; // En USD
}

/**
 * Request para marcar como pagado
 */
export interface MarkPaidOffRequest {
  lenderUid: string;
  loanUid: string;
}

/**
 * Request para registrar txHash
 */
export interface RegisterTxHashRequest {
  lenderUid: string;
  loanUid: string;
  txHash: string;
}

/**
 * Request para emergency unlock
 */
export interface EmergencyUnlockRequest {
  lenderUid: string;
  loanUid: string;
}

/**
 * Request para burn and cancel
 */
export interface BurnAndCancelRequest {
  lenderUid: string;
  loanUid: string;
}

/**
 * Respuesta de aprobación
 */
export interface ApprovalResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  askingPriceUSD: string;
  askingPriceCents: string;
  noteRate: string;
  data: {
    loanId: string;
    askingPriceUSD: string;
    askingPriceCents: string;
    noteRate: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    eventData?: {
      loanId: bigint;
      lenderAddress: string;
      askingPrice: string;
      timestamp: string;
    };
  };
}

/**
 * Respuesta de cancelación
 */
export interface CancelResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}

/**
 * Respuesta de datos de aprobación
 */
export interface ApprovalDataResponse {
  success: boolean;
  lenderUid: string;
  loanUid: string;
  loanId: string;
  data: LoanApprovalData;
}

/**
 * Estado de tokenización de un loan
 */
export interface TokenizationStatus {
  loanId: string;
  lenderUid: string;
  loanUid: string;
  isLocked: boolean;
  isTokenized: boolean;
  avalancheTokenId: string;
  canBeMinted: boolean;
  isApprovedForSale: boolean;
  loanDetails: {
    currentBalance: string;
    status: string;
    noteRate: string;
    lenderAddress: string;
  };
  approval: LoanApprovalData | null;
}

/**
 * Respuesta de estado de tokenización
 */
export interface TokenizationStatusResponse {
  success: boolean;
  data: TokenizationStatus;
}

/**
 * Respuesta de set token ID
 */
export interface SetTokenIdResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    tokenId: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}

/**
 * Respuesta de record transfer
 */
export interface RecordTransferResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    newOwnerAddress: string;
    salePriceUSD: string;
    salePriceCents: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}

/**
 * Respuesta de record payment
 */
export interface RecordPaymentResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    amountUSD: string;
    amountCents: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}

/**
 * Respuesta de mark paid off
 */
export interface MarkPaidOffResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}

/**
 * Respuesta de aprobación por txHash
 */
export interface ApprovalByTxResponse {
  success: boolean;
  txHash: string;
  data: {
    loanId: string;
    lenderUid: string;
    loanUid: string;
    isApproved: boolean;
    askingPrice: string;
    lenderAddress: string;
    approvalTimestamp: Date;
    isMinted: boolean;
    isCancelled: boolean;
    approvalTxHash: string;
  };
}

/**
 * Respuesta de loanId por txHash
 */
export interface LoanIdByTxResponse {
  success: boolean;
  txHash: string;
  loanId: string;
}

/**
 * Datos de loans aprobados por lender
 */
export interface ApprovedLoanData {
  loanId: string;
  lenderUid: string;
  loanUid: string;
  askingPrice: string;
  isMinted: boolean;
}

/**
 * Respuesta de loans aprobados
 */
export interface ApprovedLoansResponse {
  success: boolean;
  lenderAddress: string;
  count: number;
  data: ApprovedLoanData[];
}

/**
 * Datos de loans tokenizados
 */
export interface TokenizedLoanData {
  loanId: string;
  lenderUid: string;
  loanUid: string;
  tokenId: string;
  currentBalance: string;
  status: string;
}

/**
 * Respuesta de loans tokenizados
 */
export interface TokenizedLoansResponse {
  success: boolean;
  count: number;
  data: TokenizedLoanData[];
}

/**
 * Respuesta de can approve
 */
export interface CanApproveResponse {
  success: boolean;
  lenderUid: string;
  loanUid: string;
  lenderAddress: string;
  canApprove: boolean;
  reason: string;
  recommendation: string;
}

/**
 * Respuesta de emergency unlock
 */
export interface EmergencyUnlockResponse {
  success: boolean;
  message: string;
  warning: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    txHash: string;
    blockNumber: number;
  };
}

/**
 * Respuesta de relayer address
 */
export interface RelayerAddressResponse {
  success: boolean;
  relayerAddress: string;
}

/**
 * Respuesta de can cancel
 */
export interface CanCancelResponse {
  success: boolean;
  lenderUid: string;
  loanUid: string;
  canCancelNow: boolean;
  needsBurn: boolean;
  recommendation: string;
  currentStatus: {
    isApproved: boolean;
    isMinted: boolean;
    isCancelled: boolean;
    avalancheTokenId: string | null;
  };
}

/**
 * Respuesta de burn request
 */
export interface BurnRequestResponse {
  success: boolean;
  message: string;
  type: 'burn_required' | 'direct_cancel';
  loanId: string;
  lenderUid: string;
  loanUid: string;
  avalancheTokenId?: string;
  nextStep?: string;
  data: any;
}

/**
 * Respuesta de confirm burn
 */
export interface ConfirmBurnResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    message: string;
  };
}

/**
 * Respuesta de token ID
 */
export interface TokenIdResponse {
  success: boolean;
  lenderUid: string;
  loanUid: string;
  tokenId: string;
  isMinted: boolean;
  isActive: boolean;
  message: string;
}

/**
 * Respuesta de register txHash
 */
export interface RegisterTxHashResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    registeredTxHash: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}

/**
 * Respuesta de force unlock paid off
 * ⭐ Separado de MarkPaidOffResponse para reflejar el shape real del service
 */
export interface ForceUnlockResponse {
  success: boolean;
  message: string;
  loanId: string;
  lenderUid: string;
  loanUid: string;
  data: {
    loanId: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}