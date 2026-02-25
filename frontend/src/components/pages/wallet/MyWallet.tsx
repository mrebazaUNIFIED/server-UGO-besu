import { toast } from "react-toastify";
import { RiFileCopyLine, RiCheckLine } from "react-icons/ri";
import usfciIcon from "../../../assets/usfci.svg";
import { useState } from "react";
import { useMyWalletAddress } from "../../../hooks/useApi";
import { QRCodeSVG } from 'qrcode.react';

export const MyWallet = () => {
  const [isCopied, setIsCopied] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useMyWalletAddress();

  const walletAddress = data ?? "Error loading wallet";

  // Copy Handler
  const handleCopy = async () => {
    if (!walletAddress || walletAddress === "Error loading wallet") return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setIsCopied(true);
      toast.success("Wallet address copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy wallet address");
      console.error("Copy error:", error);
    }
  };

  // Skeleton de carga
  if (isLoading) {
    return (
      <div className="w-full max-w-md h-[250px]">
        <div className="bg-gradient-to-br from-[var(--rojo-oscuro)] via-[var(--negro)] to-[var(--negro-light)] rounded-2xl shadow-lg p-6 border border-gray-200 h-full flex flex-col justify-between animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-white/20 rounded w-40"></div>
            <div className="h-10 w-9 bg-white/20 rounded"></div>
          </div>
          <div className="rounded-xl p-4 mb-4 flex-1 flex flex-col justify-center items-center text-center">
            <div className="h-5 bg-white/20 rounded w-32 mb-4"></div>
            <div className="flex items-center justify-center space-x-2 w-full">
              <div className="h-8 bg-white/30 rounded w-64"></div>
              <div className="h-8 w-8 bg-white/20 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (isError) {
    toast.error(
      `Failed to fetch wallet address: ${(error as any)?.response?.data?.error || (error as Error).message
      }`
    );
  }

  return (
    <div className="space-y-6">
      <div className="fci-card p-8 text-center  rounded-3xl">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-6 tracking-widest">My Wallet Address</h4>
        <div className="inline-block p-4 bg-white rounded-3xl mb-6 shadow-xl">
          <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-black font-bold">
            <QRCodeSVG value={walletAddress} size={256} />
          </div>
        </div>


        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <p className="font-mono text-xs text-gray-700 truncate flex-1">
            {walletAddress}
          </p>

          <button
            onClick={handleCopy}
            disabled={!walletAddress || isCopied}
            className="
        p-2
        rounded-lg
        bg-[var(--rojo-oscuro)]
        text-white
        hover:bg-[var(--rojizo)]
        active:scale-95
        transition-all duration-300
        disabled:bg-gray-300
        disabled:cursor-not-allowed
      "
            title={isCopied ? "Copied!" : "Copy to clipboard"}
          >
            {isCopied ? (
              <RiCheckLine className="w-4 h-4" />
            ) : (
              <RiFileCopyLine className="w-4 h-4" />
            )}
          </button>
        </div>

      </div>


    </div>
  );
};
