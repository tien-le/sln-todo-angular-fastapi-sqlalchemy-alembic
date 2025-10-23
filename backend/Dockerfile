# Multi-stage build for optimized production image

# Stage 1: Base
FROM python:3.12-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    libpq-dev \
    curl \
    dnsutils \
    iputils-ping \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies
FROM base as dependencies

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Set PATH to include local packages (inherited by all subsequent stages)
ENV PATH=/root/.local/bin:$PATH

# Stage 3: Runtime (common setup for development and production)
FROM dependencies as runtime

# Copy and setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Stage 4: Test
FROM dependencies as test

# Copy test requirements and install
COPY requirements-test.txt .
RUN pip install --user --no-cache-dir -r requirements-test.txt

# Copy application code
COPY . .

# Run tests
CMD ["pytest", "tests/", "-v", "--cov=app", "--cov-report=term", "--cov-report=html"]

# Stage 5: Development
FROM runtime as development

# Run with hot reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 6: Production
FROM runtime as production

# Create non-root user and set ownership
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application with multiple workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
