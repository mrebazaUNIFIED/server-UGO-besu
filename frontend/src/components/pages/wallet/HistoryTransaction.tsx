import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Pagination, Skeleton } from "@mantine/core";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { ModalTransactionDetail } from "./ModalTransactionDetail";
import { RiEyeLine } from "react-icons/ri";
import { useMyTransactions } from "../../../hooks/useApi";
import { type TransactionRecord } from "../../../types";
import { formatMoney } from "../../../lib/utils";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";


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



  // RENDER PRINCIPAL
  return (
    <>
      <ModalTransactionDetail
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        transaction={selectedTransaction}
      />
      <div className="w-full fci-card p-8 border-gray-100 rounded-4xl">
        <div className="max-w-7xl ">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-[var(--rojo)] mb-2">
              My Recent Movements
            </h2>
            <p className="text-[var(--gris-oscuro)]">View your USFCI transfers.</p>
          </div>

          {/* Search and Total */}
          <div className="my-6 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
            <p className="text-lg text-gray-600 font-bold">
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
          <div className="rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-96">
              <div className="space-y-5">
                {currentData.map((item: TransactionRecord, index: number) => {
                  const isSent = item.type === "sent";
                  const decimals = 18;
                  const formattedAmount = formatMoney(
                    Number(BigInt(item.amount) / BigInt(10 ** decimals))
                  );

                  return (
                    <div
                      key={index}
                      className="
          
                      flex justify-between items-center
                      p-6
                      rounded-3xl
                      border-2
                    border-gray-200
                    "
                    >
                      {/* LEFT COLUMN */}
                      <div className="flex items-start gap-4">
                        {/* Icon Circle */}
                        <div
                          className={`
              w-12 h-12 flex items-center justify-center rounded-full
              ${isSent ? "bg-red-500/40 text-red-400" : "bg-emerald-500/40 text-emerald-400"}
            `}
                        >
                          {isSent ? (
                            <FaArrowUp className="w-5 h-5" />
                          ) : (
                            <FaArrowDown className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          {/* Wallet */}
                          <p className=" font-semibold text-gray-600">
                            {isSent
                              ? `To ${item.recipientAddress.slice(0, 14)}...`
                              : `From ${item.senderAddress.slice(0, 14)}...`}
                          </p>

                          {/* Date */}
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>

                          {/* Type */}
                          <p
                            className={`
                              w-24
                              py-1.5
                              text-xs
                              font-semibold
                              text-center
                              rounded-full
                              border
                              transition-all duration-300
                              ${isSent
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              }
                              `}
                          >
                            {isSent ? "Sent" : "Received"}
                          </p>
                        </div>
                      </div>

                      {/* RIGHT COLUMN */}
                      <div className="text-right">
                        {/* Amount */}
                        <p
                          className={`text-lg font-bold ${isSent ? "text-red-500" : "text-emerald-500"
                            }`}
                        >
                          {isSent ? "-" : "+"}
                          {formattedAmount} USFCI
                        </p>

                        {/* Action */}
                        <button
                          onClick={() => handleRowClick(item)}
                          className="
              mt-2
              text-sm
              text-[var(--rojo)]
              hover:text-white
              hover:bg-[var(--rojo)]
              px-3 py-1
              rounded-lg
              transition-all duration-300
              focus:outline-none  
            "
                        >
                          <RiEyeLine />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              color="red"
              size="sm"
              radius="xl"
              className="bg-transparent"
            />
          )}
        </div>
      </div>
    </>
  );
};