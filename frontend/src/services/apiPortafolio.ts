import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type {
  PortfolioCertificate,
  PortfolioCertificateWithDetails,
  GeneratePortfolioCertificateRequest,
  CreatePortfolioCertificateRequest,
  UpdatePortfolioCertificateRequest,
  PortfolioCertificateResponse,
  PortfolioCertificateTxIdResponse,
  PortfolioCertificateValidation,
  PortfolioCertificateHistoryEntry
} from '../types/portafolio';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para manejo de autenticación (si lo necesitas)
api.interceptors.request.use(
  (config) => {
    const vaultUser = localStorage.getItem('vaultUser');
    const vaultKey = localStorage.getItem('vaultKey');

    // Rutas públicas del portfolio (ajusta según necesites)
    const publicRoutes = [
      '/portfolio/generate',
      '/portfolio/create',
      '/portfolio/update'
    ];

    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));

    if (!isPublicRoute) {
      if (!vaultUser || !vaultKey) {
        toast.error('Please log in to access this resource.');
        window.location.href = '/vault';
        return Promise.reject(new Error('Not authenticated'));
      }
    }

    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired. Please log in again.');
      localStorage.removeItem('vaultUser');
      localStorage.removeItem('vaultKey');
      window.location.href = '/vault';
    }
    console.error('Response Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

// ==================== PORTFOLIO API FUNCTIONS ====================

/**
 * Genera o actualiza el certificado automáticamente desde los loans del usuario
 */
export const generatePortfolioCertificate = async (
  data: GeneratePortfolioCertificateRequest
): Promise<PortfolioCertificateResponse> => {
  const response = await api.post('/portfolio/generate', data);
  return response.data;
};

/**
 * Crea un certificado de portafolio manualmente
 */
export const createPortfolioCertificate = async (
  data: CreatePortfolioCertificateRequest
): Promise<PortfolioCertificateResponse> => {
  const response = await api.post('/portfolio/create', data);
  return response.data;
};

/**
 * Actualiza un certificado de portafolio existente
 */
export const updatePortfolioCertificate = async (
  data: UpdatePortfolioCertificateRequest
): Promise<PortfolioCertificateResponse> => {
  const response = await api.put('/portfolio/update', data);
  return response.data;
};

/**
 * Obtiene el certificado de portafolio (solo con IDs de loans)
 */
export const getPortfolioCertificate = async (
  userId: string
): Promise<PortfolioCertificate> => {
  const response = await api.get(`/portfolio/${userId}`);
  return response.data;
};

/**
 * Obtiene el certificado CON detalles completos de cada loan
 */
export const getPortfolioCertificateWithDetails = async (
  userId: string
): Promise<PortfolioCertificateWithDetails> => {
  const response = await api.get(`/portfolio/${userId}/details`);
  return response.data;
};

/**
 * Obtiene solo el TxId del certificado
 */
export const getPortfolioCertificateTxId = async (
  userId: string
): Promise<PortfolioCertificateTxIdResponse> => {
  const response = await api.get(`/portfolio/${userId}/txid`);
  return response.data;
};

/**
 * Valida si el certificado está sincronizado con los loans actuales
 */
export const validatePortfolioCertificate = async (
  userId: string
): Promise<PortfolioCertificateValidation> => {
  const response = await api.get(`/portfolio/${userId}/validate`);
  return response.data;
};

/**
 * Obtiene el historial de cambios del certificado
 */
export const getPortfolioCertificateHistory = async (
  userId: string
): Promise<PortfolioCertificateHistoryEntry[]> => {
  const response = await api.get(`/portfolio/${userId}/history`);
  return response.data;
};

// ==================== QUERY KEYS ====================
export const portfolioKeys = {
  all: ['portfolio'] as const,
  portfolios: () => [...portfolioKeys.all, 'list'] as const,
  portfolio: (userId: string) => [...portfolioKeys.all, userId] as const,
  portfolioDetails: (userId: string) => [...portfolioKeys.portfolio(userId), 'details'] as const,
  portfolioTxId: (userId: string) => [...portfolioKeys.portfolio(userId), 'txid'] as const,
  portfolioValidation: (userId: string) => [...portfolioKeys.portfolio(userId), 'validation'] as const,
  portfolioHistory: (userId: string) => [...portfolioKeys.portfolio(userId), 'history'] as const,
};

// ==================== REACT QUERY HOOKS - QUERIES ====================

/**
 * Hook para obtener el certificado de portafolio (solo IDs)
 */
export const usePortfolioCertificate = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: portfolioKeys.portfolio(userId),
    queryFn: () => getPortfolioCertificate(userId),
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1, // Solo reintentar una vez si no existe
  });
};

/**
 * Hook para obtener el certificado CON detalles completos de loans
 */
export const usePortfolioCertificateWithDetails = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: portfolioKeys.portfolioDetails(userId),
    queryFn: () => getPortfolioCertificateWithDetails(userId),
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

/**
 * Hook para obtener solo el TxId del certificado
 */
export const usePortfolioCertificateTxId = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: portfolioKeys.portfolioTxId(userId),
    queryFn: () => getPortfolioCertificateTxId(userId),
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

/**
 * Hook para validar si el certificado está sincronizado
 */
export const usePortfolioCertificateValidation = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: portfolioKeys.portfolioValidation(userId),
    queryFn: () => validatePortfolioCertificate(userId),
    enabled: enabled && !!userId,
    staleTime: 0, // Siempre fresh - queremos la validación más reciente
    retry: 1,
  });
};

/**
 * Hook para obtener el historial del certificado
 */
export const usePortfolioCertificateHistory = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: portfolioKeys.portfolioHistory(userId),
    queryFn: () => getPortfolioCertificateHistory(userId),
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

// ==================== REACT QUERY HOOKS - MUTATIONS ====================

/**
 * Mutation para generar/actualizar certificado automáticamente
 * ⭐ ESTE ES EL QUE MÁS USARÁS
 */
export const useGeneratePortfolioCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GeneratePortfolioCertificateRequest) => 
      generatePortfolioCertificate(data),
    onSuccess: (response, variables) => {
      const action = response.action || 'generated';
      toast.success(`Portfolio certificate ${action} successfully`);

      // Invalidar todas las queries relacionadas con este usuario
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolio(variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolioDetails(variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolioTxId(variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolioValidation(variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolioHistory(variables.userId) 
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to generate portfolio certificate';
      toast.error(message);
    },
  });
};

/**
 * Mutation para crear un certificado manualmente
 */
export const useCreatePortfolioCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePortfolioCertificateRequest) => 
      createPortfolioCertificate(data),
    onSuccess: (response, variables) => {
      toast.success(`Portfolio certificate created for user ${variables.userId}`);

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolio(variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolios() 
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to create portfolio certificate';
      toast.error(message);
    },
  });
};

/**
 * Mutation para actualizar un certificado existente
 */
export const useUpdatePortfolioCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePortfolioCertificateRequest) => 
      updatePortfolioCertificate(data),
    onSuccess: (response, variables) => {
      toast.success(`Portfolio certificate updated for user ${variables.userId}`);

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolio(variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolioDetails(variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: portfolioKeys.portfolioTxId(variables.userId) 
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update portfolio certificate';
      toast.error(message);
    },
  });
};