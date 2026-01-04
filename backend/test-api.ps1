#!/usr/bin/env pwsh
# Quick API test script for Live Poll Backend
# Tests basic endpoint functionality

$baseUrl = "http://localhost:3000"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Live Poll Backend API Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -ErrorAction Stop
    Write-Host "   ✓ Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure the server is running: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Create Session
Write-Host "2. Testing Create Session..." -ForegroundColor Yellow
try {
    $sessionData = @{ presenterName = "Test Presenter" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/sessions" -Method Post -Body $sessionData -Headers $headers -ErrorAction Stop
    $sessionId = $response.session.id
    $sessionCode = $response.session.code
    Write-Host "   ✓ Session created successfully" -ForegroundColor Green
    Write-Host "   Session ID: $sessionId" -ForegroundColor Gray
    Write-Host "   Session Code: $sessionCode" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Create session failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Get Session by ID
Write-Host "3. Testing Get Session by ID..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId" -Method Get -ErrorAction Stop
    Write-Host "   ✓ Session retrieved successfully" -ForegroundColor Green
    Write-Host "   Presenter: $($response.presenterName)" -ForegroundColor Gray
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Get session failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 4: Join Session (Create Participant)
Write-Host "4. Testing Join Session..." -ForegroundColor Yellow
try {
    $participantData = @{ displayName = "Test Participant" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/join" -Method Post -Body $participantData -Headers $headers -ErrorAction Stop
    $participantId = $response.participantId
    Write-Host "   ✓ Participant joined successfully" -ForegroundColor Green
    Write-Host "   Participant ID: $participantId" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Join session failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 5: Start Session
Write-Host "5. Testing Start Session..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/start" -Method Post -ErrorAction Stop
    Write-Host "   ✓ Session started successfully" -ForegroundColor Green
    Write-Host "   Status: $($response.session.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Start session failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Create Poll
Write-Host "6. Testing Create Poll..." -ForegroundColor Yellow
try {
    $pollData = @{
        question = "What is your favorite color?"
        pollType = "MULTIPLE_CHOICE"
        options = @(
            @{ optionText = "Red" }
            @{ optionText = "Blue" }
            @{ optionText = "Green" }
        )
    } | ConvertTo-Json -Depth 3
    $response = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/polls" -Method Post -Body $pollData -Headers $headers -ErrorAction Stop
    $pollId = $response.poll.id
    Write-Host "   ✓ Poll created successfully" -ForegroundColor Green
    Write-Host "   Poll ID: $pollId" -ForegroundColor Gray
    Write-Host "   Question: $($response.poll.question)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Create poll failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 7: Activate Poll
Write-Host "7. Testing Activate Poll..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId/activate" -Method Post -ErrorAction Stop
    Write-Host "   ✓ Poll activated successfully" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Activate poll failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 8: Submit Vote
Write-Host "8. Testing Submit Vote..." -ForegroundColor Yellow
try {
    # Get poll options first
    $pollDetails = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId" -Method Get -ErrorAction Stop
    $optionId = $pollDetails.options[0].id
    
    $voteData = @{
        participantId = $participantId
        optionId = $optionId
    } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId/votes" -Method Post -Body $voteData -Headers $headers -ErrorAction Stop
    Write-Host "   ✓ Vote submitted successfully" -ForegroundColor Green
    Write-Host "   Vote ID: $($response.vote.id)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Submit vote failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 9: Get Poll Results
Write-Host "9. Testing Get Poll Results..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId/results" -Method Get -ErrorAction Stop
    Write-Host "   Success: Poll results retrieved" -ForegroundColor Green
    Write-Host "   Total Votes: $($response.totalVotes)" -ForegroundColor Gray
    Write-Host "   Options:" -ForegroundColor Gray
    foreach ($option in $response.options) {
        Write-Host "      - $($option.optionText): $($option.voteCount) votes" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All core API tests completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Session ID: $sessionId" -ForegroundColor Yellow
Write-Host "Session Code: $sessionCode" -ForegroundColor Yellow
Write-Host "Poll ID: $pollId" -ForegroundColor Yellow
Write-Host "Participant ID: $participantId" -ForegroundColor Yellow
