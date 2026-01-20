import { useState, useContext, useEffect } from 'react'
import WalletContext from '../contexts/WalletContext.jsx'
import { Users, CheckCircle, XCircle, Clock, Download, Filter } from 'lucide-react'

const IssuerPanel = () => {
  const { walletAddress, isConnected } = useContext(WalletContext)
  const [activeTab, setActiveTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [issuedCredentials, setIssuedCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)

  // Mock data
  useEffect(() => {
    if (isConnected) {
      setTimeout(() => {
        setRequests([
          {
            id: 'REQ001',
            applicant: '0x3f...c8a1',
            credentialType: 'University Degree',
            institution: 'University of Cape Town',
            submittedDate: '2024-01-19',
            status: 'pending',
            documents: 2
          },
          {
            id: 'REQ002',
            applicant: '0x5a...9b3c',
            credentialType: 'Age Verification',
            institution: 'Self-issued',
            submittedDate: '2024-01-18',
            status: 'pending',
            documents: 1
          },
          {
            id: 'REQ003',
            applicant: '0x8d...2e7f',
            credentialType: 'Professional Certification',
            institution: 'W3Node',
            submittedDate: '2024-01-17',
            status: 'reviewed',
            documents: 3
          }
        ])

        setIssuedCredentials([
          {
            id: 'CRED001',
            holder: '0x9f...a5b2',
            credentialType: 'University Degree',
            issuedDate: '2024-01-15',
            status: 'active',
            proofRequests: 12
          },
          {
            id: 'CRED002',
            holder: '0x2c...8d9e',
            credentialType: 'Membership',
            issuedDate: '2024-01-10',
            status: 'active',
            proofRequests: 8
          },
          {
            id: 'CRED003',
            holder: '0x7b...3f4a',
            credentialType: 'Age Verification',
            issuedDate: '2024-01-05',
            status: 'revoked',
            proofRequests: 5
          }
        ])

        setLoading(false)
      }, 1000)
    }
  }, [isConnected])

  const handleApprove = (requestId) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status: 'approved' } : req
    ))
    // In production: Call smart contract to issue credential
    alert(`Credential issued for request ${requestId}`)
  }

  const handleReject = (requestId) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status: 'rejected' } : req
    ))
  }

  const handleRevoke = (credentialId) => {
    setIssuedCredentials(prev => prev.map(cred => 
      cred.id === credentialId ? { ...cred, status: 'revoked' } : cred
    ))
    // In production: Call smart contract to revoke credential
    alert(`Credential ${credentialId} revoked`)
  }

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center card">
          <Users className="w-16 h-16 text-[#4FC3F7] mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#0B1D3D] mb-4">
            Issuer Dashboard
          </h2>
          <p className="text-gray-600 mb-8">
            Connect your issuer wallet to manage credential requests.
          </p>
          <button className="btn-primary">
            Connect Issuer Wallet
          </button>
        </div>
      </div>
    )
  }

  // Check if wallet has issuer privileges (simulated)
  const isIssuer = walletAddress?.startsWith('0x') // Simple check for demo

  if (!isIssuer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center card">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#0B1D3D] mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-8">
            This wallet does not have issuer privileges. Only registered issuers can access this panel.
          </p>
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
            <h1 className="text-3xl font-bold text-[#0B1D3D]">Issuer Panel</h1>
            <p className="text-gray-600">
              Manage credential requests and issued credentials
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Issuer ID</div>
              <div className="font-mono text-sm">
                {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
              </div>
            </div>
            <button className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="text-sm text-gray-500 mb-1">Pending Requests</div>
            <div className="text-2xl font-bold text-[#0B1D3D]">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500 mb-1">Issued Today</div>
            <div className="text-2xl font-bold text-[#0B1D3D]">3</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500 mb-1">Active Credentials</div>
            <div className="text-2xl font-bold text-[#0B1D3D]">
              {issuedCredentials.filter(c => c.status === 'active').length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500 mb-1">Total Verifications</div>
            <div className="text-2xl font-bold text-[#0B1D3D]">
              {issuedCredentials.reduce((sum, cred) => sum + cred.proofRequests, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'requests', label: 'Requests', count: requests.length },
            { id: 'issued', label: 'Issued', count: issuedCredentials.length },
            { id: 'analytics', label: 'Analytics', count: null },
            { id: 'settings', label: 'Settings', count: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 font-medium text-sm border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-[#4FC3F7] text-[#0B1D3D]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}
              `}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'requests' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#0B1D3D]">
              Credential Requests
            </h3>
            <button className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1D3D]"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Request ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Applicant</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Credential Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Submitted</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm">{request.id}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm">{request.applicant}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{request.credentialType}</div>
                        <div className="text-sm text-gray-500">{request.institution}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{request.submittedDate}</td>
                      <td className="py-4 px-4">
                        <span className={`
                          inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                          ${request.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : request.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'}
                        `}>
                          {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={request.status !== 'pending'}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={request.status !== 'pending'}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'issued' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#0B1D3D]">
              Issued Credentials
            </h3>
            <div className="text-sm text-gray-500">
              Last updated: Today, 10:30 AM
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Credential ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Holder</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Issued Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Proof Requests</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issuedCredentials.map((credential) => (
                  <tr key={credential.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm">{credential.id}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm">{credential.holder}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium">{credential.credentialType}</div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{credential.issuedDate}</td>
                    <td className="py-4 px-4">
                      <div className="font-medium">{credential.proofRequests}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`
                        inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                        ${credential.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'}
                      `}>
                        {credential.status === 'active' ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        {credential.status === 'active' ? (
                          <button
                            onClick={() => handleRevoke(credential.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                            disabled
                          >
                            Revoked
                          </button>
                        )}
                        <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Stats Card */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <h4 className="font-semibold text-[#0B1D3D] mb-4">Recent Activity</h4>
          <div className="space-y-3">
            {[
              { action: 'Approved request REQ003', time: '2 hours ago' },
              { action: 'Issued credential CRED004', time: '1 day ago' },
              { action: 'Rejected request REQ005', time: '2 days ago' },
              { action: 'Updated issuer settings', time: '3 days ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#4FC3F7] rounded-full"></div>
                  <span className="text-gray-700">{activity.action}</span>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h4 className="font-semibold text-[#0B1D3D] mb-4">Issuer Information</h4>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Issuer Name</div>
              <div className="font-medium">University of Cape Town</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Issuer DID</div>
              <div className="font-mono text-sm break-all">
                did:polygon:0x{walletAddress.substring(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Registration Date</div>
              <div className="font-medium">2024-01-01</div>
            </div>
            <button className="w-full mt-4 btn-secondary">
              Update Issuer Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IssuerPanel