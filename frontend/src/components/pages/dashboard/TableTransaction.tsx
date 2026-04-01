import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { Pagination } from "@mantine/core";
import { RiEyeLine } from "react-icons/ri";
import { useAllTransferRecords, useAvalancheTransferRecords } from "../../../services/apiUsfci";
import { ModalTransfer } from "./ModalTransfer";
import { formatFromBaseUnits, truncateAddress } from "../../../lib/usfciUtils";
import { FaArrowRight, FaLink, FaEthereum, FaCircleNodes } from "react-icons/fa6";
import type { TransactionRecord } from "../../../types";

export const TableTransaction = () => {
  const isAdmin = true; // Idealmente obtener del contexto de auth
  const { data: besuData, isLoading: isLoadingBesu, isFetching: isFetchingBesu } = useAllTransferRecords(isAdmin);
  const { data: avaxData, isLoading: isLoadingAvax, isFetching: isFetchingAvax } = useAvalancheTransferRecords(isAdmin);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [opened, setOpened] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const itemsPerPage = 10;

  // 🔹 Combinar y Ordenar datos
  const sortedData = useMemo(() => {
    const besuTransfers = besuData?.success ? besuData.data.map(t => ({ ...t, network: 'besu' })) : [];
    const avaxTransfers = avaxData?.success ? avaxData.data.map(t => ({ ...t, network: 'avalanche' })) : [];
    
    const combined = [...besuTransfers, ...avaxTransfers];
    
    return combined.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    );
  }, [besuData, avaxData]);

  // 🔹 Filtrar
  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return sortedData.filter(item => {
      const recipient = item.recipientAddress?.toLowerCase() || "";
      const sender = item.senderAddress?.toLowerCase() || "";
      const metadata = (item as any).metadata?.toLowerCase() || "";
      const amount = item.amount || "";
      const date = new Date(item.timestamp).toLocaleString().toLowerCase();

      return recipient.includes(searchLower) ||
             sender.includes(searchLower) ||
             metadata.includes(searchLower) ||
             amount.includes(searchTerm) ||
             date.includes(searchLower);
    });
  }, [sortedData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Resetear página cuando cambia el filtro
  useMemo(() => setCurrentPage(1), [searchTerm, sortedData.length]);

  const openModal = (transaction: any) => {
    setSelectedTransaction(transaction);
    setOpened(true);
  };

  const closeModal = () => {
    setOpened(false);
    setSelectedTransaction(null);
  };

  const isLoading = isLoadingBesu || isLoadingAvax;
  const isFetching = (isFetchingBesu || isFetchingAvax) && !isLoading;

  return (
    <div className="w-full mt-10">
      <div className="w-full py-8 px-4 mx-auto rounded-4xl bg-white shadow-sm border border-gray-100">
        {/* Header */}
        <div className="font-bold text-gray-800 flex items-center justify-between">
          <div className="flex items-center">
            <span className={`w-2 h-2 ${isFetching ? 'bg-blue-500' : 'bg-red-600'} rounded-full animate-pulse mr-2`}></span>
            <h2 className="text-3xl font-bold text-[var(--rojo)] mb-2">Network Transactions (Live)</h2>
          </div>
          {isFetching && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-blue-500 font-bold animate-pulse">SYNCHRONIZING</span>
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <p className="text-[var(--gris-oscuro)]">View all USFCI transfers across Besu and Avalanche networks.</p>

        {/* Search and Total */}
        <div className="my-6 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
          <p className=" text-gray-600 font-bold text-lg">
            Total transactions:{" "}
            <span className="font-semibold text-[var(--rojo)]">
              {isLoading ? '...' : sortedData.length}
            </span>
            {searchTerm && ` | Showing ${filteredData.length} results`}
          </p>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by address, amount, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--rojo)] w-72 bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Table container */}
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
          <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">N°</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Network</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">From / To</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Amount (USFCI)</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date and time</th>
                  <th className="px-6 py-5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {isLoading ? (
                  /* Loading Skeletons - visible on initial load */
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-5 bg-gray-50 rounded w-full"></div></td>
                      ))}
                    </tr>
                  ))
                ) : currentData.length > 0 ? (
                  currentData.map((item, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const amountFormatted = formatFromBaseUnits(item.amount, 2);

                    return (
                      <tr key={`${(item as any).txHash || index}`} className="hover:bg-red-50/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-medium">{rowNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.network === 'besu' ? (
                            <div className="flex items-center gap-1.5 text-orange-600 font-bold bg-orange-50 px-2.5 py-1 rounded-full w-fit border border-orange-100 uppercase text-[10px]">
                              <FaEthereum className="text-xs" /> Besu
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-full w-fit border border-red-100 uppercase text-[10px]">
                              <FaCircleNodes className="text-xs" /> Avalanche
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          <div className="flex items-center gap-1">
                            <span title={item.senderAddress}>{truncateAddress(item.senderAddress)}</span>
                            <FaArrowRight className="text-gray-300 group-hover:text-red-400 transition-colors" />
                            <span title={item.recipientAddress}>{truncateAddress(item.recipientAddress)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                          {amountFormatted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => openModal(item)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="View Transaction Details"
                          >
                            <RiEyeLine size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              color="red"
              size="sm"
              withEdges
            />
          </div>
        )}

        {/* Modal */}
        <ModalTransfer opened={opened} onClose={closeModal} transaction={selectedTransaction} />
      </div>
    </div>
  );
};