// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { User  } from '../types/index';
import { login } from '../services/api';
import { toast } from 'react-toastify';

interface JwtPayload {
  userId: string;
  address: string;
  role: 'admin' | 'operator' | 'viewer';
  organization: string;
  exp?: number;
  iat?: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkTokenExpiration = (token: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (decoded.exp && decoded.exp < currentTime) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr && checkTokenExpiration(token)) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && !checkTokenExpiration(token)) {
        window.location.href = '/login';
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const signIn = async (address: string, password: string) => {
    try {
      const response = await login(address, password);
      
      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Set user state
        setUser(userData);
        
        toast.success(`Welcome back, ${userData.name}!`);
        return true;
      }
      
      toast.error('Login failed. Please try again.');
      return false;
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      return false;
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.info('Session successfully closed');
  };

  return { user, loading, signIn, signOut };
};