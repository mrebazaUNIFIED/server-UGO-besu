// services/WalletService.js
const fs = require('fs');
const path = require('path');

class WalletService {
  constructor() {
    this.usersFilePath = path.join(__dirname, '../data/users.json');
  }

  /**
   * Obtener la private key de un usuario por su userId
   */
  getPrivateKeyByUserId(userId) {
    try {
      const usersData = fs.readFileSync(this.usersFilePath, 'utf8');
      const users = JSON.parse(usersData);
      
      const user = users[userId];
      
      if (!user) {
        throw new Error(`Usuario con userId ${userId} no encontrado`);
      }
      
      if (!user.privateKey) {
        throw new Error(`Usuario ${userId} no tiene privateKey configurada`);
      }
      
      return user.privateKey;
    } catch (error) {
      console.error('❌ Error obteniendo privateKey:', error.message);
      throw error;
    }
  }

  /**
   * Obtener la address de un usuario por su userId
   */
  getAddressByUserId(userId) {
    try {
      const usersData = fs.readFileSync(this.usersFilePath, 'utf8');
      const users = JSON.parse(usersData);
      
      const user = users[userId];
      
      if (!user) {
        throw new Error(`Usuario con userId ${userId} no encontrado`);
      }
      
      if (!user.address) {
        throw new Error(`Usuario ${userId} no tiene address configurada`);
      }
      
      return user.address;
    } catch (error) {
      console.error('❌ Error obteniendo address:', error.message);
      throw error;
    }
  }

  /**
   * Obtener información completa de un usuario
   */
  getUserInfo(userId) {
    try {
      const usersData = fs.readFileSync(this.usersFilePath, 'utf8');
      const users = JSON.parse(usersData);
      
      const user = users[userId];
      
      if (!user) {
        throw new Error(`Usuario con userId ${userId} no encontrado`);
      }
      
      // No exponemos la privateKey en la info general
      return {
        userId: user.userId,
        name: user.name,
        organization: user.organization,
        role: user.role,
        address: user.address
      };
    } catch (error) {
      console.error('❌ Error obteniendo info de usuario:', error.message);
      throw error;
    }
  }

  /**
   * Verificar si un userId existe
   */
  userExists(userId) {
    try {
      const usersData = fs.readFileSync(this.usersFilePath, 'utf8');
      const users = JSON.parse(usersData);
      return !!users[userId];
    } catch (error) {
      return false;
    }
  }

  /**
   * Convertir array de userIds a addresses
   */
  convertUserIdsToAddresses(userIds) {
    return userIds.map(userId => this.getAddressByUserId(userId));
  }

  /**
   * Obtener el userId de un usuario por su address
   * @param {string} address - La wallet address
   * @returns {string} - El userId correspondiente
   */
  getUserIdByAddress(address) {
    try {
      const usersData = fs.readFileSync(this.usersFilePath, 'utf8');
      const users = JSON.parse(usersData);
      
      // Normalizar address a lowercase para comparación
      const normalizedAddress = address.toLowerCase();
      
      // Buscar el userId que corresponde a esta address
      for (const [userId, userData] of Object.entries(users)) {
        if (userData.address && userData.address.toLowerCase() === normalizedAddress) {
          return userId;
        }
      }
      
      throw new Error(`No se encontró userId para la address ${address}`);
    } catch (error) {
      console.error('❌ Error obteniendo userId por address:', error.message);
      throw error;
    }
  }

  /**
   * Convertir array de addresses a userIds
   * @param {string[]} addresses - Array de wallet addresses
   * @returns {string[]} - Array de userIds correspondientes
   */
  convertAddressesToUserIds(addresses) {
    if (!Array.isArray(addresses)) {
      throw new Error('addresses debe ser un array');
    }
    
    return addresses.map(address => {
      const userId = this.getUserIdByAddress(address);
      if (!userId) {
        throw new Error(`No se encontró userId para la address: ${address}`);
      }
      return userId;
    });
  }
}

module.exports = new WalletService();