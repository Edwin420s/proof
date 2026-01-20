import { useState, useCallback } from 'react'
import { mockContract } from '../utils/ethersUtils'

export const useWallet = () => {
  const [address, setAddress] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

  const connect = useCallback(async (walletType = 'metamask') => {
    setIsConnecting(true)
    setError(null)

    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Generate a mock address
      const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`
      setAddress(mockAddress)

      return { success: true, address: mockAddress }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setError(null)
  }, [])

  const signMessage = useCallback(async (message) => {
    if (!address) throw new Error('Wallet not connected')

    // Simulate signing
    await new Promise(resolve => setTimeout(resolve, 500))
    return `0x${Math.random().toString(16).substr(2, 130)}`
  }, [address])

  const getCredentials = useCallback(async () => {
    if (!address) return []

    // Simulate fetching credentials
    await new Promise(resolve => setTimeout(resolve, 800))
    return [
      {
        id: '1',
        type: 'University Degree',
        issuer: 'University of Cape Town',
        issuedDate: '2024-06-15',
        status: 'active'
      }
    ]
  }, [address])

  const issueCredential = useCallback(async (credentialData) => {
    if (!address) throw new Error('Wallet not connected')
    return mockContract.issueCredential(address, credentialData)
  }, [address])

  const verifyCredential = useCallback(async (proofHash) => {
    return mockContract.verifyCredential(proofHash)
  }, [])

  return {
    address,
    isConnected: !!address,
    isConnecting,
    error,
    connect,
    disconnect,
    signMessage,
    getCredentials,
    issueCredential,
    verifyCredential
  }
}