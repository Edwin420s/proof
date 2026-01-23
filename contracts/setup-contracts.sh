#!/bin/bash

# Proof Smart Contracts Setup & Deployment Script

set -e  # Exit on error

echo "🔐 Proof Smart Contracts Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check directory
if [ ! -f "hardhat.config.js" ]; then
    echo -e "${RED}❌ Error: Must run from contracts directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing contract dependencies...${NC}"
npm install || {
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
}
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking environment configuration...${NC}"
ENV_FILE="../backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo -e "${YELLOW}   Create .env in backend directory with:${NC}"
    echo -e "${YELLOW}   - POLYGON_RPC_URL${NC}"
    echo -e "${YELLOW}   - ADMIN_WALLET_PRIVATE_KEY${NC}"
    echo -e "${YELLOW}   - POLYGONSCAN_API_KEY (optional)${NC}"
    exit 1
fi

# Check required variables
source "$ENV_FILE"
if [ -z "$POLYGON_RPC_URL" ]; then
    echo -e "${RED}❌ POLYGON_RPC_URL not set in .env${NC}"
    exit 1
fi
if [ -z "$ADMIN_WALLET_PRIVATE_KEY" ] && [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ ADMIN_WALLET_PRIVATE_KEY or PRIVATE_KEY not set in .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Environment configured${NC}"
echo ""

echo -e "${YELLOW}Step 3: Compiling smart contracts...${NC}"
npm run compile || {
    echo -e "${RED}❌ Compilation failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Contracts compiled successfully${NC}"
echo ""

echo -e "${YELLOW}Step 4: Running contract tests...${NC}"
echo -e "${BLUE}ℹ️  Running tests (this may take a minute)...${NC}"
npm test || {
    echo -e "${YELLOW}⚠️  Some tests failed. Review output above.${NC}"
    read -p "Continue with deployment anyway? (y/N): " continue_deploy
    if [[ ! $continue_deploy =~ ^[Yy]$ ]]; then
        exit 1
    fi
}
echo -e "${GREEN}✅ Tests completed${NC}"
echo ""

echo "================================"
echo -e "${GREEN}✅ Contracts are ready for deployment!${NC}"
echo ""
echo -e "${BLUE}Deployment options:${NC}"
echo "  • Local testnet:    npm run deploy:localhost"
echo "  • Polygon Mumbai:   npm run deploy:mumbai"
echo "  • Polygon Amoy:     npm run deploy:amoy"
echo "  • Polygon Mainnet:  npm run deploy:mainnet"
echo ""
echo -e "${YELLOW}After deployment:${NC}"
echo "  1. Copy contract addresses from deployment output"
echo "  2. Update backend/.env with contract addresses"
echo "  3. Run backend setup: cd ../backend && ./setup.sh"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions"
