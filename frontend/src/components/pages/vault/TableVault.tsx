import { useState } from "react";
import { Search, Share2, Store, X } from "lucide-react";
import { usePortfolioLoans } from "../../../services/apiVault";
import { formatMoney } from "../../../lib/utils";
import type { Loan } from "../../../types/vaultTypes";
import { LoanDetailModal } from "../../Modals/LoanDetailModal";
import { SharedModal } from "./shared/SharedModal";
import { DetailMarketplace } from "./marketplace/DetailMarketplace";
import { CancelMarketplace } from "./marketplace/CancelMarketplace";
import { useAutoRegisterUser } from "../../../hooks/useAutoRegisterUser";
interface MarketplaceButtonProps {
  loan: Loan;
  onPublish: () => void;
  onCancel: () => void;
}

const MarketplaceButton = ({ loan, onPublish, onCancel }: MarketplaceButtonProps) => {


  if (loan.isTokenized) {
    return (
      <button
        onClick={onCancel}
        className="px-3 py-1 rounded-md transition flex items-center gap-1 text-sm bg-red-500 text-white hover:bg-red-600 cursor-pointer"
        title="Cancel marketplace listing"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>
    );
  }

  return (
    <button
      onClick={onPublish}
      className="px-3 py-1 rounded-md transition flex items-center gap-1 text-sm bg-green-500 text-white hover:bg-green-600 cursor-pointer"
      title="Publish to marketplace"
    >
      <Store className="w-4 h-4" />
      Publish
    </button>
  );
};

export const TableVault = () => {
  const { alreadyExists, justRegistered, checking } = useAutoRegisterUser();
  const userConfirmed = alreadyExists || justRegistered;
  const { data: loans, isLoading, isError, refetch } = usePortfolioLoans(userConfirmed);
  const isLoadingData = checking || (userConfirmed && isLoading);
  const [filter, setFilter] = useState<"All" | "Open" | "Closed">("All");
  const [selectedLender, setSelectedLender] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectLoanDetail, setSelectLoanDetail] = useState<Loan | null>(null);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedLoanForMarketplace, setSelectedLoanForMarketplace] = useState<Loan | null>(null);

  const uniqueLenders = Array.from(new Set(loans?.map(loan => loan.LenderName).filter(Boolean))) as string[];

  const statusFilteredLoans =
    loans?.filter((loan: Loan) => {
      if (filter === "All") return true;
      if (filter === "Open") {
        const status = loan.Status?.toLowerCase();
        return status === "active" || status === "performing";
      }
      if (filter === "Closed") {
        const status = loan.Status?.toLowerCase();
        return status === "closed" || status === "paid off";
      }
      return true;
    })?.filter((loan: Loan) => {
      if (selectedLender === "All") return true;
      return loan.LenderName === selectedLender;
    }) || [];

  const filteredLoans = statusFilteredLoans.filter((loan: Loan) => {
    const search = searchTerm.toLowerCase();
    const name = loan.LenderName?.toLowerCase() || "";
    const address = loan.PropertyZip?.toLowerCase() || "";
    const id = loan.ID?.toLowerCase() || "";
    return name.includes(search) || address.includes(search) || id.includes(search);
  });

  const handleOpenModal = (loan: Loan) => {
    setIsOpen(true);
    setSelectLoanDetail(loan);
  };

  const onCloseModal = () => {
    setIsOpen(false);
  };

  const handleSelectLoan = (loanId: string) => {
    setSelectedLoans((prev) =>
      prev.includes(loanId)
        ? prev.filter((id) => id !== loanId)
        : [...prev, loanId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLoans.length === filteredLoans.length) {
      setSelectedLoans([]);
    } else {
      setSelectedLoans(filteredLoans.map((loan) => loan.ID));
    }
  };

  const handleShare = () => {
    setIsSharedModalOpen(true);
  };

  const handleCloseSharedModal = () => {
    setIsSharedModalOpen(false);
  };

  const handleOpenMarketplace = (loan: Loan) => {
    setSelectedLoanForMarketplace(loan);
    setIsMarketplaceModalOpen(true);
  };

  const handleCloseMarketplace = () => {
    setIsMarketplaceModalOpen(false);
    setSelectedLoanForMarketplace(null);
  };

  const handleOpenCancelMarketplace = (loan: Loan) => {
    setSelectedLoanForMarketplace(loan);
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelMarketplace = () => {
    setIsCancelModalOpen(false);
    setSelectedLoanForMarketplace(null);
    refetch();
  };

  const selectedLoansData = filteredLoans.filter((loan) =>
    selectedLoans.includes(loan.ID)
  );

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 overflow-x-auto">
      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, address, or loan ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="font-medium text-gray-700">Display</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border border-gray-300 rounded-md p-1"
        >
          <option value="All">All</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>

        <label className="font-medium text-gray-700 ml-4">Accounts</label>
        <select
          value={selectedLender}
          onChange={(e) => setSelectedLender(e.target.value)}
          className="border border-gray-300 rounded-md p-1 min-w-[150px]"
        >
          <option value="All">All</option>
          {uniqueLenders.map((lenderName, idx) => (
            <option key={idx} value={lenderName}>{lenderName}</option>
          ))}
        </select>

        <button
          onClick={() => refetch()}
          className="cursor-pointer bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 transition"
        >
          Refresh
        </button>

        <button
          onClick={() => {
            setFilter("All");
            setSelectedLender("All");
            setSearchTerm("");
            setSelectedLoans([]);
          }}
          className="cursor-pointer bg-gray-200 px-4 py-1 rounded-md hover:bg-gray-300 transition"
        >
          Clear Filters
        </button>

        {selectedLoans.length > 0 && (
          <button
            onClick={handleShare}
            className="cursor-pointer ml-auto bg-green-500 text-white px-4 py-1 rounded-md hover:bg-green-600 transition flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share ({selectedLoans.length})
          </button>
        )}
      </div>

      <div className="overflow-auto max-h-[500px]">
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden table-fixed">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="p-2 sticky top-0 bg-blue-500 z-10 w-12">
                <input
                  type="checkbox"
                  checked={
                    filteredLoans.length > 0 &&
                    selectedLoans.length === filteredLoans.length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">Loan A.D</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">Name</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">Hash</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">Lender Pct</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">City</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">State</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">Zip</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10">Unpaid Balance</th>
              <th className="p-2 sticky top-0 bg-blue-500 z-10"></th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center p-4 text-gray-600">
                  Loading loans...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={10} className="text-center p-4 text-red-600">
                  Error loading loans. Please try again.
                </td>
              </tr>
            ) : !loans || filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center p-4 text-gray-600">
                  {searchTerm || filter !== "All"
                    ? "No loans match your filters"
                    : "No loans available"}
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan: Loan) => (
                <tr
                  key={loan.Account}
                  className={`border-t transition-colors text-center ${selectedLoans.includes(loan.Account)
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                    }`}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedLoans.includes(loan.Account)}
                      onChange={() => handleSelectLoan(loan.Account)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-2 font-medium">{loan.Account}</td>
                  <td className="p-2">{loan.LenderName}</td>
                  <td className="p-2 truncate max-w-[120px] font-mono text-xs" title={loan.TxId}>
                    {loan.TxId ? `${loan.TxId.slice(0, 10)}...${loan.TxId.slice(-8)}` : 'N/A'}
                  </td>
                  <td className="p-2">{loan.LenderOwnerPct}</td>
                  <td className="p-2">{loan.City}</td>
                  <td className="p-2">{loan.State}</td>
                  <td className="p-2">{loan.PropertyZip}</td>
                  <td className="p-2 text-right font-semibold">
                    ${formatMoney(Number(loan.CurrentBalance || 0))}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleOpenModal(loan)}
                        className="cursor-pointer bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition text-sm"
                      >
                        Details
                      </button>
                      <MarketplaceButton
                        loan={loan}
                        onPublish={() => handleOpenMarketplace(loan)}
                        onCancel={() => handleOpenCancelMarketplace(loan)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {selectLoanDetail && (
          <LoanDetailModal
            isOpen={isOpen}
            onClose={onCloseModal}
            loan={selectLoanDetail}
          />
        )}

        <SharedModal
          isOpen={isSharedModalOpen}
          onClose={handleCloseSharedModal}
          selectedLoans={selectedLoansData}
        />

        {selectedLoanForMarketplace && (
          <DetailMarketplace
            isOpen={isMarketplaceModalOpen}
            onClose={handleCloseMarketplace}
            loan={selectedLoanForMarketplace}
          />
        )}

        {selectedLoanForMarketplace && (
          <CancelMarketplace
            isOpen={isCancelModalOpen}
            onClose={handleCloseCancelMarketplace}
            loan={selectedLoanForMarketplace}
          />
        )}
      </div>
    </div>
  );
};