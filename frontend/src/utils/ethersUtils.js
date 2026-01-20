// Mock blockchain utilities for demo purposes
// In production, this would use actual ethers.js to interact with smart contracts

export const mockContract = {
  // Mock function to check if an address is a trusted issuer
  isTrustedIssuer: async (address) => {
    // Simulate blockchain call
    await new Promise(resolve => setTimeout(resolve, 500))
    return address?.startsWith('0x') // Simple check for demo
  },

  // Mock function to verify a credential proof
  verifyCredential: async (proofHash) => {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      isValid: Math.random() > 0.3, // 70% valid for demo
      issuer: '0x' + Math.random().toString(16).substr(2, 40),
      issuedAt: Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
      revoked: false
    }
  },

  // Mock function to issue a credential
  issueCredential: async (holderAddress, credentialData) => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
      success: true,
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
      credentialId: 'CRED_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8)
    }
  },

  // Mock function to revoke a credential
  revokeCredential: async (credentialId) => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      success: true,
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64)
    }
  },

  // Mock function to get credential details
  getCredentialDetails: async (credentialId) => {
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
      id: credentialId,
      holder: '0x' + Math.random().toString(16).substr(2, 40),
      issuer: '0xUniversityOfCapeTown',
      issuedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      credentialType: 'University Degree',
      attributes: {
        degree: 'BSc Computer Science',
        year: '2024',
        honors: 'Cum Laude'
      }
    }
  }
}

// Helper function to format Ethereum addresses
export const formatAddress = (address) => {
  if (!address || address.length < 10) return address
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

// Helper function to format date
export const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Generate a mock proof for demo purposes
export const generateMockProof = (credentialData) => {
  return {
    type: 'VerifiableCredential',
    proof: {
      type: 'ECDSA',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `did:polygon:${credentialData.holder}`,
      jws: `eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDpldGhlcmV1bToweD${Math.random().toString(36).substr(2)}`
    },
    credentialSubject: {
      id: `did:polygon:${credentialData.holder}`,
      ...credentialData.attributes
    },
    issuer: credentialData.issuer,
    issuanceDate: new Date().toISOString()
  }
}