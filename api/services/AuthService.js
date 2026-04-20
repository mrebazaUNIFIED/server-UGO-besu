const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');
const supabase = require('../config/supabase');

class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.JWT_EXPIRES_IN = '24h';
  }

  async login(address, password) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('address', address)
      .maybeSingle();

    if (error) throw new Error('Error al consultar usuario');
    if (!user) throw new Error('Invalid wallet address or password');

    if (!user.password_hash) {
      throw new Error('User has no password configured. Please run setup script.');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error('Invalid wallet address or password');

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', user.user_id);

    const token = jwt.sign(
      {
        userId: user.user_id,
        address: user.address,
        role: user.role,
        organization: user.organization
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        organization: user.organization,
        role: user.role,
        address: user.address,
        initialBalance: user.initial_balance,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
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
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .ilike('address', address)
      .maybeSingle();

    return user ? this._mapUser(user) : null;
  }

  async getUserById(userId) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return user ? this._mapUser(user) : null;
  }

  async getUserPrivateKey(userId) {
    const { data: user } = await supabase
      .from('users')
      .select('encrypted_keystore')
      .eq('user_id', userId)
      .maybeSingle();

    if (!user) throw new Error('User not found');
    if (!user.encrypted_keystore) throw new Error('User has no private key');

    const wallet = await ethers.Wallet.fromEncryptedJson(
      user.encrypted_keystore,
      process.env.MASTER_KEYSTORE_PASSWORD
    );

    return wallet.privateKey;
  }

  async setInitialPassword(address, password) {
    const { data: user } = await supabase
      .from('users')
      .select('user_id, address')
      .ilike('address', address)
      .maybeSingle();

    if (!user) throw new Error('User not found');

    const passwordHash = await bcrypt.hash(password, 10);

    await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('user_id', user.user_id);

    return { success: true, address: user.address };
  }

  _mapUser(row) {
    return {
      userId: row.user_id,
      name: row.name,
      organization: row.organization,
      role: row.role,
      address: row.address,
      initialBalance: row.initial_balance,
      createdAt: row.created_at,
      lastLogin: row.last_login
    };
  }
}

module.exports = new AuthService();
