const { ethers } = require('ethers');
const UserRegistryService = require('./UserRegistryService');
require('dotenv').config();

const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const AVALANCHE_USFCI_ADDRESS = process.env.AVALANCHE_USFCI_ADDRESS;

// ABI mínimo necesario: mintTokens, bridgeToBesu y eventos clave
const USFCI_AVALANCHE_ABI = [
  // Mint (requiere MINTER_ROLE en el contrato Avalanche)
  'function mintTokens(address recipient, uint256 amount, string calldata reserveProof) external returns (bool)',
  // Bridge de regreso a Besu (el usuario quema en Avalanche → relayer mintea en Besu)
  'function bridgeToBesu(address targetBesu, uint256 amount) external',
  // Vistas
  'function balanceOf(address account) external view returns (uint256)',
  'function availableBalance(address wallet) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function getStatistics() external view returns (uint256 totalMints, uint256 totalBurns, uint256 currentSupply)',
  'function getAllMintRecords() external view returns (tuple(address recipient, uint256 amount, string reserveProof, uint256 timestamp, address minter)[])',
  'function getAllTransferRecords() external view returns (tuple(address sender, address recipient, uint256 amount, uint256 timestamp)[])',
  'function getTransferHistory(address wallet) external view returns (tuple(address sender, address recipient, uint256 amount, uint256 timestamp)[])',
  'function frozenBalance(address wallet) external view returns (uint256)',
  // Transfer standard ERC20
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  // Eventos
  'event TokensMinted(address indexed recipient, uint256 amount, string reserveProof, uint256 timestamp)',
  'event TokensBridgedToBesu(address indexed sender, address indexed targetBesu, uint256 amount, uint256 timestamp)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class USFCIAvalancheService {
  constructor() {
    if (!AVALANCHE_USFCI_ADDRESS) {
      console.warn('⚠️  AVALANCHE_USFCI_ADDRESS no está configurado en .env');
    }
    this.readProvider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL);
    this.blockCache = new Map();
    this.userCache = new Map(); // Cache para nombres de usuarios
  }

  /**
   * Obtener contrato con signer (para escritura)
   */
  _getContract(privateKey) {
    const wallet = new ethers.Wallet(privateKey, this.readProvider);
    return new ethers.Contract(AVALANCHE_USFCI_ADDRESS, USFCI_AVALANCHE_ABI, wallet);
  }

  /**
   * Obtener contrato de solo lectura
   */
  _getReadContract() {
    return new ethers.Contract(AVALANCHE_USFCI_ADDRESS, USFCI_AVALANCHE_ABI, this.readProvider);
  }

  // ============================================================
  // ESCRITURA
  // ============================================================

  async mintTokens(privateKey, recipient, amount, reserveProof) {
    try {
      const contract = this._getContract(privateKey);
      
      // Intentar estimar gas para mayor precisión, con fallback de 500k
      let gasLimit;
      try {
        gasLimit = await contract.mintTokens.estimateGas(recipient, amount, reserveProof);
        // Agregar un margen del 30% por seguridad (storage expansion)
        gasLimit = (gasLimit * 130n) / 100n;
      } catch (e) {
        console.warn('⚠️ No se pudo estimar gas, usando fallback de 500,000');
        gasLimit = 500000n;
      }

      const tx = await contract.mintTokens(recipient, amount, reserveProof, {
        gasLimit: gasLimit
      });

      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        network: 'avalanche-fuji',
        recipient,
        amount: amount.toString(),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Error in mintTokens (Avalanche):', error);
      throw error;
    }
  }

  async bridgeToBesu(privateKey, targetBesu, amount) {
    try {
      const contract = this._getContract(privateKey);
      
      let gasLimit;
      try {
        gasLimit = await contract.bridgeToBesu.estimateGas(targetBesu, amount);
        gasLimit = (gasLimit * 130n) / 100n;
      } catch (e) {
        gasLimit = 400000n;
      }

      const tx = await contract.bridgeToBesu(targetBesu, amount, {
        gasLimit: gasLimit
      });

      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        network: 'avalanche-fuji',
        targetBesu,
        amount: amount.toString(),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Error in bridgeToBesu (Avalanche):', error);
      throw error;
    }
  }

  async transfer(privateKey, recipient, amount) {
    try {
      const contract = this._getContract(privateKey);
      
      let gasLimit;
      try {
        gasLimit = await contract.transfer.estimateGas(recipient, amount);
        gasLimit = (gasLimit * 120n) / 100n; // Margen menor para transferencias
      } catch (e) {
        gasLimit = 150000n;
      }

      const tx = await contract.transfer(recipient, amount, {
        gasLimit: gasLimit
      });

      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        network: 'avalanche-fuji',
        recipient,
        amount: amount.toString(),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Error in transfer (Avalanche):', error);
      throw error;
    }
  }

  // ============================================================
  // LECTURA
  // ============================================================

  async getBalance(walletAddress) {
    try {
      const contract = this._getReadContract();
      const balance = await contract.balanceOf(walletAddress);
      return balance.toString();
    } catch (e) { return "0"; }
  }

  async getAvailableBalance(walletAddress) {
    try {
      const contract = this._getReadContract();
      const available = await contract.availableBalance(walletAddress);
      return available.toString();
    } catch (e) { return "0"; }
  }

  async getTotalSupply() {
    try {
      const contract = this._getReadContract();
      const supply = await contract.totalSupply();
      return supply.toString();
    } catch (e) { return "0"; }
  }

  async getStatistics() {
    try {
      const contract = this._getReadContract();
      const stats = await contract.getStatistics();
      return {
        totalMints: stats.totalMints.toString(),
        totalBurns: stats.totalBurns.toString(),
        currentSupply: stats.currentSupply.toString()
      };
    } catch (e) {
      return { totalMints: "0", totalBurns: "0", currentSupply: "0" };
    }
  }

  async getAllMintRecords() {
    try {
      const contract = this._getReadContract();
      const records = await contract.getAllMintRecords();
      return records.map(r => ({
        recipient: r.recipient,
        amount: r.amount.toString(),
        reserveProof: r.reserveProof,
        timestamp: new Date(Number(r.timestamp) * 1000),
        minter: r.minter
      }));
    } catch (e) { return []; }
  }

  async getAllBurnRecords() {
    try {
      const contract = this._getReadContract();
      const records = await contract.getAllBurnRecords();
      return records.map(r => ({
        wallet: r.wallet,
        amount: r.amount.toString(),
        reason: r.reason,
        timestamp: new Date(Number(r.timestamp) * 1000)
      }));
    } catch (e) { return []; }
  }

  async getAllTransferRecords() {
    try {
      const contract = this._getReadContract();
      const records = await contract.getAllTransferRecords();
      
      // Enriquecer con nombres/organizaciones desde Besu UserRegistry
      return await Promise.all(records.map(async (r) => {
        const senderInfo = await this._resolveUserInfo(r.sender);
        const recipientInfo = await this._resolveUserInfo(r.recipient);

        return {
          senderAddress: r.sender,
          senderName: senderInfo.name,
          senderMspId: senderInfo.organization, // Sincronizado con nombres de Besu
          recipientAddress: r.recipient,
          recipientName: recipientInfo.name,
          recipientMspId: recipientInfo.organization,
          amount: r.amount.toString(),
          timestamp: new Date(Number(r.timestamp) * 1000),
          network: 'avalanche-fuji',
          txHash: 'view-sync'
        };
      }));
    } catch (e) {
      console.error('Error fetching Avalanche transfers:', e.message);
      return [];
    }
  }

  /**
   * Historial unificado para Avalanche (Sincronizado con patrón Besu)
   */
  async getWalletCompleteHistory(walletAddress) {
    try {
      const [mints, burns, transactions] = await Promise.all([
        this.getMintHistory(walletAddress),
        this.getBurnHistory(walletAddress),
        this.getTransactionHistory(walletAddress)
      ]);

      return {
        mints,
        burns,
        transactions,
        summary: {
          totalMints: mints.length,
          totalBurns: burns.length,
          totalTransactions: transactions.length
        }
      };
    } catch (e) {
      console.error('Error in getWalletCompleteHistory (Avalanche):', e.message);
      return { mints: [], burns: [], transactions: [], summary: { totalMints: 0, totalBurns: 0, totalTransactions: 0 } };
    }
  }

  /**
   * Obtener historial por wallet (Sincronizado con nuevo contrato)
   */
  async getTransactionHistory(walletAddress) {
    try {
      const contract = this._getReadContract();
      const records = await contract.getTransferHistory(walletAddress);
      
      return await Promise.all(records.map(async (r) => {
        const senderInfo = await this._resolveUserInfo(r.sender);
        const recipientInfo = await this._resolveUserInfo(r.recipient);

        return {
          senderAddress: r.sender,
          senderName: senderInfo.name,
          senderMspId: senderInfo.organization,
          recipientAddress: r.recipient,
          recipientName: recipientInfo.name,
          recipientMspId: recipientInfo.organization,
          amount: r.amount.toString(),
          timestamp: new Date(Number(r.timestamp) * 1000),
          network: 'avalanche-fuji',
          type: r.sender.toLowerCase() === walletAddress.toLowerCase() ? 'sent' : 'received'
        };
      }));
    } catch (e) {
      console.warn('⚠️ getTransactionHistory fallback:', e.message);
      return [];
    }
  }

  /**
   * Obtener historial de minteo de una wallet específica
   */
  async getMintHistory(walletAddress) {
    try {
      const contract = this._getReadContract();
      const records = await contract.getMintHistory(walletAddress);
      return records.map(r => ({
        recipient: r.recipient,
        amount: r.amount.toString(),
        reserveProof: r.reserveProof,
        timestamp: new Date(Number(r.timestamp) * 1000),
        minter: r.minter,
        network: 'avalanche-fuji'
      }));
    } catch (e) { return []; }
  }

  /**
   * Obtener historial de quemado de una wallet específica
   */
  async getBurnHistory(walletAddress) {
    try {
      const contract = this._getReadContract();
      const records = await contract.getBurnHistory(walletAddress);
      return records.map(r => ({
        wallet: r.wallet,
        amount: r.amount.toString(),
        reason: r.reason,
        timestamp: new Date(Number(r.timestamp) * 1000),
        network: 'avalanche-fuji'
      }));
    } catch (e) { return []; }
  }

  /**
   * Helper para resolver nombres de usuario (con caché)
   */
  async _resolveUserInfo(address) {
    if (this.userCache.has(address)) return this.userCache.get(address);

    try {
      // Consultamos al UserRegistryService (que lee de Besu)
      const user = await UserRegistryService.getUser(address);
      const info = user ? { name: user.name, organization: user.organization } : { name: 'External Wallet', organization: 'Unknown' };
      this.userCache.set(address, info);
      return info;
    } catch (e) {
      return { name: 'Unknown', organization: 'Unknown' };
    }
  }
}

module.exports = new USFCIAvalancheService();
