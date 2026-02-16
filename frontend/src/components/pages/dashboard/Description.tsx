import React from "react";
import { useSystemConfig, useStatistics } from "../../../hooks/useApi";
import { formatMoney } from "../../../lib/utils";

interface CardDetailsSystemProps {
    title: string;
    value: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    className?: string;
}

export const CardDetailsSystem: React.FC<CardDetailsSystemProps> = ({
    title,
    value,
    backgroundColor = "bg-[var(--negro)]",
    borderColor = "border-[var(--rojo)]",
    textColor = "text-white",
    className = "",
}) => {
    // Ajustar tamaño según longitud del valor
    const getFontSize = (text: string) => {
        if (text.length > 20) return "text-lg";
        if (text.length > 15) return "text-xl";
        if (text.length > 10) return "text-2xl";
        return "text-3xl";
    };

    return (
        <div
            className={`w-full max-w-sm p-6 rounded-lg ${backgroundColor} ${borderColor} ${textColor} border-2 shadow-lg ${className}`}
        >
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className={`font-bold break-words ${getFontSize(value)}`}>
                {value}
            </p>
        </div>
    );
};

export const Description = () => {
    const { data: configResponse, isLoading: isLoadingConfig, error: configError, refetch: refetchConfig } = useSystemConfig();
    const { data: statsResponse, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useStatistics();

    if (isLoadingConfig || isLoadingStats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, index) => (
                    <div
                        key={index}
                        className="w-full max-w-sm p-6 rounded-lg bg-gray-200 animate-pulse border-2 border-gray-300 shadow-lg"
                    >
                        <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                        <div className="h-12 bg-gray-300 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (configError || statsError || !configResponse?.success || !configResponse.data || !statsResponse?.success || !statsResponse.data) {
        return (
            <div className="w-full p-6 text-center">
                <p className="text-red-600 mb-4">
                    {configError?.message || statsError?.message || configResponse?.error || statsResponse?.error || "No system info available."}
                </p>
                <button
                    onClick={() => { refetchConfig(); refetchStats(); }}
                    className="bg-[var(--rojo)] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[var(--rojo-oscuro)] transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const config = configResponse.data;
    const stats = statsResponse.data;

    // Asumiendo 18 decimales para el token
    const decimals = 18;
    const totalSupplyFormatted = formatMoney(Number(BigInt(stats.totalSupply) / BigInt(10 ** decimals)));
    const maxTxAmountFormatted = formatMoney(Number(BigInt(config.maxTransactionAmount) / BigInt(10 ** decimals)));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CardDetailsSystem
                title="Total Token"
                value={`${totalSupplyFormatted} ${config.tokenSymbol}`}
                backgroundColor="bg-[var(--negro-light)]"
                borderColor="border-[var(--blanco)]"
            />

            <CardDetailsSystem
                title="Token Symbol"
                value={config.tokenSymbol}
                backgroundColor="bg-[var(--rojizo)]"
                borderColor="border-[var(--blanco)]"
            />

            <CardDetailsSystem
                title="Reserve Bank"
                value={config.reserveBank}
                backgroundColor="bg-[var(--rojo-oscuro)]"
                borderColor="border-[var(--blanco)]"
            />

            <CardDetailsSystem
                title="Max Transaction Amount"
                value={`${maxTxAmountFormatted} ${config.tokenSymbol}`}
                backgroundColor="bg-[var(--gris-oscuro)]"
                borderColor="border-[var(--gris)]"
                textColor="text-[var(--negro)]"
            />
        </div>
    );
};