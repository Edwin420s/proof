import { useState, useEffect, useCallback } from 'react'

const useWallet = () => {
  const [address, setAddress] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask
  }

  // Check if already connected
  const checkConnection = useCallback(async () => {
    if (!isMetaMaskInstalled()) return false

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        setAddress(accounts[0])
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setChainId(chainId)
        return true
      }
      return false
    } catch (err) {
      console.error('Error checking connection:', err)
      return false
    }
  }, [])

  // Connect wallet
  const connect = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install it to continue.')
      return false
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        setAddress(accounts[0])
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setChainId(chainId)
        setIsConnecting(false)
        return true
      }
    } catch (err) {
      console.error('Error connecting wallet:', err)
      setError(err.message || 'Failed to connect wallet')
      setIsConnecting(false)
      return false
    }

    setIsConnecting(false)
    return false
  }

  // Disconnect wallet
  const disconnect = () => {
    setAddress(null)
    setChainId(null)
    setError(null)
  }

  // Sign message
  const signMessage = async (message) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      })
      return signature
    } catch (err) {
      console.error('Error signing message:', err)
      throw err
    }
  }

  // Switch network
  const switchNetwork = async (networkId) => {
    if (!isMetaMaskInstalled()) return false

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkId }]
      })
      return true
    } catch (err) {
      if (err.code === 4902) {
        // Chain not added, try to add it
        return await addNetwork(networkId)
      }
      console.error('Error switching network:', err)
      return false
    }
  }

  // Add network
  const addNetwork = async (networkId) => {
    const networks = {
      '0x89': { // Polygon Mainnet
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
      },
      '0x13881': { // Mumbai Testnet
        chainId: '0x13881',
        chainName: 'Polygon Mumbai',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
        blockExplorerUrls: ['https://mumbai.polygonscan.com']
      }
    }

    const network = networks[networkId]
    if (!network) {
      throw new Error('Network not supported')
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [network]
      })
      return true
    } catch (err) {
      console.error('Error adding network:', err)
      return false
    }
  }

  // Get wallet balance
  const getBalance = async (addressToCheck = address) => {
    if (!addressToCheck || !isMetaMaskInstalled()) return null

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [addressToCheck, 'latest']
      })
      return parseInt(balance, 16) / 1e18 // Convert from wei
    } catch (err) {
      console.error('Error getting balance:', err)
      return null
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAddress(accounts[0])
      }
    }

    const handleChainChanged = (chainId) => {
      setChainId(chainId)
      window.location.reload() // Recommended by MetaMask docs
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    // Check initial connection
    checkConnection()

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [checkConnection])

  return {
    address,
    chainId,
    isConnected: !!address,
    isConnecting,
    error,
    connect,
    disconnect,
    signMessage,
    switchNetwork,
    getBalance,
    isMetaMaskInstalled: isMetaMaskInstalled()
  }
}

export default useWallet