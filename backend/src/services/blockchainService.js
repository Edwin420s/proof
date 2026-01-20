const { ethers } = require('ethers');
const { 
  POLYGON_RPC_URL, 
  CONTRACT_ADDRESS,
  ADMIN_WALLET_PRIVATE_KEY,
  ADMIN_WALLET_ADDRESS 
} = require('../config/database');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    this.signer = new ethers.Wallet(ADMIN_WALLET_PRIVATE_KEY, this.provider);
    this.contracts = {};
    this.initialized = false;
  }

  // Initialize contract instances
  async initialize() {
    if (this.initialized) return;

    try {
      // Load contract ABIs
      const IssuerRegistryABI = require('../../contracts/artifacts/contracts/IssuerRegistry.sol/IssuerRegistry.json').abi;
      const CredentialRegistryABI = require('../../contracts/artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json').abi;
      const DIDRegistryABI = require('../../contracts/artifacts/contracts/DIDRegistry.sol/DIDRegistry.json').abi;

      // Create contract instances
      this.contracts.issuerRegistry = new ethers.Contract(
        process.env.ISSUER_REGISTRY_ADDRESS || CONTRACT_ADDRESS,
        IssuerRegistryABI,
        this.signer
      );

      this.contracts.credentialRegistry = new ethers.Contract(
        process.env.CREDENTIAL_REGISTRY_ADDRESS || CONTRACT_ADDRESS,
        CredentialRegistryABI,
        this.signer
      );

      this.contracts.didRegistry = new ethers.Contract(
        process.env.DID_REGISTRY_ADDRESS || CONTRACT_ADDRESS,
        DIDRegistryABI,
        this.signer
      );

      this.initialized = true;
      console.log('✅ Blockchain service initialized');
    } catch (error) {
      console.error('❌ Blockchain service initialization failed:', error);
      throw error;
    }
  }

  // Register issuer on blockchain
  async registerIssuer(issuerData) {
    await this.initialize();

    try {
      const { name, did, walletAddress, metadataURI } = issuerData;

      console.log(`Registering issuer on blockchain: ${name}`);

      const tx = await this.contracts.issuerRegistry.registerIssuer(
        name,
        did,
        metadataURI || 'ipfs://QmDefaultMetadata'
      );

      const receipt = await tx.wait();
      
      console.log(`✅ Issuer registered. Tx hash: ${receipt.hash}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        issuerAddress: walletAddress,
        details: {
          name,
          did,
          registeredAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Register issuer error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Verify issuer on blockchain
  async verifyIssuer(issuerAddress) {
    await this.initialize();

    try {
      console.log(`Verifying issuer: ${issuerAddress}`);

      const tx = await this.contracts.issuerRegistry.verifyIssuer(issuerAddress);
      const receipt = await tx.wait();

      console.log(`✅ Issuer verified. Tx hash: ${receipt.hash}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        issuerAddress,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Verify issuer error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Issue credential on blockchain
  async issueCredential(credentialData) {
    await this.initialize();

    try {
      const { holderAddress, credentialType, expiresAt, metadataURI, issuerAddress } = credentialData;

      console.log(`Issuing credential for ${holderAddress}, type: ${credentialType}`);

      let expiresAtUnix;
      if (expiresAt) {
        expiresAtUnix = Math.floor(new Date(expiresAt).getTime() / 1000);
      } else {
        expiresAtUnix = 0; // No expiration
      }

      const tx = await this.contracts.credentialRegistry.issueCredential(
        holderAddress,
        credentialType,
        expiresAtUnix,
        metadataURI || 'ipfs://QmDefaultCredentialMetadata'
      );

      const receipt = await tx.wait();

      // Parse events to get credential hash
      const event = receipt.logs.find(log => 
        log.fragment?.name === 'CredentialIssued'
      );

      let credentialHash;
      if (event) {
        credentialHash = event.args[0]; // First argument is credentialHash
      } else {
        // Fallback: generate hash from transaction
        credentialHash = ethers.keccak256(ethers.toUtf8Bytes(receipt.hash));
      }

      console.log(`✅ Credential issued. Tx hash: ${receipt.hash}, Credential hash: ${credentialHash}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        credentialHash,
        details: {
          holderAddress,
          credentialType,
          issuerAddress: issuerAddress || this.signer.address,
          issuedAt: new Date().toISOString(),
          expiresAt: expiresAt || null
        }
      };
    } catch (error) {
      console.error('Issue credential error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Revoke credential on blockchain
  async revokeCredential(credentialHash, reason = '') {
    await this.initialize();

    try {
      console.log(`Revoking credential: ${credentialHash}`);

      const tx = await this.contracts.credentialRegistry.revokeCredential(
        credentialHash,
        reason
      );

      const receipt = await tx.wait();

      console.log(`✅ Credential revoked. Tx hash: ${receipt.hash}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        credentialHash,
        revokedAt: new Date().toISOString(),
        reason
      };
    } catch (error) {
      console.error('Revoke credential error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Verify credential on blockchain
  async verifyCredential(credentialHash, proofHash, verificationData = '') {
    await this.initialize();

    try {
      console.log(`Verifying credential: ${credentialHash}`);

      const tx = await this.contracts.credentialRegistry.verifyProof(
        credentialHash,
        proofHash,
        verificationData
      );

      const receipt = await tx.wait();

      // Check if verification was successful
      const event = receipt.logs.find(log => 
        log.fragment?.name === 'ProofVerified'
      );

      const isValid = event ? event.args[4] : false; // Fifth argument is isValid

      console.log(`✅ Credential verified. Valid: ${isValid}, Tx hash: ${receipt.hash}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        credentialHash,
        proofHash,
        isValid,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Verify credential error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Check credential validity on blockchain
  async checkCredentialValidity(credentialHash) {
    await this.initialize();

    try {
      console.log(`Checking credential validity: ${credentialHash}`);

      const result = await this.contracts.credentialRegistry.checkCredentialValidity(
        credentialHash
      );

      const [exists, valid, revoked, expired, issuedAt, expiresAt] = result;

      return {
        success: true,
        exists,
        valid,
        revoked,
        expired,
        issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
        expiresAt: expiresAt > 0 
          ? new Date(Number(expiresAt) * 1000).toISOString()
          : null,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Check credential validity error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Register DID on blockchain
  async registerDID(didData) {
    await this.initialize();

    try {
      const { did, publicKey, serviceEndpoints = [], metadataURI } = didData;

      console.log(`Registering DID: ${did}`);

      const tx = await this.contracts.didRegistry.createDID(
        did,
        publicKey,
        serviceEndpoints,
        metadataURI || 'ipfs://QmDefaultDIDMetadata'
      );

      const receipt = await tx.wait();

      console.log(`✅ DID registered. Tx hash: ${receipt.hash}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        did,
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Register DID error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Get credential details from blockchain
  async getCredentialDetails(credentialHash) {
    await this.initialize();

    try {
      const result = await this.contracts.credentialRegistry.getCredentialDetails(
        credentialHash
      );

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
      ] = result;

      return {
        success: true,
        credentialHash,
        holder,
        issuer,
        credentialType,
        issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
        expiresAt: expiresAt > 0 
          ? new Date(Number(expiresAt) * 1000).toISOString()
          : null,
        revoked,
        revokedAt: revokedAt > 0 
          ? new Date(Number(revokedAt) * 1000).toISOString()
          : null,
        revocationReason,
        metadataURI,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get credential details error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Get issuer details from blockchain
  async getIssuerDetails(issuerAddress) {
    await this.initialize();

    try {
      const result = await this.contracts.issuerRegistry.getIssuerDetails(
        issuerAddress
      );

      const [name, did, isVerified, registeredAt, verifiedAt, metadataURI] = result;

      return {
        success: true,
        issuerAddress,
        name,
        did,
        isVerified,
        registeredAt: new Date(Number(registeredAt) * 1000).toISOString(),
        verifiedAt: verifiedAt > 0 
          ? new Date(Number(verifiedAt) * 1000).toISOString()
          : null,
        metadataURI,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get issuer details error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Check if address is a verified issuer
  async isVerifiedIssuer(issuerAddress) {
    await this.initialize();

    try {
      const isVerified = await this.contracts.issuerRegistry.isVerifiedIssuer(
        issuerAddress
      );

      return {
        success: true,
        issuerAddress,
        isVerified,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Check verified issuer error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Get all verified issuers from blockchain
  async getAllVerifiedIssuers() {
    await this.initialize();

    try {
      const issuers = await this.contracts.issuerRegistry.getAllVerifiedIssuers();

      const formattedIssuers = issuers.map(issuer => ({
        name: issuer.name,
        did: issuer.did,
        walletAddress: issuer.walletAddress,
        isVerified: issuer.isVerified,
        registeredAt: new Date(Number(issuer.registeredAt) * 1000).toISOString(),
        verifiedAt: issuer.verifiedAt > 0 
          ? new Date(Number(issuer.verifiedAt) * 1000).toISOString()
          : null,
        metadataURI: issuer.metadataURI
      }));

      return {
        success: true,
        count: formattedIssuers.length,
        issuers: formattedIssuers,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get all verified issuers error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Get holder's credentials from blockchain
  async getHolderCredentials(holderAddress) {
    await this.initialize();

    try {
      const credentialHashes = await this.contracts.credentialRegistry.getHolderCredentials(
        holderAddress
      );

      // Get details for each credential
      const credentials = await Promise.all(
        credentialHashes.map(async (hash) => {
          try {
            const details = await this.getCredentialDetails(hash);
            return details.success ? details : null;
          } catch (error) {
            console.error(`Error getting credential ${hash}:`, error);
            return null;
          }
        })
      );

      const validCredentials = credentials.filter(c => c !== null);

      return {
        success: true,
        holderAddress,
        credentialCount: validCredentials.length,
        credentials: validCredentials,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get holder credentials error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Get blockchain network info
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getFeeData();

      return {
        success: true,
        network: {
          name: network.name,
          chainId: Number(network.chainId),
          blockNumber,
          gasPrice: {
            gasPrice: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') + ' Gwei' : 'N/A',
            maxFeePerGas: gasPrice.maxFeePerGas ? ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei') + ' Gwei' : 'N/A',
            maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei') + ' Gwei' : 'N/A'
          }
        },
        contracts: {
          issuerRegistry: this.contracts.issuerRegistry?.target || 'Not initialized',
          credentialRegistry: this.contracts.credentialRegistry?.target || 'Not initialized',
          didRegistry: this.contracts.didRegistry?.target || 'Not initialized'
        },
        adminAddress: this.signer.address,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get network info error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Estimate gas for transaction
  async estimateGas(contractMethod, ...args) {
    await this.initialize();

    try {
      const gasEstimate = await contractMethod.estimateGas(...args);
      
      return {
        success: true,
        gasEstimate: Number(gasEstimate),
        gasInGwei: ethers.formatUnits(gasEstimate, 'gwei'),
        estimatedCost: await this.estimateTransactionCost(gasEstimate)
      };
    } catch (error) {
      console.error('Estimate gas error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Estimate transaction cost
  async estimateTransactionCost(gasEstimate) {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('30', 'gwei');
      
      const cost = gasEstimate * gasPrice;
      const costInETH = ethers.formatEther(cost);
      const costInUSD = await this.convertETHtoUSD(costInETH);

      return {
        gasEstimate: Number(gasEstimate),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        totalCost: {
          eth: costInETH,
          usd: costInUSD
        }
      };
    } catch (error) {
      console.error('Estimate transaction cost error:', error);
      return {
        gasEstimate: Number(gasEstimate),
        error: 'Could not estimate cost'
      };
    }
  }

  // Convert ETH to USD (mock - in production use API)
  async convertETHtoUSD(ethAmount) {
    try {
      // Mock conversion rate - in production, use CoinGecko or similar API
      const ethToUSD = 2500; // Mock rate
      const usdValue = parseFloat(ethAmount) * ethToUSD;
      
      return `$${usdValue.toFixed(2)}`;
    } catch (error) {
      return 'N/A';
    }
  }

  // Listen to blockchain events
  async listenToEvents(eventName, callback) {
    await this.initialize();

    try {
      let contract;
      let eventFilter;

      // Determine which contract has the event
      if (this.contracts.issuerRegistry && this.contracts.issuerRegistry.filters[eventName]) {
        contract = this.contracts.issuerRegistry;
      } else if (this.contracts.credentialRegistry && this.contracts.credentialRegistry.filters[eventName]) {
        contract = this.contracts.credentialRegistry;
      } else if (this.contracts.didRegistry && this.contracts.didRegistry.filters[eventName]) {
        contract = this.contracts.didRegistry;
      } else {
        throw new Error(`Event ${eventName} not found in any contract`);
      }

      eventFilter = contract.filters[eventName]();
      
      contract.on(eventFilter, (...args) => {
        const event = args[args.length - 1]; // Last argument is the event object
        callback(event);
      });

      console.log(`✅ Listening to ${eventName} events`);
      
      return {
        success: true,
        eventName,
        contract: contract.target,
        listening: true
      };
    } catch (error) {
      console.error('Listen to events error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Stop listening to events
  async stopListening(eventName) {
    try {
      let contract;

      if (this.contracts.issuerRegistry && this.contracts.issuerRegistry.filters[eventName]) {
        contract = this.contracts.issuerRegistry;
      } else if (this.contracts.credentialRegistry && this.contracts.credentialRegistry.filters[eventName]) {
        contract = this.contracts.credentialRegistry;
      } else if (this.contracts.didRegistry && this.contracts.didRegistry.filters[eventName]) {
        contract = this.contracts.didRegistry;
      } else {
        throw new Error(`Event ${eventName} not found in any contract`);
      }

      contract.removeAllListeners(eventName);
      
      console.log(`✅ Stopped listening to ${eventName} events`);
      
      return {
        success: true,
        eventName,
        stopped: true
      };
    } catch (error) {
      console.error('Stop listening error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

// Initialize on startup if configured
if (process.env.POLYGON_RPC_URL && process.env.ADMIN_WALLET_PRIVATE_KEY) {
  blockchainService.initialize().catch(console.error);
}

module.exports = blockchainService;