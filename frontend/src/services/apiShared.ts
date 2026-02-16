// services/apiShared.ts (actualizado)
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type {
  ShareAsset,
  CreateShareAssetRequest,
  CreateShareAssetResponse,
  UpdateShareAssetAccountsRequest,
  UpdateShareAssetAccountsResponse,
  DisableShareAssetResponse,
  EnableShareAssetResponse,
  ReadShareAssetResponse,
  QuerySharedByUserResponse,
  QuerySharedWithMeResponse,
  CheckUserAccessResponse,
  QueryAllShareAssetsResponse,
  ShareAssetExistsResponse,
  VaultUser
} from '../types/sharedTypes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// ==================== INTERCEPTORS ====================

api.interceptors.request.use(
  (config) => {
    const vaultUser = localStorage.getItem('vaultUser');
    const vaultKey = localStorage.getItem('vaultKey');
    
    // Rutas públicas que no requieren autenticación
    const publicRoutes = [
      '/loans/create',
      '/loans/portfolio',
      '/loans/tx',
      '/share'
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

// ==================== HELPER: GET CURRENT USER ====================

export const getCurrentUser = (): VaultUser | null => {
  const vaultUserStr = localStorage.getItem('vaultUser');
  if (!vaultUserStr) return null;
  
  try {
    return JSON.parse(vaultUserStr) as VaultUser;
  } catch (error) {
    console.error('Error parsing vaultUser:', error);
    return null;
  }
};

// ==================== SHARED ASSET API FUNCTIONS ====================

/**
 * Crear un nuevo share asset
 */
export const createShareAsset = async (data: CreateShareAssetRequest): Promise<CreateShareAssetResponse> => {
  const response = await api.post('/share', data);
  return response.data;
};

/**
 * Leer un share asset por key
 */
export const readShareAsset = async (key: string): Promise<ShareAsset> => {
  const response = await api.get<ReadShareAssetResponse>(`/share/${key}`);
  return response.data.data;
};

/**
 * Actualizar cuentas con acceso a un share
 */
export const updateShareAssetAccounts = async (
  key: string,
  userId: string,
  sharedWithAddresses: string[]
): Promise<UpdateShareAssetAccountsResponse> => {
  const response = await api.put(`/share/${key}/accounts`, {
    userId,
    sharedWithAddresses
  });
  return response.data;
};

/**
 * Deshabilitar un share asset
 */
export const disableShareAsset = async (key: string, userId: string): Promise<DisableShareAssetResponse> => {
  const response = await api.post(`/share/${key}/disable`, { userId });
  return response.data;
};

/**
 * Habilitar un share asset
 */
export const enableShareAsset = async (key: string, userId: string): Promise<EnableShareAssetResponse> => {
  const response = await api.post(`/share/${key}/enable`, { userId });
  return response.data;
};

/**
 * Verificar acceso de un usuario a un share
 */
export const checkUserAccess = async (key: string, userId: string): Promise<CheckUserAccessResponse['data']> => {
  const response = await api.get<CheckUserAccessResponse>(`/share/${key}/access/${userId}`);
  return response.data.data;
};

/**
 * Obtener shares creados por un usuario
 */
export const querySharedByUser = async (userId: string): Promise<ShareAsset[]> => {
  const response = await api.get<QuerySharedByUserResponse>(`/share/by-user/${userId}`);
  return response.data.data;
};

/**
 * Obtener shares compartidos con un usuario
 */
export const querySharedWithMe = async (userId: string): Promise<ShareAsset[]> => {
  const response = await api.get<QuerySharedWithMeResponse>(`/share/with-me/${userId}`);
  return response.data.data;
};

/**
 * Obtener todos los shares (admin)
 */
export const queryAllShareAssets = async (): Promise<ShareAsset[]> => {
  const response = await api.get<QueryAllShareAssetsResponse>('/share/all');
  return response.data.data;
};

/**
 * Verificar si un share existe
 */
export const shareAssetExists = async (key: string): Promise<boolean> => {
  const response = await api.get<ShareAssetExistsResponse>(`/share/${key}/exists`);
  return response.data.data.exists;
};

// ==================== QUERY KEYS ====================

export const shareKeys = {
  all: ['shares'] as const,
  lists: () => [...shareKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...shareKeys.lists(), filters] as const,
  details: () => [...shareKeys.all, 'detail'] as const,
  detail: (key: string) => [...shareKeys.details(), key] as const,
  byUser: (userId: string) => [...shareKeys.all, 'by-user', userId] as const,
  withMe: (userId: string) => [...shareKeys.all, 'with-me', userId] as const,
  access: (key: string, userId: string) => [...shareKeys.all, 'access', key, userId] as const,
  exists: (key: string) => [...shareKeys.all, 'exists', key] as const,
};

// ==================== REACT QUERY HOOKS ====================

/**
 * Hook para obtener todos los shares
 */
export const useAllShareAssets = (enabled: boolean = true) => {
  return useQuery({
    queryKey: shareKeys.lists(),
    queryFn: queryAllShareAssets,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

/**
 * Hook para obtener un share específico por key
 */
export const useShareAsset = (key: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: shareKeys.detail(key),
    queryFn: () => readShareAsset(key),
    enabled: enabled && !!key,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook NUEVO para el SharedExplorer
 * Este hook busca un share asset por key cuando shouldSearch es true
 */
export const useShareAssetByKey = (key: string, shouldSearch: boolean = false) => {
  return useQuery({
    queryKey: shareKeys.detail(key),
    queryFn: () => readShareAsset(key),
    enabled: shouldSearch && !!key && key.trim() !== '',
    staleTime: 1000 * 60 * 5,
    retry: 1, // Solo reintentar una vez en caso de error
  });
};

/**
 * Hook para obtener shares creados por un usuario
 */
export const useSharedByUser = (userId?: string, enabled: boolean = true) => {
  const user = getCurrentUser();
  const effectiveUserId = userId || user?.uid;

  return useQuery({
    queryKey: shareKeys.byUser(effectiveUserId || ''),
    queryFn: () => querySharedByUser(effectiveUserId!),
    enabled: enabled && !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook para obtener shares compartidos con un usuario
 */
export const useSharedWithMe = (userId?: string, enabled: boolean = true) => {
  const user = getCurrentUser();
  const effectiveUserId = userId || user?.uid;

  return useQuery({
    queryKey: shareKeys.withMe(effectiveUserId || ''),
    queryFn: () => querySharedWithMe(effectiveUserId!),
    enabled: enabled && !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook para verificar acceso de usuario
 */
export const useCheckUserAccess = (key: string, userId?: string, enabled: boolean = true) => {
  const user = getCurrentUser();
  const effectiveUserId = userId || user?.uid;

  return useQuery({
    queryKey: shareKeys.access(key, effectiveUserId || ''),
    queryFn: () => checkUserAccess(key, effectiveUserId!),
    enabled: enabled && !!key && !!effectiveUserId,
    staleTime: 1000 * 60, // 1 minuto
  });
};

/**
 * Hook para verificar si un share existe
 */
export const useShareAssetExists = (key: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: shareKeys.exists(key),
    queryFn: () => shareAssetExists(key),
    enabled: enabled && !!key,
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: 1,
  });
};

// ==================== MUTATIONS ====================

/**
 * Mutation para crear share
 */
export const useCreateShareAsset = () => {
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  return useMutation({
    mutationFn: (data: Omit<CreateShareAssetRequest, 'userId'>) => {
      if (!user?.uid) {
        throw new Error('User not logged in');
      }
      return createShareAsset({
        ...data,
        userId: user.uid
      });
    },
    onSuccess: (response, variables) => {
      toast.success(`Share "${variables.key}" created successfully`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: shareKeys.lists() });
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: shareKeys.byUser(user.uid) });
      }
      queryClient.invalidateQueries({ queryKey: shareKeys.detail(variables.key) });
      queryClient.invalidateQueries({ queryKey: shareKeys.exists(variables.key) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to create share asset';
      toast.error(message);
      console.error('Create share error:', error);
    },
  });
};

/**
 * Mutation para actualizar cuentas
 */
export const useUpdateShareAssetAccounts = () => {
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  return useMutation({
    mutationFn: ({ key, sharedWithAddresses }: { key: string; sharedWithAddresses: string[] }) => {
      if (!user?.uid) {
        throw new Error('User not logged in');
      }
      return updateShareAssetAccounts(key, user.uid, sharedWithAddresses);
    },
    onSuccess: (response, variables) => {
      toast.success('Share accounts updated successfully');
      
      queryClient.invalidateQueries({ queryKey: shareKeys.detail(variables.key) });
      queryClient.invalidateQueries({ queryKey: shareKeys.lists() });
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: shareKeys.byUser(user.uid) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update share accounts';
      toast.error(message);
      console.error('Update share accounts error:', error);
    },
  });
};

/**
 * Mutation para deshabilitar share
 * Acepta solo el key, toma el userId del usuario actual
 */
export const useDisableShareAsset = () => {
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  return useMutation({
    mutationFn: (key: string) => {
      if (!user?.uid) {
        throw new Error('User not logged in');
      }
      return disableShareAsset(key, user.uid);
    },
    onSuccess: (response, key) => {
      toast.success('Share disabled successfully');
      
      queryClient.invalidateQueries({ queryKey: shareKeys.detail(key) });
      queryClient.invalidateQueries({ queryKey: shareKeys.lists() });
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: shareKeys.byUser(user.uid) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to disable share';
      toast.error(message);
      console.error('Disable share error:', error);
    },
  });
};

/**
 * Mutation para habilitar share
 * Acepta solo el key, toma el userId del usuario actual
 */
export const useEnableShareAsset = () => {
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  return useMutation({
    mutationFn: (key: string) => {
      if (!user?.uid) {
        throw new Error('User not logged in');
      }
      return enableShareAsset(key, user.uid);
    },
    onSuccess: (response, key) => {
      toast.success('Share enabled successfully');
      
      queryClient.invalidateQueries({ queryKey: shareKeys.detail(key) });
      queryClient.invalidateQueries({ queryKey: shareKeys.lists() });
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: shareKeys.byUser(user.uid) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to enable share';
      toast.error(message);
      console.error('Enable share error:', error);
    },
  });
};