import { RiWalletLine } from "react-icons/ri";
import usfciIcon from "../../../assets/usfci.svg";
import { useMyWalletAddress, useBalance } from "../../../hooks/useApi";
import { fromBaseUnits, formatUSFCI, formatUSD, truncateAddress } from "../../../lib/usfciUtils";
import { ButtonSend } from "./ButtonSend";

export const WalletCard = () => {
  const { data: walletAddress, isLoading: loadingWallet, error: walletError } = useMyWalletAddress();
  const { data: balanceData, isLoading: loadingBalance, error: balanceError } = useBalance(walletAddress || '');

  const isLoading = loadingBalance || loadingWallet;
  const error = balanceError || walletError;

  if (isLoading) {
    return (
      <div className="w-full max-w-md h-[250px]">
        <div className="bg-gradient-to-br from-[var(--negro-light)] via-[var(--negro)] to-[var(--rojo-oscuro)] text-white rounded-3xl border border-white/20 p-4 animate-pulse h-full flex flex-col justify-between">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div>
                <div className="h-5 w-32 bg-white/20 rounded mb-2"></div>
                <div className="h-3 w-40 bg-white/10 rounded"></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-white/20 rounded-full"></div>
              <div className="w-5 h-5 bg-white/20 rounded"></div>
            </div>
          </div>

          {/* Balance skeleton */}
          <div className="flex flex-col items-center text-center flex-1 justify-center">
            <div className="h-4 w-28 bg-white/20 rounded mb-4"></div>
            <div className="h-12 w-40 bg-white/30 rounded mb-3"></div>
            <div className="flex items-center space-x-2 mt-2">
              <div className="h-3 w-24 bg-white/10 rounded"></div>
              <div className="w-1 h-1 bg-white/30 rounded-full"></div>
              <div className="h-3 w-20 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !balanceData) {
    return (
      <div className="w-full max-w-md py-10 text-center text-red-600">
        Failed to load balance
      </div>
    );
  }

  const balanceInBaseUnits = balanceData.data?.balance || '0';
  const balanceInUSFCI = fromBaseUnits(balanceInBaseUnits);
  const formattedBalance = formatUSFCI(balanceInUSFCI, 2);
  const formattedUSD = formatUSD(balanceInUSFCI);

  return (
    <div
      className="relative rounded-[2.5rem] p-10 overflow-hidden shadow-2xl text-white"
      style={{
        background: "linear-gradient(135deg, #8E0B27 0%, #200208 100%)"
      }}>
      <div className="relative z-10">
        <div className="flex justify-between mb-12">
          <div>
            <p className="text-red-200 text-xs uppercase font-bold tracking-widest mb-1 opacity-70"> Available Balance
            </p>
            <h2 className="text-6xl font-bold">{formattedBalance} ≈ {formattedUSD}<span
              className="text-2xl font-light opacity-50 italic">USFCI</span></h2>
            <p className="text-red-300/40 text-lg mt-2 italic font-mono uppercase tracking-tighter">Sunwest Bank
              Backed Reserves</p>
          </div>
          <div
            className="w-24 h-24 bg-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-center border border-white/10">
            <img src={usfciIcon} alt="USFCI" className="w-24 h-24" />
          </div>
        </div>

        <div className="flex space-x-4">
          <ButtonSend />

        </div>
      </div>
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
    </div>
  );
};