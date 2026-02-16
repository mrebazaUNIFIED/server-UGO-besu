import { useState } from "react";
import { X, Copy, Check, Key } from "lucide-react";
import { useCreateShareAsset } from "../../../../services/apiShared"; 
import { useVaultAuth } from "../../../../hooks/useVaultAuth"; 
import type { Loan } from "../../../../types/vaultTypes";

interface SharedModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLoans: Loan[];
}

export const SharedModal = ({ isOpen, onClose, selectedLoans }: SharedModalProps) => {
  const { vaultUser } = useVaultAuth();
  const createShareAsset = useCreateShareAsset();
  
  const [name, setName] = useState("");
  const [sharedWithAddressesInput, setSharedWithAddressesInput] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Array real de IDs de accounts
  const accountIds = selectedLoans.map((loan) => loan.ID.toString());

  // Generador de key única
  const generateKey = () => {
    const random = Math.random().toString(16).slice(2, 8);
    return `share_${vaultUser?.uid}_${Date.now()}_${random}`;
  };

  const handleGenerateKey = async () => {
    if (!vaultUser?.uid) {
      alert("User not authenticated");
      return;
    }

    if (!name.trim()) {
      alert("Please enter a name");
      return;
    }

    const sharedWithAddresses = sharedWithAddressesInput
      .split(/[\n,]+/) // Split by comma or newline
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (sharedWithAddresses.length === 0) {
      alert("Please enter at least one Wallet Address to share with");
      return;
    }

    setIsGenerating(true);

    try {
      const newKey = generateKey();

      const response = await createShareAsset.mutateAsync({
        key: newKey,
        accounts: accountIds,
        name: name.trim(),
        sharedWithAddresses,
      });

      setGeneratedKey(newKey);

    } catch (error: any) {
      console.error("Error creating share asset:", error);
      alert(error.response?.data?.error || "Failed to create share asset");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName("");
    setSharedWithAddressesInput("");
    setGeneratedKey("");
    setCopied(false);
    onClose(); 
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-800">Share Selected Accounts</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Selected Accounts Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Selected Accounts ({selectedLoans.length})
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {selectedLoans.map((loan) => (
                <div
                  key={loan.ID}
                  className="text-sm text-blue-800 flex items-center justify-between"
                >
                  <span className="font-medium">Account #{loan.ID}</span>
                  <span className="text-blue-600">{loan.BorrowerFullName}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Account IDs:</strong> {accountIds.join(", ")}
              </p>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Portfolio, Client ABC Accounts, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!!generatedKey}
            />
            <p className="text-xs text-gray-500 mt-1">
              Give this share a memorable name to identify it later
            </p>
          </div>

          {/* Shared With Wallet Addresses Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share With Wallet Addresses * (comma or newline separated)
            </label>
            <textarea
              value={sharedWithAddressesInput}
              onChange={(e) => setSharedWithAddressesInput(e.target.value)}
              placeholder="e.g., 0x1234..., 0x5678...&#10;or one per line"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              disabled={!!generatedKey}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter at least one Wallet Address to share with. Separate multiple addresses with commas or new lines.
            </p>
          </div>

          {/* Generate Button */}
          {!generatedKey && (
            <button
              onClick={handleGenerateKey}
              disabled={isGenerating || !name.trim()}
              className="cursor-pointer w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              {isGenerating ? "Creating Share Asset..." : "Create Share Asset"}
            </button>
          )}

          {/* Generated Key Section */}
          {generatedKey && (
            <div className="space-y-4">
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    Share Asset Created Successfully!
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  Your share asset has been created. Use this key to access or manage the shared accounts.
                </p>
              </div>

              {/* Share Key */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedKey}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyKey}
                    className={`cursor-pointer px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Save this key! You'll need it to access the shared accounts.
                </p>
              </div>

              {/* Share Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-gray-800 text-sm">Share Details</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Name:</strong> {name}</p>
                  <p><strong>Owner:</strong> {vaultUser?.uid}</p>
                  <p><strong>Key:</strong> <span className="font-mono text-xs">{generatedKey}</span></p>
                  <p><strong>Accounts Shared:</strong> {selectedLoans.length}</p>
                  <p><strong>Status:</strong> <span className="text-green-600 font-semibold">Active</span></p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="cursor-pointer px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            {generatedKey ? "Close" : "Cancel"}
          </button>
        </div>

      </div>
    </div>
  );
};