import { useState, useCallback } from 'react'
import { mockContract } from '../utils/ethersUtils.js'

const useDID = (walletAddress) => {
  const [did, setDid] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Generate a DID for a wallet address
  const generateDID = useCallback(async () => {
    if (!walletAddress) {
      setError('Wallet address is required')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // In production, this would use Polygon ID SDK or similar
      // For demo, we'll generate a simple DID
      const generatedDID = `did:polygon:${walletAddress.toLowerCase()}`

      // Store the DID mapping (in production, this would be on-chain)
      localStorage.setItem(`did_${walletAddress}`, generatedDID)
      
      setDid(generatedDID)
      setIsLoading(false)
      return generatedDID
    } catch (err) {
      console.error('Error generating DID:', err)
      setError(err.message || 'Failed to generate DID')
      setIsLoading(false)
      return null
    }
  }, [walletAddress])

  // Resolve a DID to get document
  const resolveDID = useCallback(async (didToResolve) => {
    if (!didToResolve) {
      setError('DID is required')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Simulate DID resolution delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock DID document
      const didDocument = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        id: didToResolve,
        verificationMethod: [
          {
            id: `${didToResolve}#keys-1`,
            type: 'Ed25519VerificationKey2020',
            controller: didToResolve,
            publicKeyMultibase: 'z' + Math.random().toString(36).substr(2, 44)
          }
        ],
        authentication: [`${didToResolve}#keys-1`],
        assertionMethod: [`${didToResolve}#keys-1`]
      }

      setIsLoading(false)
      return didDocument
    } catch (err) {
      console.error('Error resolving DID:', err)
      setError(err.message || 'Failed to resolve DID')
      setIsLoading(false)
      return null
    }
  }, [])

  // Verify a DID (check if it's valid)
  const verifyDID = useCallback(async (didToVerify) => {
    if (!didToVerify) {
      return { isValid: false, error: 'DID is required' }
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check if DID format is valid
      const isValidFormat = didToVerify.startsWith('did:polygon:0x') && didToVerify.length > 30
      
      // Check if DID exists (simulated)
      const exists = localStorage.getItem(`did_${didToVerify.split(':')[2]}`) !== null

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 300))

      const result = {
        isValid: isValidFormat && exists,
        did: didToVerify,
        timestamp: new Date().toISOString()
      }

      setIsLoading(false)
      return result
    } catch (err) {
      console.error('Error verifying DID:', err)
      setError(err.message || 'Failed to verify DID')
      setIsLoading(false)
      return { isValid: false, error: err.message }
    }
  }, [])

  // Create a verifiable presentation
  const createVerifiablePresentation = useCallback(async (credentials, options = {}) => {
    if (!credentials || credentials.length === 0) {
      setError('No credentials provided')
      return null
    }

    if (!did) {
      setError('DID not initialized')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Generate a verifiable presentation
      const presentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        type: ['VerifiablePresentation'],
        holder: did,
        verifiableCredential: credentials,
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: `${did}#keys-1`,
          proofPurpose: 'authentication',
          challenge: options.challenge || 'proof-challenge-' + Date.now(),
          domain: options.domain || 'proof.io'
        }
      }

      // Simulate signing delay
      await new Promise(resolve => setTimeout(resolve, 800))

      setIsLoading(false)
      return presentation
    } catch (err) {
      console.error('Error creating presentation:', err)
      setError(err.message || 'Failed to create verifiable presentation')
      setIsLoading(false)
      return null
    }
  }, [did])

  // Check if a DID is trusted (issued by trusted issuer)
  const isTrustedDID = useCallback(async (didToCheck) => {
    if (!didToCheck) {
      return false
    }

    try {
      // Extract address from DID
      const address = didToCheck.split(':')[2]
      if (!address) return false

      // Check against issuer registry (mock)
      const isTrusted = await mockContract.isTrustedIssuer(address)
      return isTrusted
    } catch (err) {
      console.error('Error checking trusted DID:', err)
      return false
    }
  }, [])

  // Load existing DID for current wallet
  const loadDID = useCallback(() => {
    if (!walletAddress) return null

    const storedDID = localStorage.getItem(`did_${walletAddress}`)
    if (storedDID) {
      setDid(storedDID)
      return storedDID
    }
    return null
  }, [walletAddress])

  // Clear/reset DID
  const clearDID = () => {
    setDid(null)
    setError(null)
    if (walletAddress) {
      localStorage.removeItem(`did_${walletAddress}`)
    }
  }

  return {
    did,
    isLoading,
    error,
    generateDID,
    resolveDID,
    verifyDID,
    createVerifiablePresentation,
    isTrustedDID,
    loadDID,
    clearDID
  }
}

export default useDID