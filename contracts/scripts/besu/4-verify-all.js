const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Verifying setup...\n");

    const deployment = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "user-data", "deployment.json")));
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "user-data", "users.json")));

    const userRegistry = await hre.ethers.getContractAt("UserRegistry", deployment.contracts.UserRegistry);
    const usfci = await hre.ethers.getContractAt("USFCI", deployment.contracts.USFCI);

    console.log("📊 UserRegistry Status:");
    console.log("═══════════════════════════════════════");
    const totalUsers = await userRegistry.getTotalUsers();
    console.log(`Total users: ${totalUsers}\n`);

    for (const [key, user] of Object.entries(users)) {
        const onChainUser = await userRegistry.getUser(user.address);
        console.log(`${onChainUser.name}:`);
        console.log(`  UserID: ${onChainUser.userId}`);
        console.log(`  Organization: ${onChainUser.organization}`);
        console.log(`  Role: ${onChainUser.role}`);
        console.log(`  Active: ${onChainUser.isActive}`);
        console.log();
    }

    console.log("💰 USFCI Status:");
    console.log("═══════════════════════════════════════");

    for (const [key, user] of Object.entries(users)) {
        const account = await usfci.getAccountDetails(user.address);
        const balance = await usfci.getBalance(user.address);

        console.log(`${user.name}:`);
        console.log(`  Address: ${user.address}`);
        console.log(`  USFCI Balance: ${hre.ethers.formatEther(balance)}`);
        console.log(`  KYC Status: ${account.kycStatus}`);
        console.log(`  Account Type: ${account.accountType}`);

        if (user.userId === "sunwest_001") {
            const MINTER_ROLE = await usfci.MINTER_ROLE();
            const hasMinter = await usfci.hasRole(MINTER_ROLE, user.address);
            console.log(`Has MINTER role: ${hasMinter}`);
        }
    }
    console.log("✅ Verification complete!");

}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});