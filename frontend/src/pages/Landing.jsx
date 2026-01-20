import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Lock, CheckCircle, ArrowRight } from 'lucide-react'

const Landing = () => {
  const [email, setEmail] = useState('')

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Self-Sovereign Credentials",
      description: "You own your identity. Store credentials in your wallet without central databases."
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Privacy-Preserving",
      description: "Prove claims without exposing personal data. Zero-knowledge verification."
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "Tamper-Proof",
      description: "On-chain verification ensures credentials cannot be forged or altered."
    }
  ]

  const steps = [
    {
      number: "01",
      title: "Receive Credential",
      description: "Get verified credentials from trusted institutions directly to your wallet."
    },
    {
      number: "02",
      title: "Store Securely",
      description: "Your credentials live in your digital wallet. You control access."
    },
    {
      number: "03",
      title: "Verify Instantly",
      description: "Share proof when needed. Verifiers check authenticity in seconds."
    }
  ]

  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-[#0B1D3D] mb-6">
            Verify without
            <span className="block text-[#4FC3F7]">exposing personal data</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Proof lets you prove who you are — or what you qualify for — without revealing sensitive information. 
            Built for the decentralized web.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              to="/dashboard" 
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/verify" 
              className="btn-secondary inline-flex items-center justify-center"
            >
              Verify a Proof
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#0B1D3D]">100%</div>
              <div className="text-gray-600">Privacy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#0B1D3D]">0</div>
              <div className="text-gray-600">Data Stored</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#0B1D3D]">Instant</div>
              <div className="text-gray-600">Verification</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#0B1D3D">On-chain</div>
              <div className="text-gray-600">Security</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#0B1D3D] mb-12">
            Why Choose Proof?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow duration-300">
                <div className="text-[#4FC3F7] mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-[#0B1D3D] mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#0B1D3D] mb-12">
            How Proof Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-5xl font-bold text-[#4FC3F7] opacity-20 mb-2">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-[#0B1D3D] mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0B1D3D] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to take control of your identity?
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            Join thousands who are already using Proof for secure, private verification.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard" 
              className="bg-white text-[#0B1D3D] hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              Start Free
            </Link>
            <button className="border-2 border-white text-white hover:bg-white/10 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200">
              Book a Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landing