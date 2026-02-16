import React from 'react'
import { dateFormat2 } from "../../../../lib/utils";
import { useLoanHistoryWithChanges } from '../../../../services/apiVault';
import type { LoanHistoryWithChanges } from '../../../../types/vaultTypes';

interface ModalProps {
    loanUid?: string;
}

export const TabTraceability: React.FC<ModalProps> = ({ loanUid }) => {
    const { data: historyData, isLoading, isError } = useLoanHistoryWithChanges(loanUid || '', !!loanUid);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return dateFormat2(date);
    };

    if (isLoading) {
        return (
            <div className="mt-4 flex justify-center items-center h-64">
                <p className="text-gray-500">Cargando historial...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mt-4 flex justify-center items-center h-64">
                <p className="text-red-500">Error al cargar el historial</p>
            </div>
        );
    }

    const history: LoanHistoryWithChanges[] = historyData || [];

    return (
        <div className="mt-4">
            <div className="overflow-auto max-h-[480px]">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden table-fixed">
                    <thead className="bg-blue-500 text-white">
                        <tr>
                            <th className="p-2 sticky top-0 bg-blue-500 w-1/6">Transaction ID</th>
                            <th className="p-2 sticky top-0 bg-blue-500 w-1/6">Time Stamp</th>
                            <th className="p-2 sticky top-0 bg-blue-500 w-4/6">Changes</th>
                        </tr>
                    </thead>

                    <tbody>
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-4 text-center text-gray-500">
                                    No history available
                                </td>
                            </tr>
                        ) : (
                            history.map((record, index) => (
                                <tr key={record.TxId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="p-2 border-b border-gray-200 break-all text-xs">
                                        {record.TxId}
                                    </td>
                                    <td className="p-2 border-b border-gray-200 text-sm whitespace-nowrap">
                                        {formatTimestamp(record.Timestamp)}
                                    </td>
                                    <td className="p-2 border-b border-gray-200">
                                        {!record.Changes || record.Changes.length === 0 ? (
                                            <span className="text-gray-400 italic text-sm">No changes</span>
                                        ) : (
                                            <div className="w-full">
                                                <table className="min-w-full border border-gray-300">
                                                    <thead className="bg-gray-200">
                                                        <tr className='text-center'>
                                                            <th className="p-2 text-center text-xs font-semibold border-b border-gray-300">Field Name</th>
                                                            <th className="p-2 text-center text-xs font-semibold border-b border-gray-300">Previous Value</th>
                                                            <th className="p-2 text-center text-xs font-semibold border-b border-gray-300">Updated Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {record.Changes.map((change, changeIndex) => (
                                                            <tr key={changeIndex} className={changeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                <td className="p-2 text-xs font-medium text-blue-600 border-b border-gray-300">
                                                                    {change.PropertyName}
                                                                </td>
                                                                <td className="p-2 text-xs text-gray-700 border-b border-gray-300">
                                                                    {change.OldValue || <em className="text-gray-400">(empty)</em>}
                                                                </td>
                                                                <td className="p-2 text-xs text-gray-700 border-b border-gray-300">
                                                                    {change.NewValue || <em className="text-gray-400">(empty)</em>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}