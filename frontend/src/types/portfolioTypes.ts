// ==================== PORTFOLIO ITEM (del GraphQL externo) ====================
export interface PortfolioItem {
  loanUid: string;
  lenderUid: string;
}

// ==================== LOAN DEL PORTFOLIO (blockchain) ====================
export interface PortfolioLoan {
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

// ==================== RESPUESTA DE GET /portfolio/me ====================
export interface PortfolioResponse {
  success: boolean;
  userId: string | null;
  totalLoans: number;
  data: PortfolioLoan[];
}

// ==================== CERTIFICATE (Portfolio.sol) ====================
export interface PortfolioCertificate {
  id: string;
  userId: string;
  userAddress: string;
  txId: string;
  loanIds: string[];
  loansCount: number;
  totalPrincipal: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  version: number;
  exists: boolean;
}

export interface CertificateStats {
  loansCount: number;
  totalPrincipal: string;
  version: number;
  lastUpdatedAt: Date;
}

// ==================== REQUESTS ====================
export interface CertifyPortfolioRequest {
  userId: string;
  wait?: boolean;
}

export interface CreateCertificateRequest {
  privateKey: string;
  userId: string;
  userAddress: string;
  loanIds: string[];
  totalPrincipal: string;
}

export interface UpdateCertificateRequest {
  privateKey: string;
  loanIds: string[];
  totalPrincipal: string;
}

// ==================== RESPONSES ====================
export interface CertifyPortfolioResponse {
  success: boolean;
  data: {
    success: boolean;
    status: 'CONFIRMED' | 'PENDING' | 'FAILED';
    userId: string;
    walletAddress: string;
    operation: 'created' | 'updated';
    txHash: string;
    blockNumber?: number;
    gasUsed?: string;
    loansCount: number;
    totalPrincipalCents: string;
  };
}

export interface CertificateResponse {
  success: boolean;
  data: PortfolioCertificate;
}

export interface AllCertificatesResponse {
  success: boolean;
  count: number;
  data: PortfolioCertificate[];
}

export interface CertificateExistsResponse {
  success: boolean;
  data: {
    exists: boolean;
  };
}

export interface CertificateStatsResponse {
  success: boolean;
  data: CertificateStats;
}

export interface CertificateTxIdResponse {
  success: boolean;
  data: {
    txId: string;
  };
}

export interface CreateCertificateResponse {
  success: boolean;
  data: {
    success: boolean;
    txHash: string;
    blockNumber: number;
    userId: string;
  };
}