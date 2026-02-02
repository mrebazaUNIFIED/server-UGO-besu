// models/User.js
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');

class User {
  constructor(data) {
    this.userId = data.userId;
    this.name = data.name;
    this.organization = data.organization;
    this.role = data.role;
    this.address = data.address;
    this.privateKey = data.privateKey; 
    this.mnemonic = data.mnemonic; 
    this.passwordHash = data.passwordHash;
    this.initialBalance = data.initialBalance || 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || null;
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async verifyPassword(password) {
    return await bcrypt.compare(password, this.passwordHash);
  }

  toJSON() {
    return {
      userId: this.userId,
      name: this.name,
      organization: this.organization,
      role: this.role,
      address: this.address,
      initialBalance: this.initialBalance,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin
    };
  }
}

module.exports = User;