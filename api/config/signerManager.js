const { ethers } = require('ethers');

class SignerManager {
  constructor() {
    this.signers = new Map();
  }

  getSigner(privateKey, provider) {
    const key = `${privateKey}_${provider._network.chainId}`;

    if (!this.signers.has(key)) {
      const address = new ethers.Wallet(privateKey).address;
      console.log(`[SignerManager] 🔑 Creating shared NonceManager for account: ${address}`);
      const wallet = new ethers.Wallet(privateKey, provider);
      this.signers.set(key, new ethers.NonceManager(wallet));
    }

    let signer = this.signers.get(key);

    if (signer.signer.provider !== provider) {
      console.log(`[SignerManager] 🔄 Provider changed, preserving nonce...`);
      let currentNonce = null;
      try {
        // Leer el nonce en memoria antes de recrear el NonceManager
        // getNonce() sin argumento devuelve el nonce interno cacheado, sin llamar al RPC
        currentNonce = signer._nextNonce ?? null;
      } catch (_) { }

      const newWallet = signer.signer.connect(provider);
      signer = new ethers.NonceManager(newWallet);

      if (currentNonce !== null) {
        signer.setNonce(currentNonce);
        console.log(`[SignerManager] ✅ Nonce preserved at ${currentNonce}`);
      }

      this.signers.set(key, signer);
    }

    return signer;
  }
}

const globalSignerManager = new SignerManager();
module.exports = globalSignerManager;