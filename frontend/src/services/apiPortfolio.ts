import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type {
  
  PortfolioCertificate,
  CertifyPortfolioRequest,
  CertifyPortfolioResponse,
  CertificateResponse,
  AllCertificatesResponse,
  CertificateExistsResponse,
  CertificateStatsResponse,
  CertificateTxIdResponse,
  CreateCertificateRequest,
  CreateCertificateResponse,
  UpdateCertificateRequest,
  CertificateStats,
} from '../types/portfolioTypes';
import type { CompactLoan } from '../types/vaultTypes';

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8070';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ==================== HELPER ====================
const getToken = (): string => {
  const token = localStorage.getItem('vaultKey');
  if (!token) throw new Error('No authentication token found.');
  return token;
};

// ==================== RESPONSE TYPE LOCAL ====================
// Tipo de respuesta de GET /portfolio/me — usa CompactLoan (no PortfolioLoan)
interface PortfolioMeResponse {
  success: boolean;
  userId: string | null;
  totalLoans: number;
  data: CompactLoan[];
}

// ==================== QUERY KEYS ====================
export const portfolioKeys = {
  all: ['portfolio'] as const,
  me: () => [...portfolioKeys.all, 'me'] as const,
  certificates: () => [...portfolioKeys.all, 'certificates'] as const,
  certificate: (userId: string) => [...portfolioKeys.certificates(), userId] as const,
  certificateExists: (userId: string) => [...portfolioKeys.certificate(userId), 'exists'] as const,
  certificateStats: (userId: string) => [...portfolioKeys.certificate(userId), 'stats'] as const,
  certificateTxId: (userId: string) => [...portfolioKeys.certificate(userId), 'txid'] as const,
  certificateByAddress: (userAddress: string) => [...portfolioKeys.certificates(), 'address', userAddress] as const,
  allCertificates: () => [...portfolioKeys.certificates(), 'all'] as const,
};

// ==================== API FUNCTIONS ====================

// GET /portfolio/me — devuelve CompactLoan[] en data
export const fetchUserPortfolio = async (): Promise<PortfolioMeResponse> => {
  const response = await api.get<PortfolioMeResponse>('/portfolio/me', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.data;
};

// POST /portfolio/certify — { userId, wait? } — backend hace create o update según corresponda
export const certifyPortfolio = async (
  data: CertifyPortfolioRequest
): Promise<CertifyPortfolioResponse> => {
  const response = await api.post<CertifyPortfolioResponse>('/portfolio/certify', data, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.data;
};

// GET /portfolio/all
export const getAllCertificates = async (): Promise<PortfolioCertificate[]> => {
  const response = await api.get<AllCertificatesResponse>('/portfolio/all');
  return response.data.data;
};

// GET /portfolio/:userId
export const getCertificateByUserId = async (userId: string): Promise<PortfolioCertificate> => {
  const response = await api.get<CertificateResponse>(`/portfolio/${userId}`);
  return response.data.data;
};

// GET /portfolio/address/:userAddress
export const getCertificateByAddress = async (userAddress: string): Promise<PortfolioCertificate> => {
  const response = await api.get<CertificateResponse>(`/portfolio/address/${userAddress}`);
  return response.data.data;
};

// GET /portfolio/:userId/exists
export const certificateExists = async (userId: string): Promise<boolean> => {
  const response = await api.get<CertificateExistsResponse>(`/portfolio/${userId}/exists`);
  return response.data.data.exists;
};

// GET /portfolio/:userId/stats
export const getCertificateStats = async (userId: string): Promise<CertificateStats> => {
  const response = await api.get<CertificateStatsResponse>(`/portfolio/${userId}/stats`);
  return response.data.data;
};

// GET /portfolio/:userId/txid
export const getCertificateTxId = async (userId: string): Promise<string> => {
  const response = await api.get<CertificateTxIdResponse>(`/portfolio/${userId}/txid`);
  return response.data.data.txId;
};

// POST /portfolio (manual)
export const createCertificateManual = async (
  data: CreateCertificateRequest
): Promise<CreateCertificateResponse> => {
  const response = await api.post<CreateCertificateResponse>('/portfolio', data);
  return response.data;
};

// PUT /portfolio/:userId (manual)
export const updateCertificateManual = async (
  userId: string,
  data: UpdateCertificateRequest
): Promise<CreateCertificateResponse> => {
  const response = await api.put<CreateCertificateResponse>(`/portfolio/${userId}`, data);
  return response.data;
};

// ==================== REACT QUERY HOOKS ====================

/**
 * Hook principal para mostrar los loans del usuario autenticado.
 * Llama únicamente a GET /portfolio/me
 */
export const useUserPortfolio = () => {
  return useQuery({
    queryKey: portfolioKeys.me(),
    queryFn: fetchUserPortfolio,
    staleTime: 1000 * 60 * 3,
    select: (data) => ({
      userId: data.userId,
      totalLoans: data.totalLoans,
      loans: data.data, // CompactLoan[]
    }),
  });
};

/**
 * Hook para el componente PortafolioCertificate.
 *
 * SOLO llama a GET /portfolio/me — no consulta blockchain para mostrar el certificado.
 * El TxId se obtiene únicamente después de certificar (al descargar).
 *
 * Campos mapeados desde CompactLoan:
 *   ID                  → loan.Account (número de cuenta legible) || loan.LoanUid
 *   Borrower_FullName   → loan.CoBorrower (nombre borrower) || loan.LenderName
 *   Original_Loan_Amount→ loan.OriginalBalance
 *   TXid                → loan.TxId (hash de la tx del loan en blockchain)
 *   Currrent_Principal_Bal → loan.CurrentBalance
 *   TotalPrincipal      → suma de CurrentBalance de todos los loans
 */
export const usePortfolioCertificateWithDetails = (userId: string) => {
  const portfolioQuery = useQuery({
    queryKey: portfolioKeys.me(),
    queryFn: fetchUserPortfolio,
    staleTime: 1000 * 60 * 3,
    enabled: !!userId,
  });

  const isLoading = portfolioQuery.isLoading;
  const error = portfolioQuery.error ?? null;

  const data = portfolioQuery.data
    ? (() => {
        const loans: CompactLoan[] = portfolioQuery.data.data ?? [];
        const totalPrincipal = loans.reduce(
          (sum, loan) => sum + parseFloat(loan.CurrentBalance || '0'),
          0
        );
        return {
          // TxId placeholder hasta que el usuario certifique al descargar
          TxId: 'Pending — download to certify',
          CreationDate: new Date().toISOString(),
          LoansCount: loans.length,
          TotalPrincipal: totalPrincipal,
          LoansDetails: loans.map((loan) => ({
            ID: loan.Account || loan.LoanUid,
            Borrower_FullName: loan.CoBorrower || loan.LenderName || 'N/A',
            Original_Loan_Amount: loan.OriginalBalance,
            TXid: loan.TxId,
            Currrent_Principal_Bal: loan.CurrentBalance,
          })),
        };
      })()
    : null;

  return { data, isLoading, error };
};

/**
 * Hook: certificar portfolio on-chain al momento de descargar.
 * POST /portfolio/certify — el backend decide si crear o actualizar.
 *
 * Uso:
 *   const { mutateAsync: certify, isPending } = useCertifyPortfolio();
 *   const result = await certify({ userId: 'abc123', wait: true });
 *   // result.data.txHash → TxId real para mostrar en el certificado impreso
 */
export const useCertifyPortfolio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: certifyPortfolio,
    onSuccess: (data) => {
      const userId = data.data.userId;
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificate(userId) });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificateExists(userId) });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.me() });
      toast.success(
        data.data.operation === 'created'
          ? 'Portfolio certified on blockchain!'
          : 'Portfolio certificate updated!'
      );
    },
    onError: (error: Error) => {
      toast.error(`Certification failed: ${error.message}`);
    },
  });
};

/**
 * Hook: verificar si ya existe certificado on-chain.
 */
export const useCertificateExists = (userId: string) => {
  return useQuery({
    queryKey: portfolioKeys.certificateExists(userId),
    queryFn: () => certificateExists(userId),
    enabled: !!userId,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook: obtener certificado por userId
 */
export const useCertificate = (userId: string) => {
  return useQuery({
    queryKey: portfolioKeys.certificate(userId),
    queryFn: () => getCertificateByUserId(userId),
    enabled: !!userId,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook: stats del certificado
 */
export const useCertificateStats = (userId: string) => {
  return useQuery({
    queryKey: portfolioKeys.certificateStats(userId),
    queryFn: () => getCertificateStats(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook: todos los certificados (admin)
 */
export const useAllCertificates = () => {
  return useQuery({
    queryKey: portfolioKeys.allCertificates(),
    queryFn: getAllCertificates,
    staleTime: 1000 * 60 * 5,
  });
};