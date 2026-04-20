const { ethers } = require('ethers');
const { readLoadBalancer, getWriteProvider, CONTRACTS, ABIs } = require('../config/blockchain');
const globalSignerManager = require('../config/signerManager');
const usfciService = require('./USFCIService');
const supabase = require('../config/supabase');

class UserRegistryService {
  constructor() {
    this.contractAddress = CONTRACTS.UserRegistry;
    this.abi = ABIs.UserRegistry;
  }

  getContract() {
    const provider = getWriteProvider('users');
    const wallet = globalSignerManager.getSigner(process.env.PRIVATE_KEY, provider);
    return new ethers.Contract(this.contractAddress, this.abi, wallet);
  }

  getContractReadOnly() {
    const provider = readLoadBalancer.getProvider();
    return new ethers.Contract(this.contractAddress, this.abi, provider);
  }

  getUsfciAdminContract() {
    const provider = getWriteProvider('users');
    const adminWallet = globalSignerManager.getSigner(process.env.PRIVATE_KEY, provider);
    return new ethers.Contract(CONTRACTS.USFCI, ABIs.USFCI, adminWallet);
  }

  async registerUser(userData) {
    let wallet;
    let generated = false;

    if (!userData.walletAddress) {
      // Check Supabase first — reuse wallet if userId already exists (network reset scenario)
      const { data: existing } = await supabase
        .from('users')
        .select('address, encrypted_keystore')
        .eq('user_id', userData.userId)
        .maybeSingle();

      if (existing) {
        wallet = await ethers.Wallet.fromEncryptedJson(
          existing.encrypted_keystore,
          process.env.MASTER_KEYSTORE_PASSWORD
        );
        console.log(`♻️  Wallet reutilizada para ${userData.userId}: ${wallet.address}`);
      } else {
        wallet = ethers.Wallet.createRandom();
        console.log(`Wallet generada: ${wallet.address}`);
      }

      generated = true;
      userData.walletAddress = wallet.address;
    }

    try {
      const contract = this.getContract();

      const isRegistered = await this.userRegistered(userData.walletAddress);
      if (isRegistered) {
        console.log(`⚠️ La wallet ${userData.walletAddress} ya está registrada en UserRegistry. Intentando continuar con el resto del flujo...`);
      } else {
        if (userData.initialBalance && userData.initialBalance !== "0") {
          const provider = getWriteProvider('users');
          const funderWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
          console.log(`Financiando ${userData.walletAddress} con ${userData.initialBalance} ETH...`);
          const fundTx = await funderWallet.sendTransaction({
            to: userData.walletAddress,
            value: ethers.parseEther(userData.initialBalance.toString()),
            gasLimit: 21000
          });
          await fundTx.wait();
          console.log(`✓ Financiado con ${userData.initialBalance} ETH`);
        }

        console.log('Enviando registro a la Blockchain (UserRegistry)...');
        const tx = await contract.registerUser(
          userData.walletAddress,
          userData.userId,
          userData.name,
          userData.organization,
          userData.role,
          { gasLimit: 500000 }
        );
        const receipt = await tx.wait();
        console.log(`✓ Usuario registrado en bloque ${receipt.blockNumber}`);
      }

      if (generated) {
        console.log('Registrando wallet en USFCI...');
        try {
          await usfciService.registerWallet(
            wallet.privateKey,
            userData.organization,
            userData.userId,
            userData.role
          );
          console.log('✓ Wallet registrada en USFCI');
        } catch (e) {
          if (e.message.includes('Wallet already registered')) {
            console.log('⚠️ Wallet ya registrada en USFCI');
          } else { throw e; }
        }
      } else {
        console.log('⚠️ Wallet manual: omitiendo registerWallet en USFCI (se requiere firma del dueño).');
      }

      console.log('Aprobando KYC en USFCI...');
      try {
        await usfciService.updateComplianceStatus(
          process.env.PRIVATE_KEY,
          userData.walletAddress,
          'approved',
          'low'
        );
        console.log('✓ KYC aprobado');
      } catch (e) {
        console.warn('⚠️ No se pudo actualizar compliance status:', e.message);
      }

      await this._grantBlockchainRoles(userData.walletAddress, userData.role);

      if (generated) await this._saveUserToSupabase(userData, wallet);

      return {
        success: true,
        walletAddress: userData.walletAddress,
        userId: userData.userId,
        generatedWallet: generated,
        kycStatus: 'approved'
      };

    } catch (error) {
      console.error('❌ Error en registerUser:', error.message);
      throw error;
    }
  }

  async _grantBlockchainRoles(walletAddress, role) {
    if (role !== 'admin') {
      console.log(`  → Rol "${role}": sin roles on-chain necesarios (transfer no requiere rol)`);
      return;
    }

    try {
      console.log(`Otorgando roles on-chain para admin ${walletAddress}...`);
      const usfci = this.getUsfciAdminContract();

      const [MINTER_ROLE, BURNER_ROLE, COMPLIANCE_ROLE] = await Promise.all([
        usfci.MINTER_ROLE(),
        usfci.BURNER_ROLE(),
        usfci.COMPLIANCE_ROLE()
      ]);

      const txMinter = await usfci.grantRole(MINTER_ROLE, walletAddress, { gasLimit: 100000 });
      await txMinter.wait();
      console.log(`  ✓ MINTER_ROLE     → ${walletAddress}`);

      const txBurner = await usfci.grantRole(BURNER_ROLE, walletAddress, { gasLimit: 100000 });
      await txBurner.wait();
      console.log(`  ✓ BURNER_ROLE     → ${walletAddress}`);

      const txCompliance = await usfci.grantRole(COMPLIANCE_ROLE, walletAddress, { gasLimit: 100000 });
      await txCompliance.wait();
      console.log(`  ✓ COMPLIANCE_ROLE → ${walletAddress}`);
    } catch (error) {
      console.warn(`⚠️ Error otorgando roles (posiblemente ya los tiene): ${error.message}`);
    }
  }

  async _saveUserToSupabase(userData, wallet) {
    const encrypted = await wallet.encrypt(process.env.MASTER_KEYSTORE_PASSWORD);

    const { error } = await supabase.from('users').upsert({
      user_id: userData.userId,
      name: userData.name,
      organization: userData.organization,
      role: userData.role,
      address: wallet.address,
      encrypted_keystore: encrypted,
      initial_balance: userData.initialBalance || '0'
    }, { onConflict: 'user_id' });

    if (error) throw new Error(`Error guardando usuario en Supabase: ${error.message}`);
    console.log(`✓ Usuario guardado en Supabase`);
  }

  // ── Sin cambios debajo ───────────────────────────────────────────────────

  async updateUser(walletAddress, updateData) {
    try {
      const contract = this.getContract();
      const tx = await contract.updateUser(walletAddress, updateData.name, updateData.role, { gasLimit: 300000 });
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deactivateUser(walletAddress) {
    const contract = this.getContract();
    const tx = await contract.deactivateUser(walletAddress, { gasLimit: 200000 });
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  async reactivateUser(walletAddress) {
    const contract = this.getContract();
    const tx = await contract.reactivateUser(walletAddress, { gasLimit: 200000 });
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  async getUser(walletAddress) {
    try {
      const user = await this.getContractReadOnly().getUser(walletAddress);
      return this._mapUser(user);
    } catch (error) {
      if (error.message.includes('User not found')) return null;
      throw error;
    }
  }

  async getUserByUserId(userId) {
    try {
      const user = await this.getContractReadOnly().getUserByUserId(userId);
      return this._mapUser(user);
    } catch (error) {
      if (error.message.includes('User not found')) return null;
      throw error;
    }
  }

  async getUsersByOrganization(organization, start = 0, limit = 10) {
    const users = await this.getContractReadOnly().getUsersByOrganization(organization, start, limit);
    return users.map(u => this._mapUser(u));
  }

  async isUserActive(walletAddress) {
    return await this.getContractReadOnly().isUserActive(walletAddress);
  }

  async userRegistered(walletAddress) {
    return await this.getContractReadOnly().userRegistered(walletAddress);
  }

  async getTotalUsers() {
    return await this.getContractReadOnly().getTotalUsers();
  }

  async getActiveUsersCount() {
    return await this.getContractReadOnly().getActiveUsersCount();
  }

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
}

module.exports = new UserRegistryService();
