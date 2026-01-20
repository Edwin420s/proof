// Utility functions for formatting data

// Format date to readable string
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

// Format wallet address (truncate middle)
export const formatAddress = (address, start = 6, end = 4) => {
  if (!address || address.length < start + end) return address
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`
}

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format duration
export const formatDuration = (milliseconds) => {
  if (milliseconds < 1000) return `${milliseconds}ms`
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`
  if (milliseconds < 3600000) return `${Math.floor(milliseconds / 60000)}m ${Math.floor((milliseconds % 60000) / 1000)}s`
  return `${Math.floor(milliseconds / 3600000)}h ${Math.floor((milliseconds % 3600000) / 60000)}m`
}

// Format number with commas
export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US').format(number)
}

// Format credential type to display name
export const formatCredentialType = (type) => {
  const types = {
    'degree': 'University Degree',
    'age': 'Age Verification',
    'employment': 'Employment Verification',
    'certification': 'Professional Certification',
    'membership': 'Organization Membership',
    'custom': 'Custom Credential'
  }
  return types[type] || type
}

// Format status to display text
export const formatStatus = (status) => {
  const statusMap = {
    'active': 'Active',
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'revoked': 'Revoked',
    'expired': 'Expired'
  }
  return statusMap[status] || status
}

// Generate a random color based on string
export const getColorFromString = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const colors = [
    '#4FC3F7', '#7986CB', '#4DB6AC', '#81C784',
    '#FFB74D', '#FF8A65', '#A1887F', '#90A4AE'
  ]
  
  return colors[Math.abs(hash) % colors.length]
}