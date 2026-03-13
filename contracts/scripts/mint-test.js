const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Wallet:", deployer.address);

  const usfci = await hre.ethers.getContractAt(
    "USFCI_Avalanche",
    "0x924Ea78fB94818dCC2b96BD591de35577F84984d"
  );

  // Verificar info del contrato
  const version = await usfci.version();
  const reserveBank = await usfci.reserveBank();
  const totalSupply = await usfci.totalSupply();
  console.log("\n📋 Contrato USFCI:");
  console.log("  Version:     ", version);
  console.log("  Reserve Bank:", reserveBank);
  console.log("  Total Supply:", hre.ethers.formatUnits(totalSupply, 18), "USFCI");

  // Balance antes
  const balanceBefore = await usfci.balanceOf(deployer.address);
  console.log("\n💰 Balance antes:", hre.ethers.formatUnits(balanceBefore, 18), "USFCI");

  // Mintear 10,000 USFCI a tu wallet
  const amount = hre.ethers.parseUnits("23000000", 18);
  console.log("\n🪙 Minteando 23000000,000 USFCI...");

  const tx = await usfci.mintTokens(
    deployer.address,
    amount,
    "test-mint-001"
  );

  console.log("  Tx enviada:", tx.hash);
  console.log("  Esperando confirmación...");
  await tx.wait();
  console.log("  ✅ Confirmada!");

  // Balance después
  const balanceAfter = await usfci.balanceOf(deployer.address);
  console.log("\n💰 Balance después:", hre.ethers.formatUnits(balanceAfter, 18), "USFCI");
  console.log("\n✅ Listo! Revisa MetaMask — deberías ver 10,000 USFCI");
  console.log("🔗 Ver en Snowtrace:");
  console.log(`   https://testnet.snowtrace.io/address/${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});