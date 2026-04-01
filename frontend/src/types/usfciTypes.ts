// ==================== BALANCE ====================

export interface WalletBalance {
  balance: string;
}

export interface GetBalanceResponse {
  success: boolean;
  data: WalletBalance;
}

// ==================== SYSTEM & ADMIN ====================

export interface SystemConfig {
  tokenName: string;
  tokenSymbol: string;
  maxTransactionAmount: string;
  maxDailyTransactionAmount: string;
  dailyReserveReportRequired: boolean;
  reserveBank: string;
  complianceEnabled: boolean;
}

export interface AdminStatistics {
  totalMints: string;
  totalBurns: string;
  totalTransfers: string;
  totalSupply: string;
}

export interface AccountDetails {
  mspId: string;
  userId: string;
  frozenBalance: string;
  lastActivity: string;
  kycStatus: string;
  riskScore: number;
  accountType: string;
  exists: boolean;
}

// ==================== HISTORY ====================

export interface MintRecord {
  recipientAddress: string;
  recipientMspId: string;
  amount: string;
  reserveProof: string;
  timestamp: string;
  minter: string;
}

export interface BurnRecord {
  burnerAddress: string;
  burnerMspId: string;
  amount: string;
  reason: string;
  timestamp: string;
}

export interface TransferRecord {
  senderAddress: string;
  senderMspId: string;
  recipientAddress: string;
  recipientMspId: string;
  amount: string;
  metadata: string;
  timestamp: string;
  settlementType: number;
}

export interface TransactionRecord extends TransferRecord {
  type: 'sent' | 'received';
}

export interface SummaryHistory {
  totalMints: number;
  totalBurns: number;
  totalTransactions: number;
}

export interface WalletHistory {
  mints: MintRecord[];
  burns: BurnRecord[];
  transactions: TransactionRecord[];
  summary: SummaryHistory;
}

export interface AvalancheMintRecord {
  recipientAddress: string;
  recipientMspId: string;
  amount: string;
  reserveProof: string;
  timestamp: string;
  minter: string;
}

export interface AvalancheBurnRecord {
  burnerAddress: string;
  burnerMspId: string;
  amount: string;
  reason: string;
  timestamp: string;
}

export interface AvalancheStatistics {
  totalMints: string;
  totalBurns: string;
  currentSupply: string;
  network: string;
}

export interface AvalancheTransferRecord {
  senderAddress: string;
  recipientAddress: string;
  amount: string;
  timestamp: string;
  network: string;
  txHash: string;
}

// ==================== RESPONSES ====================

export interface USFCIResponse<T> {
  success: boolean;
  data: T;
}

export type MintRecordsResponse = USFCIResponse<MintRecord[]>;
export type BurnRecordsResponse = USFCIResponse<BurnRecord[]>;
export type TransferRecordsResponse = USFCIResponse<TransferRecord[]>;
export type TransactionRecordsResponse = USFCIResponse<TransactionRecord[]>;
export type WalletHistoryResponse = USFCIResponse<WalletHistory>;
export type AvalancheMintRecordsResponse = USFCIResponse<AvalancheMintRecord[]>;
export type AvalancheBurnRecordsResponse = USFCIResponse<AvalancheBurnRecord[]>;
export type AvalancheStatisticsResponse = USFCIResponse<AvalancheStatistics>;
export type AvalancheTransferRecordsResponse = USFCIResponse<AvalancheTransferRecord[]>;
export type SystemConfigResponse = USFCIResponse<SystemConfig>;
export type AdminStatisticsResponse = USFCIResponse<AdminStatistics>;
export type AccountDetailsResponse = USFCIResponse<AccountDetails>;
export type GenericActionResponse = USFCIResponse<{
  success: boolean;
  txHash: string;
  blockNumber: number;
  gasUsed?: string;
}>;