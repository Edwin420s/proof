#!/bin/bash

# Cleanup script for Proof Backend

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Cleaning up Proof Backend...${NC}"

# Remove node_modules
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}Removing node_modules...${NC}"
    rm -rf node_modules
    echo -e "${GREEN}✓ node_modules removed${NC}"
fi

# Remove build artifacts
if [ -d "dist" ]; then
    echo -e "${YELLOW}Removing dist directory...${NC}"
    rm -rf dist
    echo -e "${GREEN}✓ dist removed${NC}"
fi

# Remove logs
if [ -d "logs" ]; then
    echo -e "${YELLOW}Removing logs...${NC}"
    rm -rf logs/*
    echo -e "${GREEN}✓ logs cleared${NC}"
fi

# Remove Docker containers and images
if command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Removing Docker containers...${NC}"
    docker-compose down -v || true
    echo -e "${GREEN}✓ Docker containers removed${NC}"
fi

# Remove cache
if [ -d ".cache" ]; then
    echo -e "${YELLOW}Removing cache...${NC}"
    rm -rf .cache
    echo -e "${GREEN}✓ cache removed${NC}"
fi

# Clean npm cache
echo -e "${YELLOW}Cleaning npm cache...${NC}"
npm cache clean --force
echo -e "${GREEN}✓ npm cache cleaned${NC}"

echo -e "${GREEN}Cleanup complete!${NC}"
echo -e "${YELLOW}To reinstall, run: npm install${NC}"
