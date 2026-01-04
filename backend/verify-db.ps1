#!/usr/bin/env pwsh
# Database verification script

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "Database Migration Verification" -ForegroundColor Cyan
Write-Host "=======================================`n" -ForegroundColor Cyan

# Check migration status
Write-Host "1. Checking migration status..." -ForegroundColor Yellow
$migrateStatus = npx prisma migrate status 2>&1 | Out-String
if ($migrateStatus -match "Database schema is up to date") {
    Write-Host "   PASS - All migrations applied`n" -ForegroundColor Green
} else {
    Write-Host "   WARNING - Migrations may be pending`n" -ForegroundColor Yellow
    Write-Host $migrateStatus
}

# Test database connection via Prisma
Write-Host "2. Testing database connection..." -ForegroundColor Yellow
$testScript = @"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    // Test each table
    const sessionCount = await prisma.session.count();
    const participantCount = await prisma.participant.count();
    const pollCount = await prisma.poll.count();
    const pollOptionCount = await prisma.pollOption.count();
    const voteCount = await prisma.vote.count();
    
    console.log('Database Connection: SUCCESS');
    console.log('Tables verified:');
    console.log('  - sessions: ' + sessionCount + ' records');
    console.log('  - participants: ' + participantCount + ' records');
    console.log('  - polls: ' + pollCount + ' records');
    console.log('  - poll_options: ' + pollOptionCount + ' records');
    console.log('  - votes: ' + voteCount + ' records');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Database Connection: FAILED');
    console.error(error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

test();
"@

Set-Content -Path "test-db.mjs" -Value $testScript

try {
    $dbTest = node test-db.mjs 2>&1 | Out-String
    Write-Host "   $dbTest" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Could not connect to database" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
} finally {
    Remove-Item "test-db.mjs" -ErrorAction SilentlyContinue
}

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "=======================================`n" -ForegroundColor Cyan
