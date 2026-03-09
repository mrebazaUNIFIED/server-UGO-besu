const { ethers } = require('ethers');
const RPCLoadBalancer = require('./rpcLoadBalancer');
const RPCFailover = require('./rpcFailover');
require('dotenv').config();

const chainId = parseInt(process.env.CHAIN_ID) || 12345;

// ─── LECTURA ──────────────────────────────────────────────────────────────────
const readLoadBalancer = new RPCLoadBalancer([
  process.env.RPC_NODE_1,
  process.env.RPC_NODE_2,
  process.env.RPC_NODE_3,
].filter(Boolean), chainId);

// ─── ESCRITURA POR DOMINIO ────────────────────────────────────────────────────
const writeNodes = {
  loans: new RPCFailover([
    process.env.VALIDATOR_LOANS,
    process.env.VALIDATOR_USERS,       // fallback
  ].filter(Boolean), chainId, 'loans'),

  users: new RPCFailover([
    process.env.VALIDATOR_USERS,
    process.env.VALIDATOR_LOANS,       // fallback
  ].filter(Boolean), chainId, 'users'),

  usfci: new RPCFailover([
    process.env.VALIDATOR_USFCI,
    process.env.VALIDATOR_MARKETPLACE, // fallback
  ].filter(Boolean), chainId, 'usfci'),

  marketplace: new RPCFailover([
    process.env.VALIDATOR_MARKETPLACE,
    process.env.VALIDATOR_USFCI,       // fallback
  ].filter(Boolean), chainId, 'marketplace'),
};

// Backward compat con server.js (usa writeLoadBalancer.getStats etc.)
const writeLoadBalancer = writeNodes.loans;

// Helper para obtener el provider correcto por dominio
const getWriteProvider = (domain) => {
  const node = writeNodes[domain] || writeNodes.loans;
  return node.getProvider();
};

// ─── CONTRATOS ────────────────────────────────────────────────────────────────
const CONTRACTS = {
  UserRegistry: process.env.USER_REGISTRY_ADDRESS,
  USFCI: process.env.USFCI_ADDRESS,
  LoanRegistry: process.env.LOAN_REGISTRY_ADDRESS,
  ShareLoans: process.env.SHARE_LOANS_ADDRESS,
  Portfolio: process.env.PORTFOLIO_ADDRESS,
  FCICorporate: process.env.FCI_CORPORATE_ADDRESS,
  MarketplaceBridge: process.env.MARKETPLACE_BRIDGE_ADDRESS,
};

const getAbi = (name) => {
  try {
    const json = require(`../contracts/${name}.json`);
    return json.abi || json;
  } catch (e) {
    console.warn(`⚠️ No ABI found for: ${name}`);
    return null;
  }
};

const ABIs = {
  UserRegistry: getAbi('UserRegistry'),
  USFCI: getAbi('USFCI'),
  LoanRegistry: getAbi('LoanRegistry'),
  ShareLoans: getAbi('ShareLoans'),
  Portfolio: getAbi('Portfolio'),
  MarketplaceBridge: getAbi('MarketplaceBridge'),
};

module.exports = {
  readLoadBalancer,
  writeLoadBalancer,  // backward compat
  writeNodes,
  getWriteProvider,
  CONTRACTS,
  ABIs,
};