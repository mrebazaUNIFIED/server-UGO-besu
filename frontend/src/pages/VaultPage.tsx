import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, type DefaultError } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import vaultLogo from '../assets/vault-logo.png';
import { FaSearch } from "react-icons/fa";

interface VaultUserInfo {
  uid: string;
  email: string;
  username: string;
  firstName: string;
  company: string;
}

export interface GraphQLError {
  message: string;
  extensions?: {
    remote?: {
      message: string;
    };
    schemaName?: string;
  };
}

interface GraphQLResponse {
  data: {
    getUserInfoWithToken: VaultUserInfo | null;
  };
  errors?: GraphQLError[];
}

export const VaultPage = () => {
  const [privateKey, setPrivateKey] = useState('');
  const navigate = useNavigate();

  // Verificar si ya hay una sesión activa al cargar
  useEffect(() => {
    const storedUser = localStorage.getItem('vaultUser');
    const storedKey = localStorage.getItem('vaultKey');

    if (storedUser && storedKey) {
      navigate('/vaulting');
    }
  }, [navigate]);

  const validateKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await axios.post<GraphQLResponse>(
        'https://fapi.myfci.com/graphql',
        {
          query: `{
            getUserInfoWithToken(bcApi:"none")
            {
              uid
              email
              username
              firstName
              company
            }
          }`
        },
        {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        const errorMessage = response.data.errors[0].message;
        throw new Error(errorMessage);
      }

      if (!response.data.data.getUserInfoWithToken) {
        throw new Error('Invalid Private Key or unauthorized access.');
      }

      return response.data.data.getUserInfoWithToken;
    },
    onSuccess: (data) => {
      localStorage.setItem('vaultUser', JSON.stringify(data));
      localStorage.setItem('vaultKey', privateKey);

      toast.success(`Welcome ${data.firstName}!`);
      navigate('/vaulting');
    },
    onError: (error: DefaultError) => {
      console.error('Vault authentication error:', error);

      let errorMessage = 'Invalid Private Key. Please try again.';

      if (error.message) {
        if (error.message.includes('not authorized')) {
          errorMessage = 'You are not authorized to access this vault. Please verify your Private Key.';
        } else if (error.message.includes('Access denied')) {
          errorMessage = 'Access denied. Your key does not have the required permissions.';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, { autoClose: 5000 });
    }
  });

  const handleSearch = () => {
    if (!privateKey.trim()) {
      toast.warning('Please enter your Private FCI Key');
      return;
    }
    validateKeyMutation.mutate(privateKey);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">

      <div className="max-w-6xl w-full flex justify-start mb-10 gap-10">
        <button
          onClick={() => navigate('/explorer')}
          className="cursor-pointer px-5 py-2 bg-[#0280CC] text-white font-semibold rounded-lg shadow hover:bg-[#026cae] transition"
        >
          Blockchain Explorer
        </button>

        <button
          onClick={() => navigate('/share')}
          className="cursor-pointer px-5 py-2 bg-[#0280CC] text-white font-semibold rounded-lg shadow hover:bg-[#026cae] transition"
        >
          Share Loans
        </button>
      </div>


      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        <div className="flex flex-col space-y-8 text-center md:text-left w-full">
          <h1 className="text-center text-4xl font-extrabold text-[#0280CC] tracking-wide">
            VAULT
          </h1>

          <p className="text-gray-700 text-sm font-semibold leading-relaxed text-justify">
            Use your Private FCI Key to search your portfolio of assets housed on the blockchain.
            Select each individual asset to see their transaction history recorded on the blockchain,
            view or share your cNFT, or download the documents that are recorded in the IPFS blockchain.
          </p>

          {/* Barra de búsqueda */}
          <div className="flex flex-col w-full space-y-2">
            <div className="flex w-full">
              <input
                type="text"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Please insert your key to Search for Investor's Loans"
                className="flex-grow px-4 py-2 border border-blue-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                disabled={validateKeyMutation.isPending}
              />
              <button
                onClick={handleSearch}
                disabled={validateKeyMutation.isPending}
                className="cursor-pointer px-5 py-2 bg-[#0280CC] text-white font-semibold rounded-r-md hover:bg-[#026cae] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validateKeyMutation.isPending ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <FaSearch size={18} />
                )}
              </button>
            </div>

            {validateKeyMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                <p className="font-semibold">Authentication Failed</p>
                <p className="mt-1">
                  {validateKeyMutation.error instanceof Error
                    ? validateKeyMutation.error.message.includes('not authorized')
                      ? 'You are not authorized to access this vault. Please verify your Private Key.'
                      : validateKeyMutation.error.message.includes('Access denied')
                        ? 'Access denied. Your key does not have the required permissions.'
                        : 'Invalid Private Key. Please verify and try again.'
                    : 'An unexpected error occurred. Please try again.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <img
            src={vaultLogo}
            alt="FCI FINTECH Logo"
            className="w-[420px] md:w-[540px] h-auto"
          />
        </div>
      </div>
    </div>
  );
};
