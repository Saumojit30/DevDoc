@echo off
REM ===========================================================================
REM DevDoc — Setup & First Run (Windows)
REM ===========================================================================

echo ========================================
echo DevDoc Setup
echo ========================================

REM 1. Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.9+.
    exit /b 1
)

REM 2. Create venv
echo [1/5] Creating virtual environment...
if not exist .venv (
    python -m venv .venv
) else (
    echo .venv already exists.
)

REM 3. Activate and install
call .venv\Scripts\activate.bat
pip install --upgrade pip
pip install cognee[codegraph]

REM 4. Check API key
echo [2/5] Checking OPENAI_API_KEY...
if "%OPENAI_API_KEY%"=="" (
    echo ERROR: OPENAI_API_KEY is not set.
    echo     set OPENAI_API_KEY=sk-...
    exit /b 1
)

REM 5. Clone repo
echo [3/5] Preparing sample repository...
if not exist sample-repo (
    git clone https://github.com/topoteretes/cognee-starter.git sample-repo
) else (
    echo sample-repo already exists.
)

REM 6. Run
echo [4/5] Running starter...
python devdoc_starter.py

echo [5/5] Done.
