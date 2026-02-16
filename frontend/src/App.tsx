import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";


import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DashboardPage } from "./pages/DashboardPage";
import Home from "./components/pages/dashboard/Home";
import WalletPage from "./pages/WalletPage";
import TokenPage from "./pages/TokenPage";
import ReserveReports from "./pages/ReserveReports";
import Audit from "./pages/Audit";
import { VaultPage } from "./pages/VaultPage";
import { VaultDashboardPage } from "./pages/VaultDashboardPage";
import { Vaulting } from "./components/pages/vault/Vaulting";
import { VaultExplorer } from "./components/pages/vault/VaultExplorer";
import { WalletVault } from "./components/pages/vault/WalletVault";
import { SharedLoans } from "./components/pages/vault/SharedLoans";
import { Explorer } from "./pages/Explorer";
import { SharedExplorer } from "./components/pages/vault/SharedExplorer";
import { MarketplaceExplorer } from "./components/pages/vault/MarketplaceExplorer";

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};


const VaultProtectedRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const vaultUser = localStorage.getItem('vaultUser');
  const vaultKey = localStorage.getItem('vaultKey');

  if (!vaultUser || !vaultKey) {
    return <Navigate to="/vault" />;
  }

  return children;
};


const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas con layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="token-management" element={<TokenPage />} />
          <Route path="reserve-reports" element={<ReserveReports />} />
          <Route path="audit-logs" element={<Audit />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<NotFoundPage />} />

           {/* Rutas de Vault */}
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/share" element={<SharedExplorer />} />


        <Route path="/vault" element={<VaultPage />} />

        <Route
          path="/vaulting"
          element={
            <VaultProtectedRoute>
              <VaultDashboardPage />
            </VaultProtectedRoute>
          }
        >
          <Route index element={<Vaulting/>} />
          <Route path="explorer" element={<VaultExplorer />} />
          <Route path="marketplace" element={<MarketplaceExplorer />} />
          <Route path="portafolio-wallet" element={<WalletVault />} />
          <Route path="my-shared" element={<SharedLoans />} />
        </Route>

      </Routes>


      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
