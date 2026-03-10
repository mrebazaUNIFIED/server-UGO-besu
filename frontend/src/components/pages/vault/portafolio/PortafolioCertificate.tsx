import React, { useState } from 'react';
import { usePortfolioCertificateWithDetails, useCertifyPortfolio } from '../../../../services/apiPortfolio';
import certificatedLogo from "../../../../assets/certi-blockchain.png";
import { useVaultAuth } from '../../../../hooks/useVaultAuth';
import { CompactLoan } from '../../../../types/vaultTypes';

export const PortafolioCertificate = ({ userId }: { userId: string }) => {
  const { data: certificate, isLoading, error } = usePortfolioCertificateWithDetails(userId);
  const { vaultUser } = useVaultAuth();
  const { mutateAsync: certify, isPending: isCertifying } = useCertifyPortfolio();
  const userName = vaultUser?.firstName || "";

  // txId real obtenido tras certificar en blockchain
  const [certifiedTxId, setCertifiedTxId] = useState<string | null>(null);
  const [certifiedDate, setCertifiedDate] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[210mm]">
        <div className="text-lg">Loading certificate...</div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex items-center justify-center h-[210mm]">
        <div className="text-lg text-red-600">Failed to load certificate</div>
      </div>
    );
  }

  const totalBalance = certificate.TotalPrincipal || 0;

  // Usa el txId real si ya se certificó, sino muestra el placeholder
  const displayTxId = certifiedTxId ?? certificate.TxId;
  const displayDate = certifiedDate ?? certificate.CreationDate;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const handlePrint = async () => {
    try {
      // POST /portfolio/certify → backend crea o actualiza según si ya existe
      const result = await certify({ userId, wait: true });

      // Guardar el txHash real y la fecha para mostrarlo en el certificado impreso
      setCertifiedTxId(result.data.txHash);
      setCertifiedDate(new Date().toISOString());

      // Pequeño delay para que React re-renderice con el txId real antes de imprimir
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      console.error('Certification failed before print:', err);
      // El toast de error ya lo maneja useCertifyPortfolio internamente
    }
  };

  return (
    <div className="bg-white text-gray-800 font-sans text-base">

      {/* ===== PÁGINA 1 - Portada ===== */}
      <div className="h-[210mm] p-8 flex flex-col justify-between page-break" style={{ breakAfter: 'page' }}>

        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-gray-600">Date of Certificate: {formatDate(displayDate)}</p>
          <p className="text-lg font-semibold">Certified by FCI Blockchain</p>
          <p className="text-gray-700">Instrument Serviced by: FCI Lender Services, Inc.</p>
          <p className="text-gray-700">
            <span className="font-bold">FCI Blockchain Registration ID:</span> {displayTxId}
          </p>
        </div>

        {/* Sello central */}
        <div className="flex flex-col items-center justify-center flex-grow">
          <div className="w-64 h-64 rounded-full">
            <img src={certificatedLogo} alt="Certificate Seal" className="w-full h-full object-contain" />
          </div>
          <div className="text-center mb-6 space-y-4">
            <p className="text-3xl font-bold">
              {certificate.LoansCount} Loans — ${totalBalance.toFixed(2)}
            </p>
            <p className="font-semibold text-lg">Business Name: {userName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between text-sm text-gray-600">
          <p>Generated {formatDate(displayDate)} by FCI Blockchain Part of the FCI Network</p>
          <p>Page 1 of 2</p>
        </div>
      </div>

      {/* ===== PÁGINA 2 - Tabla de loans ===== */}
      <div className="h-[210mm] p-8 flex flex-col" style={{ breakAfter: 'page' }}>

        {/* Header página 2 */}
        <div className="text-center space-y-1 mb-8 text-sm">
          <p className="text-gray-600">Date of Certificate: {formatDate(displayDate)}</p>
          <p className="font-semibold">Certified by FCI Blockchain</p>
          <p className="text-gray-700">Instrument Serviced by: FCI Lender Services, Inc.</p>
          <p className="text-gray-700">
            <span className="font-bold">FCI Blockchain Registration ID: </span>{displayTxId}
          </p>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto flex-grow">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border border-gray-300 px-4 py-2 text-center">Account ID</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Borrower Name</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Original Amount</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Transaction Hash</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Current Principal Balance</th>
              </tr>
            </thead>
            <tbody>
              {certificate.LoansDetails.map((loan, index) => (
                <tr key={loan.ID} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-1">{loan.ID}</td>
                  <td className="border border-gray-300 px-4 py-1">{loan.Borrower_FullName || 'N/A'}</td>
                  <td className="border border-gray-300 px-4 py-1 text-center">
                    {loan.Original_Loan_Amount
                      ? `$${parseFloat(loan.Original_Loan_Amount).toFixed(2)}`
                      : 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-4 py-1 font-mono text-xs break-all">
                    {loan.TXid || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-4 py-1 text-center font-semibold">
                    ${parseFloat(loan.Currrent_Principal_Bal || '0').toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={4} className="border border-gray-300 px-4 py-1 text-center">
                  Total Principal Balance:
                </td>
                <td className="border border-gray-300 px-4 py-1 text-center">
                  ${totalBalance.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer página 2 */}
        <div className="mt-auto text-right text-sm text-gray-600 pt-4">
          <p>Page 2 of 2</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          .page-break { break-after: page; }
          body { margin: 0; padding: 0; }
          table { font-size: 8pt; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

// ==================== WRAPPER CON BOTÓN ====================
export default function CertificateViewer() {
  const { vaultUser } = useVaultAuth();
  const userId = vaultUser?.uid;
  const { mutateAsync: certify, isPending: isCertifying } = useCertifyPortfolio();

  const handlePrint = async () => {
    if (!userId) return;
    try {
      await certify({ userId, wait: true });
      setTimeout(() => window.print(), 300);
    } catch (err) {
      console.error('Certification failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-8">

        <div className="mb-6">
          <button
            onClick={handlePrint}
            disabled={isCertifying || !userId}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCertifying ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Certifying on Blockchain...
              </>
            ) : (
              'Download & Certify'
            )}
          </button>
        </div>

        <PortafolioCertificate userId={userId} />
      </div>
    </div>
  );
}