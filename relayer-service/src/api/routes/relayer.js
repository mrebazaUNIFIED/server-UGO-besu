import express from 'express';
import logger from '../../utils/logger.js';
import besuService from '../../services/BesuService.js';
import avalancheService from '../../services/AvalancheService.js';
import stateManager from '../../services/StateManager.js';
import BurnRequestedHandler from '../../handlers/BurnRequestedHandler.js';

const router = express.Router();

/**
 * GET /api/relayer/status
 * Get detailed relayer status
 */
router.get('/status', (req, res) => {
  const syncState = stateManager.getSyncState();
  const metrics = stateManager.getMetrics();

  res.json({
    status: 'running',
    uptime: process.uptime(),
    syncState,
    metrics,
    timestamp: new Date().toISOString()
  });
});


router.get('/burn-status/:loanId', async (req, res) => {
  try {
    const { loanId } = req.params;

    const marketplaceBridge = besuService.getContract('marketplaceBridge');

    let approval = null;
    let tokenId = '0';
    let nftExists = false;

    try {
      approval = await marketplaceBridge.getApprovalData(loanId);
      tokenId = await marketplaceBridge.getAvalancheTokenId(loanId);

      if (tokenId && tokenId.toString() !== '0') {
        try {
          const nftContract = avalancheService.getContract('loanNFT');
          await nftContract.ownerOf(tokenId);
          nftExists = true;
        } catch {
          nftExists = false;
        }
      }
    } catch (error) {
      // Loan no encontrado o sin aprobación
    }

    const canCancel = approval ? await marketplaceBridge.canCancel(loanId) : [false, false];

    res.json({
      success: true,
      loanId,
      hasApproval: !!approval,
      approvalStatus: approval ? {
        isApproved: approval.isApproved,
        isMinted: approval.isMinted,
        isCancelled: approval.isCancelled
      } : null,
      tokenId: tokenId.toString(),
      nftExists,
      canCancel: canCancel[0],
      needsBurn: canCancel[1],
      recommendation: canCancel[0]
        ? (canCancel[1] ? 'Requires burn process' : 'Can cancel directly')
        : 'Cannot cancel'
    });

  } catch (error) {
    logger.error('Error in burn-status endpoint', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para forzar burn (solo para testing/emergencias)
router.post('/force-burn/:loanId', async (req, res) => {
  try {
    const { loanId } = req.params;

    const marketplaceBridge = besuService.getContract('marketplaceBridge');
    const tokenId = await marketplaceBridge.getAvalancheTokenId(loanId);

    if (!tokenId || tokenId.toString() === '0') {
      return res.status(404).json({
        success: false,
        error: `No token ID found for loan ${loanId}`
      });
    }

    // Crear evento simulado
    const approval = await marketplaceBridge.getApprovalData(loanId);

    const mockEvent = {
      type: 'NFTBurnRequired',
      chain: 'besu',
      loanId,
      tokenId: tokenId.toString(),
      requester: approval.lenderAddress,
      transactionHash: '0x' + 'test'.repeat(16)
    };

    const handler = new BurnRequestedHandler();
    const result = await handler.process(mockEvent);

    res.json({
      success: true,
      message: 'Forced burn executed (testing only)',
      data: result
    });

  } catch (error) {
    logger.error('Error in force-burn endpoint', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/**
 * GET /api/relayer/sync-state
 * Get blockchain sync state
 */
router.get('/sync-state', async (req, res) => {
  try {
    const besuBlock = await besuService.getBlockNumber();
    const avalancheBlock = await avalancheService.getBlockNumber();
    const syncState = stateManager.getSyncState();

    res.json({
      besu: {
        currentBlock: besuBlock,
        lastSyncedBlock: syncState.besu.lastBlock,
        lastSync: syncState.besu.lastSync,
        synced: besuBlock === syncState.besu.lastBlock
      },
      avalanche: {
        currentBlock: avalancheBlock,
        lastSyncedBlock: syncState.avalanche.lastBlock,
        lastSync: syncState.avalanche.lastSync,
        synced: avalancheBlock === syncState.avalanche.lastBlock
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get sync state' });
  }
});

/**
 * GET /api/relayer/metrics
 * Get relayer metrics (Prometheus format)
 */
router.get('/metrics', (req, res) => {
  const metrics = stateManager.getMetrics();

  let output = '';
  output += `# HELP relayer_events_processed_total Total events processed\n`;
  output += `# TYPE relayer_events_processed_total counter\n`;
  output += `relayer_events_processed_total ${metrics.eventsProcessed}\n\n`;

  output += `# HELP relayer_nfts_minted_total Total NFTs minted\n`;
  output += `# TYPE relayer_nfts_minted_total counter\n`;
  output += `relayer_nfts_minted_total ${metrics.nftsMinted}\n\n`;

  output += `# HELP relayer_sales_recorded_total Total sales recorded\n`;
  output += `# TYPE relayer_sales_recorded_total counter\n`;
  output += `relayer_sales_recorded_total ${metrics.salesRecorded}\n\n`;

  output += `# HELP relayer_payments_distributed_total Total payments distributed\n`;
  output += `# TYPE relayer_payments_distributed_total counter\n`;
  output += `relayer_payments_distributed_total ${metrics.paymentsDistributed}\n\n`;

  output += `# HELP relayer_errors_total Total errors\n`;
  output += `# TYPE relayer_errors_total counter\n`;
  output += `relayer_errors_total ${metrics.errors}\n\n`;

  res.type('text/plain').send(output);
});

export default router;