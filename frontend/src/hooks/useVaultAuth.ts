import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface VaultUser {
  uid: string;
  email: string;
  username: string;
  firstName: string;
  company: string;
}

export const useVaultAuth = () => {
  const [vaultUser, setVaultUser] = useState<VaultUser | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('vaultUser');
    const storedKey = localStorage.getItem('vaultKey');

    if (storedUser && storedKey) {
      try {
        setVaultUser(JSON.parse(storedUser));
        setVaultKey(storedKey);
      } catch (error) {
        console.error('Error parsing vault user:', error);
        localStorage.removeItem('vaultUser');
        localStorage.removeItem('vaultKey');
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('vaultUser');
    localStorage.removeItem('vaultKey');
    setVaultUser(null);
    setVaultKey(null);
    navigate('/vault');
  };

  return {
    vaultUser,
    vaultKey,
    loading,
    logout,
    isAuthenticated: !!vaultUser && !!vaultKey
  };
};