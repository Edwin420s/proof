const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("IssuerRegistry", function () {
  async function deployContractFixture() {
    const [owner, issuer1, issuer2, admin, user] = await ethers.getSigners();

    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    const issuerRegistry = await IssuerRegistry.deploy();
    await issuerRegistry.waitForDeployment();

    return {
      owner,
      issuer1,
      issuer2,
      admin,
      user,
      issuerRegistry
    };
  }

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      const { owner, issuerRegistry } = await loadFixture(deployContractFixture);
      expect(await issuerRegistry.admin()).to.equal(owner.address);
    });

    it("Should have zero initial issuers", async function () {
      const { issuerRegistry } = await loadFixture(deployContractFixture);
      expect(await issuerRegistry.getIssuerCount()).to.equal(0);
    });
  });

  describe("Issuer Registration", function () {
    it("Should register a new issuer", async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const name = "Test University";
      const did = `did:polygon:${issuer1.address}:test`;
      const metadataURI = "ipfs://QmTestMetadata";
      
      const tx = await issuerRegistry.connect(issuer1).registerIssuer(
        name,
        did,
        metadataURI
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment?.name === "IssuerRegistered"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.issuerAddress).to.equal(issuer1.address);
      expect(event.args.name).to.equal(name);
      expect(event.args.did).to.equal(did);
      
      // Check issuer count
      expect(await issuerRegistry.getIssuerCount()).to.equal(1);
      
      // Check issuer details
      const issuer = await issuerRegistry.issuers(issuer1.address);
      expect(issuer.name).to.equal(name);
      expect(issuer.did).to.equal(did);
      expect(issuer.isVerified).to.be.false;
      expect(issuer.walletAddress).to.equal(issuer1.address);
      expect(issuer.metadataURI).to.equal(metadataURI);
      
      // Check DID mapping
      expect(await issuerRegistry.didToIssuer(did)).to.equal(issuer1.address);
    });

    it("Should fail if issuer already registered", async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const did = `did:polygon:${issuer1.address}:test`;
      
      // First registration
      await issuerRegistry.connect(issuer1).registerIssuer(
        "Test University",
        did,
        "ipfs://test"
      );
      
      // Second registration should fail
      await expect(
        issuerRegistry.connect(issuer1).registerIssuer(
          "Another University",
          `did:polygon:${issuer1.address}:another`,
          "ipfs://another"
        )
      ).to.be.revertedWith("Issuer already registered");
    });

    it("Should fail if DID already registered", async function () {
      const { issuer1, issuer2, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const did = "did:polygon:test:123";
      
      // First issuer registers with DID
      await issuerRegistry.connect(issuer1).registerIssuer(
        "University A",
        did,
        "ipfs://a"
      );
      
      // Second issuer tries same DID
      await expect(
        issuerRegistry.connect(issuer2).registerIssuer(
          "University B",
          did,
          "ipfs://b"
        )
      ).to.be.revertedWith("DID already registered");
    });
  });

  describe("Issuer Verification", function () {
    beforeEach(async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await issuerRegistry.connect(issuer1).registerIssuer(
        "Test University",
        `did:polygon:${issuer1.address}:test`,
        "ipfs://test"
      );
    });

    it("Should verify an issuer", async function () {
      const { owner, issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const tx = await issuerRegistry.connect(owner).verifyIssuer(issuer1.address);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => 
        log.fragment?.name === "IssuerVerified"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.issuerAddress).to.equal(issuer1.address);
      expect(event.args.verifiedBy).to.equal(owner.address);
      
      // Check issuer is verified
      const issuer = await issuerRegistry.issuers(issuer1.address);
      expect(issuer.isVerified).to.be.true;
      expect(issuer.verifiedAt).to.be.gt(0);
    });

    it("Should fail verification for non-registered issuer", async function () {
      const { owner, issuer2, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.connect(owner).verifyIssuer(issuer2.address)
      ).to.be.revertedWith("Issuer not registered");
    });

    it("Should fail verification for already verified issuer", async function () {
      const { owner, issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      // First verification
      await issuerRegistry.connect(owner).verifyIssuer(issuer1.address);
      
      // Second verification should fail
      await expect(
        issuerRegistry.connect(owner).verifyIssuer(issuer1.address)
      ).to.be.revertedWith("Issuer already verified");
    });

    it("Should fail verification by non-admin", async function () {
      const { user, issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.connect(user).verifyIssuer(issuer1.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  describe("Issuer Removal", function () {
    let issuerDID;
    
    beforeEach(async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      issuerDID = `did:polygon:${issuer1.address}:test`;
      
      await issuerRegistry.connect(issuer1).registerIssuer(
        "Test University",
        issuerDID,
        "ipfs://test"
      );
    });

    it("Should remove an issuer", async function () {
      const { owner, issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const tx = await issuerRegistry.connect(owner).removeIssuer(issuer1.address);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => 
        log.fragment?.name === "IssuerRemoved"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.issuerAddress).to.equal(issuer1.address);
      expect(event.args.removedBy).to.equal(owner.address);
      
      // Check issuer is removed
      const issuer = await issuerRegistry.issuers(issuer1.address);
      expect(issuer.walletAddress).to.equal(ethers.ZeroAddress);
      
      // Check DID mapping is removed
      expect(await issuerRegistry.didToIssuer(issuerDID)).to.equal(ethers.ZeroAddress);
      
      // Check issuer count
      expect(await issuerRegistry.getIssuerCount()).to.equal(0);
    });

    it("Should fail removal for non-registered issuer", async function () {
      const { owner, issuer2, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.connect(owner).removeIssuer(issuer2.address)
      ).to.be.revertedWith("Issuer not registered");
    });

    it("Should fail removal by non-admin", async function () {
      const { user, issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.connect(user).removeIssuer(issuer1.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  describe("Issuer Querying", function () {
    beforeEach(async function () {
      const { issuer1, issuer2, issuerRegistry } = await loadFixture(deployContractFixture);
      
      // Register two issuers
      await issuerRegistry.connect(issuer1).registerIssuer(
        "University A",
        `did:polygon:${issuer1.address}:a`,
        "ipfs://a"
      );
      
      await issuerRegistry.connect(issuer2).registerIssuer(
        "University B",
        `did:polygon:${issuer2.address}:b`,
        "ipfs://b"
      );
      
      // Verify one issuer
      await issuerRegistry.connect((await ethers.getSigners())[0]).verifyIssuer(issuer1.address);
    });

    it("Should check if issuer is verified", async function () {
      const { issuer1, issuer2, issuerRegistry } = await loadFixture(deployContractFixture);
      
      expect(await issuerRegistry.isVerifiedIssuer(issuer1.address)).to.be.true;
      expect(await issuerRegistry.isVerifiedIssuer(issuer2.address)).to.be.false;
    });

    it("Should get issuer by DID", async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const did = `did:polygon:${issuer1.address}:a`;
      const issuer = await issuerRegistry.getIssuerByDID(did);
      
      expect(issuer.name).to.equal("University A");
      expect(issuer.did).to.equal(did);
      expect(issuer.walletAddress).to.equal(issuer1.address);
    });

    it("Should fail for non-existent DID", async function () {
      const { issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.getIssuerByDID("did:polygon:fake:123")
      ).to.be.revertedWith("No issuer found for this DID");
    });

    it("Should get all verified issuers", async function () {
      const { issuerRegistry } = await loadFixture(deployContractFixture);
      
      const verifiedIssuers = await issuerRegistry.getAllVerifiedIssuers();
      
      expect(verifiedIssuers.length).to.equal(1);
      expect(verifiedIssuers[0].name).to.equal("University A");
      expect(verifiedIssuers[0].isVerified).to.be.true;
    });

    it("Should get issuer count", async function () {
      const { issuerRegistry } = await loadFixture(deployContractFixture);
      
      expect(await issuerRegistry.getIssuerCount()).to.equal(2);
    });

    it("Should get issuer details", async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const [
        name,
        did,
        isVerified,
        registeredAt,
        verifiedAt,
        metadataURI
      ] = await issuerRegistry.getIssuerDetails(issuer1.address);
      
      expect(name).to.equal("University A");
      expect(did).to.equal(`did:polygon:${issuer1.address}:a`);
      expect(isVerified).to.be.true;
      expect(registeredAt).to.be.gt(0);
      expect(verifiedAt).to.be.gt(0);
      expect(metadataURI).to.equal("ipfs://a");
    });

    it("Should fail for non-existent issuer details", async function () {
      const { issuerRegistry } = await loadFixture(deployContractFixture);
      
      const fakeAddress = ethers.Wallet.createRandom().address;
      
      await expect(
        issuerRegistry.getIssuerDetails(fakeAddress)
      ).to.be.revertedWith("Issuer not found");
    });
  });

  describe("Issuer Updates", function () {
    beforeEach(async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await issuerRegistry.connect(issuer1).registerIssuer(
        "Original University",
        `did:polygon:${issuer1.address}:original`,
        "ipfs://original"
      );
      
      await issuerRegistry.connect((await ethers.getSigners())[0]).verifyIssuer(issuer1.address);
    });

    it("Should update issuer metadata", async function () {
      const { issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const newMetadataURI = "ipfs://QmUpdatedMetadata";
      
      const tx = await issuerRegistry.connect(issuer1).updateIssuerMetadata(newMetadataURI);
      await tx.wait();
      
      const issuer = await issuerRegistry.issuers(issuer1.address);
      expect(issuer.metadataURI).to.equal(newMetadataURI);
    });

    it("Should fail metadata update by non-issuer", async function () {
      const { user, issuer1, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.connect(user).updateIssuerMetadata("ipfs://fake")
      ).to.be.revertedWith("Only verified issuers can perform this action");
    });

    it("Should fail metadata update by unverified issuer", async function () {
      const { issuer2, issuerRegistry } = await loadFixture(deployContractFixture);
      
      // Register but don't verify
      await issuerRegistry.connect(issuer2).registerIssuer(
        "Unverified University",
        `did:polygon:${issuer2.address}:unverified`,
        "ipfs://unverified"
      );
      
      await expect(
        issuerRegistry.connect(issuer2).updateIssuerMetadata("ipfs://updated")
      ).to.be.revertedWith("Only verified issuers can perform this action");
    });
  });

  describe("Admin Management", function () {
    it("Should transfer admin rights", async function () {
      const { owner, admin, issuerRegistry } = await loadFixture(deployContractFixture);
      
      const tx = await issuerRegistry.connect(owner).transferAdmin(admin.address);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => 
        log.fragment?.name === "AdminChanged"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.previousAdmin).to.equal(owner.address);
      expect(event.args.newAdmin).to.equal(admin.address);
      
      expect(await issuerRegistry.admin()).to.equal(admin.address);
    });

    it("Should fail admin transfer by non-admin", async function () {
      const { user, admin, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.connect(user).transferAdmin(admin.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should fail admin transfer to zero address", async function () {
      const { owner, issuerRegistry } = await loadFixture(deployContractFixture);
      
      await expect(
        issuerRegistry.connect(owner).transferAdmin(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });
});