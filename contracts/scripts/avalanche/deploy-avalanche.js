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

  try {

    // ── 1. USFCI_Avalanche (UUPS Proxy) ──────────────────────────────────────
    // CAMBIO PRINCIPAL vs tu deploy anterior:
    // Antes: USDC_FUJI = dirección externa ya desplegada (no tuya)
    // Ahora: desplegamos nuestro propio USFCI como proxy upgradeable
    console.log("📝 Deploying USFCI_Avalanche (UUPS Proxy)...");

    const USFCI = await hre.ethers.getContractFactory("USFCI_Avalanche");
    const usfci = await hre.upgrades.deployProxy(
      USFCI,
      [deployer.address, "Sunwest Bank"],  // initialize(owner, reserveBank)
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
    // CAMBIO: paymentToken = usfciAddress (antes era USDC_FUJI)
    console.log("\n📝 Deploying PaymentDistributor (paymentToken = USFCI)...");
    const PaymentDistributor = await hre.ethers.getContractFactory("PaymentDistributor");
    const paymentDistributor = await PaymentDistributor.deploy(
      deployer.address,
      loanNFTAddress,
      usfciAddress      // ← USFCI en vez de USDC
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
      3 // requiredSignatures (3 de 4)
    );
    await bridgeReceiver.waitForDeployment();
    const bridgeReceiverAddress = await bridgeReceiver.getAddress();
    console.log("✅ BridgeReceiver:", bridgeReceiverAddress);

    // ── 5. LoanMarketplace ────────────────────────────────────────────────────
    // CAMBIO: paymentToken = usfciAddress (antes era USDC_FUJI)
    console.log("\n📝 Deploying LoanMarketplace (paymentToken = USFCI)...");
    const LoanMarketplace = await hre.ethers.getContractFactory("LoanMarketplace");
    const marketplace = await LoanMarketplace.deploy(
      deployer.address,
      loanNFTAddress,
      usfciAddress,     // ← USFCI en vez de USDC
      deployer.address  // feeRecipient
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ LoanMarketplace:", marketplaceAddress);

    // ── 6. Configurar permisos ────────────────────────────────────────────────
    console.log("\n🔧 Configuring contracts...");

    console.log("  Setting BridgeReceiver in LoanNFT...");
    await (await loanNFT.setBridgeReceiver(bridgeReceiverAddress)).wait();
    console.log("  ✅ LoanNFT configured");

    console.log("  Setting BridgeReceiver in PaymentDistributor...");
    await (await paymentDistributor.setBridgeReceiver(bridgeReceiverAddress)).wait();
    console.log("  ✅ PaymentDistributor configured");

    // ← AGREGA ESTO
    console.log("  Setting Relayer in LoanMarketplace...");
    const relayerAddress = deployer.address;
    await (await marketplace.setRelayer(relayerAddress)).wait();
    console.log("  ✅ Marketplace relayer set:", relayerAddress);

    // ── 7. Verificar ──────────────────────────────────────────────────────────
    console.log("\n🔗 Verifying setup...");

    const validators = await bridgeReceiver.getValidators();
    const requiredSigs = await bridgeReceiver.requiredSignatures();
    console.log("  Validators:", validators.length);
    console.log("  Required signatures:", requiredSigs.toString());

    const loanNFTBridge = await loanNFT.bridgeReceiver();
    const pdBridge = await paymentDistributor.bridgeReceiver();
    const bridgeOK =
      loanNFTBridge === bridgeReceiverAddress &&
      pdBridge === bridgeReceiverAddress;

    console.log(bridgeOK
      ? "  ✅ Bridge configuration verified!"
      : "  ⚠️  Warning: Bridge configuration mismatch!"
    );

    const usfciVersion = await usfci.version();
    const usfciBank = await usfci.reserveBank();
    console.log(`  ✅ USFCI version: ${usfciVersion} | Reserve: ${usfciBank}`);

    // ── 8. Guardar en .env ────────────────────────────────────────────────────
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
    setEnvVar("AVALANCHE_CHAIN_ID", 43113);
    setEnvVar("AVALANCHE_DEPLOYER_ADDRESS", deployer.address);
    setEnvVar("AVALANCHE_USFCI_ADDRESS", usfciAddress);
    setEnvVar("AVALANCHE_USFCI_IMPL", usfciImpl);
    setEnvVar("AVALANCHE_LOAN_NFT_ADDRESS", loanNFTAddress);
    setEnvVar("AVALANCHE_BRIDGE_RECEIVER_ADDRESS", bridgeReceiverAddress);
    setEnvVar("AVALANCHE_PAYMENT_DISTRIBUTOR_ADDRESS", paymentDistributorAddress);
    setEnvVar("AVALANCHE_LOAN_MARKETPLACE_ADDRESS", marketplaceAddress);

    fs.writeFileSync(envPath, envContent.trim() + "\n");

    // ── 9. Resumen ────────────────────────────────────────────────────────────
    console.log("\n✅ Avalanche Deployment Complete!");
    console.log("📄 Addresses saved to .env\n");

    console.log("📋 Contract Addresses:");
    console.log("  USFCI (proxy):        ", usfciAddress);
    console.log("  USFCI (impl):         ", usfciImpl);
    console.log("  LoanNFT:              ", loanNFTAddress);
    console.log("  BridgeReceiver:       ", bridgeReceiverAddress);
    console.log("  PaymentDistributor:   ", paymentDistributorAddress);
    console.log("  LoanMarketplace:      ", marketplaceAddress);

    console.log("\n🔗 View on Snowtrace (Fuji):");
    console.log(`  USFCI:       https://testnet.snowtrace.io/address/${usfciAddress}`);
    console.log(`  LoanNFT:     https://testnet.snowtrace.io/address/${loanNFTAddress}`);
    console.log(`  Marketplace: https://testnet.snowtrace.io/address/${marketplaceAddress}`);

    console.log("\n⚠️  Next Steps:");
    console.log("  1. Mintear USFCI de prueba a tu wallet:");
    console.log(`     usfci.mintTokens("${deployer.address}", ethers.parseUnits("10000", 18), "test-001")`);
    console.log("  2. Transferir MINTER_ROLE al Relayer cuando esté listo");
    console.log("  3. Actualizar las direcciones en el Relayer (.env)");
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