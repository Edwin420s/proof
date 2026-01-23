import { ethers } from 'ethers'

/**
 * @file blockchain.js
 * @description Direct blockchain interaction utilities for Proof frontend
 * Handles contract interactions, gas estimation, and event listening
 */

// Contract ABIs will be imported from compiled artifacts
let IssuerRegistryABI, CredentialRegistryABI, DIDRegistryABI, ProofVerifierABI

// Load contract ABIs dynamically
export const loadContractABIs = async () => {
    try {
        // In production, these would be imported from the contracts build folder
        // For now, we'll load them from the environment or API
        const response = await fetch('/api/contracts/abis')
        const abis = await response.json()

        IssuerRegistryABI = abis.issuerRegistry
        CredentialRegistryABI = abis.credentialRegistry
        DIDRegistryABI = abis.didRegistry
        ProofVerifierABI = abis.proofVerifier

        return true
    } catch (error) {
        console.error('Failed to load contract ABIs:', error)
        return false
    }
}

/**
 * Get provider from window.ethereum
 */
export const getProvider = () => {
    if (typeof window.ethereum !== 'undefined') {
        return new ethers.BrowserProvider(window.ethereum)
    }
    throw new Error('MetaMask is not installed')
}

/**
 * Get signer for transactions
 */
export const getSigner = async () => {
    const provider = getProvider()
    return await provider.getSigner()
}

/**
 * Get contract instance with signer
 */
export const getContract = async (address, abi, needsSigner = false) => {
    if (needsSigner) {
        const signer = await getSigner()
        return new ethers.Contract(address, abi, signer)
    } else {
        const provider = getProvider()
        return new ethers.Contract(address, abi, provider)
    }
}

/**
 * Estimate gas for a transaction
 */
export const estimateGas = async (contract, method, ...args) => {
    try {
        const gasEstimate = await contract[method].estimateGas(...args)
        const provider = getProvider()
        const feeData = await provider.getFeeData()

        const gasCost = gasEstimate * (feeData.gasPrice || feeData.maxFeePerGas)
        const gasCostInMatic = ethers.formatEther(gasCost)

        return {
            gasLimit: gasEstimate.toString(),
            gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
            maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
            estimatedCost: gasCostInMatic,
            estimatedCostMatic: parseFloat(gasCostInMatic).toFixed(6)
        }
    } catch (error) {
        console.error('Gas estimation failed:', error)
        throw error
    }
}

/**
 * Execute a transaction with proper error handling
 */
export const executeTransaction = async (contract, method, args = [], options = {}) => {
    try {
        // Estimate gas first
        const gasEstimate = await estimateGas(contract, method, ...args)

        // Execute transaction
        const tx = await contract[method](...args, {
            gasLimit: Math.floor(Number(gasEstimate.gasLimit) * 1.2), // 20% buffer
            ...options
        })

        // Wait for confirmation
        const receipt = await tx.wait()

        return {
            success: true,
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            receipt
        }
    } catch (error) {
        console.error('Transaction failed:', error)
        return {
            success: false,
            error: error.message,
            code: error.code
        }
    }
}

/**
 * Listen to contract events
 */
export const listenToEvent = (contract, eventName, callback) => {
    try {
        contract.on(eventName, (...args) => {
            callback(...args)
        })

        return () => contract.off(eventName, callback)
    } catch (error) {
        console.error(`Failed to listen to ${eventName}:`, error)
        throw error
    }
}

/**
 * Get past events from the blockchain
 */
export const getPastEvents = async (contract, eventName, fromBlock = 0, toBlock = 'latest') => {
    try {
        const filter = contract.filters[eventName]()
        const events = await contract.queryFilter(filter, fromBlock, toBlock)

        return events.map(event => ({
            event: event.eventName,
            args: event.args,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            logIndex: event.logIndex
        }))
    } catch (error) {
        console.error(`Failed to get past ${eventName} events:`, error)
        throw error
    }
}

/**
 * Connect wallet and request account access
 */
export const connectWallet = async () => {
    try {
        const provider = getProvider()
        await provider.send('eth_requestAccounts', [])
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        const network = await provider.getNetwork()

        return {
            success: true,
            address,
            chainId: Number(network.chainId),
            networkName: network.name
        }
    } catch (error) {
        console.error('Wallet connection failed:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Switch to Polygon network
 */
export const switchToPolygon = async (chainId = 80001) => {
    try {
        const chainIdHex = '0x' + chainId.toString(16)

        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }]
        })

        return { success: true }
    } catch (error) {
        // Chain not added, try to add it
        if (error.code === 4902) {
            try {
                const networkConfig = chainId === 80001
                    ? {
                        chainId: '0x13881',
                        chainName: 'Polygon Mumbai Testnet',
                        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                        rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
                        blockExplorerUrls: ['https://mumbai.polygonscan.com']
                    }
                    : {
                        chainId: '0x89',
                        chainName: 'Polygon Mainnet',
                        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                        rpcUrls: ['https://polygon-rpc.com'],
                        blockExplorerUrls: ['https://polygonscan.com']
                    }

                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [networkConfig]
                })

                return { success: true }
            } catch (addError) {
                return { success: false, error: addError.message }
            }
        }

        return { success: false, error: error.message }
    }
}

/**
 * Format blockchain data for display
 */
export const formatters = {
    address: (address) => `${address.slice(0, 6)}...${address.slice(-4)}`,
    hash: (hash) => `${hash.slice(0, 10)}...${hash.slice(-8)}`,
    date: (timestamp) => new Date(Number(timestamp) * 1000).toLocaleString(),
    matic: (value) => parseFloat(ethers.formatEther(value)).toFixed(4)
}

export default {
    loadContractABIs,
    getProvider,
    getSigner,
    getContract,
    estimateGas,
    executeTransaction,
    listenToEvent,
    getPastEvents,
    connectWallet,
    switchToPolygon,
    formatters
}
