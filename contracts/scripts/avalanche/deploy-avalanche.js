const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying to Avalanche Fuji...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "AVAX\n");

  // Verificar balance
  if (balance === 0n) {
    console.error("❌ Error: No AVAX balance!");
    console.error("\nGet testnet AVAX from:");
    console.error("  https://faucets.chain.link/fuji");
    process.exit(1);
  }

  const validatorAddresses = [
    "0x6189e82021668b868cfc4ffc21e7669b3156add9",
    "0x7f47738f4edf27690bbc6d3d945efe1e7aba1e86",
    "0x9a34dc6594e283278427a4f1a94fc7336dc3ec71",
    "0x9f214c60aaeed8c0b47965b1b359181fd37886f4"
  ];

  const USDC_FUJI = process.env.USDC_FUJI_ADDRESS || "0x5425890298aed601595a70AB815c96711a31Bc65";

  try {
    // 1. Deploy LoanNFT
    console.log("📝 Deploying LoanNFT...");
    const LoanNFT = await hre.ethers.getContractFactory("LoanNFT");
    const loanNFT = await LoanNFT.deploy(deployer.address);
    await loanNFT.waitForDeployment();
    const loanNFTAddress = await loanNFT.getAddress();
    console.log("✅ LoanNFT:", loanNFTAddress);

    // 2. Deploy PaymentDistributor (✅ con fix de solvencia)
    console.log("\n📝 Deploying PaymentDistributor (with solvency fix)...");
    const PaymentDistributor = await hre.ethers.getContractFactory("PaymentDistributor");
    const paymentDistributor = await PaymentDistributor.deploy(
      deployer.address,
      loanNFTAddress,
      USDC_FUJI
    );
    await paymentDistributor.waitForDeployment();
    const paymentDistributorAddress = await paymentDistributor.getAddress();
    console.log("✅ PaymentDistributor:", paymentDistributorAddress);

    // 3. Deploy BridgeReceiver (✅ con fix BUG #1 y #4)
    console.log("\n📝 Deploying BridgeReceiver (with BUG #1 and #4 fixes)...");
    const BridgeReceiver = await hre.ethers.getContractFactory("BridgeReceiver");
    const bridgeReceiver = await BridgeReceiver.deploy(
      deployer.address,
      loanNFTAddress,
      paymentDistributorAddress,
      validatorAddresses,
      3 // requiredSignatures
    );
    await bridgeReceiver.waitForDeployment();
    const bridgeReceiverAddress = await bridgeReceiver.getAddress();
    console.log("✅ BridgeReceiver:", bridgeReceiverAddress);

    // 4. Deploy LoanMarketplace (✅ con fix BUG #3)
    console.log("\n📝 Deploying LoanMarketplace (with BUG #3 fix)...");
    const LoanMarketplace = await hre.ethers.getContractFactory("LoanMarketplace");
    const marketplace = await LoanMarketplace.deploy(
      deployer.address,
      loanNFTAddress,
      USDC_FUJI,
      deployer.address // feeRecipient
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ LoanMarketplace:", marketplaceAddress);

    // 5. Configure bridge receivers
    console.log("\n🔧 Configuring contracts...");

    console.log("  Setting BridgeReceiver in LoanNFT...");
    await (await loanNFT.setBridgeReceiver(bridgeReceiverAddress)).wait();
    console.log("  ✅ LoanNFT configured");

    console.log("  Setting BridgeReceiver in PaymentDistributor...");
    await (await paymentDistributor.setBridgeReceiver(bridgeReceiverAddress)).wait();
    console.log("  ✅ PaymentDistributor configured");

    // 6. Verify setup
    console.log("\n🔗 Verifying BridgeReceiver setup...");
    const validators = await bridgeReceiver.getValidators();
    const requiredSigs = await bridgeReceiver.requiredSignatures();
    console.log("  Validators:", validators.length);
    console.log("  Required signatures:", requiredSigs.toString());

    const loanNFTBridge = await loanNFT.bridgeReceiver();
    const pdBridge = await paymentDistributor.bridgeReceiver();

    const bridgeOK =
      loanNFTBridge === bridgeReceiverAddress &&
      pdBridge === bridgeReceiverAddress;

    console.log(
      bridgeOK
        ? "  ✅ Bridge configuration verified!"
        : "  ⚠️ Warning: Bridge configuration mismatch!"
    );

    // Save to .env
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
    setEnvVar("AVALANCHE_LOAN_NFT_ADDRESS", loanNFTAddress);
    setEnvVar("AVALANCHE_BRIDGE_RECEIVER_ADDRESS", bridgeReceiverAddress);
    setEnvVar("AVALANCHE_PAYMENT_DISTRIBUTOR_ADDRESS", paymentDistributorAddress);
    setEnvVar("AVALANCHE_LOAN_MARKETPLACE_ADDRESS", marketplaceAddress);
    setEnvVar("AVALANCHE_USDC_ADDRESS", USDC_FUJI);

    fs.writeFileSync(envPath, envContent.trim() + "\n");

    console.log("\n✅ Avalanche Deployment Complete!");
    console.log("📄 Addresses saved to .env");
    console.log("\n📋 Contract Addresses:");
    console.log("  LoanNFT:              ", loanNFTAddress);
    console.log("  BridgeReceiver:       ", bridgeReceiverAddress);
    console.log("  PaymentDistributor:   ", paymentDistributorAddress);
    console.log("  LoanMarketplace:      ", marketplaceAddress);

    console.log("\n🔗 View on Snowtrace:");
    console.log(`  https://testnet.snowtrace.io/address/${loanNFTAddress}`);
    console.log(`  https://testnet.snowtrace.io/address/${bridgeReceiverAddress}`);
    console.log(`  https://testnet.snowtrace.io/address/${marketplaceAddress}`);

    console.log("\n⚠️  Next Steps:");
    console.log("  1. Set relayer address in MarketplaceBridge (Besu)");
    console.log("  2. Build and deploy the Relayer service");
    console.log("  3. Test complete flow end-to-end");

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