import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    useAllMintRecords,
    useAvalancheMintRecords
} from "../../../services/apiUsfci";
import { formatFromBaseUnits, truncateAddress } from "../../../lib/usfciUtils";
import { Network } from './Convert';
import { Server, Cpu, ExternalLink, Calendar, User, Hash, History as HistoryIcon } from 'lucide-react';
import moment from 'moment';

interface HistoryProps {
    network?: Network | 'all';
}

export const History: React.FC<HistoryProps> = ({ network = 'all' }) => {
    // Invocamos ambos hooks para tener la data global
    const { data: besuRecordsResp, isLoading: isLoadingBesu } = useAllMintRecords(true);
    const { data: avaRecordsResp, isLoading: isLoadingAva } = useAvalancheMintRecords(true);

    const isLoading = isLoadingBesu || isLoadingAva;

    const unifiedRecords = useMemo(() => {
        const besu = (besuRecordsResp?.data || []).map(r => ({ ...r, network: 'besu' }));
        const ava = (avaRecordsResp?.data || []).map(r => ({ ...r, network: 'avalanche' }));

        let combined = [...besu, ...ava];

        if (network !== 'all') {
            combined = combined.filter(r => r.network === network);
        }

        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [besuRecordsResp, avaRecordsResp, network]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                <p className="text-gray-500 font-medium tracking-tight">Fetching global archives...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-gray-900">Mint History</h3>
                    <p className="text-gray-500 text-sm font-medium">Real-time ledger of USFCI issuances across all networks.</p>
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 self-start">
                    <span className="text-sm font-bold text-gray-600">{unifiedRecords.length} Records Found</span>
                </div>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-gray-100 shadow-[0_5px_15px_rgba(0,0,0,0.02)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Network</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Recipient</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Amount</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {unifiedRecords.map((record, idx) => (
                            <motion.tr
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="hover:bg-gray-50/50 transition-colors group"
                            >
                                <td className="px-6 py-5">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${record.network === 'besu'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-rose-50 text-rose-700 border-rose-100'
                                        }`}>
                                        {record.network === 'besu' ? <Server size={12} /> : <Cpu size={12} />}
                                        {record.network === 'besu' ? 'Besu' : 'Avalanche'}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 transition-colors group-hover:bg-white group-hover:shadow-sm">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-tight">
                                                {truncateAddress(record.recipient || (record as any).walletAddress || '0x...')}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Verified Wallet</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-gray-900">
                                            +{formatFromBaseUnits(record.amount)} <span className="text-[10px] text-gray-400 font-bold uppercase ml-0.5">USFCI</span>
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold tracking-wide uppercase">Settled 1:1 USD</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Calendar size={14} className="text-gray-300" />
                                        <span className="text-sm font-semibold tracking-tight">{moment(record.timestamp).format('MMM DD, HH:mm')}</span>
                                    </div>
                                </td>

                            </motion.tr>
                        ))}

                        {unifiedRecords.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-24 text-center">
                                    <div className="flex flex-col items-center space-y-4 opacity-20">
                                        <HistoryIcon size={64} strokeWidth={1} />
                                        <div className="space-y-1">
                                            <p className="text-lg font-black text-gray-900 uppercase tracking-widest">No activity found</p>
                                            <p className="text-sm font-bold text-gray-500">Records will appear here after your first mint.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};