const { ethers } = require('ethers');

/**
 * SignerManager handles caching of Wallet instances.
 * Using a shared Wallet instance for the same private key allows ethers
 * to manage nonces internally, reducing RPC calls and preventing collisions.
 */
class SignerManager {
  constructor() {
    this.signers = new Map();
  }

  /**
   * Get or create a shared signer for a private key and provider.
   * @param {string} privateKey 
   * @param {ethers.Provider} provider 
   * @returns {ethers.Wallet}
   */
  getSigner(privateKey, provider) {
    const key = `${privateKey}_${provider._network.chainId}`;
    
    if (!this.signers.has(key)) {
      console.log(`[SignerManager] 🔑 Creating shared signer for account: ${new ethers.Wallet(privateKey).address}`);
      this.signers.set(key, new ethers.Wallet(privateKey, provider));
    }

    const signer = this.signers.get(key);
    
    // If the provider has changed (e.g., failover), we need to update the signer
    if (signer.provider !== provider) {
      // .connect() in ethers v6 returns a NEW instance but linked to the same signing logic
      const newSigner = signer.connect(provider);
      this.signers.set(key, newSigner);
      return newSigner;
    }

    return signer;
  }
}

const globalSignerManager = new SignerManager();

module.exports = globalSignerManager;
