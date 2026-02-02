const { ethers } = require('ethers');
const { readLoadBalancer, writeLoadBalancer, CONTRACTS, ABIs } = require('../config/blockchain');
const fs = require('fs');
const path = require('path');

class UserRegistryService {
  constructor() {
    this.contractAddress = CONTRACTS.UserRegistry;
    this.abi = ABIs.UserRegistry;
  }

  // ✅ ESCRITURA: Usa el nodo fijo (Failover) para mantener el Nonce sincronizado
  getContract(privateKey) {
    const provider = writeLoadBalancer.getProvider();
    
    // Si el provider emite un error de red, lo reportamos para rotar el nodo
    provider.on("error", (error) => {
      console.warn(`⚠️ Error detectado en el nodo de escritura: ${provider.connection.url}`);
      writeLoadBalancer.reportError(provider.connection.url);
    });

    const wallet = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(this.contractAddress, this.abi, wallet);
  }

  // ✅ LECTURA: Usa el balanceador Round Robin para repartir la carga
  getContractReadOnly() {
    const provider = readLoadBalancer.getProvider();
    return new ethers.Contract(this.contractAddress, this.abi, provider);
  }

  async registerUser(funderPrivateKey, userData) {
    let wallet;
    let generated = false;

    if (!userData.walletAddress) {
      wallet = ethers.Wallet.createRandom();
      generated = true;
      userData.walletAddress = wallet.address;
      console.log(`Wallet generada: ${wallet.address}`);
    }

    try {
      // 1. Financiar si es necesario
      if (userData.initialBalance && funderPrivateKey) {
        const provider = writeLoadBalancer.getProvider();
        const funderWallet = new ethers.Wallet(funderPrivateKey, provider);
        
        console.log(`Financiando ${userData.walletAddress} con ${userData.initialBalance} ETH...`);
        const fundTx = await funderWallet.sendTransaction({
          to: userData.walletAddress,
          value: ethers.parseEther(userData.initialBalance.toString()),
          gasLimit: 21000 // Gas estándar para transferencia simple
        });
        await fundTx.wait();
        console.log(`✓ Financiado con ${userData.initialBalance} ETH`);
      }

      // 2. Registrar en contrato
      const contract = this.getContract(funderPrivateKey || process.env.OWNER_PRIVATE_KEY);
      
      console.log('Enviando registro a la Blockchain...');
      const tx = await contract.registerUser(
        userData.walletAddress,
        userData.userId,
        userData.name,
        userData.organization,
        userData.role,
        { gasLimit: 500000 } // Colchón de gas para evitar fallos de estimación en Besu
      );
      
      console.log(`Transacción enviada: ${tx.hash}, esperando confirmación rápida...`);
      const receipt = await tx.wait();
      console.log(`✓ Usuario registrado en bloque ${receipt.blockNumber}`);

      // 3. Parsear evento
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed && parsed.name === 'UserRegistered';
        } catch (e) { return false; }
      });

      // 4. Guardar datos locales (Dev)
      if (generated) {
        this._saveUserLocally(userData, wallet);
      }

      return {
        success: true,
        walletAddress: userData.walletAddress,
        userId: userData.userId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        event: event ? contract.interface.parseLog(event).args : null,
        generatedWallet: generated,
        privateKey: generated ? wallet.privateKey : undefined
      };

    } catch (error) {
      console.error('❌ Error en registerUser:', error.message);
      // Forzamos rotación de nodo si hubo un error de conexión
      if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
        writeLoadBalancer.rotateNode();
      }
      throw error;
    }
  }

  // Métodos de actualización (Update, Deactivate, etc.) optimizados
  async updateUser(privateKey, walletAddress, updateData) {
    try {
      const contract = this.getContract(privateKey);
      const tx = await contract.updateUser(walletAddress, updateData.name, updateData.role, { gasLimit: 300000 });
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deactivateUser(privateKey, walletAddress) {
    const contract = this.getContract(privateKey);
    const tx = await contract.deactivateUser(walletAddress, { gasLimit: 200000 });
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  async reactivateUser(privateKey, walletAddress) {
    const contract = this.getContract(privateKey);
    const tx = await contract.reactivateUser(walletAddress, { gasLimit: 200000 });
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  // --- MÉTODOS DE LECTURA (Sin cambios, ya usan ReadLoadBalancer) ---
  
  async getUser(walletAddress) {
    const user = await this.getContractReadOnly().getUser(walletAddress);
    return this._mapUser(user);
  }

  async getUserByUserId(userId) {
    const user = await this.getContractReadOnly().getUserByUserId(userId);
    return this._mapUser(user);
  }

  async getUsersByOrganization(organization, start = 0, limit = 10) {
    const users = await this.getContractReadOnly().getUsersByOrganization(organization, start, limit);
    return users.map(u => this._mapUser(u));
  }

  // Helpers internos
  _mapUser(user) {
    return {
      userId: user.userId,
      name: user.name,
      organization: user.organization,
      role: user.role,
      walletAddress: user.walletAddress,
      registeredAt: new Date(Number(user.registeredAt) * 1000),
      isActive: user.isActive
    };
  }

  _saveUserLocally(userData, wallet) {
    const userDataDir = path.join(__dirname, '..', '..', 'user-data');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
    const usersFile = path.join(userDataDir, 'users.json');
    let users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : {};
    users[userData.userId] = { ...userData, privateKey: wallet.privateKey, mnemonic: wallet.mnemonic.phrase };
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  }
}

module.exports = new UserRegistryService();