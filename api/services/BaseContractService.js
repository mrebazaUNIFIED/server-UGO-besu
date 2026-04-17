const { ethers } = require('ethers');
const { readLoadBalancer, getWriteProvider, CONTRACTS, ABIs } = require('../config/blockchain');
const globalSignerManager = require('../config/signerManager');

class BaseContractService {
  constructor(contractKey, abiKey, domain = 'loans') {
    this.contractAddress = CONTRACTS[contractKey];
    this.abi = ABIs[abiKey];
    this.domain = domain;
  }

  getContract(privateKey) {
    const provider = getWriteProvider(this.domain);
    const wallet = globalSignerManager.getSigner(privateKey, provider);
    return new ethers.Contract(this.contractAddress, this.abi, wallet);
  }

  getContractReadOnly() {
    const provider = readLoadBalancer.getProvider();
    return new ethers.Contract(this.contractAddress, this.abi, provider);
  }
}

module.exports = BaseContractService;