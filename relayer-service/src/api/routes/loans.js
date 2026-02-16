import express from 'express';
import besuService from '../../services/BesuService.js';
import avalancheService from '../../services/AvalancheService.js';
import stateManager from '../../services/StateManager.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/loans/:loanId
 * Get loan details from Besu
 * ✅ ACTUALIZADO: Usa campos correctos del LoanRegistry
 */
router.get('/:loanId', async (req, res, next) => {
  try {
    const { loanId } = req.params;
    
    logger.info('API: Getting loan details', { loanId });
    
    const loanRegistry = besuService.getContract('loanRegistry');
    const loan = await loanRegistry.readLoan(loanId);
    
    // ✅ Sanitize data con campos correctos del struct LoanRegistry.Loan
    const sanitized = {
      loanId: loan.ID,
      loanUid: loan.LoanUid,
      account: loan.Account,
      lenderUid: loan.LenderUid,
      originalBalance: loan.OriginalBalance.toString(),
      currentBalance: loan.CurrentBalance.toString(),
      noteRate: loan.NoteRate.toString(),
      soldRate: loan.SoldRate.toString(),
      calcInterestRate: loan.CalcInterestRate.toString(),
      status: loan.Status,
      location: `${loan.City || 'N/A'}, ${loan.State || 'N/A'}`,
      propertyZip: loan.PropertyZip,
      nextDueDate: loan.NextDueDate,
      paidToDate: loan.PaidToDate,
      maturityDate: loan.MaturityDate,
      closeDate: loan.CloseDate,
      lenderOwnerPct: loan.LenderOwnerPct.toString(),
      lenderName: loan.LenderName,
      isForeclosure: loan.IsForeclosure,
      isLocked: loan.isLocked,
      isTokenized: loan.avalancheTokenId > 0
    };
    
    // Check if NFT exists in StateManager
    const tokenId = stateManager.getNFTForLoan(loanId);
    if (tokenId) {
      sanitized.nft = {
        tokenId,
        chain: 'avalanche-fuji',
        explorer: `https://testnet.snowtrace.io/token/${process.env.AVALANCHE_LOAN_NFT}?a=${tokenId}`
      };
    }
    
    res.json(sanitized);
    
  } catch (error) {
    logger.error('API: Error getting loan', { 
      loanId: req.params.loanId,
      error: error.message 
    });
    
    if (error.message.includes('does not exist')) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    next(error);
  }
});

/**
 * GET /api/loans/:loanId/nft
 * Get NFT info for a loan
 * ✅ ACTUALIZADO: Usa campos correctos de LoanNFT.LoanMetadata
 */
router.get('/:loanId/nft', async (req, res, next) => {
  try {
    const { loanId } = req.params;
    
    const tokenId = stateManager.getNFTForLoan(loanId);
    
    if (!tokenId) {
      return res.status(404).json({ 
        error: 'NFT not found for this loan',
        loanId 
      });
    }
    
    // Get NFT metadata from Avalanche
    const loanNFT = avalancheService.getContract('loanNFT');
    const metadata = await loanNFT.getLoanMetadata(tokenId);
    const owner = await loanNFT.ownerOf(tokenId);
    
    // ✅ Campos correctos del struct LoanNFT.LoanMetadata
    res.json({
      loanId,
      tokenId: tokenId.toString(),
      owner,
      metadata: {
        loanId: metadata.loanId,
        originalBalance: metadata.originalBalance.toString(),
        currentBalance: metadata.currentBalance.toString(),
        noteRate: metadata.noteRate.toString(),
        lenderOwnerPct: metadata.lenderOwnerPct.toString(),
        status: metadata.status,
        location: metadata.location,
        mintedAt: metadata.mintedAt.toString(),
        lastUpdated: metadata.lastUpdated.toString()
      },
      links: {
        snowtrace: `https://testnet.snowtrace.io/token/${process.env.AVALANCHE_LOAN_NFT}?a=${tokenId}`,
      }
    });
    
  } catch (error) {
    logger.error('API: Error getting NFT', { 
      loanId: req.params.loanId,
      error: error.message 
    });
    next(error);
  }
});

/**
 * GET /api/loans/lender/:lenderUid
 * Get all loans for a lender from Besu
 * ✅ ACTUALIZADO: Usa findLoansByLenderUid en lugar de findLoansByUserId
 */
router.get('/lender/:lenderUid', async (req, res, next) => {
  try {
    const { lenderUid } = req.params;
    
    logger.info('API: Getting lender loans', { lenderUid });
    
    const loanRegistry = besuService.getContract('loanRegistry');
    const loans = await loanRegistry.findLoansByLenderUid(lenderUid);
    
    const result = loans.map(loan => ({
      loanId: loan.ID,
      loanUid: loan.LoanUid,
      originalBalance: loan.OriginalBalance.toString(),
      currentBalance: loan.CurrentBalance.toString(),
      noteRate: loan.NoteRate.toString(),
      status: loan.Status,
      location: `${loan.City || 'N/A'}, ${loan.State || 'N/A'}`,
      isLocked: loan.isLocked,
      isTokenized: loan.avalancheTokenId > 0,
      nftTokenId: loan.avalancheTokenId > 0 ? loan.avalancheTokenId.toString() : null
    }));
    
    res.json({
      lenderUid,
      loans: result,
      total: result.length
    });
    
  } catch (error) {
    logger.error('API: Error getting lender loans', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/loans/wallet/:walletAddress
 * Get all NFTs owned by a wallet address (Avalanche)
 * ✅ Esta es la función correcta para ver NFTs por wallet
 */
router.get('/wallet/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    
    logger.info('API: Getting NFTs for wallet', { walletAddress });
    
    // Get all minted NFTs and filter by owner
    const loanNFT = avalancheService.getContract('loanNFT');
    const totalMinted = await loanNFT.getTotalMinted();
    
    const ownedNFTs = [];
    
    for (let tokenId = 1; tokenId <= Number(totalMinted); tokenId++) {
      try {
        const owner = await loanNFT.ownerOf(tokenId);
        
        if (owner.toLowerCase() === walletAddress.toLowerCase()) {
          const metadata = await loanNFT.getLoanMetadata(tokenId);
          
          // ✅ Campos correctos del struct LoanMetadata
          ownedNFTs.push({
            tokenId: tokenId.toString(),
            loanId: metadata.loanId,
            originalBalance: metadata.originalBalance.toString(),
            currentBalance: metadata.currentBalance.toString(),
            noteRate: metadata.noteRate.toString(),
            lenderOwnerPct: metadata.lenderOwnerPct.toString(),
            status: metadata.status,
            location: metadata.location,
            mintedAt: metadata.mintedAt.toString(),
            lastUpdated: metadata.lastUpdated.toString()
          });
        }
      } catch (err) {
        // Token doesn't exist or burned, skip
        continue;
      }
    }
    
    res.json({
      walletAddress,
      nfts: ownedNFTs,
      total: ownedNFTs.length
    });
    
  } catch (error) {
    logger.error('API: Error getting wallet NFTs', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/loans/approved
 * Get all loans approved for sale (locked in Besu, waiting to be minted)
 * ✅ ACTUALIZADO: ApprovalData ya NO tiene modifiedInterestRate
 */
router.get('/approved', async (req, res, next) => {
  try {
    logger.info('API: Getting approved loans');
    
    const loanRegistry = besuService.getContract('loanRegistry');
    const marketplaceBridge = besuService.getContract('marketplaceBridge');
    
    const allLoans = await loanRegistry.queryAllLoans();
    const approved = [];
    
    for (const loan of allLoans) {
      if (loan.isLocked && loan.avalancheTokenId === 0n) {
        // Loan is locked but not yet minted
        const approvalData = await marketplaceBridge.getApprovalData(loan.ID);
        
        if (approvalData.isApproved && !approvalData.isCancelled) {
          approved.push({
            loanId: loan.ID,
            loanUid: loan.LoanUid,
            originalBalance: loan.OriginalBalance.toString(),
            currentBalance: loan.CurrentBalance.toString(),
            noteRate: loan.NoteRate.toString(),  // ✅ NoteRate del LoanRegistry
            lenderOwnerPct: loan.LenderOwnerPct.toString(),
            askingPrice: approvalData.askingPrice.toString(),
            lenderAddress: approvalData.lenderAddress,
            approvalTimestamp: approvalData.approvalTimestamp.toString(),
            canBeMinted: !approvalData.isMinted,
            status: loan.Status,
            location: `${loan.City || 'N/A'}, ${loan.State || 'N/A'}`
          });
        }
      }
    }
    
    res.json({
      approved,
      total: approved.length
    });
    
  } catch (error) {
    logger.error('API: Error getting approved loans', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/loans/tokenized
 * Get all tokenized loans (minted as NFTs)
 * ✅ ACTUALIZADO: Usa campos correctos de LoanMetadata
 */
router.get('/tokenized', async (req, res, next) => {
  try {
    logger.info('API: Getting tokenized loans');
    
    const loanNFT = avalancheService.getContract('loanNFT');
    const totalMinted = await loanNFT.getTotalMinted();
    
    const tokenized = [];
    
    for (let tokenId = 1; tokenId <= Number(totalMinted); tokenId++) {
      try {
        const metadata = await loanNFT.getLoanMetadata(tokenId);
        const owner = await loanNFT.ownerOf(tokenId);
        
        tokenized.push({
          tokenId: tokenId.toString(),
          loanId: metadata.loanId,
          owner,
          originalBalance: metadata.originalBalance.toString(),
          currentBalance: metadata.currentBalance.toString(),
          noteRate: metadata.noteRate.toString(),
          lenderOwnerPct: metadata.lenderOwnerPct.toString(),
          status: metadata.status,
          location: metadata.location,
          mintedAt: metadata.mintedAt.toString(),
          lastUpdated: metadata.lastUpdated.toString()
        });
      } catch (err) {
        // Token doesn't exist, skip
        continue;
      }
    }
    
    res.json({
      tokenized,
      total: tokenized.length
    });
    
  } catch (error) {
    logger.error('API: Error getting tokenized loans', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/loans/stats
 * Get overall loan statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const loanRegistry = besuService.getContract('loanRegistry');
    const loanNFT = avalancheService.getContract('loanNFT');
    
    const totalLoans = await loanRegistry.getTotalLoansCount();
    const totalTokenized = await loanNFT.getTotalMinted();
    
    // Count locked loans
    const allLoans = await loanRegistry.queryAllLoans();
    const lockedCount = allLoans.filter(loan => loan.isLocked).length;
    
    res.json({
      totalLoans: totalLoans.toString(),
      totalTokenized: totalTokenized.toString(),
      totalLocked: lockedCount,
      pendingMint: lockedCount - Number(totalTokenized),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('API: Error getting stats', { error: error.message });
    next(error);
  }
});

export default router;