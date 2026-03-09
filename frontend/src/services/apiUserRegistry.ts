import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type {
  RegisterUserRequest,
  RegisterUserResponse,
  GetUserResponse
} from '../types/userTypes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// ==================== API FUNCTIONS ====================

export const registerUser = async (
  data: RegisterUserRequest
): Promise<RegisterUserResponse> => {
  const response = await api.post('/users', data);
  return response.data;
};

export const getUserByUserId = async (
  userId: string
): Promise<GetUserResponse> => {
  const response = await api.get(`/users/id/${userId}`);
  return response.data;
};

// ==================== QUERY KEYS ====================

export const userKeys = {
  all: ['users'] as const,
  user: (userId: string) => [...userKeys.all, userId] as const,
};

// ==================== HOOKS ====================

export const useGetUserByUserId = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: userKeys.user(userId),
    queryFn: () => getUserByUserId(userId),
    enabled: enabled && !!userId,
    staleTime: Infinity,      
    gcTime: 1000 * 60 * 60,    
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,   
    retry: 1,
  });
};

export const useRegisterUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterUserRequest) => registerUser(data),
    onSuccess: (response) => {
      toast.success(`User registered successfully`);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to register user';
      toast.error(message);
    },
  });
};