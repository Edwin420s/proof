import { useState, useCallback } from 'react'
import { mockAPI } from '../utils/api'

export const useCredentials = () => {
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCredentials = useCallback(async (walletAddress) => {
    if (!walletAddress) return

    setLoading(true)
    setError(null)

    try {
      const data = await mockAPI.getUserCredentials(walletAddress)
      setCredentials(data)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const requestCredential = useCallback(async (requestData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await mockAPI.requestCredential(requestData)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const generateProof = useCallback(async (credentialId, revealAttributes = {}) => {
    setLoading(true)
    setError(null)

    try {
      // Simulate proof generation
      await new Promise(resolve => setTimeout(resolve, 1000))

      const credential = credentials.find(c => c.id === credentialId)
      if (!credential) throw new Error('Credential not found')

      // Generate a mock proof
      const proof = {
        credentialId,
        proofHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        revealedAttributes: revealAttributes,
        timestamp: new Date().toISOString(),
        expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }

      return proof
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [credentials])

  const revokeCredential = useCallback(async (credentialId) => {
    setLoading(true)
    setError(null)

    try {
      // Simulate revocation
      await new Promise(resolve => setTimeout(resolve, 800))

      setCredentials(prev => 
        prev.map(cred => 
          cred.id === credentialId 
            ? { ...cred, status: 'revoked' }
            : cred
        )
      )

      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    credentials,
    loading,
    error,
    fetchCredentials,
    requestCredential,
    generateProof,
    revokeCredential
  }
}