#!/usr/bin/env pwsh
# Database setup script for Live Poll Backend
# Helps configure PostgreSQL database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Live Poll Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Please edit .env with your database credentials before continuing" -ForegroundColor Yellow
    Write-Host "   DATABASE_URL example: postgresql://username:password@localhost:5432/livepoll" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Have you configured .env? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Setup cancelled. Please configure .env and run this script again." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

Write-Host ""

# Check if PostgreSQL is accessible
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    # Try to run Prisma introspection to test connection
    $null = npx prisma db pull --schema=prisma/schema.prisma 2>&1
    Write-Host "✓ PostgreSQL connection successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot connect to PostgreSQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure PostgreSQL is running and DATABASE_URL in .env is correct" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install PostgreSQL:" -ForegroundColor Cyan
    Write-Host "  Windows: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "  macOS:   brew install postgresql" -ForegroundColor Gray
    Write-Host "  Linux:   sudo apt install postgresql" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""

# Run Prisma migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
try {
    npm run prisma:migrate
    Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Migration failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
try {
    npm run prisma:generate
    Write-Host "✓ Prisma Client generated" -ForegroundColor Green
} catch {
    Write-Host "✗ Client generation failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start the server:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view the database:" -ForegroundColor Yellow
Write-Host "  npx prisma studio" -ForegroundColor Cyan
Write-Host ""
