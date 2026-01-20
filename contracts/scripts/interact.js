const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🔗 Interacting with Proof Identity Contracts\n");

  // Get contract addresses from deployment file
  let deployment;
  try {
    deployment = require(`../deployment-${hre.network.name}.json`);
  } catch (error) {
    console.error(`Deployment file not found for network: ${hre.network.name}`);
    console.log("Please deploy contracts first using: npx hardhat run scripts/deploy.js");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}\n`);

  // Get contract factories
  const IssuerRegistry = await hre.ethers.getContractFactory("IssuerRegistry");
  const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
  const CredentialRevocationRegistry = await hre.ethers.getContractFactory("CredentialRevocationRegistry");

  // Connect to deployed contracts
  const issuerRegistry = IssuerRegistry.attach(deployment.contracts.IssuerRegistry);
  const credentialRegistry = CredentialRegistry.attach(deployment.contracts.CredentialRegistry);
  const didRegistry = DIDRegistry.attach(deployment.contracts.DIDRegistry);
  
  console.log("✅ Connected to deployed contracts");

  // Example interactions
  await demonstrateContractInteractions(
    deployer,
    issuerRegistry,
    credentialRegistry,
    didRegistry
  );
}

async function demonstrateContractInteractions(
  deployer,
  issuerRegistry,
  credentialRegistry,
  didRegistry
) {
  console.log("\n📋 Example Contract Interactions:\n");

  // 1. Get network info
  console.log("1. Network Information:");
  console.log(`   Issuer Registry: ${await issuerRegistry.getAddress()}`);
  console.log(`   Credential Registry: ${await credentialRegistry.getAddress()}`);
  console.log(`   DID Registry: ${await didRegistry.getAddress()}`);
  console.log(`   Admin: ${await issuerRegistry.admin()}`);

  // 2. Register a test issuer
  console.log("\n2. Registering Test Issuer...");
  const testIssuerWallet = hre.ethers.Wallet.createRandom();
  const testIssuer = await hre.ethers.getSigner(testIssuerWallet.address);
  
  const issuerDID = `did:polygon:${testIssuer.address}:test-issuer`;
  const issuerName = "Test University";
  
  try {
    // Fund test issuer wallet (for test networks)
    if (hre.network.name !== "hardhat") {
      const fundTx = await deployer.sendTransaction({
        to: testIssuer.address,
        value: hre.ethers.parseEther("0.1")
      });
      await fundTx.wait();
      console.log(`   Funded test issuer with 0.1 ETH`);
    }

    // Register issuer
    const registerTx = await issuerRegistry.connect(testIssuer).registerIssuer(
      issuerName,
      issuerDID,
      "ipfs://QmTestIssuerMetadata"
    );
    await registerTx.wait();
    console.log(`   Registered issuer: ${issuerName}`);
    
    // Verify issuer
    const verifyTx = await issuerRegistry.connect(deployer).verifyIssuer(testIssuer.address);
    await verifyTx.wait();
    console.log(`   Verified issuer: ${testIssuer.address}`);
  } catch (error) {
    console.log(`   Issuer already registered or error: ${error.message}`);
  }

  // 3. Get issuer details
  console.log("\n3. Getting Issuer Details...");
  try {
    const issuerDetails = await issuerRegistry.getIssuerDetails(testIssuer.address);
    console.log(`   Name: ${issuerDetails[0]}`);
    console.log(`   DID: ${issuerDetails[1]}`);
    console.log(`   Verified: ${issuerDetails[2]}`);
    console.log(`   Registered At: ${new Date(Number(issuerDetails[3]) * 1000).toISOString()}`);
  } catch (error) {
    console.log(`   Error getting issuer details: ${error.message}`);
  }

  // 4. Register a test DID
  console.log("\n4. Registering Test DID...");
  const testUserWallet = hre.ethers.Wallet.createRandom();
  const testUser = await hre.ethers.getSigner(testUserWallet.address);
  
  const userDID = `did:polygon:${testUser.address}:test-user`;
  const publicKey = "0x" + "0".repeat(64); // Mock public key
  
  try {
    // Fund test user
    if (hre.network.name !== "hardhat") {
      const fundTx = await deployer.sendTransaction({
        to: testUser.address,
        value: hre.ethers.parseEther("0.1")
      });
      await fundTx.wait();
    }

    // Register DID
    const didTx = await didRegistry.connect(testUser).createDID(
      userDID,
      publicKey,
      ["https://api.proofidentity.com/did-service"],
      "ipfs://QmTestUserMetadata"
    );
    await didTx.wait();
    console.log(`   Registered DID: ${userDID}`);
  } catch (error) {
    console.log(`   DID already registered or error: ${error.message}`);
  }

  // 5. Issue a test credential
  console.log("\n5. Issuing Test Credential...");
  try {
    const credentialType = "TEST_CERTIFICATION";
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
    const metadataURI = "ipfs://QmTestCredentialMetadata";
    
    const issueTx = await credentialRegistry.connect(testIssuer).issueCredential(
      testUser.address,
      credentialType,
      expiresAt,
      metadataURI
    );
    
    const receipt = await issueTx.wait();
    
    // Get credential hash from event
    const event = receipt.logs.find(log => 
      log.fragment?.name === "CredentialIssued"
    );
    
    if (event) {
      const credentialHash = event.args[0];
      console.log(`   Credential issued with hash: ${credentialHash}`);
      console.log(`   Transaction: ${receipt.hash}`);
      
      // 6. Verify the credential
      console.log("\n6. Verifying Credential...");
      const proofHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-proof"));
      const verificationData = "Test verification by system";
      
      const verifyCredTx = await credentialRegistry.connect(deployer).verifyProof(
        credentialHash,
        proofHash,
        verificationData
      );
      
      const verifyReceipt = await verifyCredTx.wait();
      console.log(`   Credential verified: ${verifyReceipt.hash}`);
      
      // 7. Check credential validity
      console.log("\n7. Checking Credential Validity...");
      const validity = await credentialRegistry.checkCredentialValidity(credentialHash);
      console.log(`   Exists: ${validity[0]}`);
      console.log(`   Valid: ${validity[1]}`);
      console.log(`   Revoked: ${validity[2]}`);
      console.log(`   Expired: ${validity[3]}`);
      
      // 8. Get credential details
      console.log("\n8. Getting Credential Details...");
      const details = await credentialRegistry.getCredentialDetails(credentialHash);
      console.log(`   Holder: ${details[0]}`);
      console.log(`   Issuer: ${details[1]}`);
      console.log(`   Type: ${details[2]}`);
      console.log(`   Issued At: ${new Date(Number(details[3]) * 1000).toISOString()}`);
      
      // 9. Revoke credential (optional)
      console.log("\n9. Revoking Credential (Optional)...");
      const revokeTx = await credentialRegistry.connect(testIssuer).revokeCredential(
        credentialHash,
        "Test revocation for demonstration"
      );
      
      await revokeTx.wait();
      console.log(`   Credential revoked`);
      
      // 10. Check validity after revocation
      const validityAfter = await credentialRegistry.checkCredentialValidity(credentialHash);
      console.log(`   Valid after revocation: ${validityAfter[1]}`);
      console.log(`   Revoked after revocation: ${validityAfter[2]}`);
    }
  } catch (error) {
    console.log(`   Error in credential operations: ${error.message}`);
  }

  // 11. Get contract statistics
  console.log("\n11. Contract Statistics:");
  try {
    const issuerCount = await issuerRegistry.getIssuerCount();
    const credentialCount = await credentialRegistry.getTotalCredentials();
    const proofCount = await credentialRegistry.getTotalProofs();
    const didCount = await didRegistry.getTotalDIDs();
    
    console.log(`   Total Issuers: ${issuerCount}`);
    console.log(`   Total Credentials: ${credentialCount}`);
    console.log(`   Total Proofs: ${proofCount}`);
    console.log(`   Total DIDs: ${didCount}`);
  } catch (error) {
    console.log(`   Error getting statistics: ${error.message}`);
  }

  // 12. Get verified issuers
  console.log("\n12. Getting Verified Issuers...");
  try {
    const verifiedIssuers = await issuerRegistry.getAllVerifiedIssuers();
    console.log(`   Verified Issuers Count: ${verifiedIssuers.length}`);
    
    verifiedIssuers.forEach((issuer, index) => {
      console.log(`   ${index + 1}. ${issuer.name} (${issuer.walletAddress})`);
    });
  } catch (error) {
    console.log(`   Error getting verified issuers: ${error.message}`);
  }

  console.log("\n✅ Interaction demonstration complete!");
  console.log("\n📋 Next steps:");
  console.log("   - Register more issuers and verifiers");
  console.log("   - Issue credentials to different users");
  console.log("   - Set up revocation registry");
  console.log("   - Implement frontend integration");
}

// Helper function to check balance
async function checkBalance(address) {
  const balance = await hre.ethers.provider.getBalance(address);
  return hre.ethers.formatEther(balance);
}

// Run the interaction script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});