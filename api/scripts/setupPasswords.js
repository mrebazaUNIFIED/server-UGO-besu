require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const setupPasswords = async () => {
  console.log('🔐 Configurando contraseñas para usuarios...\n');

  // address → password
  const passwords = {
    '0x3F45A9a959a008dfD762DDF7D8f330AaE48ca677': 'Nuevapassword',
    '0x90D65fCF764aba7416be105e8f6cC11c928d97ac': 'Nuevapassword',
    '0xFBC81B8229740cE865802Fe0C3BE0B4E79fe831A': 'Nuevapassword',
    '0xa8cacAC51aC9b2d7c39aA369fE3aFB920C2835C3': 'Nuevapassword',
  };

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, name, address, role');

    if (error) throw new Error(`Error consultando Supabase: ${error.message}`);
    if (!users || users.length === 0) {
      console.log('⚠️  No se encontraron usuarios en Supabase.');
      return;
    }

    for (const user of users) {
      const normalizedAddress = Object.keys(passwords).find(
        addr => addr.toLowerCase() === user.address.toLowerCase()
      );
      const password = normalizedAddress ? passwords[normalizedAddress] : null;

      if (!password) {
        console.log(`⚠️  Sin password definida para ${user.address}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('user_id', user.user_id);

      if (updateError) {
        console.error(`❌ Error actualizando ${user.name}: ${updateError.message}`);
      } else {
        console.log(`✅ ${user.name} (${user.address})`);
        console.log(`   Password: ${password}`);
        console.log(`   Hash: ${passwordHash.substring(0, 20)}...`);
        console.log('');
      }
    }

    console.log('✅ Contraseñas configuradas exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('═══════════════════════════════════════════════════════════');
    for (const user of users) {
      const normalizedAddress = Object.keys(passwords).find(
        addr => addr.toLowerCase() === user.address.toLowerCase()
      );
      const password = normalizedAddress ? passwords[normalizedAddress] : null;
      if (password) {
        console.log(`\n${user.name} (${user.role.toUpperCase()})`);
        console.log(`Wallet: ${user.address}`);
        console.log(`Password: ${password}`);
      }
    }
    console.log('\n═══════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

setupPasswords();
