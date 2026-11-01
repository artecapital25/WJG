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
 * - Mantiene la sesión persistente en la carpeta 'auth_info_baileys'.
 * - Despacha mensajes reales al WhatsApp del cliente final sin intermediarios ni costos.
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
  delay
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

let sessionState = {
  connected: false,
  status: 'connecting',
  phone: OFFICIAL_PHONE,
  qrCode: null,
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

async function startWhatsAppSocket() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WA-BAILEYS] Versión protocolo WhatsApp: v${version.join('.')} (Última: ${isLatest})`);

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true, // Imprime también el QR en la terminal para facilidad
      auth: state,
      browser: ['WJGEEKS 3D PRO', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        rawQrCode = qr;
        try {
          base64QrCode = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
          sessionState.qrCode = base64QrCode;
          sessionState.status = 'qr_ready';
          sessionState.connected = false;
          console.log('\n[WA-BAILEYS] 📲 ¡Nuevo Código QR de vinculación generado!');
          console.log('             Escanea este código desde WhatsApp > Dispositivos Vinculados.');
        } catch (err) {
          console.error('[WA-BAILEYS] Error generando DataURL QR:', err.message);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        sessionState.connected = false;
        sessionState.status = 'disconnected';
        console.log(`[WA-BAILEYS] ⚠️ Conexión cerrada (Código: ${statusCode}). ¿Reconectar?: ${shouldReconnect}`);

        if (shouldReconnect) {
          console.log('[WA-BAILEYS] Reintentando conexión en 5 segundos...');
          setTimeout(startWhatsAppSocket, 5000);
        } else {
          console.log('[WA-BAILEYS] ❌ Sesión cerrada por el usuario. Limpiando credenciales para nuevo QR...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          } catch (_) {}
          setTimeout(startWhatsAppSocket, 3000);
        }
      } else if (connection === 'open') {
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
        console.log(`🚀 Listo para despachar notificaciones automáticas reales.`);
        console.log('======================================================\n');
      }
    });

  } catch (err) {
    console.error('[WA-BAILEYS] Error fatal al iniciar socket:', err);
    setTimeout(startWhatsAppSocket, 10000);
  }
}

// Iniciar Baileys
startWhatsAppSocket();

// Servidor REST para la Web App de WJGEEKS
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Endpoint: GET /status
  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: sessionState.connected,
      status: sessionState.connected ? 'connected' : (sessionState.qrCode ? 'qr_ready' : 'disconnected'),
      phone: sessionState.phone,
      qr: sessionState.qrCode,
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
  console.log(`   - POST http://localhost:${PORT}/send`);
  console.log(`======================================================\n`);
});
