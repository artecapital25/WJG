# ==============================================================================
# WJGEEKS 3D - INICIADOR DE TUNEL GRATUITO (Cloudflare / Pinggy)
# ==============================================================================
param(
    [ValidateSet('Cloudflare', 'Pinggy')]
    [string]$Provider = 'Cloudflare',
    [int]$Port = 3001
)

$toolsDir = "d:\WJG\.tools"
$cfExe = Join-Path $toolsDir "cloudflared.exe"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   WJGEEKS 3D - INICIADOR DE TUNEL GRATUITO PARA WHATSAPP        " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Puerto local: $Port" -ForegroundColor DarkGray
Write-Host " Proveedor:    $Provider" -ForegroundColor Green
Write-Host ""

# Enlazar puerto con el celular si ADB esta disponible
$adb = "d:\WJG\.tools\platform-tools\adb.exe"
$targetUrl = "http://127.0.0.1:$Port"

if (Test-Path $adb) {
    try {
        & $adb forward "tcp:$Port" "tcp:$Port" 2>$null
    } catch {}
}

# Si el celular responde en la IP local Wi-Fi, usarla directamente
try {
    $res = curl.exe -s --max-time 1 "http://192.168.1.9:$Port/status"
    if ($res -match '"connected"') {
        $targetUrl = "http://192.168.1.9:$Port"
        Write-Host "Detectado celular activo en Wi-Fi: $targetUrl" -ForegroundColor Green
    }
} catch {}

if ($Provider -eq 'Cloudflare') {
    if (-not (Test-Path $cfExe)) {
        Write-Host "Descargando cloudflared oficial..." -ForegroundColor Cyan
        New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
        curl.exe -L -o $cfExe "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    }

    if (Test-Path $cfExe) {
        Write-Host "Iniciando Cloudflare Quick Tunnel hacia $targetUrl..." -ForegroundColor Cyan
        Write-Host "Copia la URL segura 'https://...trycloudflare.com' y pegala en Ajustes de WhatsApp." -ForegroundColor Green
        Write-Host ""
        & $cfExe tunnel --url $targetUrl
    } else {
        Write-Host "No se encontro cloudflared.exe. Alternando a Pinggy SSH..." -ForegroundColor Yellow
        $Provider = 'Pinggy'
    }
}

if ($Provider -eq 'Pinggy') {
    Write-Host "Iniciando Pinggy por SSH (Instantaneo, 100% gratuito)..." -ForegroundColor Green
    Write-Host "Copia la URL 'https://...free.pinggy.link' que aparecera a continuacion:" -ForegroundColor Yellow
    Write-Host ""
    ssh -p 443 -R "0:localhost:$Port" a.pinggy.io
}
