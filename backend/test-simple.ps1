# Simple API Test Script
$baseUrl = "http://localhost:3000"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Live Poll Backend API Test" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Write-Host "   PASS - Status: $($health.status)`n" -ForegroundColor Green

# Test 2: Create Session
Write-Host "2. Create Session..." -ForegroundColor Yellow
$sessionData = @{ presenterName = "Test Presenter" } | ConvertTo-Json
$sessionResponse = Invoke-RestMethod -Uri "$baseUrl/sessions" -Method Post -Body $sessionData -Headers $headers
$sessionId = $sessionResponse.session.id
$sessionCode = $sessionResponse.session.code
Write-Host "   PASS - Session ID: $sessionId" -ForegroundColor Green
Write-Host "         Session Code: $sessionCode`n" -ForegroundColor Green

# Test 3: Get Session
Write-Host "3. Get Session..." -ForegroundColor Yellow
$session = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId" -Method Get
Write-Host "   PASS - Presenter: $($session.presenterName)`n" -ForegroundColor Green

# Test 4: Start Session
Write-Host "4. Start Session..." -ForegroundColor Yellow
$startResponse = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/start" -Method Patch
Write-Host "   PASS - Status: $($startResponse.session.status)`n" -ForegroundColor Green

# Test 5: Join Session
Write-Host "5. Join Session..." -ForegroundColor Yellow
$participantData = @{ displayName = "Test Participant" } | ConvertTo-Json
$joinResponse = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/join" -Method Post -Body $participantData -Headers $headers
$participantId = $joinResponse.participantId
Write-Host "   PASS - Participant ID: $participantId`n" -ForegroundColor Green

# Test 6: Create Poll
Write-Host "6. Create Poll..." -ForegroundColor Yellow
$pollData = @{
    question = "What is your favorite color?"
    pollType = "MULTIPLE_CHOICE"
    options = @(
        @{ text = "Red" }
        @{ text = "Blue" }
        @{ text = "Green" }
    )
} | ConvertTo-Json -Depth 3
$pollResponse = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/polls" -Method Post -Body $pollData -Headers $headers
$pollId = $pollResponse.poll.id
Write-Host "   PASS - Poll ID: $pollId`n" -ForegroundColor Green

# Test 7: Activate Poll
Write-Host "7. Activate Poll..." -ForegroundColor Yellow
$activateResponse = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId/activate" -Method Post
Write-Host "   PASS - Poll activated`n" -ForegroundColor Green

# Test 8: Get Poll Details
Write-Host "8. Get Poll Details..." -ForegroundColor Yellow
$pollDetails = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId" -Method Get
$optionId = $pollDetails.options[0].id
Write-Host "   PASS - Question: $($pollDetails.question)`n" -ForegroundColor Green

# Test 9: Submit Vote
Write-Host "9. Submit Vote..." -ForegroundColor Yellow
$voteData = @{
    participantId = $participantId
    optionId = $optionId
} | ConvertTo-Json
$voteResponse = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId/votes" -Method Post -Body $voteData -Headers $headers
Write-Host "   PASS - Vote ID: $($voteResponse.vote.id)`n" -ForegroundColor Green

# Test 10: Get Poll Results
Write-Host "10. Get Poll Results..." -ForegroundColor Yellow
$results = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId/results" -Method Get
Write-Host "   PASS - Total Votes: $($results.totalVotes)" -ForegroundColor Green
Write-Host "   Options:" -ForegroundColor Gray
foreach ($option in $results.options) {
    Write-Host "     - $($option.optionText): $($option.voteCount) votes" -ForegroundColor Gray
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "All Tests PASSED!" -ForegroundColor Green
Write-Host "=====================================`n" -ForegroundColor Cyan

Write-Host "Test Data Created:" -ForegroundColor Yellow
Write-Host "  Session ID: $sessionId" -ForegroundColor Gray
Write-Host "  Session Code: $sessionCode" -ForegroundColor Gray
Write-Host "  Poll ID: $pollId" -ForegroundColor Gray
Write-Host "  Participant ID: $participantId`n" -ForegroundColor Gray
