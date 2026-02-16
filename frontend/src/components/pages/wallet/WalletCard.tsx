import { RiWalletLine } from "react-icons/ri";
import usfciIcon from "../../../assets/usfci.svg";
import { useMyWalletAddress, useBalance } from "../../../hooks/useApi";
import { fromBaseUnits, formatUSFCI, formatUSD, truncateAddress } from "../../../lib/usfciUtils";

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

    // ✅ Convertir balance de unidades base a USFCI legible
    const balanceInBaseUnits = balanceData.data?.balance || '0';
    const balanceInUSFCI = fromBaseUnits(balanceInBaseUnits);
    const formattedBalance = formatUSFCI(balanceInUSFCI, 2);
    const formattedUSD = formatUSD(balanceInUSFCI);

    return (
        <div className="w-full max-w-md relative overflow-hidden">
            <div className="bg-gradient-to-br from-[var(--negro-light)] via-[var(--negro)] to-[var(--rojo-oscuro)] text-white rounded-3xl border border-white/20">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div>
                            <h3 className="text-lg font-semibold">USFCI Wallet</h3>
                            <p className="text-xs text-white/80">
                                Backed 1:1 by USD Reserves
                            </p>
                            {walletAddress && (
                                <p className="text-xs text-white/60 mt-1 font-mono">
                                    {truncateAddress(walletAddress, 6, 4)}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <img src={usfciIcon} alt="USFCI" className="w-10 h-10" />
                        <RiWalletLine className="w-5 h-5" />
                    </div>
                </div>

                {/* Balance Section */}
                <div className="p-4 pt-0 flex flex-col items-center text-center">
                    <span className="uppercase text-xs tracking-wider text-white/70 mb-2 font-semibold">
                        Available Balance
                    </span>
                    <div className="relative">
                        <h2 className="text-7xl font-bold inline-block">
                            {formattedBalance}
                        </h2>
                        <span className="text-2xl ml-2">USFCI</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-white/80 mt-2 mb-6">
                        <span>≈ {formattedUSD}</span>
                        <div className="w-1 h-1 bg-white/50 rounded-full"></div>
                        <span className="text-xs">Sunwest Bank Backed</span>
                    </div>
                </div>
            </div>
        </div>
    );
};