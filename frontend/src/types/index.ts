// src/types/index.ts

// ==================== AUTH ====================
export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}

export interface User {
  userId: string;
  name: string;
  organization: string;
  role: 'admin' | 'operator' | 'viewer';
  address: string;
  initialBalance: number;  // ✅ number en lugar de string
  createdAt: string;
  lastLogin?: string;
}

// JWT Payload type
export interface JwtPayload {
  userId: string;
  address: string;
  role: 'admin' | 'operator' | 'viewer';
  organization: string;
  exp?: number;
  iat?: number;
}

// ==================== WALLET ====================
export interface WalletRegistrationResponse {
  success: boolean;
  data: {
    walletAddress: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    event: any;
  };
}

export interface AccountDetails {
  mspId: string;
  userId: string;
  frozenBalance: string;
  lastActivity: Date;
  kycStatus: string;
  riskScore: string;
  accountType: string;
  createdAt: Date;
  exists: boolean;
}

// ==================== TRANSACTIONS ====================
export interface TransactionRecord {
  senderAddress: string;
  senderMspId: string;
  recipientAddress: string;
  recipientMspId: string;
  amount: string;
  metadata: string;
  timestamp: Date;
  settlementType: string;
  type?: 'sent' | 'received';
}

export interface MintRecord {
  recipientAddress: string;
  recipientMspId: string;
  amount: string;
  reserveProof: string;
  timestamp: Date;
  minter: string;
}

export interface BurnRecord {
  burnerAddress: string;
  burnerMspId: string;
  amount: string;
  reason: string;
  timestamp: Date;
}

export interface WalletCompleteHistory {
  mints: MintRecord[];
  burns: BurnRecord[];
  transactions: TransactionRecord[];
  summary: {
    totalMints: number;
    totalBurns: number;
    totalTransactions: number;
  };
}

// ==================== TOKEN OPERATIONS ====================
export interface TokenOperationResponse {
  success: boolean;
  data: {
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    event?: any;
  };
}

export interface TransferRequest {
  recipient: string;
  amount: string;
}

export interface MintRequest {
  walletAddress: string;
  amount: string;
  reserveProof: string;
}

export interface BurnRequest {
  walletAddress: string;
  amount: string;
  reason: string;
}

// ==================== COMPLIANCE ====================
export interface ComplianceUpdateRequest {
  kycStatus: string;
  riskScore: string;
}

export interface KycData {
  walletAddress: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  country: string;
  dateOfBirth: string;
}

export interface OfacResponse {
  success: boolean;
  data: {
    account: string;
    isBlacklisted: boolean;
    details?: any;
  };
}

// ==================== SYSTEM ====================
export interface SystemConfig {
  tokenName: string;
  tokenSymbol: string;
  maxTransactionAmount: string;
  maxDailyTransactionAmount: string;
  dailyReserveReportRequired: boolean;
  reserveBank: string;
  complianceEnabled: boolean;
}

export interface SystemStatistics {
  totalMints: string;
  totalBurns: string;
  totalTransfers: string;
  totalSupply: string;
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BalanceResponse {
  balance: string;
}

// ==================== LEGACY (para compatibilidad) ====================
export interface Transaction {
  txId: string;
  timestamp: string;
  from: string;
  to: string;
  amount: string;
  type: 'mint' | 'burn' | 'transfer';
  status: 'completed' | 'pending' | 'failed';
}

export interface MinReport {
  reportId: string;
  timestamp: string;
  totalMinted: string;
  reserveProof: string;
}

export interface RawTransaction {
  senderAddress: string;
  recipientAddress: string;
  amount: string;
  timestamp: Date;
  type?: string;
}



export interface SystemInfo {
  totalSupply: string;
  totalMints: string;
  totalBurns: string;
  totalTransfers: string;
}