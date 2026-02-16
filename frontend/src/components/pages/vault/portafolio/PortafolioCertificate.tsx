import React from 'react';
import { usePortfolioCertificateWithDetails } from '../../../../services/apiPortafolio';
import certificatedLogo from "../../../../assets/certi-blockchain.png"
import { useVaultAuth } from '../../../../hooks/useVaultAuth';

export const PortafolioCertificate = ({ userId }: { userId: string }) => {
  const { data: certificate, isLoading, error } = usePortfolioCertificateWithDetails(userId);
  const { vaultUser } = useVaultAuth();
  const userName = vaultUser?.firstName || "";

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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white text-gray-800 font-sans text-base">
      {/* Página 1 - Portada con header y sello */}
      <div className="h-[210mm] p-8 flex flex-col justify-between page-break" style={{ breakAfter: 'page' }}>
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-gray-600">Date of Certificate: {formatDate(certificate.CreationDate)}</p>
          <p className="text-lg font-semibold">Certified by FCI Blockchain</p>
          <p className="text-gray-700">Instrument Serviced by: FCI Lender Services, Inc.</p>
          <p className="text-gray-700">
           <span className='font-bold'> FCI Blockchain Registration ID:</span> {certificate.TxId }
          </p>
        </div>

        {/* Seal central */}
        <div className="flex flex-col items-center justify-center flex-grow">
          <div className="w-64 h-64 rounded-full">
            <img src={certificatedLogo} alt="Certificate Seal" className="w-full h-full object-contain" />
          </div>

          <div className="text-center mb-6 space-y-4">

            <p className="text-3xl font-bold">{certificate.LoansCount} Loans - ${totalBalance.toFixed(2)} </p>
            <p className="font-semibold text-lg">Business Name: {userName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between text-sm text-gray-600">
          <p>Generated {formatDate(certificate.CreationDate)} by FCI Blockchain Part of the FCI Network</p>
          <p>Page 1 of 2</p>
        </div>
      </div>

      {/* Página 2 - Información de balance y detalles de préstamos */}
      <div className="h-[210mm] p-8 flex flex-col" style={{ breakAfter: 'page' }}>
        {/* Header de página 2 */}
        <div className="text-center space-y-1 mb-8 text-sm">
          <p className="text-gray-600">Date of Certificate: {formatDate(certificate.CreationDate)}</p>
          <p className="font-semibold">Certified by FCI Blockchain</p>
          <p className="text-gray-700">Instrument Serviced by: FCI Lender Services, Inc.</p>
          <p className="text-gray-700">
           <span className="font-bold"> FCI Blockchain Registration ID: </span>{certificate.TxId}
          </p>
        </div>



        {/* Tabla de préstamos con estilos ajustados para caber en una página */}
        <div className="overflow-x-auto flex-grow">
          <table className="w-full border-collapse text-xs"> {/* Reducido a text-xs para más espacio */}
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border border-gray-300 px-4 py-2 text-center">Account ID</th> {/* Reducido padding */}
                <th className="border border-gray-300 px-4 py-2 text-center">Borrower Name</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Original Amount</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Transaction Hash</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Current Principal Balance</th>
              </tr>
            </thead>
            <tbody>
              {certificate.LoansDetails.map((loan, index) => (
                <tr key={loan.ID} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-1">{loan.ID}</td> {/* Reducido py */}
                  <td className="border border-gray-300 px-4 py-1">{loan.Borrower_FullName || 'N/A'}</td>
                  <td className="border border-gray-300 px-4 py-1 text-center">
                    {loan.Original_Loan_Amount ? `$${parseFloat(loan.Original_Loan_Amount).toFixed(2)}` : 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-4 py-1 font-mono text-xs break-all">
                    {loan.TXid || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-4 py-1 text-center font-semibold">
                    ${parseFloat(loan.Currrent_Principal_Bal || '0').toFixed(2)} {/* Corregido typo */}
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

      {/* Estilos para impresión mejorados */}
      <style>{`
        @media print {
          .page-break {
            break-after: page;
          }
          body {
            margin: 0;
            padding: 0;
          }
          table {
            font-size: 8pt; /* Reducido para caber más filas si hay muchas */
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

// Ejemplo de uso
export default function CertificateViewer() {
  const [userId, setUserId] = React.useState('user123');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-8"> {/* Aumentado ancho para preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            User ID:
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter user ID"
            />
          </label>
          <button
            onClick={() => window.print()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Print Certificate
          </button>
        </div>

        <PortafolioCertificate userId={userId} />
      </div>
    </div>
  );
}