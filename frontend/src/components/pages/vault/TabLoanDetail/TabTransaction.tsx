import { Oval } from "react-loader-spinner";
import { useQuery } from "@tanstack/react-query";
import { currencyFormat, dateFormat2 } from "../../../../lib/utils";
import type { LoanHistory } from "../../../../types/vaultTypes";

interface ModalProps {
    loanUid?: string;
}

export const TabTransaction: React.FC<ModalProps> = ({ loanUid }) => {

    const fetchLoanHistory = async (): Promise<LoanHistory[]> => {
        const key = localStorage.getItem("vaultKey");
        if (!key) throw new Error("Missing vaultKey in localStorage");

        const graphql = JSON.stringify({
            query: `
            {
                getLoanHistoryNew(loanUid: "${loanUid}") {
                    dateReceived,
                    dateDue,
                    dayVariance,
                    reference,
                    isACH,
                    code,
                    totalAmount,
                    toInterest,
                    toPrincipal,
                    lateCharge,
                    toLateCharge,
                    toReserve,
                    reserveRestricted,
                    toImpound,
                    toPrepay,
                    toChargesPrincipal,
                    toChargesInterest,
                    toBrokerFee,
                    toLenderFee,
                    toOtherTaxable,
                    toOtherTaxFree,
                    toOtherPayments,
                    toUnpaidInterest,
                    notes
                }
            }`
        });

        const requestOptions: RequestInit = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: graphql,
        };

        const response = await fetch("https://fapi.myfci.com/graphql", requestOptions);
        const result = await response.json();

        const loanDetails = result?.data?.getLoanHistoryNew;
        if (!loanDetails) throw new Error("Failed to fetch loan history");

        return loanDetails;
    };

    const {
        data: LoanDetail = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["loanHistory", loanUid],
        queryFn: fetchLoanHistory,
        enabled: !!loanUid, // solo hace fetch si loanUid existe
        refetchOnWindowFocus: false
    });

    return (
        <div className="mt-4">
            <div className="overflow-auto max-h-[480px]">
                
                {isLoading && (
                    <div className="flex justify-center grid content-center h-100">
                        <Oval
                            visible={true}
                            height="100"
                            width="100"
                            color="#3F83F8"
                            ariaLabel="oval-loading"
                            secondaryColor="#80aefd"
                        />
                    </div>
                )}

                {isError && (
                    <div className="text-center p-4 text-red-600">
                        Error loading transactions.
                    </div>
                )}

                {!isLoading && !isError && (
                    <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden table-fixed">
                        <thead className="bg-blue-500 text-white">
                            <tr>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Date Received</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Date Due</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-40">Pmt Day Variance</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Reference</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">ACH</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Payment Type</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Total Pmt</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Interest Received</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Principal Received</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Accrued Late Charges</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Late Charges Paid</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Reserve Pmt</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Reserve Restricted</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Escrow Pmt</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">PPP Pmt</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Charges Prin Pmt</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Charges Int Pmt</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Broker Fees</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Other(Taxable)</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Other Pmt</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-48">Accrued Unpaid Interest</th>
                                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Additional Information</th>
                            </tr>
                        </thead>

                        <tbody>
                            {LoanDetail.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center p-4 text-gray-600">
                                        No records available
                                    </td>
                                </tr>
                            ) : (
                                LoanDetail.map((loan, idx) => (
                                    <tr key={idx} className="border-t hover:bg-gray-50 transition-colors text-center">
                                        <td className="p-2 min-w-32">{dateFormat2(loan.dateReceived)}</td>
                                        <td className="p-2 min-w-32">{dateFormat2(loan.dateDue)}</td>
                                        <td className="p-2 min-w-40">{loan.dayVariance}</td>
                                        <td className="p-2 min-w-32">{loan.reference}</td>
                                        <td className="p-2 min-w-32">{loan.isACH}</td>
                                        <td className="p-2 min-w-32">{loan.code}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.totalAmount)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toInterest)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toPrincipal)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.lateCharge)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toLateCharge)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toReserve)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.reserveRestricted)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toImpound)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toPrepay)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toChargesPrincipal)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toChargesInterest)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toBrokerFee)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toOtherTaxable)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toOtherTaxFree)}</td>
                                        <td className="p-2 min-w-32">{currencyFormat(loan.toOtherPayments)}</td>
                                        <td className="p-2 min-w-48">{currencyFormat(loan.toUnpaidInterest)}</td>
                                        <td className="p-2 min-w-32">{loan.notes}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
