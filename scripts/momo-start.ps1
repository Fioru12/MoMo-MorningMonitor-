# Avvia il server MoMo in background (se non è già attivo) e apre la dashboard come finestra-app.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { $env:PORT } else { 3100 }
$url = "http://localhost:$port"

function Test-MoMo {
    # 127.0.0.1 e non localhost: .NET prova prima IPv6 (::1), dove il server non ascolta.
    try { (Invoke-WebRequest "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

if (-not (Test-MoMo)) {
    $logDir = Join-Path $root 'logs'
    New-Item -ItemType Directory -Force $logDir | Out-Null
    Start-Process node -ArgumentList 'server.js' -WorkingDirectory $root -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir 'momo.log') -RedirectStandardError (Join-Path $logDir 'momo-error.log')
    for ($i = 0; $i -lt 40 -and -not (Test-MoMo); $i++) { Start-Sleep -Milliseconds 500 }
}

if ($args -contains '-NoBrowser') { return }

$browsers = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $browsers | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($browser) {
    Start-Process $browser -ArgumentList "--app=$url", '--start-maximized'
} else {
    Start-Process $url
}
