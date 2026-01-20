import { useState, useContext, useEffect } from 'react'
import { Link } from 'react-router-dom'
import WalletContext from '../contexts/WalletContext.jsx'
import CredentialCard from '../components/wallet/CredentialCard.jsx'
import { Plus, Shield, User, Download, QrCode } from 'lucide-react'

const Dashboard = () => {
  const { walletAddress, isConnected, connectWallet } = useContext(WalletContext)
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCredential, setSelectedCredential] = useState(null)

  // Mock data - replace with actual blockchain calls
  useEffect(() => {
    if (isConnected) {
      // Simulate API call
      setTimeout(() => {
        setCredentials([
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
          },
          {
            id: '3',
            type: 'Professional Certificate',
            issuer: 'W3Node',
            issuedDate: '2024-10-30',
            expiresDate: null,
            status: 'active',
            attributes: { certification: 'Blockchain Developer' }
          }
        ])
        setLoading(false)
      }, 1000)
    }
  }, [isConnected])

  const handleGenerateProof = (credential) => {
    setSelectedCredential(credential)
    // In production, this would generate a ZK proof
    alert(`Generating proof for ${credential.type}...`)
  }

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center card">
          <Shield className="w-16 h-16 text-[#4FC3F7] mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#0B1D3D] mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Connect your wallet to view and manage your verifiable credentials.
          </p>
          <button
            onClick={connectWallet}
            className="btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#0B1D3D]">Dashboard</h1>
            <p className="text-gray-600">
              Manage your verifiable credentials and proofs
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/request" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Request Credential
            </Link>
            <button className="btn-secondary inline-flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Scan Proof
            </button>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0B1D3D]/10 rounded-lg">
                <User className="w-6 h-6 text-[#0B1D3D]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0B1D3D]">Connected Wallet</h3>
                <p className="text-gray-600 text-sm font-mono">
                  {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Credentials</div>
              <div className="text-2xl font-bold text-[#0B1D3D]">{credentials.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#0B1D3D]">Your Credentials</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              All
            </button>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Active
            </button>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Expired
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1D3D]"></div>
            <p className="mt-4 text-gray-600">Loading credentials...</p>
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center card py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Credentials Yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get started by requesting your first verifiable credential from a trusted issuer.
            </p>
            <Link to="/request" className="btn-primary">
              Request Credential
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                onGenerateProof={handleGenerateProof}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-[#0B1D3D] mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Age Verification Proof</p>
                <p className="text-sm text-gray-500">Verified by JobPlatform • 2 hours ago</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">Success</div>
          </div>
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium">Degree Credential Issued</p>
                <p className="text-sm text-gray-500">University of Cape Town • 1 day ago</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">Issued</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard