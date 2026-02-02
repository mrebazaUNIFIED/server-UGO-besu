const { ethers } = require('ethers');
const RPCLoadBalancer = require('./rpcLoadBalancer');
const RPCFailover = require('./rpcFailover'); // Asegúrate de haber creado este archivo
require('dotenv').config();

// 1. Nodos RPC (Para Lectura y Escritura Recomendada)
const RPC_URLS = [
  process.env.RPC_NODE_1, // Node-FCI-RPC1 (8547)
  process.env.RPC_NODE_2, // Node-FCI-RPC2 (8549)
  process.env.RPC_NODE_3  // Node-Sunwest-RPC (8551)
].filter(url => url);


const WRITE_RPC_URLS = [
  process.env.VALIDATOR_NODE_1,
  process.env.VALIDATOR_NODE_2,
  process.env.VALIDATOR_NODE_3,
  process.env.VALIDATOR_NODE_4
].filter(url => url);


const chainId = parseInt(process.env.CHAIN_ID) || 12345;

// 2. Inicializar los manejadores
// Lectura: Reparte consultas entre los 3 RPCs
const readLoadBalancer = new RPCLoadBalancer(RPC_URLS, chainId);

// Escritura: Se queda fijo en un nodo para no romper los Nonces
const writeLoadBalancer = new RPCFailover(WRITE_RPC_URLS, chainId);

// 3. Direcciones de todos tus contratos (Según tu tree)
const CONTRACTS = {
  UserRegistry: process.env.USER_REGISTRY_ADDRESS,
  USFCI: process.env.USFCI_ADDRESS,
  LoanRegistry: process.env.LOAN_REGISTRY_ADDRESS,
  ShareLoans: process.env.SHARE_LOANS_ADDRESS,
  Portfolio: process.env.PORTFOLIO_ADDRESS,
  FCICorporate: process.env.FCI_CORPORATE_ADDRESS,
  MarketplaceBridge: process.env.MARKETPLACE_BRIDGE_ADDRESS,
};

// 4. ABIs (Carga segura)
const getAbi = (name) => {
  try {
    const json = require(`../contracts/${name}.json`);
    return json.abi || json;
  } catch (e) {
    console.warn(`⚠️ No se pudo cargar el ABI: ${name}`);
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
  writeLoadBalancer,
  CONTRACTS,
  ABIs
};