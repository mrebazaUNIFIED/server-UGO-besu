import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MinToken } from './MinToken';
import { History } from './History';
import { BurnToken } from './BurnToken';
import { Cpu, Server, History as HistoryIcon, Flame, Coins } from 'lucide-react';
import { useWalletBalance } from '../../../services/apiUsfci';

type TabName = 'mint' | 'history' | 'burn';
export type Network = 'besu' | 'avalanche';

export const Convert: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabName>('mint');
    const [network, setNetwork] = useState<Network>('besu');

    // Recuperar balance del usuario para cada red (ejemplo de integración con apiUsfci)
    const { balance: besuBalance } = useWalletBalance('my-uid-placeholder'); // Esto debería venir de un context de usuario

    const networkClasses = (net: Network): string =>
        `flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all duration-300 border-2 cursor-pointer
         ${network === net
            ? net === 'besu'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-md scale-105'
                : 'bg-rose-50 text-rose-700 border-rose-500 shadow-md scale-105'
            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'
        }`;

    const tabClasses = (tab: TabName): string =>
        `flex flex-col items-center gap-1 flex-1 py-4 text-center cursor-pointer text-sm font-bold transition-all duration-300 relative
         ${activeTab === tab
            ? 'text-gray-900'
            : 'text-gray-400 hover:text-gray-600'
        }`;

    return (
        <div className="w-full max-w-6xl mx-auto my-12 px-4">
            {/* Header & Network Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-(--rojo) tracking-tight flex items-center gap-3">
                        USFCI <span className="text-gray-400 font-light">CONVERT</span>
                        <div className="bg-gray-900 text-white text-[10px] uppercase px-2 py-1 rounded tracking-widest ml-2">Stablecoin</div>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage your assets across Hyperledger Besu and Avalanche.</p>
                </div>

                <div className="flex items-center bg-gray-100 p-1.5 rounded-full shadow-inner gap-2 self-start md:self-center">
                    <div className={networkClasses('besu')} onClick={() => setNetwork('besu')}>
                        <div className={`w-2 h-2 rounded-full ${network === 'besu' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                        <Server size={16} />
                        Besu
                    </div>
                    <div className={networkClasses('avalanche')} onClick={() => setNetwork('avalanche')}>
                        <div className={`w-2 h-2 rounded-full ${network === 'avalanche' ? 'bg-rose-500 animate-pulse' : 'bg-gray-300'}`} />
                        <Cpu size={16} />
                        Avalanche
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden min-h-[700px]">
                {/* Tabs */}
                <div className="flex bg-white/50 backdrop-blur-xl border-b border-gray-100 relative z-10">
                    {[
                        { id: 'mint', label: 'Mint Tokens', icon: <Coins size={20} /> },
                        { id: 'burn', label: 'Redeem / Burn', icon: <Flame size={20} /> },
                        { id: 'history', label: 'Global History', icon: <HistoryIcon size={20} /> }
                    ].map((tab) => (
                        <div
                            key={tab.id}
                            className={tabClasses(tab.id as TabName)}
                            onClick={() => setActiveTab(tab.id as TabName)}
                        >
                            {tab.icon}
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className={`absolute bottom-0 left-0 right-0 h-1 ${network === 'besu' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeTab}-${network}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'mint' && (
                                <div className="p-4 md:p-8">
                                    <MinToken network={network} />
                                </div>
                            )}
                            {activeTab === 'burn' && (
                                <div className="p-4 md:p-8">
                                    <BurnToken network={network} />
                                </div>
                            )}
                            {activeTab === 'history' && (
                                <div className="p-4 md:p-8">
                                    <History network={network} />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="mt-8 text-center text-gray-400 text-sm font-medium">
                Protected by Sunwest Bank Reserve Management System. 1 USFCI = 1 USD.
            </div>
        </div>
    );
}