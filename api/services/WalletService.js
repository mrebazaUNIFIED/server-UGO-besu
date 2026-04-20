const { ethers } = require('ethers');
const supabase = require('../config/supabase');

class WalletService {
  async getPrivateKeyByUserId(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('encrypted_keystore')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !user) throw new Error(`Usuario con userId ${userId} no encontrado`);
    if (!user.encrypted_keystore) throw new Error(`Usuario ${userId} no tiene privateKey configurada`);

    const wallet = await ethers.Wallet.fromEncryptedJson(
      user.encrypted_keystore,
      process.env.MASTER_KEYSTORE_PASSWORD
    );
    return wallet.privateKey;
  }

  async getAddressByUserId(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('address')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !user) throw new Error(`Usuario con userId ${userId} no encontrado`);
    return user.address;
  }

  async getUserInfo(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, name, organization, role, address')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !user) throw new Error(`Usuario con userId ${userId} no encontrado`);

    return {
      userId: user.user_id,
      name: user.name,
      organization: user.organization,
      role: user.role,
      address: user.address
    };
  }

  async userExists(userId) {
    const { data: user } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    return !!user;
  }

  async convertUserIdsToAddresses(userIds) {
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, address')
      .in('user_id', userIds);

    if (error) throw new Error(`Error consultando usuarios: ${error.message}`);

    return userIds.map(id => {
      const found = users.find(u => u.user_id === id);
      if (!found) throw new Error(`No se encontró address para userId: ${id}`);
      return found.address;
    });
  }

  async getUserIdByAddress(address) {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id')
      .ilike('address', address)
      .maybeSingle();

    if (error || !user) throw new Error(`No se encontró userId para la address ${address}`);
    return user.user_id;
  }

  async convertAddressesToUserIds(addresses) {
    if (!Array.isArray(addresses)) throw new Error('addresses debe ser un array');

    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, address')
      .in('address', addresses.map(a => a.toLowerCase()));

    if (error) throw new Error(`Error consultando usuarios: ${error.message}`);

    return addresses.map(address => {
      const found = users.find(u => u.address.toLowerCase() === address.toLowerCase());
      if (!found) throw new Error(`No se encontró userId para la address: ${address}`);
      return found.user_id;
    });
  }
}

module.exports = new WalletService();
