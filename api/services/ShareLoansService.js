// ShareLoansService.js (FIXED - with sharedWithUserIds)
const { ethers } = require('ethers');
const BaseContractService = require('./BaseContractService');

class ShareLoansService extends BaseContractService {
  constructor() {
    super('ShareLoans', 'ShareLoans', 'marketplace');
    this.GAS_LIMIT_WRITE = 800000;
  }

  /**
   * Crear un share asset (Escritura - Nodo Fijo)
   * @param {string} privateKey - Private key del owner
   * @param {string} key - Share key único
   * @param {string} ownerUserId - UserId del owner
   * @param {string[]} accounts - Array de account IDs
   * @param {string} name - Nombre del share
   * @param {string[]} sharedWithAddresses - Array de wallet addresses
   * @param {string[]} sharedWithUserIds - Array de userIds correspondientes a las addresses
   */
  async createShareAsset(privateKey, key, ownerUserId, accounts, name, sharedWithAddresses, sharedWithUserIds) {
    try {
      const contract = this.getContract(privateKey);

      console.log('🔍 ===== DEBUG CREATESHARE =====');
      console.log('📋 Parámetros recibidos:');
      console.log('  - key:', key, '(type:', typeof key, ')');
      console.log('  - ownerUserId:', ownerUserId, '(type:', typeof ownerUserId, ')');
      console.log('  - accounts:', accounts);
      console.log('  - name:', name, '(type:', typeof name, ')');
      console.log('  - sharedWithAddresses:', sharedWithAddresses);
      console.log('  - sharedWithUserIds:', sharedWithUserIds);

      // ✅ Validaciones CRÍTICAS
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new Error('key debe ser un string no vacío');
      }

      if (!ownerUserId || typeof ownerUserId !== 'string' || ownerUserId.trim() === '') {
        throw new Error('ownerUserId debe ser un string no vacío');
      }

      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('accounts debe ser un array con al menos un elemento');
      }

      if (!Array.isArray(sharedWithAddresses) || sharedWithAddresses.length === 0) {
        throw new Error('sharedWithAddresses debe ser un array con al menos un elemento');
      }

      if (!Array.isArray(sharedWithUserIds) || sharedWithUserIds.length === 0) {
        throw new Error('sharedWithUserIds debe ser un array con al menos un elemento');
      }

      if (sharedWithAddresses.length !== sharedWithUserIds.length) {
        throw new Error('sharedWithAddresses y sharedWithUserIds deben tener la misma longitud');
      }

      // Verificar que las addresses sean válidas
      for (let i = 0; i < sharedWithAddresses.length; i++) {
        if (!ethers.isAddress(sharedWithAddresses[i])) {
          throw new Error(`Address inválida en posición ${i}: ${sharedWithAddresses[i]}`);
        }
        console.log(`  ✓ Address ${i} válida:`, sharedWithAddresses[i]);
      }

      // Verificar que todos los accounts sean strings
      for (let i = 0; i < accounts.length; i++) {
        if (typeof accounts[i] !== 'string' || accounts[i].trim() === '') {
          throw new Error(`Account en posición ${i} debe ser un string no vacío: ${accounts[i]}`);
        }
      }

      // Verificar que todos los userIds sean strings
      for (let i = 0; i < sharedWithUserIds.length; i++) {
        if (typeof sharedWithUserIds[i] !== 'string' || sharedWithUserIds[i].trim() === '') {
          throw new Error(`UserId en posición ${i} debe ser un string no vacío: ${sharedWithUserIds[i]}`);
        }
      }

      // 🔍 VERIFICAR CONTRATO
      console.log('📍 Contract Address:', await contract.getAddress());
      console.log('👤 Sender Address:', await contract.runner.getAddress());

      // 🔍 VERIFICAR SI EL MÉTODO EXISTE
      if (typeof contract.createShareAsset !== 'function') {
        throw new Error('❌ El contrato NO tiene el método createShareAsset. Verifica el ABI.');
      }

      console.log('✅ Método createShareAsset existe en el contrato');

      // 🔍 ENCODEAR LA DATA PARA VER QUÉ SE ENVIARÁ (con 6 parámetros)
      try {
        const encodedData = contract.interface.encodeFunctionData('createShareAsset', [
          key,
          ownerUserId,
          accounts,
          name || '',
          sharedWithAddresses,
          sharedWithUserIds // <-- PARÁMETRO 6
        ]);
        console.log('📦 Encoded Data (primeros 200 chars):', encodedData.substring(0, 200));
        console.log('📏 Data Length:', encodedData.length);
      } catch (encodeError) {
        console.error('❌ Error al encodear datos:', encodeError);
        throw new Error(`No se pudo encodear los datos: ${encodeError.message}`);
      }

      console.log(`🔗 Compartiendo accounts bajo la llave ${key}...`);

      // Enviar transacción con 6 parámetros
      const tx = await contract.createShareAsset(
        key,
        ownerUserId,
        accounts,
        name || '',
        sharedWithAddresses,
        sharedWithUserIds, // <-- PARÁMETRO 6
        {
          gasLimit: this.GAS_LIMIT_WRITE,
        }
      );

      console.log('✅ Transacción enviada, esperando confirmación...');
      console.log('  - TX Hash:', tx.hash);
      console.log('  - TX Data:', tx.data.substring(0, 200));

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('❌ Transacción REVERTED. El contrato rechazó la operación.');
      }

      console.log('✅ Transacción confirmada!');
      console.log('  - Block:', receipt.blockNumber);
      console.log('  - Gas usado:', receipt.gasUsed.toString());
      console.log('  - Status:', receipt.status);

      const events = this._parseLogs(contract, receipt.logs);
      console.log('📋 Eventos emitidos:', events);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        events
      };
    } catch (error) {
      console.error("❌ Error en createShareAsset:", error.message);

      if (error.receipt) {
        console.error("📋 Receipt del error:");
        console.error("  - Status:", error.receipt.status);
        console.error("  - Gas usado:", error.receipt.gasUsed?.toString());
        console.error("  - From:", error.receipt.from);
        console.error("  - To:", error.receipt.to);
        console.error("  - Data:", error.transaction?.data?.substring(0, 200));
      }

      if (error.reason) {
        console.error("🔍 Razón del revert:", error.reason);
      }

      if (error.data) {
        console.error("🔍 Error data:", error.data);
      }

      if (error.data && typeof error.data === 'string') {
        try {
          const contract = this.getContractReadOnly();
          const decodedError = contract.interface.parseError(error.data);
          console.error("🔍 Error decodificado del contrato:", decodedError);
        } catch (decodeErr) {
          console.error("⚠️ No se pudo decodificar el error del contrato");
        }
      }

      throw error;
    }
  }

  /**
   * Actualizar cuentas con acceso (Escritura)
   */
  async updateShareAssetAccounts(privateKey, key, newSharedWithAddresses, newSharedWithUserIds) {
    try {
      const contract = this.getContract(privateKey);

      console.log('📋 Actualizando accesos para:', key);
      console.log('  - Nuevas addresses:', newSharedWithAddresses);
      console.log('  - Nuevos userIds:', newSharedWithUserIds);

      const tx = await contract.updateShareAssetAccounts(
        key,
        newSharedWithAddresses,
        newSharedWithUserIds,
        { gasLimit: this.GAS_LIMIT_WRITE }
      );

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transacción REVERTED');
      }

      return {
        success: true,
        txHash: receipt.hash,
        events: this._parseLogs(contract, receipt.logs)
      };
    } catch (error) {
      console.error('❌ Error en updateShareAssetAccounts:', error.message);
      throw error;
    }
  }

  /**
   * Deshabilitar/Habilitar Share (Escritura)
   */
  async disableShareAsset(privateKey, key) {
    try {
      const contract = this.getContract(privateKey);
      console.log('🔒 Deshabilitando share:', key);

      const tx = await contract.disableShareAsset(key, { gasLimit: 200000 });
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transacción REVERTED');
      }

      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('❌ Error en disableShareAsset:', error.message);
      throw error;
    }
  }

  async enableShareAsset(privateKey, key) {
    try {
      const contract = this.getContract(privateKey);
      console.log('🔓 Habilitando share:', key);

      const tx = await contract.enableShareAsset(key, { gasLimit: 200000 });
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transacción REVERTED');
      }

      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('❌ Error en enableShareAsset:', error.message);
      throw error;
    }
  }

  // ==================== MÉTODOS DE LECTURA (Usa Load Balancer) ====================

  async readShareAsset(key) {
    const share = await this.getContractReadOnly().readShareAsset(key);
    return this._mapShare(share);
  }

  async checkUserAccess(key, userAddress) {
    const [hasAccess, reason] = await this.getContractReadOnly().checkUserAccess(key, userAddress);
    return { hasAccess, reason };
  }

  async querySharedByUser(userAddress) {
    const shares = await this.getContractReadOnly().querySharedByUser(userAddress);
    return shares.map(s => this._mapShare(s));
  }

  async querySharedWithMe(userAddress) {
    const shares = await this.getContractReadOnly().querySharedWithMe(userAddress);
    return shares.map(s => this._mapShare(s));
  }

  async queryAllShareAssets() {
    const shares = await this.getContractReadOnly().queryAllShareAssets();
    return shares.map(s => this._mapShare(s));
  }

  async shareAssetExists(key) {
    return await this.getContractReadOnly().shareAssetExists(key);
  }

  // ==================== HELPERS INTERNOS ====================

  _mapShare(share) {
    return {
      key: share.key,
      ownerAddress: share.ownerAddress,
      ownerUserId: share.ownerUserId,
      accounts: share.accounts,
      name: share.name,
      sharedWith: share.sharedWith,
      sharedWithUserIds: share.sharedWithUserIds || [], // Agregado
      isActive: share.isActive,
      createdAt: new Date(Number(share.createdAt) * 1000),
      updatedAt: new Date(Number(share.updatedAt) * 1000)
    };
  }

  _parseLogs(contract, logs) {
    return logs
      .map(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed ? { name: parsed.name, args: parsed.args } : null;
        } catch (e) { return null; }
      })
      .filter(e => e !== null);
  }
}

module.exports = new ShareLoansService();