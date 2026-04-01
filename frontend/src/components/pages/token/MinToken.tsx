import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import usfciIcon from "../../../assets/usfci.svg";
import { LoadingOverlay } from '@mantine/core';
import { toast } from "react-toastify";
import { 
    useStatistics, 
    useAvalancheStatistics, 
    useMintTokensMutation, 
    useMintAvalancheMutation,
    useBalance
} from "../../../services/apiUsfci";
import { useAuth } from "../../../hooks/useAuth";
import { toBaseUnits, formatUSFCI, fromBaseUnits, formatFromBaseUnits } from "../../../lib/usfciUtils";
import { Network } from './Convert';
import { ArrowRight, Info, ShieldCheck, Zap } from 'lucide-react';

interface MinTokenProps {
    network: Network;
}

export const MinToken: React.FC<MinTokenProps> = ({ network }) => {
    const [amount, setAmount] = useState('');
    const [reserveProof, setReserveProof] = useState('');

    // Hooks from apiUsfci.ts
    // Autenticación real
    const { user, loading: authLoading } = useAuth();
    const walletAddress = (user as any)?.walletAddress || (user as any)?.address || '';
    const { isLoading: isLoadingBalance } = useBalance(walletAddress);
    
    const { data: besuStats, isLoading: isLoadingBesuStats } = useStatistics();
    const { data: avaStats, isLoading: isLoadingAvaStats } = useAvalancheStatistics();
    
    const { mutate: mintBesu, isPending: isMintingBesu } = useMintTokensMutation();
    const { mutate: mintAva, isPending: isMintingAva } = useMintAvalancheMutation();

    const stats = network === 'besu' ? besuStats?.data : avaStats?.data;
    const isMinting = network === 'besu' ? isMintingBesu : isMintingAva;
    const isLoading = authLoading || isLoadingBesuStats || isLoadingAvaStats || isMinting || isLoadingBalance;

    const handleMint = () => {
        if (!walletAddress || !amount || !reserveProof) {
            toast.error('Please fill in all fields.');
            return;
        }

        const amountInBaseUnits = toBaseUnits(amount);
        const mutation = network === 'besu' ? mintBesu : mintAva;

        mutation(
            {
                walletAddress: walletAddress,
                recipient: walletAddress, // Para avalanche se llama recipient en el controller
                amount: amountInBaseUnits,
                reserveProof
            } as any,
            {
                onSuccess: () => {
                    toast.success(`Successfully minted ${amount} USFCI on ${network === 'besu' ? 'Besu' : 'Avalanche'}!`);
                    setAmount('');
                    setReserveProof('');
                },
                onError: (error: any) => {
                    toast.error(`Mint failed: ${error.response?.data?.error || error.message}`);
                }
            }
        );
    };

    const totalSupply = stats 
        ? formatFromBaseUnits(network === 'besu' ? (stats as any).totalSupply : (stats as any).currentSupply, 0) 
        : '0';

    return (
        <div className="relative">
            <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'xl', blur: 2 }} />
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Information Side */}
                <div className="lg:col-span-2 space-y-6">
                    <div className={`p-8 rounded-3xl border ${network === 'besu' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} transition-colors duration-500`}>
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Info size={18} className={network === 'besu' ? 'text-emerald-600' : 'text-rose-600'} />
                            About Minting
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Minting generates new <span className="font-bold">USFCI</span> tokens. 
                            Each token is strictly backed 1:1 by USD reserves at Sunwest Bank. 
                            The process is transparent, secure, and regulated.
                        </p>
                        
                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${network === 'besu' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Network Security</p>
                                    <p className="text-sm font-semibold text-gray-800">{network === 'besu' ? 'Permissioned Ledger' : 'Avalanche C-Chain'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${network === 'besu' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Settlement</p>
                                    <p className="text-sm font-semibold text-gray-800">Instant / Atomic</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${network === 'besu' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Total Supply ({network})</p>
                        <h4 className="text-4xl font-black">{totalSupply}</h4>
                        <p className="text-gray-400 text-sm mt-1 tracking-wide">USFCI Tokens in circulation</p>
                    </div>
                </div>

                {/* Conversion Card Side */}
                <div className="lg:col-span-3">
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                        <div className="space-y-8">
                            {/* Conversion Inputs */}
                            <div className="space-y-4">
                                <div className="group transition-all duration-300">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Amount to Deposit (USD)</label>
                                    <div className="flex items-center bg-gray-50 rounded-2xl p-4 border-2 border-transparent focus-within:border-gray-200 transition-all">
                                        <RiMoneyDollarCircleLine className="text-gray-400 mr-4" size={32} />
                                        <input 
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="bg-transparent text-2xl font-bold text-gray-900 outline-none w-full"
                                        />
                                        <span className="font-black text-gray-300 mr-4">USD</span>
                                    </div>
                                </div>

                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className={`p-4 rounded-2xl bg-white shadow-xl border border-gray-50 transform group-hover:rotate-180 transition-transform ${network === 'besu' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        <ArrowRight size={24} className="rotate-90 md:rotate-0" />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Tokens to Receive (USFCI)</label>
                                    <div className={`flex items-center rounded-2xl p-4 border-2 transition-all ${network === 'besu' ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-rose-50/30 border-rose-100/50'}`}>
                                        <img src={usfciIcon} alt="USFCI" className="w-8 h-8 mr-4" />
                                        <div className="text-2xl font-bold text-gray-900 w-full">
                                            {formatUSFCI(amount || '0', 2)}
                                        </div>
                                        <span className="font-black text-gray-300 mr-4">USFCI</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reserve Proof */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 block">Reserve Proof Reference</label>
                                <textarea 
                                    value={reserveProof}
                                    onChange={(e) => setReserveProof(e.target.value)}
                                    placeholder="Enter Sunwest Bank transaction reference or reserve proof identifier..."
                                    rows={2}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-gray-200 rounded-2xl p-4 outline-none text-sm font-medium text-gray-700 resize-none transition-all"
                                />
                            </div>

                            {/* Mint Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleMint}
                                disabled={!amount || !reserveProof || isMinting}
                                className={`w-full py-5 rounded-2xl text-white font-black text-lg tracking-wide shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all
                                    ${network === 'besu' ? 'bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600' : 'bg-rose-500 shadow-rose-200 hover:bg-rose-600'}`}
                            >
                                {isMinting ? 'PROCESING TRANSACTION...' : `MINT USFCI ON ${network.toUpperCase()}`}
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};