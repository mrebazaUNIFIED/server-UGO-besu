// src/api/apiMarketplace.ts

import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type {
  LoanApprovalData,
  ApproveLoanRequest,
  CancelSaleRequest,
  SetTokenIdRequest,
  RecordTransferRequest,
  RecordPaymentRequest,
  MarkPaidOffRequest,
  RegisterTxHashRequest,
  EmergencyUnlockRequest,
  BurnAndCancelRequest,
  ApprovalResponse,
  CancelResponse,
  ApprovalDataResponse,
  TokenizationStatus,
  TokenizationStatusResponse,
  SetTokenIdResponse,
  RecordTransferResponse,
  RecordPaymentResponse,
  MarkPaidOffResponse,
  ForceUnlockResponse,
  ApprovalByTxResponse,
  LoanIdByTxResponse,
  ApprovedLoansResponse,
  TokenizedLoansResponse,
  CanApproveResponse,
  EmergencyUnlockResponse,
  RelayerAddressResponse,
  CanCancelResponse,
  BurnRequestResponse,
  ConfirmBurnResponse,
  TokenIdResponse,
  RegisterTxHashResponse
} from '../types/marketplaceTypes';
import { vaultKeys } from './apiVault';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

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
      '/marketplace/approval',
      '/marketplace/status',
      '/marketplace/tokenized',
      '/marketplace/approved',
      '/marketplace/can-approve',
      '/marketplace/can-cancel',
      '/marketplace/token-id',
      '/marketplace/relayer-address',
      '/marketplace/txhash',
      '/marketplace/approval-by-txhash'
    ];

    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));
    const isGetRequest = config.method === 'get';

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

// ==================== MARKETPLACE API FUNCTIONS ====================

/**
 * POST /marketplace/approve
 */
export const approveLoanForSale = async (
  data: ApproveLoanRequest
): Promise<ApprovalResponse> => {
  const response = await api.post<ApprovalResponse>('/marketplace/approve', data);
  return response.data;
};

/**
 * POST /marketplace/cancel
 */
export const cancelSaleListing = async (
  data: CancelSaleRequest
): Promise<CancelResponse> => {
  const response = await api.post<CancelResponse>('/marketplace/cancel', data);
  return response.data;
};

/**
 * GET /marketplace/approval/:lenderUid/:loanUid
 */
export const getApprovalData = async (
  lenderUid: string,
  loanUid: string
): Promise<LoanApprovalData> => {
  const response = await api.get<ApprovalDataResponse>(
    `/marketplace/approval/${lenderUid}/${loanUid}`
  );
  return response.data.data;
};

/**
 * GET /marketplace/approval-by-txhash/:txHash
 */
export const getApprovalByTxHash = async (
  txHash: string
): Promise<ApprovalByTxResponse['data']> => {
  const response = await api.get<ApprovalByTxResponse>(
    `/marketplace/approval-by-txhash/${txHash}`
  );
  return response.data.data;
};

/**
 * GET /marketplace/status/:lenderUid/:loanUid
 */
export const getTokenizationStatus = async (
  lenderUid: string,
  loanUid: string
): Promise<TokenizationStatus> => {
  const response = await api.get<TokenizationStatusResponse>(
    `/marketplace/status/${lenderUid}/${loanUid}`
  );
  return response.data.data;
};

/**
 * GET /marketplace/approved/:lenderAddress
 */
export const getApprovedLoansByLender = async (
  lenderAddress: string
): Promise<ApprovedLoansResponse['data']> => {
  const response = await api.get<ApprovedLoansResponse>(
    `/marketplace/approved/${lenderAddress}`
  );
  return response.data.data;
};

/**
 * GET /marketplace/tokenized
 */
export const getTokenizedLoans = async (): Promise<TokenizedLoansResponse['data']> => {
  const response = await api.get<TokenizedLoansResponse>('/marketplace/tokenized');
  return response.data.data;
};

/**
 * GET /marketplace/can-approve/:lenderUid/:loanUid/:lenderAddress
 */
export const canLenderApproveLoan = async (
  lenderUid: string,
  loanUid: string,
  lenderAddress: string
): Promise<CanApproveResponse> => {
  const response = await api.get<CanApproveResponse>(
    `/marketplace/can-approve/${lenderUid}/${loanUid}/${lenderAddress}`
  );
  return response.data;
};

/**
 * GET /marketplace/txhash/:txHash
 */
export const getLoanIdByTxHash = async (txHash: string): Promise<string> => {
  const response = await api.get<LoanIdByTxResponse>(`/marketplace/txhash/${txHash}`);
  return response.data.loanId;
};

/**
 * GET /marketplace/relayer-address
 */
export const getRelayerAddress = async (): Promise<string> => {
  const response = await api.get<RelayerAddressResponse>('/marketplace/relayer-address');
  return response.data.relayerAddress;
};

/**
 * GET /marketplace/can-cancel/:lenderUid/:loanUid
 */
export const canCancel = async (
  lenderUid: string,
  loanUid: string
): Promise<CanCancelResponse> => {
  const response = await api.get<CanCancelResponse>(
    `/marketplace/can-cancel/${lenderUid}/${loanUid}`
  );
  return response.data;
};

/**
 * GET /marketplace/token-id/:lenderUid/:loanUid
 */
export const getTokenId = async (
  lenderUid: string,
  loanUid: string
): Promise<TokenIdResponse> => {
  const response = await api.get<TokenIdResponse>(
    `/marketplace/token-id/${lenderUid}/${loanUid}`
  );
  return response.data;
};

// ==================== RELAYER FUNCTIONS ====================

/**
 * POST /marketplace/set-token-id
 */
export const setAvalancheTokenId = async (
  data: SetTokenIdRequest
): Promise<SetTokenIdResponse> => {
  const response = await api.post<SetTokenIdResponse>('/marketplace/set-token-id', data);
  return response.data;
};

/**
 * POST /marketplace/record-transfer
 */
export const recordOwnershipTransfer = async (
  data: RecordTransferRequest
): Promise<RecordTransferResponse> => {
  const response = await api.post<RecordTransferResponse>('/marketplace/record-transfer', data);
  return response.data;
};

/**
 * POST /marketplace/record-payment
 */
export const recordPayment = async (
  data: RecordPaymentRequest
): Promise<RecordPaymentResponse> => {
  const response = await api.post<RecordPaymentResponse>('/marketplace/record-payment', data);
  return response.data;
};

/**
 * POST /marketplace/mark-paid-off
 */
export const markLoanAsPaidOff = async (
  data: MarkPaidOffRequest
): Promise<MarkPaidOffResponse> => {
  const response = await api.post<MarkPaidOffResponse>('/marketplace/mark-paid-off', data);
  return response.data;
};

/**
 * POST /marketplace/register-txhash
 */
export const registerApprovalTxHash = async (
  data: RegisterTxHashRequest
): Promise<RegisterTxHashResponse> => {
  const response = await api.post<RegisterTxHashResponse>('/marketplace/register-txhash', data);
  return response.data;
};

/**
 * POST /marketplace/force-unlock-paid-off
 */
export const forceUnlockPaidOffLoan = async (
  data: { lenderUid: string; loanUid: string }
): Promise<ForceUnlockResponse> => {
  const response = await api.post<ForceUnlockResponse>(
    '/marketplace/force-unlock-paid-off',
    data
  );
  return response.data;
};

// ==================== OWNER/ADMIN FUNCTIONS ====================

/**
 * POST /marketplace/emergency-unlock
 */
export const emergencyUnlock = async (
  data: EmergencyUnlockRequest
): Promise<EmergencyUnlockResponse> => {
  const response = await api.post<EmergencyUnlockResponse>('/marketplace/emergency-unlock', data);
  return response.data;
};

// ==================== BURN FUNCTIONS ====================

/**
 * POST /marketplace/request-burn-cancel
 */
export const requestBurnAndCancel = async (
  data: BurnAndCancelRequest
): Promise<BurnRequestResponse> => {
  const response = await api.post<BurnRequestResponse>('/marketplace/request-burn-cancel', data);
  return response.data;
};

/**
 * POST /marketplace/confirm-burn-cancel
 */
export const confirmBurnAndCancel = async (
  data: BurnAndCancelRequest
): Promise<ConfirmBurnResponse> => {
  const response = await api.post<ConfirmBurnResponse>('/marketplace/confirm-burn-cancel', data);
  return response.data;
};

// ==================== QUERY KEYS ====================
export const marketplaceKeys = {
  all: ['marketplace'] as const,
  approval: (lenderUid: string, loanUid: string) =>
    [...marketplaceKeys.all, 'approval', lenderUid, loanUid] as const,
  status: (lenderUid: string, loanUid: string) =>
    [...marketplaceKeys.all, 'status', lenderUid, loanUid] as const,
  approvalByTx: (txHash: string) =>
    [...marketplaceKeys.all, 'approvalByTx', txHash] as const,
  approvedByLender: (lenderAddress: string) =>
    [...marketplaceKeys.all, 'approvedByLender', lenderAddress] as const,
  tokenized: () =>
    [...marketplaceKeys.all, 'tokenized'] as const,
  canApprove: (lenderUid: string, loanUid: string, lenderAddress: string) =>
    [...marketplaceKeys.all, 'canApprove', lenderUid, loanUid, lenderAddress] as const,
  canCancel: (lenderUid: string, loanUid: string) =>
    [...marketplaceKeys.all, 'canCancel', lenderUid, loanUid] as const,
  tokenId: (lenderUid: string, loanUid: string) =>
    [...marketplaceKeys.all, 'tokenId', lenderUid, loanUid] as const,
  relayerAddress: () =>
    [...marketplaceKeys.all, 'relayerAddress'] as const,
};

// ==================== REACT QUERY HOOKS ====================

export const useApprovalData = (
  lenderUid: string,
  loanUid: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: marketplaceKeys.approval(lenderUid, loanUid),
    queryFn: () => getApprovalData(lenderUid, loanUid),
    enabled: enabled && !!lenderUid && !!loanUid,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
};

export const useApprovalByTxHash = (
  txHash: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: marketplaceKeys.approvalByTx(txHash),
    queryFn: () => getApprovalByTxHash(txHash),
    enabled: enabled && !!txHash,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
};

export const useTokenizationStatus = (
  lenderUid: string,
  loanUid: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: marketplaceKeys.status(lenderUid, loanUid),
    queryFn: () => getTokenizationStatus(lenderUid, loanUid),
    enabled: enabled && !!lenderUid && !!loanUid,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
};

export const useApprovedLoansByLender = (
  lenderAddress: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: marketplaceKeys.approvedByLender(lenderAddress),
    queryFn: () => getApprovedLoansByLender(lenderAddress),
    enabled: enabled && !!lenderAddress,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useTokenizedLoans = (enabled: boolean = true) => {
  return useQuery({
    queryKey: marketplaceKeys.tokenized(),
    queryFn: () => getTokenizedLoans(),
    enabled: enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useCanApprove = (
  lenderUid: string,
  loanUid: string,
  lenderAddress: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: marketplaceKeys.canApprove(lenderUid, loanUid, lenderAddress),
    queryFn: () => canLenderApproveLoan(lenderUid, loanUid, lenderAddress),
    enabled: enabled && !!lenderUid && !!loanUid && !!lenderAddress,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
};

export const useCanCancel = (
  lenderUid: string,
  loanUid: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: marketplaceKeys.canCancel(lenderUid, loanUid),
    queryFn: () => canCancel(lenderUid, loanUid),
    enabled: enabled && !!lenderUid && !!loanUid,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
};

export const useTokenId = (
  lenderUid: string,
  loanUid: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: marketplaceKeys.tokenId(lenderUid, loanUid),
    queryFn: () => getTokenId(lenderUid, loanUid),
    enabled: enabled && !!lenderUid && !!loanUid,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useRelayerAddress = (enabled: boolean = true) => {
  return useQuery({
    queryKey: marketplaceKeys.relayerAddress(),
    queryFn: () => getRelayerAddress(),
    enabled: enabled,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
};

// ==================== MUTATIONS ====================

export const useApproveLoanForSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApproveLoanRequest) => approveLoanForSale(data),
    onSuccess: (response, variables) => {
      toast.success('Loan approved for tokenization');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.approval(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve loan for sale');
    },
  });
};

export const useCancelSaleListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CancelSaleRequest) => cancelSaleListing(data),
    onSuccess: (response, variables) => {
      toast.success('Sale listing cancelled successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.approval(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel sale listing');
    },
  });
};

export const useSetAvalancheTokenId = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetTokenIdRequest) => setAvalancheTokenId(data),
    onSuccess: (response, variables) => {
      toast.success('Token ID set successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.approval(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.tokenId(variables.lenderUid, variables.loanUid)
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to set token ID');
    },
  });
};

export const useRecordOwnershipTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordTransferRequest) => recordOwnershipTransfer(data),
    onSuccess: (response, variables) => {
      toast.success('Ownership transfer recorded successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record ownership transfer');
    },
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordPaymentRequest) => recordPayment(data),
    onSuccess: (response, variables) => {
      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    },
  });
};

export const useMarkLoanAsPaidOff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkPaidOffRequest) => markLoanAsPaidOff(data),
    onSuccess: (response, variables) => {
      toast.success('Loan marked as paid off successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to mark loan as paid off');
    },
  });
};

export const useRequestBurnAndCancel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BurnAndCancelRequest) => requestBurnAndCancel(data),
    onSuccess: (response, variables) => {
      if (response.type === 'burn_required') {
        toast.success('Burn request submitted. Relayer will process the NFT burn.');
      } else {
        toast.success('Sale listing cancelled successfully');
      }
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.approval(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.canCancel(variables.lenderUid, variables.loanUid)
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to request burn and cancel');
    },
  });
};

export const useConfirmBurnAndCancel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BurnAndCancelRequest) => confirmBurnAndCancel(data),
    onSuccess: (response, variables) => {
      toast.success('NFT burn confirmed and loan unlocked successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.approval(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.canCancel(variables.lenderUid, variables.loanUid)
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to confirm burn and cancel');
    },
  });
};

export const useEmergencyUnlock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmergencyUnlockRequest) => emergencyUnlock(data),
    onSuccess: (response, variables) => {
      toast.warning('Emergency unlock completed. Remember to sync with Avalanche if needed.');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to perform emergency unlock');
    },
  });
};

export const useRegisterApprovalTxHash = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterTxHashRequest) => registerApprovalTxHash(data),
    onSuccess: (response, variables) => {
      toast.success('Transaction hash registered successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.approval(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to register transaction hash');
    },
  });
};

export const useForceUnlockPaidOffLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { lenderUid: string; loanUid: string }) =>
      forceUnlockPaidOffLoan(data),
    onSuccess: (response, variables) => {
      toast.success('Paid off loan unlocked successfully');
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.status(variables.lenderUid, variables.loanUid)
      });
      queryClient.invalidateQueries({ queryKey: [...vaultKeys.all, 'portfolio'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to force unlock paid off loan');
    },
  });
};