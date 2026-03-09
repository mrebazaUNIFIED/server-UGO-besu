import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";

interface RegisterAccountModalProps {
  firstName: string;
  registering: boolean;
  justRegistered: boolean;
  onRegister: () => void;
  onClose: () => void;
}

export const RegisterAccountModal = ({
  firstName,
  registering,
  justRegistered,
  onRegister,
  onClose,
}: RegisterAccountModalProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (justRegistered) onClose();
  }, [justRegistered]);

  useEffect(() => {
    if (!registering) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [registering]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 flex flex-col items-center gap-6">

        {/* Ícono */}
        <div className="bg-blue-50 rounded-full p-5">
          <Wallet className="h-10 w-10 text-[#0280CC]" />
        </div>

        {/* Texto */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome, {firstName}!
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            You don't have a blockchain account yet. To access the Vault and
            manage your assets, you need to create your wallet on the network.
          </p>
        </div>

        {/* Detalles de lo que se creará */}
        <div className="w-full bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>A blockchain wallet will be generated for you</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Your identity will be registered on the network</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>KYC will be automatically approved</span>
          </div>
        </div>

        {/* Botón */}
        <button
          onClick={onRegister}
          disabled={registering}
          className="w-full py-3 bg-[#0280CC] hover:bg-[#026cae] text-white font-semibold rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {registering ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Creating your account... {elapsed > 0 && `(${elapsed}s)`}
            </>
          ) : (
            "Create My Account"
          )}
        </button>

        {/* Tiempo estimado */}
        {registering ? (
          <p className="text-xs text-amber-500 text-center font-medium">
            ⏳ This process may take up to 1 minute. Please don't close this window.
          </p>
        ) : (
          <p className="text-xs text-gray-400 text-center">
            ⏱ Estimated time: ~1 minute · This is required to use the Vault.
          </p>
        )}
      </div>
    </div>
  );
};