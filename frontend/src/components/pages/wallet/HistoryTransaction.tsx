import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Pagination, Skeleton } from "@mantine/core";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { ModalTransactionDetail } from "./ModalTransactionDetail";
import { RiEyeLine } from "react-icons/ri";
import { useMyTransactions } from "../../../hooks/useApi";
import { type TransactionRecord } from "../../../types";
import { formatMoney } from "../../../lib/utils";


export const HistoryTransaction = () => {
  const { data: response, isLoading, error, refetch } = useMyTransactions(); // 👈 usamos react-query
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRecord | null>(null);

  const itemsPerPage = 5;

  // Manejo de errores con toast (si error cambia)
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to fetch transactions");
    }
  }, [error]);

  // Procesamos los datos
  const data = response?.data || [];
  const validData =
    data.filter((item: TransactionRecord) => item && item.timestamp) || [];

  const sortedData = [...validData].sort(
    (a: TransactionRecord, b: TransactionRecord) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );

  const filteredData = sortedData.filter((item: TransactionRecord) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.recipientAddress.toLowerCase().includes(searchLower) ||
      (item.metadata &&
        item.metadata.toLowerCase().includes(searchLower)) ||
      item.amount.includes(searchTerm) ||
      new Date(item.timestamp)
        .toLocaleString()
        .toLowerCase()
        .includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (sortedData.length > 0) setCurrentPage(1);
  }, [sortedData.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // FUNCIÓN PARA ABRIR MODAL
  const handleRowClick = (transaction: TransactionRecord) => {
    setSelectedTransaction(transaction);
    setModalOpened(true);
  };

  // LOADING
  if (isLoading) {
    return (
      <div className="w-full py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton height={36} width="40%" radius="sm" mb="xs" />
          <Skeleton height={20} width="60%" radius="sm" />
          <div className="my-6 p-4 bg-gray-50 rounded-lg flex justify-between items-center mb-6">
            <Skeleton height={16} width={150} radius="sm" />
            <Skeleton height={32} width={200} radius="sm" />
          </div>
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-96">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {[...Array(5)].map((_, idx) => (
                      <th key={idx} className="px-6 py-3">
                        <Skeleton height={16} width={100} radius="sm" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(itemsPerPage)].map((_, idx) => (
                    <tr key={idx}>
                      {[...Array(5)].map((_, cidx) => (
                        <td key={cidx} className="px-6 py-4">
                          <Skeleton height={14} width="80%" radius="sm" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <Skeleton height={32} width={200} radius="xl" />
          </div>
        </div>
      </div>
    );
  }

  // ERROR O VACÍO
  if (error || sortedData.length === 0) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">
          {error?.message || "No transactions found."}
        </p>
        <button
          onClick={() => refetch()}
          className="bg-indigo-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // RENDER PRINCIPAL
  return (
    <>
      <ModalTransactionDetail
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        transaction={selectedTransaction}
      />
      <div className="w-full">
        <div className="max-w-7xl py-8 px-4 mx-auto bg-white rounded-lg">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-[var(--rojo)] mb-2">
              My Transactions
            </h2>
            <p className="text-[var(--gris-oscuro)]">View your USFCI transfers.</p>
          </div>

          {/* Search and Total */}
          <div className="my-6 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
            <p className="text-sm text-gray-600 font-semibold">
              Total transactions:{" "}
              <span className="font-semibold text-[var(--rojo)]">
                {sortedData.length}
              </span>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N°
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount (USFCI)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date and time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.map((item: TransactionRecord, index: number) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const isSent = item.type === "sent";
                    const decimals = 18;
                    const formattedAmount = formatMoney(Number(BigInt(item.amount) / BigInt(10 ** decimals)));
                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {rowNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isSent
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {isSent ? (
                              <>
                                <ArrowUpRight className="w-3 h-3" />
                                Sent
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft className="w-3 h-3" />
                                Received
                              </>
                            )}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                            isSent ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {isSent ? "-" : "+"}
                          {formattedAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span
                            className="font-mono max-w-xs truncate block"
                            title={
                              isSent
                                ? item.recipientAddress
                                : item.senderAddress
                            }
                          >
                            {isSent
                              ? `To: ${item.recipientAddress.slice(0, 12)}...`
                              : `From: ${item.senderAddress.slice(0, 12)}...`}
                          </span>
                        </td>
                      
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => handleRowClick(item)}
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
                color="indigo"
                size="sm"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};