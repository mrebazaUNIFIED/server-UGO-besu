// ==================== BALANCE ====================

export interface WalletBalance {
  balance: string;
}

export interface GetBalanceResponse {
  success: boolean;
  data: WalletBalance;
}