import explorerImage from "../../../assets/explorer.png";
import React, { useState } from "react";
import { FaSearch, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useLoanByTxId } from "../../../services/apiVault";

export const VaultExplorer = () => {
    const [searchTxId, setSearchTxId] = useState("");
    const [shouldSearch, setShouldSearch] = useState(false);
    const [submittedTxId, setSubmittedTxId] = useState("");

    const { data, isLoading, error } = useLoanByTxId(submittedTxId, shouldSearch);

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (searchTxId.trim()) {
            setSubmittedTxId(searchTxId.trim());
            setShouldSearch(true);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleReset = () => {
        setSearchTxId("");
        setSubmittedTxId("");
        setShouldSearch(false);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-6xl w-full flex flex-col items-center px-6 py-10
                  overflow-y-auto h-screen">
                {/* Título */}
                <h1 className="text-3xl font-bold text-[#0280CC] mb-2 text-center">
                    FCI Blockchain Explorer
                </h1>

                {/* Subtítulo */}
                <p className="text-gray-600 text-sm mb-6 text-center">
                    Friendly Search Engine that decrypts transactions of your financial Assets.
                </p>

                {/* Search Bar */}
                <div className="flex flex-col w-full space-y-2">
                    <div className="flex w-full">
                        <input
                            type="text"
                            value={searchTxId}
                            onChange={(e) => setSearchTxId(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Please insert your Transaction Hash (TxId) to Search"
                            className="flex-grow px-4 py-2 border border-blue-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        />
                        <button
                            type="button"
                            onClick={() => handleSearch()}
                            disabled={!searchTxId.trim() || isLoading}
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

                {/* Loading State */}
                {isLoading && (
                    <div className="mt-10 text-center">
                        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-gray-600">Searching blockchain...</p>
                    </div>
                )}

                {/* Error State */}
                {error && shouldSearch && !isLoading && (
                    <div className="mt-10 w-full max-w-4xl bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                            <FaTimesCircle className="text-red-500 text-3xl mr-3" />
                            <div>
                                <h3 className="text-xl font-semibold text-red-700">Transaction Not Found</h3>
                                <p className="text-red-600 text-sm mt-1">
                                    No blockchain record found for TxId: <code className="bg-red-100 px-2 py-1 rounded">{submittedTxId}</code>
                                </p>
                            </div>
                        </div>
                        <p className="text-gray-700 text-sm">
                            Please verify the transaction hash and try again. Make sure you're using a valid TxId from a loan transaction.
                        </p>
                    </div>
                )}

                {/* Success State - Loan Details */}
                {data && data.success && data.loan && !isLoading && (
                    <div className="mt-10 w-full max-w-4xl">
                        {/* Header with success badge */}
                        <div className="bg-green-50 border border-green-200 rounded-t-lg p-4 flex items-center">
                            <FaCheckCircle className="text-green-500 text-3xl mr-3" />
                            <div>
                                <h3 className="text-xl font-semibold text-green-700">Blockchain Record Found</h3>
                                <p className="text-green-600 text-sm">Transaction successfully verified on the ledger</p>
                            </div>
                        </div>

                        {/* Transaction Info */}
                        <div className="bg-white border-x border-gray-200 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Transaction Hash</p>
                                    <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">{data.txId || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Loan ID</p>
                                    <p className="text-sm font-semibold text-blue-600">{data.loan.ID}</p>
                                </div>
                            </div>



                            {/* Loan Details */}
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Loan Details at this Transaction</h4>

                            {/* Borrower Information */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">Borrower Information</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <DetailField label="Full Name" value={data.loan.BorrowerFullName} />
                                    <DetailField label="Email" value={data.loan.BorrowerEmail} />
                                    <DetailField label="Phone" value={data.loan.BorrowerHomePhone} />
                                    <DetailField label="Occupancy Status" value={data.loan.BorrowerOccupancyStatus} />
                                    <DetailField label="Property Address" value={data.loan.BorrowerPropertyAddress} className="md:col-span-2" />
                                    <DetailField label="City" value={data.loan.BorrowerCity} />
                                    <DetailField label="State" value={data.loan.BorrowerState} />
                                    <DetailField label="ZIP Code" value={data.loan.BorrowerZip} />
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">Financial Information</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailField label="Current Principal Balance" value={formatCurrency(data.loan.CurrentPrincipalBal)} highlight />
                                    <DetailField label="Original Loan Amount" value={formatCurrency(data.loan.OriginalLoanAmount)} />
                                    <DetailField label="Scheduled Payment" value={formatCurrency(data.loan.ScheduledPayment)} />
                                    <DetailField label="Deferred Principal Balance" value={formatCurrency(data.loan.DeferredPrincBalance)} />
                                    <DetailField label="Note Rate" value={formatPercentage(data.loan.NoteRate)} />
                                    <DetailField label="Sold Rate" value={formatPercentage(data.loan.SoldRate)} />
                                    <DetailField label="Default Rate" value={formatPercentage(data.loan.DefaultRate)} />
                                    <DetailField label="Unpaid Interest" value={formatCurrency(data.loan.UnpaidInterest)} />
                                    <DetailField label="Unpaid Fees" value={formatCurrency(data.loan.UnpaidFees)} />
                                    <DetailField label="Late Fees Amount" value={formatCurrency(data.loan.LateFeesAmount)} />
                                    <DetailField label="Escrow Balance" value={formatCurrency(data.loan.EscrowBalance)} />
                                    <DetailField label="Suspense Balance" value={formatCurrency(data.loan.SuspenseBalance)} />
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">Payment Information</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailField label="Origination Date" value={data.loan.OriginationDate} />
                                    <DetailField label="Next Payment Due" value={data.loan.NextPaymentDue} />
                                    <DetailField label="Loan Maturity Date" value={data.loan.LoanMaturityDate} />
                                    <DetailField label="Last Payment Received" value={data.loan.LastPaymentRec} />
                                    <DetailField label="Interest Paid To" value={data.loan.InterestPaidTo} />
                                    <DetailField label="Days Since Last Payment" value={data.loan.DaysSinceLastPymt} />
                                    <DetailField label="Number of Payments Due" value={data.loan.NumOfPymtsDue} />
                                    <DetailField label="Payment Grace Days" value={data.loan.PymtGraceDays} />
                                    <DetailField label="NFS in Last 12 Months" value={data.loan.NFSInLast12Months} />
                                </div>
                            </div>

                            {/* Status & Metadata */}
                            <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">Status & Metadata</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailField label="Status" value={data.loan.Status} highlight />
                                    <DetailField label="Loan UID" value={data.loan.LUid} />
                                    <DetailField label="User ID" value={data.loan.UserID} />
                                    <DetailField label="Created At" value={formatDate(data.loan.BLOCKAUDITCreationAt)} />
                                    <DetailField label="Updated At" value={formatDate(data.loan.BLOCKAUDITUpdatedAt)} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 border border-gray-200 rounded-b-lg p-4 text-center">
                            <p className="text-xs text-gray-500">
                                This record is immutably stored on the FCI Blockchain and cannot be altered or deleted
                            </p>
                        </div>
                    </div>
                )}

                {/* Imagen - Solo se muestra cuando no hay búsqueda activa */}
                {!shouldSearch && (
                    <div className="mt-10 w-full flex justify-center">
                        <img
                            src={explorerImage}
                            alt="Blockchain Diagram"
                            className="max-w-5xl w-full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

interface DetailFieldProps {
    label: string;
    value: string | number | Date;
    highlight?: boolean;
    className?: string;
}

const DetailField: React.FC<DetailFieldProps> = ({ label, value, highlight, className }) => {
    let displayValue: string;

    if (value instanceof Date) {
        displayValue = formatDate(value);
    } else {
        displayValue = value === '---' || value === '' || value === null || value === undefined || (value === '0' && label.includes('Date')) ? 'N/A' : String(value);
    }

    return (
        <div className={className}>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{label}</p>
            <p className={`text-sm ${highlight ? 'font-bold text-blue-600' : 'text-gray-800'}`}>
                {displayValue}
            </p>
        </div>
    );
};

// Funciones auxiliares para formateo
const formatCurrency = (value: string | number): string => {
    const num = parseFloat(value?.toString() || '0');
    if (num === 0) return 'N/A';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercentage = (value: string | number): string => {
    const num = parseFloat(value?.toString() || '0');
    if (num === 0) return 'N/A';
    return `${num}%`;
};

const formatDate = (dateValue: string | Date): string => {
    if (!dateValue || dateValue === '---' || dateValue === '') return 'N/A';
    try {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return String(dateValue);
    }
};