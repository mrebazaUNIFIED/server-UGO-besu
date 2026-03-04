import { useState } from "react";
import { FaSignOutAlt, FaEye, FaEyeSlash, FaCopy, FaCheck } from "react-icons/fa";
import { MdAccountBalanceWallet } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { RiShieldCheckLine } from "react-icons/ri";
import { Tooltip } from "flowbite-react";
import { useVaultAuth } from "../../hooks/useVaultAuth";
import { useWalletBalance } from "../../services/apiUsfci";
import { formatUSFCI, fromBaseUnits } from "../../lib/usfciUtils";

export const UserCardVault = () => {
  const { vaultUser, logout } = useVaultAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const uid = vaultUser?.uid ?? '';
  const { walletAddress, balance, isLoading } = useWalletBalance(uid);

  if (!vaultUser) return null;

  const initial = vaultUser.firstName?.charAt(0).toUpperCase() ?? "?";

  const formattedBalance = balanceVisible
    ? formatUSFCI(fromBaseUnits(balance || '0'), 2)
    : "••••••••";

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "—";

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="space-y-3">
        {/* ── Balance Card ── */}
        <div
          className="relative overflow-hidden rounded-xl p-4 shadow-lg border border-[#0280CC44]"
          style={{
            background: "linear-gradient(135deg, #0280CC18 0%, #0280CC08 60%, #0280CC20 100%)",
          }}
        >
          {/* Glow blob */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: "#0280CC" }} />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MdAccountBalanceWallet className="text-[#0280CC]" style={{ width: 18, height: 18 }} />
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                USFCI Balance
              </span>
            </div>
            <button
              onClick={() => setBalanceVisible(v => !v)}
              className="text-gray-500 hover:text-[#0280CC] transition-colors duration-200 cursor-pointer"
            >
              {balanceVisible ? <FaEye style={{ width: 14, height: 14 }} /> : <FaEyeSlash style={{ width: 14, height: 14 }} />}
            </button>
          </div>

          {/* Balance amount */}
          <div className="flex items-center justify-center gap-3 mb-1">
            {isLoading ? (
              <div className="h-9 w-32 bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-white tracking-tight leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formattedBalance}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-4 text-center">USFCI</p>

          {/* Wallet address pill + open modal */}
          <button
            onClick={() => setWalletModalOpen(true)}
            className="w-full flex items-center justify-between bg-black/20 hover:bg-black/30 transition rounded-lg px-3 py-2 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-300 font-mono">
                {isLoading ? "Loading..." : shortAddress}
              </span>
            </div>
            <span className="text-[10px] text-[#0280CC] font-semibold group-hover:underline">
              View Wallet →
            </span>
          </button>
        </div>

        {/* ── User Card ── */}
        <div className="flex items-center justify-between bg-[#0280CC20] rounded-lg p-3 shadow-sm border border-[#0280CC33]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg text-white" style={{ backgroundColor: "#0280CC" }}>
              {initial}
            </div>
            <div className="text-center">
              <p className="text-lg text-white capitalize">{vaultUser.firstName}</p>
            </div>
          </div>
          <Tooltip content="Logout" placement="right" style="light">
            <button
              onClick={logout}
              className="flex items-center justify-center p-2 rounded-full transition-colors duration-200 cursor-pointer"
              style={{ color: "#0280CC" }}
            >
              <FaSignOutAlt className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Wallet Modal ── */}
      {walletModalOpen && (
        <WalletModal
          vaultUser={vaultUser}
          walletAddress={walletAddress}
          balance={balance}
          isLoading={isLoading}
          balanceVisible={balanceVisible}
          onToggleBalance={() => setBalanceVisible(v => !v)}
          copied={copied}
          onCopy={handleCopy}
          onClose={() => setWalletModalOpen(false)}
        />
      )}
    </>
  );
};


interface WalletModalProps {
  vaultUser: { firstName: string; email: string; uid: string; company?: string };
  walletAddress: string;
  balance: string;
  isLoading: boolean;
  balanceVisible: boolean;
  onToggleBalance: () => void;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

const WalletModal = ({
  vaultUser,
  walletAddress,
  balance,
  isLoading,
  balanceVisible,
  onToggleBalance,
  copied,
  onCopy,
  onClose,
}: WalletModalProps) => {
  const initial = vaultUser.firstName?.charAt(0).toUpperCase() ?? "?";

  const formattedBalance = balanceVisible
    ? formatUSFCI(fromBaseUnits(balance || '0'), 2)
    : "•••••••••••";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(160deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)" }}
      >
        {/* Top accent line */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #0280CC, #00c6ff, #0280CC)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-11 h-11 rounded-full text-white font-bold text-lg shadow-lg"
              style={{ background: "linear-gradient(135deg, #0280CC, #0057a8)" }}
            >
              {initial}
            </div>
            <div>
              <p className="text-white font-semibold text-base capitalize leading-tight">{vaultUser.firstName}</p>
              <p className="text-gray-400 text-xs truncate max-w-[160px]">{vaultUser.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Balance section */}
        <div className="mx-6 mb-5 rounded-xl p-5 border border-white/10" style={{ background: "rgba(2,128,204,0.08)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">USFCI Balance</span>
            <button onClick={onToggleBalance} className="text-gray-500 hover:text-[#0280CC] transition cursor-pointer">
              {balanceVisible ? <FaEye size={13} /> : <FaEyeSlash size={13} />}
            </button>
          </div>

          {isLoading ? (
            <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse mt-2" />
          ) : (
            <div className="flex items-end gap-2 mt-1">
              <span className="text-4xl font-bold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formattedBalance}
              </span>
              <span className="text-[#0280CC] font-semibold text-sm mb-1">USFCI</span>
            </div>
          )}

          {/* KYC badge */}
          <div className="mt-3 flex items-center gap-1.5">
            <RiShieldCheckLine size={14} className="text-green-400" />
            <span className="text-xs text-green-400 font-medium">KYC Approved</span>
          </div>
        </div>

        {/* Wallet address */}
        <div className="mx-6 mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Wallet Address</p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <span className="text-gray-300 font-mono text-xs flex-1 break-all leading-relaxed">
              {isLoading ? "Loading..." : walletAddress || "—"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onCopy}
                className="text-gray-500 hover:text-[#0280CC] transition p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                title="Copy address"
              >
                {copied ? <FaCheck size={13} className="text-green-400" /> : <FaCopy size={13} />}
              </button>
            </div>
          </div>
          {copied && (
            <p className="text-xs text-green-400 mt-1.5 ml-1">Address copied!</p>
          )}
        </div>

        {/* Info row */}
        <div className="mx-6 mb-6 grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Network</p>
            <p className="text-white text-sm font-semibold">FCI Blockchain</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Organization</p>
            <p className="text-white text-sm font-semibold">FCI</p>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #0280CC44, transparent)" }} />
        <p className="text-center text-xs text-gray-600 py-3">FCI Blockchain Network</p>
      </div>
    </div>
  );
};