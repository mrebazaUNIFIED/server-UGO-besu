const { ethers } = require('ethers');

/**
 * SignerManager handles caching of Wallet instances.
 * Using a NonceManager wrapper allows ethers to manage nonces internally,
 * drastically reducing RPC calls and preventing collisions without manual queues.
 */
class SignerManager {
  constructor() {
    this.signers = new Map();
  }

  /**
   * Get or create a shared signer for a private key and provider.
   * @param {string} privateKey 
   * @param {ethers.Provider} provider 
   * @returns {ethers.NonceManager}
   */
  getSigner(privateKey, provider) {
    const key = `${privateKey}_${provider._network.chainId}`;
    
    if (!this.signers.has(key)) {
      const address = new ethers.Wallet(privateKey).address;
      console.log(`[SignerManager] 🔑 Creating shared NonceManager for account: ${address}`);
      const wallet = new ethers.Wallet(privateKey, provider);
      this.signers.set(key, new ethers.NonceManager(wallet));
    }

    let signer = this.signers.get(key);
    
    // If the provider has changed (e.g., failover), we need to update the underlying signer
    // In NonceManager, the inner signer is accessible via 'signer' property.
    if (signer.signer.provider !== provider) {
      console.log(`[SignerManager] 🔄 Provider changed, updating underlying wallet provider`);
      const newWallet = signer.signer.connect(provider);
      // Create new NonceManager but we should ideally preserve the nonce. 
      // ethers v6 NonceManager syncs it on the first call to getNonce() anyway.
      signer = new ethers.NonceManager(newWallet);
      this.signers.set(key, signer);
    }

    return signer;
  }
}

const globalSignerManager = new SignerManager();

module.exports = globalSignerManager;
