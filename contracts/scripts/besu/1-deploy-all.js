const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying to Besu...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.formatEther(
      await hre.ethers.provider.getBalance(deployer.address)
    ),
    "ETH\n"
  );

  // Obtener dirección del relayer desde la private key
  const relayerWallet = new hre.ethers.Wallet(process.env.RELAYER_PRIVATE_KEY);
  const relayerAddress = relayerWallet.address;
  console.log("Relayer Address:", relayerAddress);
  console.log();

  // 1. Deploy UserRegistry
  console.log("📝 Deploying UserRegistry...");
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy(deployer.address);
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log("✅ UserRegistry:", userRegistryAddress);

  // 2. Deploy USFCI
  console.log("\n📝 Deploying USFCI...");
  const USFCI = await hre.ethers.getContractFactory("USFCI");
  const usfci = await USFCI.deploy(deployer.address);
  await usfci.waitForDeployment();
  const usfciAddress = await usfci.getAddress();
  console.log("✅ USFCI:", usfciAddress);

  // 3. Deploy LoanRegistry (✅ con fix BUG #2)
  console.log("\n📝 Deploying LoanRegistry (with BUG #2 fix)...");
  const LoanRegistry = await hre.ethers.getContractFactory("LoanRegistry");
  const loanRegistry = await LoanRegistry.deploy(
    deployer.address,
    userRegistryAddress
  );
  await loanRegistry.waitForDeployment();
  const loanRegistryAddress = await loanRegistry.getAddress();
  console.log("✅ LoanRegistry:", loanRegistryAddress);

  // 4. Deploy MarketplaceBridge (✅ con fix BUG #4)
  console.log("\n📝 Deploying MarketplaceBridge (with BUG #4 fix)...");
  const MarketplaceBridge = await hre.ethers.getContractFactory("MarketplaceBridge");
  const marketplaceBridge = await MarketplaceBridge.deploy(
    deployer.address,
    loanRegistryAddress,
    userRegistryAddress
  );
  await marketplaceBridge.waitForDeployment();
  const marketplaceBridgeAddress = await marketplaceBridge.getAddress();
  console.log("✅ MarketplaceBridge:", marketplaceBridgeAddress);

  // 5. Deploy ShareLoans
  console.log("\n📝 Deploying ShareLoans...");
  const ShareLoans = await hre.ethers.getContractFactory("ShareLoans");
  const shareLoans = await ShareLoans.deploy(deployer.address);
  await shareLoans.waitForDeployment();
  const shareLoansAddress = await shareLoans.getAddress();
  console.log("✅ ShareLoans:", shareLoansAddress);

  // 6. Deploy Portfolio
  console.log("\n📝 Deploying Portfolio...");
  const Portfolio = await hre.ethers.getContractFactory("Portfolio");
  const portfolio = await Portfolio.deploy(deployer.address);
  await portfolio.waitForDeployment();
  const portfolioAddress = await portfolio.getAddress();
  console.log("✅ Portfolio:", portfolioAddress);

  // 7. Configure MarketplaceBridge in LoanRegistry
  console.log("\n🔧 Configuring LoanRegistry...");
  const setMBTx = await loanRegistry.setMarketplaceBridge(marketplaceBridgeAddress);
  await setMBTx.wait();
  console.log("✅ MarketplaceBridge set in LoanRegistry");

  // 8. Configure Relayer Address in MarketplaceBridge
  console.log("\n🔧 Configuring Relayer Address...");
  const setRelayerTx = await marketplaceBridge.setRelayerAddress(relayerAddress);
  await setRelayerTx.wait();
  console.log("✅ Relayer address set in MarketplaceBridge");

  // 9. Initialize USFCI ledger
  console.log("\n📝 Initializing USFCI ledger...");
  const initTx = await usfci.initLedger();
  await initTx.wait();
  console.log("✅ USFCI Ledger initialized");

  // Verify integration
  console.log("\n🔗 Verifying integration...");
  const registryAddress = await loanRegistry.userRegistry();
  const bridgeAddress = await loanRegistry.marketplaceBridge();
  const configuredRelayer = await marketplaceBridge.relayerAddress();
  
  console.log("LoanRegistry -> UserRegistry:", registryAddress);
  console.log("LoanRegistry -> MarketplaceBridge:", bridgeAddress);
  console.log("MarketplaceBridge -> Relayer:", configuredRelayer);

  const integrationOK =
    registryAddress === userRegistryAddress &&
    bridgeAddress === marketplaceBridgeAddress &&
    configuredRelayer === relayerAddress;

  console.log(
    integrationOK
      ? "✅ Integration verified successfully!"
      : "⚠️ Warning: Integration mismatch!"
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

  // Network info
  const networkName = hre.network.name;
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);

  setEnvVar("BESU_NETWORK_NAME", networkName);
  setEnvVar("BESU_CHAIN_ID", chainId);
  setEnvVar("BESU_DEPLOYER_ADDRESS", deployer.address);
  setEnvVar("BESU_USER_REGISTRY_ADDRESS", userRegistryAddress);
  setEnvVar("BESU_USFCI_ADDRESS", usfciAddress);
  setEnvVar("BESU_LOAN_REGISTRY_ADDRESS", loanRegistryAddress);
  setEnvVar("BESU_MARKETPLACE_BRIDGE_ADDRESS", marketplaceBridgeAddress);
  setEnvVar("BESU_SHARE_LOANS_ADDRESS", shareLoansAddress);
  setEnvVar("BESU_PORTFOLIO_ADDRESS", portfolioAddress);
  setEnvVar("BESU_RELAYER_ADDRESS", relayerAddress);

  fs.writeFileSync(envPath, envContent.trim() + "\n");

  console.log("\n✅ Besu Deployment Complete!");
  console.log("📄 Addresses saved to .env");
  console.log("\n📋 Summary:");
  console.log("  UserRegistry:       ", userRegistryAddress);
  console.log("  USFCI:              ", usfciAddress);
  console.log("  LoanRegistry:       ", loanRegistryAddress);
  console.log("  MarketplaceBridge:  ", marketplaceBridgeAddress);
  console.log("  ShareLoans:         ", shareLoansAddress);
  console.log("  Portfolio:          ", portfolioAddress);
  console.log("  Relayer:            ", relayerAddress);

  console.log("\n✅ System fully configured and ready!");
  console.log("🚀 Next steps:");
  console.log("  1. Deploy Avalanche contracts (if not done)");
  console.log("  2. Start relayer service");
  console.log("  3. Run end-to-end tests");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});