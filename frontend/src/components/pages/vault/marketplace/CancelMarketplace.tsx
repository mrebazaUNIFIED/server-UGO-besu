import { useState, Fragment, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Transition,
} from "@headlessui/react";
import { AlertTriangle, X, Flame, CheckCircle2, Loader2 } from "lucide-react";
import { IoClose } from "react-icons/io5";
import {
  useRequestBurnAndCancel,
  useCanCancel,
} from "../../../../services/apiMarketplace";
import type { CompactLoan } from "../../../../types/vaultTypes";

interface CancelMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CompactLoan;
}

export const CancelMarketplace = ({
  isOpen,
  onClose,
  loan,
}: CancelMarketplaceProps) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [cancelType, setCancelType] = useState<"direct_cancel" | "burn_required" | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);

  const requestBurnMutation = useRequestBurnAndCancel();

  // Verificar si puede cancelar y si necesita burn
  const { data: canCancelData, isLoading: isCheckingCancel } = useCanCancel(
    loan.LenderUid,
    loan.LoanUid,
    isOpen
  );

  useEffect(() => {
    if (canCancelData) {
      console.log("Can cancel data:", canCancelData);
    }
  }, [canCancelData]);

  const handleConfirmCancel = async () => {
    try {
      const result = await requestBurnMutation.mutateAsync({
        lenderUid: loan.LenderUid,
        loanUid: loan.LoanUid,
      });

      // Guardar tipo de cancelación y token ID si aplica
      setCancelType(result.type);
      if (result.avalancheTokenId) {
        setTokenId(result.avalancheTokenId);
      }

      setShowSuccess(true);

      // Cerrar después de 3 segundos
      setTimeout(() => {
        setShowSuccess(false);
        setCancelType(null);
        setTokenId(null);
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Error cancelling listing:", error);
    }
  };

  if (isCheckingCancel) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog onClose={onClose} className="relative z-50">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-black/70 transition-opacity"
          />
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl p-8">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                  <p className="text-gray-600">Checking cancellation status...</p>
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  // Modal de éxito
  if (showSuccess) {
    return (
      <Transition appear show={showSuccess} as={Fragment}>
        <Dialog onClose={() => {}} className="relative z-50">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-black/70 transition-opacity"
          />
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl p-8 max-w-md w-full">
                <div className="flex flex-col items-center gap-4 text-center">
                  {cancelType === "burn_required" ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                        <Flame className="w-10 h-10 text-orange-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Burn Request Submitted
                      </h3>
                      <p className="text-gray-600">
                        The relayer will process the NFT burn on Avalanche.
                      </p>
                      {tokenId && (
                        <div className="bg-gray-50 rounded-lg p-3 w-full">
                          <p className="text-xs text-gray-500 mb-1">Token ID</p>
                          <p className="font-mono text-sm break-all">{tokenId}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Listing Cancelled!
                      </h3>
                      <p className="text-gray-600">
                        Your loan has been removed from the marketplace.
                      </p>
                    </>
                  )}
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

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
              className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:opacity-0 data-closed:translate-y-4 sm:data-closed:translate-y-0 sm:data-closed:scale-95"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8" />
                  <div className="text-left">
                    <Dialog.Title className="text-2xl font-bold">
                      Cancel Marketplace Listing
                    </Dialog.Title>
                    <p className="text-red-100 text-sm">Loan ID: {loan.ID}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-red-800 p-2 rounded-full transition"
                >
                  <IoClose size={28} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Loan Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Loan Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Lender UID:</span>
                      <p className="font-medium">{loan.LenderUid}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Loan UID:</span>
                      <p className="font-medium">{loan.LoanUid}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Balance:</span>
                      <p className="font-medium text-green-600">
                        ${Number(loan.CurrentBalance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium">{loan.Status}</p>
                    </div>
                  </div>
                </div>

                {/* Cancelation Type Info */}
                {canCancelData && (
                  <div
                    className={`rounded-lg p-4 mb-6 ${
                      canCancelData.needsBurn
                        ? "bg-orange-50 border-l-4 border-orange-500"
                        : "bg-blue-50 border-l-4 border-blue-500"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {canCancelData.needsBurn ? (
                        <Flame className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900 mb-1">
                          {canCancelData.needsBurn
                            ? "NFT Burn Required"
                            : "Direct Cancellation"}
                        </p>
                        <p className={canCancelData.needsBurn ? "text-orange-800" : "text-blue-800"}>
                          {canCancelData.recommendation}
                        </p>
                        {canCancelData.needsBurn && (
                          <div className="mt-3 space-y-1 text-xs text-orange-700">
                            <p>• The NFT has been minted on Avalanche</p>
                            <p>• The relayer will burn the NFT before unlocking</p>
                            <p>• This process may take a few moments</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Status */}
                {canCancelData?.currentStatus && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">
                      Current Status
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            canCancelData.currentStatus.isApproved
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span>Approved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            canCancelData.currentStatus.isMinted
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span>NFT Minted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            canCancelData.currentStatus.isCancelled
                              ? "bg-red-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span>Cancelled</span>
                      </div>
                      {canCancelData.currentStatus.avalancheTokenId && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Token ID: </span>
                          <span className="font-mono">
                            {canCancelData.currentStatus.avalancheTokenId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This action cannot be undone. Your loan will be
                    removed from the marketplace and unlocked.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={requestBurnMutation.isPending}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Keep Listing
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    disabled={
                      requestBurnMutation.isPending ||
                      !canCancelData?.canCancelNow
                    }
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {requestBurnMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {canCancelData?.needsBurn ? (
                          <>
                            <Flame className="w-4 h-4" />
                            Request Burn & Cancel
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            Cancel Listing
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>

                {/* Can't Cancel Message */}
                {canCancelData && !canCancelData.canCancelNow && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      Cannot cancel this listing. Please check the loan status.
                    </p>
                  </div>
                )}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};