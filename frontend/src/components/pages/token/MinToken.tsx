import { RiMoneyDollarCircleLine } from "react-icons/ri";
import usfciIcon from "../../../assets/usfci.svg";
import { LoadingOverlay } from '@mantine/core';
import { useState } from "react";
import { toast } from "react-toastify";
import { useMyWalletAddress, useStatistics, useMintTokens } from "../../../hooks/useApi";
import { toBaseUnits, fromBaseUnits, formatUSFCI } from "../../../lib/usfciUtils";

interface MintFormData {
    amount: string;
    reserveProof: string;
}

export const MinToken = () => {
    const [formData, setFormData] = useState<MintFormData>({
        amount: '',
        reserveProof: ''
    });

    // ✅ Usar useStatistics en lugar de useSystemInfo
    const { data: walletData, isLoading: isLoadingWallet } = useMyWalletAddress();
    const { data: statistics, isLoading: isLoadingStats } = useStatistics();
    const { mutate: mint, isPending: isMinting } = useMintTokens();

    const isLoading = isLoadingWallet || isLoadingStats || isMinting;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleConvert = async () => {
        if (!walletData || !formData.amount || !formData.reserveProof) {
            toast.error('Please fill in all fields: amount and reserve proof.');
            return;
        }

        if (parseFloat(formData.amount) <= 0) {
            toast.error('Amount must be a positive number.');
            return;
        }

        try {
            // ✅ Convertir el monto a unidades base
            const amountInBaseUnits = toBaseUnits(formData.amount);
            
            console.log('Minting:', {
                amountEntered: formData.amount,
                amountInBaseUnits: amountInBaseUnits,
                walletAddress: walletData
            });

            mint(
                {
                    walletAddress: walletData,
                    amount: amountInBaseUnits,
                    reserveProof: formData.reserveProof
                },
                {
                    onSuccess: () => {
                        toast.success(`Successfully minted ${formData.amount} USFCI!`);
                        setFormData({ amount: '', reserveProof: '' });
                    },
                    onError: (error: any) => {
                        toast.error(`Mint failed: ${error.response?.data?.error || error.message}`);
                        console.error('Mint error:', error);
                    }
                }
            );
        } catch (error) {
            toast.error('Invalid amount format');
            console.error('Conversion error:', error);
        }
    };

    // ✅ Acceder correctamente a totalSupply desde statistics
    const totalSupplyInUSFCI = statistics?.data?.totalSupply 
        ? fromBaseUnits(statistics.data.totalSupply) 
        : '0';
    const formattedTotalSupply = formatUSFCI(totalSupplyInUSFCI, 2);

    const equivalentUSFCI = parseFloat(formData.amount) > 0 
        ? formatUSFCI(formData.amount, 2)
        : '';

    return (
        <div className="w-full py-12 px-4 flex flex-col items-center space-y-5 relative">
            <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />

            {/* Title */}
            <div className="max-w-2xl text-center space-y-10">
                <h2 className="text-2xl font-bold text-gray-800">Convert USD to $USFCI</h2>
                <p className="mt-3 text-gray-600 text-base">
                    Instantly exchange your US dollars (USD) for{" "}
                    <span className="font-semibold">$USFCI</span>, a stablecoin backed 1:1 by reserves held at Sunwest Bank.
                    Enjoy speed, transparency, and security in every transaction.
                </p>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                    <p className="text-sm text-gray-600 mb-2">Total Supply</p>
                    <h2 className="text-3xl font-bold text-gray-800">
                        {formattedTotalSupply} <span className="text-xl text-gray-600">USFCI</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">≈ ${formattedTotalSupply} USD</p>
                </div>
            </div>

            {/* Conversion Card */}
            <div className="flex items-center justify-center w-full max-w-3xl">
                <div className="p-8 flex items-center gap-12 w-full">
                    {/* Left Input */}
                    <div className="flex flex-col items-center flex-1">
                        <RiMoneyDollarCircleLine className="w-16 h-16 mb-3 text-green-600" />
                        <div className="flex items-center justify-between w-full border-b-2 border-gray-200 pb-2">
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="w-full text-xl font-semibold text-center text-gray-800 focus:outline-none focus:ring-0 bg-transparent"
                                disabled={isLoading}
                            />
                            <span className="text-sm text-gray-500 ml-2">USD</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Enter amount to mint</p>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400 text-3xl font-bold">→</div>

                    {/* Right Output */}
                    <div className="flex flex-col items-center flex-1">
                        <img src={usfciIcon} alt="$USFCI" className="w-16 h-16 mb-3" />
                        <div className="flex items-center justify-between w-full border-b-2 border-green-200 pb-2">
                            <span className="text-xl font-semibold text-gray-800 text-center w-full">
                                {equivalentUSFCI || '0.00'}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">USFCI</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">1 USFCI = 1 USD</p>
                    </div>
                </div>
            </div>

            {/* Reserve Proof Input */}
            <div className="w-full max-w-3xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reserve Proof <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                    Enter transaction hash or proof document reference (e.g., PROOF-2026-001)
                </p>
                <textarea
                    name="reserveProof"
                    value={formData.reserveProof}
                    onChange={handleInputChange}
                    placeholder="PROOF-2026-001 or 0x..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none disabled:bg-gray-100"
                    disabled={isLoading}
                />
            </div>

            {/* Convert Button */}
            <div className="flex items-center justify-center">
                <button
                    onClick={handleConvert}
                    disabled={!walletData || isLoading || !formData.amount || !formData.reserveProof}
                    className="bg-green-600 cursor-pointer text-white py-3 px-8 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                    {isMinting ? 'Minting...' : 'Mint USFCI Tokens'}
                </button>
            </div>

        
        </div>
    );
};