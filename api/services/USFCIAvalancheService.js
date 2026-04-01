const { ethers } = require('ethers');
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
  'function getAllBurnRecords() external view returns (tuple(address wallet, uint256 amount, string reason, uint256 timestamp)[])',
  'function getAllTransferRecords() external view returns (tuple(address sender, address recipient, uint256 amount, uint256 timestamp)[])',
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
    const contract = this._getContract(privateKey);
    const tx = await contract.mintTokens(recipient, amount, reserveProof, {
      gasLimit: 200000
    });
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: receipt.hash,
      network: 'avalanche-fuji',
      recipient,
      amount: amount.toString()
    };
  }

  async bridgeToBesu(privateKey, targetBesu, amount) {
    const contract = this._getContract(privateKey);
    const tx = await contract.bridgeToBesu(targetBesu, amount, {
      gasLimit: 200000
    });
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: receipt.hash,
      network: 'avalanche-fuji',
      targetBesu,
      amount: amount.toString()
    };
  }

  async transfer(privateKey, recipient, amount) {
    const contract = this._getContract(privateKey);
    const tx = await contract.transfer(recipient, amount, {
      gasLimit: 200000
    });
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: receipt.hash,
      network: 'avalanche-fuji',
      recipient,
      amount: amount.toString()
    };
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
    const contract = this._getReadContract();
    
    // Intento 1: Función de vista getAllTransferRecords (Patrón Besu)
    try {
      const records = await contract.getAllTransferRecords();
      if (records && records.length > 0) {
        return records.map(r => ({
          senderAddress: r.sender,
          recipientAddress: r.recipient,
          amount: r.amount.toString(),
          timestamp: new Date(Number(r.timestamp) * 1000),
          network: 'avalanche-fuji',
          txHash: 'view-sync'
        }));
      }
    } catch (e) {
      // No existe la función de vista, procedemos con eventos
    }

    // Intento 2: Eventos ERC20 Standard con limitación de rango
    try {
      const filter = contract.filters.Transfer();
      // Fuji a veces falla si el bloque inicial es 0. Intentamos los últimos 5000 bloques.
      const latestBlock = await this.readProvider.getBlockNumber();
      const startBlock = Math.max(0, latestBlock - 5000); 
      
      const events = await contract.queryFilter(filter, startBlock, 'latest');

      return Promise.all(events.map(async (event) => {
        let timestamp;
        if (this.blockCache.has(event.blockNumber)) {
          timestamp = this.blockCache.get(event.blockNumber);
        } else {
          try {
            const block = await this.readProvider.getBlock(event.blockNumber);
            timestamp = block.timestamp;
            this.blockCache.set(event.blockNumber, timestamp);
          } catch (be) {
            timestamp = Math.floor(Date.now() / 1000); // Fallback to now
          }
        }

        return {
          senderAddress: event.args[0],
          recipientAddress: event.args[1],
          amount: event.args[2].toString(),
          timestamp: new Date(timestamp * 1000),
          network: 'avalanche-fuji',
          txHash: event.transactionHash
        };
      }));
    } catch (error) {
      console.error('Error fetching Avalanche transfers:', error);
      return []; // Devolver vacío en lugar de 500
    }
  }
}

module.exports = new USFCIAvalancheService();
