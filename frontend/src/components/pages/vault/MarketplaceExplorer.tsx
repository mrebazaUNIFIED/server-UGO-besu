import React, { useState } from "react";
import { FaSearch, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useApprovalByTxHash } from "../../../services/apiMarketplace";

export const MarketplaceExplorer = () => {
  const [searchTxHash, setSearchTxHash] = useState("");
  const [shouldSearch, setShouldSearch] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState("");

  const { data, isLoading, error } = useApprovalByTxHash(
    submittedTxHash,
    shouldSearch
  );

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTxHash.trim()) {
      setSubmittedTxHash(searchTxHash.trim());
      setShouldSearch(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleReset = () => {
    setSearchTxHash("");
    setSubmittedTxHash("");
    setShouldSearch(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-6xl w-full flex flex-col items-center px-6 py-10 overflow-y-auto h-screen">
        {/* Título */}
        <h1 className="text-3xl font-bold text-[#0280CC] mb-2 text-center">
          FCI Marketplace Blockchain Explorer
        </h1>

        {/* Subtítulo */}
        <p className="text-gray-600 text-sm mb-6 text-center max-w-xl">
          Search and verify tokenized loan approvals in real time using a secure,
          transparent blockchain explorer for your financial assets.
        </p>

        {/* Search Bar */}
        <div className="flex flex-col w-full space-y-2 max-w-2xl">
          <div className="flex w-full">
            <input
              type="text"
              value={searchTxHash}
              onChange={(e) => setSearchTxHash(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Paste Approval Transaction Hash (0x...)"
              className="flex-grow px-4 py-2 border border-blue-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={!searchTxHash.trim() || isLoading}
              className="cursor-pointer px-5 py-2 bg-[#0280CC] text-white font-semibold rounded-r-md hover:bg-[#026cae] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <FaSearch size={18} />
              )}
            </button>
          </div>

          {/* Reset Button */}
          {shouldSearch && (
            <button
              type="button"
              onClick={handleReset}
              className="self-start text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← New Search
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="mt-10 text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">
              Searching marketplace blockchain records...
            </p>
          </div>
        )}

        {/* Error */}
        {error && shouldSearch && !isLoading && (
          <div className="mt-10 w-full max-w-4xl bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FaTimesCircle className="text-red-500 text-3xl mr-3" />
              <div>
                <h3 className="text-xl font-semibold text-red-700">
                  Approval Not Found
                </h3>
                <p className="text-red-600 text-sm mt-1">
                  No approval record found for TX:
                  <code className="bg-red-100 px-2 py-1 rounded ml-2">
                    {submittedTxHash}
                  </code>
                </p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              Please verify the transaction hash and ensure it corresponds to a
              marketplace approval transaction.
            </p>
          </div>
        )}

        {/* Success */}
        {data && !isLoading && (
          <div className="mt-10 w-full max-w-4xl">
            {/* Header */}
            <div className="bg-green-50 border border-green-200 rounded-t-lg p-4 flex items-center">
              <FaCheckCircle className="text-green-500 text-3xl mr-3" />
              <div>
                <h3 className="text-xl font-semibold text-green-700">
                  Approval Record Found
                </h3>
                <p className="text-green-600 text-sm">
                  Tokenization approval verified on the marketplace ledger
                </p>
              </div>
            </div>

            {/* Approval Info */}
            <div className="bg-white border-x border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <DetailField
                  label="Transaction Hash"
                  value={data.approvalTxHash || submittedTxHash}
                  mono
                  className="md:col-span-2"
                />
                <DetailField
                  label="Loan ID"
                  value={data.loanId}
                  highlight
                />
                <DetailField
                  label="Approval Status"
                  value={data.isApproved ? "Approved" : "Not Approved"}
                />
              </div>

              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Tokenization Approval Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailField
                  label="Asking Price"
                  value={`$${data.askingPrice} USD`}
                  highlight
                />
                <DetailField
                  label="Minted"
                  value={data.isMinted ? "Yes" : "No"}
                />
                <DetailField
                  label="Cancelled"
                  value={data.isCancelled ? "Yes" : "No"}
                />
                <DetailField
                  label="Lender Address"
                  value={data.lenderAddress}
                  mono
                  className="lg:col-span-3"
                />
                <DetailField
                  label="Approval Timestamp"
                  value={formatDate(data.approvalTimestamp)}
                />
                <DetailField
                  label="Lender UID"
                  value={data.lenderUid}
                />
                <DetailField
                  label="Loan UID"
                  value={data.loanUid}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border border-gray-200 rounded-b-lg p-4 text-center">
              <p className="text-xs text-gray-500">
                This approval record is immutably stored on the FCI Marketplace
                Blockchain and cannot be altered or deleted.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface DetailFieldProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  className?: string;
  mono?: boolean;
}

const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  highlight,
  className,
  mono,
}) => {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
        {label}
      </p>
      <p
        className={`text-sm break-all ${
          mono ? "font-mono" : ""
        } ${highlight ? "font-bold text-blue-600" : "text-gray-800"}`}
      >
        {value || "N/A"}
      </p>
    </div>
  );
};

const formatDate = (timestamp: Date | string | number) => {
  if (!timestamp) return "N/A";
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};