import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import usfciIcon from "../../../assets/usfci.svg";
import { LoadingOverlay } from '@mantine/core';
import { toast } from "react-toastify";
import {
  useStatistics,
  useAvalancheStatistics,
  useBurnTokensMutation,
  useBridgeToBesuMutation,
  useBalance,
  useAvalancheBalance
} from "../../../services/apiUsfci";
import { useAuth } from "../../../hooks/useAuth";
import { toBaseUnits, formatUSFCI, fromBaseUnits, formatFromBaseUnits } from "../../../lib/usfciUtils";
import { Network } from './Convert';
import { ArrowRight, Info, ShieldAlert, History } from 'lucide-react';

interface BurnTokenProps {
  network: Network;
}

export const BurnToken: React.FC<BurnTokenProps> = ({ network }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('redemption');

  // Autenticación real
  const { user, loading: authLoading } = useAuth();
  const walletAddress = (user as any)?.walletAddress || (user as any)?.address || '';

  const { data: besuBalanceData, isLoading: isLoadingBesuBalance } = useBalance(walletAddress);
  const { data: avaBalanceData, isLoading: isLoadingAvaBalance } = useAvalancheBalance(walletAddress);

  const { data: besuStats, isLoading: isLoadingBesuStats } = useStatistics();
  const { data: avaStats, isLoading: isLoadingAvaStats } = useAvalancheStatistics();

  const { mutate: burnBesu, isPending: isBurningBesu } = useBurnTokensMutation();
  const { mutate: bridgeAva, isPending: isBridgingAva } = useBridgeToBesuMutation();

  const isProcessing = network === 'besu' ? isBurningBesu : isBridgingAva;
  const isLoading = authLoading || isLoadingBesuBalance || isLoadingBesuStats || isLoadingAvaStats || isProcessing || isLoadingAvaBalance;

  // El balance disponible para redimir es el balance del usuario, no el supply total
  const userBalanceRaw = network === 'besu' ? (besuBalanceData?.data?.balance ?? '0') : (avaBalanceData?.data?.balance ?? '0');
  const maxAmount = parseFloat(fromBaseUnits(userBalanceRaw));

  const handleRedeem = () => {
    if (!walletAddress || !amount) {
      toast.error('Please enter an amount.');
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      toast.error('Amount exceeds available supply.');
      return;
    }

    const amountInBaseUnits = toBaseUnits(amount);

    if (network === 'besu') {
      burnBesu(
        { walletAddress, amount: amountInBaseUnits, reason },
        {
          onSuccess: () => {
            toast.success(`Successfully redeemed ${amount} USFCI for USD!`);
            setAmount('');
          },
          onError: (error: any) => {
            toast.error(`Redemption failed: ${error.response?.data?.error || error.message}`);
          }
        }
      );
    } else {
      // Avalanche redemption is bridge to Besu (burns on Ava)
      bridgeAva(
        { targetBesu: walletAddress, amount: amountInBaseUnits },
        {
          onSuccess: () => {
            toast.success(`Bridge transaction initiated! ${amount} USFCI burned on Avalanche.`);
            setAmount('');
          },
          onError: (error: any) => {
            toast.error(`Bridge failed: ${error.response?.data?.error || error.message}`);
          }
        }
      );
    }
  };

  return (
    <div className="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'xl', blur: 2 }} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Information Side */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 rounded-3xl border bg-amber-50 border-amber-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info size={18} className="text-amber-600" />
              Redemption Policy
            </h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              When you redeem <span className="font-bold">USFCI</span>, the tokens are permanently destroyed (burned).
              Sunwest Bank then releases the equivalent USD to your registered account.
            </p>

            <div className="mt-8 space-y-4">

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <History size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Processing Time</p>
                  <p className="text-sm font-semibold text-gray-800">Instant Burn / 1-2 Bank Days USD</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${network === 'besu' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Available to Redeem ({network})</p>
            <h4 className="text-4xl font-black">{formatFromBaseUnits(userBalanceRaw, 2)}</h4>
            <p className="text-gray-400 text-sm mt-1 tracking-wide">Your personal USFCI balance available for redemption.</p>
          </div>
        </div>

        {/* Conversion Card Side */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
            <div className="space-y-8">
              {/* Conversion Inputs */}
              <div className="space-y-4">
                <div className="group transition-all duration-300">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Tokens to Burn (USFCI)</label>
                  <div className="flex items-center bg-gray-50 rounded-2xl p-4 border-2 border-transparent focus-within:border-gray-200 transition-all">
                    <img src={usfciIcon} alt="USFCI" className="w-8 h-8 mr-4" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-transparent text-2xl font-bold text-gray-900 outline-none w-full"
                    />
                    <span className="font-black text-gray-300 mr-4">USFCI</span>
                  </div>
                </div>



                <div className="group">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 block">USD to Receive (Bank Deposit)</label>
                  <div className="flex items-center rounded-2xl p-4 border-2 bg-gray-50 border-gray-100">
                    <RiMoneyDollarCircleLine className="text-gray-400 mr-4" size={32} />
                    <div className="text-2xl font-bold text-gray-900 w-full">
                      {formatUSFCI(amount || '0', 2)}
                    </div>
                    <span className="font-black text-gray-300 mr-4">USD</span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 block">Redemption Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for redemption..."
                  rows={2}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-gray-200 rounded-2xl p-4 outline-none text-sm font-medium text-gray-700 resize-none transition-all"
                />
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRedeem}
                disabled={!amount || isProcessing}
                className={`w-full py-5 rounded-2xl text-white font-black text-lg tracking-wide shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all
                                    ${network === 'besu' ? 'bg-gray-900 shadow-gray-200 hover:bg-black' : 'bg-rose-900 shadow-rose-200 hover:bg-rose-950'}`}
              >
                {isProcessing ? 'PROCESSING...' : `INITIATE ${network.toUpperCase()} REDEMPTION`}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};