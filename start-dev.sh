#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Aura-Audit — Development startup script
# Usage: ./start-dev.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}  █████╗ ██╗   ██╗██████╗  █████╗     █████╗ ██╗   ██╗██████╗ ██╗████████╗${NC}"
echo -e "${CYAN}  ██╔══██╗██║   ██║██╔══██╗██╔══██╗   ██╔══██╗██║   ██║██╔══██╗██║╚══██╔══╝${NC}"
echo -e "${PURPLE}  ███████║██║   ██║██████╔╝███████║   ███████║██║   ██║██║  ██║██║   ██║   ${NC}"
echo -e "${CYAN}  ██╔══██║██║   ██║██╔══██╗██╔══██║   ██╔══██║██║   ██║██║  ██║██║   ██║   ${NC}"
echo -e "${PURPLE}  ██║  ██║╚██████╔╝██║  ██║██║  ██║   ██║  ██║╚██████╔╝██████╔╝██║   ██║   ${NC}"
echo ""
echo -e "${CYAN}  Auditing the past to engineer your future.${NC}"
echo ""

# Check .env
if [ ! -f ".env" ]; then
  echo -e "${RED}  ✗ .env not found. Copying from .env.example...${NC}"
  cp .env.example .env
  echo -e "${CYAN}  ⚠  Please fill in your API keys in .env before proceeding!${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ .env found${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}  Installing dependencies...${NC}"

echo -e "  → server/"
cd server && npm install --silent && cd ..

echo -e "  → client/"
cd client && npm install --silent && cd ..

echo -e "  → ai-engine/"
cd ai-engine && pip install -r requirements.txt -q && cd ..

echo -e "${GREEN}  ✓ All dependencies installed${NC}"

# Start services in parallel
echo ""
echo -e "${PURPLE}  Starting all services...${NC}"
echo ""

# MongoDB check
if command -v mongod &> /dev/null; then
  echo -e "${GREEN}  ✓ MongoDB available locally${NC}"
fi

# Launch
echo -e "${CYAN}  → AI Engine (FastAPI)  : http://localhost:8000${NC}"
echo -e "${CYAN}  → Backend (Express)    : http://localhost:5000${NC}"
echo -e "${CYAN}  → Frontend (Next.js)   : http://localhost:3000${NC}"
echo ""

# Run in parallel using & and trap
trap 'kill 0' SIGINT

(cd ai-engine && python -m uvicorn main:app --reload --port 8000 2>&1 | sed 's/^/  [AI] /') &
(cd server && npm run dev 2>&1 | sed 's/^/  [BE] /') &
(cd client && npm run dev 2>&1 | sed 's/^/  [FE] /') &

wait
