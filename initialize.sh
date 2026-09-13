#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON="$VENV_DIR/bin/python"

if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 is required." >&2
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is required." >&2
    exit 1
fi

if [ ! -x "$PYTHON" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

echo "Installing Python dependencies..."
"$PYTHON" -m pip install -r "$ROOT_DIR/requirements.txt"

echo "Installing frontend dependencies..."
npm install --prefix "$ROOT_DIR/frontend"

echo "Running Python tests..."
(
    cd "$ROOT_DIR"
    "$PYTHON" -m unittest test_suite
)

echo "Building Coal Mine GIS module..."
if [ -d "$ROOT_DIR/frontend/coal-mine-gis" ]; then
    if [ ! -d "$ROOT_DIR/frontend/coal-mine-gis/node_modules" ]; then
        echo "Installing Coal Mine GIS dependencies..."
        npm install --prefix "$ROOT_DIR/frontend/coal-mine-gis"
    fi
    npm run build --prefix "$ROOT_DIR/frontend/coal-mine-gis"
fi

echo "Linting and building frontend..."
npm run lint --prefix "$ROOT_DIR/frontend"
npm run build --prefix "$ROOT_DIR/frontend"

echo "Initialization complete."