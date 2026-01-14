
# 1. Test Analyze API (Batching)
Write-Host "Testing /api/analyze..."
$headers = @{ "Content-Type" = "application/json" }
$body = @{ text = "明日の天気はどうですか" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/analyze" -Method Post -Headers $headers -Body $body
    Write-Host "Success! Response:"
    $response | Format-List
}
catch {
    Write-Error "Failed: $_"
}

# 2. Test Caching (Translate)
Write-Host "`nTesting Caching..."
$bodyCache = @{ text = "こんにちは" } | ConvertTo-Json
# Run 1
$sw = [System.Diagnostics.Stopwatch]::StartNew()
Invoke-RestMethod -Uri "http://localhost:3000/api/translate" -Method Post -Headers $headers -Body $bodyCache | Out-Null
$sw.Stop()
Write-Host "Run 1 (Uncached): $($sw.ElapsedMilliseconds)ms"

# Run 2
$sw.Restart()
Invoke-RestMethod -Uri "http://localhost:3000/api/translate" -Method Post -Headers $headers -Body $bodyCache | Out-Null
$sw.Stop()
Write-Host "Run 2 (Cached): $($sw.ElapsedMilliseconds)ms"

# 3. Test Validation
Write-Host "`nTesting Validation..."
$longText = new-object string 'a', 501
$bodyLong = @{ text = $longText } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/translate" -Method Post -Headers $headers -Body $bodyLong
}
catch {
    Write-Host "Caught Expected Error: $($_.Exception.Message)"
}
