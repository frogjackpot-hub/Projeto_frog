$ErrorActionPreference = 'Stop'

Write-Host 'Subindo containers...' -ForegroundColor Cyan
docker compose up -d --build

Write-Host ''
Write-Host 'Status dos containers:' -ForegroundColor Cyan
docker compose ps

Write-Host ''
Write-Host 'Teste de portas:' -ForegroundColor Cyan
$backendPort = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
$frontendPort = Test-NetConnection -ComputerName localhost -Port 4200 -WarningAction SilentlyContinue

[PSCustomObject]@{
    Servico    = 'backend'
    Porta      = 3000
    Disponivel = $backendPort.TcpTestSucceeded
},
[PSCustomObject]@{
    Servico    = 'frontend'
    Porta      = 4200
    Disponivel = $frontendPort.TcpTestSucceeded
} | Format-Table -AutoSize

Write-Host ''
Write-Host 'Health checks HTTP:' -ForegroundColor Cyan

function Test-HttpWithRetry {
    param(
        [string]$Url,
        [int]$MaxAttempts = 20,
        [int]$TimeoutSec = 15,
        [switch]$AsJson
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            if ($AsJson) {
                $response = Invoke-RestMethod -Uri $Url -TimeoutSec $TimeoutSec
                return @{ Success = $true; Response = $response }
            }

            $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing
            return @{ Success = $true; Response = $response }
        }
        catch {
            if ($attempt -eq $MaxAttempts) {
                return @{ Success = $false; Error = $_.Exception.Message }
            }

            Start-Sleep -Seconds 3
        }
    }
}

$backendResult = Test-HttpWithRetry -Url 'http://localhost:3000/api/health' -AsJson
if ($backendResult.Success) {
    Write-Host "Backend OK: $($backendResult.Response.message)" -ForegroundColor Green
}
else {
    Write-Host "Backend FALHOU: $($backendResult.Error)" -ForegroundColor Red
}

$frontendResult = Test-HttpWithRetry -Url 'http://localhost:4200'
if ($frontendResult.Success) {
    $statusCode = $frontendResult.Response.StatusCode
    if ($statusCode -ge 200 -and $statusCode -lt 400) {
        Write-Host "Frontend OK: HTTP $statusCode" -ForegroundColor Green
    }
    else {
        Write-Host "Frontend FALHOU: HTTP $statusCode" -ForegroundColor Red
    }
}
else {
    Write-Host "Frontend FALHOU: $($frontendResult.Error)" -ForegroundColor Red
}
