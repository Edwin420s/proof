const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Proof Identity Contracts...\n");

  // Deploy IssuerRegistry
  console.log("📝 Deploying IssuerRegistry...");
  const IssuerRegistry = await hre.ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddress = await issuerRegistry.getAddress();
  console.log(`✅ IssuerRegistry deployed to: ${issuerRegistryAddress}`);

  // Deploy DIDRegistry
  console.log("\n🔐 Deploying DIDRegistry...");
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.waitForDeployment();
  const didRegistryAddress = await didRegistry.getAddress();
  console.log(`✅ DIDRegistry deployed to: ${didRegistryAddress}`);

  // Deploy CredentialRegistry
  console.log("\n📜 Deploying CredentialRegistry...");
  const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy(issuerRegistryAddress);
  await credentialRegistry.waitForDeployment();
  const credentialRegistryAddress = await credentialRegistry.getAddress();
  console.log(`✅ CredentialRegistry deployed to: ${credentialRegistryAddress}`);

  // Register admin as first issuer
  console.log("\n👑 Registering admin as issuer...");
  const [deployer] = await hre.ethers.getSigners();
  
  // Create DID for admin
  const adminDID = `did:polygon:${deployer.address}:admin`;
  
  const tx1 = await issuerRegistry.registerIssuer(
    "Proof Admin",
    adminDID,
    "ipfs://QmAdminMetadata"
  );
  await tx1.wait();
  
  // Verify admin issuer
  const tx2 = await issuerRegistry.verifyIssuer(deployer.address);
  await tx2.wait();
  
  console.log(`✅ Admin registered and verified as issuer`);

  // Deploy mock verifier contract
  console.log("\n🔍 Deploying MockVerifier for testing...");
  const MockVerifier = await hre.ethers.getContractFactory("MockVerifier");
  const mockVerifier = await MockVerifier.deploy();
  await mockVerifier.waitForDeployment();
  const mockVerifierAddress = await mockVerifier.getAddress();
  console.log(`✅ MockVerifier deployed to: ${mockVerifierAddress}`);

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📋 Contract Addresses:");
  console.log(`   IssuerRegistry:     ${issuerRegistryAddress}`);
  console.log(`   DIDRegistry:        ${didRegistryAddress}`);
  console.log(`   CredentialRegistry: ${credentialRegistryAddress}`);
  console.log(`   MockVerifier:       ${mockVerifierAddress}`);
  
  console.log("\n🔗 Network:", hre.network.name);
  console.log("👤 Deployer:", deployer.address);

  // Export addresses to file
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    contracts: {
      IssuerRegistry: issuerRegistryAddress,
      DIDRegistry: didRegistryAddress,
      CredentialRegistry: credentialRegistryAddress,
      MockVerifier: mockVerifierAddress
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployment file");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});