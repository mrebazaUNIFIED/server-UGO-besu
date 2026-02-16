// src/services/api.ts
import axios from 'axios';
import type {
  AuthResponse,
  WalletRegistrationResponse,
  AccountDetails,
  BalanceResponse,
  TransactionRecord,
  MintRecord,
  BurnRecord,
  WalletCompleteHistory,
  TokenOperationResponse,
  SystemConfig,
  SystemStatistics,
  ApiResponse,
  KycData,
  OfacResponse
} from "../types/index"
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para añadir el token a las solicitudes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired. Please log in again.');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    console.error('Response Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const login = async (address: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', { address, password });
  return response.data;
};

// ==================== ADMIN ====================
export const initLedger = async (): Promise<ApiResponse> => {
  const response = await api.post<ApiResponse>('/usfci/admin/init');
  return response.data;
};

export const pauseContract = async (): Promise<ApiResponse> => {
  const response = await api.post<ApiResponse>('/usfci/admin/pause');
  return response.data;
};

export const unpauseContract = async (): Promise<ApiResponse> => {
  const response = await api.post<ApiResponse>('/usfci/admin/unpause');
  return response.data;
};

export const getSystemConfig = async (): Promise<ApiResponse<SystemConfig>> => {
  const response = await api.get<ApiResponse<SystemConfig>>('/usfci/admin/config');
  return response.data;
};

export const getStatistics = async (): Promise<ApiResponse<SystemStatistics>> => {
  const response = await api.get<ApiResponse<SystemStatistics>>('/usfci/admin/statistics');
  return response.data;
};

// ==================== WALLET MANAGEMENT ====================
export const registerWallet = async (
  mspId: string,
  userId: string,
  accountType: string = 'corporate'
): Promise<WalletRegistrationResponse> => {
  const response = await api.post<WalletRegistrationResponse>('/usfci/wallet/register', {
    mspId,
    userId,
    accountType
  });
  return response.data;
};

export const getAccountDetails = async (walletAddress: string): Promise<ApiResponse<AccountDetails>> => {
  const response = await api.get<ApiResponse<AccountDetails>>(`/usfci/wallet/${walletAddress}`);
  return response.data;
};

export const getBalance = async (walletAddress: string): Promise<ApiResponse<BalanceResponse>> => {
  const response = await api.get<ApiResponse<BalanceResponse>>(`/usfci/wallet/${walletAddress}/balance`);
  return response.data;
};

// ==================== TOKEN OPERATIONS ====================
export const mintTokens = async (
  walletAddress: string,
  amount: string,
  reserveProof: string
): Promise<TokenOperationResponse> => {
  const response = await api.post<TokenOperationResponse>('/usfci/tokens/mint', {
    walletAddress,
    amount,
    reserveProof
  });
  return response.data;
};

export const burnTokens = async (
  walletAddress: string,
  amount: string,
  reason: string
): Promise<TokenOperationResponse> => {
  const response = await api.post<TokenOperationResponse>('/usfci/tokens/burn', {
    walletAddress,
    amount,
    reason
  });
  return response.data;
};

export const transfer = async (
  recipient: string,
  amount: string
): Promise<TokenOperationResponse> => {
  const response = await api.post<TokenOperationResponse>('/usfci/tokens/transfer', {
    recipient,
    amount
  });
  return response.data;
};

// ==================== TRANSACTIONS - HISTORY ====================
export const getAllMintRecords = async (): Promise<ApiResponse<MintRecord[]>> => {
  const response = await api.get<ApiResponse<MintRecord[]>>('/usfci/history/mints');
  return response.data;
};

export const getMintHistory = async (walletAddress: string): Promise<ApiResponse<MintRecord[]>> => {
  const response = await api.get<ApiResponse<MintRecord[]>>(`/usfci/wallet/${walletAddress}/history/mints`);
  return response.data;
};

export const getAllBurnRecords = async (): Promise<ApiResponse<BurnRecord[]>> => {
  const response = await api.get<ApiResponse<BurnRecord[]>>('/usfci/history/burns');
  return response.data;
};

export const getBurnHistory = async (walletAddress: string): Promise<ApiResponse<BurnRecord[]>> => {
  const response = await api.get<ApiResponse<BurnRecord[]>>(`/usfci/wallet/${walletAddress}/history/burns`);
  return response.data;
};

export const getAllTransferRecords = async (): Promise<ApiResponse<TransactionRecord[]>> => {
  const response = await api.get<ApiResponse<TransactionRecord[]>>('/usfci/history/transfers');
  return response.data;
};

export const getTransactionHistory = async (walletAddress: string): Promise<ApiResponse<TransactionRecord[]>> => {
  const response = await api.get<ApiResponse<TransactionRecord[]>>(`/usfci/wallet/${walletAddress}/history/transactions`);
  return response.data;
};

export const getMyTransactions = async (): Promise<ApiResponse<TransactionRecord[]>> => {
  const response = await api.get<ApiResponse<TransactionRecord[]>>('/usfci/history/my-transactions');
  return response.data;
};

export const getWalletCompleteHistory = async (walletAddress: string): Promise<ApiResponse<WalletCompleteHistory>> => {
  const response = await api.get<ApiResponse<WalletCompleteHistory>>(`/usfci/wallet/${walletAddress}/history`);
  return response.data;
};

// ==================== COMPLIANCE ====================
export const updateComplianceStatus = async (
  walletAddress: string,
  kycStatus: string,
  riskScore: string
): Promise<TokenOperationResponse> => {
  const response = await api.put<TokenOperationResponse>(
    `/usfci/wallet/${walletAddress}/compliance`,
    { kycStatus, riskScore }
  );
  return response.data;
};

export const updateKyc = async (data: KycData): Promise<ApiResponse> => {
  const response = await api.post<ApiResponse>('/compliance/kyc', data);
  return response.data;
};

export const checkOfac = async (account: string): Promise<OfacResponse> => {
  const response = await api.post<OfacResponse>('/compliance/ofac', { account });
  return response.data;
};

// ==================== LEGACY COMPATIBILITY ====================
// Estas funciones mantienen compatibilidad con tu código existente

export const getMyBalance = async (): Promise<{ balance: string }> => {
  // Asumiendo que el usuario actual está almacenado en localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) throw new Error('User not found');
  
  const user = JSON.parse(userStr);
  const response = await getBalance(user.address);
  return { balance: response.data?.balance || '0' };
};

export const getMyAccountDetails = async (): Promise<AccountDetails> => {
  const userStr = localStorage.getItem('user');
  if (!userStr) throw new Error('User not found');
  
  const user = JSON.parse(userStr);
  const response = await getAccountDetails(user.address);
  return response.data!;
};

export const getAllTransactions = async (): Promise<TransactionRecord[]> => {
  const response = await getAllTransferRecords();
  return response.data || [];
};

export const generateReserveReport = async (reportDate?: string): Promise<ApiResponse> => {
  // Implementar si tienes este endpoint
  const response = await api.post<ApiResponse>('/usfci/admin/reserve-report', {
    reportDate: reportDate || new Date().toISOString()
  });
  return response.data;
};

export const getSystemInfo = async (): Promise<ApiResponse> => {
  return await getSystemConfig();
};

// Exportar la instancia de axios para uso personalizado
export default api;