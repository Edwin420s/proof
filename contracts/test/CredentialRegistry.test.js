const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("CredentialRegistry", function () {
  async function deployContractsFixture() {
    const [owner, issuer, holder, verifier, admin] = await ethers.getSigners();

    // Deploy IssuerRegistry
    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    const issuerRegistry = await IssuerRegistry.deploy();
    await issuerRegistry.waitForDeployment();

    // Deploy CredentialRegistry
    const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    const credentialRegistry = await CredentialRegistry.deploy(await issuerRegistry.getAddress());
    await credentialRegistry.waitForDeployment();

    // Register and verify issuer
    const issuerDID = `did:polygon:${issuer.address}:test`;
    await issuerRegistry.registerIssuer(
      "Test University",
      issuerDID,
      "ipfs://QmTestMetadata"
    );
    await issuerRegistry.verifyIssuer(issuer.address);

    return {
      owner,
      issuer,
      holder,
      verifier,
      admin,
      issuerRegistry,
      credentialRegistry,
      issuerDID
    };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { credentialRegistry, issuerRegistry } = await loadFixture(deployContractsFixture);
      
      expect(await credentialRegistry.getAddress()).to.be.properAddress;
      expect(await credentialRegistry.issuerRegistry()).to.equal(await issuerRegistry.getAddress());
      expect(await credentialRegistry.admin()).to.equal((await ethers.getSigners())[0].address);
    });

    it("Should have correct initial state", async function () {
      const { credentialRegistry } = await loadFixture(deployContractsFixture);
      
      expect(await credentialRegistry.getTotalCredentials()).to.equal(0);
      expect(await credentialRegistry.getTotalProofs()).to.equal(0);
    });
  });

  describe("Credential Issuance", function () {
    it("Should issue a new credential", async function () {
      const { issuer, holder, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const credentialType = "BACHELOR_DEGREE";
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
      const metadataURI = "ipfs://QmCredentialMetadata";
      
      const tx = await credentialRegistry.connect(issuer).issueCredential(
        holder.address,
        credentialType,
        expiresAt,
        metadataURI
      );
      
      const receipt = await tx.wait();
      
      // Check event emission
      const event = receipt.logs.find(log => 
        log.fragment?.name === "CredentialIssued"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.holder).to.equal(holder.address);
      expect(event.args.issuer).to.equal(issuer.address);
      expect(event.args.credentialType).to.equal(credentialType);
      
      // Check credential count
      expect(await credentialRegistry.getTotalCredentials()).to.equal(1);
    });

    it("Should fail if issuer is not verified", async function () {
      const { holder, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const [unverifiedIssuer] = await ethers.getSigners();
      
      await expect(
        credentialRegistry.connect(unverifiedIssuer).issueCredential(
          holder.address,
          "TEST_TYPE",
          0,
          "ipfs://test"
        )
      ).to.be.revertedWith("Only verified issuers can perform this action");
    });

    it("Should fail if holder address is zero", async function () {
      const { issuer, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      await expect(
        credentialRegistry.connect(issuer).issueCredential(
          ethers.ZeroAddress,
          "TEST_TYPE",
          0,
          "ipfs://test"
        )
      ).to.be.revertedWith("Invalid holder address");
    });
  });

  describe("Credential Verification", function () {
    let credentialHash;
    
    beforeEach(async function () {
      const { issuer, holder, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const tx = await credentialRegistry.connect(issuer).issueCredential(
        holder.address,
        "TEST_CREDENTIAL",
        0,
        "ipfs://test"
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "CredentialIssued"
      );
      
      credentialHash = event.args[0]; // credentialHash is first argument
    });

    it("Should verify a valid credential", async function () {
      const { verifier, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test-proof"));
      const verificationData = "test verification";
      
      const tx = await credentialRegistry.connect(verifier).verifyProof(
        credentialHash,
        proofHash,
        verificationData
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "ProofVerified"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.credentialHash).to.equal(credentialHash);
      expect(event.args.verifier).to.equal(verifier.address);
      expect(event.args.isValid).to.be.true;
      
      // Check proof count
      expect(await credentialRegistry.getTotalProofs()).to.equal(1);
    });

    it("Should fail verification for revoked credential", async function () {
      const { issuer, verifier, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      // Revoke credential
      await credentialRegistry.connect(issuer).revokeCredential(
        credentialHash,
        "Test revocation"
      );
      
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test-proof"));
      
      const tx = await credentialRegistry.connect(verifier).verifyProof(
        credentialHash,
        proofHash,
        "test"
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "ProofVerified"
      );
      
      expect(event.args.isValid).to.be.false;
    });

    it("Should fail verification for expired credential", async function () {
      const { issuer, holder, verifier, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      // Issue credential with past expiration
      const pastExpiration = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      const tx = await credentialRegistry.connect(issuer).issueCredential(
        holder.address,
        "EXPIRED_CREDENTIAL",
        pastExpiration,
        "ipfs://expired"
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "CredentialIssued"
      );
      
      const expiredCredentialHash = event.args[0];
      
      // Wait a bit to ensure expiration
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("expired-proof"));
      
      const verifyTx = await credentialRegistry.connect(verifier).verifyProof(
        expiredCredentialHash,
        proofHash,
        "test"
      );
      
      const verifyReceipt = await verifyTx.wait();
      const verifyEvent = verifyReceipt.logs.find(log => 
        log.fragment?.name === "ProofVerified"
      );
      
      expect(verifyEvent.args.isValid).to.be.false;
      
      // Check for expiration event
      const expirationEvent = verifyReceipt.logs.find(log => 
        log.fragment?.name === "CredentialExpired"
      );
      
      expect(expirationEvent).to.not.be.undefined;
    });
  });

  describe("Credential Revocation", function () {
    let credentialHash;
    
    beforeEach(async function () {
      const { issuer, holder, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const tx = await credentialRegistry.connect(issuer).issueCredential(
        holder.address,
        "TEST_CREDENTIAL",
        0,
        "ipfs://test"
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "CredentialIssued"
      );
      
      credentialHash = event.args[0];
    });

    it("Should revoke credential by issuer", async function () {
      const { issuer, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const reason = "Credential was issued in error";
      
      const tx = await credentialRegistry.connect(issuer).revokeCredential(
        credentialHash,
        reason
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "CredentialRevoked"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.credentialHash).to.equal(credentialHash);
      expect(event.args.revokedBy).to.equal(issuer.address);
      expect(event.args.reason).to.equal(reason);
      
      // Check credential status
      const [, , , , , revoked] = await credentialRegistry.checkCredentialValidity(credentialHash);
      expect(revoked).to.be.true;
    });

    it("Should revoke credential by admin", async function () {
      const { owner, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const tx = await credentialRegistry.connect(owner).revokeCredential(
        credentialHash,
        "Admin revocation"
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "CredentialRevoked"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.revokedBy).to.equal(owner.address);
    });

    it("Should fail revocation by unauthorized party", async function () {
      const { verifier, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      await expect(
        credentialRegistry.connect(verifier).revokeCredential(
          credentialHash,
          "Unauthorized"
        )
      ).to.be.revertedWith("Not authorized to revoke this credential");
    });

    it("Should fail revocation for non-existent credential", async function () {
      const { issuer, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      await expect(
        credentialRegistry.connect(issuer).revokeCredential(
          fakeHash,
          "Test"
        )
      ).to.be.revertedWith("Credential does not exist");
    });

    it("Should fail revocation for already revoked credential", async function () {
      const { issuer, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      // First revocation
      await credentialRegistry.connect(issuer).revokeCredential(
        credentialHash,
        "First revocation"
      );
      
      // Second revocation should fail
      await expect(
        credentialRegistry.connect(issuer).revokeCredential(
          credentialHash,
          "Second revocation"
        )
      ).to.be.revertedWith("Credential already revoked");
    });
  });

  describe("Credential Querying", function () {
    let credentialHash;
    let issuerAddress;
    let holderAddress;
    
    beforeEach(async function () {
      const { issuer, holder, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      issuerAddress = issuer.address;
      holderAddress = holder.address;
      
      const tx = await credentialRegistry.connect(issuer).issueCredential(
        holder.address,
        "QUERY_TEST",
        0,
        "ipfs://query-test"
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "CredentialIssued"
      );
      
      credentialHash = event.args[0];
    });

    it("Should get credential details", async function () {
      const { credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const [
        holder,
        issuer,
        credentialType,
        issuedAt,
        expiresAt,
        revoked,
        revokedAt,
        revocationReason,
        metadataURI
      ] = await credentialRegistry.getCredentialDetails(credentialHash);
      
      expect(holder).to.equal(holderAddress);
      expect(issuer).to.equal(issuerAddress);
      expect(credentialType).to.equal("QUERY_TEST");
      expect(issuedAt).to.be.gt(0);
      expect(expiresAt).to.equal(0); // No expiration
      expect(revoked).to.be.false;
      expect(revokedAt).to.equal(0);
      expect(revocationReason).to.equal("");
      expect(metadataURI).to.equal("ipfs://query-test");
    });

    it("Should check credential validity", async function () {
      const { credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const [
        exists,
        valid,
        revoked,
        expired,
        issuedAt,
        expiresAt
      ] = await credentialRegistry.checkCredentialValidity(credentialHash);
      
      expect(exists).to.be.true;
      expect(valid).to.be.true;
      expect(revoked).to.be.false;
      expect(expired).to.be.false;
      expect(issuedAt).to.be.gt(0);
      expect(expiresAt).to.equal(0);
    });

    it("Should return false for non-existent credential", async function () {
      const { credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      const [
        exists,
        valid,
        revoked,
        expired
      ] = await credentialRegistry.checkCredentialValidity(fakeHash);
      
      expect(exists).to.be.false;
      expect(valid).to.be.false;
      expect(revoked).to.be.false;
      expect(expired).to.be.false;
    });

    it("Should get holder credentials", async function () {
      const { holder, issuer, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      // Issue another credential to same holder
      await credentialRegistry.connect(issuer).issueCredential(
        holder.address,
        "SECOND_CREDENTIAL",
        0,
        "ipfs://second"
      );
      
      const holderCredentials = await credentialRegistry.getHolderCredentials(holder.address);
      
      expect(holderCredentials.length).to.equal(2);
      expect(holderCredentials[0]).to.equal(credentialHash);
    });

    it("Should get issuer credentials", async function () {
      const { issuer, holder, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      // Issue another credential by same issuer
      const [otherHolder] = await ethers.getSigners();
      await credentialRegistry.connect(issuer).issueCredential(
        otherHolder.address,
        "OTHER_CREDENTIAL",
        0,
        "ipfs://other"
      );
      
      const issuerCredentials = await credentialRegistry.getIssuerCredentials(issuer.address);
      
      expect(issuerCredentials.length).to.equal(2);
    });
  });

  describe("Admin Functions", function () {
    it("Should transfer admin rights", async function () {
      const { owner, admin, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const tx = await credentialRegistry.connect(owner).transferAdmin(admin.address);
      await tx.wait();
      
      expect(await credentialRegistry.admin()).to.equal(admin.address);
    });

    it("Should fail non-admin transfer", async function () {
      const { issuer, admin, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      await expect(
        credentialRegistry.connect(issuer).transferAdmin(admin.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should update issuer registry", async function () {
      const { owner, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const NewIssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
      const newIssuerRegistry = await NewIssuerRegistry.deploy();
      await newIssuerRegistry.waitForDeployment();
      
      const tx = await credentialRegistry.connect(owner).updateIssuerRegistry(
        await newIssuerRegistry.getAddress()
      );
      
      await tx.wait();
      
      expect(await credentialRegistry.issuerRegistry()).to.equal(
        await newIssuerRegistry.getAddress()
      );
    });

    it("Should fail non-admin issuer registry update", async function () {
      const { issuer, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      await expect(
        credentialRegistry.connect(issuer).updateIssuerRegistry(
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  describe("Proof Generation", function () {
    it("Should generate proof hash", async function () {
      const { verifier, credentialRegistry } = await loadFixture(deployContractsFixture);
      
      const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("test-credential"));
      const nonce = "random-nonce-123";
      
      const proofHash = await credentialRegistry.generateProofHash(
        credentialHash,
        verifier.address,
        nonce
      );
      
      // Verify hash is deterministic
      const expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "string"],
          [credentialHash, verifier.address, nonce]
        )
      );
      
      expect(proofHash).to.equal(expectedHash);
    });
  });
});