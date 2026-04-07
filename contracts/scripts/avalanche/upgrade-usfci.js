const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const proxyAddress = process.env.AVALANCHE_USFCI_ADDRESS;
  if (!proxyAddress) {
    console.error("❌ Error: AVALANCHE_USFCI_ADDRESS not found in .env");
    process.exit(1);
  }

  console.log("🚀 Upgrading USFCI_Avalanche at proxy:", proxyAddress);

  const USFCI = await hre.ethers.getContractFactory("USFCI_Avalanche");
  
  // Actualizar el proxy a la nueva implementación
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, USFCI);
  await upgraded.waitForDeployment();

  const newImpl = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("✅ USFCI Upgraded Successfully!");
  console.log("   Proxy Address:         ", proxyAddress);
  console.log("   New Implementation:    ", newImpl);

  // Actualizar el .env con la nueva implementación
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    const regex = new RegExp(`^AVALANCHE_USFCI_IMPL=.*$`, "m");
    const nextLine = `AVALANCHE_USFCI_IMPL=${newImpl}`;
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, nextLine);
    } else {
      envContent += `\n${nextLine}`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("📄 Updated AVALANCHE_USFCI_IMPL in .env");
  }
}

main().catch((error) => {
  console.error("\n❌ Upgrade failed:");
  console.error(error);
  process.exit(1);
});
