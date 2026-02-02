const { ethers } = require('ethers');
const { readLoadBalancer, writeLoadBalancer, CONTRACTS, ABIs } = require('../config/blockchain');

class BaseContractService {
  constructor(contractKey, abiKey) {
    this.contractAddress = CONTRACTS[contractKey];
    this.abi = ABIs[abiKey];
  }

  // ✅ Para ESCRITURA: Usa el nodo fijo (Sticky/Failover)
  getContract(privateKey) {
    const provider = writeLoadBalancer.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(this.contractAddress, this.abi, wallet);
  }

  // ✅ Para LECTURA: Usa el balanceador de carga (Round Robin)
  getContractReadOnly() {
    const provider = readLoadBalancer.getProvider();
    return new ethers.Contract(this.contractAddress, this.abi, provider);
  }
}

module.exports = BaseContractService;