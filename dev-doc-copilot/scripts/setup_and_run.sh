#!/usr/bin/env bash
# =============================================================================
# Cognee Dev-Doc Copilot — Setup & First Run Script
# =============================================================================
# This script automates prerequisites, environment setup, cloning a sample
# repo, and running the dev-doc copilot starter.
#
# Usage:
#   chmod +x setup_and_run.sh
#   ./setup_and_run.sh
# =============================================================================

set -e  # Exit immediately if a command exits with a non-zero status

echo "========================================"
echo "Dev-Doc Copilot Setup"
echo "========================================"

# ---------------------------------------------------------------------------
# 1. Check Python version (3.9+ recommended)
# ---------------------------------------------------------------------------
echo ""
echo "[1/6] Checking Python..."
PYTHON_CMD=$(command -v python3 || command -v python || echo "")
if [ -z "$PYTHON_CMD" ]; then
    echo "ERROR: Python is not installed. Please install Python 3.9 or higher."
    exit 1
fi

PY_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Found Python $PY_VERSION"

# ---------------------------------------------------------------------------
# 2. Create virtual environment
# ---------------------------------------------------------------------------
echo ""
echo "[2/6] Creating virtual environment..."
if [ ! -d ".venv" ]; then
    $PYTHON_CMD -m venv .venv
    echo "Created .venv/"
else
    echo ".venv/ already exists."
fi

# Activate venv
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
else
    echo "ERROR: Could not find virtual environment activation script."
    exit 1
fi

# ---------------------------------------------------------------------------
# 3. Upgrade pip and install Cognee with codegraph support
# ---------------------------------------------------------------------------
echo ""
echo "[3/6] Installing cognee[codegraph]..."
pip install --upgrade pip
pip install cognee[codegraph]

# ---------------------------------------------------------------------------
# 4. Check OPENAI_API_KEY
# ---------------------------------------------------------------------------
echo ""
echo "[4/6] Checking OPENAI_API_KEY..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "ERROR: OPENAI_API_KEY is not set."
    echo "Please set it before running this script:"
    echo "    export OPENAI_API_KEY='sk-...'"
    exit 1
fi
echo "OPENAI_API_KEY is set."

# ---------------------------------------------------------------------------
# 5. Clone sample repo if not present
# ---------------------------------------------------------------------------
echo ""
echo "[5/6] Preparing sample repository..."
REPO_DIR="sample-repo"
if [ ! -d "$REPO_DIR" ]; then
    echo "Cloning topoteretes/cognee-starter into $REPO_DIR..."
    git clone https://github.com/topoteretes/cognee-starter.git "$REPO_DIR"
else
    echo "$REPO_DIR/ already exists."
fi

# ---------------------------------------------------------------------------
# 6. Run the starter script
# ---------------------------------------------------------------------------
echo ""
echo "[6/6] Running dev_doc_copilot_starter.py..."
echo "========================================"
if [ -f "dev_doc_copilot_starter.py" ]; then
    python dev_doc_copilot_starter.py
else
    echo "ERROR: dev_doc_copilot_starter.py not found in current directory."
    echo "Please place it here, then run this script again."
    exit 1
fi

echo ""
echo "========================================"
echo "Setup complete!"
echo "========================================"
