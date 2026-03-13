import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type {
  Loan,
  CompactLoan,
  CreateLoanRequest,
  CreateLoanResponse,
  AllLoansResponse,
  LoanResponse,
  LoanExistsResponse,
  LoanHistoryWithChanges,
  LoanHistoryResponse,
  LoanByTxIdResponse,
  UpdateLoanPartialRequest,
  UpdateLoanPartialResponse,
  UpdateLockedLoanRequest,
  UpdateLockedLoanResponse,
  DeleteLoanResponse,
  LoansByLenderResponse,
  CountLoansByLenderResponse,
  TotalLoansCountResponse,
  LoanByAccountResponse,
  GenerateLoanIdRequest,
  GenerateLoanIdResponse,
  LoanIsLockedResponse,
  LoanIsTokenizedResponse,
  AvalancheTokenIdResponse,
  CurrentTransactionResponse
} from '../types/vaultTypes';


/*Para el graph*/
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';



export const fetchPortfolioLoans = async (): Promise<Loan[]> => {
  const token = localStorage.getItem('vaultKey');
  if (!token) throw new Error('No authentication token found.');

  const response = await api.get('/loans/get/portfolio', {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data.data;
};


const api = axios.create({
  baseURL: `${API_URL}`,
  headers: { 'Content-Type': 'application/json' }
});



// ==================== INTERCEPTORS ====================
api.interceptors.request.use(
  (config) => {
    const vaultUser = localStorage.getItem('vaultUser');
    const vaultKey = localStorage.getItem('vaultKey');

    const publicRoutes = [
      '/loans',
    ];

    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));
    const isGetRequest = config.method === 'get';

    // Solo requerir auth para operaciones de escritura
    if (!isPublicRoute && !isGetRequest) {
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

// ==================== LOAN API FUNCTIONS ====================

/**
 * GET /loans
 * Obtener todos los loans (formato compacto)
 * Compatible con la interfaz original pero usando la nueva estructura
 */
export const queryAllLoans = async (): Promise<CompactLoan[]> => {
  const response = await api.get<AllLoansResponse>('/loans', {
    params: { fetchAll: true }
  });
  return response.data.data;
};

/**
 * POST /loans
 * Crear loan (compatible con interfaz original)
 * Nota: El backend ahora maneja crear/actualizar automáticamente
 */
export const createLoan = async (loanData: CreateLoanRequest): Promise<CreateLoanResponse> => {
  const response = await api.post<CreateLoanResponse>('/loans', loanData);
  return response.data;
};

/**
 * PUT /loans/:loanId (para compatibilidad)
 * Actualizar loan - redirige a POST que maneja todo automáticamente
 */
export const updateLoan = async (
  loanId: string,
  loanData: CreateLoanRequest
): Promise<CreateLoanResponse> => {
  // El backend maneja updates a través de POST con detección automática
  const response = await api.post<CreateLoanResponse>('/loans', loanData);
  return response.data;
};

/**
 * POST /loans
 * Crear o actualizar loan (inteligente - detecta automáticamente la operación)
 */
export const createOrUpdateLoan = async (loanData: CreateLoanRequest): Promise<CreateLoanResponse> => {
  const response = await api.post<CreateLoanResponse>('/loans', loanData);
  return response.data;
};

/**
 * PUT /loans/:loanId/partial
 * Actualizar loan parcialmente
 */
export const updateLoanPartial = async (
  loanId: string,
  fields: UpdateLoanPartialRequest['fields']
): Promise<UpdateLoanPartialResponse> => {
  const response = await api.put<UpdateLoanPartialResponse>(
    `/loans/${loanId}/partial`,
    { fields }
  );
  return response.data;
};

/**
 * PUT /loans/:loanId/locked
 * Actualizar loan bloqueado/tokenizado
 */
export const updateLockedLoan = async (
  loanId: string,
  data: UpdateLockedLoanRequest
): Promise<UpdateLockedLoanResponse> => {
  const response = await api.put<UpdateLockedLoanResponse>(
    `/loans/${loanId}/locked`,
    data
  );
  return response.data;
};

/**
 * GET /loans/:loanId
 * Obtener un loan por ID (detalle completo)
 */
export const readLoan = async (loanId: string): Promise<Loan> => {
  const response = await api.get<LoanResponse>(`/loans/${loanId}`);
  return response.data.data;
};

/**
 * GET /loans/by-uids/:lenderUid/:loanUid
 * Obtener loan por LenderUid + LoanUid
 */
export const getLoanByUids = async (
  lenderUid: string,
  loanUid: string
): Promise<LoanResponse> => {
  const response = await api.get<LoanResponse>(
    `/loans/by-uids/${lenderUid}/${loanUid}`
  );
  return response.data;
};

/**
 * GET /loans/lender/:lenderUid
 * Obtener loans de un lender
 */
export const getLoansByLenderUid = async (lenderUid: string): Promise<CompactLoan[]> => {
  const response = await api.get<LoansByLenderResponse>(`/loans/lender/${lenderUid}`);
  return response.data.data;
};

/**
 * GET /loans/lender/:lenderUid (alias para compatibilidad)
 * Obtener loans de un usuario/lender
 * Nota: Ahora usa LenderUid en lugar de UserID
 */
export const getMyLoans = async (lenderUid: string): Promise<CompactLoan[]> => {
  const response = await api.get<LoansByLenderResponse>(`/loans/lender/${lenderUid}`);
  return response.data.data;
};

/**
 * GET /loans/lender/:lenderUid/count
 * Contar loans de un lender
 */
export const countLoansByLenderUid = async (lenderUid: string): Promise<number> => {
  const response = await api.get<CountLoansByLenderResponse>(
    `/loans/lender/${lenderUid}/count`
  );
  return response.data.count;
};

/**
 * GET /loans/loanuid/:loanUid
 * Buscar loan por LoanUid
 */
export const findLoanByLoanUid = async (loanUid: string): Promise<Loan> => {
  const response = await api.get<LoanResponse>(`/loans/loanuid/${loanUid}`);
  return response.data.data;
};

/**
 * GET /loans/:loanId/exists
 * Verificar si un loan existe
 */
export const loanExists = async (loanId: string): Promise<boolean> => {
  const response = await api.get<LoanExistsResponse>(`/loans/${loanId}/exists`);
  return response.data.exists;
};

/**
 * GET /loans/uids/:lenderUid/:loanUid/exists
 * Verificar si existe loan por LenderUid + LoanUid
 */
export const loanExistsByUids = async (
  lenderUid: string,
  loanUid: string
): Promise<LoanExistsResponse> => {
  const response = await api.get<LoanExistsResponse>(
    `/loans/uids/${lenderUid}/${loanUid}/exists`
  );
  return response.data;
};

/**
 * GET /loans/:loanId/is-locked
 * Verificar si un loan está bloqueado
 */
export const isLoanLocked = async (loanId: string): Promise<boolean> => {
  const response = await api.get<LoanIsLockedResponse>(`/loans/${loanId}/is-locked`);
  return response.data.isLocked;
};

/**
 * GET /loans/:loanId/is-tokenized
 * Verificar si un loan está tokenizado
 */
export const isLoanTokenized = async (loanId: string): Promise<LoanIsTokenizedResponse> => {
  const response = await api.get<LoanIsTokenizedResponse>(`/loans/${loanId}/is-tokenized`);
  return response.data;
};

/**
 * GET /loans/:loanId/avalanche-token-id
 * Obtener token ID de Avalanche
 */
export const getAvalancheTokenId = async (loanId: string): Promise<string> => {
  const response = await api.get<AvalancheTokenIdResponse>(
    `/loans/${loanId}/avalanche-token-id`
  );
  return response.data.tokenId;
};

/**
 * GET /loans/:loanId/current-tx
 * Obtener transacción actual de un loan
 */
export const getCurrentTransaction = async (loanId: string): Promise<string> => {
  const response = await api.get<CurrentTransactionResponse>(
    `/loans/${loanId}/current-tx`
  );
  return response.data.currentTxId;
};

/**
 * GET /loans/:loanId/history
 * Obtener historial de un loan con cambios
 */
export const getLoanHistory = async (loanId: string): Promise<LoanHistoryWithChanges[]> => {
  const response = await api.get<LoanHistoryResponse>(`/loans/${loanId}/history`);
  return response.data.data;
};

/**
 * GET /loans/tx/:txId
 * Obtener loan por Transaction ID
 */
export const getLoanByTxId = async (txId: string): Promise<LoanByTxIdResponse> => {
  const response = await api.get<LoanByTxIdResponse>(`/loans/tx/${txId}`);
  return response.data;
};

/**
 * GET /loans/by-account/:lenderUid/:account
 * Buscar loan por LenderUid y Account
 */
export const getLoanByLenderAndAccount = async (
  lenderUid: string,
  account: string
): Promise<Loan> => {
  const response = await api.get<LoanByAccountResponse>(
    `/loans/by-account/${lenderUid}/${account}`
  );
  return response.data.data;
};

/**
 * GET /loans/count
 * Obtener conteo total de loans
 */
export const getTotalLoansCount = async (): Promise<number> => {
  const response = await api.get<TotalLoansCountResponse>('/loans/count');
  return response.data.totalCount;
};

/**
 * POST /loans/generate-id
 * Generar loanId a partir de LenderUid y LoanUid
 */
export const generateLoanId = async (
  lenderUid: string,
  loanUid: string
): Promise<GenerateLoanIdResponse> => {
  const response = await api.post<GenerateLoanIdResponse>('/loans/generate-id', {
    lenderUid,
    loanUid
  });
  return response.data;
};

/**
 * DELETE /loans/:loanId
 * Eliminar un loan (soft delete)
 */
export const deleteLoan = async (loanId: string): Promise<DeleteLoanResponse> => {
  const response = await api.delete<DeleteLoanResponse>(`/loans/${loanId}`);
  return response.data;
};

// ==================== QUERY KEYS ====================
export const vaultKeys = {
  all: ['vault'] as const,
  loans: () => [...vaultKeys.all, 'loans'] as const,
  allLoans: () => [...vaultKeys.loans(), 'all'] as const,
  // Mantener myLoans para compatibilidad (mapea a lenderLoans)
  myLoans: (lenderUid: string) => [...vaultKeys.loans(), 'my', lenderUid] as const,
  lenderLoans: (lenderUid: string) =>
    [...vaultKeys.loans(), 'lender', lenderUid] as const,
  lenderLoansCount: (lenderUid: string) =>
    [...vaultKeys.lenderLoans(lenderUid), 'count'] as const,
  loan: (loanId: string) => [...vaultKeys.loans(), loanId] as const,
  loanByUids: (lenderUid: string, loanUid: string) =>
    [...vaultKeys.loans(), 'uids', lenderUid, loanUid] as const,
  // Mantener loanByUid para compatibilidad
  loanByUid: (loanUid: string) => [...vaultKeys.loans(), 'uid', loanUid] as const,
  loanByLoanUid: (loanUid: string) =>
    [...vaultKeys.loans(), 'loanuid', loanUid] as const,
  loanByTxId: (txId: string) => [...vaultKeys.loans(), 'tx', txId] as const,
  loanByAccount: (lenderUid: string, account: string) =>
    [...vaultKeys.loans(), 'account', lenderUid, account] as const,
  loanExists: (loanId: string) => [...vaultKeys.loan(loanId), 'exists'] as const,
  loanExistsByUids: (lenderUid: string, loanUid: string) =>
    [...vaultKeys.loanByUids(lenderUid, loanUid), 'exists'] as const,
  loanIsLocked: (loanId: string) => [...vaultKeys.loan(loanId), 'locked'] as const,
  loanIsTokenized: (loanId: string) =>
    [...vaultKeys.loan(loanId), 'tokenized'] as const,
  avalancheTokenId: (loanId: string) =>
    [...vaultKeys.loan(loanId), 'avalanche-token'] as const,
  currentTx: (loanId: string) => [...vaultKeys.loan(loanId), 'current-tx'] as const,
  loanHistory: (loanId: string) => [...vaultKeys.loan(loanId), 'history'] as const,
  totalCount: () => [...vaultKeys.loans(), 'total-count'] as const,
  portfolio: (token?: string) => [...vaultKeys.all, 'portfolio', token] as const,
};

// ==================== LOAN REACT QUERY HOOKS ====================

export const useAllLoans = () => {
  return useQuery({
    queryKey: vaultKeys.allLoans(),
    queryFn: queryAllLoans,
    staleTime: 1000 * 60 * 5,
  });
};

// Alias para compatibilidad - ahora usa LenderUid
export const useMyLoans = (lenderUid: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.myLoans(lenderUid),
    queryFn: () => getMyLoans(lenderUid),
    enabled: enabled && !!lenderUid,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLenderLoans = (lenderUid: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.lenderLoans(lenderUid),
    queryFn: () => getLoansByLenderUid(lenderUid),
    enabled: enabled && !!lenderUid,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLenderLoansCount = (lenderUid: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.lenderLoansCount(lenderUid),
    queryFn: () => countLoansByLenderUid(lenderUid),
    enabled: enabled && !!lenderUid,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLoan = (loanId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.loan(loanId),
    queryFn: () => readLoan(loanId),
    enabled: enabled && !!loanId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLoanByUids = (
  lenderUid: string,
  loanUid: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: vaultKeys.loanByUids(lenderUid, loanUid),
    queryFn: () => getLoanByUids(lenderUid, loanUid),
    enabled: enabled && !!lenderUid && !!loanUid,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLoanByLoanUid = (loanUid: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.loanByLoanUid(loanUid),
    queryFn: () => findLoanByLoanUid(loanUid),
    enabled: enabled && !!loanUid,
    staleTime: 1000 * 60 * 5,
  });
};

// Alias para compatibilidad con código existente
export const useLoanByUid = useLoanByLoanUid;

export const useLoanByAccount = (
  lenderUid: string,
  account: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: vaultKeys.loanByAccount(lenderUid, account),
    queryFn: () => getLoanByLenderAndAccount(lenderUid, account),
    enabled: enabled && !!lenderUid && !!account,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLoanExists = (loanId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.loanExists(loanId),
    queryFn: () => loanExists(loanId),
    enabled: enabled && !!loanId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLoanExistsByUids = (
  lenderUid: string,
  loanUid: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: vaultKeys.loanExistsByUids(lenderUid, loanUid),
    queryFn: () => loanExistsByUids(lenderUid, loanUid),
    enabled: enabled && !!lenderUid && !!loanUid,
    staleTime: 1000 * 60 * 5,
  });
};

export const useIsLoanLocked = (loanId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.loanIsLocked(loanId),
    queryFn: () => isLoanLocked(loanId),
    enabled: enabled && !!loanId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useIsLoanTokenized = (loanId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.loanIsTokenized(loanId),
    queryFn: () => isLoanTokenized(loanId),
    enabled: enabled && !!loanId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAvalancheTokenId = (loanId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.avalancheTokenId(loanId),
    queryFn: () => getAvalancheTokenId(loanId),
    enabled: enabled && !!loanId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCurrentTransaction = (loanId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.currentTx(loanId),
    queryFn: () => getCurrentTransaction(loanId),
    enabled: enabled && !!loanId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLoanHistory = (loanId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.loanHistory(loanId),
    queryFn: () => getLoanHistory(loanId),
    enabled: enabled && !!loanId,
    staleTime: 1000 * 60 * 5,
  });
};

// Alias para compatibilidad con código existente
export const useLoanHistoryWithChanges = useLoanHistory;

export const useLoanByTxId = (txId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: vaultKeys.loanByTxId(txId),
    queryFn: () => getLoanByTxId(txId),
    enabled: enabled && !!txId && txId.startsWith('0x'),
    staleTime: 1000 * 60 * 10, // 10 minutos - datos históricos no cambian
    retry: 1,
  });
};

export const useTotalLoansCount = () => {
  return useQuery({
    queryKey: vaultKeys.totalCount(),
    queryFn: getTotalLoansCount,
    staleTime: 1000 * 60 * 5,
  });
};


// ==================== HOOK ====================
export const usePortfolioLoans = (enabled: boolean = true) => {
  const token = localStorage.getItem('vaultKey');

  return useQuery({
    queryKey: vaultKeys.portfolio(token ?? ''),  // ✅ key única por token
    queryFn: fetchPortfolioLoans,
    enabled: !!token && enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
// ==================== LOAN MUTATIONS ====================

// Mutation compatible con el documento original
export const useCreateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanData: CreateLoanRequest) => createLoan(loanData),
    onSuccess: (response, variables) => {
      const operation = response.operation || 'CREATE';

      if (operation === 'CREATE') {
        toast.success('Loan created successfully');
      } else {
        toast.success('Loan updated successfully');
      }

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: vaultKeys.loans() });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });

      if (variables.LenderUid) {
        queryClient.invalidateQueries({
          queryKey: vaultKeys.myLoans(variables.LenderUid)
        });
        queryClient.invalidateQueries({
          queryKey: vaultKeys.lenderLoans(variables.LenderUid)
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create loan');
    },
  });
};

// Mutation compatible con el documento original
export const useUpdateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      loanId,
      loanData
    }: {
      loanId: string;
      loanData: CreateLoanRequest
    }) => updateLoan(loanId, loanData),
    onSuccess: (response, variables) => {
      toast.success('Loan updated successfully');

      queryClient.invalidateQueries({ queryKey: vaultKeys.loans() });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });

      if (variables.loanData.LenderUid) {
        queryClient.invalidateQueries({
          queryKey: vaultKeys.myLoans(variables.loanData.LenderUid)
        });
        queryClient.invalidateQueries({
          queryKey: vaultKeys.lenderLoans(variables.loanData.LenderUid)
        });
      }

      queryClient.invalidateQueries({ queryKey: vaultKeys.loan(variables.loanId) });
      queryClient.invalidateQueries({
        queryKey: vaultKeys.loanHistory(variables.loanId)
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update loan');
    },
  });
};

// Mutation nuevo que usa la lógica inteligente del backend
export const useCreateOrUpdateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanData: CreateLoanRequest) => createOrUpdateLoan(loanData),
    onSuccess: (response, variables) => {
      const operation = response.operation || 'CREATE';
      const loanId = response.loanId || response.data.loanId;

      if (operation === 'CREATE') {
        toast.success(`Loan created successfully`);
      } else if (operation === 'PARTIAL_UPDATE') {
        toast.success(`Loan updated partially (${response.updatedFields?.length} fields)`);
      } else {
        toast.success(`Loan updated completely`);
      }

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: vaultKeys.loans() });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });

      if (variables.LenderUid) {
        queryClient.invalidateQueries({
          queryKey: vaultKeys.myLoans(variables.LenderUid)
        });
        queryClient.invalidateQueries({
          queryKey: vaultKeys.lenderLoans(variables.LenderUid)
        });
        queryClient.invalidateQueries({
          queryKey: vaultKeys.lenderLoansCount(variables.LenderUid)
        });
      }

      if (loanId) {
        queryClient.invalidateQueries({ queryKey: vaultKeys.loan(loanId) });
        queryClient.invalidateQueries({ queryKey: vaultKeys.loanHistory(loanId) });
      }

      if (variables.LenderUid && variables.LoanUid) {
        queryClient.invalidateQueries({
          queryKey: vaultKeys.loanByUids(variables.LenderUid, variables.LoanUid)
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create/update loan');
    },
  });
};

export const useUpdateLoanPartial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      loanId,
      fields
    }: {
      loanId: string;
      fields: UpdateLoanPartialRequest['fields']
    }) => updateLoanPartial(loanId, fields),
    onSuccess: (response, variables) => {
      toast.success(
        `Loan updated: ${response.updatedFields.length} field(s) changed`
      );

      queryClient.invalidateQueries({ queryKey: vaultKeys.loans() });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
      queryClient.invalidateQueries({ queryKey: vaultKeys.loan(variables.loanId) });
      queryClient.invalidateQueries({
        queryKey: vaultKeys.loanHistory(variables.loanId)
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update loan');
    },
  });
};

export const useUpdateLockedLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      loanId,
      data
    }: {
      loanId: string;
      data: UpdateLockedLoanRequest
    }) => updateLockedLoan(loanId, data),
    onSuccess: (response, variables) => {
      toast.success('Locked loan updated successfully');

      queryClient.invalidateQueries({ queryKey: vaultKeys.loans() });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
      queryClient.invalidateQueries({ queryKey: vaultKeys.loan(variables.loanId) });
      queryClient.invalidateQueries({
        queryKey: vaultKeys.loanHistory(variables.loanId)
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update locked loan');
    },
  });
};

export const useDeleteLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanId: string) => deleteLoan(loanId),
    onSuccess: (response, loanId) => {
      toast.success('Loan deleted successfully');

      queryClient.invalidateQueries({ queryKey: vaultKeys.loans() });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
      queryClient.removeQueries({ queryKey: vaultKeys.loan(loanId) });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete loan');
    },
  });
};

export const useGenerateLoanId = () => {
  return useMutation({
    mutationFn: ({
      lenderUid,
      loanUid
    }: GenerateLoanIdRequest) => generateLoanId(lenderUid, loanUid),
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to generate loan ID');
    },
  });
};

