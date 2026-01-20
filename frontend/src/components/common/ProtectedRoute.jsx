import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import WalletContext from '../../contexts/WalletContext.jsx'

const ProtectedRoute = ({ children, requireIssuer = false }) => {
  const { isConnected, walletAddress } = useContext(WalletContext)

  // Redirect to home if not connected
  if (!isConnected) {
    return <Navigate to="/" replace />
  }

  // Check if issuer access is required
  if (requireIssuer) {
    // In production, this would check if wallet is in issuer registry
    const isIssuer = walletAddress?.startsWith('0x') // Simple check for demo
    if (!isIssuer) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

export default ProtectedRoute