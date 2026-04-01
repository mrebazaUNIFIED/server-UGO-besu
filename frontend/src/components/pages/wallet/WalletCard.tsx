import { fromBaseUnits, formatUSFCI, formatUSD } from "../../../lib/usfciUtils";
import { useAuth } from "../../../hooks/useAuth";
import { useBalance, useAvalancheBalance } from "../../../services/apiUsfci";
import { ButtonSend } from "./ButtonSend";
import { Server, Cpu } from "lucide-react";

export const WalletCard = () => {
    const { user, loading: authLoading } = useAuth();
    const walletAddress = (user as any)?.walletAddress || (user as any)?.address || '';

    const { data: besuBalanceData, isLoading: loadingBesu } = useBalance(walletAddress);
    const { data: avaBalanceData, isLoading: loadingAva } = useAvalancheBalance(walletAddress);

    const isLoading = authLoading || loadingBesu || loadingAva;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-[200px]">
                <div className="bg-gray-900 rounded-[2rem] p-6 animate-pulse" />
                <div className="bg-gray-900 rounded-[2rem] p-6 animate-pulse" />
            </div>
        );
    }

    const besuBalance = fromBaseUnits(besuBalanceData?.data?.balance || '0');
    const avaBalance = fromBaseUnits(avaBalanceData?.data?.balance || '0');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Besu Card */}
                <div className="relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl text-white bg-black border border-gray-800 group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-all" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <Server size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70">Besu Network</span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Available Balance</p>
                        <h2 className="text-4xl font-black mb-2">{formatUSFCI(besuBalance, 2)} <span className="text-sm font-light text-gray-500">USFCI</span></h2>
                        <p className="text-gray-500 text-sm font-medium italic">≈ {formatUSD(besuBalance)} USD</p>
                    </div>
                </div>

                {/* Avalanche Card */}
                <div className="relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl text-white bg-black border border-gray-800 group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full group-hover:bg-rose-500/20 transition-all" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                                <Cpu size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/70">Avalanche Network</span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Available Balance</p>
                        <h2 className="text-4xl font-black mb-2">{formatUSFCI(avaBalance, 2)} <span className="text-sm font-light text-gray-500">USFCI</span></h2>
                        <p className="text-gray-500 text-sm font-medium italic">≈ {formatUSD(avaBalance)} USD</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-center md:justify-start pt-2">
                <ButtonSend />
            </div>
        </div>
    );
};