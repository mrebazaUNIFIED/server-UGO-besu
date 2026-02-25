import React from "react";
import { useSystemConfig, useStatistics, useAllMintRecords, useAllBurnRecords } from "../../../hooks/useApi";
import { formatMoney } from "../../../lib/utils";
import { FaCoins, FaArrowTrendUp, FaFire, FaHouse } from "react-icons/fa6";
import { SystemInfo } from "../../../types";

interface CardDetailsSystemProps {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  borderBottomColor?: string;
  valueColor?: string;
  unitColor?: string;
  className?: string;
}

export const CardDetailsSystem: React.FC<CardDetailsSystemProps> = ({
  title,
  value,
  unit,
  icon,
  borderBottomColor,
  valueColor = "text-gray-800",
  unitColor = "text-gray-400",
  className = "",
}) => {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "1.5rem",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.04), 0 8px 10px -6px rgba(0,0,0,0.04)",
        border: "1px solid #edf2f7",
        borderBottom: borderBottomColor ? `4px solid ${borderBottomColor}` : "1px solid #edf2f7",
      }}
      className={`p-6 ${className} h-[130px]`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {title}
        </span>
        {icon && <span>{icon}</span>}
      </div>

      {/* Valor */}
      <h3 className={`text-2xl font-bold ${valueColor}`}>
        {value}{" "}
        {unit && (
          <span className={`text-sm font-medium ${unitColor}`}>{unit}</span>
        )}
      </h3>
    </div>
  );
};

export const Description = () => {
  const { data: configResponse, isLoading: isLoadingConfig, error: configError, refetch: refetchConfig } = useSystemConfig();
  const { data: statsResponse, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useStatistics();
  const { data: mintsResponse, isLoading: isLoadingMints, error: mintsError, refetch: refetchMints } = useAllMintRecords();
  const { data: burnsResponse, isLoading: isLoadingBurns, error: burnsError, refetch: refetchBurns } = useAllBurnRecords();

  if (isLoadingConfig || isLoadingStats || isLoadingMints || isLoadingBurns) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            style={{
              background: "#fff",
              borderRadius: "1.5rem",
              border: "1px solid #edf2f7",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.04)",
            }}
            className="p-6 animate-pulse"
          >
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-6"></div>
            <div className="h-7 bg-gray-100 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (configError || statsError || mintsError || burnsError || !configResponse?.success || !configResponse.data || !statsResponse?.success || !statsResponse.data || !mintsResponse?.success || !mintsResponse.data || !burnsResponse?.success || !burnsResponse.data) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-red-600 mb-4">
          {configError?.message || statsError?.message || mintsError?.message || burnsError?.message || "No system info available."}
        </p>
        <button
          onClick={() => { refetchConfig(); refetchStats(); refetchMints(); refetchBurns(); }}
          style={{ backgroundColor: "#8E0B27" }}
          className="text-white py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  const config = configResponse.data;
  const stats: SystemInfo = statsResponse.data;

  const decimals = 18;
  const totalSupplyFormatted = formatMoney(Number(BigInt(stats.totalSupply) / BigInt(10 ** decimals)));

  let totalMinted = 0n;
  totalMinted = mintsResponse.data.reduce((sum, record) => sum + BigInt(record.amount), 0n);
  const totalMintedFormatted = formatMoney(Number(totalMinted / BigInt(10 ** decimals)));

  let totalBurned = 0n;
  totalBurned = burnsResponse.data.reduce((sum, record) => sum + BigInt(record.amount), 0n);
  const totalBurnedFormatted = formatMoney(Number(totalBurned / BigInt(10 ** decimals)));

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
      <CardDetailsSystem
        title="Total Supply"
        value={totalSupplyFormatted}
        unit={config.tokenSymbol}
        icon={<FaCoins className="text-gray-300 text-lg" />}
      />

      <CardDetailsSystem
        title="Total Mined"
        value={`+${totalMintedFormatted}`}
        unit={config.tokenSymbol}
        icon={<FaArrowTrendUp className="text-green-500 text-lg" />}
        borderBottomColor="#22c55e"
        valueColor="text-green-600"
        unitColor="text-green-300"
      />

      <CardDetailsSystem
        title="Total Burn"
        value={`-${totalBurnedFormatted}`}
        unit={config.tokenSymbol}
        icon={<FaFire style={{ color: "var(--rojo)" }} className="text-lg" />}
        borderBottomColor="var(--rojo)"
        valueColor="text-[#8E0B27]"
        unitColor="text-red-300"
      />

      <CardDetailsSystem
        title="Reserve Bank"
        value={config.reserveBank.toUpperCase()}
        icon={<FaHouse className="text-gray-300 text-lg" />}
        valueColor="text-gray-800"
      />
    </div>
  );
};