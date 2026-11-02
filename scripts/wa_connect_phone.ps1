# ==============================================================================
# Helper Script: Enlace y Gestión Automática de WhatsApp Gateway en Celular Android
# ==============================================================================
param (
    [switch]$InstallOrUpdate,
    [switch]$Restart
)

$adb = "d:\WJG\.tools\platform-tools\adb.exe"

if (!(Test-Path $adb)) {
    Write-Host "Error: No se encontró adb.exe en $adb" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  WJGEEKS 3D - GESTOR DE GATEWAY EN CELULAR ANDROID       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`n1. Verificando celular conectado por USB..." -ForegroundColor Yellow
$devices = & $adb devices -l
Write-Host $devices

if ($devices -notmatch 'device product:') {
    Write-Host "`n❌ No se detectó ningún celular Android con depuración USB activa." -ForegroundColor Red
    Write-Host "Por favor activa 'Depuración USB' en tu teléfono y conéctalo con el cable." -ForegroundColor Yellow
    exit 1
}

# Obtener IP Wi-Fi dinámica del celular conectado
$ipWifi = "192.168.1.9"
try {
    $ipRaw = & $adb shell "ip -o -4 addr show wlan0"
    if ($ipRaw -match 'inet\s+([0-9.]+)/') {
        $ipWifi = $matches[1]
    }
} catch {}

# Si se solicitó instalar o actualizar el servidor en el celular
if ($InstallOrUpdate) {
    Write-Host "`n2. Empaquetando y transfiriendo el servidor autónomo al celular..." -ForegroundColor Cyan
    $srcStandalone = "d:\WJG\scripts\whatsapp_gateway_standalone.cjs"
    $srcSource = "d:\WJG\scripts\whatsapp_gateway_server.cjs"
    
    if (!(Test-Path $srcStandalone)) {
        Write-Host "  -> Generando paquete autónomo con esbuild..." -ForegroundColor DarkCyan
        npx esbuild $srcSource --bundle --platform=node --target=node18 --outfile=$srcStandalone | Out-Null
    }

    Write-Host "  -> Transfiriendo archivo al celular..." -ForegroundColor DarkCyan
    & $adb push $srcStandalone /data/local/tmp/server.cjs
    & $adb shell "chmod 777 /data/local/tmp/server.cjs && run-as com.termux cp /data/local/tmp/server.cjs /data/data/com.termux/files/home/server.cjs"
    Write-Host "  -> Servidor copiado exitosamente en Termux (~/server.cjs)" -ForegroundColor Green
}

# Redirección de puerto USB 3001
Write-Host "`n3. Redirigiendo puerto 3001 por cable USB..." -ForegroundColor Yellow
& $adb forward tcp:3001 tcp:3001
Write-Host "  -> Redirección USB establecida: localhost:3001 <-> Celular:3001" -ForegroundColor Green

# Si se solicitó reiniciar el servidor en Termux
if ($Restart -or $InstallOrUpdate) {
    Write-Host "`n4. Reiniciando servidor en Termux..." -ForegroundColor Cyan
    & $adb shell "am force-stop com.termux"
    Start-Sleep -Seconds 1
    & $adb shell "am start -n com.termux/.app.TermuxActivity"
    Start-Sleep -Seconds 2
    & $adb shell "input text 'node%sserver.cjs' && input keyevent 66"
    Start-Sleep -Seconds 2
}

# Probar salud del servidor
Write-Host "`n5. Verificando conectividad del Gateway..." -ForegroundColor Cyan
try {
    $resUsb = Invoke-RestMethod -Uri "http://localhost:3001/status" -TimeoutSec 4
    Write-Host "  -> Vía Cable USB (http://localhost:3001): OK" -ForegroundColor Green
    Write-Host "     Estado: $($resUsb.status) | Conectado: $($resUsb.connected) | Línea: $($resUsb.phone)" -ForegroundColor Gray
} catch {
    Write-Host "  -> Vía Cable USB: No respondió en localhost:3001" -ForegroundColor DarkYellow
}

try {
    $resWifi = Invoke-RestMethod -Uri "http://$($ipWifi):3001/status" -TimeoutSec 4
    Write-Host "  -> Vía Red Wi-Fi (http://$($ipWifi):3001): OK" -ForegroundColor Green
    Write-Host "     Estado: $($resWifi.status) | Conectado: $($resWifi.connected) | Línea: $($resWifi.phone)" -ForegroundColor Gray
} catch {
    Write-Host "  -> Vía Red Wi-Fi: No respondió en http://$($ipWifi):3001" -ForegroundColor DarkYellow
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✅ Gateway activo y listo para WJGEEKS 3D PRO!" -ForegroundColor Green
Write-Host "IP en red Wi-Fi: http://$($ipWifi):3001" -ForegroundColor Cyan
Write-Host "Para acceso remoto por Internet consulta: docs/MANUAL_WHATSAPP_GATEWAY_MOVIL.md" -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Green
