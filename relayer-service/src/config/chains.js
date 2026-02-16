import dotenv from 'dotenv';
dotenv.config();

export const BESU_CONFIG = {
  rpcUrl: process.env.BESU_RPC_URL,
  wsUrl: process.env.BESU_WS_URL,
  chainId: parseInt(process.env.BESU_CHAIN_ID),
  name: 'Besu Private Network'
};

export const AVALANCHE_CONFIG = {
  rpcUrl: process.env.AVALANCHE_RPC_URL,
  wsUrl: process.env.AVALANCHE_WS_URL,
  chainId: parseInt(process.env.AVALANCHE_CHAIN_ID),
  name: 'Avalanche Fuji Testnet'
};

export const RELAYER_CONFIG = {
  privateKey: process.env.RELAYER_PRIVATE_KEY,
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY_MS || '5000'),
  processInterval: parseInt(process.env.PROCESS_INTERVAL_MS || '10000')
};

export const API_CONFIG = {
  port: parseInt(process.env.API_PORT || '8070'),
  enabled: process.env.API_ENABLED === 'true'
};