import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { Pagination } from "@mantine/core";
import { RiEyeLine } from "react-icons/ri";
import { useAllTransactions } from "../../../hooks/useApi";
import { ModalTransfer } from "./ModalTransfer";
import type { TransactionRecord } from "../../../types";
import { formatFromBaseUnits, truncateAddress } from "../../../lib/usfciUtils";

export const TableTransaction = () => {
    const { data, isLoading, error, refetch, isFetching } = useAllTransactions();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [opened, setOpened] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);

    const itemsPerPage = 10;

    // 🔹 Ordenar datos
    const sortedData = useMemo(() => {
        if (!data) return [];
        const validData = data.filter(item => item && item.timestamp);
        return [...validData].sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        );
    }, [data]);

    // 🔹 Filtrar
    const filteredData = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return sortedData.filter(item =>
            item.recipientAddress.toLowerCase().includes(searchLower) ||
            item.senderAddress.toLowerCase().includes(searchLower) ||
            (item.metadata && item.metadata.toLowerCase().includes(searchLower)) ||
            item.amount.includes(searchTerm) ||
            new Date(item.timestamp).toLocaleString().toLowerCase().includes(searchLower)
        );
    }, [sortedData, searchTerm]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Resetear página cuando cambia el filtro
    useMemo(() => setCurrentPage(1), [searchTerm, sortedData.length]);

    const openModal = (transaction: TransactionRecord) => {
        setSelectedTransaction(transaction);
        setOpened(true);
    };

    const closeModal = () => {
        setOpened(false);
        setSelectedTransaction(null);
    };

    if (isLoading || isFetching) {
        return (
            <div className="w-full py-8 px-4">
                <div className="mb-6 animate-pulse">
                    <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
                <div className="my-6 p-4 bg-gray-50 rounded-lg flex justify-between items-center animate-pulse">
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    <div className="h-8 w-64 bg-gray-200 rounded"></div>
                </div>
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></th>
                                <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></th>
                                <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></th>
                                <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></th>
                                <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></th>
                                <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></th>
                                <th className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {[...Array(5)].map((_, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (error || sortedData.length === 0) {
        toast.error(error instanceof Error ? error.message : "No transactions found");
        return (
            <div className="w-full py-12 px-4 flex flex-col items-center justify-center">
                <p className="text-red-600 mb-4">
                    {error instanceof Error ? error.message : "No transactions found."}
                </p>
                <button
                    onClick={() => refetch()}
                    className="bg-[var(--rojo)] text-white py-2 px-6 rounded-lg font-semibold hover:bg-[var(--rojo-oscuro)] transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="w-full mt-10">
            <div className="w-full py-8 px-4 mx-auto bg-white rounded-lg">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-[var(--rojo)] mb-2">All Transaction History</h2>
                    <p className="text-[var(--gris-oscuro)]">View all USFCI transfers.</p>
                </div>

                {/* Search and Total */}
                <div className="my-6 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                    <p className="text-sm text-gray-600 font-semibold">
                        Total transactions:{" "}
                        <span className="font-semibold text-[var(--rojo)]">{sortedData.length}</span>
                        {searchTerm && ` | Showing ${filteredData.length} results`}
                    </p>
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--rojo)] w-64"
                    />
                </div>

                {/* Table */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="overflow-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N°</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (USFCI)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date and time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentData.map((item, index) => {
                                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                    // ✅ Usar formatFromBaseUnits que maneja la conversión y formato
                                    const amountFormatted = formatFromBaseUnits(item.amount, 2);
                                    
                                    return (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{rowNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-mono max-w-xs truncate block" title={item.senderAddress}>
                                                    {truncateAddress(item.senderAddress)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                {amountFormatted}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-mono max-w-xs truncate block" title={item.recipientAddress}>
                                                    {truncateAddress(item.recipientAddress)}
                                                </span>
                                            </td>
                                          
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <button
                                                    onClick={() => openModal(item)}
                                                    className="cursor-pointer text-[var(--rojo)] hover:text-[var(--rojo-oscuro)] transition-colors p-1 rounded hover:bg-gray-100"
                                                    title="View details"
                                                >
                                                    <RiEyeLine className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex justify-center">
                        <Pagination
                            total={totalPages}
                            value={currentPage}
                            onChange={setCurrentPage}
                            color="red"
                            size="sm"
                        />
                    </div>
                )}

                {/* Modal */}
                <ModalTransfer opened={opened} onClose={closeModal} transaction={selectedTransaction} />
            </div>
        </div>
    );
};