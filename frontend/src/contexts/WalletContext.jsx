import { createContext, useState, useEffect, useCallback } from 'react'
import { getProvider, connectWallet as connectBlockchainWallet, switchToPolygon, getContract } from '../utils/blockchain'

const WalletContext = createContext()

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [network, setNetwork] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [contracts, setContracts] = useState({})

  // Contract addresses from environment
  const CONTRACT_ADDRESSES = {
    issuerRegistry: import.meta.env.VITE_ISSUER_REGISTRY_ADDRESS,
    credentialRegistry: import.meta.env.VITE_CREDENTIAL_REGISTRY_ADDRESS,
    didRegistry: import.meta.env.VITE_DID_REGISTRY_ADDRESS,
    proofVerifier: import.meta.env.VITE_PROOF_VERIFIER_ADDRESS
  }

  /**
   * Connect wallet via MetaMask
   */
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await connectBlockchainWallet()

      if (result.success) {
        setWalletAddress(result.address)
        setNetwork(result.networkName)
        setChainId(result.chainId)
        setIsConnected(true)

        // Check if on Polygon network
        const targetChainId = import.meta.env.VITE_CHAIN_ID || 80001 // Mumbai by default
        if (result.chainId !== Number(targetChainId)) {
          await switchNetwork(Number(targetChainId))
        }

        // Initialize contracts
        await initializeContracts()
      } else {
        setError(result.error)
      }
    } catch (err) {
      console.error('Wallet connection error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    setWalletAddress(null)
    setIsConnected(false)
    setNetwork(null)
    setChainId(null)
    setContracts({})
    setError(null)
  }, [])

  /**
   * Switch to Polygon network
   */
  const switchNetwork = useCallback(async (targetChainId = 80001) => {
    try {
      setLoading(true)
      const result = await switchToPolygon(targetChainId)

      if (result.success) {
        setChainId(targetChainId)
        setNetwork(targetChainId === 80001 ? 'Polygon Mumbai' : 'Polygon Mainnet')
        setError(null)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Initialize contract instances with user's signer
   */
  const initializeContracts = useCallback(async () => {
    try {
      // Load contract ABIs (in production, import from compiled artifacts)
      const IssuerRegistryABI = [] // Import from artifacts
      const CredentialRegistryABI = []
      const DIDRegistryABI = []
      const ProofVerifierABI = []

      const contractInstances = {}

      if (CONTRACT_ADDRESSES.issuerRegistry) {
        contractInstances.issuerRegistry = await getContract(
          CONTRACT_ADDRESSES.issuerRegistry,
          IssuerRegistryABI,
          true // needs signer
        )
      }

      if (CONTRACT_ADDRESSES.credentialRegistry) {
        contractInstances.credentialRegistry = await getContract(
          CONTRACT_ADDRESSES.credentialRegistry,
          CredentialRegistryABI,
          true
        )
      }

      if (CONTRACT_ADDRESSES.didRegistry) {
        contractInstances.didRegistry = await getContract(
          CONTRACT_ADDRESSES.didRegistry,
          DIDRegistryABI,
          true
        )
      }

      if (CONTRACT_ADDRESSES.proofVerifier) {
        contractInstances.proofVerifier = await getContract(
          CONTRACT_ADDRESSES.proofVerifier,
          ProofVerifierABI,
          true
        )
      }

      setContracts(contractInstances)
    } catch (err) {
      console.error('Failed to initialize contracts:', err)
      setError(err.message)
    }
  }, [])

  /**
   * Listen to account changes
   */
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else if (accounts[0] !== walletAddress) {
        setWalletAddress(accounts[0])
      }
    }

    const handleChainChanged = (chainId) => {
      setChainId(parseInt(chainId, 16))
      // Reload page on network change (recommended by MetaMask)
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [walletAddress, disconnectWallet])

  /**
   * Check if already connected on mount
   */
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = getProvider()
          const accounts = await provider.listAccounts()

          if (accounts.length > 0) {
            const signer = await provider.getSigner()
            const address = await signer.getAddress()
            const network = await provider.getNetwork()

            setWalletAddress(address)
            setIsConnected(true)
            setNetwork(network.name)
            setChainId(Number(network.chainId))

            await initializeContracts()
          }
        } catch (err) {
          console.error('Failed to check wallet connection:', err)
        }
      }
    }

    checkConnection()
  }, [initializeContracts])

  const value = {
    walletAddress,
    isConnected,
    network,
    chainId,
    loading,
    error,
    contracts,
    connectWallet,
    disconnectWallet,
    switchNetwork
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export default WalletContext