# Uso:  powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 install
#       powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 uninstall
param([ValidateSet('install', 'uninstall')][string]$Action = 'install')

$shortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'MoMo.lnk'

if ($Action -eq 'uninstall') {
    if (Test-Path $shortcut) { Remove-Item $shortcut; Write-Host 'Avvio automatico di MoMo rimosso.' }
    else { Write-Host 'Avvio automatico non era attivo.' }
    return
}

$script = Join-Path $PSScriptRoot 'momo-start.ps1'
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($shortcut)
$lnk.TargetPath = 'powershell.exe'
$lnk.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$lnk.WorkingDirectory = Split-Path -Parent $PSScriptRoot
$icon = Join-Path (Split-Path -Parent $PSScriptRoot) 'public\favicon.ico'
if (Test-Path $icon) { $lnk.IconLocation = $icon }
$lnk.WindowStyle = 7
$lnk.Save()
Write-Host "MoMo partirà automaticamente all'accesso a Windows ($shortcut)."
