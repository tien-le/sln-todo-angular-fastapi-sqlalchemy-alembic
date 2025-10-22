#!/bin/bash
# Test runner script for backend

set -e

echo "🧪 Running Backend Tests..."
echo "================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt
pip install -q -r requirements-test.txt

# Run tests
echo ""
echo "🔬 Running tests..."
echo "================================"

# Run all tests with coverage
# Note: Coverage threshold set to 60% for now (will increase as we implement more features)
pytest app/tests/ \
    -v \
    --cov=app \
    --cov-report=term-missing \
    --cov-report=html \
    --cov-fail-under=60 \
    "$@"

echo ""
echo "✅ Tests completed!"
echo "📊 Coverage report available at: htmlcov/index.html"
