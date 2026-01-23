import { Heart, Github, Twitter } from 'lucide-react'

const Footer = () => {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Proof</h3>
                        <p className="text-sm text-gray-600">
                            Privacy-first identity verification for the decentralized web
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                            Quick Links
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <a href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                    Dashboard
                                </a>
                            </li>
                            <li>
                                <a href="/request" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                    Request Credential
                                </a>
                            </li>
                            <li>
                                <a href="/verify" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                    Verify Credential
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Social Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                            Connect
                        </h4>
                        <div className="flex space-x-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                aria-label="GitHub"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                aria-label="Twitter"
                            >
                                <Twitter className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm text-gray-500">
                            © {currentYear} Proof. All rights reserved.
                        </p>
                        <p className="text-sm text-gray-500 flex items-center">
                            Built with <Heart className="w-4 h-4 mx-1 text-red-500" fill="currentColor" /> for W3Node Hackathon
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
