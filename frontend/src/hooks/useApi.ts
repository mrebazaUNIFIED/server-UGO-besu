// src/hooks/useApi.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  // Admin
  initLedger,
  pauseContract,
  unpauseContract,
  getSystemConfig,
  getStatistics,
  // Wallet
  registerWallet,
  getAccountDetails,
  getBalance,
  // Token Operations
  mintTokens,
  burnTokens,
  transfer,
  // History
  getAllMintRecords,
  getMintHistory,
  getAllBurnRecords,
  getBurnHistory,
  getAllTransferRecords,
  getTransactionHistory,
  getMyTransactions,
  getWalletCompleteHistory,
  // Compliance
  updateComplianceStatus,
  updateKyc,
  checkOfac,
  // Legacy
  getMyBalance,
  getMyAccountDetails,
  getAllTransactions,
  generateReserveReport,
  getSystemInfo,
} from "../services/api";

import type {
  AccountDetails,
  BalanceResponse,
  TransactionRecord,
  MintRecord,
  BurnRecord,
  WalletCompleteHistory,
  SystemConfig,
  SystemStatistics,
  KycData,
  OfacResponse,
  ApiResponse,
  User,
  SystemInfo,
} from "../types";

// ==================== ADMIN HOOKS ====================
export const useInitLedger = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error>({
    mutationFn: initLedger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemConfig"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
};

export const usePauseContract = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error>({
    mutationFn: pauseContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemConfig"] });
    },
  });
};

export const useUnpauseContract = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error>({
    mutationFn: unpauseContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemConfig"] });
    },
  });
};

export const useSystemConfig = () => {
  return useQuery<ApiResponse<SystemConfig>, Error>({
    queryKey: ["systemConfig"],
    queryFn: getSystemConfig,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });
};

export const useStatistics = () => {
  return useQuery<ApiResponse<SystemStatistics>, Error>({
    queryKey: ["statistics"],
    queryFn: getStatistics,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 2, // Auto-refresh cada 2 minutos
  });
};

// ==================== WALLET HOOKS ====================
export const useRegisterWallet = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { mspId: string; userId: string; accountType?: string }>({
    mutationFn: ({ mspId, userId, accountType = "corporate" }) => 
      registerWallet(mspId, userId, accountType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBalance"] });
      queryClient.invalidateQueries({ queryKey: ["myAccountDetails"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
};

export const useAccountDetails = (walletAddress?: string) => {
  return useQuery<ApiResponse<AccountDetails>, Error>({
    queryKey: ["accountDetails", walletAddress],
    queryFn: () => getAccountDetails(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

export const useMyAccountDetails = () => {
  return useQuery<AccountDetails, Error>({
    queryKey: ["myAccountDetails"],
    queryFn: getMyAccountDetails,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });
};

export const useBalance = (walletAddress?: string) => {
  return useQuery<ApiResponse<BalanceResponse>, Error>({
    queryKey: ["balance", walletAddress],
    queryFn: () => getBalance(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Auto-refresh cada minuto
  });
};

export const useMyBalance = () => {
  return useQuery<{ balance: string }, Error>({
    queryKey: ["myBalance"],
    queryFn: getMyBalance,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Auto-refresh cada minuto
    retry: 2,
  });
};

export const useMyWalletAddress = () => {
  return useQuery<string, Error>({
    queryKey: ["myWalletAddress"],
    queryFn: () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('User not found');
      
      const user = JSON.parse(userStr) as User;
      if (!user.address) throw new Error('Wallet address not found');
      
      return user.address;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
};


// ==================== TOKEN OPERATIONS HOOKS ====================
export const useMintTokens = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { walletAddress: string; amount: string; reserveProof: string }>({
    mutationFn: ({ walletAddress, amount, reserveProof }) => 
      mintTokens(walletAddress, amount, reserveProof),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["myBalance"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      queryClient.invalidateQueries({ queryKey: ["mintRecords"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useBurnTokens = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { walletAddress: string; amount: string; reason: string }>({
    mutationFn: ({ walletAddress, amount, reason }) => 
      burnTokens(walletAddress, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["myBalance"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      queryClient.invalidateQueries({ queryKey: ["burnRecords"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { recipient: string; amount: string }>({
    mutationFn: ({ recipient, amount }) => transfer(recipient, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["myBalance"] });
      queryClient.invalidateQueries({ queryKey: ["myTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
};

// ==================== HISTORY HOOKS ====================
export const useAllMintRecords = () => {
  return useQuery<ApiResponse<MintRecord[]>, Error>({
    queryKey: ["mintRecords", "all"],
    queryFn: getAllMintRecords,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useMintHistory = (walletAddress?: string) => {
  return useQuery<ApiResponse<MintRecord[]>, Error>({
    queryKey: ["mintRecords", walletAddress],
    queryFn: () => getMintHistory(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useAllBurnRecords = () => {
  return useQuery<ApiResponse<BurnRecord[]>, Error>({
    queryKey: ["burnRecords", "all"],
    queryFn: getAllBurnRecords,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useBurnHistory = (walletAddress?: string) => {
  return useQuery<ApiResponse<BurnRecord[]>, Error>({
    queryKey: ["burnRecords", walletAddress],
    queryFn: () => getBurnHistory(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useAllTransferRecords = () => {
  return useQuery<ApiResponse<TransactionRecord[]>, Error>({
    queryKey: ["transactions", "all"],
    queryFn: getAllTransferRecords,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useTransactionHistory = (walletAddress?: string) => {
  return useQuery<ApiResponse<TransactionRecord[]>, Error>({
    queryKey: ["transactions", walletAddress],
    queryFn: () => getTransactionHistory(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useMyTransactions = () => {
  return useQuery<ApiResponse<TransactionRecord[]>, Error>({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    staleTime: 1000 * 60, // 1 minuto
    refetchInterval: 1000 * 60 * 2, // Auto-refresh cada 2 minutos
  });
};

export const useWalletCompleteHistory = (walletAddress?: string) => {
  return useQuery<ApiResponse<WalletCompleteHistory>, Error>({
    queryKey: ["walletHistory", walletAddress],
    queryFn: () => getWalletCompleteHistory(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

// ==================== COMPLIANCE HOOKS ====================
export const useUpdateComplianceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { walletAddress: string; kycStatus: string; riskScore: string }>({
    mutationFn: ({ walletAddress, kycStatus, riskScore }) => 
      updateComplianceStatus(walletAddress, kycStatus, riskScore),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accountDetails", variables.walletAddress] });
    },
  });
};

export const useUpdateKyc = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error, KycData>({
    mutationFn: updateKyc,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accountDetails", variables.walletAddress] });
    },
  });
};

export const useCheckOfac = () => {
  return useMutation<OfacResponse, Error, string>({
    mutationFn: checkOfac,
  });
};

// ==================== LEGACY COMPATIBILITY HOOKS ====================
export const useAllTransactions = () => {
  return useQuery<TransactionRecord[], Error>({
    queryKey: ["allTransactions"],
    queryFn: getAllTransactions,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useGenerateReserveReport = () => {
  return useMutation<ApiResponse, Error, string | undefined>({
    mutationFn: (reportDate) => generateReserveReport(reportDate),
  });
};

export const useSystemInfo = () => {
  return useQuery<ApiResponse<SystemInfo>, Error>({
    queryKey: ["systemInfo"],
    queryFn: getSystemInfo,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};
