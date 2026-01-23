# Proof - Quick Start Guide

## Prerequisites
- Node.js 18+
- PostgreSQL
- MetaMask wallet with Polygon Mumbai test MATIC

## 1. Deploy Smart Contracts

```bash
cd contracts
npm install
npm run compile

# Deploy to Mumbai testnet
npm run deploy:mumbai

# Save the deployed contract addresses from output
```

## 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Edit .env and add:
# - DATABASE_URL (PostgreSQL)
# - Deployed contract addresses from step 1
# - POLYGON_RPC_URL (Alchemy/Infura Mumbai endpoint)
# - JWT_SECRET (generate with: openssl rand -hex 32)
# - ENCRYPTION_KEY (generate with: openssl rand -hex 32)

# Run database migrations
npx prisma migrate deploy

# Start backend
npm run dev
```

Backend will run on `http://localhost:5000`

## 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Update contract addresses in src/utils/contracts.js

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## 4. Demo Flow

### Register as Issuer
1. Connect wallet to frontend
2. Register as issuer (e.g., "Demo University")
3. Admin wallet verifies issuer via backend API or admin panel

### Issue Credential
1. Student connects wallet
2. Requests credential from verified issuer
3. Issuer approves → credential hash stored on-chain
4. Student sees credential in dashboard

### Verify Credential
1. Verifier (employer) creates verification request
2. Student scans QR or clicks link
3. Generates ZK proof
4. Verifier checks proof on-chain → instant result

## Troubleshooting

**Contracts won't deploy**: Ensure you have Mumbai MATIC (get from polygon faucet)
**Backend won't start**: Check DATABASE_URL and contract addresses in .env
**Frontend can't connect**: Update RPC URL and contract addresses

## Test Accounts

For demo purposes, you can create:
- Admin wallet (deploys contracts)
- Issuer wallet (university)
- User wallet (student)
- Verifier wallet (employer)

All need small amount of test MATIC for gas.
