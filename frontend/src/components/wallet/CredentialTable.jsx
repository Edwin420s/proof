import { Shield, Calendar, UserCheck, MoreVertical, Download } from 'lucide-react'
import { useState } from 'react'

const CredentialTable = ({ credentials, onSelectCredential }) => {
  const [selectedRow, setSelectedRow] = useState(null)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800', icon: UserCheck },
      expired: { color: 'bg-red-100 text-red-800', icon: Shield },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Shield },
      revoked: { color: 'bg-gray-100 text-gray-800', icon: Shield }
    }
    
    const { color, icon: Icon } = config[status] || config.active
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Credential
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issuer
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issued Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {credentials.map((credential) => (
            <tr 
              key={credential.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelectCredential && onSelectCredential(credential)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {credential.type}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {credential.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{credential.issuer}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center text-sm text-gray-900">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {formatDate(credential.issuedDate)}
                </div>
              </td>
              <td className="px-6 py-4">
                {getStatusBadge(credential.status)}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectCredential && onSelectCredential(credential)
                    }}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle download
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRow(selectedRow === credential.id ? null : credential.id)
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CredentialTable