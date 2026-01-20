import { useState } from 'react'
import VerificationResult from '../components/verifier/VerificationResult.jsx'
import ProofRequest from '../components/verifier/ProofRequest.jsx'
import { QrCode, Link as LinkIcon, Upload, Shield } from 'lucide-react'

const CredentialVerify = () => {
  const [verificationMode, setVerificationMode] = useState('qr') // 'qr', 'link', or 'upload'
  const [verificationResult, setVerificationResult] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async (proofData) => {
    setIsVerifying(true)
    
    // Simulate verification process
    setTimeout(() => {
      // Mock result - replace with actual blockchain verification
      const isVerified = Math.random() > 0.3 // 70% chance of success for demo
      
      setVerificationResult({
        success: isVerified,
        credentialType: 'University Degree',
        issuer: 'University of Cape Town',
        issuedDate: '2024-06-15',
        attributes: { degree: 'BSc Computer Science', status: 'Graduated' },
        verificationTime: '2024-01-20T10:30:00Z',
        proofHash: '0x' + Math.random().toString(16).substr(2, 64),
        message: isVerified 
          ? 'Credential is valid and has not been revoked.' 
          : 'Credential verification failed. Please check the proof and try again.'
      })
      setIsVerifying(false)
    }, 1500)
  }

  const handleQRScan = (data) => {
    handleVerify({ type: 'qr', data })
  }

  const handleLinkVerify = (link) => {
    handleVerify({ type: 'link', data: link })
  }

  const handleFileUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      handleVerify({ type: 'file', data: e.target.result })
    }
    reader.readAsText(file)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-[#0B1D3D] mb-4">
          Verify Credential Proof
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Instantly verify the authenticity of a credential proof. No personal data is shared or stored during verification.
        </p>
      </div>

      {/* Verification Modes */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setVerificationMode('qr')}
          className={`
            flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200
            ${verificationMode === 'qr' 
              ? 'border-[#4FC3F7] bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'}
          `}
        >
          <div className={`
            p-3 rounded-lg mb-4
            ${verificationMode === 'qr' ? 'bg-[#4FC3F7]' : 'bg-gray-100'}
          `}>
            <QrCode className={`w-6 h-6 ${verificationMode === 'qr' ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <h3 className="font-semibold text-[#0B1D3D] mb-2">Scan QR Code</h3>
          <p className="text-sm text-gray-600 text-center">
            Scan a QR code from a Proof holder
          </p>
        </button>

        <button
          onClick={() => setVerificationMode('link')}
          className={`
            flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200
            ${verificationMode === 'link' 
              ? 'border-[#4FC3F7] bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'}
          `}
        >
          <div className={`
            p-3 rounded-lg mb-4
            ${verificationMode === 'link' ? 'bg-[#4FC3F7]' : 'bg-gray-100'}
          `}>
            <LinkIcon className={`w-6 h-6 ${verificationMode === 'link' ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <h3 className="font-semibold text-[#0B1D3D] mb-2">Proof Link</h3>
          <p className="text-sm text-gray-600 text-center">
            Enter a proof link or verification code
          </p>
        </button>

        <button
          onClick={() => setVerificationMode('upload')}
          className={`
            flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200
            ${verificationMode === 'upload' 
              ? 'border-[#4FC3F7] bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'}
          `}
        >
          <div className={`
            p-3 rounded-lg mb-4
            ${verificationMode === 'upload' ? 'bg-[#4FC3F7]' : 'bg-gray-100'}
          `}>
            <Upload className={`w-6 h-6 ${verificationMode === 'upload' ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <h3 className="font-semibold text-[#0B1D3D] mb-2">Upload File</h3>
          <p className="text-sm text-gray-600 text-center">
            Upload a proof file (JSON format)
          </p>
        </button>
      </div>

      {/* Verification Area */}
      <div className="card mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#0B1D3D] mb-2">
            {verificationMode === 'qr' && 'Scan QR Code'}
            {verificationMode === 'link' && 'Enter Proof Link'}
            {verificationMode === 'upload' && 'Upload Proof File'}
          </h2>
          <p className="text-gray-600">
            {verificationMode === 'qr' && 'Position the QR code within the frame to scan'}
            {verificationMode === 'link' && 'Paste the proof link or verification code below'}
            {verificationMode === 'upload' && 'Select a proof file in JSON format'}
          </p>
        </div>

        <ProofRequest
          mode={verificationMode}
          onQRScan={handleQRScan}
          onLinkVerify={handleLinkVerify}
          onFileUpload={handleFileUpload}
          isVerifying={isVerifying}
        />

        {/* Example Proofs (for demo) */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Try Demo Proofs</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleLinkVerify('proof://demo/valid/degree')}
              disabled={isVerifying}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Valid Degree Proof
            </button>
            <button
              onClick={() => handleLinkVerify('proof://demo/revoked/membership')}
              disabled={isVerifying}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Revoked Membership Proof
            </button>
          </div>
        </div>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <VerificationResult result={verificationResult} />
      )}

      {/* How It Works */}
      <div className="card mt-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-[#4FC3F7]" />
          <h3 className="text-lg font-semibold text-[#0B1D3D]">
            How Verification Works
          </h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-lg font-bold text-[#4FC3F7] mb-2">1. Proof Submission</div>
            <p className="text-gray-600 text-sm">
              The holder generates a zero-knowledge proof from their credential.
            </p>
          </div>
          <div>
            <div className="text-lg font-bold text-[#4FC3F7] mb-2">2. On-chain Check</div>
            <p className="text-gray-600 text-sm">
              Proof checks the credential hash and revocation status on blockchain.
            </p>
          </div>
          <div>
            <div className="text-lg font-bold text-[#4FC3F7] mb-2">3. Instant Result</div>
            <p className="text-gray-600 text-sm">
              Verification result returns in seconds. No personal data is stored.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CredentialVerify