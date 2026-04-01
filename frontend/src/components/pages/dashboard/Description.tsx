import React from "react";
import {
  FaNetworkWired,
  FaRightLeft,
  FaArrowTrendUp,
  FaFire,
  FaWind
} from "react-icons/fa6";
import {
  useStatistics,
  useSystemConfig,
  useAllMintRecords,
  useAllBurnRecords,
  useAvalancheStatistics,
  useAvalancheMintRecords,
  useAvalancheBurnRecords
} from "../../../services/apiUsfci";
import { formatMoney } from "../../../lib/utils";

interface CardDetailsSystemProps {
  networkName: string;
  nodeType: string;
  value: string;
  unit: string;
  totalMints: string;
  totalBurns: string;
  icon?: React.ReactNode;
  statusColor?: string;
}

const CardDetailsSystem: React.FC<CardDetailsSystemProps> = ({
  networkName,
  nodeType,
  value,
  unit,
  totalMints,
  totalBurns,
  icon,
  statusColor = "bg-red-500",
}) => {
  return (
    <div className="bg-[#121212] border border-[#1f1f1f] rounded-xl p-6 flex flex-col justify-between min-h-[300px] transition-all hover:border-[#333] shadow-2xl relative overflow-hidden group">
      {/* Decorative gradient overlay */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-colors"></div>

      <div>
        {/* Header con indicador de estado */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]`}></span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {networkName}
            </span>
          </div>
          {icon && <div className="p-2.5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] text-xl shadow-inner">{icon}</div>}
        </div>

        {/* Tipo de Nodo / Título */}
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          {nodeType}
        </h2>
        <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-6">Active Infrastructure</p>

        {/* Balance Principal */}
        <div className="mb-8">
          <p className="text-[12px] font-bold text-[var(--rojo-claro)] uppercase tracking-[0.15em] mb-1">
            Current Supply
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white tabular-nums tracking-tighter">
              {value}
            </span>
            <span className="text-sm font-bold text-gray-500">{unit}</span>
          </div>
        </div>

        {/* Stats Grid: Mints & Burns */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <FaArrowTrendUp className="text-emerald-500" /> Total Minted
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-white tabular-nums">{totalMints}</span>
              <span className="text-[12px] font-medium text-gray-600 uppercase">{unit}</span>
            </div>
          </div>
          <div className="space-y-1 pl-4 border-l border-white/5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <FaFire className="text-orange-500" /> Total Burned
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-white tabular-nums">{totalBurns}</span>
              <span className="text-[12px] font-medium text-gray-600 uppercase">{unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Description: React.FC = () => {
  const { data: configResponse, isLoading: isLoadingConfig, error: configError, refetch: refetchConfig } = useSystemConfig();
  const { data: statsResponse, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useStatistics();
  const { data: mintsResponse, isLoading: isLoadingMints } = useAllMintRecords();
  const { data: burnsResponse, isLoading: isLoadingBurns } = useAllBurnRecords();
  const { data: avaxStatsResponse, isLoading: isLoadingAvaxStats } = useAvalancheStatistics();
  const { data: avaxMintsResponse, isLoading: isLoadingAvaxMints } = useAvalancheMintRecords();
  const { data: avaxBurnsResponse, isLoading: isLoadingAvaxBurns } = useAvalancheBurnRecords();

  const isLoading = isLoadingConfig || isLoadingStats || isLoadingMints || isLoadingBurns || isLoadingAvaxStats || isLoadingAvaxMints || isLoadingAvaxBurns;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="bg-[#121212] border border-[#1f1f1f] rounded-2xl p-8 min-h-[300px] animate-pulse flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="h-2 bg-white/5 rounded w-1/4"></div>
              <div className="h-8 bg-white/5 rounded w-3/4"></div>
              <div className="h-4 bg-white/5 rounded w-1/2 mt-8"></div>
              <div className="h-10 bg-white/5 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!configResponse?.success || !configResponse.data ||
    !statsResponse?.success || !statsResponse.data ||
    !avaxStatsResponse?.success || !avaxStatsResponse.data) {
    return (
      <div className="w-full p-12 text-center bg-[#121212] border border-red-900/20 rounded-2xl mb-10">
        <p className="text-[var(--rojo-claro)] mb-6 font-medium">
          {configError?.message || statsError?.message || "Critical: System telemetry unavailable."}
        </p>
        <button
          onClick={() => { refetchConfig(); refetchStats(); }}
          className="bg-[var(--rojo)] text-white py-3 px-8 rounded-xl font-bold hover:bg-[var(--rojo-oscuro)] transition-all shadow-lg shadow-red-900/20"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  const config = configResponse.data;
  const stats = statsResponse.data;
  const avaxStats = avaxStatsResponse.data;

  const decimals = 18;

  const sumAmount = (records: any[] | undefined) => {
    if (!records) return BigInt(0);
    return records.reduce((acc, curr) => acc + BigInt(curr.amount || 0), BigInt(0));
  };

  const besuMintsTotal = sumAmount(mintsResponse?.data);
  const besuBurnsTotal = sumAmount(burnsResponse?.data);
  const avaxMintsTotal = sumAmount(avaxMintsResponse?.data);
  const avaxBurnsTotal = sumAmount(avaxBurnsResponse?.data);

  const combinedTotalMints = besuMintsTotal + avaxMintsTotal;
  const combinedTotalBurns = besuBurnsTotal + avaxBurnsTotal;

  const besuSupply = BigInt(stats.totalSupply || 0);
  const avaxSupply = BigInt(avaxStats.currentSupply || 0);
  const combinedTotalSupply = besuSupply + avaxSupply;

  const formatStats = (val: bigint) => formatMoney(Number(val / BigInt(10 ** decimals)));

  const totalSupplyFormatted = formatStats(combinedTotalSupply);
  const totalMintsFormatted = formatStats(combinedTotalMints);
  const totalBurnsFormatted = formatStats(combinedTotalBurns);

  const besuSupplyFormatted = formatStats(besuSupply);
  const besuMintsFormatted = formatStats(besuMintsTotal);
  const besuBurnsFormatted = formatStats(besuBurnsTotal);

  const avaxSupplyFormatted = formatStats(avaxSupply);
  const avaxMintsFormatted = formatStats(avaxMintsTotal);
  const avaxBurnsFormatted = formatStats(avaxBurnsTotal);

  return (
    <div className="p-6 md:p-10 mb-8 bg-black/20 rounded-[2.5rem] backdrop-blur-sm border border-white/5">
      {/* Balance Global Superior */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
        <div>
          <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">
            Ecosystem Global Liquidity
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
            {totalSupplyFormatted} <span className="text-2xl md:text-3xl text-gray-600 ml-2 font-black italic">{config.tokenSymbol}</span>
          </h1>
        </div>

        <div className="flex gap-8 border-l border-white/5 pl-8">
          <div>
            <p className="text-[12px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <FaArrowTrendUp /> Global Issued
            </p>
            <p className="text-2xl font-bold text-white tracking-tighter">{totalMintsFormatted}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <FaFire /> Global Burned
            </p>
            <p className="text-2xl font-bold text-white tracking-tighter">{totalBurnsFormatted}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="flex-1 w-full">
          <CardDetailsSystem
            networkName="Fci Network"
            nodeType="Besu Enterprise"
            value={besuSupplyFormatted}
            totalMints={besuMintsFormatted}
            totalBurns={besuBurnsFormatted}
            unit={config.tokenSymbol}
            statusColor="bg-[var(--rojo)]"
            icon={<FaNetworkWired className="text-[var(--rojo)]" />}
          />
        </div>

        <div className="flex flex-col items-center gap-3 relative px-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent hidden lg:block"></div>
          <div className="w-14 h-14 bg-[var(--rojo)] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(186,24,27,0.4)] cursor-pointer hover:scale-110 transition-transform z-10 border border-white/20">
            <FaRightLeft className="text-white text-2xl" />
          </div>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter whitespace-nowrap">Liquidity Bridge</span>
        </div>

        <div className="flex-1 w-full">
          <CardDetailsSystem
            networkName="Avalanche Fuji"
            nodeType="C-Chain Dynamic"
            value={avaxSupplyFormatted}
            totalMints={avaxMintsFormatted}
            totalBurns={avaxBurnsFormatted}
            unit={config.tokenSymbol}
            statusColor="bg-cyan-400"
            icon={<FaWind className="text-cyan-400" />}
          />
        </div>
      </div>
    </div>
  );
};