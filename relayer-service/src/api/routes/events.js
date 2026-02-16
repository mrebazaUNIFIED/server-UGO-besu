import express from 'express';
import besuService from '../../services/BesuService.js';
import avalancheService from '../../services/AvalancheService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/events/besu/recent
 * Get recent events from Besu (LoanRegistry + MarketplaceBridge)
 */
router.get('/besu/recent', async (req, res, next) => {
  try {
    const { limit = 10, contract = 'all' } = req.query;
    const currentBlock = await besuService.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);
    
    const events = [];
    
    // LoanRegistry events
    if (contract === 'all' || contract === 'loanRegistry') {
      const loanRegistry = besuService.getContract('loanRegistry');
      
      const createdEvents = await loanRegistry.queryFilter(
        loanRegistry.filters.LoanCreated(),
        fromBlock,
        currentBlock
      );
      
      events.push(...createdEvents.map(e => ({
        contract: 'LoanRegistry',
        event: 'LoanCreated',
        loanId: e.args.loanId,
        userId: e.args.userId,
        txId: e.args.txId,
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
      
      const lockedEvents = await loanRegistry.queryFilter(
        loanRegistry.filters.LoanLocked(),
        fromBlock,
        currentBlock
      );
      
      events.push(...lockedEvents.map(e => ({
        contract: 'LoanRegistry',
        event: 'LoanLocked',
        loanId: e.args.loanId,
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
    }
    
    // MarketplaceBridge events
    if (contract === 'all' || contract === 'marketplaceBridge') {
      const marketplaceBridge = besuService.getContract('marketplaceBridge');
      
      const approvedEvents = await marketplaceBridge.queryFilter(
        marketplaceBridge.filters.LoanApprovedForSale(),
        fromBlock,
        currentBlock
      );
      
      events.push(...approvedEvents.map(e => ({
        contract: 'MarketplaceBridge',
        event: 'LoanApprovedForSale',
        loanId: e.args.loanId,
        lenderAddress: e.args.lenderAddress,
        askingPrice: e.args.askingPrice.toString(),
        modifiedInterestRate: e.args.modifiedInterestRate.toString(),
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
    }
    
    // Sort by block number (descending)
    events.sort((a, b) => b.blockNumber - a.blockNumber);
    
    res.json({
      events: events.slice(0, Number(limit)),
      total: events.length,
      fromBlock,
      toBlock: currentBlock
    });
    
  } catch (error) {
    logger.error('API: Error getting Besu events', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/events/avalanche/recent
 * Get recent events from Avalanche (NFT + Marketplace)
 */
router.get('/avalanche/recent', async (req, res, next) => {
  try {
    const { limit = 10, contract = 'all' } = req.query;
    const currentBlock = await avalancheService.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);
    
    const events = [];
    
    // LoanNFT events
    if (contract === 'all' || contract === 'loanNFT') {
      const loanNFT = avalancheService.getContract('loanNFT');
      
      const mintedEvents = await loanNFT.queryFilter(
        loanNFT.filters.LoanNFTMinted(),
        fromBlock,
        currentBlock
      );
      
      events.push(...mintedEvents.map(e => ({
        contract: 'LoanNFT',
        event: 'LoanNFTMinted',
        tokenId: e.args.tokenId.toString(),
        loanId: e.args.loanId,
        lender: e.args.lender,
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
      
      const updatedEvents = await loanNFT.queryFilter(
        loanNFT.filters.MetadataUpdated(),
        fromBlock,
        currentBlock
      );
      
      events.push(...updatedEvents.map(e => ({
        contract: 'LoanNFT',
        event: 'MetadataUpdated',
        tokenId: e.args.tokenId.toString(),
        loanId: e.args.loanId,
        newBalance: e.args.newBalance.toString(),
        newStatus: e.args.newStatus,
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
    }
    
    // LoanMarketplace events
    if (contract === 'all' || contract === 'marketplace') {
      const marketplace = avalancheService.getContract('marketplace');
      
      const listedEvents = await marketplace.queryFilter(
        marketplace.filters.LoanListed(),
        fromBlock,
        currentBlock
      );
      
      events.push(...listedEvents.map(e => ({
        contract: 'LoanMarketplace',
        event: 'LoanListed',
        tokenId: e.args.tokenId.toString(),
        seller: e.args.seller,
        price: e.args.price.toString(),
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
      
      const soldEvents = await marketplace.queryFilter(
        marketplace.filters.LoanSold(),
        fromBlock,
        currentBlock
      );
      
      events.push(...soldEvents.map(e => ({
        contract: 'LoanMarketplace',
        event: 'LoanSold',
        tokenId: e.args.tokenId.toString(),
        seller: e.args.seller,
        buyer: e.args.buyer,
        price: e.args.price.toString(),
        fee: e.args.fee.toString(),
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
    }
    
    // Sort by block number (descending)
    events.sort((a, b) => b.blockNumber - a.blockNumber);
    
    res.json({
      events: events.slice(0, Number(limit)),
      total: events.length,
      fromBlock,
      toBlock: currentBlock
    });
    
  } catch (error) {
    logger.error('API: Error getting Avalanche events', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/events/loan/:loanId/history
 * Get complete event history for a specific loan
 */
router.get('/loan/:loanId/history', async (req, res, next) => {
  try {
    const { loanId } = req.params;
    
    logger.info('API: Getting loan event history', { loanId });
    
    const besuEvents = [];
    const avalancheEvents = [];
    
    // Get Besu events
    const loanRegistry = besuService.getContract('loanRegistry');
    const currentBesuBlock = await besuService.getBlockNumber();
    
    const createdFilter = loanRegistry.filters.LoanCreated(loanId);
    const created = await loanRegistry.queryFilter(createdFilter, 0, currentBesuBlock);
    
    besuEvents.push(...created.map(e => ({
      chain: 'besu',
      event: 'LoanCreated',
      timestamp: e.args.timestamp.toString(),
      blockNumber: e.blockNumber,
      txHash: e.transactionHash
    })));
    
    const lockedFilter = loanRegistry.filters.LoanLocked(loanId);
    const locked = await loanRegistry.queryFilter(lockedFilter, 0, currentBesuBlock);
    
    besuEvents.push(...locked.map(e => ({
      chain: 'besu',
      event: 'LoanLocked',
      timestamp: e.args.timestamp.toString(),
      blockNumber: e.blockNumber,
      txHash: e.transactionHash
    })));
    
    // Get Avalanche events if tokenized
    const loanNFT = avalancheService.getContract('loanNFT');
    const currentAvalancheBlock = await avalancheService.getBlockNumber();
    
    // Check if loan was minted
    try {
      const mintedFilter = loanNFT.filters.LoanNFTMinted(null, loanId);
      const minted = await loanNFT.queryFilter(mintedFilter, 0, currentAvalancheBlock);
      
      avalancheEvents.push(...minted.map(e => ({
        chain: 'avalanche',
        event: 'LoanNFTMinted',
        tokenId: e.args.tokenId.toString(),
        timestamp: e.args.timestamp.toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })));
      
      if (minted.length > 0) {
        const tokenId = minted[0].args.tokenId;
        
        // Get metadata updates
        const updatedFilter = loanNFT.filters.MetadataUpdated(tokenId);
        const updated = await loanNFT.queryFilter(updatedFilter, 0, currentAvalancheBlock);
        
        avalancheEvents.push(...updated.map(e => ({
          chain: 'avalanche',
          event: 'MetadataUpdated',
          tokenId: e.args.tokenId.toString(),
          newBalance: e.args.newBalance.toString(),
          newStatus: e.args.newStatus,
          timestamp: e.args.timestamp.toString(),
          blockNumber: e.blockNumber,
          txHash: e.transactionHash
        })));
        
        // Get marketplace events
        const marketplace = avalancheService.getContract('marketplace');
        
        const listedFilter = marketplace.filters.LoanListed(tokenId);
        const listed = await marketplace.queryFilter(listedFilter, 0, currentAvalancheBlock);
        
        avalancheEvents.push(...listed.map(e => ({
          chain: 'avalanche',
          event: 'LoanListed',
          tokenId: e.args.tokenId.toString(),
          seller: e.args.seller,
          price: e.args.price.toString(),
          timestamp: e.args.timestamp.toString(),
          blockNumber: e.blockNumber,
          txHash: e.transactionHash
        })));
        
        const soldFilter = marketplace.filters.LoanSold(tokenId);
        const sold = await marketplace.queryFilter(soldFilter, 0, currentAvalancheBlock);
        
        avalancheEvents.push(...sold.map(e => ({
          chain: 'avalanche',
          event: 'LoanSold',
          tokenId: e.args.tokenId.toString(),
          seller: e.args.seller,
          buyer: e.args.buyer,
          price: e.args.price.toString(),
          timestamp: e.args.timestamp.toString(),
          blockNumber: e.blockNumber,
          txHash: e.transactionHash
        })));
      }
    } catch (err) {
      logger.debug('No Avalanche events for loan', { loanId, error: err.message });
    }
    
    // Combine and sort by timestamp
    const allEvents = [...besuEvents, ...avalancheEvents];
    allEvents.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    
    res.json({
      loanId,
      events: allEvents,
      total: allEvents.length,
      besuEvents: besuEvents.length,
      avalancheEvents: avalancheEvents.length
    });
    
  } catch (error) {
    logger.error('API: Error getting loan history', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/events/sync/status
 * Get cross-chain sync status
 */
router.get('/sync/status', async (req, res, next) => {
  try {
    const besuBlock = await besuService.getBlockNumber();
    const avalancheBlock = await avalancheService.getBlockNumber();
    
    res.json({
      besu: {
        currentBlock: besuBlock,
        rpcUrl: process.env.BESU_RPC_URL
      },
      avalanche: {
        currentBlock: avalancheBlock,
        rpcUrl: process.env.AVALANCHE_RPC_URL,
        network: 'fuji'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('API: Error getting sync status', { error: error.message });
    next(error);
  }
});

export default router;