const { ethers } = require('ethers');

class RPCLoadBalancer {
  constructor(rpcUrls, chainId = 12345) {
    this.rpcUrls = rpcUrls.filter(url => url);
    this.currentIndex = 0;
    this.failedNodes = new Set();
    this.chainId = chainId;
    this.providers = new Map();
    this.healthCheckInterval = null;
    this.isCheckingHealth = false;

    if (this.rpcUrls.length === 0) {
      throw new Error('No RPC URLs provided');
    }

    this.initProviders();
    console.log(`RPC Load Balancer initialized with ${this.rpcUrls.length} nodes`);
  }

  initProviders() {
    this.rpcUrls.forEach((url, index) => {
      try {
        // 1. Creamos la red manualmente
        const network = ethers.Network.from(this.chainId);

        // 2. Pasamos la red y la opción staticNetwork
        const provider = new ethers.JsonRpcProvider(url, network, {
          staticNetwork: network, // Esto evita el "failed to detect network"
          batchMaxCount: 1
        });

        provider.pollingInterval = 1000;

        this.providers.set(url, {
          provider,
          index,
          url,
          healthy: true,
          lastCheck: Date.now(),
          failCount: 0,
          requestCount: 0
        });

        console.log(`  Provider ${index + 1} configured: ${url}`);
      } catch (error) {
        console.error(`  Failed to initialize provider for ${url}:`, error.message);
      }
    });
  }

  getProvider() {
    const availableUrls = this.rpcUrls.filter(url => !this.failedNodes.has(url));

    if (availableUrls.length === 0) {
      console.warn(' All RPC nodes failed, resetting...');
      this.failedNodes.clear();
      return this.providers.get(this.rpcUrls[0])?.provider;
    }

    const url = availableUrls[this.currentIndex % availableUrls.length];
    this.currentIndex++;

    const providerData = this.providers.get(url);
    if (providerData) {
      providerData.requestCount++;
      return providerData.provider;
    }

    return null;
  }

  markAsFailed(url) {
    const providerData = this.providers.get(url);
    if (providerData) {
      providerData.failCount++;
      providerData.healthy = false;
      this.failedNodes.add(url);
      console.warn(` RPC node marked as failed: ${url} (fail count: ${providerData.failCount})`);
    }
  }

  async checkHealth() {
    if (this.isCheckingHealth) {
      return this.getStats().map(stat => ({
        url: stat.url,
        healthy: stat.healthy,
        blockNumber: null
      }));
    }

    this.isCheckingHealth = true;

    try {
      const checks = Array.from(this.providers.entries()).map(async ([url, data]) => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          );

          const blockNumberPromise = data.provider.getBlockNumber();
          const blockNumber = await Promise.race([blockNumberPromise, timeoutPromise]);

          if (this.failedNodes.has(url)) {
            this.failedNodes.delete(url);
            console.log(` RPC node recovered: ${url}`);
          }

          data.healthy = true;
          data.failCount = 0;
          data.lastCheck = Date.now();

          return { url, healthy: true, blockNumber };
        } catch (error) {
          data.healthy = false;
          data.lastCheck = Date.now();

          if (!error.message.includes('failed to detect network') &&
            !error.message.includes('Health check timeout')) {
            this.failedNodes.add(url);
          }

          return { url, healthy: false, error: error.message };
        }
      });

      return await Promise.all(checks);
    } finally {
      this.isCheckingHealth = false;
    }
  }

  startHealthChecks() {
    setTimeout(() => {
      this.checkHealth().catch(err =>
        console.error('Initial health check error:', err.message)
      );
    }, 3000);

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('Health check interval error:', error.message);
      }
    }, 30000);
  }

  getStats() {
    const stats = [];
    this.providers.forEach((data, url) => {
      stats.push({
        url,
        healthy: data.healthy,
        failCount: data.failCount,
        requestCount: data.requestCount,
        lastCheck: new Date(data.lastCheck).toISOString()
      });
    });
    return stats;
  }

  resetStats() {
    this.providers.forEach((data) => {
      data.requestCount = 0;
      data.failCount = 0;
    });
    console.log('✓ Stats reset');
  }

  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('✓ RPC Load Balancer stopped');
    }
  }
}

module.exports = RPCLoadBalancer;