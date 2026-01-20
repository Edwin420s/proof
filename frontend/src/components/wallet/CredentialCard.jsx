import { Shield, Calendar, UserCheck, AlertCircle, Copy, Eye } from 'lucide-react'
import { useState } from 'react'

const CredentialCard = ({ credential, onGenerateProof }) => {
  const [copied, setCopied] = useState(false)

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <UserCheck className="w-4 h-4" />
      case 'expired':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Shield className="w-4 h-4" />
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-[#0B1D3D] mb-1">
            {credential.type}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>{credential.issuer}</span>
          </div>
        </div>
        <span className={`
          inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
          ${getStatusColor(credential.status)}
        `}>
          {getStatusIcon(credential.status)}
          {credential.status.charAt(0).toUpperCase() + credential.status.slice(1)}
        </span>
      </div>

      {/* Attributes */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Attributes</div>
        <div className="space-y-2">
          {Object.entries(credential.attributes).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-sm text-gray-600">{key}:</span>
              <span className="text-sm font-medium text-[#0B1D3D]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>Issued: {credential.issuedDate}</span>
        </div>
        {credential.expiresDate && (
          <div>
            Expires: {credential.expiresDate}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onGenerateProof(credential)}
          className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Generate Proof
        </button>
        <button
          onClick={() => handleCopy(credential.id)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          {copied ? (
            'Copied!'
          ) : (
            <>
              <Copy className="w-4 h-4" />
              ID
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default CredentialCard