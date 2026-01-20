import { useState } from 'react'
import { QrCode, Copy, Download, Share2, Clock, Shield } from 'lucide-react'

const ProofGenerator = ({ credential, onClose }) => {
  const [proof, setProof] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expiry, setExpiry] = useState('1h')
  const [shareMode, setShareMode] = useState('link') // 'link', 'qr', or 'embed'

  const generateProof = async () => {
    setIsGenerating(true)
    
    // Simulate proof generation
    setTimeout(() => {
      const proofData = {
        id: `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        credentialId: credential.id,
        holder: '0x' + Math.random().toString(16).substr(2, 40),
        issuer: credential.issuer,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        proofHash: '0x' + Math.random().toString(16).substr(2, 64),
        attributes: credential.attributes,
        verificationLink: `https://proof.io/verify/${Math.random().toString(36).substr(2, 16)}`
      }
      
      setProof(proofData)
      setIsGenerating(false)
    }, 1500)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadProof = () => {
    const dataStr = JSON.stringify(proof, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `proof_${credential.id}_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const shareProof = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Proof of ${credential.type}`,
          text: `Verify my ${credential.type} credential`,
          url: proof.verificationLink,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      copyToClipboard(proof.verificationLink)
    }
  }

  const expiryOptions = [
    { value: '15m', label: '15 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '1d', label: '1 day' },
    { value: '7d', label: '1 week' },
    { value: '30d', label: '1 month' },
    { value: 'never', label: 'Never expires' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0B1D3D] rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0B1D3D]">Generate Proof</h2>
                <p className="text-gray-600 text-sm">
                  Create a shareable proof for {credential.type}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Credential Info */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#0B1D3D]">Credential Details</h3>
              <span className="text-sm text-gray-600">ID: {credential.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Type</div>
                <div className="font-medium">{credential.type}</div>
              </div>
              <div>
                <div className="text-gray-500">Issuer</div>
                <div className="font-medium">{credential.issuer}</div>
              </div>
              <div>
                <div className="text-gray-500">Issued</div>
                <div className="font-medium">{credential.issuedDate}</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div className="font-medium text-green-600">{credential.status}</div>
              </div>
            </div>
          </div>

          {/* Proof Settings */}
          {!proof && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-[#0B1D3D] mb-4">Proof Settings</h3>
              
              <div className="space-y-6">
                {/* Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Proof Expiry
                    </div>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {expiryOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setExpiry(option.value)}
                        className={`
                          px-4 py-3 border rounded-lg text-sm font-medium transition-all
                          ${expiry === option.value
                            ? 'border-[#4FC3F7] bg-blue-50 text-[#0B1D3D]'
                            : 'border-gray-300 hover:border-gray-400'}
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Share Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Share Method
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setShareMode('link')}
                      className={`
                        flex flex-col items-center p-4 border rounded-lg transition-all
                        ${shareMode === 'link'
                          ? 'border-[#4FC3F7] bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'}
                      `}
                    >
                      <Share2 className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">Link</span>
                    </button>
                    <button
                      onClick={() => setShareMode('qr')}
                      className={`
                        flex flex-col items-center p-4 border rounded-lg transition-all
                        ${shareMode === 'qr'
                          ? 'border-[#4FC3F7] bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'}
                      `}
                    >
                      <QrCode className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">QR Code</span>
                    </button>
                    <button
                      onClick={() => setShareMode('embed')}
                      className={`
                        flex flex-col items-center p-4 border rounded-lg transition-all
                        ${shareMode === 'embed'
                          ? 'border-[#4FC3F7] bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'}
                      `}
                    >
                      <span className="text-lg mb-2">{'</>'}</span>
                      <span className="text-sm font-medium">Embed</span>
                    </button>
                  </div>
                </div>

                {/* Privacy Note */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800">Privacy Notice</div>
                      <div className="text-sm text-yellow-700">
                        This proof will only reveal the verified attributes. No personal data or wallet addresses will be exposed to verifiers.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          {!proof && (
            <button
              onClick={generateProof}
              disabled={isGenerating}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Zero-Knowledge Proof...
                </>
              ) : (
                'Generate Proof'
              )}
            </button>
          )}

          {/* Generated Proof */}
          {proof && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-[#0B1D3D] mb-2">
                  Proof Generated Successfully!
                </h3>
                <p className="text-gray-600">
                  Share this proof with verifiers. It expires on {new Date(proof.expiresAt).toLocaleString()}.
                </p>
              </div>

              {/* QR Code Display */}
              {shareMode === 'qr' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="bg-white p-4 inline-block rounded-lg">
                    {/* Mock QR Code - in production use a QR code library */}
                    <div className="grid grid-cols-10 gap-1 w-48 h-48 mx-auto">
                      {Array.from({ length: 100 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-full h-full rounded-sm ${
                            Math.random() > 0.5 ? 'bg-[#0B1D3D]' : 'bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Scan this QR code to verify the proof
                  </p>
                </div>
              )}

              {/* Verification Link */}
              {shareMode === 'link' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Verification Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={proof.verificationLink}
                      readOnly
                      className="flex-grow input-field bg-gray-50"
                    />
                    <button
                      onClick={() => copyToClipboard(proof.verificationLink)}
                      className="px-4 py-3 bg-[#0B1D3D] text-white rounded-lg hover:bg-[#0a1a35] flex items-center gap-2"
                    >
                      {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Embed Code */}
              {shareMode === 'embed' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Embed Code
                  </label>
                  <div className="relative">
                    <pre className="text-sm bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      {`<script src="https://proof.io/embed.js"></script>
<div 
  class="proof-embed" 
  data-proof-id="${proof.id}"
  data-theme="light"
  data-width="100%"
>
</div>`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`<script src="https://proof.io/embed.js"></script>\n<div class="proof-embed" data-proof-id="${proof.id}" data-theme="light" data-width="100%"></div>`)}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Proof Details */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-[#0B1D3D] mb-4">Proof Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Proof ID</div>
                    <div className="font-mono truncate">{proof.id}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Generated</div>
                    <div>{new Date(proof.generatedAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Expires</div>
                    <div>{new Date(proof.expiresAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Proof Hash</div>
                    <div className="font-mono truncate">{proof.proofHash.substring(0, 16)}...</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={shareProof}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Proof
                </button>
                <button
                  onClick={downloadProof}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProofGenerator