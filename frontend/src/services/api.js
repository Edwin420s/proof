// API service for backend communication
import { formatDate, formatAddress } from '../utils/formatters.js'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Generic fetch wrapper with error handling
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    credentials: 'include', // Include cookies for auth
    ...options
  }

  try {
    const response = await fetch(url, defaultOptions)
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    // Parse JSON response
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error)
    return { 
      success: false, 
      error: error.message || 'Network error',
      status: error.status || 0
    }
  }
}

// Auth API
export const authAPI = {
  // Wallet login
  loginWithWallet: async (walletAddress, signature, nonce) => {
    return await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, nonce })
    })
  },

  // Get nonce for signing
  getNonce: async (walletAddress) => {
    return await fetchAPI(`/auth/nonce/${walletAddress}`)
  },

  // Logout
  logout: async () => {
    return await fetchAPI('/auth/logout', { method: 'POST' })
  },

  // Get current user profile
  getProfile: async () => {
    return await fetchAPI('/auth/profile')
  }
}

// Credentials API
export const credentialsAPI = {
  // Get user's credentials
  getUserCredentials: async (walletAddress) => {
    return await fetchAPI(`/credentials/user/${walletAddress}`)
  },

  // Get credential by ID
  getCredential: async (credentialId) => {
    return await fetchAPI(`/credentials/${credentialId}`)
  },

  // Request a new credential
  requestCredential: async (requestData) => {
    return await fetchAPI('/credentials/request', {
      method: 'POST',
      body: JSON.stringify(requestData)
    })
  },

  // Issue a credential (issuer only)
  issueCredential: async (credentialData) => {
    return await fetchAPI('/credentials/issue', {
      method: 'POST',
      body: JSON.stringify(credentialData)
    })
  },

  // Revoke a credential
  revokeCredential: async (credentialId, reason) => {
    return await fetchAPI(`/credentials/${credentialId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
  },

  // Update credential metadata
  updateCredential: async (credentialId, updates) => {
    return await fetchAPI(`/credentials/${credentialId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  // Search credentials
  searchCredentials: async (query, filters = {}) => {
    const params = new URLSearchParams({ q: query, ...filters }).toString()
    return await fetchAPI(`/credentials/search?${params}`)
  }
}

// Verification API
export const verificationAPI = {
  // Verify a proof
  verifyProof: async (proofData) => {
    return await fetchAPI('/verify/proof', {
      method: 'POST',
      body: JSON.stringify(proofData)
    })
  },

  // Generate a proof
  generateProof: async (credentialId, options = {}) => {
    return await fetchAPI(`/verify/generate/${credentialId}`, {
      method: 'POST',
      body: JSON.stringify(options)
    })
  },

  // Get verification history
  getVerificationHistory: async (walletAddress, limit = 50) => {
    return await fetchAPI(`/verify/history/${walletAddress}?limit=${limit}`)
  },

  // Check verification status
  checkVerification: async (verificationId) => {
    return await fetchAPI(`/verify/status/${verificationId}`)
  }
}

// Issuer API
export const issuerAPI = {
  // Get issuer profile
  getIssuerProfile: async (issuerAddress) => {
    return await fetchAPI(`/issuer/profile/${issuerAddress}`)
  },

  // Get issued credentials
  getIssuedCredentials: async (issuerAddress, page = 1, limit = 20) => {
    return await fetchAPI(`/issuer/credentials/${issuerAddress}?page=${page}&limit=${limit}`)
  },

  // Get pending requests
  getPendingRequests: async (issuerAddress) => {
    return await fetchAPI(`/issuer/requests/${issuerAddress}`)
  },

  // Update request status
  updateRequestStatus: async (requestId, status, notes) => {
    return await fetchAPI(`/issuer/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    })
  },

  // Get issuer statistics
  getIssuerStats: async (issuerAddress) => {
    return await fetchAPI(`/issuer/stats/${issuerAddress}`)
  },

  // Register as issuer
  registerIssuer: async (issuerData) => {
    return await fetchAPI('/issuer/register', {
      method: 'POST',
      body: JSON.stringify(issuerData)
    })
  }
}

// Blockchain API
export const blockchainAPI = {
  // Get transaction status
  getTransactionStatus: async (txHash) => {
    return await fetchAPI(`/blockchain/transaction/${txHash}`)
  },

  // Get network info
  getNetworkInfo: async () => {
    return await fetchAPI('/blockchain/network')
  },

  // Get gas prices
  getGasPrices: async () => {
    return await fetchAPI('/blockchain/gas')
  },

  // Broadcast transaction
  broadcastTransaction: async (signedTx) => {
    return await fetchAPI('/blockchain/broadcast', {
      method: 'POST',
      body: JSON.stringify({ signedTx })
    })
  }
}

// IPFS API
export const ipfsAPI = {
  // Upload file to IPFS
  uploadFile: async (file, metadata = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))

    return await fetchAPI('/ipfs/upload', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData
    })
  },

  // Get file from IPFS
  getFile: async (cid) => {
    return await fetchAPI(`/ipfs/file/${cid}`)
  },

  // Pin content
  pinContent: async (cid) => {
    return await fetchAPI(`/ipfs/pin/${cid}`, { method: 'POST' })
  },

  // Unpin content
  unpinContent: async (cid) => {
    return await fetchAPI(`/ipfs/unpin/${cid}`, { method: 'DELETE' })
  }
}

// Analytics API
export const analyticsAPI = {
  // Track event
  trackEvent: async (eventName, properties = {}) => {
    return await fetchAPI('/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ event: eventName, properties })
    })
  },

  // Get user analytics
  getUserAnalytics: async (walletAddress, period = '30d') => {
    return await fetchAPI(`/analytics/user/${walletAddress}?period=${period}`)
  },

  // Get platform analytics
  getPlatformAnalytics: async (period = '30d') => {
    return await fetchAPI(`/analytics/platform?period=${period}`)
  }
}

// WebSocket connection for real-time updates
export const createWebSocket = (path = '') => {
  const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
  const wsUrl = `${wsBase}${path}`
  
  const ws = new WebSocket(wsUrl)

  return {
    ws,
    onOpen: (callback) => ws.addEventListener('open', callback),
    onMessage: (callback) => ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)
        callback(data)
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }),
    onError: (callback) => ws.addEventListener('error', callback),
    onClose: (callback) => ws.addEventListener('close', callback),
    send: (data) => ws.send(JSON.stringify(data)),
    close: () => ws.close()
  }
}

// Mock API responses for development
export const mockAPI = {
  // Simulate API delay
  simulateDelay: (ms = 500) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock login response
  mockLogin: async (walletAddress) => {
    await mockAPI.simulateDelay(800)
    return {
      success: true,
      data: {
        walletAddress,
        token: `mock-jwt-token-${Date.now()}`,
        user: {
          did: `did:polygon:${walletAddress}`,
          profile: {
            name: 'Demo User',
            email: null,
            avatar: null
          },
          settings: {},
          createdAt: new Date().toISOString()
        }
      }
    }
  },

  // Mock credentials response
  mockCredentials: async (walletAddress) => {
    await mockAPI.simulateDelay(600)
    return {
      success: true,
      data: {
        credentials: [
          {
            id: `CRED_${Date.now()}_1`,
            type: 'University Degree',
            issuer: 'University of Cape Town',
            holder: walletAddress,
            issuedDate: new Date().toISOString(),
            status: 'active',
            attributes: { degree: 'BSc Computer Science', year: '2024' }
          }
        ],
        stats: {
          total: 1,
          active: 1,
          revoked: 0,
          expired: 0
        }
      }
    }
  }
}

export default {
  authAPI,
  credentialsAPI,
  verificationAPI,
  issuerAPI,
  blockchainAPI,
  ipfsAPI,
  analyticsAPI,
  createWebSocket,
  mockAPI
}