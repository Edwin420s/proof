# Proof - Self-Sovereign Identity Verification

**W3Node 2026 Hackathon | Identity & Security Track**

> Verify who you are without revealing personal data

##  Problem We're Solving

People are forced to share full documents (IDs, certificates, transcripts) just to prove simple facts like "I'm over 18" or "I have a degree". This creates:
- **Data overexposure** - sharing more than necessary
- **Loss of control** - documents copied everywhere
- **Security risks** - centralized databases get breached
- **Repeated verification** - same process for every platform

## Solution: Proof

Proof lets users prove claims about themselves using **verifiable credentials** and **zero-knowledge proofs** - without exposing personal information.

**Example**: Prove you have a university degree without showing your transcript, student ID, or date of birth.

## How It Works

1. **Issuer** (university, employer, government) issues a verifiable credential
2. **User** stores credential in their wallet (self-sovereign)
3. **Verifier** (employer, platform) requests proof
4. **User** generates ZK proof and shares only what's needed
5. **Verification** happens trustlessly on-chain

## Architecture

### On-Chain (Polygon)
- **IssuerRegistry**: Trusted issuer management
- **CredentialRegistry**: Credential issuance, revocation, verification
- **DIDRegistry**: Decentralized identifiers

### Off-Chain
- Backend API (Node.js + Express)
- PostgreSQL (metadata only, no personal data)
- IPFS (credential metadata storage)

### Frontend
- React + Tailwind
- ethers.js for blockchain interaction
- Wallet integration (MetaMask, WalletConnect)

## Tech Stack

**Blockchain**: Polygon PoS (Mumbai testnet)
**Smart Contracts**: Solidity 0.8.19
**Backend**: Node.js, Express, Prisma
**Frontend**: React, Tailwind CSS
**Identity**: W3C DIDs, Verifiable Credentials
**Storage**: IPFS, PostgreSQL

## Key Features

✅ **Self-Sovereign Identity** - Users own their credentials
✅ **Privacy-Preserving** - Minimal disclosure via ZK proofs  
✅ **Tamper-Proof** - Cryptographically signed credentials
✅ **Trustless Verification** - On-chain verification without intermediaries
✅ **Revocation Support** - Issu

ers can revoke credentials
✅ **Portable** - Works across platforms via DIDs

## Project Structure

```
proof/
├── contracts/          # Solidity smart contracts
│   ├── IssuerRegistry.sol
│   ├── CredentialRegistry.sol
│   └── DIDRegistry.sol
├── backend/            # Node.js API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   └── utils/
│   └── prisma/
└── frontend/           # React UI
    └── src/
        ├── pages/
        ├── components/
        └── utils/
```

## Quick Start

### 1. Deploy Smart Contracts

```bash
cd contracts
npm install
npm run compile
npm run deploy:mumbai
```

### 2. Start Backend

```bash
cd backend
npm install
cp .env.example .env
# Update .env with contract addresses
npm run migrate
npm run dev
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

**Authentication**
- `POST /api/auth/login` - Wallet signature login

**Credentials**
- `POST /api/credentials/request` - Request credential
- `GET /api/credentials` - List user credentials
- `POST /api/credentials/:id/proof` - Generate ZK proof

**Verification**
- `POST /api/verify/request` - Create verification request
- `POST /api/verify/response` - Submit proof

**Issuers**
- `GET /api/issuers` - List verified issuers

## Smart Contract Functions

**IssuerRegistry**
- `registerIssuer()` - Register as issuer
- `verifyIssuer()` - Admin approves issuer
- `isVerifiedIssuer()` - Check issuer status

**CredentialRegistry**
- `issueCredential()` - Issue credential hash
- `revokeCredential()` - Revoke credential
- `verifyProof()` - Verify proof on-chain

## Hackathon Demo Flow

1. University registers as issuer → verified by admin
2. Student requests degree credential
3. University issues credential → hash stored on-chain
4. Student applies for job
5. Employer requests degree verification
6. Student generates ZK proof (shows only "has degree")
7. Employer verifies proof on-chain → instant confirmation

## Why This Matters

- **Privacy**: Share only what's needed
- **Security**: No central identity database to hack
- **Inclusion**: Works without formal government IDs
- **Portability**: One identity, multiple platforms
- **Trust**: Blockchain ensures authenticity

## Team

Built for W3Node 2026 Identity & Security Track

## License

MIT License

---

**Live Demo**: [Coming Soon]  
**Contract (Mumbai)**: [Will be deployed]  
**Documentation**: See `/docs` folder
