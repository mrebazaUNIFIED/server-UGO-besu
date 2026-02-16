import { LoginForm } from '../components/auth/LoginForm';
import walletIllustration from '../assets/wallet-bitcoin3.svg';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import fciLogo from "../assets/fci-logo.png"

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Columna izquierda: Imagen + texto */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[var(--rojo)] via-[var(--rojo-claro)] to-[var(--rojo-oscuro)] flex flex-col items-center justify-center p-10 text-center text-white">
        <div className="max-w-md">
          <img
            src={walletIllustration}
            alt="Wallet Illustration"
            className="w-72 mx-auto mb-8 drop-shadow-lg"
          />
          <h2 className="text-3xl font-extrabold mb-4 leading-snug">
            Receive and settle payments instantly <br /> across banking networks
          </h2>
          <p className="text-base text-indigo-100">
            Powered by <span className="font-semibold">$USFCI Stablecoin</span> —
            secure, transparent, and backed 1:1 by USD reserves.
          </p>
        </div>
      </div>

      {/* Columna derecha: Login */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-[var(--gris-claro)]">
        <div className="p-10 w-full max-w-md">
          <div className="bg-white shadow-xl rounded-2xl p-8">
            <div className="mb-8 text-center">
              <span className="inline-block bg-[var(--gris)] text-[var(--rojo)] text-sm px-4 py-1 rounded-full font-semibold mb-4">
                👋 Welcome back!
              </span>
              <div className='flex items-center justify-center'>
                <img src={fciLogo} alt="" className='w-[150px] h-auto text-center' />
              </div>

              <h1 className="text-3xl font-extrabold text-gray-900">
                FCI Wallet Login
              </h1>
              <p className="text-gray-500 mt-2 text-sm">
                Please login to access your account
              </p>
            </div>
            <LoginForm onSuccess={() => { }} />
          </div>
        </div>
      </div>
    </div>
  );
};
