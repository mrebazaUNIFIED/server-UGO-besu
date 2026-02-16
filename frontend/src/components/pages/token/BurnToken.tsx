import { RiMoneyDollarCircleLine } from "react-icons/ri";
import usfciIcon from "../../../assets/usfci.svg";
import { LoadingOverlay } from '@mantine/core';
import { useState } from "react";
import { toast } from "react-toastify";
import { useMyWalletAddress, useStatistics, useBurnTokens } from "../../../hooks/useApi";
import { toBaseUnits, fromBaseUnits, formatUSFCI } from "../../../lib/usfciUtils";

interface BurnFormData {
    amount: string;
    burnReason: string;
}

export const BurnToken = () => {
    const [formData, setFormData] = useState<BurnFormData>({
        amount: '',
        burnReason: 'redemption'
    });

    // React Query hooks
    const { data: walletData, isLoading: isLoadingWallet } = useMyWalletAddress();
    const { data: statistics, isLoading: isLoadingStats } = useStatistics();
    const { mutate: burn, isPending: isBurning } = useBurnTokens();

    const isLoading = isLoadingWallet || isLoadingStats || isBurning;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBurn = async () => {
        if (!walletData || !formData.amount) {
            toast.error('Please fill in all required fields.');
            return;
        }

        const amount = parseFloat(formData.amount);

        if (amount <= 0) {
            toast.error('Amount must be a positive number.');
            return;
        }

        // ✅ Validar contra el total supply convertido
        if (statistics?.data?.totalSupply) {
            const totalSupplyInUSFCI = fromBaseUnits(statistics.data.totalSupply);
            if (amount > parseFloat(totalSupplyInUSFCI)) {
                toast.error(`Amount exceeds available tokens. Maximum: ${formatUSFCI(totalSupplyInUSFCI, 2)} USFCI`);
                return;
            }
        }

        try {
            // ✅ Convertir el monto a unidades base
            const amountInBaseUnits = toBaseUnits(formData.amount);
            
            console.log('Burning:', {
                amountEntered: formData.amount,
                amountInBaseUnits: amountInBaseUnits,
                walletAddress: walletData,
                reason: formData.burnReason
            });

            burn(
                {
                    walletAddress: walletData,
                    amount: amountInBaseUnits, // ✅ Enviar en unidades base
                    reason: formData.burnReason || 'redemption'
                },
                {
                    onSuccess: () => {
                        toast.success(`Successfully burned ${formData.amount} USFCI!`);
                        setFormData({ amount: '', burnReason: 'redemption' });
                    },
                    onError: (error: any) => {
                        toast.error(`Burn failed: ${error.response?.data?.error || error.message}`);
                        console.error('Burn error:', error);
                    }
                }
            );
        } catch (error) {
            toast.error('Invalid amount format');
            console.error('Conversion error:', error);
        }
    };

    // ✅ Convertir totalSupply de unidades base a USFCI legible
    const totalSupplyInUSFCI = statistics?.data?.totalSupply 
        ? fromBaseUnits(statistics.data.totalSupply) 
        : '0';
    const formattedTotalSupply = formatUSFCI(totalSupplyInUSFCI, 2);

    const equivalentUSD = parseFloat(formData.amount) > 0 
        ? formatUSFCI(formData.amount, 2)
        : '';

    // Validar si el monto excede el total supply
    const exceedsSupply = formData.amount && statistics?.data?.totalSupply
        ? parseFloat(formData.amount) > parseFloat(totalSupplyInUSFCI)
        : false;

    return (
        <div className="w-full py-12 px-4 flex flex-col items-center space-y-5 relative">
            <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />

            {/* Title */}
            <div className="max-w-2xl text-center space-y-10">
                <h2 className="text-2xl font-bold text-gray-800">Redeem $USFCI for USD</h2>
                <p className="mt-3 text-gray-600 text-base">
                    Convert your{" "}
                    <span className="font-semibold">$USFCI</span> tokens back to US dollars (USD).
                    Your tokens will be burned and USD will be released from reserves held at Sunwest Bank.
                    Enjoy secure and transparent redemption.
                </p>

                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
                    <p className="text-sm text-gray-600 mb-2">Total Supply Available</p>
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
                        <img src={usfciIcon} alt="$USFCI" className="w-16 h-16 mb-3" />
                        <div className="flex items-center justify-between w-full border-b-2 border-red-200 pb-2">
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
                            <span className="text-sm text-gray-500 ml-2">USFCI</span>
                        </div>
                        {exceedsSupply && (
                            <p className="text-red-500 text-xs mt-2 font-semibold">
                                ⚠️ Exceeds available tokens
                            </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">Enter amount to burn</p>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400 text-3xl font-bold">→</div>

                    {/* Right Output */}
                    <div className="flex flex-col items-center flex-1">
                        <RiMoneyDollarCircleLine className="w-16 h-16 mb-3 text-red-600" />
                        <div className="flex items-center justify-between w-full border-b-2 border-gray-200 pb-2">
                            <span className="text-xl font-semibold text-gray-800 text-center w-full">
                                {equivalentUSD || '0.00'}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">USD</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">1 USFCI = 1 USD</p>
                    </div>
                </div>
            </div>

            {/* Burn Reason Input */}
            <div className="w-full max-w-3xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Burn Reason
                </label>
                <p className="text-xs text-gray-500 mb-2">
                    Specify the reason for burning tokens (default: redemption)
                </p>
                <textarea
                    name="burnReason"
                    value={formData.burnReason}
                    onChange={handleInputChange}
                    placeholder="redemption, regulatory compliance, etc."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none disabled:bg-gray-100"
                    disabled={isLoading}
                />
            </div>

            {/* Burn Button */}
            <div className="flex items-center justify-center">
                <button
                    onClick={handleBurn}
                    disabled={!walletData || isLoading || !formData.amount || exceedsSupply}
                    className="bg-red-600 cursor-pointer text-white py-3 px-8 rounded-lg font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                    {isBurning ? 'Burning...' : 'Burn & Redeem Tokens'}
                </button>
            </div>

           
        </div>
    );
};