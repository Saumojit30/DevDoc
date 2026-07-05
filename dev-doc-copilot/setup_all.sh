#!/usr/bin/env bash
# =============================================================================
# Dev-Doc Copilot — Complete Setup
# =============================================================================
# Run this from the dev-doc-copilot/ root directory.
#
# Usage:
#   chmod +x setup_all.sh
#   ./setup_all.sh
# =============================================================================

set -e

echo "========================================"
echo "Dev-Doc Copilot — Complete Setup"
echo "========================================"

# 1. Backend
if [ -d "backend" ]; then
    echo ""
    echo "[1/2] Setting up backend..."
    cd backend
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo "Backend ready."
fi

# 2. Frontend
if [ -d "frontend" ]; then
    echo ""
    echo "[2/2] Setting up frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    cd ..
    echo "Frontend ready."
fi

echo ""
echo "========================================"
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd backend && cp .env.example .env"
echo "  2. Edit .env and add OPENAI_API_KEY"
echo "  3. Terminal 1: cd backend && source .venv/bin/activate && uvicorn main:app --reload"
echo "  4. Terminal 2: cd frontend && npm run dev"
echo "  5. Open http://localhost:3000"
echo "========================================"
