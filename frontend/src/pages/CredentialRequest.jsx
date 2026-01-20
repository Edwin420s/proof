import { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import WalletContext from '../contexts/WalletContext.jsx'
import { ArrowLeft, Upload, Shield, Check } from 'lucide-react'

const CredentialRequest = () => {
  const { walletAddress, isConnected } = useContext(WalletContext)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    credentialType: '',
    institution: '',
    studentId: '',
    supportingDocs: [],
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const credentialTypes = [
    { value: 'degree', label: 'University Degree', icon: '🎓' },
    { value: 'age', label: 'Age Verification', icon: '🔞' },
    { value: 'employment', label: 'Employment Verification', icon: '💼' },
    { value: 'certification', label: 'Professional Certification', icon: '📜' },
    { value: 'membership', label: 'Organization Membership', icon: '🤝' },
    { value: 'custom', label: 'Custom Credential', icon: '⚙️' },
  ]

  const institutions = [
    'University of Cape Town',
    'University of Johannesburg',
    'W3Node',
    'African Leadership University',
    'Self-Issued',
    'Other'
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({ 
      ...prev, 
      supportingDocs: [...prev.supportingDocs, ...files] 
    }))
  }

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      supportingDocs: prev.supportingDocs.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          credentialType: '',
          institution: '',
          studentId: '',
          supportingDocs: [],
          notes: ''
        })
        setStep(1)
        setSubmitted(false)
      }, 3000)
    }, 2000)
  }

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center card">
          <Shield className="w-16 h-16 text-[#4FC3F7] mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#0B1D3D] mb-4">
            Wallet Required
          </h2>
          <p className="text-gray-600 mb-8">
            Please connect your wallet to request credentials.
          </p>
          <Link to="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center card">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B1D3D] mb-4">
            Request Submitted!
          </h2>
          <p className="text-gray-600 mb-6">
            Your credential request has been sent to the issuer. You'll be notified when it's issued.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/dashboard" className="btn-primary">
              Back to Dashboard
            </Link>
            <button 
              onClick={() => setSubmitted(false)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              New Request
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-[#4FC3F7] hover:text-[#3db8ee] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0B1D3D]">Request Credential</h1>
            <p className="text-gray-600">
              Request a verifiable credential from trusted institutions
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Wallet: {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${step >= stepNum ? 'bg-[#0B1D3D] text-white' : 'bg-gray-200 text-gray-400'}
                font-semibold
              `}>
                {stepNum}
              </div>
              <div className={`
                ml-4 hidden md:block
                ${step > stepNum ? 'text-[#0B1D3D]' : 'text-gray-400'}
              `}>
                <div className="font-medium">
                  {stepNum === 1 && 'Select Type'}
                  {stepNum === 2 && 'Details'}
                  {stepNum === 3 && 'Review'}
                </div>
              </div>
              {stepNum < 3 && (
                <div className={`
                  w-12 h-1 mx-4
                  ${step > stepNum ? 'bg-[#0B1D3D]' : 'bg-gray-200'}
                `}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {/* Step 1: Credential Type */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-semibold text-[#0B1D3D] mb-6">
              Select Credential Type
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {credentialTypes.map((type) => (
                <div
                  key={type.value}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                    ${formData.credentialType === type.value 
                      ? 'border-[#4FC3F7] bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                  onClick={() => setFormData(prev => ({ ...prev, credentialType: type.value }))}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium text-[#0B1D3D]">{type.label}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                disabled={!formData.credentialType}
                className={`btn-primary ${!formData.credentialType && 'opacity-50 cursor-not-allowed'}`}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold text-[#0B1D3D] mb-6">
              Credential Details
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issuing Institution *
                </label>
                <select
                  name="institution"
                  value={formData.institution}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select institution</option>
                  {institutions.map((inst) => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student/Employee ID
                </label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., 2024CS001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload supporting documents (optional)
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="btn-secondary cursor-pointer inline-block"
                  >
                    Choose Files
                  </label>
                </div>
                
                {formData.supportingDocs.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Uploaded Files ({formData.supportingDocs.length})
                    </div>
                    <div className="space-y-2">
                      {formData.supportingDocs.map((file, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded">
                              <Upload className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <div className="font-medium">{file.name}</div>
                              <div className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="4"
                  className="input-field"
                  placeholder="Any additional information for the issuer..."
                />
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold text-[#0B1D3D] mb-6">
              Review Request
            </h3>
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Credential Type</div>
                  <div className="font-medium">
                    {credentialTypes.find(t => t.value === formData.credentialType)?.label}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Issuer</div>
                  <div className="font-medium">{formData.institution || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Wallet Address</div>
                  <div className="font-mono text-sm">
                    {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Supporting Documents</div>
                  <div className="font-medium">{formData.supportingDocs.length} files</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-8">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800">Important Notice</div>
                  <div className="text-sm text-yellow-700">
                    Credentials are issued at the discretion of the institution. 
                    This process may take 1-3 business days.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default CredentialRequest