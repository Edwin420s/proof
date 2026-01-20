// Mock API utilities for demo purposes
// In production, this would use actual fetch or axios to call your backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// Simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const mockAPI = {
  // Auth endpoints
  login: async (walletAddress, signature) => {
    await delay(800)
    return {
      success: true,
      token: 'mock-jwt-token',
      user: {
        walletAddress,
        did: `did:polygon:${walletAddress}`,
        role: 'user'
      }
    }
  },

  // Credential endpoints
  requestCredential: async (data) => {
    await delay(1200)
    return {
      success: true,
      requestId: `REQ_${Date.now()}`,
      message: 'Credential request submitted for review'
    }
  },

  getUserCredentials: async (walletAddress) => {
    await delay(600)
    return [
      {
        id: '1',
        type: 'University Degree',
        issuer: 'University of Cape Town',
        issuedDate: '2024-06-15',
        expiresDate: null,
        status: 'active',
        attributes: { degree: 'BSc Computer Science', year: '2024' }
      },
      {
        id: '2',
        type: 'Age Verification',
        issuer: 'Proof Network',
        issuedDate: '2024-11-20',
        expiresDate: '2025-11-20',
        status: 'active',
        attributes: { age: '25+' }
      }
    ]
  },

  // Verification endpoints
  verifyProof: async (proofData) => {
    await delay(1000)
    const isValid = Math.random() > 0.3 // 70% success rate for demo

    return {
      success: true,
      isValid,
      credential: {
        type: 'University Degree',
        issuer: 'University of Cape Town',
        issuedDate: '2024-06-15',
        attributes: { degree: 'BSc Computer Science' }
      },
      verificationDate: new Date().toISOString()
    }
  },

  // Issuer endpoints
  getIssuerRequests: async (issuerId) => {
    await delay(700)
    return [
      {
        id: 'REQ001',
        applicant: '0x3f...c8a1',
        credentialType: 'University Degree',
        institution: 'University of Cape Town',
        submittedDate: '2024-01-19',
        status: 'pending',
        documents: 2
      }
    ]
  },

  issueCredential: async (requestId, issuerId) => {
    await delay(1500)
    return {
      success: true,
      credentialId: `CRED_${Date.now()}`,
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64)
    }
  }
}

// Helper function for making actual API calls (for production)
export const api = {
  get: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) throw new Error('API request failed')
    return response.json()
  },

  post: async (endpoint, data) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('API request failed')
    return response.json()
  },

  put: async (endpoint, data) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('API request failed')
    return response.json()
  },

  delete: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('API request failed')
    return response.json()
  }
}

// Utility to handle errors
export const handleApiError = (error) => {
  console.error('API Error:', error)
  return {
    success: false,
    message: error.message || 'An unexpected error occurred'
  }
}