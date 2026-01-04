# Test vote submission
# First, get a session with an active poll

$baseUrl = "http://localhost:3001"

Write-Host "Testing vote submission..." -ForegroundColor Cyan

# 1. Get session by code
Write-Host "`n1. Getting session..." -ForegroundColor Yellow
$session = Invoke-RestMethod -Uri "$baseUrl/sessions/code/ABC123" -Method Get -ErrorAction SilentlyContinue
if ($session) {
    Write-Host "Session found: $($session.id)" -ForegroundColor Green
    Write-Host "Session status: $($session.status)" -ForegroundColor Green
} else {
    Write-Host "Session not found" -ForegroundColor Red
    exit 1
}

# 2. Get polls for session
Write-Host "`n2. Getting polls..." -ForegroundColor Yellow
$polls = Invoke-RestMethod -Uri "$baseUrl/sessions/$($session.id)/polls" -Method Get
Write-Host "Found $($polls.Count) polls" -ForegroundColor Green

if ($polls.Count -eq 0) {
    Write-Host "No polls found" -ForegroundColor Red
    exit 1
}

# Find an active poll or activate the first one
$activePoll = $polls | Where-Object { $_.status -eq 'Active' } | Select-Object -First 1

if (-not $activePoll) {
    Write-Host "`n3. Activating first poll..." -ForegroundColor Yellow
    $pollToActivate = $polls[0]
    Write-Host "Poll ID: $($pollToActivate.id)" -ForegroundColor Cyan
    Write-Host "Poll status: $($pollToActivate.status)" -ForegroundColor Cyan
    Write-Host "Poll question: $($pollToActivate.question)" -ForegroundColor Cyan
    
    try {
        $activePoll = Invoke-RestMethod -Uri "$baseUrl/polls/$($pollToActivate.id)/activate" -Method Post
        Write-Host "Poll activated successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to activate poll: $_" -ForegroundColor Red
        Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n3. Using existing active poll" -ForegroundColor Green
}

Write-Host "Active poll: $($activePoll.question)" -ForegroundColor Cyan
Write-Host "Poll options:" -ForegroundColor Cyan
$activePoll.options | ForEach-Object {
    Write-Host "  - $($_.optionText) (ID: $($_.id))" -ForegroundColor White
}

# 4. Get or create a participant
Write-Host "`n4. Joining session as participant..." -ForegroundColor Yellow
$joinBody = @{
    displayName = "Test Voter $(Get-Random -Maximum 1000)"
} | ConvertTo-Json

try {
    $participant = Invoke-RestMethod -Uri "$baseUrl/sessions/$($session.id)/join" -Method Post -Body $joinBody -ContentType "application/json"
    Write-Host "Joined as: $($participant.displayName) (ID: $($participant.id))" -ForegroundColor Green
} catch {
    Write-Host "Failed to join session: $_" -ForegroundColor Red
    exit 1
}

# 5. Submit vote
Write-Host "`n5. Submitting vote..." -ForegroundColor Yellow
$firstOption = $activePoll.options[0]
$voteBody = @{
    participantId = $participant.id
    selectedOptionId = $firstOption.id
} | ConvertTo-Json

Write-Host "Vote payload:" -ForegroundColor Cyan
Write-Host $voteBody -ForegroundColor White

try {
    $voteResponse = Invoke-RestMethod -Uri "$baseUrl/polls/$($activePoll.id)/votes" -Method Post -Body $voteBody -ContentType "application/json"
    Write-Host "`nVote submitted successfully!" -ForegroundColor Green
    Write-Host "Vote ID: $($voteResponse.voteId)" -ForegroundColor Green
    Write-Host "Status: $($voteResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "`nFailed to submit vote!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    # Try to get more details
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Red
}
