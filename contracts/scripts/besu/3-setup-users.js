require("dotenv").config();

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("⚙️  Setting up users in contracts...\n");

  // =========================
  // 🔐 Leer direcciones desde .env
  // =========================
  const USER_REGISTRY_ADDRESS = process.env.BESU_USER_REGISTRY_ADDRESS;
  const USFCI_ADDRESS = process.env.BESU_USFCI_ADDRESS;

  if (!USER_REGISTRY_ADDRESS || !USFCI_ADDRESS) {
    console.error("❌ Missing contract addresses in .env");
    console.error("Required:");
    console.error("  USER_REGISTRY_ADDRESS");
    console.error("  USFCI_ADDRESS");
    process.exit(1);
  }

  console.log("🔗 Using contracts from .env:");
  console.log("  UserRegistry:", USER_REGISTRY_ADDRESS);
  console.log("  USFCI:       ", USFCI_ADDRESS);

  // =========================
  // 📂 Cargar usuarios
  // =========================
  const usersPath = path.join(__dirname, "..", "..", "user-data", "users.json");
  const users = JSON.parse(fs.readFileSync(usersPath));

  // =========================
  // 👑 Admin signer
  // =========================
  const [admin] = await hre.ethers.getSigners();

  // =========================
  // 🔗 Conectar contratos
  // =========================
  const userRegistry = await hre.ethers.getContractAt(
    "UserRegistry",
    USER_REGISTRY_ADDRESS
  );

  const usfci = await hre.ethers.getContractAt(
    "USFCI",
    USFCI_ADDRESS
  );

  let sunwestWallet; // Para usar después en minting

  // =========================
  // 👥 Setup usuarios
  // =========================
  for (const [key, user] of Object.entries(users)) {
    console.log(`\n👤 Setting up: ${user.name}`);

    // Registrar en UserRegistry (admin)
    console.log("   📝 Registering in UserRegistry...");
    const regTx = await userRegistry.registerUser(
      user.address,
      user.userId,
      user.name,
      user.organization,
      user.role
    );
    await regTx.wait();
    console.log("   ✅ Registered");

    // Registrar wallet en USFCI (como usuario)
    console.log("   📝 Registering in USFCI...");
    const wallet = new hre.ethers.Wallet(
      user.privateKey,
      hre.ethers.provider
    );
    const usfciWithSigner = usfci.connect(wallet);

    const mspId =
      user.organization === "Sunwest" ? "SunwestMSP" : "FCIMSP";

    const accountType =
      user.role === "admin" ? "institutional" : "individual";

    const usfciRegTx = await usfciWithSigner.registerWallet(
      mspId,
      user.userId,
      accountType
    );
    await usfciRegTx.wait();
    console.log("   ✅ Registered in USFCI");

    // KYC (admin)
    console.log("   ✅ Approving KYC...");
    const kycTx = await usfci
      .connect(admin)
      .updateComplianceStatus(user.address, "approved", "low");
    await kycTx.wait();
    console.log("   ✅ KYC approved");

    // Roles especiales para Sunwest
    if (user.userId === "a1b2c3d4-e5f6-4789-1011-121314151617") {
      console.log("   🔑 Granting special roles to Sunwest...");

      const MINTER_ROLE = await usfci.MINTER_ROLE();
      const BURNER_ROLE = await usfci.BURNER_ROLE();
      const COMPLIANCE_ROLE = await usfci.COMPLIANCE_ROLE();

      await (await usfci.grantRole(MINTER_ROLE, user.address)).wait();
      await (await usfci.grantRole(BURNER_ROLE, user.address)).wait();
      await (await usfci.grantRole(COMPLIANCE_ROLE, user.address)).wait();

      console.log("   ✅ Roles granted");

      sunwestWallet = wallet;
    }
  }

  // =========================
  // 💰 Minting tokens
  // =========================
  if (!sunwestWallet) {
    console.error("❌ Sunwest wallet not found. Cannot mint tokens.");
    process.exit(1);
  }

  console.log("\n💰 Minting initial USFCI tokens...");
  const usfciWithMinter = usfci.connect(sunwestWallet);
  const reserveProof = "initial_reserve_proof_2026";

  for (const [key, user] of Object.entries(users)) {
    const mintAmount = hre.ethers.parseUnits("10000", 18);

    console.log(
      `   Minting ${hre.ethers.formatUnits(
        mintAmount,
        18
      )} USFCI to ${user.name}...`
    );

    const mintTx = await usfciWithMinter.mintTokens(
      user.address,
      mintAmount,
      reserveProof
    );

    await mintTx.wait();
    console.log(`   ✅ Minted to ${user.address}`);
  }

  console.log("\n✅ All users setup and tokens minted!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
