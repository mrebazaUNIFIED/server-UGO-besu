// ==================== COMPACT LOAN (para listados) ====================
export interface CompactLoan {
  ID: string;
  LoanUid: string;
  Account: string;
  LenderUid: string;
  OriginalBalance: string;
  CurrentBalance: string;
  VendorFeePct: string;
  NoteRate: string;
  SoldRate: string;
  CalcInterestRate: string;
  CoBorrower: string;
  ActiveDefaultInterestRate: string;
  ReserveBalanceRestricted: string;
  DefaultInterestRate: string;
  DeferredPrinBal: string;
  DeferredUnpaidInt: string;
  DeferredLateCharges: string;
  DeferredUnpaidCharges: string;
  MaximumDraw: string;
  CloseDate: string;
  DrawStatus: string;
  LenderFundDate: string;
  LenderOwnerPct: string;
  LenderName: string;
  LenderAccount: string;
  IsForeclosure: boolean;
  Status: string;
  PaidOffDate: string;
  PaidToDate: string;
  MaturityDate: string;
  NextDueDate: string;
  City: string;
  State: string;
  PropertyZip: string;
  TxId: string;
  BLOCKAUDITCreationAt: Date;
  BLOCKAUDITUpdatedAt: Date;
  exists: boolean;
  isLocked: boolean;
  avalancheTokenId: string;
  lastSyncTimestamp: number;
  isTokenized: boolean;
}

// ==================== FULL LOAN (para detalle completo) ====================
export interface Loan {
  ID: string;
  LoanUid: string;
  Account: string;
  LenderUid: string;
  OriginalBalance: string;
  CurrentBalance: string;
  VendorFeePct: string;
  NoteRate: string;
  SoldRate: string;
  CalcInterestRate: string;
  CoBorrower: string;
  ActiveDefaultInterestRate: string;
  ReserveBalanceRestricted: string;
  DefaultInterestRate: string;
  DeferredPrinBal: string;
  DeferredUnpaidInt: string;
  DeferredLateCharges: string;
  DeferredUnpaidCharges: string;
  MaximumDraw: string;
  CloseDate: string;
  DrawStatus: string;
  LenderFundDate: string;
  LenderOwnerPct: string;
  LenderName: string;
  LenderAccount: string;
  IsForeclosure: boolean;
  Status: string;
  PaidOffDate: string;
  PaidToDate: string;
  MaturityDate: string;
  NextDueDate: string;
  City: string;
  State: string;
  PropertyZip: string;
  TxId: string;
  BLOCKAUDITCreationAt: Date;
  BLOCKAUDITUpdatedAt: Date;
  exists: boolean;
  isLocked: boolean;
  avalancheTokenId: string;
  lastSyncTimestamp: number;
  isTokenized: boolean;
}

// ==================== REQUEST/RESPONSE TYPES ====================
export interface CreateLoanRequest {
  LoanUid: string;
  Account?: string;
  LenderUid: string;
  OriginalBalance?: string | number;
  CurrentBalance?: string | number;
  VendorFeePct?: string | number;
  NoteRate?: string | number;
  SoldRate?: string | number;
  CalcInterestRate?: string | number;
  CoBorrower?: string;
  ActiveDefaultInterestRate?: string | number;
  ReserveBalanceRestricted?: string | number;
  DefaultInterestRate?: string | number;
  DeferredPrinBal?: string | number;
  DeferredUnpaidInt?: string | number;
  DeferredLateCharges?: string | number;
  DeferredUnpaidCharges?: string | number;
  MaximumDraw?: string | number;
  CloseDate?: string;
  DrawStatus?: string;
  LenderFundDate?: string;
  LenderOwnerPct?: string | number;
  LenderName?: string;
  LenderAccount?: string;
  IsForeclosure?: boolean;
  Status?: string;
  PaidOffDate?: string;
  PaidToDate?: string;
  MaturityDate?: string;
  NextDueDate?: string;
  City?: string;
  State?: string;
  PropertyZip?: string;
}

export interface CreateLoanResponse {
  success: boolean;
  message?: string;
  operation?: 'CREATE' | 'PARTIAL_UPDATE' | 'FULL_UPDATE';
  loanId?: string;
  lenderUid?: string;
  loanUid?: string;
  updatedFields?: string[];
  data: {
    success: boolean;
    loanId: string;
    lenderUid: string;
    loanUid: string;
    txId: string;
    txHash: string;
    blockNumber: number;
  };
}

export interface AllLoansResponse {
  success: boolean;
  count: number;
  total?: number;
  offset?: number;
  limit?: number;
  data: CompactLoan[];
}

export interface LoanResponse {
  success: boolean;
  message?: string;
  loanId?: string;
  lenderUid?: string;
  loanUid?: string;
  data: Loan;
}

export interface LoanExistsResponse {
  success: boolean;
  loanId?: string;
  lenderUid?: string;
  loanUid?: string;
  exists: boolean;
}

export interface LoanIsLockedResponse {
  success: boolean;
  loanId: string;
  isLocked: boolean;
}

export interface LoanIsTokenizedResponse {
  success: boolean;
  loanId: string;
  isTokenized: boolean;
  tokenId: string | null;
}

export interface AvalancheTokenIdResponse {
  success: boolean;
  loanId: string;
  tokenId: string;
}

export interface CurrentTransactionResponse {
  success: boolean;
  loanId: string;
  currentTxId: string;
}

export interface GenerateLoanIdRequest {
  lenderUid: string;
  loanUid: string;
}

export interface GenerateLoanIdResponse {
  success: boolean;
  lenderUid: string;
  loanUid: string;
  loanId: string;
}

export interface UpdateLoanPartialRequest {
  fields: {
    CurrentBalance?: string | number;
    NoteRate?: string | number;
    Status?: string;
    NextDueDate?: string;
    PaidToDate?: string;
    PaidOffDate?: string;
    DeferredUnpaidInt?: string | number;
    DeferredLateCharges?: string | number;
    DeferredUnpaidCharges?: string | number;
    LenderOwnerPct?: string | number;
    IsForeclosure?: boolean;
    CoBorrower?: string;
    LenderName?: string;
    City?: string;
    State?: string;
    PropertyZip?: string;
  };
}

export interface UpdateLoanPartialResponse {
  success: boolean;
  message: string;
  loanId: string;
  updatedFields: string[];
  data: {
    success: boolean;
    loanId: string;
    txId: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    changeCount: number;
  };
}

export interface UpdateLockedLoanRequest {
  newBalance?: string | number;
  newStatus?: string;
  newPaidToDate?: string;
}

export interface UpdateLockedLoanResponse {
  success: boolean;
  message: string;
  loanId: string;
  data: {
    success: boolean;
    loanId: string;
    txId: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  };
}

export interface DeleteLoanResponse {
  success: boolean;
  message: string;
  loanId: string;
  data: {
    success: boolean;
    loanId: string;
    txHash: string;
    blockNumber: number;
  };
}

export interface LoansByLenderResponse {
  success: boolean;
  count: number;
  lenderUid: string;
  data: CompactLoan[];
}

export interface CountLoansByLenderResponse {
  success: boolean;
  lenderUid: string;
  count: number;
}

export interface TotalLoansCountResponse {
  success: boolean;
  totalCount: number;
}

export interface LoanByAccountResponse {
  success: boolean;
  lenderUid: string;
  account: string;
  data: Loan;
}

// ==================== HISTORY TYPES ====================
export interface LoanChange {
  PropertyName: string;
  OldValue: string;
  NewValue: string;
}

export interface LoanHistoryWithChanges {
  TxId: string;
  Timestamp: Date;
  IsDelete: boolean;
  ChangeCount: number;
  Changes: LoanChange[];
}

export interface LoanHistoryResponse {
  success: boolean;
  count: number;
  loanId: string;
  data: LoanHistoryWithChanges[];
}

// ==================== LOAN BY TXID TYPES ====================
export interface LoanByTxIdResponse {
  success: boolean;
  txId: string;
  loan: Loan;
  changes: LoanChange[];
}

// ==================== ERROR RESPONSE ====================
export interface ErrorResponse {
  error: string;
  details?: string;
  hint?: string;
}


export interface LoanDetail {
  uid: string;
  account: string;
  borrowerFullName: string;
  status: number;
  principalBalance: number;
  noteRate: number;
  hash: string;
  transaction: string;
}

export interface LoanHistory {
  dateReceived: string;
  reference: string;
  totalAmount: number;
  toInterest: number;
  toPrincipal: number;
}


export interface IPFS {
  loanUid: string;
  account: string;
  name: string;
  type?: string;
  date: string;
}
