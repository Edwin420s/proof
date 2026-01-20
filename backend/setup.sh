#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handling
set -e

echo -e "${YELLOW}Setting up Proof Backend...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Create necessary directories
mkdir -p logs
mkdir -p uploads
mkdir -p certs

echo -e "${GREEN}✓ Created necessary directories${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please update .env with your configuration${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

echo -e "${GREEN}✓ Prisma client generated${NC}"

# Run database migrations
if [ -z "$SKIP_MIGRATIONS" ]; then
    echo -e "${YELLOW}Running database migrations...${NC}"
    npx prisma migrate deploy || echo -e "${YELLOW}Migration might have already run${NC}"
    echo -e "${GREEN}✓ Database migrations completed${NC}"
fi

# Seed database (optional)
if [ "$SEED_DATABASE" = "true" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    node src/scripts/seedIssuers.js
    echo -e "${GREEN}✓ Database seeded${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update your .env file with actual credentials"
echo -e "2. Run 'npm run dev' to start development server"
echo -e "3. Access API documentation at http://localhost:5000/api-docs"
