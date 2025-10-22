# TODO Application - Implementation Guide

A modern, containerized TODO application built with Angular 20 (frontend) and FastAPI + SQLAlchemy 2 + PostgreSQL 18 (backend), following Test-Driven Development (TDD) principles and Clean Architecture patterns.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#-quick-start-after-setup)
- [Rebuild from Scratch](#-rebuild-from-scratch)
- [Step-by-Step Implementation](#step-by-step-implementation)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This project demonstrates a production-ready TODO application with:

- **Backend**: FastAPI + SQLAlchemy 2.0 + PostgreSQL 18 + Alembic
- **Frontend**: Angular 20 with standalone components
- **Containerization**: Docker & Docker Compose
- **Testing**: Pytest (backend) + Jasmine/Karma (frontend)
- **CI/CD**: GitHub Actions
- **Architecture**: Clean Architecture + Repository Pattern

## 🔨 Rebuild from Scratch

Want to recreate this project from zero? We've got you covered!

📖 **Complete Rebuild Guide**: [docs/00_REBUILD_FROM_SCRATCH.md](docs/00_REBUILD_FROM_SCRATCH.md) (3,455 lines)

This comprehensive guide covers:

- ✅ Backend setup with FastAPI, SQLAlchemy, PostgreSQL
- ✅ Frontend setup with Angular 20, Tailwind CSS
- ✅ Docker configuration and orchestration
- ✅ Database migrations with Alembic
- ✅ Testing setup (pytest, Jasmine/Karma)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Multi-cloud deployment options

**Quick Summary**: [REBUILD_GUIDE.md](REBUILD_GUIDE.md)

**Time to Complete**: 8-12 hours for experienced developers

## Tech Stack

### Frontend

- **Angular 20** - Modern SPA framework
- **TypeScript** - Strict typing enabled
- **Tailwind CSS / shadcn/ui** - Utility-first styling
- **Karma/Jasmine** - Testing framework

### Backend

- **Python 3.12** - Programming language
- **FastAPI** - Modern async web framework
- **SQLAlchemy 2.0** - ORM with async support
- **Alembic** - Database migrations
- **PostgreSQL 18** - Production database
- **SQLite** - Testing database
- **Pytest** - Testing framework

### DevOps

- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Multi-stage builds** - Optimized images

## 📦 Prerequisites

Before starting, ensure you have the following installed:

### Required

- **Docker** (version 20.10+) and **Docker Compose** (version 2.0+)
- **Git** (version 2.30+)
- **Text Editor** (VS Code, PyCharm, or similar)

### Optional (for local development without Docker)

- **Python 3.12+** with pip
- **Node.js 20+** with npm
- **PostgreSQL 18** (if running database locally)

### Verify Installation

```bash
# Check Docker
docker --version
docker-compose --version

# Check Git
git --version

# Optional: Check Python and Node
python --version
node --version
npm --version
```

## 🚀 Step-by-Step Implementation

### Phase 1: Project Setup (15 minutes)

#### Step 1.1: Clone and Initialize Repository

```bash
# Create project directory
mkdir todo-app
cd todo-app

# Initialize git repository
git init

# Copy the project structure from this repository
# Or follow the structure defined in docs/02_architecture.md
```

#### Step 1.2: Set Up Environment Variables

```bash
# Copy environment example files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env file with your configuration
# IMPORTANT: Change SECRET_KEY in production!
nano .env
```

**Key environment variables:**

```env
# Database
POSTGRES_USER=todo
POSTGRES_PASSWORD=todo  # Change in production!
POSTGRES_DB=todo_db

# Backend
SECRET_KEY=your-secret-key-here  # Generate a secure key!
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
BACKEND_CORS_ORIGINS=http://localhost:4200
```

#### Step 1.3: Verify Project Structure

```bash
# Verify directory structure
tree -L 3 -d

# Expected output:
# .
# ├── backend/
# │   ├── app/
# │   │   ├── api/
# │   │   ├── core/
# │   │   ├── db/
# │   │   ├── services/
# │   │   └── tests/
# │   ├── alembic/
# │   └── Dockerfile
# ├── frontend/
# │   ├── src/
# │   │   └── app/
# │   └── Dockerfile
# ├── docs/
# └── docker-compose.yml
```

---

### Phase 2: Backend Development (TDD Approach)

#### Step 2.1: Set Up Python Environment (Local Development)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt
```

#### Step 2.2: Configure Database Connection

```bash
# Update backend/app/core/config.py if needed
# Default configuration uses environment variables

# Test database connection
python -c "from app.db.session import engine; print('Database connection: OK')"
```

#### Step 2.3: Database Migrations (Automatic with Docker)

```bash
# With Docker (Recommended):
# Migrations are created and applied automatically when you start the containers!
docker-compose up -d

# Verify migrations were applied
docker-compose exec backend alembic current
docker-compose exec postgres psql -U todo -d todo_db -c "\dt"

# For local development without Docker:
cd backend

# Generate initial migration
alembic revision --autogenerate -m "Initial migration: users, tasks, tags tables"

# Review the generated migration in alembic/versions/
# Then apply migration
alembic upgrade head

# Verify tables were created
psql -U todo -d todo_db -c "\dt"
```

**Note:** The Docker setup includes an entrypoint script that automatically runs `alembic upgrade head` on startup. See [Alembic + Docker Integration](docs/09_ALEMBIC_DOCKER_INTEGRATION.md) for details.

#### Step 2.4: Write Tests First (TDD - Red Phase)

```bash
# Create test for user creation
# Edit: backend/app/tests/unit/test_services/test_user_service.py

# Run tests (they should fail - RED phase)
pytest app/tests/unit/test_services/test_user_service.py -v
```

**Example test:**

```python
# backend/app/tests/unit/test_services/test_user_service.py
import pytest
from app.services.user_service import UserService
from app.api.schemas.user import UserCreate

@pytest.mark.asyncio
async def test_create_user_success(db_session):
    """Test creating a user with valid data."""
    service = UserService(db_session)
    user_data = UserCreate(
        email="test@example.com",
        password="securepass123",
        full_name="Test User"
    )

    user = await service.create_user(user_data)

    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.id is not None
```

#### Step 2.5: Implement Features (TDD - Green Phase)

```bash
# Implement the service to make tests pass
# Edit: backend/app/services/user_service.py

# Run tests again (they should pass - GREEN phase)
pytest app/tests/unit/test_services/test_user_service.py -v

# Refactor code if needed (REFACTOR phase)
```

#### Step 2.6: Create API Routes

```bash
# Implement API endpoints following the design in docs/03_design.md
# Example: backend/app/api/v1/routes/tasks.py

# Write integration tests for API
# Example: backend/app/tests/integration/test_api/test_tasks_api.py

# Run all tests
pytest app/tests/ -v --cov=app --cov-report=html
```

#### Step 2.7: Run Backend Tests

```bash
cd backend

# Run all tests with coverage
pytest app/tests/ -v --cov=app --cov-report=html --cov-report=term

# View coverage report
open htmlcov/index.html  # On Mac
# xdg-open htmlcov/index.html  # On Linux
# start htmlcov/index.html  # On Windows

# Target: 80%+ coverage
```

---

### Phase 3: Frontend Development

#### Step 3.1: Set Up Angular Environment

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Verify Angular CLI
npx ng version
```

#### Step 3.2: Generate Components and Services

```bash
# Generate task service
ng generate service features/tasks/services/task

# Generate task components
ng generate component features/tasks/task-list --standalone
ng generate component features/tasks/task-detail --standalone
ng generate component features/tasks/task-form --standalone

# Generate auth components
ng generate component features/auth/login --standalone
ng generate component features/auth/register --standalone
```

#### Step 3.3: Implement Services (with Tests)

```bash
# Write tests first
# Edit: frontend/src/app/features/tasks/services/task.service.spec.ts

# Run tests (RED phase)
npm test

# Implement service
# Edit: frontend/src/app/features/tasks/services/task.service.ts

# Run tests again (GREEN phase)
npm test
```

#### Step 3.4: Implement Components

```bash
# Implement components following Angular 20 best practices
# - Use standalone components
# - Use signals for state management
# - Use input() and output() functions
# - Set changeDetection: OnPush

# Example: task-list.component.ts
```

#### Step 3.5: Configure Routing

```bash
# Configure routes in app.routes.ts
# Configure lazy loading for feature modules
# Add route guards for authentication
```

#### Step 3.6: Run Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run tests with coverage
npm run test:ci

# View coverage report
open coverage/index.html
```

---

### Phase 4: Docker Containerization

#### Step 4.1: Build Docker Images

```bash
# Build backend image
docker build -t todo-backend:latest ./backend

# Build frontend image
docker build -t todo-frontend:latest ./frontend

# Verify images
docker images | grep todo
```

#### Step 4.2: Run with Docker Compose (Development)

```bash
# Start all services
docker-compose up --build

# Wait for services to be healthy
# Check logs
docker-compose logs -f

# Access application:
# Frontend: http://localhost:4200
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

#### Step 4.3: Database Migrations (Automatic!)

```bash
# ✨ Migrations run automatically on container startup!
# The entrypoint script handles:
# 1. Waiting for PostgreSQL to be ready
# 2. Checking for migration files
# 3. Running 'alembic upgrade head'
# 4. Starting the application

# Verify migrations were applied
docker-compose exec backend alembic current

# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "Add new field"

# Migrations will be applied automatically on next restart
docker-compose restart backend

# Or apply manually (optional)
docker-compose exec backend alembic upgrade head
```

**Note:** See [Alembic Quick Reference](ALEMBIC_QUICK_REFERENCE.md) for more migration commands.

#### Step 4.4: Test Containers

```bash
# Run backend tests in Docker
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit backend-test

# Run frontend tests in Docker
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit frontend-test

# Run all tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

---

### Phase 5: Testing & Quality Assurance

#### Step 5.1: Run All Tests

```bash
# Backend tests
cd backend
pytest app/tests/ -v --cov=app --cov-report=html --cov-fail-under=80

# Frontend tests
cd ../frontend
npm run test:ci

# Or use Docker
cd ..
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

#### Step 5.2: Code Quality Checks

```bash
# Backend: Run flake8 and black
cd backend
flake8 app/ --count --show-source --statistics
black app/ --check

# Format code
black app/

# Frontend: Run linter
cd ../frontend
npm run lint
```

#### Step 5.3: Security Scanning

```bash
# Scan for vulnerabilities
# Install trivy
# brew install aquasecurity/trivy/trivy  # Mac
# Or download from https://github.com/aquasecurity/trivy

# Scan backend
trivy fs ./backend

# Scan frontend
trivy fs ./frontend

# Scan Docker images
trivy image todo-backend:latest
trivy image todo-frontend:latest
```

---

### Phase 6: Production Deployment

#### Step 6.1: Prepare Production Environment

```bash
# Copy production environment example
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Production environment variables:**

```env
# Use strong, unique values in production!
SECRET_KEY=<generate-strong-secret-key>
POSTGRES_PASSWORD=<strong-database-password>
BACKEND_CORS_ORIGINS=https://yourdomain.com
```

#### Step 6.2: Build Production Images

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Tag images for registry
docker tag todo-backend:latest your-registry/todo-backend:v1.0.0
docker tag todo-frontend:latest your-registry/todo-frontend:v1.0.0

# Push to registry
docker push your-registry/todo-backend:v1.0.0
docker push your-registry/todo-frontend:v1.0.0
```

#### Step 6.3: Deploy to Production

```bash
# Deploy with production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Check health
curl http://localhost:8000/health
curl http://localhost/health
```

#### Step 6.4: Set Up Monitoring

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Monitor resources
docker stats
```

---

### Phase 7: CI/CD Setup

#### Step 7.1: Configure GitHub Actions

```bash
# The CI/CD workflow is already defined in .github/workflows/ci.yml

# Add secrets to GitHub repository:
# Go to: Settings > Secrets and variables > Actions

# Add these secrets:
# - CODECOV_TOKEN (for code coverage reporting)
# - DOCKER_USERNAME (for Docker registry)
# - DOCKER_PASSWORD (for Docker registry)
```

#### Step 7.2: Test CI/CD Pipeline

```bash
# Push code to trigger CI/CD
git add .
git commit -m "feat: initial implementation"
git push origin main

# Monitor GitHub Actions
# Go to: Actions tab in your GitHub repository

# CI/CD will automatically:
# 1. Run linting checks
# 2. Run backend tests
# 3. Run frontend tests
# 4. Build Docker images
# 5. Run security scans
# 6. Upload coverage reports
```

---

## 💻 Quick Start (After Setup)

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean up (remove volumes)
docker-compose down -v
```

### Using Local Development

#### Backend (Local)

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal: Run tests
pytest app/tests/ -v --cov=app
```

#### Frontend (Local)

```bash
cd frontend

# Run development server
npm start
# Or: ng serve

# In another terminal: Run tests
npm test

# Build for production
npm run build -- --configuration=production
```

### Running Tests

```bash
# Backend tests (local)
cd backend
pytest app/tests/ -v --cov=app --cov-report=html

# Backend tests (Docker)
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit backend-test

# Frontend tests (local)
cd frontend
npm test
npm run test:ci

# Frontend tests (Docker)
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit frontend-test

# All tests (Docker)
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Project Structure

```
todo-app/
├── docs/                           # Documentation
│   ├── 00-init-solution.md        # Initial requirements
│   ├── 01_analysis.md             # Requirements analysis
│   ├── 02_architecture.md         # System architecture
│   ├── 03_design.md               # Detailed design
│   ├── 04_testing.md              # Testing strategy
│   ├── 05_devops.md               # DevOps & CI/CD
│   └── 06_tdd_strategy.md         # TDD workflow
├── frontend/                       # Angular 20 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── guards/
│   │   └── environments/
│   ├── Dockerfile
│   └── package.json
├── backend/                        # FastAPI application
│   ├── app/
│   │   ├── main.py
│   │   ├── core/                  # Config, security, dependencies
│   │   ├── api/
│   │   │   ├── routes/            # API endpoints
│   │   │   ├── schemas/           # Pydantic models
│   │   │   └── dependencies/      # DI functions
│   │   ├── db/
│   │   │   ├── models/            # SQLAlchemy models
│   │   │   ├── repositories/      # Data access layer
│   │   │   └── session.py         # DB session management
│   │   └── services/              # Business logic
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   ├── alembic/                   # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml              # Development environment
├── docker-compose.test.yml         # Testing environment
└── .github/
    └── workflows/
        └── ci.yml                  # CI/CD pipeline
```

## 🔄 Development Workflow

### TDD Workflow (Red-Green-Refactor)

This project follows **Test-Driven Development (TDD)** principles:

#### 1. RED Phase - Write Failing Test

```bash
# Example: Adding a new feature - Task completion

# Step 1: Write test first
# File: backend/app/tests/unit/test_services/test_task_service.py

@pytest.mark.asyncio
async def test_complete_task_sets_status_and_timestamp(db_session):
    """Test completing a task sets status and completion time."""
    # Arrange
    user = await UserFactory.create(db_session)
    task = await TaskFactory.create(db_session, user_id=user.id)
    service = TaskService(db_session)

    # Act
    completed_task = await service.complete_task(task.id, user.id)

    # Assert
    assert completed_task.status == TaskStatus.COMPLETED
    assert completed_task.completed_at is not None

# Step 2: Run test (should FAIL)
pytest app/tests/unit/test_services/test_task_service.py::test_complete_task_sets_status_and_timestamp -v
```

#### 2. GREEN Phase - Make Test Pass

```bash
# Step 3: Implement minimal code to pass test
# File: backend/app/services/task_service.py

async def complete_task(self, task_id: UUID, user_id: UUID) -> Optional[TaskOut]:
    """Mark a task as completed."""
    task = await self._get_task_or_none(task_id, user_id)
    if not task:
        return None

    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
    await self.db.flush()
    await self.db.refresh(task, ["tags"])
    return TaskOut.model_validate(task)

# Step 4: Run test again (should PASS)
pytest app/tests/unit/test_services/test_task_service.py::test_complete_task_sets_status_and_timestamp -v
```

#### 3. REFACTOR Phase - Improve Code

```bash
# Step 5: Refactor if needed (improve code quality)
# - Extract common logic
# - Add error handling
# - Improve naming

# Step 6: Run all tests to ensure nothing broke
pytest app/tests/ -v
```

### Daily Development Workflow

#### Morning Routine

```bash
# 1. Pull latest changes
git pull origin main

# 2. Update dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# 3. Start development environment
docker-compose up -d

# 4. Check service health
curl http://localhost:8000/health
curl http://localhost:4200/
```

#### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/task-filters

# 2. Write tests (TDD - RED)
# Edit test files

# 3. Run tests (should fail)
pytest app/tests/unit/test_services/test_task_service.py -v

# 4. Implement feature (TDD - GREEN)
# Edit source files

# 5. Run tests (should pass)
pytest app/tests/unit/test_services/test_task_service.py -v

# 6. Refactor code (TDD - REFACTOR)
# Improve code quality

# 7. Run all tests
pytest app/tests/ -v --cov=app

# 8. Commit changes
git add .
git commit -m "feat: add task filtering by status"

# 9. Push to remote
git push origin feature/task-filters

# 10. Create Pull Request on GitHub
```

#### Evening Routine

```bash
# 1. Run full test suite
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# 2. Check code coverage
# Backend: open backend/htmlcov/index.html
# Frontend: open frontend/coverage/index.html

# 3. Commit any pending changes
git status
git add .
git commit -m "docs: update documentation"

# 4. Stop development environment
docker-compose down

# 5. Clean up (optional)
docker system prune -f
```

### Database Migrations

#### Create Migration

```bash
cd backend

# 1. Modify models
# Edit: app/db/models/task.py (add new field)

# 2. Generate migration
alembic revision --autogenerate -m "add task notes field"

# 3. Review migration file
# Check: alembic/versions/<timestamp>_add_task_notes_field.py

# 4. Apply migration
alembic upgrade head

# 5. Verify in database
docker-compose exec postgres psql -U todo -d todo_db -c "\d tasks"
```

#### Rollback Migration

```bash
# Rollback last migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade <revision_id>

# Show migration history
alembic history

# Show current version
alembic current
```

### Code Quality Standards

#### Before Committing

```bash
# Backend
cd backend
black app/  # Format code
flake8 app/  # Check style
pytest app/tests/ -v --cov=app --cov-fail-under=80  # Run tests

# Frontend
cd frontend
npm run lint  # Lint code
npm run test:ci  # Run tests
```

#### Pre-commit Checklist

- [ ] All tests pass
- [ ] Code coverage ≥ 80%
- [ ] No linting errors
- [ ] Code is formatted (black for Python, prettier for TypeScript)
- [ ] Commit message follows convention
- [ ] Documentation updated
- [ ] Environment variables documented

## Core Features

- **Task Management**: Create, read, update, delete tasks
- **Task Properties**: Title, description, status, priority, due date
- **Filtering**: Filter tasks by status, priority, tags
- **User Authentication**: JWT-based authentication
- **User Management**: User registration, login, profile
- **Tagging System**: Organize tasks with tags
- **Responsive UI**: Mobile-first design

## API Documentation

Once the backend is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Analysis](docs/01_analysis.md)** - Requirements and constraints
- **[Architecture](docs/02_architecture.md)** - System design and components
- **[Design](docs/03_design.md)** - Database schema and API specifications
- **[Testing](docs/04_testing.md)** - Testing strategy and examples
- **[DevOps](docs/05_devops.md)** - Docker and CI/CD setup
- **[TDD Strategy](docs/06_tdd_strategy.md)** - Test-driven development workflow
- **[Alembic + Docker Integration](docs/09_ALEMBIC_DOCKER_INTEGRATION.md)** - Database migrations in Docker

### Quick References

- **[Alembic Quick Reference](ALEMBIC_QUICK_REFERENCE.md)** - Common database migration commands
- **[Alembic Setup Summary](ALEMBIC_DOCKER_SETUP_SUMMARY.md)** - Migration automation details

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD approach)
4. Implement the feature
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Quality Standards

- **Python**: Follow PEP 8, use `black` and `flake8`
- **TypeScript**: Follow style guide, use ESLint and Prettier
- **Test Coverage**: Maintain 80%+ code coverage
- **Documentation**: Update relevant docs with changes
- **Commit Messages**: Clear, descriptive commit messages

## CI/CD Pipeline

GitHub Actions automatically:

- Runs linting checks
- Executes unit and integration tests
- Builds Docker images
- Checks code coverage
- Runs security scans

## Environment Variables

### Backend

```env
DATABASE_URL=postgresql://user:password@localhost:5432/todo_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend

```env
API_BASE_URL=http://localhost:8000
```

## Performance Targets

- API Response Time: < 300ms (p95)
- Frontend Load Time: < 2s
- Test Coverage: > 80%
- Docker Build Time: < 5 minutes

## Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention via ORM
- CORS configuration
- Rate limiting on API endpoints
- Secrets management via environment variables

## License

MIT

## Support

For questions or issues, please:

- Open an issue on GitHub
- Check existing documentation in `docs/`
- Review API documentation at `/docs` endpoint

## 🔧 Troubleshooting

### Common Issues

#### Issue: Docker containers won't start

```bash
# Solution 1: Check if ports are already in use
lsof -i :8000  # Backend port
lsof -i :4200  # Frontend port
lsof -i :5432  # Database port

# Solution 2: Clean up Docker
docker-compose down -v
docker system prune -f
docker-compose up --build
```

#### Issue: Database connection errors

```bash
# Solution 1: Wait for database to be ready
docker-compose logs postgres

# Solution 2: Check database credentials
docker-compose exec postgres psql -U todo -d todo_db

# Solution 3: Reset database
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

#### Issue: Frontend can't connect to backend

```bash
# Solution 1: Check CORS configuration
# Edit: backend/app/core/config.py
# Add: BACKEND_CORS_ORIGINS=["http://localhost:4200"]

# Solution 2: Verify backend is running
curl http://localhost:8000/health

# Solution 3: Check environment variables
# Edit: frontend/src/environments/environment.ts
# Ensure: apiBaseUrl: 'http://localhost:8000/api/v1'
```

#### Issue: Tests failing

```bash
# Solution 1: Update dependencies
cd backend && pip install -r requirements.txt -r requirements-test.txt
cd frontend && npm install

# Solution 2: Clear cache
pytest --cache-clear
rm -rf frontend/.angular/cache

# Solution 3: Check test database
# Tests should use SQLite in-memory or separate test database
```

#### Issue: Alembic migration errors

```bash
# Solution 1: Check current migration state
alembic current

# Solution 2: Stamp database with current version
alembic stamp head

# Solution 3: Drop and recreate database
docker-compose down -v
docker-compose up -d postgres
alembic upgrade head
```

### Performance Issues

#### Backend is slow

```bash
# Solution 1: Check database indexes
# Review: docs/03_design.md for index definitions

# Solution 2: Enable query logging
# Edit: backend/app/db/session.py
# Set: echo=True in create_async_engine

# Solution 3: Monitor database connections
docker-compose exec postgres psql -U todo -d todo_db -c "SELECT * FROM pg_stat_activity;"
```

#### Frontend is slow

```bash
# Solution 1: Build for production
npm run build -- --configuration=production

# Solution 2: Check bundle size
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/todo-frontend/stats.json

# Solution 3: Enable AOT compilation (already enabled in production)
```

### Getting Help

1. **Check Documentation**: Review files in `docs/` directory
2. **Check Logs**: `docker-compose logs -f [service]`
3. **GitHub Issues**: Open an issue with detailed error information
4. **Stack Trace**: Include full error messages and stack traces

## 📚 Additional Resources

### Learning Resources

- **FastAPI**: https://fastapi.tiangolo.com/
- **Angular 20**: https://angular.dev/
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **Alembic**: https://alembic.sqlalchemy.org/
- **Docker**: https://docs.docker.com/
- **Pytest**: https://docs.pytest.org/
- **TDD**: https://martinfowler.com/bliki/TestDrivenDevelopment.html

### Project Documentation

- [Requirements Analysis](docs/01_analysis.md)
- [System Architecture](docs/02_architecture.md)
- [Detailed Design](docs/03_design.md)
- [Testing Strategy](docs/04_testing.md)
- [DevOps Guide](docs/05_devops.md)
- [TDD Workflow](docs/06_tdd_strategy.md)

## 🎯 Implementation Milestones

### Milestone 1: Foundation (Completed)

- [X] Project structure
- [X] Database models
- [X] Basic API endpoints
- [X] Docker configuration
- [X] CI/CD pipeline

### Milestone 2: Core Features (In Progress)

- [ ] User authentication (JWT)
- [ ] Task CRUD operations
- [ ] Tag management
- [ ] Task filtering and search
- [ ] Unit and integration tests (80%+ coverage)

### Milestone 3: Frontend (Upcoming)

- [ ] Angular components
- [ ] State management with signals
- [ ] Routing and guards
- [ ] Forms and validation
- [ ] Frontend tests

### Milestone 4: Advanced Features (Future)

- [ ] Real-time updates (WebSockets)
- [ ] Email notifications
- [ ] Task sharing
- [ ] Advanced search
- [ ] Performance optimization

## 🗺️ Roadmap

- [ ] Task sharing and collaboration
- [ ] Real-time updates with WebSockets
- [ ] Email notifications
- [ ] Task templates
- [ ] Advanced filtering and search
- [ ] Mobile application
- [ ] Dark mode support
- [ ] Multi-language support (i18n)
- [ ] Task attachments
- [ ] Calendar integration

## 📝 Next Steps

1. **Complete Backend Implementation**

   - Implement all API routes from `docs/03_design.md`
   - Write comprehensive tests for each endpoint
   - Add authentication and authorization
2. **Complete Frontend Implementation**

   - Implement all components
   - Add state management
   - Create responsive UI
   - Write component and service tests
3. **Integration Testing**

   - Test frontend-backend integration
   - Test authentication flow
   - Test error handling
4. **Production Deployment**

   - Set up production environment
   - Configure domain and SSL
   - Set up monitoring and logging
   - Performance testing
5. **Documentation**

   - API documentation (already auto-generated by FastAPI)
   - User guide
   - Deployment guide
   - Contribution guide

---

**Built with ❤️ using Angular 20 and FastAPI**

For questions or issues, please check the [documentation](docs/) or open an issue on GitHub.
