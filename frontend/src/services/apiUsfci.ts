import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import type { GetBalanceResponse } from '../types/usfciTypes';
import { getUserByUserId } from './apiUserRegistry';
import { userKeys } from './apiUserRegistry';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ==================== QUERY KEYS ====================

export const usfciKeys = {
  all: ['usfci'] as const,
  balance: (walletAddress: string) => [...usfciKeys.all, 'balance', walletAddress] as const,
};

// ==================== API FUNCTIONS ====================

export const getWalletBalance = async (
  walletAddress: string
): Promise<GetBalanceResponse> => {
  const response = await api.get(`/usfci/wallet/${walletAddress}/balance`);
  return response.data;
};

// ==================== HOOKS ====================

/**
 * Dado el uid de sesión:
 * 1. Busca el usuario en blockchain para obtener su walletAddress
 * 2. Con esa wallet consulta el balance
 */
export const useWalletBalance = (uid: string) => {
  // Paso 1: obtener walletAddress desde el userId (uid)
  const {
    data: userData,
    isLoading: loadingUser,
    isError: userError,
  } = useQuery({
    queryKey: userKeys.user(uid),
    queryFn: () => getUserByUserId(uid),
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const walletAddress = userData?.data?.walletAddress ?? '';

  // Paso 2: obtener balance con la wallet (solo corre si tenemos walletAddress)
  const {
    data: balanceData,
    isLoading: loadingBalance,
    isError: balanceError,
    refetch,
  } = useQuery({
    queryKey: usfciKeys.balance(walletAddress),
    queryFn: () => getWalletBalance(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 2, // 2 minutos
    retry: 1,
  });

  return {
    walletAddress,
    balance: balanceData?.data?.balance ?? '0',
    isLoading: loadingUser || loadingBalance,
    isError: userError || balanceError,
    refetch,
  };
};