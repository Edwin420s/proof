import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './contexts/WalletContext.jsx'
import Navbar from './components/common/Navbar.jsx'
import Footer from './components/common/Footer.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CredentialRequest from './pages/CredentialRequest.jsx'
import CredentialVerify from './pages/CredentialVerify.jsx'
import IssuerPanel from './pages/IssuerPanel.jsx'

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/request" element={<CredentialRequest />} />
              <Route path="/verify" element={<CredentialVerify />} />
              <Route path="/issuer" element={<IssuerPanel />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  )
}

export default App