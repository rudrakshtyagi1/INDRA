# Deployment

## Local Development

### Prerequisites
- Python 3.10+
- Node.js 20+
- PostgreSQL 16 + PostGIS extension (or use SQLite fallback)
- Redis (for Celery)
- DualSPHysics v5.x (optional, SPH engine)
- Delft3D FM / D-Flow FM (optional, flood routing engine)

### Setup

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install

# Environment
cp .env.example .env
# Edit .env to set DATABASE_URL, STORAGE_ROOT, etc.
```

### Running

```bash
# Backend API
make run-backend

# Frontend dev server
make run-frontend

# Run tests
make test
```

### SQLite Fallback (no PostgreSQL needed)

Set in .env:
  DATABASE_URL=sqlite+aiosqlite:///./floodlab.db

The settings.py will detect SQLite and skip PostGIS-specific operations.

## Docker Compose (Full Stack)

```bash
docker-compose up --build
```

This starts:
- PostgreSQL 16 + PostGIS on port 5432
- Redis on port 6379
- Backend API on port 8000
- Celery worker
- Frontend on port 5173

## DualSPHysics Installation

Download from: https://dual.sphysics.org/downloads/
Linux: extract to /opt/dualsphysics/
Set DUALSPHYSICS_BIN_DIR=/opt/dualsphysics/bin in .env

FloodLab will discover the installed version at runtime and record it in manifest.json.
If not installed, simulations run in adapter-stub mode (clearly labelled in provenance).

## Delft3D FM Installation

Obtain from Deltares: https://oss.deltares.nl/web/delft3dfm
Community edition available.
Set DFLOWFM_BIN_DIR=/path/to/delft3d/bin in .env

FloodLab will discover the installed version at runtime.
If not installed, simulations run in adapter-stub mode.

## PostgreSQL + PostGIS

```bash
# Ubuntu/Debian
sudo apt install postgresql-16 postgresql-16-postgis-3

# macOS with Homebrew
brew install postgresql@16 postgis

# Create database
createdb floodlab
psql floodlab -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
cd backend && alembic upgrade head
```
