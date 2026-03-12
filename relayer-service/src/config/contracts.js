import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadABI = (filename) => {
  try {
    const path = join(__dirname, '..', '..', 'abis', filename);
    const content = readFileSync(path, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed.abi && Array.isArray(parsed.abi)) return parsed.abi;
    if (Array.isArray(parsed)) return parsed;
    throw new Error(`Invalid ABI format in ${filename}`);
  } catch (error) {
    console.error(`❌ Error loading ABI ${filename}:`, error.message);
    throw error;
  }
};

// ── Besu Contracts ────────────────────────────────────────────────────────────
export const BESU_CONTRACTS = {
  marketplaceBridge: {
    address: process.env.BESU_MARKETPLACE_BRIDGE,       // sin _ADDRESS
    abi: loadABI('MarketplaceBridge.json')
  },
  loanRegistry: {
    address: process.env.BESU_LOAN_REGISTRY,            // sin _ADDRESS
    abi: loadABI('LoanRegistry.json')
  }
};

// ── Avalanche Contracts ───────────────────────────────────────────────────────
export const AVALANCHE_CONTRACTS = {
  usfci: {
    address: process.env.AVALANCHE_USFCI_ADDRESS,       // este sí tiene _ADDRESS
    abi: loadABI('USFCI_Avalanche.json')
  },
  loanNFT: {
    address: process.env.AVALANCHE_LOAN_NFT,            // sin _ADDRESS
    abi: loadABI('LoanNFT.json')
  },
  bridgeReceiver: {
    address: process.env.AVALANCHE_BRIDGE_RECEIVER,     // sin _ADDRESS
    abi: loadABI('BridgeReceiver.json')
  },
  paymentDistributor: {
    address: process.env.AVALANCHE_PAYMENT_DISTRIBUTOR, // sin _ADDRESS
    abi: loadABI('PaymentDistributor.json')
  },
  marketplace: {
    address: process.env.AVALANCHE_MARKETPLACE,         // sin _ADDRESS
    abi: loadABI('LoanMarketplace.json')
  }
};

// ── Validación al arrancar ────────────────────────────────────────────────────
const validateConfig = () => {
  const required = [
    'BESU_MARKETPLACE_BRIDGE',
    'BESU_LOAN_REGISTRY',
    'AVALANCHE_USFCI_ADDRESS',
    'AVALANCHE_LOAN_NFT',
    'AVALANCHE_BRIDGE_RECEIVER',
    'AVALANCHE_PAYMENT_DISTRIBUTOR',
    'AVALANCHE_MARKETPLACE'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing contract addresses in .env: ${missing.join(', ')}`);
  }
};

validateConfig();