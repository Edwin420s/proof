# Proof Backend - Identity & Security Solution

Proof is a comprehensive backend solution for managing digital identity credentials on the blockchain, built with Node.js, Express, TypeScript, and Prisma ORM. It supports credential issuance, verification, and revocation using smart contracts.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Credential Management**: Issue, verify, and revoke digital credentials
- **Blockchain Integration**: Store credentials on Polygon Mumbai testnet
- **DID Support**: W3C Decentralized Identifier implementation
- **JWT Authentication**: Secure API access with JWT tokens
- **Rate Limiting**: Protect API endpoints from abuse
- **Request Logging**: Comprehensive request/response logging
- **Error Handling**: Centralized error handling with meaningful responses
- **Input Validation**: Request validation using Joi/Yup
- **Async Processing**: Background job queue for long-running tasks
- **API Documentation**: Swagger/OpenAPI specification with UI
- **Docker Support**: Containerized development and production environments
- **Database Migrations**: Automated schema management with Prisma
- **Audit Logging**: Track all important operations
- **Analytics**: Usage tracking and reporting

## Tech Stack

### Core
- **Node.js** 18+
- **Express.js** 4.x
- **TypeScript** 5.x
- **Prisma ORM** 5.x

### Database
- **MongoDB** 5.0+
- **Redis** 7.0+ (for queuing and caching)

### Blockchain
- **Ethers.js** (smart contract interaction)
- **Polygon Mumbai** (testnet)
- **Solidity** smart contracts

### Authentication & Security
- **JWT** (JSON Web Tokens)
- **bcryptjs** (password hashing)
- **helmet** (HTTP security headers)
- **express-rate-limit** (rate limiting)

### Validation & Documentation
- **Joi** (schema validation)
- **Swagger/OpenAPI** (API documentation)

### Logging & Monitoring
- **Winston** (structured logging)
- **Morgan** (HTTP request logging)
- **Sentry** (error tracking - optional)

### Testing
- **Jest** (unit and integration tests)
- **Supertest** (HTTP testing)

### DevOps
- **Docker** & **Docker Compose**
- **Nginx** (reverse proxy)

## Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Docker**: 20.10.0 or higher (optional, for containerized setup)
- **Docker Compose**: 1.29.0 or higher (optional)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/proof-backend.git
cd proof-backend
```

### 2. Quick Setup (Automated)

```bash
chmod +x setup.sh
./setup.sh
```

### 3. Manual Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create environment file
cp .env.example .env

# Update .env with your configuration
nano .env

# Run database migrations
npx prisma migrate deploy

# Optional: Seed database
npm run seed
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory using `.env.example` as a template:

```bash
cp .env.example .env
```

Key configuration variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `APP_PORT` | API server port | 5000 |
| `DATABASE_URL` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `BLOCKCHAIN_RPC_URL` | Polygon RPC endpoint | - |
| `WALLET_PRIVATE_KEY` | Wallet private key for transactions | - |

See `.env.example` for complete list.

### Database Setup

Prisma schema is located at `prisma/schema.prisma`. To create/update tables:

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply pending migrations
npx prisma migrate deploy

# View database UI (optional)
npx prisma studio
```

## Running the Application

### Development Mode

```bash
# Using npm
npm run dev

# Using Docker Compose
docker-compose up -d

# View logs
npm run logs
```

### Production Mode

```bash
# Build application
npm run build

# Start production server
npm start

# Using Docker
docker build -t proof-backend:latest -f Dockerfile.prod .
docker run -p 5000:5000 --env-file .env proof-backend:latest
```

### With Docker Compose

```bash
# Start all services
chmod +x start.sh
./start.sh

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Documentation

Once the server is running, access the API documentation:

- **Swagger UI**: http://localhost:5000/api-docs
- **OpenAPI JSON**: http://localhost:5000/api-docs/json

### Core Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout and invalidate token

#### Credentials
- `GET /api/credentials` - List credentials
- `POST /api/credentials` - Issue new credential
- `GET /api/credentials/:id` - Get credential details
- `POST /api/credentials/:id/verify` - Verify credential
- `POST /api/credentials/:id/revoke` - Revoke credential

#### Issuers
- `GET /api/issuers` - List issuers
- `POST /api/issuers` - Register new issuer
- `GET /api/issuers/:id` - Get issuer details
- `PUT /api/issuers/:id` - Update issuer

#### Verification
- `POST /api/verification/verify` - Verify credential
- `GET /api/verification/status/:id` - Get verification status

#### Health
- `GET /health` - Health check endpoint
- `GET /api/health/status` - Detailed health status

## Project Structure

```
backend/
├── src/
│   ├── index.js                 # Application entry point
│   ├── config/                  # Configuration files
│   │   ├── database.js          # Database connection
│   │   └── swagger.js           # API documentation
│   ├── controllers/             # Route controllers
│   │   ├── authController.js
│   │   ├── credentialController.js
│   │   ├── issuerController.js
│   │   ├── verificationController.js
│   │   └── ...
│   ├── middleware/              # Express middleware
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── loggerMiddleware.js
│   │   └── rateLimitMiddleware.js
│   ├── models/                  # Prisma models (ORM)
│   │   ├── User.js
│   │   ├── Credential.js
│   │   ├── Issuer.js
│   │   └── ...
│   ├── routes/                  # API routes
│   │   ├── authRoutes.js
│   │   ├── credentialRoutes.js
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── authService.js
│   │   ├── credentialService.js
│   │   ├── blockchainService.js
│   │   └── ...
│   ├── utils/                   # Utility functions
│   │   ├── jwt.js
│   │   ├── validators.js
│   │   ├── blockchain.js
│   │   └── ...
│   └── scripts/                 # Database seeds and scripts
│       └── seedIssuers.js
├── prisma/
│   └── schema.prisma            # Database schema
├── tests/                       # Test files
│   ├── auth.test.js
│   ├── credential.test.js
│   └── ...
├── docker-compose.yml           # Local development compose file
├── Dockerfile                   # Development Dockerfile
├── Dockerfile.prod              # Production Dockerfile
├── nginx.conf                   # Nginx configuration
├── package.json                 # Node dependencies
├── .env.example                 # Environment variables template
├── .dockerignore                # Docker build exclusions
├── tsconfig.json               # TypeScript configuration
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                  # Prettier configuration
└── README.md                    # This file
```

## Development

### Code Style

This project uses ESLint and Prettier for code consistency:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Lint and fix
npm run lint:fix
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_new_field

# View migration history
npx prisma migrate status

# Rollback (dev only)
npx prisma migrate resolve

# Generate Prisma client
npx prisma generate
```

## Deployment

### Prerequisites for Production

1. Update `.env` with production credentials
2. Set `NODE_ENV=production`
3. Configure SSL certificates
4. Set up monitoring and logging

### Docker Deployment

```bash
# Build production image
docker build -f Dockerfile.prod -t proof-backend:1.0.0 .

# Run container
docker run -d \
  --name proof-backend \
  -p 5000:5000 \
  --env-file .env \
  proof-backend:1.0.0
```

### Kubernetes Deployment

Use provided Helm charts or Kubernetes manifests in the `k8s/` directory.

### Cloud Deployment

#### AWS (EC2/ECS)
- See `deploy/aws/` for CloudFormation templates

#### Heroku
```bash
git push heroku main
```

#### Railway
```bash
railway up
```

## API Security

- All endpoints require JWT authentication (except `/api/auth/login` and `/api/auth/register`)
- API keys are rate-limited: 100 requests per 15 minutes
- CORS is configured for frontend domains only
- Passwords are hashed with bcryptjs
- Environment variables are never committed to version control

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### MongoDB Connection Failed
```bash
# Verify MongoDB is running
docker ps | grep mongo

# Check connection string in .env
echo $DATABASE_URL
```

### Prisma Client Not Generated
```bash
# Regenerate Prisma client
npx prisma generate
```

### Docker Build Fails
```bash
# Clear Docker cache and rebuild
docker-compose down -v
docker-compose build --no-cache
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/proof-backend/issues
- Email: support@proof.com
- Discord: [Join our community](https://discord.gg/proof)

---

**Last Updated**: 2024
**Maintained By**: Proof Team
