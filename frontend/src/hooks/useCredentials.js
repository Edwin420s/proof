import { useState, useCallback, useEffect } from 'react'
import { mockContract } from '../utils/ethersUtils.js'
import { mockIPFS } from '../utils/ipfsUtils.js'
import { formatDate, formatAddress } from '../utils/formatters.js'

const useCredentials = (walletAddress) => {
  const [credentials, setCredentials] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCredential, setSelectedCredential] = useState(null)

  // Load credentials for current wallet
  const loadCredentials = useCallback(async () => {
    if (!walletAddress) {
      setCredentials([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Mock credentials for demo
      const mockCreds = [
        {
          id: `CRED_${Date.now()}_1`,
          type: 'University Degree',
          issuer: 'University of Cape Town',
          holder: walletAddress,
          issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          expiryDate: null,
          status: 'active',
          attributes: {
            degree: 'BSc Computer Science',
            year: '2024',
            honors: 'Cum Laude',
            institution: 'University of Cape Town'
          },
          verifications: 3,
          ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`
        },
        {
          id: `CRED_${Date.now()}_2`,
          type: 'Age Verification',
          issuer: 'Proof Network',
          holder: walletAddress,
          issuedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          attributes: {
            age: '25+',
            verificationDate: new Date().toISOString().split('T')[0]
          },
          verifications: 8,
          ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`
        }
      ]

      setCredentials(mockCreds)
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading credentials:', err)
      setError(err.message || 'Failed to load credentials')
      setIsLoading(false)
    }
  }, [walletAddress])

  // Issue a new credential
  const issueCredential = useCallback(async (credentialData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate credential data
      if (!credentialData.holder || !credentialData.type || !credentialData.attributes) {
        throw new Error('Invalid credential data')
      }

      // Generate credential ID
      const credentialId = `CRED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Store on IPFS (mock)
      const ipfsResult = await mockIPFS.uploadToIPFS({
        ...credentialData,
        id: credentialId,
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        type: ['VerifiableCredential', credentialData.type],
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: `did:polygon:${credentialData.holder}`,
          ...credentialData.attributes
        }
      })

      // Store on blockchain (mock)
      const blockchainResult = await mockContract.issueCredential(
        credentialData.holder,
        {
          hash: ipfsResult.cid,
          issuer: credentialData.issuer || 'Unknown Issuer',
          issuedAt: Date.now()
        }
      )

      if (!blockchainResult.success) {
        throw new Error('Failed to store credential on blockchain')
      }

      // Create credential object
      const newCredential = {
        id: credentialId,
        type: credentialData.type,
        issuer: credentialData.issuer || 'Unknown Issuer',
        holder: credentialData.holder,
        issuedDate: new Date().toISOString(),
        expiryDate: credentialData.expiryDate || null,
        status: 'active',
        attributes: credentialData.attributes,
        verifications: 0,
        ipfsHash: ipfsResult.cid,
        transactionHash: blockchainResult.transactionHash
      }

      // Add to local state
      setCredentials(prev => [...prev, newCredential])

      setIsLoading(false)
      return {
        success: true,
        credential: newCredential,
        transaction: blockchainResult,
        ipfs: ipfsResult
      }
    } catch (err) {
      console.error('Error issuing credential:', err)
      setError(err.message || 'Failed to issue credential')
      setIsLoading(false)
      return {
        success: false,
        error: err.message
      }
    }
  }, [])

  // Revoke a credential
  const revokeCredential = useCallback(async (credentialId) => {
    setIsLoading(true)
    setError(null)

    try {
      // Find credential
      const credential = credentials.find(c => c.id === credentialId)
      if (!credential) {
        throw new Error('Credential not found')
      }

      // Update on blockchain (mock)
      const result = await mockContract.revokeCredential(credential.ipfsHash)

      if (!result.success) {
        throw new Error('Failed to revoke credential on blockchain')
      }

      // Update local state
      setCredentials(prev => prev.map(c => 
        c.id === credentialId 
          ? { ...c, status: 'revoked', revokedAt: new Date().toISOString() }
          : c
      ))

      setIsLoading(false)
      return {
        success: true,
        credentialId,
        transaction: result
      }
    } catch (err) {
      console.error('Error revoking credential:', err)
      setError(err.message || 'Failed to revoke credential')
      setIsLoading(false)
      return {
        success: false,
        error: err.message
      }
    }
  }, [credentials])

  // Verify a credential
  const verifyCredential = useCallback(async (credentialId) => {
    setIsLoading(true)
    setError(null)

    try {
      // Find credential
      const credential = credentials.find(c => c.id === credentialId)
      if (!credential) {
        throw new Error('Credential not found')
      }

      // Check on blockchain (mock)
      const result = await mockContract.verifyCredential(credential.ipfsHash)

      // Update verification count
      setCredentials(prev => prev.map(c => 
        c.id === credentialId 
          ? { ...c, verifications: (c.verifications || 0) + 1 }
          : c
      ))

      setIsLoading(false)
      return {
        success: result.isValid,
        credential,
        verification: result,
        timestamp: new Date().toISOString()
      }
    } catch (err) {
      console.error('Error verifying credential:', err)
      setError(err.message || 'Failed to verify credential')
      setIsLoading(false)
      return {
        success: false,
        error: err.message
      }
    }
  }, [credentials])

  // Fetch credential details from IPFS
  const fetchCredentialDetails = useCallback(async (credentialId) => {
    setIsLoading(true)
    setError(null)

    try {
      // Find credential
      const credential = credentials.find(c => c.id === credentialId)
      if (!credential) {
        throw new Error('Credential not found')
      }

      // Fetch from IPFS (mock)
      const details = await mockIPFS.fetchFromIPFS(credential.ipfsHash)

      setIsLoading(false)
      return {
        success: true,
        details,
        credential
      }
    } catch (err) {
      console.error('Error fetching credential details:', err)
      setError(err.message || 'Failed to fetch credential details')
      setIsLoading(false)
      return {
        success: false,
        error: err.message
      }
    }
  }, [credentials])

  // Filter credentials by status
  const filterByStatus = useCallback((status) => {
    if (!status || status === 'all') return credentials
    return credentials.filter(c => c.status === status)
  }, [credentials])

  // Search credentials
  const searchCredentials = useCallback((query) => {
    if (!query) return credentials
    
    const searchLower = query.toLowerCase()
    return credentials.filter(c =>
      c.type.toLowerCase().includes(searchLower) ||
      c.issuer.toLowerCase().includes(searchLower) ||
      Object.values(c.attributes).some(value => 
        String(value).toLowerCase().includes(searchLower)
      )
    )
  }, [credentials])

  // Get statistics
  const getStats = useCallback(() => {
    return {
      total: credentials.length,
      active: credentials.filter(c => c.status === 'active').length,
      revoked: credentials.filter(c => c.status === 'revoked').length,
      expired: credentials.filter(c => 
        c.expiryDate && new Date(c.expiryDate) < new Date()
      ).length,
      totalVerifications: credentials.reduce((sum, c) => sum + (c.verifications || 0), 0)
    }
  }, [credentials])

  // Select a credential
  const selectCredential = (credential) => {
    setSelectedCredential(credential)
  }

  // Clear selected credential
  const clearSelectedCredential = () => {
    setSelectedCredential(null)
  }

  // Load credentials on mount or when wallet changes
  useEffect(() => {
    if (walletAddress) {
      loadCredentials()
    } else {
      setCredentials([])
    }
  }, [walletAddress, loadCredentials])

  return {
    credentials,
    selectedCredential,
    isLoading,
    error,
    loadCredentials,
    issueCredential,
    revokeCredential,
    verifyCredential,
    fetchCredentialDetails,
    filterByStatus,
    searchCredentials,
    getStats,
    selectCredential,
    clearSelectedCredential,
    setCredentials // For testing/demo purposes
  }
}

export default useCredentials