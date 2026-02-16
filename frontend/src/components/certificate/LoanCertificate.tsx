import React, { useRef } from 'react';
import type { Loan } from '../../types/vaultTypes';
import markCertificate from "../../assets/markCertificate.webp";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface LoanCertificateProps {
    loan: Loan;
}

export const LoanCertificate: React.FC<LoanCertificateProps> = ({ loan }) => {

    const certificateRef = useRef<HTMLDivElement>(null);


    const downloadPDF = async () => {
        const element = certificateRef.current;
        if (!element) return;

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
        });

        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasAspect = canvas.width / canvas.height;
        const pdfAspect = pdfWidth / pdfHeight;

        let imgWidth: number;
        let imgHeight: number;

        if (canvasAspect > pdfAspect) {
            imgWidth = pdfWidth;
            imgHeight = pdfWidth / canvasAspect;
        } else {
            imgHeight = pdfHeight;
            imgWidth = pdfHeight * canvasAspect;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);

        pdf.save(`Loan_Certificate_${loan.TxId || "FCI"}.pdf`);
    };

    if (!loan) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-600">
                    <p className="text-xl font-semibold">No loan data available</p>
                    <p className="mt-2">Please select a loan to view certificate</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    };

    const formatCurrency = (value: string | number) => {
        if (!value) return '$0.00';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num);
    };

    const formatPercentage = (value: string | number) => {
        if (!value || value === '0') return '0%';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return `${num.toFixed(3)}%`;
    };

    return (
        <div className="w-full h-full overflow-auto  p-4">


            <div className="flex justify-end mb-3">
                <button
                    onClick={downloadPDF}
                    className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-900 shadow"
                >
                    Download Certificate PDF
                </button>
            </div>

            <div ref={certificateRef} className="relative max-w-4xl w-full mx-auto min-h-[1400px]">

                <img
                    src={markCertificate}
                    alt="Certificate Background"
                    className="absolute inset-0 w-full h-full object-fill"
                />

                <div className="relative p-8 md:p-12 lg:p-16 flex flex-col">

                    <div className="text-center mb-6">
                        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-900 mt-2">
                            Certificate of Authenticity
                        </h2>

                        <p className="text-lg md:text-xl font-bold text-blue-900 mt-1">
                            Non Public Declaration of Collateralized Asset
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                            Issued Date: {formatDate(loan.OriginationDate)}
                        </p>
                    </div>

                    <div className="text-center mb-4">
                        <h3 className="text-sm md:text-2xl font-bold text-gray-800">
                            Certified by Private Blockchain
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 mt-1">
                            Instrument Serviced by: FCI Lender Services, Inc.
                        </p>
                    </div>

                    <div className="bg-blue-50 bg-opacity-90 p-3 mb-4">
                        <p className="text-xs font-bold text-gray-700">
                            FCI Blockchain Registration ID:
                        </p>
                        <p className="text-xs font-mono text-gray-800 break-all">
                            {loan.TxId}
                        </p>
                    </div>

                    <div className="space-y-2 mb-4 text-left">

                        <div className="p-2 flex items-center gap-1">
                            <span className="text-xs font-bold text-gray-800">Borrower Name:</span>
                            <span className="text-sm text-gray-900">{loan.BorrowerFullName}</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Loan Status:</span>
                                <span className="text-sm text-gray-900">{loan.Status}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Original Loan Amount:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.OriginalLoanAmount)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Unpaid Loan Amount:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.CurrentPrincipalBal)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Note Rate:</span>
                                <span className="text-sm text-gray-900">{formatPercentage(loan.NoteRate)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Investor Rate:</span>
                                <span className="text-sm text-gray-900">{formatPercentage(loan.SoldRate)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Lien Position:</span>
                                <span className="text-sm text-gray-900">1st</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Escrow Balance:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.EscrowBalance)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Restricted Suspense:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.RestrictedFunds)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Suspense Balance:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.SuspenseBalance)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Unpaid Late Charges:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.UnpaidLateFees)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Unpaid Interest:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.UnpaidInterest)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Note Type:</span>
                                <span className="text-sm text-gray-900">Draw Loan</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Rate Type:</span>
                                <span className="text-sm text-gray-900">Fixed Rate</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Deferred Principal Balance:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.DeferredPrincBalance)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Deferred Unpaid Interest:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.DeferredUnpaidInt)}</span>
                            </div>

                            <div className="p-2 flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">Deferred Unpaid Late Charges:</span>
                                <span className="text-sm text-gray-900">{formatCurrency(loan.DeferredLateFees)}</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};