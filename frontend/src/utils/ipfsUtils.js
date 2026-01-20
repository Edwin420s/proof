// Mock IPFS utilities for demo purposes
// In production, this would use actual IPFS SDK

export const mockIPFS = {
  // Mock function to upload data to IPFS
  uploadToIPFS: async (data) => {
    console.log('Uploading to IPFS:', data)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate a mock IPFS CID
    const cid = `Qm${Math.random().toString(36).substr(2, 44)}`
    
    return {
      success: true,
      cid,
      url: `https://ipfs.io/ipfs/${cid}`,
      gatewayUrl: `https://${cid}.ipfs.dweb.link/`
    }
  },

  // Mock function to fetch data from IPFS
  fetchFromIPFS: async (cid) => {
    console.log('Fetching from IPFS:', cid)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Return mock credential data
    return {
      type: 'VerifiableCredential',
      issuer: 'University of Cape Town',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:polygon:0x${Math.random().toString(16).substr(2, 40)}`,
        name: 'Mock Credential',
        attributes: {
          degree: 'BSc Computer Science',
          year: '2024',
          status: 'Graduated'
        }
      }
    }
  },

  // Mock function to pin data to IPFS
  pinToIPFS: async (data) => {
    const result = await mockIPFS.uploadToIPFS(data)
    return {
      ...result,
      pinned: true,
      pinTimestamp: new Date().toISOString()
    }
  }
}

// Helper function to validate IPFS CID
export const isValidCID = (cid) => {
  // Simple validation for demo
  return cid && cid.startsWith('Qm') && cid.length === 46
}

// Helper function to get IPFS gateway URL
export const getIPFSGatewayURL = (cid, filename = '') => {
  const gateways = [
    `https://ipfs.io/ipfs/${cid}/${filename}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}/${filename}`,
    `https://gateway.pinata.cloud/ipfs/${cid}/${filename}`
  ]
  return gateways[0] // Return first gateway for demo
}