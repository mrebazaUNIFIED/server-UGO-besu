// scripts/setupPasswords.js
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const setupPasswords = async () => {
  console.log('🔐 Configurando contraseñas para usuarios...\n');

  // Define las contraseñas para cada wallet
  const passwords = {
    '0x13fCDD263DA24714b3d151373D791d79B2c47D58': 'Nuevapassword',
    '0x7eC69C52E3277cfc185D4613eedbea65cb7e52A4': 'Nuevapassword',
    '0xdC7d78aea8E6E6dc13e12916C8Fb236A834ca540': 'Nuevapassword',
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