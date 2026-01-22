# Proof Frontend - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Install Dependencies
```bash
cd /home/skywalker/Projects/prj/Proof/frontend
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
Navigate to: **http://localhost:5173**

---

## 📋 Project Structure Overview

```
frontend/
├── public/                    # Static assets
│   └── index.html             # HTML template
├── src/
│   ├── pages/                 # 5 main pages
│   ├── components/            # Reusable React components
│   ├── contexts/              # React Context for state
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # API & blockchain services
│   ├── store/                 # Zustand state management
│   ├── styles/                # CSS & Tailwind styles
│   ├── utils/                 # Helper utilities
│   ├── App.jsx                # Main app component
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles
├── package.json               # Dependencies
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
└── .env.example               # Environment template
```

---

## 🎯 Main Features

### Landing Page (/)
- Product overview
- Feature showcase
- Call-to-action buttons

### Dashboard (/dashboard)
- View your credentials
- Manage wallet
- Request new credentials
- Generate proofs

### Request Credential (/request)
- Multi-step form
- Select credential type
- Upload supporting docs
- Submit for verification

### Verify Proof (/verify)
- QR code scanning
- Direct link verification
- File upload
- Instant verification results

### Issuer Panel (/issuer)
- Manage credential requests
- Issue new credentials
- View issued credentials
- Revoke credentials
- Track statistics

---

## 🔧 Available Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Create production build
npm run preview          # Preview production build

# Linting
npm run lint             # Run ESLint
npm run lint -- --fix    # Fix linting issues

# Formatting
npm run format           # Format code with Prettier (if available)
```

---

## 🎨 Design System

### Colors
- Primary Navy: `#0B1D3D`
- Accent Cyan: `#4FC3F7`
- Success Green: `#22C55E`
- Error Red: `#EF4444`

### Components
All components use Tailwind CSS with consistent styling:
- Buttons (primary, secondary, outline)
- Cards with hover effects
- Forms with validation
- Modals for overlays
- Responsive grid layouts

---

## 📱 Responsive Design

- **Mobile**: < 640px (optimized for phones)
- **Tablet**: 640px - 1024px (iPad-size screens)
- **Desktop**: > 1024px (full experience)

All components are mobile-first responsive.

---

## 🔐 Authentication Flow

1. User lands on Landing page
2. Clicks "Get Started"
3. Wallet Connect modal opens
4. User selects wallet (MetaMask, etc.)
5. Wallet signs message
6. User authenticated & redirected to Dashboard
7. Can now manage credentials

---

## 📊 Credential Workflow

### User Perspective
1. **Request**: Submit credential request form
2. **Wait**: Issuer reviews & approves
3. **Receive**: Credential added to dashboard
4. **Prove**: Generate QR code/link for verifier
5. **Share**: Verifier scans/opens proof

### Issuer Perspective
1. **Manage**: Review pending requests
2. **Verify**: Approve credentials with attributes
3. **Issue**: Credential stored on blockchain
4. **Track**: Monitor usage & verification count
5. **Revoke**: Can revoke if needed

### Verifier Perspective
1. **Scan**: QR code or enter proof link
2. **Verify**: Instant blockchain verification
3. **Result**: See if credential is valid
4. **View**: See revealed attributes only
5. **Record**: Log verification (optional)

---

## 🛠️ Customization

### Change Colors
Edit `tailwind.config.js`:
```js
theme: {
  colors: {
    'proof-primary': '#0B1D3D',  // Change primary color
    'proof-secondary': '#4FC3F7', // Change secondary color
  }
}
```

### Add New Pages
1. Create new file in `src/pages/`
2. Add route in `src/App.jsx`
3. Add nav link in `src/components/common/Navbar.jsx`

### Add New Components
1. Create in appropriate folder in `src/components/`
2. Import and use in pages
3. Reuse across application

### Update Styles
- Global styles: `src/index.css`
- Theme styles: `src/styles/theme.css`
- Component styles: Inline Tailwind classes

---

## 🔌 Integration Points

### Backend APIs
Services connect to backend in `src/services/api.js`:
- User authentication
- Credential management
- Verification tracking
- Analytics

### Smart Contracts
Contract interactions in `src/services/contracts.js`:
- Issuer registry
- Credential registry
- DID registry
- Revocation tracking

### Polygon ID
Integration via `src/services/polygonId.js`:
- DID creation
- Credential issuance
- ZK proof generation
- Proof verification

### IPFS Storage
Utilities in `src/utils/ipfsUtils.js`:
- Store credential metadata
- Retrieve proofs
- Pin important data

---

## 🧪 Testing the App

### Demo Credentials
Click "Dashboard" → See mock credentials:
- BSc Computer Science (University of Cape Town)
- Age Verification (Proof Network)
- Professional Certificate (W3Node)

### Test Verification
1. Go to "Verify Proof"
2. Click "Valid Degree Proof" (demo button)
3. See instant verification result

### Test Issuer Panel
1. Go to "Issuer Panel"
2. See pending credential requests
3. Click "Approve" to issue
4. View issued credentials

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# If 5173 is busy, Vite uses next available port
# Check console output for actual URL
```

### Dependencies Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Tailwind Styles Not Showing
```bash
# Rebuild Tailwind cache
npm run build
# Or restart dev server
npm run dev
```

### Wallet Not Connecting
- Ensure MetaMask is installed
- Try refreshing page
- Check wallet is unlocked
- Check network is correct

---

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app routing |
| `src/main.jsx` | React entry point |
| `src/contexts/WalletContext.jsx` | Wallet state |
| `src/pages/Dashboard.jsx` | Main user page |
| `src/services/api.js` | Backend communication |
| `tailwind.config.js` | Theme configuration |
| `vite.config.js` | Build configuration |

---

## 🎓 Learning Resources

### React
- https://react.dev
- https://react-router.org

### Tailwind CSS
- https://tailwindcss.com
- https://tailwindui.com

### Web3
- https://docs.ethers.org
- https://polygonid.com

### Vite
- https://vitejs.dev

---

## 🤝 Contributing

To add features:
1. Create feature branch
2. Make changes
3. Test locally
4. Submit PR

---

## 📝 License

MIT License - Built for W3Node Hackathon 2026

---

## ❓ Need Help?

Check these files:
- `BUILD_VERIFICATION.md` - Full project status
- `README.md` - Project overview
- Component files - Inline documentation
- `.env.example` - Configuration template

---

**Happy coding! 🚀**

For latest updates, check the project repository:
`/home/skywalker/Projects/prj/Proof/`
