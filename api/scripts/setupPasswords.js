// scripts/setupPasswords.js
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const setupPasswords = async () => {
  console.log('🔐 Configurando contraseñas para usuarios...\n');

  // Define las contraseñas para cada wallet
  const passwords = {
    '0x3F45A9a959a008dfD762DDF7D8f330AaE48ca677': 'Nuevapassword',
    '0x90D65fCF764aba7416be105e8f6cC11c928d97ac': 'Nuevapassword',
    '0xFBC81B8229740cE865802Fe0C3BE0B4E79fe831A': 'Nuevapassword',
    '0xa8cacAC51aC9b2d7c39aA369fE3aFB920C2835C3': 'Nuevapassword',
  };

  try {
    // Leer archivo de usuarios
    const usersFile = path.join(__dirname, '../data/users.json');
    const data = await fs.readFile(usersFile, 'utf8');
    const users = JSON.parse(data);

    // Agregar passwordHash a cada usuario
    for (const [userId, user] of Object.entries(users)) {
      const password = passwords[user.address];

      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        user.passwordHash = passwordHash;

        console.log(`✅ ${user.name} (${user.address})`);
        console.log(`   Password: ${password}`);
        console.log(`   Hash: ${passwordHash.substring(0, 20)}...`);
        console.log('');
      } else {
        console.log(`⚠️  No password defined for ${user.address}`);
      }
    }

    // Guardar archivo actualizado
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

    console.log('✅ Contraseñas configuradas exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('═══════════════════════════════════════════════════════════');

    for (const [userId, user] of Object.entries(users)) {
      const password = passwords[user.address];
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