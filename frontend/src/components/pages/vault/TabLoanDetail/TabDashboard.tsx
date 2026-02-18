import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import type { LoanDetail } from "../../../../types/vaultTypes";
import {
  currencyFormat,
  FindLabelOfEnum,
  percentFormat,
} from "../../../../lib/utils";
import {
  BooleanEnum,
  LoanStatusForFCIWebEnum,
  NoteTypeEnum,
  PriorityEnum,
  RateTypeEnum,
} from "../../../../lib/enums";

import { FaCopy, FaRegCopy } from "react-icons/fa";
import { Oval } from "react-loader-spinner";

interface ModalProps {
  loanUid: string;
  hash: string;
}

export const TabDashboard: React.FC<ModalProps> = ({ loanUid, hash }) => {
  const [copied, setCopied] = useState(false);
  const [icon, setIcon] = useState(<FaRegCopy />);

  const key =
    typeof window !== "undefined" ? localStorage.getItem("vaultKey") : null;


  const { data: LoanDetail, isLoading } = useQuery({
    queryKey: ["loanDetail", loanUid],
    queryFn: async () => {
      if (!key) throw new Error("No vaultKey en localStorage.");

      const graphql = JSON.stringify({
        query: `
        {
          getLoanDetailBC(loanUid: "${loanUid}") {
            account, 
            aCHStatus, 
            aRMName, 
            aRMOptionActive, 
            borrowerFullName,
            borrowerTIN,
            borrowerTINType,
            borrowerTINMask,
            borrowerTINParse,
            borrowerMailingAddress,
            borrowerHomePhone,
            borrowerWorkPhone,
            borrowerMobilePhone,
            borrowerFax,
            borrowerEmail,
            borrowerZip,
            deferredLateCharges, 
            deferredPrinBal, 
            deferredUnpaidInt, 
            departmentName,
            escrowBalance,
            floatCapForNegAmort, 
            floatCapForPayment, 
            floatCeiling,
            floatDaysAfterPymtChange,
            floatDaysAfterRateChange,
            floatEnabledPymtAdj,
            floatEnableFirstRateCap, 
            floatEnableRecast, 
            floatEnableSurplus,
            floatFirstRateMaxCap, 
            floatFirstRateMinCap, 
            floatFloor, 
            floatFreqPymtChange,
            floatFreqRateChange, 
            floatFreqRecast, 
            floatIndex, 
            floatLastRecast, 
            floatMargin,
            floatNextAdjPayment, 
            floatNextAdjRate, 
            floatNextAdjRecast, 
            floatPeriodicMaxCap,                            
            floatPeriodicMinCap, 
            floatRoundMethod, 
            floatRoundRateFactor, 
            floatSendNotice,
            floatStopRecast, 
            floatSurplus, 
            isOnHold, 
            lateChargesDays, 
            lateChargesMin,
            lateChargesPct, 
            lienPosition,
            maturityDate, 
            nextDueDate,
            noteRate,
            noteType,
            originalBalance, 
            originationDate, 
            paidOffDate, 
            paidToDate, 
            payment, 
            paymentImpound,
            paymentOthers, 
            paymentReserve, 
            principalBalance,
            rateType,
            reserveBalance, 
            reserveBalanceRestricted, 
            soldRate,
            status, 
            uid, 
            unpaidInterest,     
            unpaidLateCharges,
            unearnedDiscount,
            uRLGoogle, 
            uRLEppraisal,   
            uRLForeclosures,  
            uRLListings,
            restrictedFundFCI, 
            restrictedInterestFCI, 
            restrictedFundInvestor,
            restrictedInterestInvestor,
            defaultIntLenderPct,
            defaultIntVendorPct,    
            defaultIntCompanyPct,  
            defaultIntCompanyMaxDist,
            prepymtCompanyPct,  
            prepymtVendorPerc,   
            prepymtInvestorPerc,
            prepymtExpDate,
            prepymtPenalty,		
            statusEnum
          }
        }
      `,
      });

      const response = await fetch("https://fapi.myfci.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: graphql,
      });

      const result = await response.json();
      const data = result?.data?.getLoanDetailBC;

      if (!data) throw new Error("No data returned from GraphQL");

      return {
        ...data,
        hash,
      } as LoanDetail & { hash: string };
    },
    enabled: !!key,
  });

  const copyToClipboard = () => {
    if (!LoanDetail) return;

    const text = LoanDetail.hash;

    if (navigator.clipboard && window.isSecureContext) {
      // Método moderno (HTTPS o localhost)
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setIcon(<FaCopy />);
      });
    } else {
      // Fallback para HTTP
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";  // evitar scroll
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      try {
        document.execCommand("copy");
        setCopied(true);
        setIcon(<FaCopy />);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }

      document.body.removeChild(textarea);
    }
  };

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
        setIcon(<FaRegCopy />);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  return (
    <div className="mt-4">
      {isLoading ? (
        <div className="flex justify-center grid content-center h-100">
          <Oval
            visible={true}
            height="100"
            width="100"
            color="#3F83F8"
            ariaLabel="oval-loading"
            secondaryColor="#80aefdff"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HASH */}
          <div className="rounded-xl col-span-2 flex flex-row gap-2">
            <label>Hash: </label>
            {LoanDetail?.borrowerFullName && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <label id="transactionId">{LoanDetail.hash}</label>
                <div
                  style={{ margin: "0 1rem " }}
                  onClick={copyToClipboard}
                >
                  {icon}
                </div>
              </div>
            )}
          </div>

          {/* Transaction */}
          <div className="rounded-xl col-span-2 flex flex-row gap-2">
            <label>Transaction Date (UTC)</label>
            <label>{LoanDetail?.transaction}</label>
          </div>

          {/* On Hold */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>On Hold :</label>
            <label>
              {FindLabelOfEnum(
                BooleanEnum,
                LoanDetail?.isOnHold ? 1 : 0
              )}
            </label>
          </div>

          {/* Loan Status */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Loan Status :</label>
            <label>
              {FindLabelOfEnum(
                LoanStatusForFCIWebEnum,
                LoanDetail?.status
              )}
            </label>
          </div>

          {/* Original Loan Amount */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Original Loan Amount :</label>
            <label>
              {LoanDetail?.originalBalance
                ? currencyFormat(LoanDetail.originalBalance)
                : "--"}
            </label>
          </div>

          {/* Unpaid Loan Amount */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Unpaid Loan Amount :</label>
            <label>
              {LoanDetail?.principalBalance
                ? currencyFormat(LoanDetail.principalBalance)
                : "--"}
            </label>
          </div>

          {/* Note Rate */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Note Rate :</label>
            <label>
              {LoanDetail?.noteRate
                ? percentFormat(LoanDetail.noteRate / 100)
                : "--"}
            </label>
          </div>

          {/* Investor Rate */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Investor Rate :</label>
            <label>
              {LoanDetail?.soldRate
                ? percentFormat(LoanDetail.soldRate / 100)
                : "--"}
            </label>
          </div>

          {/* Lien Position */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Lien Position :</label>
            <label>
              {FindLabelOfEnum(
                PriorityEnum,
                LoanDetail?.lienPosition
              )}
            </label>
          </div>

          {/* Escrow Balance */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Escrow Balance :</label>
            <label>
              {LoanDetail?.escrowBalance
                ? currencyFormat(LoanDetail.escrowBalance)
                : "--"}
            </label>
          </div>

          {/* Restricted Suspense */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Restricted Suspense :</label>
            <label>
              {LoanDetail?.reserveBalanceRestricted
                ? currencyFormat(LoanDetail.reserveBalanceRestricted)
                : "--"}
            </label>
          </div>

          {/* Suspense Balance */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Suspense Balance :</label>
            <label>
              {LoanDetail?.reserveBalance
                ? currencyFormat(LoanDetail.reserveBalance)
                : "--"}
            </label>
          </div>

          {/* Unpaid Late Charges */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Unpaid Late Charges :</label>
            <label>
              {LoanDetail?.unpaidLateCharges
                ? currencyFormat(LoanDetail.unpaidLateCharges)
                : "--"}
            </label>
          </div>

          {/* Unpaid Interest */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Unpaid Interest :</label>
            <label>
              {LoanDetail?.unpaidInterest
                ? currencyFormat(LoanDetail.unpaidInterest)
                : "--"}
            </label>
          </div>

          {/* Note Type */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Note Type :</label>
            <label>
              {FindLabelOfEnum(
                NoteTypeEnum,
                LoanDetail?.noteType
              )}
            </label>
          </div>

          {/* Rate Type */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Rate Type :</label>
            <label>
              {FindLabelOfEnum(
                RateTypeEnum,
                LoanDetail?.rateType
              )}
            </label>
          </div>

          {/* Deferred Principal Balance */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Deferred Principal Balance :</label>
            <label>
              {LoanDetail?.deferredPrinBal
                ? currencyFormat(LoanDetail.deferredPrinBal)
                : "--"}
            </label>
          </div>

          {/* Deferred Unpaid Interest */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Deferred Unpaid Interest :</label>
            <label>
              {LoanDetail?.deferredUnpaidInt
                ? currencyFormat(LoanDetail.deferredUnpaidInt)
                : "--"}
            </label>
          </div>

          {/* Deferred Late Charges */}
          <div className="rounded-xl col-span-1 flex flex-row gap-2">
            <label>Deferred Unpaid Late Charges :</label>
            <label>
              {LoanDetail?.deferredLateCharges
                ? currencyFormat(LoanDetail.deferredLateCharges)
                : "--"}
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
