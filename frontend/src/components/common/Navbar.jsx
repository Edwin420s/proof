import { useState, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import WalletContext from '../../contexts/WalletContext.jsx'
import WalletConnect from './WalletConnect.jsx'
import { Menu, X, Shield, User, LogOut } from 'lucide-react'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const location = useLocation()
  const { walletAddress, isConnected, disconnectWallet } = useContext(WalletContext)

  const navigation = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Verify', path: '/verify' },
    { name: 'Issuer', path: '/issuer' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="p-2 bg-[#0B1D3D] rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-[#0B1D3D]">Proof</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`
                    text-sm font-medium transition-colors duration-200
                    ${isActive(item.path)
                      ? 'text-[#0B1D3D] border-b-2 border-[#4FC3F7]'
                      : 'text-gray-600 hover:text-[#0B1D3D]'}
                  `}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Wallet & User Section */}
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <div className="hidden md:flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#0B1D3D]">Connected</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <User className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="p-3 border-b border-gray-100">
                        <div className="text-sm text-gray-500">Wallet Address</div>
                        <div className="text-xs font-mono truncate">{walletAddress}</div>
                      </div>
                      <button
                        onClick={disconnectWallet}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="hidden md:block btn-primary"
                >
                  Connect Wallet
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-4">
              <div className="flex flex-col space-y-3">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium
                      ${isActive(item.path)
                        ? 'bg-blue-50 text-[#0B1D3D]'
                        : 'text-gray-600 hover:bg-gray-50'}
                    `}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {isConnected ? (
                  <div className="px-4 py-3 border-t border-gray-100">
                    <div className="mb-3">
                      <div className="text-xs text-gray-500">Connected Wallet</div>
                      <div className="text-sm font-mono truncate">{walletAddress}</div>
                    </div>
                    <button
                      onClick={() => {
                        disconnectWallet()
                        setIsMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowWalletModal(true)
                      setIsMenuOpen(false)
                    }}
                    className="mx-4 btn-primary"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Wallet Connect Modal */}
      {showWalletModal && (
        <WalletConnect onClose={() => setShowWalletModal(false)} />
      )}
    </>
  )
}

export default Navbar