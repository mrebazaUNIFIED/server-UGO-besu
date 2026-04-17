// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LoanStructs
 * @notice Estructuras compartidas extraídas de LoanRegistry para resolver los límites EVM.
 */
struct Loan {
    string ID;
    string LoanUid;
    string Account;
    string LenderUid;
    uint256 OriginalBalance;
    uint256 CurrentBalance;
    uint256 VendorFeePct;
    uint256 NoteRate;
    uint256 SoldRate;
    uint256 CalcInterestRate;
    string CoBorrower;
    uint256 ActiveDefaultInterestRate;
    uint256 ReserveBalanceRestricted;
    uint256 DefaultInterestRate;
    uint256 DeferredPrinBal;
    uint256 DeferredUnpaidInt;
    uint256 DeferredLateCharges;
    uint256 DeferredUnpaidCharges;
    uint256 MaximumDraw;
    string CloseDate;
    string DrawStatus;
    string LenderFundDate;
    uint256 LenderOwnerPct;
    string LenderName;
    string LenderAccount;
    bool IsForeclosure;
    string Status;
    string PaidOffDate;
    string PaidToDate;
    string MaturityDate;
    string NextDueDate;
    string City;
    string State;
    string PropertyZip;
    bytes32 TxId;
    uint256 BLOCKAUDITCreationAt;
    uint256 BLOCKAUDITUpdatedAt;
    bool exists;
    uint256 avalancheTokenId;
    uint256 lastSyncTimestamp;
    bool isLocked;
    // Nuevos campos empaquetados
    uint8 LienPosition;
    uint8 NoteType;
    uint8 PropertyType;
    uint8 AmortizationType;
    uint8 RateType;
    bool IsBankruptcy;
    uint256 CurrentMarketValue;
    uint256 PaymentImpound;
    uint256 TotalInTrust;
    uint256 LateCharges;
    uint256 Ltv;
    string NoteStatus;
    string NumPaymentsLas12Months;
    string BalloonPymnt;
    string OnForbereance;
    string PrepymntPenalty;
    string FCModifiedTerms;
    string ApplyMERS;
    string FirstPaymentDate;
    string LastPaymentDate;
    string BkDischargeDate;
    string BkChapter;
    string BkDismissalDate;
    string BkFillingDate;
    string PCounty;
    string PValuationDate;
    string PCity;
}

struct LoanInput {
    string LoanUid;
    string Account;
    string LenderUid;
    uint256 OriginalBalance;
    uint256 CurrentBalance;
    uint256 VendorFeePct;
    uint256 NoteRate;
    uint256 SoldRate;
    uint256 CalcInterestRate;
    string CoBorrower;
    uint256 ActiveDefaultInterestRate;
    uint256 ReserveBalanceRestricted;
    uint256 DefaultInterestRate;
    uint256 DeferredPrinBal;
    uint256 DeferredUnpaidInt;
    uint256 DeferredLateCharges;
    uint256 DeferredUnpaidCharges;
    uint256 MaximumDraw;
    string CloseDate;
    string DrawStatus;
    string LenderFundDate;
    uint256 LenderOwnerPct;
    string LenderName;
    string LenderAccount;
    bool IsForeclosure;
    string Status;
    string PaidOffDate;
    string PaidToDate;
    string MaturityDate;
    string NextDueDate;
    string City;
    string State;
    string PropertyZip;
    uint8 LienPosition;
    uint8 NoteType;
    uint8 PropertyType;
    uint8 AmortizationType;
    uint8 RateType;
    bool IsBankruptcy;
    uint256 CurrentMarketValue;
    uint256 PaymentImpound;
    uint256 TotalInTrust;
    uint256 LateCharges;
    uint256 Ltv;
    string NoteStatus;
    string NumPaymentsLas12Months;
    string BalloonPymnt;
    string OnForbereance;
    string PrepymntPenalty;
    string FCModifiedTerms;
    string ApplyMERS;
    string FirstPaymentDate;
    string LastPaymentDate;
    string BkDischargeDate;
    string BkChapter;
    string BkDismissalDate;
    string BkFillingDate;
    string PCounty;
    string PValuationDate;
    string PCity;
}

struct Change {
    string PropertyName;
    string OldValue;
    string NewValue;
}

struct LoanActivity {
    bytes32 TxId;
    string LoanInformationId;
    Change[] Changes;
    uint256 Timestamp;
}

struct LoanHistoryEntry {
    bytes32 TxId;
    uint256 Timestamp;
    bool IsDelete;
}

struct LoanUpdateFields {
    bool updateCurrentBalance;
    uint256 CurrentBalance;
    bool updateNoteRate;
    uint256 NoteRate;
    bool updateStatus;
    string Status;
    bool updateNextDueDate;
    string NextDueDate;
    bool updatePaidToDate;
    string PaidToDate;
    bool updatePaidOffDate;
    string PaidOffDate;
    bool updateDeferredUnpaidInt;
    uint256 DeferredUnpaidInt;
    bool updateDeferredLateCharges;
    uint256 DeferredLateCharges;
    bool updateDeferredUnpaidCharges;
    uint256 DeferredUnpaidCharges;
    bool updateLenderOwnerPct;
    uint256 LenderOwnerPct;
    bool updateIsForeclosure;
    bool IsForeclosure;
    bool updateCoBorrower;
    string CoBorrower;
    bool updateLenderName;
    string LenderName;
    bool updateCity;
    string City;
    bool updateState;
    string State;
    bool updatePropertyZip;
    string PropertyZip;
}
