import { useState } from 'react'
import { User, FileText, Calendar, Tag, Hash, Check } from 'lucide-react'

const IssueCredentialForm = ({ onIssue, onCancel }) => {
  const [formData, setFormData] = useState({
    holderAddress: '',
    credentialType: '',
    credentialName: '',
    attributes: [
      { key: 'name', value: '', type: 'string' },
      { key: 'issuedDate', value: new Date().toISOString().split('T')[0], type: 'date' }
    ],
    expiryDate: '',
    metadata: '',
    issuerNote: ''
  })

  const credentialTypes = [
    'University Degree',
    'Professional Certification',
    'Age Verification',
    'Employment Verification',
    'Membership',
    'KYC Verification',
    'Skill Badge',
    'Event Attendance',
    'License',
    'Custom'
  ]

  const attributeTypes = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'url', label: 'URL' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAttributeChange = (index, field, value) => {
    const updatedAttributes = [...formData.attributes]
    updatedAttributes[index] = { ...updatedAttributes[index], [field]: value }
    setFormData(prev => ({ ...prev, attributes: updatedAttributes }))
  }

  const addAttribute = () => {
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, { key: '', value: '', type: 'string' }]
    }))
  }

  const removeAttribute = (index) => {
    const updatedAttributes = formData.attributes.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, attributes: updatedAttributes }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.holderAddress || !formData.credentialType || !formData.credentialName) {
      alert('Please fill in all required fields')
      return
    }

    // Validate attributes
    const hasEmptyAttributes = formData.attributes.some(attr => !attr.key || !attr.value)
    if (hasEmptyAttributes) {
      alert('Please fill in all attribute fields')
      return
    }

    // Prepare credential data
    const credentialData = {
      holder: formData.holderAddress,
      type: formData.credentialType,
      name: formData.credentialName,
      attributes: formData.attributes.reduce((obj, attr) => {
        obj[attr.key] = attr.value
        return obj
      }, {}),
      expiryDate: formData.expiryDate || null,
      metadata: formData.metadata,
      issuerNote: formData.issuerNote,
      issuedAt: new Date().toISOString()
    }

    onIssue(credentialData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-[#0B1D3D]">Issue New Credential</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600">
            Create and issue a new verifiable credential to a user
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-[#0B1D3D] mb-4">
                Basic Information
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Holder Wallet Address *
                    </div>
                  </label>
                  <input
                    type="text"
                    name="holderAddress"
                    value={formData.holderAddress}
                    onChange={handleInputChange}
                    placeholder="0x..."
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Credential Type *
                    </div>
                  </label>
                  <select
                    name="credentialType"
                    value={formData.credentialType}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="">Select type</option>
                    {credentialTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Credential Name *
                    </div>
                  </label>
                  <input
                    type="text"
                    name="credentialName"
                    value={formData.credentialName}
                    onChange={handleInputChange}
                    placeholder="e.g., Bachelor of Science in Computer Engineering"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Expiry Date (Optional)
                    </div>
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Attributes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0B1D3D]">Attributes</h3>
                <button
                  type="button"
                  onClick={addAttribute}
                  className="text-sm text-[#4FC3F7] hover:text-[#3db8ee]"
                >
                  + Add Attribute
                </button>
              </div>

              <div className="space-y-4">
                {formData.attributes.map((attribute, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-700 mb-1">Key *</label>
                      <input
                        type="text"
                        value={attribute.key}
                        onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                        placeholder="e.g., degree, year, institution"
                        className="input-field"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-700 mb-1">Type</label>
                      <select
                        value={attribute.type}
                        onChange={(e) => handleAttributeChange(index, 'type', e.target.value)}
                        className="input-field"
                      >
                        {attributeTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-700 mb-1">Value *</label>
                      <input
                        type={attribute.type === 'date' ? 'date' : 'text'}
                        value={attribute.value}
                        onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="input-field"
                        required
                      />
                    </div>
                    {formData.attributes.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAttribute(index)}
                        className="mt-6 px-3 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-semibold text-[#0B1D3D] mb-4">
                Additional Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Metadata (Optional)
                    </div>
                  </label>
                  <textarea
                    name="metadata"
                    value={formData.metadata}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Additional metadata in JSON format"
                    className="input-field"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter valid JSON (e.g., {"{\"reference\": \"REF123\", \"department\": \"Computer Science\"}"})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issuer Notes (Optional)
                  </label>
                  <textarea
                    name="issuerNote"
                    value={formData.issuerNote}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Internal notes about this credential issuance"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-[#0B1D3D] mb-3">Credential Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{formData.credentialType || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{formData.credentialName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Holder:</span>
                  <span className="font-mono truncate max-w-[200px]">
                    {formData.holderAddress || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attributes:</span>
                  <span className="font-medium">{formData.attributes.filter(a => a.key && a.value).length}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Issue Credential
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default IssueCredentialForm