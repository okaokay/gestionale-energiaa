Write-Host "TEST IMPORT UNIFICATO" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

try {
    # 1. Login
    Write-Host "Effettuando login..." -ForegroundColor Yellow
    $loginBody = @{
        email = "admin@gestionale.it"
        password = "Admin123!"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "Login effettuato con successo" -ForegroundColor Green
    
    # 2. Verifica file CSV
    $csvPath = Join-Path (Split-Path $PSScriptRoot -Parent) "import_10_clienti_completi_super_import.csv"
    if (-not (Test-Path $csvPath)) {
        throw "File CSV non trovato: $csvPath"
    }
    Write-Host "File CSV trovato: $csvPath" -ForegroundColor Green
    
    # 3. Upload file
    Write-Host "Avviando upload..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    # Prepara il form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileBytes = [System.IO.File]::ReadAllBytes($csvPath)
    $fileName = Split-Path $csvPath -Leaf
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: text/csv",
        "",
        [System.Text.Encoding]::UTF8.GetString($fileBytes),
        "--$boundary",
        "Content-Disposition: form-data; name=`"skipValidation`"",
        "",
        "true",
        "--$boundary",
        "Content-Disposition: form-data; name=`"dryRun`"",
        "",
        "false",
        "--$boundary--"
    ) -join $LF
    
    $body = [System.Text.Encoding]::UTF8.GetBytes($bodyLines)
    
    $headers["Content-Type"] = "multipart/form-data; boundary=$boundary"
    
    $uploadResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/unified-import/upload" -Method POST -Body $body -Headers $headers
    
    Write-Host "Risposta upload:" -ForegroundColor Yellow
    Write-Host ($uploadResponse | ConvertTo-Json -Depth 5) -ForegroundColor White
    
    $importId = $uploadResponse.importId
    if (-not $importId) {
        $importId = $uploadResponse.data.importId
    }
    
    Write-Host "Upload avviato. Import ID: $importId" -ForegroundColor Green
    
    # 4. Monitora progresso
    Write-Host "Monitorando progresso..." -ForegroundColor Yellow
    
    do {
        Start-Sleep -Seconds 2
        $progressResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/unified-import/progress/$importId" -Headers $headers
        $progress = $progressResponse.progress
        
        Write-Host "Stage: $($progress.stage) - Progress: $($progress.percentage)%" -ForegroundColor Cyan
        
        if ($progress.stage -eq "completed" -or $progress.stage -eq "failed") {
            break
        }
    } while ($true)
    
    # 5. Ottieni risultato finale
    Write-Host "Ottenendo risultato finale..." -ForegroundColor Yellow
    $resultResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/unified-import/result/$importId" -Headers $headers
    
    Write-Host "RISULTATO FINALE:" -ForegroundColor Green
    Write-Host ($resultResponse | ConvertTo-Json -Depth 10) -ForegroundColor White
    
} catch {
    Write-Host "Errore: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}