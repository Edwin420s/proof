import { useState, useContext } from 'react'
import WalletContext from '../../contexts/WalletContext.jsx'
import { X, Wallet, Shield, ExternalLink } from 'lucide-react'

const WalletConnect = ({ onClose }) => {
  const { connectWallet } = useContext(WalletContext)
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask browser extension'
    },
    {
      id: 'polygon',
      name: 'Polygon Wallet',
      icon: '🔷',
      description: 'Polygon ID compatible wallet'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect with WalletConnect protocol'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '💰',
      description: 'Connect using Coinbase Wallet'
    }
  ]

  const handleConnect = async (walletId) => {
    setIsConnecting(true)
    setSelectedWallet(walletId)
    
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // In production, this would call the actual wallet connect function
      connectWallet(`0x${Math.random().toString(16).substr(2, 40)}`)
      
      onClose()
    } catch (error) {
      console.error('Connection failed:', error)
      alert('Failed to connect wallet. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0B1D3D] rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0B1D3D]">Connect Wallet</h2>
                <p className="text-gray-600 text-sm">Choose your wallet provider</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Wallet Options */}
        <div className="p-6">
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting}
                className={`
                  w-full p-4 border rounded-xl text-left transition-all duration-200
                  hover:border-[#4FC3F7] hover:bg-blue-50
                  ${selectedWallet === wallet.id ? 'border-[#4FC3F7] bg-blue-50' : 'border-gray-200'}
                  ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{wallet.icon}</div>
                    <div>
                      <div className="font-semibold text-[#0B1D3D]">{wallet.name}</div>
                      <div className="text-sm text-gray-600">{wallet.description}</div>
                    </div>
                  </div>
                  {selectedWallet === wallet.id && isConnecting && (
                    <div className="w-5 h-5 border-2 border-[#0B1D3D] border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-800">Security First</div>
                <div className="text-sm text-yellow-700">
                  Proof never requests private keys. Only connect to trusted dApps.
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-4">
              Don't have a wallet?
            </p>
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#4FC3F7] hover:text-[#3db8ee] text-sm"
            >
              Learn how to set up a wallet
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WalletConnect