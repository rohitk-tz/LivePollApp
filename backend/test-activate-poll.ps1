# Test Activate Poll Endpoint
# This script tests the poll activation functionality

$baseUrl = "http://localhost:3000"

Write-Host "`n=== Testing Activate Poll Endpoint ===" -ForegroundColor Cyan

# Step 1: Create a session
Write-Host "`n1. Creating a new session..." -ForegroundColor Yellow
$sessionResponse = Invoke-RestMethod -Uri "$baseUrl/sessions" -Method Post -ContentType "application/json" -Body (@{
    presenterName = "Test Presenter"
} | ConvertTo-Json)

$sessionId = $sessionResponse.session.id
$sessionCode = $sessionResponse.session.code
Write-Host "   Session created: $sessionCode (ID: $sessionId)" -ForegroundColor Green

# Step 2: Start the session
Write-Host "`n2. Starting the session..." -ForegroundColor Yellow
$startResponse = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/start" -Method Post
Write-Host "   Session started: $($startResponse.session.status)" -ForegroundColor Green

# Step 3: Create a poll
Write-Host "`n3. Creating a poll..." -ForegroundColor Yellow
$pollResponse = Invoke-RestMethod -Uri "$baseUrl/polls" -Method Post -ContentType "application/json" -Body (@{
    sessionId = $sessionId
    question = "What is your favorite color?"
    pollType = "MULTIPLE_CHOICE"
    options = @(
        @{ optionText = "Red"; sequenceOrder = 0 }
        @{ optionText = "Blue"; sequenceOrder = 1 }
        @{ optionText = "Green"; sequenceOrder = 2 }
    )
    allowMultiple = $false
    isAnonymous = $true
} | ConvertTo-Json -Depth 10)

$pollId = $pollResponse.poll.id
Write-Host "   Poll created: $($pollResponse.poll.question)" -ForegroundColor Green
Write-Host "   Poll ID: $pollId" -ForegroundColor Green
Write-Host "   Poll Status: $($pollResponse.poll.status)" -ForegroundColor Green
Write-Host "   Options: $($pollResponse.poll.options.Count)" -ForegroundColor Green

# Step 4: Activate the poll
Write-Host "`n4. Activating the poll..." -ForegroundColor Yellow
try {
    $activateResponse = Invoke-RestMethod -Uri "$baseUrl/polls/$pollId/activate" -Method Post -ContentType "application/json"
    Write-Host "   Poll activated successfully!" -ForegroundColor Green
    Write-Host "   New Status: $($activateResponse.poll.status)" -ForegroundColor Green
    Write-Host "   Event: $($activateResponse.event | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Failed to activate poll" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more details
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $responseBody = $reader.ReadToEnd()
    Write-Host "   Response Body: $responseBody" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
