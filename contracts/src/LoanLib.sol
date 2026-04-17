// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./LoanStructs.sol";

/**
 * @title LoanLib
 * @notice Librería delegada para aislar la lógica pesada de asignación y manipulación masiva
 *         resolviendo el límite EVM de 24KB del LoanRegistry.
 */
library LoanLib {
    
    function populateLoan(Loan storage loan, LoanInput calldata data, bytes32 txId, uint256 creationTs, bool isUpdate) external {
        loan.LoanUid = data.LoanUid;
        loan.Account = data.Account;
        loan.LenderUid = data.LenderUid;
        loan.OriginalBalance = data.OriginalBalance;
        loan.CurrentBalance = data.CurrentBalance;
        loan.VendorFeePct = data.VendorFeePct;
        loan.NoteRate = data.NoteRate;
        loan.SoldRate = data.SoldRate;
        loan.CalcInterestRate = data.CalcInterestRate;
        loan.CoBorrower = data.CoBorrower;
        loan.ActiveDefaultInterestRate = data.ActiveDefaultInterestRate;
        loan.ReserveBalanceRestricted = data.ReserveBalanceRestricted;
        loan.DefaultInterestRate = data.DefaultInterestRate;
        loan.DeferredPrinBal = data.DeferredPrinBal;
        loan.DeferredUnpaidInt = data.DeferredUnpaidInt;
        loan.DeferredLateCharges = data.DeferredLateCharges;
        loan.DeferredUnpaidCharges = data.DeferredUnpaidCharges;
        loan.MaximumDraw = data.MaximumDraw;
        loan.CloseDate = data.CloseDate;
        loan.DrawStatus = data.DrawStatus;
        loan.LenderFundDate = data.LenderFundDate;
        loan.LenderOwnerPct = data.LenderOwnerPct;
        loan.LenderName = data.LenderName;
        loan.LenderAccount = data.LenderAccount;
        loan.IsForeclosure = data.IsForeclosure;
        loan.Status = data.Status;
        loan.PaidOffDate = data.PaidOffDate;
        loan.PaidToDate = data.PaidToDate;
        loan.MaturityDate = data.MaturityDate;
        loan.NextDueDate = data.NextDueDate;
        loan.City = data.City;
        loan.State = data.State;
        loan.PropertyZip = data.PropertyZip;
        loan.TxId = txId;
        loan.BLOCKAUDITCreationAt = creationTs;
        loan.BLOCKAUDITUpdatedAt = block.timestamp;
        loan.exists = true;
        if (!isUpdate) {
            loan.avalancheTokenId = 0;
            loan.lastSyncTimestamp = 0;
            loan.isLocked = false;
        }
        loan.LienPosition = data.LienPosition;
        loan.NoteType = data.NoteType;
        loan.PropertyType = data.PropertyType;
        loan.AmortizationType = data.AmortizationType;
        loan.RateType = data.RateType;
        loan.IsBankruptcy = data.IsBankruptcy;
        loan.CurrentMarketValue = data.CurrentMarketValue;
        loan.PaymentImpound = data.PaymentImpound;
        loan.TotalInTrust = data.TotalInTrust;
        loan.LateCharges = data.LateCharges;
        loan.Ltv = data.Ltv;
        loan.NoteStatus = data.NoteStatus;
        loan.NumPaymentsLas12Months = data.NumPaymentsLas12Months;
        loan.BalloonPymnt = data.BalloonPymnt;
        loan.OnForbereance = data.OnForbereance;
        loan.PrepymntPenalty = data.PrepymntPenalty;
        loan.FCModifiedTerms = data.FCModifiedTerms;
        loan.ApplyMERS = data.ApplyMERS;
        loan.FirstPaymentDate = data.FirstPaymentDate;
        loan.LastPaymentDate = data.LastPaymentDate;
        loan.BkDischargeDate = data.BkDischargeDate;
        loan.BkChapter = data.BkChapter;
        loan.BkDismissalDate = data.BkDismissalDate;
        loan.BkFillingDate = data.BkFillingDate;
        loan.PCounty = data.PCounty;
        loan.PValuationDate = data.PValuationDate;
        loan.PCity = data.PCity;
    }

    function updateLoanPartial(Loan storage currentLoan, LoanUpdateFields memory fields, bytes32 txId) external {
        if (fields.updateCurrentBalance)     currentLoan.CurrentBalance = fields.CurrentBalance;
        if (fields.updateNoteRate)           currentLoan.NoteRate = fields.NoteRate;
        if (fields.updateStatus)             currentLoan.Status = fields.Status;
        if (fields.updateNextDueDate)        currentLoan.NextDueDate = fields.NextDueDate;
        if (fields.updatePaidToDate)         currentLoan.PaidToDate = fields.PaidToDate;
        if (fields.updatePaidOffDate)        currentLoan.PaidOffDate = fields.PaidOffDate;
        if (fields.updateDeferredUnpaidInt)  currentLoan.DeferredUnpaidInt = fields.DeferredUnpaidInt;
        if (fields.updateDeferredLateCharges) currentLoan.DeferredLateCharges = fields.DeferredLateCharges;
        if (fields.updateDeferredUnpaidCharges) currentLoan.DeferredUnpaidCharges = fields.DeferredUnpaidCharges;
        if (fields.updateLenderOwnerPct)     currentLoan.LenderOwnerPct = fields.LenderOwnerPct;
        if (fields.updateIsForeclosure)      currentLoan.IsForeclosure = fields.IsForeclosure;
        if (fields.updateCoBorrower)         currentLoan.CoBorrower = fields.CoBorrower;
        if (fields.updateLenderName)         currentLoan.LenderName = fields.LenderName;
        if (fields.updateCity)               currentLoan.City = fields.City;
        if (fields.updateState)              currentLoan.State = fields.State;
        if (fields.updatePropertyZip)        currentLoan.PropertyZip = fields.PropertyZip;

        currentLoan.BLOCKAUDITUpdatedAt = block.timestamp;
        currentLoan.TxId = txId;
    }
}
