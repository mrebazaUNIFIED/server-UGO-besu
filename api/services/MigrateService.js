const axios = require('axios');

class GraphQLService {
  constructor() {
    this.graphqlURL = process.env.GRAPHQL_URL || 'https://fapi.myfci.com/graphql';
    this.token = process.env.GRAPHQL_TOKEN || '88S8SEPUcjUkg4YXKceE9JHWrQ25P8oUeH_CLTjWLGQ';
  }

  /**
   * Query 1: Obtener lista de loans
   */
  async fetchLoanPortfolio() {
    const query = `
      {
        getLoanPortfolioBCv2 {
          loanAccount
          loanUid
        }
      }
    `;

    try {
      const response = await axios.post(
        this.graphqlURL,
        { query },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      return response.data?.data?.getLoanPortfolioBCv2 || [];
    } catch (error) {
      console.error('Error fetching loan portfolio:', error.message);
      throw new Error('Failed to fetch loan portfolio from GraphQL');
    }
  }

  /**
   * Query 2: Obtener detalles de un loan por loanUid
   */
  async fetchLoanDashboardInfo(loanUid) {
    const query = `
      {
        getCustomLoanDashboardInfo(loanUid:"${loanUid}") {
          loanFullName
          street
          city
          state
          zipCode
          homePhone
          email
          propertyStreet
          propertyCity
          propertyState
          propertyZip
          propertyType
          propertyOccupancyEnum
          loanStatusEnum
          currentPrincipalBalance
          restrictedFunds
          suspenseBalance
          escrowBalance
          totalInTrust
          noteRate
          soldRate
          defaultRate
          unpaidInterest
          unpaidFees
          lateFeesAmount
          unpaidLateFees
          accruedLateFees
          unpaidLoanCharges
          deferredPrinBalance
          deferredUnpaidCharges
          originalLoanAmount
          originationDate
          nextPaymentDue
          maturityDate
          lastPaymentRec
          interestPaidTo
          deferredUnpaidInt
          fCIRestrictedPrincipal
          fCIRestrictedInterest
          pymntGraceDays
          daysSinceLastPymnt
          numPymntsDue
          scheduledPymnt
          promisesToPay
          nSFLast12Months
        }
      }
    `;

    try {
      const response = await axios.post(
        this.graphqlURL,
        { query },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (response.data?.errors) {
        console.error(`GraphQL errors for ${loanUid}:`, response.data.errors);
        return null;
      }

      return response.data?.data?.getCustomLoanDashboardInfo || null;
    } catch (error) {
      console.error(`Error fetching dashboard info for ${loanUid}:`, error.message);
      return null;
    }
  }

  /**
   * Helper: Convertir porcentaje a basis points
   */
  toBasisPoints(percentage) {
    if (!percentage || percentage === '') return 0;
    try {
      return Math.floor(parseFloat(percentage) * 100);
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Safe string
   */
  safeStr(value, defaultValue = '') {
    return value ? String(value) : defaultValue;
  }

  /** 
   * Helper: Safe int
   */
  safeInt(value, defaultValue = 0) {
    if (!value || value === '') return defaultValue;
    try {
      return Math.floor(parseFloat(value));
    } catch {
      return defaultValue;
    }
  }

  /**
   * Mapear datos de GraphQL a formato del contrato
   * → TODOS los montos se pasan en DÓLARES (el LoanRegistryService los convierte a centavos)
   */
  mapLoanData(portfolioLoan, dashboardInfo, userId) {

    return {
      ID: this.safeStr(portfolioLoan.loanAccount),
      UserID: userId,
      LUid: this.safeStr(portfolioLoan.loanUid),

      // Borrower info
      BorrowerFullName: this.safeStr(dashboardInfo.loanFullName),
      BorrowerHomePhone: this.safeStr(dashboardInfo.homePhone),
      BorrowerEmail: this.safeStr(dashboardInfo.email),

      // Property info
      BorrowerPropertyAddress: this.safeStr(dashboardInfo.propertyStreet),
      BorrowerCity: this.safeStr(dashboardInfo.propertyCity),
      BorrowerState: this.safeStr(dashboardInfo.propertyState),
      BorrowerZip: this.safeStr(dashboardInfo.propertyZip),
      BorrowerOccupancyStatus: this.safeStr(dashboardInfo.propertyOccupancyEnum),

      // Financial values → EN DÓLARES (sin convertir aquí)
      CurrentPrincipalBal: Number(dashboardInfo.currentPrincipalBalance || 0),
      RestrictedFunds: Number(dashboardInfo.restrictedFunds || 0),
      SuspenseBalance: Number(dashboardInfo.suspenseBalance || 0),
      EscrowBalance: Number(dashboardInfo.escrowBalance || 0),
      TotalInTrust: Number(dashboardInfo.totalInTrust || 0),

      // Rates (basis points)
      NoteRate: this.toBasisPoints(dashboardInfo.noteRate),
      SoldRate: this.toBasisPoints(dashboardInfo.soldRate),
      DefaultRate: this.toBasisPoints(dashboardInfo.defaultRate),

      // More financial values → EN DÓLARES
      UnpaidInterest: Number(dashboardInfo.unpaidInterest || 0),
      UnpaidFees: Number(dashboardInfo.unpaidFees || 0),
      LateFeesAmount: Number(dashboardInfo.lateFeesAmount || 0),
      UnpaidLateFees: Number(dashboardInfo.unpaidLateFees || 0),
      AccruedLateFees: Number(dashboardInfo.accruedLateFees || 0),
      UnpaidLoanCharges: Number(dashboardInfo.unpaidLoanCharges || 0),
      DeferredPrincBalance: Number(dashboardInfo.deferredPrinBalance || 0),
      DeferredUnpCharges: Number(dashboardInfo.deferredUnpaidCharges || 0),
      OriginalLoanAmount: Number(dashboardInfo.originalLoanAmount || 0),

      // Dates
      OriginationDate: this.safeStr(dashboardInfo.originationDate),
      NextPaymentDue: this.safeStr(dashboardInfo.nextPaymentDue),
      LoanMaturityDate: this.safeStr(dashboardInfo.maturityDate),
      LastPaymentRec: this.safeStr(dashboardInfo.lastPaymentRec),
      InterestPaidTo: this.safeStr(dashboardInfo.interestPaidTo),

      // Other fields → EN DÓLARES
      DeferredUnpaidInt: Number(dashboardInfo.deferredUnpaidInt || 0),
      FCIRestrictedPrincipal: Number(dashboardInfo.fCIRestrictedPrincipal || 0),
      FCIRestrictedInterest: Number(dashboardInfo.fCIRestrictedInterest || 0),

      // Integers
      PymtGraceDays: this.safeInt(dashboardInfo.pymntGraceDays),
      DaysSinceLastPymt: this.safeInt(dashboardInfo.daysSinceLastPymnt),
      NumOfPymtsDue: this.safeInt(dashboardInfo.numPymntsDue),
      ScheduledPayment: Number(dashboardInfo.scheduledPymnt || 0),
      PromisesToPay: this.safeInt(dashboardInfo.promisesToPay),
      NFSInLast12Months: this.safeInt(dashboardInfo.nSFLast12Months),

      // Default values
      DeferredLateFees: 0,
      InvestorRestrictedPrincipal: 0,
      InvestorRestrictedInterest: 0,

      // Status
      Status: this.safeStr(dashboardInfo.loanStatusEnum, 'active')
    };
  }
}

module.exports = new GraphQLService();