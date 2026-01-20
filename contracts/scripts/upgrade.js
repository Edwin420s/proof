const hre = require("hardhat");
const { ethers } = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {
  console.log("🔄 Starting contract upgrade process\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}\n`);

  // Load deployment info
  let deployment;
  try {
    deployment = require(`../deployment-${hre.network.name}.json`);
  } catch (error) {
    console.error(`Deployment file not found for network: ${hre.network.name}`);
    process.exit(1);
  }

  // Example: Upgrade IssuerRegistry to V2
  console.log("1. Upgrading IssuerRegistry to V2...");
  
  const IssuerRegistryV2 = await ethers.getContractFactory("IssuerRegistryV2");
  
  try {
    const upgraded = await upgrades.upgradeProxy(
      deployment.contracts.IssuerRegistry,
      IssuerRegistryV2
    );
    
    await upgraded.waitForDeployment();
    
    console.log(`✅ IssuerRegistry upgraded to V2 at: ${await upgraded.getAddress()}`);
    
    // Verify the upgrade
    const version = await upgraded.version();
    console.log(`   New contract version: ${version}`);
    
  } catch (error) {
    console.error(`❌ Upgrade failed: ${error.message}`);
    process.exit(1);
  }

  // Update deployment file
  console.log("\n2. Updating deployment file...");
  
  deployment.contracts.IssuerRegistryV2 = await upgraded.getAddress();
  deployment.upgradedAt = new Date().toISOString();
  deployment.upgradedBy = deployer.address;
  
  const fs = require("fs");
  fs.writeFileSync(
    `deployment-${hre.network.name}-upgraded.json`,
    JSON.stringify(deployment, null, 2)
  );
  
  console.log("✅ Deployment file updated");
  console.log("\n🎉 Upgrade process completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});