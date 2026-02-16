import { Fragment, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Transition,
} from "@headlessui/react";
import { CheckCircle, ExternalLink, Copy, DollarSign, TrendingUp, Hash, Blocks } from "lucide-react";
import { IoClose } from "react-icons/io5";
import type { CompactLoan } from "../../../../types/vaultTypes";
import type { ApprovalResponse } from "../../../../types/marketplaceTypes";

interface ConfirmendMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
  data: ApprovalResponse;
  loan: CompactLoan;
}

export const ConfirmendMarketplace = ({ isOpen, onClose, data, loan }: ConfirmendMarketplaceProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyTxHash = () => {
    navigator.clipboard.writeText(data.data.txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = (txHash: string) => {
    // Ajusta según tu red (ejemplo para Sepolia)
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/70 transition-opacity data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-2xl data-closed:opacity-0 data-closed:translate-y-4 sm:data-closed:translate-y-0 sm:data-closed:scale-95"
            >
              {/* Header con animación de éxito */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white rounded-full p-2">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-left">
                      <Dialog.Title className="text-2xl font-bold">
                        Loan Approved Successfully!
                      </Dialog.Title>
                      <p className="text-green-100 text-sm">Your loan is now queued for tokenization</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white hover:bg-green-800 p-2 rounded-full transition"
                  >
                    <IoClose size={28} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Success Message */}
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="text-green-800">
                    <strong>{data.message}</strong>
                  </p>
                </div>

                {/* Loan Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Loan Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan ID:</span>
                      <span className="font-medium">{data.data.loanId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Borrower:</span>
                      <span className="font-medium">{loan.BorrowerFullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Property:</span>
                      <span className="font-medium">{loan.BorrowerPropertyAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">Approval Details</h3>
                  <div className="space-y-3">
                    {/* Asking Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span>Asking Price:</span>
                      </div>
                      <span className="font-semibold text-green-700">
                        {data.data.askingPrice} ETH
                      </span>
                    </div>

                    {/* Interest Rate */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span>Modified Interest Rate:</span>
                      </div>
                      <span className="font-semibold text-green-700">
                        {data.data.modifiedInterestRate}%
                      </span>
                    </div>

                    {/* Block Number */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Blocks className="w-4 h-4 text-green-600" />
                        <span>Block Number:</span>
                      </div>
                      <span className="font-medium">{data.data.blockNumber}</span>
                    </div>

                    {/* Gas Used */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Hash className="w-4 h-4 text-green-600" />
                        <span>Gas Used:</span>
                      </div>
                      <span className="font-medium">{data.data.gasUsed}</span>
                    </div>
                  </div>
                </div>

                {/* Transaction Hash */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Transaction Hash</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-200 text-xs font-mono break-all">
                      {data.data.txHash}
                    </code>
                    <button
                      onClick={handleCopyTxHash}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-shrink-0"
                      title="Copy transaction hash"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={getExplorerUrl(data.data.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-shrink-0"
                      title="View on explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600 mt-2">✓ Transaction hash copied!</p>
                  )}
                </div>

    
                {/* Close Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};