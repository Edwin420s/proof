import { Link } from 'react-router-dom'
import { Shield, Twitter, Github, Linkedin, Mail } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    Product: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Verification', path: '/verify' },
      { name: 'Issuer Portal', path: '/issuer' },
      { name: 'API Documentation', path: '#' },
    ],
    Company: [
      { name: 'About', path: '#' },
      { name: 'Blog', path: '#' },
      { name: 'Careers', path: '#' },
      { name: 'Contact', path: '#' },
    ],
    Legal: [
      { name: 'Privacy Policy', path: '#' },
      { name: 'Terms of Service', path: '#' },
      { name: 'Cookie Policy', path: '#' },
      { name: 'Compliance', path: '#' },
    ],
    Resources: [
      { name: 'Help Center', path: '#' },
      { name: 'Community', path: '#' },
      { name: 'Developers', path: '#' },
      { name: 'Status', path: '#' },
    ]
  }

  return (
    <footer className="bg-[#0B1D3D] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-white rounded-lg">
                <Shield className="w-6 h-6 text-[#0B1D3D]" />
              </div>
              <span className="text-xl font-bold">Proof</span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-md">
              A privacy-first identity verification system for the decentralized web. 
              Verify without exposing personal data.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-lg mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.path.startsWith('#') ? (
                      <a 
                        href={link.path}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link 
                        to={link.path}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="max-w-md">
            <h3 className="font-semibold text-lg mb-4">Stay Updated</h3>
            <p className="text-gray-300 mb-4">
              Subscribe to our newsletter for the latest updates on decentralized identity.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-grow px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4FC3F7]"
              />
              <button className="btn-secondary">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-300 text-sm">
              © {currentYear} Proof. All rights reserved.
            </div>
            <div className="text-gray-300 text-sm">
              Built for the W3Node Hackathon • Identity & Security Track
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-300">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer