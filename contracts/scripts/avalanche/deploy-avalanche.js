const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying FCI Ecosystem to Avalanche Fuji...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "AVAX\n");

  if (balance === 0n) {
    console.error("❌ Error: No AVAX balance!");
    console.error("   Consigue AVAX de prueba en: https://faucet.avax.network");
    process.exit(1);
  }

  const validatorAddresses = [
    "0x6189e82021668b868cfc4ffc21e7669b3156add9",
    "0x7f47738f4edf27690bbc6d3d945efe1e7aba1e86",
    "0x9a34dc6594e283278427a4f1a94fc7336dc3ec71",
    "0x9f214c60aaeed8c0b47965b1b359181fd37886f4"
  ];

  // Dirección del relayer (wallet que firma las txs en el servicio)
  const relayerAddress = process.env.RELAYER_ADDRESS || deployer.address;

  try {

    // ── 1. USFCI_Avalanche (UUPS Proxy) ──────────────────────────────────────
    console.log("📝 Deploying USFCI_Avalanche (UUPS Proxy)...");
    const USFCI = await hre.ethers.getContractFactory("USFCI_Avalanche");
    const usfci = await hre.upgrades.deployProxy(
      USFCI,
      [deployer.address, "Sunwest Bank"],
      { kind: "uups", initializer: "initialize" }
    );
    await usfci.waitForDeployment();
    const usfciAddress = await usfci.getAddress();
    const usfciImpl = await hre.upgrades.erc1967.getImplementationAddress(usfciAddress);
    console.log("✅ USFCI (proxy):", usfciAddress);
    console.log("   USFCI (impl): ", usfciImpl);

    // ── 2. LoanNFT ────────────────────────────────────────────────────────────
    console.log("\n📝 Deploying LoanNFT...");
    const LoanNFT = await hre.ethers.getContractFactory("LoanNFT");
    const loanNFT = await LoanNFT.deploy(deployer.address);
    await loanNFT.waitForDeployment();
    const loanNFTAddress = await loanNFT.getAddress();
    console.log("✅ LoanNFT:", loanNFTAddress);

    // ── 3. PaymentDistributor ─────────────────────────────────────────────────
    console.log("\n📝 Deploying PaymentDistributor...");
    const PaymentDistributor = await hre.ethers.getContractFactory("PaymentDistributor");
    const paymentDistributor = await PaymentDistributor.deploy(
      deployer.address,
      loanNFTAddress,
      usfciAddress
    );
    await paymentDistributor.waitForDeployment();
    const paymentDistributorAddress = await paymentDistributor.getAddress();
    console.log("✅ PaymentDistributor:", paymentDistributorAddress);

    // ── 4. BridgeReceiver ─────────────────────────────────────────────────────
    console.log("\n📝 Deploying BridgeReceiver...");
    const BridgeReceiver = await hre.ethers.getContractFactory("BridgeReceiver");
    const bridgeReceiver = await BridgeReceiver.deploy(
      deployer.address,
      loanNFTAddress,
      paymentDistributorAddress,
      validatorAddresses,
      3
    );
    await bridgeReceiver.waitForDeployment();
    const bridgeReceiverAddress = await bridgeReceiver.getAddress();
    console.log("✅ BridgeReceiver:", bridgeReceiverAddress);

    // ── 5. LoanMarketplace ────────────────────────────────────────────────────
    console.log("\n📝 Deploying LoanMarketplace...");
    const LoanMarketplace = await hre.ethers.getContractFactory("LoanMarketplace");
    const marketplace = await LoanMarketplace.deploy(
      deployer.address,
      loanNFTAddress,
      usfciAddress,
      deployer.address  // feeRecipient
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ LoanMarketplace:", marketplaceAddress);

    // ── 6. Configurar permisos ────────────────────────────────────────────────
    console.log("\n🔧 Configuring contracts...");

    // LoanNFT → BridgeReceiver
    console.log("  Setting BridgeReceiver in LoanNFT...");
    await (await loanNFT.setBridgeReceiver(bridgeReceiverAddress)).wait();
    console.log("  ✅ LoanNFT.bridgeReceiver =", bridgeReceiverAddress);

    // PaymentDistributor → BridgeReceiver
    console.log("  Setting BridgeReceiver in PaymentDistributor...");
    await (await paymentDistributor.setBridgeReceiver(bridgeReceiverAddress)).wait();
    console.log("  ✅ PaymentDistributor.bridgeReceiver =", bridgeReceiverAddress);

    // ⭐ BridgeReceiver → Marketplace (para el auto-approve después del mint)
    console.log("  Setting Marketplace in BridgeReceiver...");
    await (await bridgeReceiver.setMarketplace(marketplaceAddress)).wait();
    console.log("  ✅ BridgeReceiver.marketplace =", marketplaceAddress);

    // Marketplace → Relayer (para listForSaleByRelayer)
    console.log("  Setting Relayer in LoanMarketplace...");
    await (await marketplace.setRelayer(relayerAddress)).wait();
    console.log("  ✅ Marketplace.relayer =", relayerAddress);

    // ── 7. Dar MINTER_ROLE al relayer en USFCI ────────────────────────────────
    console.log("  Granting MINTER_ROLE to relayer in USFCI...");
    const MINTER_ROLE = await usfci.MINTER_ROLE();
    await (await usfci.grantRole(MINTER_ROLE, relayerAddress)).wait();
    console.log("  ✅ USFCI MINTER_ROLE granted to:", relayerAddress);

    // ── 8. Verificar setup ────────────────────────────────────────────────────
    console.log("\n🔗 Verifying setup...");

    const validators = await bridgeReceiver.getValidators();
    const requiredSigs = await bridgeReceiver.requiredSignatures();
    console.log("  Validators:", validators.length, "| Required:", requiredSigs.toString());

    const loanNFTBridge = await loanNFT.bridgeReceiver();
    const pdBridge = await paymentDistributor.bridgeReceiver();
    const bridgeMarketplace = await bridgeReceiver.marketplace();
    const marketplaceRelayer = await marketplace.relayer();

    console.log("  LoanNFT.bridgeReceiver:          ", loanNFTBridge === bridgeReceiverAddress ? "✅" : "❌", loanNFTBridge);
    console.log("  PaymentDistributor.bridgeReceiver:", pdBridge === bridgeReceiverAddress ? "✅" : "❌", pdBridge);
    console.log("  BridgeReceiver.marketplace:       ", bridgeMarketplace === marketplaceAddress ? "✅" : "❌", bridgeMarketplace);
    console.log("  Marketplace.relayer:              ", marketplaceRelayer === relayerAddress ? "✅" : "❌", marketplaceRelayer);

    // ── 9. Guardar en .env ────────────────────────────────────────────────────
    // ⭐ Nombres alineados con lo que lee el relayer en contracts.js
    const envPath = path.join(__dirname, "..", "..", ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    function setEnvVar(key, value) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      const line = `${key}=${value}`;
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, line);
      } else {
        envContent += `\n${line}`;
      }
    }

    setEnvVar("AVALANCHE_NETWORK", "fuji");
    setEnvVar("AVALANCHE_CHAIN_ID", "43113");
    setEnvVar("AVALANCHE_DEPLOYER_ADDRESS", deployer.address);

    // ⭐ Nombres exactos que usa contracts.js en el relayer
    setEnvVar("AVALANCHE_USFCI_ADDRESS", usfciAddress);         // contracts.js: usfci
    setEnvVar("AVALANCHE_USFCI_IMPL", usfciImpl);
    setEnvVar("AVALANCHE_LOAN_NFT", loanNFTAddress);            // contracts.js: loanNFT
    setEnvVar("AVALANCHE_BRIDGE_RECEIVER", bridgeReceiverAddress); // contracts.js: bridgeReceiver
    setEnvVar("AVALANCHE_PAYMENT_DISTRIBUTOR", paymentDistributorAddress); // contracts.js: paymentDistributor
    setEnvVar("AVALANCHE_MARKETPLACE", marketplaceAddress);     // contracts.js: marketplace

    fs.writeFileSync(envPath, envContent.trim() + "\n");

    // ── 10. Resumen ───────────────────────────────────────────────────────────
    console.log("\n✅ Avalanche Deployment Complete!");
    console.log("📄 Addresses saved to .env\n");

    console.log("📋 Contract Addresses:");
    console.log("  USFCI (proxy):       ", usfciAddress);
    console.log("  USFCI (impl):        ", usfciImpl);
    console.log("  LoanNFT:             ", loanNFTAddress);
    console.log("  BridgeReceiver:      ", bridgeReceiverAddress);
    console.log("  PaymentDistributor:  ", paymentDistributorAddress);
    console.log("  LoanMarketplace:     ", marketplaceAddress);

    console.log("\n🔗 View on Snowtrace (Fuji):");
    console.log(`  USFCI:        https://testnet.snowtrace.io/address/${usfciAddress}`);
    console.log(`  LoanNFT:      https://testnet.snowtrace.io/address/${loanNFTAddress}`);
    console.log(`  Marketplace:  https://testnet.snowtrace.io/address/${marketplaceAddress}`);
    console.log(`  BridgeRcvr:   https://testnet.snowtrace.io/address/${bridgeReceiverAddress}`);

    console.log("\n⚠️  Next Steps:");
    console.log("  1. Mintear USFCI de prueba:");
    console.log(`     usfci.mintTokens("${deployer.address}", ethers.parseUnits("10000", 18), "test-001")`);
    console.log("  2. Actualizar ABIs en el relayer si cambiaron contratos");
    console.log("  3. Reiniciar el relayer: pm2 restart relayer");
    console.log("  4. Probar flujo completo end-to-end");

  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});