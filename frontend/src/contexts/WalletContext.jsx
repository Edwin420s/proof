import { createContext, useState } from 'react'

const WalletContext = createContext()

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [network, setNetwork] = useState(null)

  // Mock wallet connection for demo
  const connectWallet = (address) => {
    setWalletAddress(address)
    setIsConnected(true)
    setNetwork('Polygon Mumbai')
    // In production: Would connect to actual wallet (MetaMask, etc.)
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setIsConnected(false)
    setNetwork(null)
  }

  return (
    <WalletContext.Provider value={{
      walletAddress,
      isConnected,
      network,
      connectWallet,
      disconnectWallet
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export default WalletContext