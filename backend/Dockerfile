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
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies
FROM base as dependencies

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 3: Test
FROM dependencies as test

# Copy test requirements
COPY requirements-test.txt .
RUN pip install --user --no-cache-dir -r requirements-test.txt

# Set PATH to include local packages
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Run tests
CMD ["pytest", "tests/", "-v", "--cov=app", "--cov-report=term", "--cov-report=html"]

# Stage 4: Development
FROM dependencies as development

# Set PATH to include local packages
ENV PATH=/root/.local/bin:$PATH

# Copy entrypoint script first
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Run with hot reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 5: Production
FROM base as production

# Copy installed packages from dependencies stage
COPY --from=dependencies /root/.local /root/.local

# Set PATH to include local packages
ENV PATH=/root/.local/bin:$PATH

# Copy entrypoint script first (as root)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
