# ==============================================================================
# Helper Script: Enlace rápido WhatsApp Gateway (Galaxy A22 Termux <-> PC)
# ==============================================================================
$adb = "d:\WJG\.tools\platform-tools\adb.exe"

if (!(Test-Path $adb)) {
    Write-Host "Error: No se encontró adb.exe en $adb" -ForegroundColor Red
    exit 1
}

Write-Host "Verificando dispositivo conectado..." -ForegroundColor Cyan
& $adb devices -l

Write-Host "Redirigiendo puerto 3001 por cable USB..." -ForegroundColor Yellow
& $adb forward tcp:3001 tcp:3001

Write-Host "Probando salud del Gateway en el celular..." -ForegroundColor Cyan
try {
    $resUsb = Invoke-RestMethod -Uri "http://localhost:3001/status" -TimeoutSec 3
    Write-Host "  -> USB (localhost:3001): OK ($($resUsb.message))" -ForegroundColor Green
} catch {
    Write-Host "  -> USB: No responde en localhost:3001" -ForegroundColor DarkYellow
}

try {
    $resWifi = Invoke-RestMethod -Uri "http://192.168.1.9:3001/status" -TimeoutSec 3
    Write-Host "  -> Wi-Fi (192.168.1.9:3001): OK ($($resWifi.message))" -ForegroundColor Green
} catch {
    Write-Host "  -> Wi-Fi: No responde en 192.168.1.9:3001" -ForegroundColor DarkYellow
}

Write-Host "`nListo para usar en WJGEEKS 3D PRO!" -ForegroundColor Green
