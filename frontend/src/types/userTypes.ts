// ==================== REQUEST TYPES ====================

export interface RegisterUserRequest {
  userId: string;
  name: string;
  organization: string;
  role: string;
  walletAddress?: string;
  initialBalance?: string;
}

// ==================== RESPONSE TYPES ====================

export interface RegisterUserData {
  walletAddress: string;
  userId: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  generatedWallet: boolean;
  privateKey?: string;
  kycStatus: string;
}

export interface RegisterUserResponse {
  success: boolean;
  data: RegisterUserData;
}

export interface User {
  userId: string;
  name: string;
  organization: string;
  role: string;
  walletAddress: string;
  registeredAt: string;
  isActive: boolean;
}

export interface GetUserResponse {
  success: boolean;
  data: User;
}