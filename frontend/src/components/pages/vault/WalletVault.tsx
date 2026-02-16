import { PDFExport } from '@progress/kendo-react-pdf';
import { useRef } from 'react';
import { PortafolioCertificate } from './portafolio/PortafolioCertificate';
import { useVaultAuth } from '../../../hooks/useVaultAuth';

const A4LandscapeWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-gray-300 p-6 flex justify-center">
      <div
        className="bg-white shadow-2xl"
        style={{
          width: '297mm',      // Ancho para A4 landscape
          minHeight: '210mm',  // Altura para A4 landscape
          padding: '15mm'      // Padding ajustado
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const WalletVault = () => {
  const { vaultUser } = useVaultAuth();
  const userId = vaultUser?.uid || "";


  const pdfExportRef = useRef<PDFExport>(null);

  const exportPDF = () => {
    if (pdfExportRef.current) {
      pdfExportRef.current.save();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 p-6">
      <button
        onClick={exportPDF}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Download PDF
      </button>

      {/* PREVIEW (SE VE COMO PDF EN LANDSCAPE) */}
      <A4LandscapeWrapper>
        <PortafolioCertificate userId={userId} />
      </A4LandscapeWrapper>

      {/* EXPORT (OFF-SCREEN) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '297mm', minHeight: '210mm' }}>
        <PDFExport
          ref={pdfExportRef}
          paperSize="A4"
          landscape={true}
          margin="15mm"
          fileName="portfolio-certificate.pdf"
          forcePageBreak=".page-break"
          scale={0.8}  // Añadido scale para ajustar si es necesario para caber en 2 páginas
        >
          <div style={{ width: '100%', minHeight: '100%' }}>
            <PortafolioCertificate userId={userId} />
          </div>
        </PDFExport>
      </div>
    </div>
  );
};