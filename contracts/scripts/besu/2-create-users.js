const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("👥 Creating 3 users...\n");

  const [funder] = await hre.ethers.getSigners();

  const usersToCreate = [
    { userId: "a1b2c3d4-e5f6-4789-1011-121314151617", name: "Sunwest", organization: "Sunwest", role: "admin", initialBalance: 0 },
    { userId: "b2c3d4e5-f6a7-4890-1213-141516171819", name: "Mike", organization: "FCI", role: "operator", initialBalance: 0 },
    { userId: "c3d4e5f6-a7b8-4901-2345-678910111213", name: "FCI Corporate", organization: "FCI", role: "operator", initialBalance: 0 },
    { userId: "98aa2ab88b0e45359129779256d54107", name: "Tim", organization: "FCI", role: "operator", initialBalance: 0 }
  ];

  const createdUsers = {};

  for (const userData of usersToCreate) {
    console.log(`\n🔐 Creating user: ${userData.name}`);
    
    const wallet = hre.ethers.Wallet.createRandom();
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Private Key: ${wallet.privateKey}`);

    console.log(`   💸 Funding with ${userData.initialBalance} ETH...`);
    const tx = await funder.sendTransaction({
      to: wallet.address,
      value: hre.ethers.parseEther(userData.initialBalance.toString())
    });
    await tx.wait();
    console.log(`   ✅ Funded`);

    createdUsers[userData.userId] = {
      userId: userData.userId,
      name: userData.name,
      organization: userData.organization,
      role: userData.role,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      initialBalance: userData.initialBalance,
      createdAt: new Date().toISOString()
    };
  }

  const userDataDir = path.join(__dirname, "..", "..", "user-data");
  fs.writeFileSync(
    path.join(userDataDir, "users.json"),
    JSON.stringify(createdUsers, null, 2)
  );

  fs.writeFileSync(
    path.join(userDataDir, ".gitignore"),
    "# NO commitear private keys\nusers.json\n*.json\n!deployment.json\n"
  );

  console.log("\n✅ All users created!");
  console.log("📁 Saved to: user-data/users.json");
  console.log("⚠️  IMPORTANT: Backup users.json securely!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});