import { useState } from 'react'
import { Search, Filter, Download, Eye, User, Calendar, Hash } from 'lucide-react'

const IssuedCredentials = ({ credentials = [], onView, onRevoke }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'active', 'revoked', 'expired'
  const [sortBy, setSortBy] = useState('date') // 'date', 'holder', 'type'

  // Filter and search credentials
  const filteredCredentials = credentials.filter(cred => {
    const matchesSearch = 
      cred.holder.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'active' ? cred.status === 'active' :
      filter === 'revoked' ? cred.status === 'revoked' :
      filter === 'expired' ? cred.expired : true
    
    return matchesSearch && matchesFilter
  })

  // Sort credentials
  const sortedCredentials = [...filteredCredentials].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.issuedDate) - new Date(a.issuedDate)
    } else if (sortBy === 'holder') {
      return a.holder.localeCompare(b.holder)
    } else {
      return a.type.localeCompare(b.type)
    }
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'revoked': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatAddress = (address) => {
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1D3D]">Issued Credentials</h2>
          <p className="text-gray-600">
            Manage credentials you have issued to users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Issued</div>
            <div className="text-2xl font-bold text-[#0B1D3D]">{credentials.length}</div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by holder, type, or ID..."
              className="w-full pl-10 input-field"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field"
          >
            <option value="date">Sort by Date</option>
            <option value="holder">Sort by Holder</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Active</div>
          <div className="text-2xl font-bold text-[#0B1D3D]">
            {credentials.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Revoked</div>
          <div className="text-2xl font-bold text-[#0B1D3D]">
            {credentials.filter(c => c.status === 'revoked').length}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Verifications</div>
          <div className="text-2xl font-bold text-[#0B1D3D]">
            {credentials.reduce((sum, cred) => sum + (cred.verifications || 0), 0)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Unique Holders</div>
          <div className="text-2xl font-bold text-[#0B1D3D]">
            {new Set(credentials.map(c => c.holder)).size}
          </div>
        </div>
      </div>

      {/* Credentials List */}
      {sortedCredentials.length === 0 ? (
        <div className="text-center card py-12">
          <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Credentials Found
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'You haven\'t issued any credentials yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credential
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holder
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verifications
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCredentials.map((credential) => (
                <tr key={credential.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Hash className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {credential.type}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          ID: {credential.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm font-mono">
                        {formatAddress(credential.holder)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {new Date(credential.issuedDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(credential.status)}`}>
                      {credential.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">
                      {credential.verifications || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onView(credential)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {credential.status === 'active' && (
                        <button
                          onClick={() => onRevoke(credential)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {sortedCredentials.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Previous
            </button>
            <button className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{' '}
                <span className="font-medium">{sortedCredentials.length}</span> of{' '}
                <span className="font-medium">{sortedCredentials.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                  <span className="sr-only">Previous</span>
                  ←
                </button>
                <button className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                  1
                </button>
                <button className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                  2
                </button>
                <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                  <span className="sr-only">Next</span>
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IssuedCredentials