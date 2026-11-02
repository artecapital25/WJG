/**
 * ==============================================================================
 * SERVIDOR GATEWAY REAL DE WHATSAPP CON BAILEYS (WJGEEKS 3D PRO)
 * Línea Oficial: +57 320 2796115
 * Correo Oficial: wjgeeks3d@gmail.com
 * ==============================================================================
 * Conecta directamente a la red oficial de WhatsApp mediante el protocolo Multi-Device
 * usando @whiskeysockets/baileys.
 * 
 * - Genera códigos QR criptográficos 100% reales escaneables desde WhatsApp.
 * - Soporta vinculación por código de 8 dígitos (Pairing Code).
 * - Mantiene la sesión persistente en la carpeta 'auth_info_baileys'.
 * - Endpoint /reset para forzar limpieza limpia si las credenciales se corrompen.
 * - Encabezados CORS y Private Network Access para comunicación sin bloqueos.
 * ==============================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const PORT = process.env.PORT || 3001;
const OFFICIAL_PHONE = '+57 320 2796115';
const AUTH_DIR = path.join(__dirname, '..', 'auth_info_baileys');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let rawQrCode = null;
let base64QrCode = null;
let pairingCode = null;
let isReconnecting = false;

let sessionState = {
  connected: false,
  status: 'connecting',
  phone: OFFICIAL_PHONE,
  qrCode: null,
  pairingCode: null,
  totalSent: 0,
  history: []
};

// Formatear número a formato internacional colombiano si aplica
function formatToJid(numberStr) {
  let clean = String(numberStr).replace(/[^0-9]/g, '');
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = '57' + clean;
  }
  return clean + '@s.whatsapp.net';
}

function cleanSessionFolder() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const file of files) {
        fs.rmSync(path.join(AUTH_DIR, file), { recursive: true, force: true });
      }
      console.log('[WA-BAILEYS] 🧹 Carpeta auth_info_baileys purgada exitosamente.');
    }
  } catch (err) {
    console.error('[WA-BAILEYS] Error limpiando carpeta auth_info_baileys:', err.message);
  }
}

async function startWhatsAppSocket(forceReset = false) {
  if (isReconnecting) return;
  isReconnecting = true;

  if (forceReset) {
    cleanSessionFolder();
  }

  try {
    if (sock) {
      try { sock.end(undefined); } catch (_) {}
      sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version = [2, 3000, 1043857760];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v?.version) version = v.version;
    } catch (_) {}

    console.log(`[WA-BAILEYS] Inicializando socket WhatsApp Multi-Device (v${version.join('.')})...`);

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: Browsers.windows('Desktop'),
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        rawQrCode = qr;
        try {
          // Genera el código QR criptográfico real con alta resolución
          base64QrCode = await QRCode.toDataURL(qr, { 
            margin: 2, 
            scale: 8,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' }
          });
          sessionState.qrCode = base64QrCode;
          sessionState.status = 'qr_ready';
          sessionState.connected = false;
          sessionState.message = 'Código QR listo para escanear';
          console.log('\n[WA-BAILEYS] 📲 ¡Código QR criptográfico generado correctamente!');
          console.log('             Listo para escanear desde WhatsApp > Dispositivos Vinculados.');
        } catch (err) {
          console.error('[WA-BAILEYS] Error generando DataURL QR:', err.message);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        sessionState.connected = false;
        sessionState.status = shouldReconnect ? (sessionState.qrCode ? 'qr_ready' : 'connecting') : 'disconnected';
        sessionState.message = shouldReconnect 
          ? (sessionState.qrCode ? 'Código QR listo para escanear' : 'Actualizando conexión con WhatsApp...')
          : 'Sesión desconectada. Escanea nuevamente el código QR.';
        
        // Solo borrar el QR si el usuario cerró sesión explícitamente en el celular (loggedOut)
        if (!shouldReconnect) {
          sessionState.qrCode = null;
          rawQrCode = null;
          base64QrCode = null;
        }

        console.log(`[WA-BAILEYS] ⚠️ Conexión cerrada (Código: ${statusCode || 'timeout'}). Reconectando: ${shouldReconnect}`);

        isReconnecting = false;
        if (shouldReconnect) {
          setTimeout(() => startWhatsAppSocket(false), 2000);
        } else {
          console.log('[WA-BAILEYS] ❌ Sesión invalidada o cerrada por usuario. Reiniciando con sesión limpia...');
          setTimeout(() => startWhatsAppSocket(true), 2000);
        }
      } else if (connection === 'open') {
        isReconnecting = false;
        sessionState.connected = true;
        sessionState.status = 'connected';
        sessionState.qrCode = null;
        rawQrCode = null;
        base64QrCode = null;

        const connectedJid = sock.user?.id || '';
        const cleanNumber = connectedJid.split(':')[0] || connectedJid.split('@')[0];
        if (cleanNumber) {
          sessionState.phone = `+${cleanNumber}`;
        }

        console.log('\n======================================================');
        console.log(`✅ [WA-BAILEYS] ¡WHATSAPP OFICIAL CONECTADO EXITOSAMENTE!`);
        console.log(`📱 Número:  ${sessionState.phone}`);
        console.log(`🚀 Listo para despachar mensajes en segundo plano.`);
        console.log('======================================================\n');
      }
    });

  } catch (err) {
    console.error('[WA-BAILEYS] Error al iniciar socket:', err.message);
    isReconnecting = false;
    setTimeout(() => startWhatsAppSocket(false), 5000);
  } finally {
    isReconnecting = false;
  }
}

// Iniciar Baileys al arrancar
startWhatsAppSocket(false);

// Servidor REST para la Web App de WJGEEKS
const server = http.createServer(async (req, res) => {
  // CORS & Private Network Access Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Access-Control-Allow-Private-Network, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Endpoint: GET / o /health (Render & cloud healthchecks)
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'WJGEEKS 3D - WhatsApp Gateway Cloud',
      connected: sessionState.connected,
      phone: sessionState.phone,
      totalSent: sessionState.totalSent,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Endpoint: GET /status
  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: sessionState.connected,
      status: sessionState.connected ? 'connected' : (sessionState.qrCode ? 'qr_ready' : 'connecting'),
      phone: sessionState.phone,
      qr: sessionState.qrCode,
      pairingCode: sessionState.pairingCode,
      totalSent: sessionState.totalSent,
      message: sessionState.connected 
        ? `Línea oficial activa: ${sessionState.phone}` 
        : (sessionState.qrCode ? 'Código QR listo para escanear' : 'Conectando con WhatsApp...')
    }));
    return;
  }

  // Endpoint: GET /qr
  if (req.method === 'GET' && url.pathname === '/qr') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      connected: sessionState.connected,
      qr: sessionState.qrCode,
      message: sessionState.connected
        ? `WhatsApp ya está conectado con ${sessionState.phone}`
        : (sessionState.qrCode ? 'Escanea el código QR desde WhatsApp > Dispositivos vinculados' : 'Generando QR criptográfico...')
    }));
    return;
  }

  // Endpoint: POST /reset (Purga limpia de sesiones corruptas)
  if (req.method === 'POST' && url.pathname === '/reset') {
    console.log('[WA-BAILEYS] 🔄 Solicitud de reseteo completo de sesión recibida.');
    sessionState.connected = false;
    sessionState.status = 'connecting';
    sessionState.qrCode = null;
    sessionState.pairingCode = null;
    
    // Inicia nuevo ciclo con purga
    startWhatsAppSocket(true);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Sesión reseteada correctamente. Generando nuevo código QR limpio...'
    }));
    return;
  }

  // Endpoint: POST /pair (Vinculación alternativa por código de 8 dígitos)
  if (req.method === 'POST' && url.pathname === '/pair') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const phoneToPair = (payload.phone || payload.number || '573202796115').replace(/[^0-9]/g, '');
        
        if (!sock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Socket no disponible' }));
          return;
        }

        const code = await sock.requestPairingCode(phoneToPair);
        sessionState.pairingCode = code;
        console.log(`[WA-BAILEYS] 🔢 Código de vinculación generado para ${phoneToPair}: ${code}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          code,
          message: `Ingresa este código en WhatsApp > Dispositivos vinculados > Vincular con número de teléfono: ${code}`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Endpoint: POST /send
  if (req.method === 'POST' && url.pathname === '/send') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const target = payload.number || payload.phone || payload.to;
        const text = payload.message || payload.text;

        if (!target || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Faltan parámetros: number y message requeridos' }));
          return;
        }

        if (!sessionState.connected || !sock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'WhatsApp Gateway no está vinculado. Escanea el código QR en la aplicación.' 
          }));
          return;
        }

        const targetJid = formatToJid(target);
        const result = await sock.sendMessage(targetJid, { text });
        const messageId = result?.key?.id || `wjg-msg-${Date.now()}`;

        sessionState.totalSent++;
        sessionState.history.unshift({
          id: messageId,
          target,
          text: text.substring(0, 100) + '...',
          timestamp: new Date().toISOString()
        });
        if (sessionState.history.length > 50) sessionState.history.pop();

        console.log(`\x1b[32m[WA-REAL SENT]\x1b[0m Mensaje entregado a \x1b[36m${target}\x1b[0m:`);
        console.log(`  "${text.replace(/\n/g, ' ').substring(0, 80)}..."`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          id: messageId,
          message: `Mensaje despachado exitosamente por la línea oficial ${sessionState.phone}`
        }));
      } catch (err) {
        console.error('[WA-REAL SEND ERROR]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada en WhatsApp Gateway' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 WJGEEKS 3D - WHATSAPP GATEWAY REAL INICIADO`);
  console.log(`======================================================`);
  console.log(`📱 Línea Oficial:    ${OFFICIAL_PHONE}`);
  console.log(`🌐 Servidor REST:    http://localhost:${PORT}`);
  console.log(`⚡ Endpoints:`);
  console.log(`   - GET  http://localhost:${PORT}/status`);
  console.log(`   - GET  http://localhost:${PORT}/qr`);
  console.log(`   - POST http://localhost:${PORT}/pair`);
  console.log(`   - POST http://localhost:${PORT}/reset`);
  console.log(`   - POST http://localhost:${PORT}/send`);
  console.log(`======================================================\n`);

  // Render.com Self-Keepalive (Evita que el plan gratuito se suspenda por inactividad)
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    console.log(`[WA-CLOUD] 🌐 Render URL detectada: ${renderUrl}. Activando self-keepalive cada 10 min.`);
    setInterval(() => {
      try {
        const https = require('https');
        https.get(`${renderUrl}/health`, () => {}).on('error', () => {});
      } catch (_) {}
    }, 10 * 60 * 1000);
  }
});
