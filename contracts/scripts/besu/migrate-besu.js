const hre = require("hardhat");
require("dotenv").config();

/**
 * migrate-besu.js
 * ───────────────────────────────────────────────────────────────────────────
 * Migra el estado de los contratos VIEJOS (sin proxy) a los contratos
 * NUEVOS (upgradeables con UUPS proxy).
 *
 * Ejecutar DESPUÉS de deploy-besu.js con las nuevas direcciones ya en .env
 *
 * Uso:
 *   npx hardhat run scripts/migrate-besu.js --network besu
 *
 * ⚠️  IMPORTANTE:
 *   - Los contratos viejos se mantienen intactos (solo lectura durante migración)
 *   - Los contratos nuevos deben estar recién desplegados (vacíos)
 *   - Verificar que el deployer tiene rol "admin" en el UserRegistry nuevo
 * ───────────────────────────────────────────────────────────────────────────
 */

// ── Direcciones de los contratos VIEJOS (sin proxy) ──────────────────────
// Poner aquí las direcciones de los contratos originales que quieres migrar
const OLD_CONTRACTS = {
  userRegistry:      process.env.OLD_BESU_USER_REGISTRY_ADDRESS      || "",
  loanRegistry:      process.env.OLD_BESU_LOAN_REGISTRY_ADDRESS      || "",
  marketplaceBridge: process.env.OLD_BESU_MARKETPLACE_BRIDGE_ADDRESS || "",
  shareLoans:        process.env.OLD_BESU_SHARE_LOANS_ADDRESS        || "",
  portfolio:         process.env.OLD_BESU_PORTFOLIO_ADDRESS           || "",
};

// ── Direcciones de los contratos NUEVOS (proxies) ─────────────────────────
// Estas son las que genera deploy-besu.js y guarda en .env
const NEW_CONTRACTS = {
  userRegistry:      process.env.BESU_USER_REGISTRY_ADDRESS      || "",
  loanRegistry:      process.env.BESU_LOAN_REGISTRY_ADDRESS      || "",
  marketplaceBridge: process.env.BESU_MARKETPLACE_BRIDGE_ADDRESS || "",
  shareLoans:        process.env.BESU_SHARE_LOANS_ADDRESS        || "",
  portfolio:         process.env.BESU_PORTFOLIO_ADDRESS           || "",
};

// ── Helper para sleep entre txs (evitar nonce issues en Besu) ─────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("🔄 Starting migration from old contracts to new upgradeable proxies...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Validar que tenemos direcciones
  for (const [name, addr] of Object.entries(OLD_CONTRACTS)) {
    if (!addr) {
      console.error(`❌ Missing OLD address for ${name}. Set OLD_BESU_${name.toUpperCase()}_ADDRESS in .env`);
      process.exit(1);
    }
  }
  for (const [name, addr] of Object.entries(NEW_CONTRACTS)) {
    if (!addr) {
      console.error(`❌ Missing NEW address for ${name}. Run deploy-besu.js first.`);
      process.exit(1);
    }
  }

  // ─────────────────────────────────────────────────────────
  // PASO 1: Migrar UserRegistry
  // ─────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [1/5] Migrating UserRegistry...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const oldUserRegistry = await hre.ethers.getContractAt("UserRegistry", OLD_CONTRACTS.userRegistry);
  const newUserRegistry = await hre.ethers.getContractAt("UserRegistry", NEW_CONTRACTS.userRegistry);

  const allUserAddresses = await oldUserRegistry.allUsers();
  console.log(`Found ${allUserAddresses.length} users to migrate`);

  let migratedUsers = 0;
  for (const addr of allUserAddresses) {
    try {
      const user = await oldUserRegistry.users(addr);
      if (!user.userId || user.userId === "") continue;

      // Verificar que no esté ya migrado
      const alreadyExists = await newUserRegistry.userRegistered(addr);
      if (alreadyExists) {
        console.log(`  ⏭️  Skip ${user.userId} (already exists)`);
        continue;
      }

      const tx = await newUserRegistry.registerUser(
        addr,
        user.userId,
        user.name,
        user.organization,
        user.role
      );
      await tx.wait();

      // Si el usuario estaba inactivo, desactivarlo también
      if (!user.isActive) {
        const deactivateTx = await newUserRegistry.deactivateUser(addr);
        await deactivateTx.wait();
      }

      migratedUsers++;
      console.log(`  ✅ Migrated user: ${user.userId} (${addr})`);
      await sleep(100); // pequeño delay entre txs
    } catch (err) {
      console.log(`  ⚠️  Failed to migrate user ${addr}: ${err.message}`);
    }
  }
  console.log(`✅ UserRegistry: ${migratedUsers}/${allUserAddresses.length} users migrated\n`);

  // ─────────────────────────────────────────────────────────
  // PASO 2: Migrar LoanRegistry
  // ─────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [2/5] Migrating LoanRegistry...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const oldLoanRegistry = await hre.ethers.getContractAt("LoanRegistry", OLD_CONTRACTS.loanRegistry);
  const newLoanRegistry = await hre.ethers.getContractAt("LoanRegistry", NEW_CONTRACTS.loanRegistry);

  const allLoanIds = await oldLoanRegistry.getAllLoanIds();
  console.log(`Found ${allLoanIds.length} loans to migrate`);

  let migratedLoans = 0;
  for (const loanId of allLoanIds) {
    try {
      const loan = await oldLoanRegistry.readLoan(loanId);
      if (!loan.exists) continue;

      // Verificar que no esté ya migrado
      const alreadyExists = await newLoanRegistry.loanExists(loanId);
      if (alreadyExists) {
        console.log(`  ⏭️  Skip loan ${loan.LoanUid} (already exists)`);
        continue;
      }

      const tx = await newLoanRegistry.createLoan(
        loan.LoanUid,
        loan.Account,
        loan.LenderUid,
        loan.OriginalBalance,
        loan.CurrentBalance,
        loan.VendorFeePct,
        loan.NoteRate,
        loan.SoldRate,
        loan.CalcInterestRate,
        loan.CoBorrower,
        loan.ActiveDefaultInterestRate,
        loan.ReserveBalanceRestricted,
        loan.DefaultInterestRate,
        loan.DeferredPrinBal,
        loan.DeferredUnpaidInt,
        loan.DeferredLateCharges,
        loan.DeferredUnpaidCharges,
        loan.MaximumDraw,
        loan.CloseDate,
        loan.DrawStatus,
        loan.LenderFundDate,
        loan.LenderOwnerPct,
        loan.LenderName,
        loan.LenderAccount,
        loan.IsForeclosure,
        loan.Status,
        loan.PaidOffDate,
        loan.PaidToDate,
        loan.MaturityDate,
        loan.NextDueDate,
        loan.City,
        loan.State,
        loan.PropertyZip
      );
      await tx.wait();

      migratedLoans++;
      console.log(`  ✅ Migrated loan: ${loan.LoanUid} (LenderUid: ${loan.LenderUid})`);
      await sleep(100);
    } catch (err) {
      console.log(`  ⚠️  Failed to migrate loan ${loanId}: ${err.message}`);
    }
  }
  console.log(`✅ LoanRegistry: ${migratedLoans}/${allLoanIds.length} loans migrated\n`);

  // ─────────────────────────────────────────────────────────
  // PASO 3: Migrar MarketplaceBridge (solo approvals activos)
  // ─────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [3/5] Migrating MarketplaceBridge approvals...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("ℹ️  Only active (non-cancelled) approvals will be migrated.");
  console.log("ℹ️  Cancelled approvals are historical and do not need migration.\n");

  // Para el MarketplaceBridge, los approvals activos se recriarán
  // cuando los lenders aprueben nuevamente en los nuevos contratos.
  // Si tienes loans que estaban locked/aprobados, necesitas:
  //   1. Unlockearlos en el contrato viejo (emergencyUnlock)
  //   2. Volver a aprobarlos en el contrato nuevo
  // Esto es intencional ya que los locks tienen implicaciones financieras.
  console.log("⚠️  Active loan locks/approvals should be re-approved manually in the new contracts.");
  console.log("    Use emergencyUnlock() on OLD contract for any locked loans, then re-approve.\n");

  // ─────────────────────────────────────────────────────────
  // PASO 4: Migrar ShareLoans
  // ─────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [4/5] Migrating ShareLoans...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("ℹ️  ShareLoans migration requires iterating allShareKeys (private).");
  console.log("    If you need this, add a getAllShareKeys() public function to the old contract");
  console.log("    or migrate shares manually using known keys.\n");

  // ─────────────────────────────────────────────────────────
  // PASO 5: Migrar Portfolio
  // ─────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [5/5] Migrating Portfolio certificates...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const oldPortfolio = await hre.ethers.getContractAt("Portfolio", OLD_CONTRACTS.portfolio);
  const newPortfolio = await hre.ethers.getContractAt("Portfolio", NEW_CONTRACTS.portfolio);

  const allCerts = await oldPortfolio.getAllCertificates();
  console.log(`Found ${allCerts.length} certificates to migrate`);

  let migratedCerts = 0;
  for (const cert of allCerts) {
    try {
      if (!cert.exists || !cert.userId || cert.userId === "") continue;

      const alreadyExists = await newPortfolio.portfolioCertificateExists(cert.userId);
      if (alreadyExists) {
        console.log(`  ⏭️  Skip cert ${cert.userId} (already exists)`);
        continue;
      }

      const tx = await newPortfolio.createPortfolioCertificate(
        cert.userId,
        cert.userAddress,
        cert.loanIds,
        cert.totalPrincipal
      );
      await tx.wait();

      // Si tiene versión > 1, no podemos restaurar historial exacto pero podemos actualizar
      // con los datos actuales (esto crea version 2 en nuevo contrato)
      migratedCerts++;
      console.log(`  ✅ Migrated certificate: ${cert.userId}`);
      await sleep(100);
    } catch (err) {
      console.log(`  ⚠️  Failed to migrate cert ${cert.userId}: ${err.message}`);
    }
  }
  console.log(`✅ Portfolio: ${migratedCerts}/${allCerts.length} certificates migrated\n`);

  // ─────────────────────────────────────────────────────────
  // Resumen final
  // ─────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("✅ Migration Complete!");
  console.log("═══════════════════════════════════════════");
  console.log(`  Users migrated:        ${migratedUsers}`);
  console.log(`  Loans migrated:        ${migratedLoans}`);
  console.log(`  Certificates migrated: ${migratedCerts}`);
  console.log("\n📋 Next steps:");
  console.log("  1. Verify data in new contracts via readLoan(), getUser(), etc.");
  console.log("  2. Update your backend/frontend to point to NEW contract addresses");
  console.log("  3. Re-approve any locked loans in the new MarketplaceBridge");
  console.log("  4. Migrate USFCI token holders manually using mintTokens()");
  console.log("     (get holder list from old contract events or getAllMintRecords())");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});