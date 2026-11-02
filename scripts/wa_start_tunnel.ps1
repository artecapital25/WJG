# ==============================================================================
# WJGEEKS 3D - INICIADOR DE TÚNEL GRATUITO (Cloudflare / Pinggy)
# Permite conectar Vercel (HTTPS) con el WhatsApp Gateway local sin costos ni registros.
# ==============================================================================
param(
    [ValidateSet('Cloudflare', 'Pinggy')]
    [string]$Provider = 'Cloudflare',
    [int]$Port = 3001
)

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   🚀 WJGEEKS 3D - INICIADOR DE TÚNEL GRATUITO PARA WHATSAPP     " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Puerto local de destino: $Port" -ForegroundColor DarkGray
Write-Host " Proveedor seleccionado:  $Provider" -ForegroundColor Green
Write-Host ""

if ($Provider -eq 'Cloudflare') {
    $cf = Get-Command cloudflared -ErrorAction SilentlyContinue
    if (-not $cf) {
        Write-Host "⚠️ 'cloudflared' no está instalado en este equipo." -ForegroundColor Yellow
        Write-Host "Instalando automáticamente mediante winget..." -ForegroundColor Cyan
        try {
            winget install --id Cloudflare.cloudflared -e --silent --accept-source-agreements --accept-package-agreements
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } catch {
            Write-Host "❌ No se pudo instalar automáticamente. Alternando a Pinggy (sin instalaciones)..." -ForegroundColor Yellow
            $Provider = 'Pinggy'
        }
    }
}

if ($Provider -eq 'Cloudflare') {
    Write-Host "🌐 Iniciando Cloudflare Quick Tunnel (100% gratuito, sin registro)..." -ForegroundColor Cyan
    Write-Host "📌 Busca la URL que termina en '.trycloudflare.com' y pégala en Ajustes de WhatsApp." -ForegroundColor Green
    Write-Host ""
    cloudflared tunnel --url "http://127.0.0.1:$Port"
} else {
    Write-Host "⚡ Iniciando Pinggy por SSH (Instantáneo, 100% gratuito)..." -ForegroundColor Green
    Write-Host "📌 Copia la URL 'https://...free.pinggy.link' que aparecerá a continuación:" -ForegroundColor Yellow
    Write-Host ""
    ssh -p 443 -R "0:localhost:$Port" a.pinggy.io
}
