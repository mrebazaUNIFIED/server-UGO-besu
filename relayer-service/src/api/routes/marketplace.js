import express from 'express';
import avalancheService from '../../services/AvalancheService.js';
import stateManager from '../../services/StateManager.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/marketplace/listings
 * Get all active listings
 */
router.get('/listings', async (req, res, next) => {
  try {
    const marketplace = avalancheService.getContract('marketplace');
    const loanNFT = avalancheService.getContract('loanNFT');
    
    const totalMinted = await loanNFT.getTotalMinted();
    const listings = [];
    
    for (let tokenId = 1; tokenId <= Number(totalMinted); tokenId++) {
      try {
        const listing = await marketplace.getListing(tokenId);
        
        if (listing.isActive) {
          const metadata = await loanNFT.getLoanMetadata(tokenId);
          const owner = await loanNFT.ownerOf(tokenId);
          
          listings.push({
            tokenId: tokenId.toString(),
            loanId: metadata.loanId,
            seller: listing.seller,
            price: listing.price.toString(),
            listedAt: listing.listedAt.toString(),
            currentBalance: metadata.currentBalance.toString(),
            monthlyPayment: metadata.monthlyPayment.toString(),
            status: metadata.status,
            location: metadata.location,
            owner,
            links: {
              detail: `/api/loans/${metadata.loanId}`,
              nft: `/api/loans/${metadata.loanId}/nft`
            }
          });
        }
      } catch (err) {
        // Token doesn't exist or error fetching, skip
        logger.debug(`Skipping tokenId ${tokenId}:`, err.message);
        continue;
      }
    }
    
    res.json({
      listings,
      total: listings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('API: Error getting listings', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/marketplace/listings/featured
 * Get featured listings (sorted by price or balance)
 */
router.get('/listings/featured', async (req, res, next) => {
  try {
    const { sortBy = 'price', limit = 10 } = req.query;
    
    const marketplace = avalancheService.getContract('marketplace');
    const loanNFT = avalancheService.getContract('loanNFT');
    
    const totalMinted = await loanNFT.getTotalMinted();
    const listings = [];
    
    for (let tokenId = 1; tokenId <= Number(totalMinted); tokenId++) {
      try {
        const listing = await marketplace.getListing(tokenId);
        
        if (listing.isActive) {
          const metadata = await loanNFT.getLoanMetadata(tokenId);
          
          listings.push({
            tokenId: tokenId.toString(),
            loanId: metadata.loanId,
            seller: listing.seller,
            price: listing.price.toString(),
            currentBalance: metadata.currentBalance.toString(),
            monthlyPayment: metadata.monthlyPayment.toString(),
            status: metadata.status,
            location: metadata.location
          });
        }
      } catch (err) {
        continue;
      }
    }
    
    // Sort
    listings.sort((a, b) => {
      if (sortBy === 'price') {
        return BigInt(b.price) - BigInt(a.price);
      } else if (sortBy === 'balance') {
        return BigInt(b.currentBalance) - BigInt(a.currentBalance);
      }
      return 0;
    });
    
    res.json({
      listings: listings.slice(0, Number(limit)),
      total: listings.length
    });
    
  } catch (error) {
    logger.error('API: Error getting featured listings', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/marketplace/nft/:tokenId/listing
 * Check if NFT is listed for sale
 */
router.get('/nft/:tokenId/listing', async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    
    const marketplace = avalancheService.getContract('marketplace');
    const loanNFT = avalancheService.getContract('loanNFT');
    
    const listing = await marketplace.getListing(tokenId);
    
    if (!listing.isActive) {
      return res.json({
        tokenId,
        listed: false
      });
    }
    
    const metadata = await loanNFT.getLoanMetadata(tokenId);
    
    res.json({
      tokenId,
      listed: true,
      loanId: metadata.loanId,
      seller: listing.seller,
      price: listing.price.toString(),
      listedAt: listing.listedAt.toString(),
      loanDetails: {
        currentBalance: metadata.currentBalance.toString(),
        status: metadata.status,
        monthlyPayment: metadata.monthlyPayment.toString()
      }
    });
    
  } catch (error) {
    logger.error('API: Error checking listing', { 
      tokenId: req.params.tokenId,
      error: error.message 
    });
    
    if (error.message.includes('does not exist')) {
      return res.status(404).json({ error: 'NFT not found' });
    }
    
    next(error);
  }
});

/**
 * GET /api/marketplace/loan/:loanId/listing
 * Check if a loan is listed (by loanId, not tokenId)
 */
router.get('/loan/:loanId/listing', async (req, res, next) => {
  try {
    const { loanId } = req.params;
    
    // Get tokenId from StateManager
    const tokenId = stateManager.getNFTForLoan(loanId);
    
    if (!tokenId) {
      return res.json({
        loanId,
        tokenized: false,
        listed: false
      });
    }
    
    const marketplace = avalancheService.getContract('marketplace');
    const listing = await marketplace.getListing(tokenId);
    
    if (!listing.isActive) {
      return res.json({
        loanId,
        tokenized: true,
        tokenId: tokenId.toString(),
        listed: false
      });
    }
    
    res.json({
      loanId,
      tokenized: true,
      tokenId: tokenId.toString(),
      listed: true,
      seller: listing.seller,
      price: listing.price.toString(),
      listedAt: listing.listedAt.toString()
    });
    
  } catch (error) {
    logger.error('API: Error checking loan listing', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/marketplace/stats
 * Get marketplace statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const marketplace = avalancheService.getContract('marketplace');
    const loanNFT = avalancheService.getContract('loanNFT');
    
    const totalSales = await marketplace.totalSales();
    const totalVolume = await marketplace.totalVolume();
    const marketplaceFee = await marketplace.marketplaceFee();
    
    // Count active listings
    const totalMinted = await loanNFT.getTotalMinted();
    let activeListings = 0;
    
    for (let tokenId = 1; tokenId <= Number(totalMinted); tokenId++) {
      try {
        const listing = await marketplace.getListing(tokenId);
        if (listing.isActive) activeListings++;
      } catch (err) {
        continue;
      }
    }
    
    res.json({
      totalSales: totalSales.toString(),
      totalVolume: totalVolume.toString(),
      activeListings,
      marketplaceFee: (Number(marketplaceFee) / 100).toFixed(2) + '%',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('API: Error getting stats', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/marketplace/sales/recent
 * Get recent sales (requires event indexing in production)
 */
router.get('/sales/recent', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const marketplace = avalancheService.getContract('marketplace');
    
    // Get LoanSold events from last 1000 blocks
    const currentBlock = await avalancheService.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);
    
    const filter = marketplace.filters.LoanSold();
    const events = await marketplace.queryFilter(filter, fromBlock, currentBlock);
    
    const recentSales = events
      .slice(-Number(limit))
      .reverse()
      .map(event => ({
        tokenId: event.args.tokenId.toString(),
        seller: event.args.seller,
        buyer: event.args.buyer,
        price: event.args.price.toString(),
        fee: event.args.fee.toString(),
        timestamp: event.args.timestamp.toString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      }));
    
    res.json({
      sales: recentSales,
      total: recentSales.length
    });
    
  } catch (error) {
    logger.error('API: Error getting recent sales', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/marketplace/seller/:address
 * Get all listings by a specific seller
 */
router.get('/seller/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    const marketplace = avalancheService.getContract('marketplace');
    const loanNFT = avalancheService.getContract('loanNFT');
    
    const totalMinted = await loanNFT.getTotalMinted();
    const sellerListings = [];
    
    for (let tokenId = 1; tokenId <= Number(totalMinted); tokenId++) {
      try {
        const listing = await marketplace.getListing(tokenId);
        
        if (listing.isActive && listing.seller.toLowerCase() === address.toLowerCase()) {
          const metadata = await loanNFT.getLoanMetadata(tokenId);
          
          sellerListings.push({
            tokenId: tokenId.toString(),
            loanId: metadata.loanId,
            price: listing.price.toString(),
            listedAt: listing.listedAt.toString(),
            currentBalance: metadata.currentBalance.toString(),
            status: metadata.status
          });
        }
      } catch (err) {
        continue;
      }
    }
    
    res.json({
      seller: address,
      listings: sellerListings,
      total: sellerListings.length
    });
    
  } catch (error) {
    logger.error('API: Error getting seller listings', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/marketplace/validate/:tokenId
 * Validate if a loan can be listed (helper for frontend)
 */
router.get('/validate/:tokenId', async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    
    const marketplace = avalancheService.getContract('marketplace');
    const canBeListed = await marketplace.canBeListed(tokenId);
    
    if (!canBeListed) {
      const loanNFT = avalancheService.getContract('loanNFT');
      const metadata = await loanNFT.getLoanMetadata(tokenId);
      
      return res.json({
        tokenId,
        canBeListed: false,
        reason: metadata.status === 'Paid Off' 
          ? 'Loan is paid off'
          : metadata.currentBalance === 0n
            ? 'Loan has zero balance'
            : 'Loan is foreclosed or invalid status'
      });
    }
    
    res.json({
      tokenId,
      canBeListed: true
    });
    
  } catch (error) {
    logger.error('API: Error validating listing', { error: error.message });
    
    if (error.message.includes('does not exist')) {
      return res.status(404).json({ error: 'NFT not found' });
    }
    
    next(error);
  }
});

export default router;