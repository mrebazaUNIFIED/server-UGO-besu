const { ethers } = require('ethers');

class RPCFailover {
  constructor(rpcUrls, chainId = 12345, domain = 'default') {
    this.rpcUrls = rpcUrls.filter(url => url);
    this.chainId = chainId;
    this.domain = domain;
    this.providers = new Map();
    this.activeIndex = 0;

    if (this.rpcUrls.length === 0) throw new Error('No RPC URLs provided for Failover');

    this.initProviders();
    console.log(`🛡️ RPC Failover [${domain}] initialized. Primary: ${this.rpcUrls[0]}`);
  }

  initProviders() {
    this.rpcUrls.forEach((url) => {
      try {
        const network = ethers.Network.from(this.chainId);
        const provider = new ethers.JsonRpcProvider(url, network, {
          staticNetwork: network,
          pollingInterval: 500,
          // ✅ Timeout de 120 segundos — evita ECONNRESET en txs lentas
          timeout: 120000,
        });

        this.providers.set(url, {
          provider,
          url,
          healthy: true,
          requestCount: 0,
          failCount: 0,
          lastCheck: null,
        });
      } catch (error) {
        console.error(`✗ Failed to init failover provider ${url}:`, error.message);
      }
    });
  }

  get activeNodeUrl() {
    return this.rpcUrls[this.activeIndex];
  }

  getProvider() {
    let nodeData = this.providers.get(this.activeNodeUrl);

    let attempts = 0;
    while ((!nodeData || !nodeData.healthy) && attempts < this.rpcUrls.length) {
      this.rotateNode();
      nodeData = this.providers.get(this.activeNodeUrl);
      attempts++;
    }

    if (nodeData) {
      nodeData.requestCount++;
      return nodeData.provider;
    }

    console.error(`🚨 CRITICAL [${this.domain}]: All Write Nodes failed. Emergency reset.`);
    this.rpcUrls.forEach(url => {
      const d = this.providers.get(url);
      if (d) d.healthy = true;
    });
    return this.providers.get(this.rpcUrls[0]).provider;
  }

  rotateNode() {
    const oldUrl = this.activeNodeUrl;
    this.activeIndex = (this.activeIndex + 1) % this.rpcUrls.length;
    const newUrl = this.activeNodeUrl;
    console.warn(`⚠️ FAILOVER [${this.domain}]: ${oldUrl} → ${newUrl}`);
    const data = this.providers.get(newUrl);
    if (data) data.healthy = true;
  }

  reportError(url) {
    const data = this.providers.get(url);
    if (data) {
      data.healthy = false;
      data.failCount++;
      console.error(`🚫 Write Node Error [${this.domain}]: ${url} (fails: ${data.failCount})`);
      if (url === this.activeNodeUrl) this.rotateNode();
    }
  }

  // Health checks periódicos
  startHealthChecks() {
    setTimeout(() => {
      this.checkHealth();
      this.healthCheckInterval = setInterval(() => this.checkHealth(), 30000);
    }, 3000);
  }

  async checkHealth() {
    for (const [url, data] of this.providers.entries()) {
      try {
        await data.provider.getBlockNumber();
        data.healthy = true;
        data.lastCheck = new Date().toISOString();
      } catch (e) {
        data.healthy = false;
        data.lastCheck = new Date().toISOString();
        console.warn(`⚠️ Health check failed [${this.domain}]: ${url}`);
      }
    }
  }

  stop() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    console.log(`✓ RPC Failover [${this.domain}] stopped`);
  }

  getStats() {
    return Array.from(this.providers.values()).map(data => ({
      url: data.url,
      healthy: data.healthy,
      requestCount: data.requestCount,
      failCount: data.failCount,
      isActive: data.url === this.activeNodeUrl,
      lastCheck: data.lastCheck,
    }));
  }
}

module.exports = RPCFailover;