import { CheckCircle, XCircle, Shield, Calendar, User, Hash, ExternalLink } from 'lucide-react'

const VerificationResult = ({ result }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="card">
      <div className="mb-6">
        <div className={`flex items-center justify-center gap-3 mb-4 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
          {result.success ? (
            <>
              <CheckCircle className="w-12 h-12" />
              <div>
                <h3 className="text-2xl font-bold">Verification Successful</h3>
                <p className="text-gray-600">Credential is valid and authentic</p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12" />
              <div>
                <h3 className="text-2xl font-bold">Verification Failed</h3>
                <p className="text-gray-600">Credential could not be verified</p>
              </div>
            </>
          )}
        </div>

        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={result.success ? 'text-green-800' : 'text-red-800'}>
            {result.message}
          </p>
        </div>
      </div>

      {/* Credential Details */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-lg font-semibold text-[#0B1D3D] mb-4">Credential Details</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Credential Type</div>
                <div className="font-medium">{result.credentialType}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Issuer</div>
                <div className="font-medium">{result.issuer}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Issued Date</div>
                <div className="font-medium">{formatDate(result.issuedDate)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Verified Attributes</div>
              <div className="bg-gray-50 rounded-lg p-4">
                {Object.entries(result.attributes).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium text-[#0B1D3D]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hash className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">Proof Hash</div>
                <div className="font-mono text-sm truncate">{result.proofHash}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 btn-primary flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            View on Explorer
          </button>
          <button className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            Download Report
          </button>
          <button className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            Verify Another
          </button>
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700">
            <span>Technical Details</span>
            <span className="transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Verification Time</div>
                <div className="font-mono">{new Date(result.verificationTime).toISOString()}</div>
              </div>
              <div>
                <div className="text-gray-500">Blockchain Network</div>
                <div className="font-medium">Polygon Mainnet</div>
              </div>
              <div>
                <div className="text-gray-500">Verification Method</div>
                <div className="font-medium">On-chain + ZK Proof</div>
              </div>
              <div>
                <div className="text-gray-500">Transaction Status</div>
                <div className="font-medium text-green-600">Confirmed</div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default VerificationResult