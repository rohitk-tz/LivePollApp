# Phase 1 Setup Guide

## Current Status

### ✅ Completed
- **Task 1.1**: Backend project initialized with TypeScript, Express, ESLint, Prettier
- **Task 1.2**: Frontend project initialized with Vite, React, TypeScript, Tailwind CSS
- **Task 1.5**: Prisma ORM configured with schema definitions
- **Task 1.6**: Express server setup with middleware and error handling
- **Task 1.7**: Socket.IO server integrated in realtime module
- **Task 1.8**: React application structure created (components, pages, services, hooks)
- **Task 1.9**: Socket.IO client implemented with websocketService
- **Task 1.10**: Environment configuration templates created (.env files)

### ⚠️ Needs Manual Setup

#### PostgreSQL Database (Task 1.3)

**Status**: PostgreSQL 14 is installed and running, but database needs to be created.

**Setup Steps**:

1. **Option A: Use pgAdmin (GUI)**
   - Open pgAdmin 4
   - Connect to PostgreSQL server (localhost)
   - Right-click on "Login/Group Roles" → Create → Login/Group Role
     - Name: `polluser`
     - Password tab: Enter `pollpass`
     - Privileges tab: Check "Can login?"
   - Right-click on "Databases" → Create → Database
     - Database: `livepoll`
     - Owner: `polluser`

2. **Option B: Use SQL Command Line**
   ```powershell
   # Open SQL Shell (psql) from Start Menu
   # Connect with default postgres user
   # When prompted for database, user, port, etc., press Enter for defaults
   # Enter your postgres superuser password
   
   # Then run these SQL commands:
   CREATE USER polluser WITH PASSWORD 'pollpass';
   CREATE DATABASE livepoll OWNER polluser;
   GRANT ALL PRIVILEGES ON DATABASE livepoll TO polluser;
   \q
   ```

3. **Verify Connection**
   ```powershell
   cd backend
   npx prisma db pull --schema=prisma/schema.prisma
   ```
   Should output: "Datasource 'db': PostgreSQL database 'livepoll'..."

4. **Run Migrations**
   ```powershell
   cd backend
   npm run prisma:migrate
   # or
   npx prisma migrate deploy
   ```

#### Redis Cache (Task 1.4)

**Status**: Not installed. Required for horizontal scaling and WebSocket event replay.

**Setup Steps**:

1. **Install Redis for Windows**
   
   **Option A: Using Memurai (Recommended for Windows)**
   - Download from: https://www.memurai.com/get-memurai
   - Install Memurai Developer Edition (free)
   - Service starts automatically on port 6379

   **Option B: Using Docker**
   ```powershell
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

   **Option C: Using WSL2**
   ```bash
   # In WSL2 Ubuntu terminal
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

2. **Verify Redis Connection**
   ```powershell
   # Test with redis-cli
   redis-cli ping
   # Should return: PONG
   ```

3. **Update Backend .env** (if needed)
   ```env
   REDIS_URL=redis://localhost:6379
   ```

4. **Install Redis Client in Backend** (already in package.json dependencies)
   ```powershell
   cd backend
   npm install ioredis
   ```

## Running the Application

### Backend
```powershell
cd backend
npm run dev
# Server starts on http://localhost:3000
```

### Frontend
```powershell
cd frontend  
npm run dev
# App starts on http://localhost:5173
```

## Verification Checklist

- [ ] PostgreSQL 14 running (check Services: postgresql-x64-14)
- [ ] `livepoll` database created with `polluser` owner
- [ ] Backend .env file exists with correct DATABASE_URL
- [ ] Prisma migrations executed successfully
- [ ] Redis running (Memurai service or Docker container)
- [ ] Backend starts without errors: `cd backend && npm run dev`
- [ ] Frontend starts without errors: `cd frontend && npm run dev`
- [ ] Health check responds: `curl http://localhost:3000/health`

## Next Steps

Once Phase 1 setup is complete, you can proceed with:
- **Phase 2**: Run existing database migrations
- **Phase 3**: Backend modules are mostly implemented
- **Phase 4**: Implement remaining REST API endpoints
- **Phase 5**: Implement WebSocket event broadcasting
- **Phase 6**: Complete frontend components
- **Phase 7**: Integrate frontend state management

## Troubleshooting

### "Password authentication failed"
- Reset postgres password: Use pgAdmin or reinstall PostgreSQL
- Or use peer authentication: Modify `pg_hba.conf` to trust local connections

### "Connection refused"
- Check PostgreSQL service is running: `Get-Service postgresql-x64-14`
- Check port 5432 is open: `Test-NetConnection localhost -Port 5432`

### Redis not found
- Install Memurai (easiest for Windows development)
- Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`
- Update REDIS_URL in backend/.env if using non-standard port

### Port already in use
```powershell
# Kill process on port 3000 (backend)
$connection = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($connection) { Stop-Process -Id $connection.OwningProcess -Force }

# Kill process on port 5173 (frontend)
$connection = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($connection) { Stop-Process -Id $connection.OwningProcess -Force }
```
