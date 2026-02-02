const { ethers } = require('ethers');

class RPCFailover {
  constructor(rpcUrls, chainId = 12345) {
    this.rpcUrls = rpcUrls.filter(url => url);
    this.chainId = chainId;
    this.providers = new Map();
    this.activeIndex = 0;

    if (this.rpcUrls.length === 0) throw new Error('No RPC URLs provided for Failover');

    this.initProviders();
    console.log(`🛡️ RPC Failover initialized. Primary Write Node: ${this.rpcUrls[0]}`);
  }

  initProviders() {
    this.rpcUrls.forEach((url, index) => {
      try {
        const network = ethers.Network.from(this.chainId);
        const provider = new ethers.JsonRpcProvider(url, network, {
          staticNetwork: network,
          pollingInterval: 500
        });

        this.providers.set(url, {
          provider,
          url,
          healthy: true,
          requestCount: 0,
          failCount: 0
        });
      } catch (error) {
        console.error(`✗ Failed to init failover provider ${url}:`, error.message);
      }
    });
  }

  // Getter para que server.js no falle al consultar el status
  get activeNodeUrl() {
    return this.rpcUrls[this.activeIndex];
  }

  getProvider() {
    let nodeData = this.providers.get(this.activeNodeUrl);

    // Si el nodo actual no es saludable, intentamos rotar hasta encontrar uno que sí
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
    
    // Si nada funciona, devolvemos el primero por desesperación y reseteamos
    console.error("🚨 CRITICAL: All Write Nodes failed. Emergency reset.");
    this.rpcUrls.forEach(url => this.providers.get(url).healthy = true);
    return this.providers.get(this.rpcUrls[0]).provider;
  }

  rotateNode() {
    const oldUrl = this.activeNodeUrl;
    this.activeIndex = (this.activeIndex + 1) % this.rpcUrls.length;
    const newUrl = this.activeNodeUrl;
    
    console.warn(`⚠️ FAILOVER: Switching Write Node from ${oldUrl} to ${newUrl}`);
    
    // Al rotar, el nuevo nodo merece una oportunidad
    const data = this.providers.get(newUrl);
    if (data) data.healthy = true;
  }

  reportError(url) {
    const data = this.providers.get(url);
    if (data) {
      data.healthy = false;
      data.failCount++;
      console.error(`🚫 Write Node Error: ${url} (Total fails: ${data.failCount})`);
      
      // Si el error es en el nodo activo, forzamos rotación inmediata
      if (url === this.activeNodeUrl) {
        this.rotateNode();
      }
    }
  }

  // Para las estadísticas del servidor
  getStats() {
    return Array.from(this.providers.values()).map(data => ({
      url: data.url,
      healthy: data.healthy,
      requestCount: data.requestCount,
      failCount: data.failCount,
      isActive: data.url === this.activeNodeUrl
    }));
  }

  stop() {
    // Implementado para mantener paridad con LoadBalancer
    console.log('✓ RPC Failover stopped');
  }
}

module.exports = RPCFailover;