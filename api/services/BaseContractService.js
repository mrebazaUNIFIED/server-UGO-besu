const { ethers } = require('ethers');
const { readLoadBalancer, getWriteProvider, globalTxQueue, CONTRACTS, ABIs } = require('../config/blockchain');
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
    const contract = new ethers.Contract(this.contractAddress, this.abi, wallet);

    // Proxy para encolar TODAS las llamadas de escritura a este contrato
    // Esto previene colisiones de nonce cuando hay múltiples peticiones concurrentes
    return new Proxy(contract, {
      get: (target, prop) => {
        const value = target[prop];
        if (typeof value === 'function' && typeof prop === 'string') {
          // No encolamos propiedades internas de ethers ni métodos de solo lectura conocidos
          if (prop.startsWith('_') || ['getAddress', 'interface', 'runner', 'attach', 'connect'].includes(prop)) {
            return value.bind(target);
          }

          // Encolamos la ejecución del método
          return (...args) => {
            return globalTxQueue.enqueue(
              () => value.apply(target, args),
              `${this.domain}.${prop}`
            );
          };
        }
        return value;
      }
    });
  }

  getContractReadOnly() {
    const provider = readLoadBalancer.getProvider();
    return new ethers.Contract(this.contractAddress, this.abi, provider);
  }
}

module.exports = BaseContractService;