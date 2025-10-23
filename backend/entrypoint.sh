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
    echo -e "${YELLOW}Attempting to connect to: $DB_HOST:$DB_PORT${NC}"

    max_retries=30
    retry_count=0

    # Use pg_isready for lighter health check (Railway-friendly)
    until PGPASSWORD=$POSTGRES_PASSWORD pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; do
        retry_count=$((retry_count + 1))

        if [ $retry_count -ge $max_retries ]; then
            echo -e "${RED}Error: PostgreSQL is not available after $max_retries attempts${NC}"
            echo -e "${RED}Connection details:${NC}"
            echo -e "${RED}  Host: $DB_HOST${NC}"
            echo -e "${RED}  Port: $DB_PORT${NC}"
            echo -e "${RED}  User: $DB_USER${NC}"
            echo -e "${RED}  Database: $DB_NAME${NC}"

            # Try to get more debug info
            echo -e "${YELLOW}Attempting DNS resolution...${NC}"
            nslookup "$DB_HOST" || echo -e "${RED}DNS resolution failed${NC}"

            echo -e "${YELLOW}Attempting ping...${NC}"
            ping -c 3 "$DB_HOST" || echo -e "${RED}Ping failed${NC}"

            exit 1
        fi

        echo -e "${YELLOW}PostgreSQL is unavailable - attempt $retry_count/$max_retries - sleeping${NC}"
        sleep 2
    done

    echo -e "${GREEN}PostgreSQL is ready!${NC}"

    # Verify we can actually connect with psql
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        echo -e "${GREEN}PostgreSQL connection verified!${NC}"
    else
        echo -e "${YELLOW}Warning: pg_isready succeeded but psql connection failed${NC}"
        echo -e "${YELLOW}This may indicate permission issues${NC}"
    fi
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
# Priority: DATABASE_PUBLIC_URL > PG* variables > DATABASE_URL > DATABASE_URL_RAILWAY
# Railway provides DATABASE_PUBLIC_URL for public proxy connections
if [ -n "$DATABASE_PUBLIC_URL" ]; then
    # Railway's public URL (recommended for Railway deployment)
    echo -e "${GREEN}Using DATABASE_PUBLIC_URL (Railway public proxy)${NC}"
    DB_USER=$(echo $DATABASE_PUBLIC_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_PUBLIC_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_PUBLIC_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
    DB_PORT=$(echo $DATABASE_PUBLIC_URL | sed -n 's/.*:\/\/[^:]*:[^@]*@[^:]*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_PUBLIC_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    export POSTGRES_PASSWORD=$DB_PASSWORD
elif [ -n "$PGHOST" ] && [ -n "$PGUSER" ] && [ -n "$PGDATABASE" ]; then
    # Railway provides standard PostgreSQL environment variables
    echo -e "${GREEN}Using Railway PostgreSQL environment variables${NC}"
    DB_HOST=${PGHOST}
    DB_PORT=${PGPORT:-5432}
    DB_USER=${PGUSER}
    DB_PASSWORD=${PGPASSWORD}
    DB_NAME=${PGDATABASE}
    export POSTGRES_PASSWORD=$PGPASSWORD
elif [ -n "$DATABASE_URL" ]; then
    # Fall back to parsing DATABASE_URL
    echo -e "${GREEN}Parsing DATABASE_URL for connection details${NC}"
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:[^@]*@[^:]*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    export POSTGRES_PASSWORD=$DB_PASSWORD
elif [ -n "$DATABASE_URL_RAILWAY" ]; then
    # Legacy support for DATABASE_URL_RAILWAY
    echo -e "${GREEN}Parsing DATABASE_URL_RAILWAY for connection details${NC}"
    DB_USER=$(echo $DATABASE_URL_RAILWAY | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL_RAILWAY | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL_RAILWAY | sed -n 's/.*@\([^:\/]*\).*/\1/p')
    DB_PORT=$(echo $DATABASE_URL_RAILWAY | sed -n 's/.*:\/\/[^:]*:[^@]*@[^:]*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL_RAILWAY | sed -n 's/.*\/\([^?]*\).*/\1/p')
    export POSTGRES_PASSWORD=$DB_PASSWORD
else
    echo -e "${RED}Error: No database connection details found${NC}"
    echo -e "${RED}Please provide either:${NC}"
    echo -e "${RED}  1. DATABASE_PUBLIC_URL (recommended for Railway)${NC}"
    echo -e "${RED}  2. PGHOST/PGUSER/PGDATABASE${NC}"
    echo -e "${RED}  3. DATABASE_URL${NC}"
    echo -e "${YELLOW}Tip: Run 'railway variables --set DATABASE_URL=\${{Postgres.DATABASE_PUBLIC_URL}}'${NC}"
    exit 1
fi

# Validate parsed values
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}Error: Failed to parse database connection details${NC}"
    echo -e "${RED}Parsed values: HOST=$DB_HOST USER=$DB_USER DB=$DB_NAME${NC}"
    echo -e "${RED}DATABASE_URL format should be: postgresql://user:pass@host:port/dbname${NC}"
    exit 1
fi

# Main execution
echo -e "${YELLOW}Environment: ${ENVIRONMENT:-development}${NC}"
echo -e "${YELLOW}Database Host: $DB_HOST${NC}"
echo -e "${YELLOW}Database Port: $DB_PORT${NC}"
echo -e "${YELLOW}Database User: $DB_USER${NC}"
echo -e "${YELLOW}Database Name: $DB_NAME${NC}"
echo -e "${YELLOW}Password: ${DB_PASSWORD:0:3}***${NC}"  # SECURITY: Mask password

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
