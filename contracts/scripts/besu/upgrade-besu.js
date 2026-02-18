const hre = require("hardhat");
const { upgrades } = hre;
require("dotenv").config();

/**
 * upgrade-besu.js
 * ───────────────────────────────────────────────────────────────────────────
 * Upgradea uno o más contratos a una nueva versión de implementación.
 * La dirección del proxy NO CAMBIA — solo cambia la lógica interna.
 *
 * Uso:
 *   npx hardhat run scripts/upgrade-besu.js --network besu
 *
 * Para upgradear un contrato específico, poner UPGRADE_TARGET en .env:
 *   UPGRADE_TARGET=LoanRegistry npx hardhat run scripts/upgrade-besu.js --network besu
 * ───────────────────────────────────────────────────────────────────────────
 */
async function main() {
  console.log("⬆️  Upgrading contracts on Besu...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const target = process.env.UPGRADE_TARGET || "ALL";
  console.log("Target:", target, "\n");

  // ─────────────────────────────────────────────────────────
  // Mapa de contratos: nombre → (factory, dirección del proxy)
  // ─────────────────────────────────────────────────────────
  const contracts = {
    UserRegistry: {
      factory: "UserRegistry",   // nombre del contrato nuevo (puede ser V2, V3, etc.)
      proxy: process.env.BESU_USER_REGISTRY_ADDRESS,
    },
    LoanRegistry: {
      factory: "LoanRegistry",
      proxy: process.env.BESU_LOAN_REGISTRY_ADDRESS,
    },
    MarketplaceBridge: {
      factory: "MarketplaceBridge",
      proxy: process.env.BESU_MARKETPLACE_BRIDGE_ADDRESS,
    },
    ShareLoans: {
      factory: "ShareLoans",
      proxy: process.env.BESU_SHARE_LOANS_ADDRESS,
    },
    Portfolio: {
      factory: "Portfolio",
      proxy: process.env.BESU_PORTFOLIO_ADDRESS,
    },
    USFCI: {
      factory: "USFCI",
      proxy: process.env.BESU_USFCI_ADDRESS,
    },
  };

  // Filtrar por target si se especificó uno
  const toUpgrade = target === "ALL"
    ? Object.entries(contracts)
    : Object.entries(contracts).filter(([name]) => name === target);

  if (toUpgrade.length === 0) {
    console.error(`❌ Contract "${target}" not found. Valid options: ${Object.keys(contracts).join(", ")}`);
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────
  // Ejecutar upgrades
  // ─────────────────────────────────────────────────────────
  for (const [name, config] of toUpgrade) {
    console.log(`📝 Upgrading ${name}...`);

    if (!config.proxy) {
      console.log(`  ⚠️  Skipping ${name}: no proxy address in .env`);
      continue;
    }

    try {
      const Factory = await hre.ethers.getContractFactory(config.factory);

      // validateUpgrade verifica que el nuevo contrato sea compatible con el storage anterior
      await upgrades.validateUpgrade(config.proxy, Factory, { kind: "uups" });
      console.log(`  ✅ Storage layout validated`);

      const upgraded = await upgrades.upgradeProxy(config.proxy, Factory, { kind: "uups" });
      await upgraded.waitForDeployment();

      // Verificar que la dirección del proxy no cambió
      const newAddress = await upgraded.getAddress();
      console.log(`  ✅ ${name} upgraded`);
      console.log(`     Proxy address (unchanged): ${newAddress}`);

      // Intentar obtener la nueva versión
      try {
        const ver = await upgraded.version();
        console.log(`     New version: ${ver}`);
      } catch {
        console.log(`     (no version() function)`);
      }

      console.log();
    } catch (err) {
      console.error(`  ❌ Failed to upgrade ${name}: ${err.message}`);
      console.log();
    }
  }

  console.log("✅ Upgrade process complete!");
  console.log("💡 Proxy addresses remain the same — no frontend/backend changes needed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});