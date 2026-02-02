const migrateService = require('../services/MigrateService');
const loanService = require('../services/LoanRegistryService');

class MigrationController {
  /**
   * POST /api/migrate/loans
   * Migrar todos los loans desde GraphQL a blockchain
   */
  async migrateLoans(req, res, next) {
    try {
      const { privateKey, userId } = req.body;

      if (!privateKey) {
        return res.status(400).json({ 
          success: false,
          error: 'Private key is required' 
        });
      }

      if (!userId) {
        return res.status(400).json({ 
          success: false,
          error: 'User ID is required' 
        });
      }

      console.log('🚀 Starting loan migration...');

      // Paso 1: Obtener lista de loans desde GraphQL
      const portfolioLoans = await migrateService.fetchLoanPortfolio();
      console.log(`📋 Found ${portfolioLoans.length} loans to migrate`);

      const results = {
        total: portfolioLoans.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Paso 2: Procesar cada loan
      for (let i = 0; i < portfolioLoans.length; i++) {
        const portfolioLoan = portfolioLoans[i];
        const loanId = portfolioLoan.loanAccount;
        const loanUid = portfolioLoan.loanUid;

        console.log(`[${i + 1}/${portfolioLoans.length}] Processing loan ${loanId}...`);

        try {
          // Obtener detalles del loan
          const dashboardInfo = await migrateService.fetchLoanDashboardInfo(loanUid);

          if (!dashboardInfo) {
            console.log(`  ⚠️  No dashboard info for ${loanId}`);
            results.failed++;
            results.errors.push({
              loanId,
              loanUid,
              error: 'Dashboard info not found'
            });
            continue;
          }

          // Mapear datos
          const loanData = migrateService.mapLoanData(portfolioLoan, dashboardInfo, userId);

          // Crear loan en blockchain
          const result = await loanService.createLoan(privateKey, loanData);

          console.log(`  ✅ Loan ${loanId} migrated. TxHash: ${result.txHash}`);
          results.successful++;

          // Pequeña pausa para no saturar
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`  ❌ Error migrating loan ${loanId}:`, error.message);
          results.failed++;
          results.errors.push({
            loanId,
            loanUid,
            error: error.message
          });
        }
      }

      console.log('✅ Migration completed');
      console.log(`   Successful: ${results.successful}`);
      console.log(`   Failed: ${results.failed}`);

      res.json({
        success: true,
        message: 'Migration completed',
        results
      });

    } catch (error) {
      console.error('Migration error:', error);
      next(error);
    }
  }

  /**
   * POST /api/migrate/loan/:loanId
   * Migrar un loan específico
   */
  async migrateSingleLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const { privateKey, userId, loanUid } = req.body;

      if (!privateKey || !userId || !loanUid) {
        return res.status(400).json({ 
          success: false,
          error: 'privateKey, userId, and loanUid are required' 
        });
      }

      console.log(`🚀 Migrating single loan: ${loanId}`);

      // Obtener detalles del loan
      const dashboardInfo = await migrateService.fetchLoanDashboardInfo(loanUid);

      if (!dashboardInfo) {
        return res.status(404).json({
          success: false,
          error: 'Dashboard info not found for this loan'
        });
      }

      // Mapear datos
      const loanData = migrateService.mapLoanData(
        { loanAccount: loanId, loanUid },
        dashboardInfo,
        userId
      );

      // Crear loan en blockchain
      const result = await loanService.createLoan(privateKey, loanData);

      console.log(`✅ Loan ${loanId} migrated. TxHash: ${result.txHash}`);

      res.json({
        success: true,
        message: 'Loan migrated successfully',
        data: result
      });

    } catch (error) {
      console.error('Single loan migration error:', error);
      next(error);
    }
  }

  /**
   * GET /api/migrate/status
   * Verificar estado de la migración (comparar GraphQL vs Blockchain)
   */
  async getMigrationStatus(req, res, next) {
    try {
      // Obtener loans desde GraphQL
      const graphqlLoans = await migrateService.fetchLoanPortfolio();

      // Obtener loans desde blockchain
      const blockchainResult = await loanService.queryAllLoansComplete();

      const status = {
        graphqlCount: graphqlLoans.length,
        blockchainCount: blockchainResult.length,
        difference: graphqlLoans.length - blockchainResult.length,
        percentage: blockchainResult.length > 0 
          ? ((blockchainResult.length / graphqlLoans.length) * 100).toFixed(2)
          : 0
      };

      res.json({
        success: true,
        status
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MigrationController();