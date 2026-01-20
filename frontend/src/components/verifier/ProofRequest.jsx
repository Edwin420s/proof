import { useState, useRef } from 'react'
import { QrCode, Link as LinkIcon, Upload, Camera, X } from 'lucide-react'

const ProofRequest = ({ mode, onQRScan, onLinkVerify, onFileUpload, isVerifying }) => {
  const [proofLink, setProofLink] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'link' && proofLink.trim()) {
      onLinkVerify(proofLink.trim())
    }
  }

  const handleFileSelect = (file) => {
    if (file && file.type === 'application/json') {
      onFileUpload(file)
    } else {
      alert('Please select a valid JSON file')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const startCamera = () => {
    setCameraActive(true)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(err => {
        console.error('Camera error:', err)
        setCameraActive(false)
      })
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
    }
    setCameraActive(false)
  }

  return (
    <div className="space-y-6">
      {/* QR Code Mode */}
      {mode === 'qr' && (
        <div className="space-y-4">
          {cameraActive ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-[#4FC3F7] rounded-lg"></div>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <QrCode className="w-24 h-24 text-gray-400 mx-auto mb-6" />
              <p className="text-gray-600 mb-6">
                Position the QR code within the camera frame
              </p>
              <button
                onClick={startCamera}
                className="btn-primary inline-flex items-center gap-2"
                disabled={isVerifying}
              >
                <Camera className="w-5 h-5" />
                Start Camera
              </button>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Or enter QR code data manually</p>
            <div className="max-w-md mx-auto">
              <textarea
                placeholder="Paste QR code data here..."
                rows="3"
                className="input-field"
                disabled={isVerifying}
              />
              <button
                onClick={() => onLinkVerify('qr://manual/data')}
                disabled={isVerifying}
                className="w-full mt-4 btn-secondary"
              >
                Verify Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Mode */}
      {mode === 'link' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proof Link or Verification Code
            </label>
            <input
              type="text"
              value={proofLink}
              onChange={(e) => setProofLink(e.target.value)}
              placeholder="proof://example.com/verify/abc123..."
              className="input-field"
              disabled={isVerifying}
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter the proof link or verification code shared by the credential holder
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="submit"
              disabled={!proofLink.trim() || isVerifying}
              className={`btn-primary ${(!proofLink.trim() || isVerifying) && 'opacity-50 cursor-not-allowed'}`}
            >
              {isVerifying ? 'Verifying...' : 'Verify Proof'}
            </button>
            <button
              type="button"
              onClick={() => setProofLink('')}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isVerifying}
            >
              Clear
            </button>
          </div>
        </form>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div className="space-y-4">
          <div
            className={`
              border-2 ${dragOver ? 'border-[#4FC3F7] bg-blue-50' : 'border-dashed border-gray-300'} 
              rounded-lg p-12 text-center transition-all duration-200
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <p className="text-gray-600 mb-4">
              {dragOver ? 'Drop the file here' : 'Drag & drop a proof file here, or'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              disabled={isVerifying}
            >
              Browse Files
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Supported format: JSON proof files only
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Example Proof Format</h4>
            <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
{`{
  "type": "VerifiableCredential",
  "proof": {
    "type": "ECDSA",
    "created": "2024-01-20T10:30:00Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:polygon:...",
    "jws": "eyJhbGciOiJ..."
  },
  "credentialSubject": {
    "id": "did:polygon:...",
    "degree": "BSc Computer Science"
  }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Verifying State */}
      {isVerifying && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#0B1D3D] border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Verifying proof on blockchain...</p>
          <p className="text-sm text-gray-500 mt-2">
            Checking credential validity and revocation status
          </p>
        </div>
      )}
    </div>
  )
}

export default ProofRequest