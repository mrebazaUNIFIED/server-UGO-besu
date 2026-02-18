import explorerImage from "../../../assets/explorer.png";
import React, { useState } from "react";
import { FaSearch, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useLoanByTxId } from "../../../services/apiVault";
import { PageMeta } from "../../ui/PageMeta";
import type { LoanByTxIdResponse,LoanChange } from "../../../types/vaultTypes";

export const VaultExplorer = () => {
    const [searchTxId, setSearchTxId] = useState("");
    const [shouldSearch, setShouldSearch] = useState(false);
    const [submittedTxId, setSubmittedTxId] = useState("");

    const { data, isLoading, error } = useLoanByTxId(submittedTxId, shouldSearch);
    const typedData = data as LoanByTxIdResponse | undefined;

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
            <div className="max-w-6xl w-full flex flex-col items-center px-6 py-10 overflow-y-auto h-screen">

                <PageMeta title="Vault Explorer" />

                <h1 className="text-3xl font-bold text-[#0280CC] mb-2 text-center">
                    FCI Blockchain Explorer
                </h1>

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
                                    No blockchain record found for TxId:{" "}
                                    <code className="bg-red-100 px-2 py-1 rounded">{submittedTxId}</code>
                                </p>
                            </div>
                        </div>
                        <p className="text-gray-700 text-sm">
                            Please verify the transaction hash and try again. Make sure you're using a valid TxId from a loan transaction.
                        </p>
                    </div>
                )}

                {/* Success State - Loan Details */}
                {typedData && typedData.success && typedData.loan && !isLoading && (
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
                                    <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
                                        {typedData.txId || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Loan ID</p>
                                    <p className="text-sm font-semibold text-blue-600">{typedData.loan.ID}</p>
                                </div>
                            </div>

                            {/* Loan Details */}
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                                Loan Details at this Transaction
                            </h4>

                            {/* Lender Information */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                    Lender Information
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <DetailField label="Lender Name" value={typedData.loan.LenderName} />
                                    <DetailField label="Lender Account" value={typedData.loan.LenderAccount} />
                                    <DetailField label="Lender UID" value={typedData.loan.LenderUid} />
                                    <DetailField label="Lender Owner %" value={formatPercentage(typedData.loan.LenderOwnerPct)} />
                                    <DetailField label="Co-Borrower" value={typedData.loan.CoBorrower} />
                                </div>
                            </div>

                            {/* Property Information */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                    Property Information
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <DetailField label="City" value={typedData.loan.City} />
                                    <DetailField label="State" value={typedData.loan.State} />
                                    <DetailField label="ZIP Code" value={typedData.loan.PropertyZip} />
                                    <DetailField label="Is Foreclosure" value={typedData.loan.IsForeclosure ? 'Yes' : 'No'} />
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                    Financial Information
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailField label="Current Balance" value={formatCurrency(typedData.loan.CurrentBalance)} highlight />
                                    <DetailField label="Original Balance" value={formatCurrency(typedData.loan.OriginalBalance)} />
                                    <DetailField label="Note Rate" value={formatPercentage(typedData.loan.NoteRate)} />
                                    <DetailField label="Sold Rate" value={formatPercentage(typedData.loan.SoldRate)} />
                                    <DetailField label="Calc Interest Rate" value={formatPercentage(typedData.loan.CalcInterestRate)} />
                                    <DetailField label="Default Interest Rate" value={formatPercentage(typedData.loan.DefaultInterestRate)} />
                                    <DetailField label="Active Default Rate" value={formatPercentage(typedData.loan.ActiveDefaultInterestRate)} />
                                    <DetailField label="Vendor Fee %" value={formatPercentage(typedData.loan.VendorFeePct)} />
                                    <DetailField label="Reserve Balance (Restricted)" value={formatCurrency(typedData.loan.ReserveBalanceRestricted)} />
                                    <DetailField label="Deferred Principal Bal" value={formatCurrency(typedData.loan.DeferredPrinBal)} />
                                    <DetailField label="Deferred Unpaid Interest" value={formatCurrency(typedData.loan.DeferredUnpaidInt)} />
                                    <DetailField label="Deferred Late Charges" value={formatCurrency(typedData.loan.DeferredLateCharges)} />
                                    <DetailField label="Deferred Unpaid Charges" value={formatCurrency(typedData.loan.DeferredUnpaidCharges)} />
                                    <DetailField label="Maximum Draw" value={formatCurrency(typedData.loan.MaximumDraw)} />
                                </div>
                            </div>

                            {/* Date & Status Information */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                    Date &amp; Status Information
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailField label="Status" value={typedData.loan.Status} highlight />
                                    <DetailField label="Draw Status" value={typedData.loan.DrawStatus} />
                                    <DetailField label="Close Date" value={typedData.loan.CloseDate} />
                                    <DetailField label="Lender Fund Date" value={typedData.loan.LenderFundDate} />
                                    <DetailField label="Maturity Date" value={typedData.loan.MaturityDate} />
                                    <DetailField label="Next Due Date" value={typedData.loan.NextDueDate} />
                                    <DetailField label="Paid Off Date" value={typedData.loan.PaidOffDate} />
                                    <DetailField label="Paid To Date" value={typedData.loan.PaidToDate} />
                                </div>
                            </div>

                            {/* Blockchain / Token Metadata */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                    Blockchain &amp; Token Metadata
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailField label="Loan UID" value={typedData.loan.LoanUid} />
                                    <DetailField label="Account" value={typedData.loan.Account} />
                                    <DetailField label="Is Tokenized" value={typedData.loan.isTokenized ? 'Yes' : 'No'} />
                                    <DetailField label="Is Locked" value={typedData.loan.isLocked ? 'Yes' : 'No'} />
                                    <DetailField label="Avalanche Token ID" value={typedData.loan.avalancheTokenId} />
                                    <DetailField label="Created At" value={formatDate(typedData.loan.BLOCKAUDITCreationAt)} />
                                    <DetailField label="Updated At" value={formatDate(typedData.loan.BLOCKAUDITUpdatedAt)} />
                                </div>
                            </div>

                            {/* Changes at this Transaction */}
                            {typedData.changes && typedData.changes.length > 0 && (
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                        Changes in this Transaction ({typedData.changes.length})
                                    </h5>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                                            <thead>
                                                <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                                                    <th className="px-4 py-2 text-left">Field</th>
                                                    <th className="px-4 py-2 text-left">Old Value</th>
                                                    <th className="px-4 py-2 text-left">New Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {typedData.changes.map((change: LoanChange, idx: number) => (
                                                    <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                                        <td className="px-4 py-2 font-medium text-gray-700">{change.PropertyName}</td>
                                                        <td className="px-4 py-2 text-red-500 line-through">{change.OldValue || 'N/A'}</td>
                                                        <td className="px-4 py-2 text-green-600 font-medium">{change.NewValue || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 border border-gray-200 rounded-b-lg p-4 text-center">
                            <p className="text-xs text-gray-500">
                                This record is immutably stored on the FCI Blockchain and cannot be altered or deleted
                            </p>
                        </div>
                    </div>
                )}

                {/* Image - shown only when no active search */}
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

// ==================== DETAIL FIELD ====================

interface DetailFieldProps {
    label: string;
    value: string | number | boolean | Date | null | undefined;
    highlight?: boolean;
    className?: string;
}

const DetailField: React.FC<DetailFieldProps> = ({ label, value, highlight, className }) => {
    let displayValue: string;

    if (value instanceof Date) {
        displayValue = formatDate(value);
    } else if (value === null || value === undefined || value === '' || value === '---') {
        displayValue = 'N/A';
    } else {
        displayValue = String(value);
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

// ==================== FORMATTERS ====================

const formatCurrency = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = parseFloat(value.toString());
    if (isNaN(num) || num === 0) return 'N/A';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercentage = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = parseFloat(value.toString());
    if (isNaN(num) || num === 0) return 'N/A';
    return `${num}%`;
};

const formatDate = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue || dateValue === '---' || dateValue === '') return 'N/A';
    try {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (isNaN(date.getTime())) return String(dateValue);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return String(dateValue);
    }
};