// services/USFCIAvalancheService.js
// Servicio para interactuar con el contrato USFCI en Avalanche C-Chain (Fuji Testnet)
// Usado por Sunwest para mintear capital nuevo directamente en la red pública.

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
  'function frozenBalance(address wallet) external view returns (uint256)',
  // Eventos
  'event TokensMinted(address indexed recipient, uint256 amount, string reserveProof, uint256 timestamp)',
  'event TokensBridgedToBesu(address indexed sender, address indexed targetBesu, uint256 amount, uint256 timestamp)',
];

class USFCIAvalancheService {
  constructor() {
    if (!AVALANCHE_USFCI_ADDRESS) {
      console.warn('⚠️  AVALANCHE_USFCI_ADDRESS no está configurado en .env');
    }
    this.readProvider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL);
  }

  /**
   * Obtener contrato con signer (para escritura — requiere privateKey)
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
  // ESCRITURA — Requiere MINTER_ROLE en el contrato Avalanche
  // ============================================================

  /**
   * Mintear USFCI directamente en Avalanche.
   * Solo puede llamarlo una cuenta con MINTER_ROLE (ej: Sunwest).
   *
   * @param {string} privateKey    - PK de Sunwest (admin con MINTER_ROLE)
   * @param {string} recipient     - Wallet destino en Avalanche C-Chain
   * @param {string|BigInt} amount - Cantidad en wei (1 USFCI = 1e18)
   * @param {string} reserveProof  - Referencia bancaria (ej: "SUNWEST-REF-2026-001")
   */
  async mintTokens(privateKey, recipient, amount, reserveProof) {
    const contract = this._getContract(privateKey);
    const tx = await contract.mintTokens(recipient, amount, reserveProof, {
      gasLimit: 200000
    });
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      network: 'avalanche-fuji',
      recipient,
      amount: amount.toString()
    };
  }

  /**
   * Iniciar bridge desde Avalanche → Besu.
   * El usuario quema sus tokens en Avalanche y el Relayer mintea en Besu automáticamente.
   *
   * @param {string} privateKey  - PK del usuario que inicia el bridge
   * @param {string} targetBesu  - Dirección destino en la red Besu
   * @param {string|BigInt} amount
   */
  async bridgeToBesu(privateKey, targetBesu, amount) {
    const contract = this._getContract(privateKey);
    const tx = await contract.bridgeToBesu(targetBesu, amount, {
      gasLimit: 200000
    });
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      network: 'avalanche-fuji',
      targetBesu,
      amount: amount.toString(),
      message: 'Bridge iniciado. El Relayer procesará el mint en Besu automáticamente.'
    };
  }

  // ============================================================
  // LECTURA
  // ============================================================

  async getBalance(walletAddress) {
    const contract = this._getReadContract();
    const balance = await contract.balanceOf(walletAddress);
    return balance.toString();
  }

  async getAvailableBalance(walletAddress) {
    const contract = this._getReadContract();
    const available = await contract.availableBalance(walletAddress);
    return available.toString();
  }

  async getTotalSupply() {
    const contract = this._getReadContract();
    const supply = await contract.totalSupply();
    return supply.toString();
  }

  async getStatistics() {
    const contract = this._getReadContract();
    const stats = await contract.getStatistics();
    return {
      totalMints: stats.totalMints.toString(),
      totalBurns: stats.totalBurns.toString(),
      currentSupply: stats.currentSupply.toString()
    };
  }

  async getAllMintRecords() {
    const contract = this._getReadContract();
    const records = await contract.getAllMintRecords();
    return records.map(r => ({
      recipient: r.recipient,
      amount: r.amount.toString(),
      reserveProof: r.reserveProof,
      timestamp: new Date(Number(r.timestamp) * 1000),
      minter: r.minter
    }));
  }

  async getAllBurnRecords() {
    const contract = this._getReadContract();
    const records = await contract.getAllBurnRecords();
    return records.map(r => ({
      wallet: r.wallet,
      amount: r.amount.toString(),
      reason: r.reason,
      timestamp: new Date(Number(r.timestamp) * 1000)
    }));
  }
}

module.exports = new USFCIAvalancheService();
