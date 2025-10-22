#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Starting Backend Application${NC}"
echo -e "${GREEN}===========================================${NC}"

# Function to wait for postgres
wait_for_postgres() {
    echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"

    max_retries=30
    retry_count=0

    until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
        retry_count=$((retry_count + 1))

        if [ $retry_count -ge $max_retries ]; then
            echo -e "${RED}Error: PostgreSQL is not available after $max_retries attempts${NC}"
            exit 1
        fi

        echo -e "${YELLOW}PostgreSQL is unavailable - attempt $retry_count/$max_retries - sleeping${NC}"
        sleep 2
    done

    echo -e "${GREEN}PostgreSQL is ready!${NC}"
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}Running Alembic migrations...${NC}"

    if alembic upgrade head; then
        echo -e "${GREEN}Migrations completed successfully!${NC}"
    else
        echo -e "${RED}Error: Migration failed${NC}"
        exit 1
    fi
}

# Function to check if migrations exist
check_migrations() {
    if [ ! "$(ls -A alembic/versions/*.py 2>/dev/null)" ]; then
        echo -e "${YELLOW}No migrations found. Creating initial migration...${NC}"
        alembic revision --autogenerate -m "Initial migration"
    fi
}

# Parse DATABASE_URL to extract connection details
if [ -n "$DATABASE_URL" ]; then
    # Extract from postgresql+asyncpg://user:pass@host:port/dbname
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export POSTGRES_PASSWORD=$DB_PASSWORD
fi

# Main execution
echo -e "${YELLOW}Environment: ${ENVIRONMENT:-development}${NC}"
echo -e "${YELLOW}Database Host: $DB_HOST${NC}"

# Wait for database
wait_for_postgres

# Check and run migrations
check_migrations
run_migrations

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Starting Application Server${NC}"
echo -e "${GREEN}===========================================${NC}"

# Execute the main command (passed as arguments to this script)
exec "$@"
