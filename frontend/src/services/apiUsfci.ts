import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GetBalanceResponse,
  MintRecordsResponse,
  BurnRecordsResponse,
  TransferRecordsResponse,
  TransactionRecordsResponse,
  WalletHistoryResponse,
  AvalancheMintRecordsResponse,
  AvalancheBurnRecordsResponse,
  AvalancheStatisticsResponse,
  AvalancheTransferRecordsResponse,
  AdminStatisticsResponse,
  SystemConfigResponse,
  AccountDetailsResponse,
  GenericActionResponse,
} from '../types/usfciTypes';
import { getUserByUserId, userKeys } from './apiUserRegistry';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const usfciKeys = {
  all: ['usfci'] as const,
  balance: (walletAddress: string) => [...usfciKeys.all, 'balance', walletAddress] as const,
  config: () => [...usfciKeys.all, 'admin', 'config'] as const,
  statistics: () => [...usfciKeys.all, 'admin', 'statistics'] as const,
  historyMints: () => [...usfciKeys.all, 'history', 'mints'] as const,
  historyBurns: () => [...usfciKeys.all, 'history', 'burns'] as const,
  historyTransfers: () => [...usfciKeys.all, 'history', 'transfers'] as const,
  myTransactions: (walletAddress: string) => [...usfciKeys.all, 'my-transactions', walletAddress] as const,
  walletDetails: (walletAddress: string) => [...usfciKeys.all, 'wallet', walletAddress] as const,
  walletHistory: (walletAddress: string) => [...usfciKeys.all, 'wallet-history', walletAddress] as const,
  walletMints: (walletAddress: string) => [...usfciKeys.all, 'wallet', walletAddress, 'mints'] as const,
  walletBurns: (walletAddress: string) => [...usfciKeys.all, 'wallet', walletAddress, 'burns'] as const,
  walletTransactions: (walletAddress: string) => [...usfciKeys.all, 'wallet', walletAddress, 'transactions'] as const,
  avalancheMints: () => [...usfciKeys.all, 'avalanche', 'history', 'mints'] as const,
  avalancheStatistics: () => [...usfciKeys.all, 'avalanche', 'statistics'] as const,
  avalancheTransfers: () => [...usfciKeys.all, 'avalanche', 'history', 'transfers'] as const,
  avalancheBurns: () => [...usfciKeys.all, 'avalanche', 'history', 'burns'] as const,
  avalancheBalance: (walletAddress: string) => [...usfciKeys.all, 'avalanche', 'balance', walletAddress] as const,
  avalancheWalletHistory: (walletAddress: string) => [...usfciKeys.all, 'avalanche', 'wallet-history', walletAddress] as const,
  allTransfers: () => [...usfciKeys.all, 'history', 'transfers'] as const,
};

// Functions
export const getWalletBalance = async (address: string): Promise<GetBalanceResponse> => (await api.get(`/usfci/wallet/${address}/balance`)).data;

// Admin
export const initLedger = async (privateKey: string): Promise<GenericActionResponse> => (await api.post('/usfci/admin/init', { privateKey })).data;
export const pauseLedger = async (privateKey: string): Promise<GenericActionResponse> => (await api.post('/usfci/admin/pause', { privateKey })).data;
export const unpauseLedger = async (privateKey: string): Promise<GenericActionResponse> => (await api.post('/usfci/admin/unpause', { privateKey })).data;
export const getSystemConfig = async (): Promise<SystemConfigResponse> => (await api.get('/usfci/admin/config')).data;
export const getStatistics = async (): Promise<AdminStatisticsResponse> => (await api.get('/usfci/admin/statistics')).data;

// Tokens
export const mintTokens = async (data: { walletAddress: string, amount: string, reserveProof: string }): Promise<GenericActionResponse> => (await api.post('/usfci/tokens/mint', data)).data;
export const burnTokens = async (data: { walletAddress: string, amount: string, reason: string }): Promise<GenericActionResponse> => (await api.post('/usfci/tokens/burn', data)).data;
export const transferTokens = async (data: { recipient: string, amount: string }): Promise<GenericActionResponse> => (await api.post('/usfci/tokens/transfer', data)).data;
export const bridgeToAvalanche = async (data: { targetAvalanche: string, amount: string }): Promise<GenericActionResponse> => (await api.post('/usfci/tokens/bridge-to-avalanche', data)).data;

// History
export const getAllMintRecords = async (): Promise<MintRecordsResponse> => (await api.get('/usfci/history/mints')).data;
export const getAllBurnRecords = async (): Promise<BurnRecordsResponse> => (await api.get('/usfci/history/burns')).data;
export const getAllTransferRecords = async (): Promise<TransferRecordsResponse> => (await api.get('/usfci/history/transfers')).data;
export const getMyTransactions = async (): Promise<TransactionRecordsResponse> => (await api.get('/usfci/history/my-transactions')).data;

// Wallet
export const registerWallet = async (data: { privateKey: string, mspId: string, userId: string, accountType: string }): Promise<GenericActionResponse> => (await api.post('/usfci/wallet/register', data)).data;
export const getAccountDetails = async (address: string): Promise<AccountDetailsResponse> => (await api.get(`/usfci/wallet/${address}`)).data;
export const getWalletCompleteHistory = async (address: string): Promise<WalletHistoryResponse> => (await api.get(`/usfci/wallet/${address}/history`)).data;
export const getMintHistory = async (address: string): Promise<MintRecordsResponse> => (await api.get(`/usfci/wallet/${address}/history/mints`)).data;
export const getBurnHistory = async (address: string): Promise<BurnRecordsResponse> => (await api.get(`/usfci/wallet/${address}/history/burns`)).data;
export const getTransactionHistory = async (address: string): Promise<TransactionRecordsResponse> => (await api.get(`/usfci/wallet/${address}/history/transactions`)).data;
export const updateComplianceStatus = async (address: string, data: { kycStatus: string, riskScore: number }): Promise<GenericActionResponse> => (await api.put(`/usfci/wallet/${address}/compliance`, data)).data;

// Avalanche
export const mintAvalanche = async (data: { recipient: string, amount: string, reserveProof: string }): Promise<GenericActionResponse> => (await api.post('/usfci/avalanche/mint', data)).data;
export const bridgeToBesuFromAvalanche = async (data: { targetBesu: string, amount: string }): Promise<GenericActionResponse> => (await api.post('/usfci/avalanche/bridge-to-besu', data)).data;
export const transferAvalanche = async (data: { recipient: string, amount: string }): Promise<GenericActionResponse> => (await api.post('/usfci/avalanche/transfer', data)).data;
export const getAvalancheBalance = async (address: string): Promise<any> => (await api.get(`/usfci/avalanche/balance/${address}`)).data;
export const getAvalancheStatistics = async (): Promise<AvalancheStatisticsResponse> => (await api.get('/usfci/avalanche/statistics')).data;
export const getAvalancheMintRecords = async (): Promise<AvalancheMintRecordsResponse> => (await api.get('/usfci/avalanche/history/mints')).data;
export const getAvalancheTransferRecords = async (): Promise<AvalancheTransferRecordsResponse> => (await api.get('/usfci/avalanche/history/transfers')).data;
export const getAvalancheBurnRecords = async (): Promise<AvalancheBurnRecordsResponse> => (await api.get('/usfci/avalanche/history/burns')).data;
export const getAvalancheWalletHistory = async (address: string): Promise<WalletHistoryResponse> => (await api.get(`/usfci/avalanche/wallet/${address}/history`)).data;

// Hooks
export const useWalletBalance = (uid: string) => {
  const { data: userData } = useQuery({
    queryKey: userKeys.user(uid),
    queryFn: () => getUserByUserId(uid),
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
  });
  const walletAddress = userData?.data?.walletAddress ?? '';
  const { data: balanceData, isLoading, refetch } = useQuery({
    queryKey: usfciKeys.balance(walletAddress),
    queryFn: () => getWalletBalance(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 2,
  });
  return { walletAddress, balance: balanceData?.data?.balance ?? '0', isLoading, refetch };
};

export const useStatistics = () => useQuery({ 
  queryKey: usfciKeys.statistics(), 
  queryFn: getStatistics,
  staleTime: 1000 * 60 * 5 
});

export const useSystemConfig = () => useQuery({ 
  queryKey: usfciKeys.config(), 
  queryFn: getSystemConfig,
  staleTime: 1000 * 60 * 60 
});

export const useAccountDetails = (address: string) => useQuery({
  queryKey: usfciKeys.walletDetails(address),
  queryFn: () => getAccountDetails(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 5
});

export const useWalletCompleteHistory = (address: string) => useQuery({
  queryKey: usfciKeys.walletHistory(address),
  queryFn: () => getWalletCompleteHistory(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 2
});

export const useWalletMintHistory = (address: string) => useQuery({
  queryKey: usfciKeys.walletMints(address),
  queryFn: () => getMintHistory(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 5
});

export const useWalletBurnHistory = (address: string) => useQuery({
  queryKey: usfciKeys.walletBurns(address),
  queryFn: () => getBurnHistory(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 5
});

export const useWalletTransactionHistory = (address: string) => useQuery({
  queryKey: usfciKeys.walletTransactions(address),
  queryFn: () => getTransactionHistory(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 5
});

export const useAllMintRecords = () => useQuery({
  queryKey: usfciKeys.historyMints(),
  queryFn: getAllMintRecords,
  staleTime: 1000 * 60 * 5
});

export const useAllBurnRecords = () => useQuery({
  queryKey: usfciKeys.historyBurns(),
  queryFn: getAllBurnRecords,
  staleTime: 1000 * 60 * 5
});

export const useAllTransferRecords = (isAdmin: boolean) => useQuery({
  queryKey: usfciKeys.allTransfers(),
  queryFn: getAllTransferRecords,
  enabled: isAdmin,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
});

export const useMyTransactions = (address: string) => useQuery({
  queryKey: usfciKeys.myTransactions(address),
  queryFn: getMyTransactions,
  enabled: !!address,
  staleTime: 1000 * 60 * 5
});

// Avalanche Hooks
export const useBalance = (address: string) => useQuery({
  queryKey: usfciKeys.balance(address),
  queryFn: () => getWalletBalance(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 2,
});

export const useAvalancheBalance = (address: string) => useQuery({
  queryKey: usfciKeys.avalancheBalance(address),
  queryFn: () => getAvalancheBalance(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 2
});

export const useAvalancheStatistics = () => useQuery({
  queryKey: usfciKeys.avalancheStatistics(),
  queryFn: getAvalancheStatistics,
  staleTime: 1000 * 60 * 5
});

export const useAvalancheMintRecords = () => useQuery({
  queryKey: usfciKeys.avalancheMints(),
  queryFn: getAvalancheMintRecords,
  staleTime: 1000 * 60 * 5
});

export const useAvalancheBurnRecords = () => useQuery({
  queryKey: usfciKeys.avalancheBurns(),
  queryFn: getAvalancheBurnRecords,
  staleTime: 1000 * 60 * 5
});

export const useAvalancheTransferRecords = (isAdmin: boolean) => useQuery({
  queryKey: usfciKeys.avalancheTransfers(),
  queryFn: getAvalancheTransferRecords,
  enabled: isAdmin,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
});

export const useAvalancheWalletHistory = (address: string) => useQuery({
  queryKey: usfciKeys.avalancheWalletHistory(address),
  queryFn: () => getAvalancheWalletHistory(address),
  enabled: !!address,
  staleTime: 1000 * 60 * 2
});

// Mutation Hooks
export const useMintTokensMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mintTokens,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usfciKeys.all });
    },
  });
};

export const useBurnTokensMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: burnTokens,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usfciKeys.all });
    },
  });
};

export const useTransferTokensMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transferTokens,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usfciKeys.all });
    },
  });
};

export const useBridgeToAvalancheMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bridgeToAvalanche,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usfciKeys.all });
    },
  });
};

export const useMintAvalancheMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mintAvalanche,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usfciKeys.all });
    },
  });
};

export const useBridgeToBesuMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bridgeToBesuFromAvalanche,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usfciKeys.all });
    },
  });
};

export const useTransferAvalancheMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transferAvalanche,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usfciKeys.all });
    },
  });
};