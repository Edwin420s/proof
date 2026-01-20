// Smart contract interaction service
// This service handles all blockchain interactions for the Proof project

import { ethers } from 'ethers'

// Contract ABIs (simplified for demo)
const IssuerRegistryABI = [
  "function addIssuer(address issuer, string memory name) external",
  "function removeIssuer(address issuer) external",
  "function isTrustedIssuer(address issuer) external view returns (bool)",
  "function getIssuerInfo(address issuer) external view returns (string memory, uint256, bool)",
  "function getAllIssuers() external view returns (address[] memory)",
  "event IssuerAdded(address indexed issuer, string name, uint256 timestamp)",
  "event IssuerRemoved(address indexed issuer, uint256 timestamp)"
]

const CredentialRegistryABI = [
  "function issueCredential(address holder, bytes32 credentialHash, string memory credentialType) external returns (uint256)",
  "function revokeCredential(bytes32 credentialHash) external",
  "function verifyCredential(bytes32 credentialHash) external view returns (bool, address, uint256)",
  "function getCredentialInfo(bytes32 credentialHash) external view returns (address, address, uint256, bool, string memory)",
  "function getHolderCredentials(address holder) external view returns (bytes32[] memory)",
  "event CredentialIssued(bytes32 indexed credentialHash, address indexed issuer, address indexed holder, uint256 timestamp)",
  "event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp)"
]

const DIDRegistryABI = [
  "function registerDID(address wallet, string memory did) external",
  "function resolveDID(address wallet) external view returns (string memory)",
  "function resolveWallet(string memory did) external view returns (address)",
  "function updateDID(address wallet, string memory newDID) external",
  "event DIDRegistered(address indexed wallet, string did, uint256 timestamp)",
  "event DIDUpdated(address indexed wallet, string newDID, uint256 timestamp)"
]

// Contract addresses (testnet)
const CONTRACT_ADDRESSES = {
  polygonMumbai: {
    issuerRegistry: '0x1234567890123456789012345678901234567890',
    credentialRegistry: '0x2345678901234567890123456789012345678901',
    didRegistry: '0x3456789012345678901234567890123456789012'
  },
  polygonMainnet: {
    issuerRegistry: '0x4567890123456789012345678901234567890123',
    credentialRegistry: '0x5678901234567890123456789012345678901234',
    didRegistry: '0x6789012345678901234567890123456789012345'
  }
}

class ContractService {
  constructor() {
    this.provider = null
    this.signer = null
    this.contracts = {}
    this.network = null
  }

  // Initialize with provider
  async initialize(network = 'polygonMumbai', provider = null) {
    try {
      // Set network
      this.network = network
      
      // Create provider
      if (provider) {
        this.provider = provider
      } else if (window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum)
      } else {
        // Fallback to public RPC
        const rpcUrl = network === 'polygonMainnet' 
          ? 'https://polygon-rpc.com'
          : 'https://rpc-mumbai.maticvigil.com'
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      }

      // Get signer if available
      if (window.ethereum) {
        this.signer = this.provider.getSigner()
      }

      // Initialize contracts
      await this.initializeContracts()
      
      return { success: true, network }
    } catch (error) {
      console.error('Error initializing ContractService:', error)
      return { success: false, error: error.message }
    }
  }

  // Initialize contract instances
  async initializeContracts() {
    const addresses = CONTRACT_ADDRESSES[this.network]
    
    if (!addresses) {
      throw new Error(`No contract addresses found for network: ${this.network}`)
    }

    // Create contract instances
    this.contracts = {
      issuerRegistry: new ethers.Contract(
        addresses.issuerRegistry,
        IssuerRegistryABI,
        this.signer || this.provider
      ),
      credentialRegistry: new ethers.Contract(
        addresses.credentialRegistry,
        CredentialRegistryABI,
        this.signer || this.provider
      ),
      didRegistry: new ethers.Contract(
        addresses.didRegistry,
        DIDRegistryABI,
        this.signer || this.provider
      )
    }
  }

  // ===== Issuer Registry Functions =====

  // Check if address is trusted issuer
  async isTrustedIssuer(address) {
    try {
      const isTrusted = await this.contracts.issuerRegistry.isTrustedIssuer(address)
      return { success: true, isTrusted }
    } catch (error) {
      console.error('Error checking trusted issuer:', error)
      return { success: false, error: error.message }
    }
  }

  // Get issuer info
  async getIssuerInfo(address) {
    try {
      const [name, registeredAt, isActive] = await this.contracts.issuerRegistry.getIssuerInfo(address)
      return {
        success: true,
        info: {
          name,
          registeredAt: new Date(registeredAt.toNumber() * 1000),
          isActive
        }
      }
    } catch (error) {
      console.error('Error getting issuer info:', error)
      return { success: false, error: error.message }
    }
  }

  // Get all trusted issuers
  async getAllIssuers() {
    try {
      const issuerAddresses = await this.contracts.issuerRegistry.getAllIssuers()
      return { success: true, issuers: issuerAddresses }
    } catch (error) {
      console.error('Error getting all issuers:', error)
      return { success: false, error: error.message }
    }
  }

  // Add new issuer (admin only)
  async addIssuer(issuerAddress, issuerName) {
    try {
      if (!this.signer) {
        throw new Error('Signer required for this operation')
      }

      const tx = await this.contracts.issuerRegistry.addIssuer(issuerAddress, issuerName)
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        issuerAddress,
        issuerName
      }
    } catch (error) {
      console.error('Error adding issuer:', error)
      return { success: false, error: error.message }
    }
  }

  // Remove issuer (admin only)
  async removeIssuer(issuerAddress) {
    try {
      if (!this.signer) {
        throw new Error('Signer required for this operation')
      }

      const tx = await this.contracts.issuerRegistry.removeIssuer(issuerAddress)
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        issuerAddress
      }
    } catch (error) {
      console.error('Error removing issuer:', error)
      return { success: false, error: error.message }
    }
  }

  // ===== Credential Registry Functions =====

  // Issue a credential
  async issueCredential(holderAddress, credentialHash, credentialType) {
    try {
      if (!this.signer) {
        throw new Error('Signer required for this operation')
      }

      const tx = await this.contracts.credentialRegistry.issueCredential(
        holderAddress,
        credentialHash,
        credentialType
      )
      const receipt = await tx.wait()
      
      // Find CredentialIssued event
      const event = receipt.events?.find(e => e.event === 'CredentialIssued')
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        credentialHash,
        holderAddress,
        credentialType,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error issuing credential:', error)
      return { success: false, error: error.message }
    }
  }

  // Revoke a credential
  async revokeCredential(credentialHash) {
    try {
      if (!this.signer) {
        throw new Error('Signer required for this operation')
      }

      const tx = await this.contracts.credentialRegistry.revokeCredential(credentialHash)
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        credentialHash,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error revoking credential:', error)
      return { success: false, error: error.message }
    }
  }

  // Verify a credential
  async verifyCredential(credentialHash) {
    try {
      const [isValid, issuer, issuedAt] = await this.contracts.credentialRegistry.verifyCredential(credentialHash)
      
      return {
        success: true,
        isValid,
        issuer,
        issuedAt: new Date(issuedAt.toNumber() * 1000),
        credentialHash
      }
    } catch (error) {
      console.error('Error verifying credential:', error)
      return { success: false, error: error.message }
    }
  }

  // Get credential info
  async getCredentialInfo(credentialHash) {
    try {
      const [holder, issuer, issuedAt, isRevoked, credentialType] = 
        await this.contracts.credentialRegistry.getCredentialInfo(credentialHash)
      
      return {
        success: true,
        info: {
          holder,
          issuer,
          issuedAt: new Date(issuedAt.toNumber() * 1000),
          isRevoked,
          credentialType
        }
      }
    } catch (error) {
      console.error('Error getting credential info:', error)
      return { success: false, error: error.message }
    }
  }

  // Get all credentials for a holder
  async getHolderCredentials(holderAddress) {
    try {
      const credentialHashes = await this.contracts.credentialRegistry.getHolderCredentials(holderAddress)
      
      return {
        success: true,
        credentials: credentialHashes.map(hash => ({
          hash,
          holder: holderAddress
        }))
      }
    } catch (error) {
      console.error('Error getting holder credentials:', error)
      return { success: false, error: error.message }
    }
  }

  // ===== DID Registry Functions =====

  // Register a DID
  async registerDID(walletAddress, did) {
    try {
      if (!this.signer) {
        throw new Error('Signer required for this operation')
      }

      const tx = await this.contracts.didRegistry.registerDID(walletAddress, did)
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        walletAddress,
        did,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error registering DID:', error)
      return { success: false, error: error.message }
    }
  }

  // Resolve DID from wallet address
  async resolveDID(walletAddress) {
    try {
      const did = await this.contracts.didRegistry.resolveDID(walletAddress)
      return { success: true, did, walletAddress }
    } catch (error) {
      console.error('Error resolving DID:', error)
      return { success: false, error: error.message }
    }
  }

  // Resolve wallet address from DID
  async resolveWallet(did) {
    try {
      const walletAddress = await this.contracts.didRegistry.resolveWallet(did)
      return { success: true, walletAddress, did }
    } catch (error) {
      console.error('Error resolving wallet:', error)
      return { success: false, error: error.message }
    }
  }

  // Update DID
  async updateDID(walletAddress, newDID) {
    try {
      if (!this.signer) {
        throw new Error('Signer required for this operation')
      }

      const tx = await this.contracts.didRegistry.updateDID(walletAddress, newDID)
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        walletAddress,
        newDID,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error updating DID:', error)
      return { success: false, error: error.message }
    }
  }

  // ===== Utility Functions =====

  // Hash credential data
  hashCredentialData(credentialData) {
    try {
      const jsonString = JSON.stringify(credentialData, null, 0)
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(jsonString))
      return { success: true, hash }
    } catch (error) {
      console.error('Error hashing credential data:', error)
      return { success: false, error: error.message }
    }
  }

  // Validate Ethereum address
  validateAddress(address) {
    try {
      const isValid = ethers.utils.isAddress(address)
      return { success: true, isValid }
    } catch (error) {
      return { success: false, isValid: false, error: error.message }
    }
  }

  // Get network info
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork()
      const blockNumber = await this.provider.getBlockNumber()
      const gasPrice = await this.provider.getGasPrice()
      
      return {
        success: true,
        network: {
          name: network.name,
          chainId: network.chainId,
          blockNumber,
          gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei')
        }
      }
    } catch (error) {
      console.error('Error getting network info:', error)
      return { success: false, error: error.message }
    }
  }

  // Get transaction info
  async getTransactionInfo(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash)
      const receipt = await this.provider.getTransactionReceipt(txHash)
      
      return {
        success: true,
        transaction: {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.utils.formatEther(tx.value),
          gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei'),
          gasLimit: tx.gasLimit.toString(),
          nonce: tx.nonce,
          data: tx.data
        },
        receipt: {
          status: receipt.status === 1 ? 'success' : 'failed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          logs: receipt.logs
        }
      }
    } catch (error) {
      console.error('Error getting transaction info:', error)
      return { success: false, error: error.message }
    }
  }

  // Estimate gas for transaction
  async estimateGas(method, ...args) {
    try {
      const gasEstimate = await method.estimateGas(...args)
      return {
        success: true,
        gasEstimate: gasEstimate.toString(),
        gasEstimateGwei: ethers.utils.formatUnits(gasEstimate, 'gwei')
      }
    } catch (error) {
      console.error('Error estimating gas:', error)
      return { success: false, error: error.message }
    }
  }

  // ===== Mock Functions for Demo =====

  // Mock contract calls for development
  mock = {
    // Mock issue credential
    issueCredential: async (holderAddress, credentialHash, credentialType) => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        credentialHash,
        holderAddress,
        credentialType,
        timestamp: new Date().toISOString()
      }
    },

    // Mock verify credential
    verifyCredential: async (credentialHash) => {
      await new Promise(resolve => setTimeout(resolve, 800))
      return {
        success: true,
        isValid: Math.random() > 0.3,
        issuer: '0x' + Math.random().toString(16).substr(2, 40),
        issuedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        credentialHash
      }
    },

    // Mock check trusted issuer
    isTrustedIssuer: async (address) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      return {
        success: true,
        isTrusted: address?.startsWith('0x')
      }
    }
  }
}

// Create singleton instance
const contractService = new ContractService()

export default contractService