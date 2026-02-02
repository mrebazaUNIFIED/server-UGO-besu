// services/AuthService.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');

class AuthService {
  constructor() {
    this.usersFile = path.join(__dirname, '../data/users.json');
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.JWT_EXPIRES_IN = '24h';
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      const usersData = JSON.parse(data);
      
      // Convertir a instancias de User
      const users = {};
      for (const [key, userData] of Object.entries(usersData)) {
        users[key] = new User(userData);
      }
      return users;
    } catch (error) {
      console.error('Error loading users:', error);
      return {};
    }
  }

  async saveUsers(users) {
    try {
      // Convertir a objeto plano antes de guardar
      const plainUsers = {};
      for (const [key, user] of Object.entries(users)) {
        plainUsers[key] = {
          userId: user.userId,
          name: user.name,
          organization: user.organization,
          role: user.role,
          address: user.address,
          privateKey: user.privateKey,
          mnemonic: user.mnemonic,
          passwordHash: user.passwordHash,
          initialBalance: user.initialBalance,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        };
      }
      await fs.writeFile(this.usersFile, JSON.stringify(plainUsers, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
      throw error;
    }
  }

  async login(address, password) {
    const users = await this.loadUsers();
    
    // Buscar usuario por address (case-insensitive)
    const user = Object.values(users).find(u => 
      u.address.toLowerCase() === address.toLowerCase()
    );

    if (!user) {
      throw new Error('Invalid wallet address or password');
    }

    // Verificar que tenga passwordHash
    if (!user.passwordHash) {
      throw new Error('User has no password configured. Please run setup script.');
    }

    // Verificar contraseña
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid wallet address or password');
    }

    // Actualizar último login
    user.lastLogin = new Date().toISOString();
    users[user.userId] = user;
    await this.saveUsers(users);

    // Generar JWT
    const token = jwt.sign(
      {
        userId: user.userId,
        address: user.address,
        role: user.role,
        organization: user.organization
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: user.toJSON()
    };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getUserByAddress(address) {
    const users = await this.loadUsers();
    return Object.values(users).find(u => 
      u.address.toLowerCase() === address.toLowerCase()
    );
  }

  async getUserById(userId) {
    const users = await this.loadUsers();
    return users[userId];
  }

  // MÉTODO CORREGIDO - Retorna solo el string privateKey
  async getUserPrivateKey(userId) {
    const users = await this.loadUsers();
    const user = users[userId];
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.privateKey) {
      throw new Error('User has no private key');
    }

    // Retornar SOLO el string de privateKey
    return user.privateKey;
  }

  // Método para crear contraseña inicial
  async setInitialPassword(address, password) {
    const users = await this.loadUsers();
    const userEntry = Object.entries(users).find(([_, u]) => 
      u.address.toLowerCase() === address.toLowerCase()
    );

    if (!userEntry) {
      throw new Error('User not found');
    }

    const [userId, user] = userEntry;
    user.passwordHash = await User.hashPassword(password);
    users[userId] = user;
    await this.saveUsers(users);

    return { success: true, address: user.address };
  }
}

module.exports = new AuthService();