import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper para cargar ABIs
 * Maneja tanto formato Hardhat (con propiedad 'abi') como arrays directos
 */
const loadABI = (filename) => {
  try {
    const path = join(__dirname, '..', '..', 'abis', filename);
    const content = readFileSync(path, 'utf8');
    const parsed = JSON.parse(content);
    
    // Si es formato Hardhat/Truffle (tiene propiedad 'abi')
    if (parsed.abi && Array.isArray(parsed.abi)) {
      return parsed.abi;
    }
    
    // Si es un array directo
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    throw new Error(`Invalid ABI format in ${filename}`);
  } catch (error) {
    console.error(`❌ Error loading ABI ${filename}:`, error.message);
    throw error;
  }
};

// Besu Contracts
export const BESU_CONTRACTS = {
  marketplaceBridge: {
    address: process.env.BESU_MARKETPLACE_BRIDGE,
    abi: loadABI('MarketplaceBridge.json')
  },
  loanRegistry: {
    address: process.env.BESU_LOAN_REGISTRY,
    abi: loadABI('LoanRegistry.json')
  }
};

// Avalanche Contracts
export const AVALANCHE_CONTRACTS = {
  loanNFT: {
    address: process.env.AVALANCHE_LOAN_NFT,
    abi: loadABI('LoanNFT.json')
  },
  bridgeReceiver: {
    address: process.env.AVALANCHE_BRIDGE_RECEIVER,
    abi: loadABI('BridgeReceiver.json')
  },
  paymentDistributor: {
    address: process.env.AVALANCHE_PAYMENT_DISTRIBUTOR,
    abi: loadABI('PaymentDistributor.json')
  },
  marketplace: {
    address: process.env.AVALANCHE_MARKETPLACE,
    abi: loadABI('LoanMarketplace.json')
  }
};

// Validación de addresses al cargar el módulo
const validateConfig = () => {
  const requiredEnvVars = [
    'BESU_MARKETPLACE_BRIDGE',
    'BESU_LOAN_REGISTRY',
    'AVALANCHE_LOAN_NFT',
    'AVALANCHE_BRIDGE_RECEIVER',
    'AVALANCHE_PAYMENT_DISTRIBUTOR',
    'AVALANCHE_MARKETPLACE'
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing contract addresses in .env: ${missing.join(', ')}`);
  }
};

validateConfig();