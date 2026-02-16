import React from 'react';

const LogoSvg: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props} // Pasa className, etc.
  >
    {/* Diamante rojo */}
    <polygon points="50,5 95,50 50,95 5,50" fill="#DC2626" />
    {/* Texto FCI */}
    <text x="50" y="60" text-anchor="middle" fill="white" font-size="24" font-weight="bold" font-family="Arial, sans-serif">
      FCI
    </text>
  </svg>
);
export const Loading: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center space-y-4">
        {/* Logo con efecto de llenado */}
        <div className="logo-fill relative">
          <LogoSvg className="w-24 h-24" /> {/* Ahora sí, className funciona */}
          {/* Glow sutil */}
          <div className="absolute inset-0 w-24 h-24 bg-red-500 rounded-full blur-xl opacity-20 animate-ping"></div>
        </div>
        <p className="text-gray-600 font-semibold text-lg">Inicializando FCI...</p>
      </div>
    </div>
  );
};