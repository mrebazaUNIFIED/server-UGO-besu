import { useMemo } from 'react';
import { useGetUserByUserId, useRegisterUser } from '../services/apiUserRegistry';

export const useAutoRegisterUser = () => {
  // Leer localStorage una sola vez, no en cada render
  const { uid, firstName } = useMemo(() => {
    const raw = localStorage.getItem('vaultUser');
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      uid: parsed?.uid ?? '',
      firstName: parsed?.firstName ?? '',
    };
  }, []); // [] → solo se ejecuta al montar

  const {
    isError: userNotFound,
    isSuccess: alreadyExists,
    isLoading: checking,
  } = useGetUserByUserId(uid, !!uid);

  const { mutate: register, isPending: registering, isSuccess: justRegistered } = useRegisterUser();

  const handleRegister = () => {
    if (!uid || !firstName) return;
    register({
      userId: uid,
      name: firstName,
      organization: 'FCI',
      role: 'operator',
      initialBalance: '0',
    });
  };

  return {
    checking,
    userNotFound,
    alreadyExists,
    registering,
    justRegistered,
    handleRegister,
    firstName,
  };
};