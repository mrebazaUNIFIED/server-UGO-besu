import { useState, useEffect } from "react";
import { Pagination } from "@mantine/core";
import { useAllMintRecords } from "../../../hooks/useApi";
import { formatFromBaseUnits } from "../../../lib/usfciUtils";

export const History = () => {
  // ✅ Usar useAllMintRecords que retorna todos los registros de mint
  const { data, isLoading, isError, error, refetch } = useAllMintRecords();
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 8;

  // ✅ Transformar y ordenar los datos correctamente
  const validData = data?.data?.filter((item) => item && item.timestamp) ?? [];

  const sortedData = [...validData].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const currentData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const shortenProof = (proof: string) =>
    proof.length > 20 ? `${proof.slice(0, 20)}...` : proof;

  // Reset a la primera página si cambian los datos
  useEffect(() => {
    if (sortedData.length > 0) {
      setCurrentPage(1);
    }
  }, [sortedData.length]);

  // === LOADING ===
  if (isLoading) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        <p className="mt-4 text-gray-600">Loading mint history...</p>
      </div>
    );
  }

  // === ERROR o SIN DATOS ===
  if (isError || sortedData.length === 0) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">
          {error?.message || "No mint history found."}
        </p>
        <button
          onClick={() => refetch()}
          className="bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // === DATA ===
  return (
    <div className="w-full py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Mint History</h2>
          <p className="text-gray-600">
            View all USFCI tokens minted on the network.
          </p>
        </div>

        {/* Summary */}
        {sortedData.length > 0 && (
          <div className="my-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Total mints:{" "}
              <span className="font-semibold text-green-600">
                {sortedData.length}
              </span>
            </p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N°
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount (USFCI)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserve Proof
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.map((item, index) => {
                  // ✅ Convertir de base units a formato legible
                  const formattedAmount = formatFromBaseUnits(item.amount, 2);
                  // ✅ Truncar dirección
                  const truncatedAddress = `${item.recipientAddress.slice(0, 6)}...${item.recipientAddress.slice(-4)}`;

                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-mono" title={item.recipientAddress}>
                          {truncatedAddress}
                        </span>
                      </td>
                    
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {formattedAmount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {shortenProof(item.reserveProof || "")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
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
      </div>
    </div>
  );
};