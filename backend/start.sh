#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Proof Backend Stack...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose found${NC}"

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose down || true

# Remove old images
if [ "$REBUILD" = "true" ]; then
    echo -e "${YELLOW}Removing old images...${NC}"
    docker-compose rm -f
fi

# Build and start services
echo -e "${YELLOW}Building and starting services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
echo -e "${YELLOW}Checking service health...${NC}"

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${RED}✗ MongoDB failed to start${NC}"
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis failed to start${NC}"
    exit 1
fi

# Check Backend
if [ "$(docker-compose exec -T backend npm -v)" ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All services started successfully!${NC}"
echo -e "${YELLOW}Services:${NC}"
echo -e "  MongoDB: mongodb://admin:password@localhost:27017"
echo -e "  Redis: redis://localhost:6379"
echo -e "  Backend API: http://localhost:5000"
echo -e "  API Docs: http://localhost:5000/api-docs"
echo -e ""
echo -e "${YELLOW}To view logs: docker-compose logs -f [service_name]${NC}"
echo -e "${YELLOW}To stop services: docker-compose down${NC}"
