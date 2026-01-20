const { ethers } = require('ethers');
const { 
  POLYGON_RPC_URL, 
  CONTRACT_ADDRESS, 
  ADMIN_WALLET_PRIVATE_KEY 
} = require('../config/database');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    this.wallet = new ethers.Wallet(ADMIN_WALLET_PRIVATE_KEY, this.provider);
  }

  // Deploy smart contract
  async deployContract(contractName, contractFactory, constructorArgs = []) {
    try {
      console.log(`Deploying ${contractName}...`);
      
      const factory = new ethers.ContractFactory(
        contractFactory.abi,
        contractFactory.bytecode,
        this.wallet
      );

      const contract = await factory.deploy(...constructorArgs);
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      console.log(`${contractName} deployed at: ${address}`);
      
      return {
        address,
        contract
      };
    } catch (error) {
      console.error(`Error deploying ${contractName}:`, error);
      throw error;
    }
  }

  // Interact with credential registry
  async registerCredential(credentialHash, holderAddress, metadata = {}) {
    try {
      // This would interact with the CredentialRegistry contract
      // For now, return a mock transaction
      const tx = {
        hash: ethers.keccak256(ethers.toUtf8Bytes(credentialHash + Date.now())),
        credentialHash,
        holderAddress,
        metadata,
        timestamp: Date.now()
      };

      return tx;
    } catch (error) {
      console.error('Error registering credential:', error);
      throw error;
    }
  }

  // Verify credential on-chain
  async verifyCredential(credentialHash) {
    try {
      // This would query the CredentialRegistry contract
      // For now, return mock verification
      const isValid = true; // Mock verification
      
      return {
        valid: isValid,
        credentialHash,
        verifiedAt: Date.now(),
        onChain: true
      };
    } catch (error) {
      console.error('Error verifying credential:', error);
      throw error;
    }
  }

  // Revoke credential on-chain
  async revokeCredential(credentialHash, reason = '') {
    try {
      // This would call the revoke function on CredentialRegistry
      // For now, return mock transaction
      const tx = {
        hash: ethers.keccak256(ethers.toUtf8Bytes(`revoke-${credentialHash}-${Date.now()}`)),
        credentialHash,
        reason,
        revokedAt: Date.now(),
        revokedBy: this.wallet.address
      };

      return tx;
    } catch (error) {
      console.error('Error revoking credential:', error);
      throw error;
    }
  }

  // Register issuer on-chain
  async registerIssuer(issuerAddress, issuerInfo) {
    try {
      // This would interact with the IssuerRegistry contract
      const tx = {
        hash: ethers.keccak256(ethers.toUtf8Bytes(`issuer-${issuerAddress}-${Date.now()}`)),
        issuerAddress,
        issuerInfo,
        registeredAt: Date.now(),
        registeredBy: this.wallet.address
      };

      return tx;
    } catch (error) {
      console.error('Error registering issuer:', error);
      throw error;
    }
  }

  // Check if address is a registered issuer
  async isRegisteredIssuer(address) {
    try {
      // This would query the IssuerRegistry contract
      // For now, return mock response
      return {
        isIssuer: true,
        address,
        verified: true
      };
    } catch (error) {
      console.error('Error checking issuer:', error);
      throw error;
    }
  }
}

module.exports = new BlockchainService();