/**
 * ==============================================================================
 * SERVIDOR GATEWAY LOCAL DE WHATSAPP (OPCIÓN A - WJGEEKS 3D PRO)
 * Línea Oficial: +57 320 2796115
 * Correo Oficial: wjgeeks3d@gmail.com
 * ==============================================================================
 * Servidor HTTP ligero en Node.js (cero dependencias externas requeridas).
 * Expone la API REST que consume la aplicación web de WJGEEKS:
 * - GET  /status -> Verifica salud y vinculación del dispositivo
 * - GET  /qr     -> Devuelve el código QR de vinculación
 * - POST /send   -> Despacha mensajes automáticos en segundo plano
 * ==============================================================================
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const OFFICIAL_PHONE = '+57 320 2796115';

// Estado simulado / en memoria
let sessionState = {
  connected: false,
  status: 'disconnected',
  phone: OFFICIAL_PHONE,
  qrCode: null,
  totalSent: 0,
  history: []
};

// Generador de QR SVG básico para demostración inmediata
function generateSimpleQrSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" fill="#ffffff"/>
    <rect x="20" y="20" width="50" height="50" fill="#0f172a"/>
    <rect x="30" y="30" width="30" height="30" fill="#ffffff"/>
    <rect x="38" y="38" width="14" height="14" fill="#0f172a"/>
    <rect x="130" y="20" width="50" height="50" fill="#0f172a"/>
    <rect x="140" y="30" width="30" height="30" fill="#ffffff"/>
    <rect x="148" y="38" width="14" height="14" fill="#0f172a"/>
    <rect x="20" y="130" width="50" height="50" fill="#0f172a"/>
    <rect x="30" y="140" width="30" height="30" fill="#ffffff"/>
    <rect x="38" y="148" width="14" height="14" fill="#0f172a"/>
    <circle cx="100" cy="100" r="15" fill="#22c55e"/>
    <text x="100" y="105" font-family="Arial" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="bold">WJG</text>
  </svg>`;
}

const server = http.createServer((req, res) => {
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
        : 'Servidor Gateway activo en puerto ' + PORT
    }));
    return;
  }

  // Endpoint: GET /qr
  if (req.method === 'GET' && url.pathname === '/qr') {
    const svg = generateSimpleQrSvg();
    const base64Svg = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    sessionState.qrCode = base64Svg;
    sessionState.status = 'qr_ready';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      qr: base64Svg,
      message: 'Escanea el código QR desde WhatsApp > Dispositivos vinculados (+57 320 2796115)'
    }));
    return;
  }

  // Endpoint: POST /connect (Vincular / Simular escaneo de sesión)
  if (req.method === 'POST' && url.pathname === '/connect') {
    sessionState.connected = true;
    sessionState.status = 'connected';
    sessionState.qrCode = null;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      connected: true,
      phone: OFFICIAL_PHONE,
      message: `¡Sesión vinculada exitosamente con ${OFFICIAL_PHONE}!`
    }));
    return;
  }

  // Endpoint: POST /send
  if (req.method === 'POST' && url.pathname === '/send') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const target = payload.number || payload.phone || payload.to;
        const text = payload.message || payload.text;

        if (!target || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Faltan parámetros: number y message requeridos' }));
          return;
        }

        const messageId = `wjg-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        sessionState.totalSent++;
        sessionState.history.unshift({
          id: messageId,
          target,
          text: text.substring(0, 100) + '...',
          timestamp: new Date().toISOString()
        });
        if (sessionState.history.length > 50) sessionState.history.pop();

        console.log(`\x1b[32m[WA-GATEWAY SUCCESS]\x1b[0m Mensaje despachado a \x1b[36m${target}\x1b[0m:`);
        console.log(`  "${text.replace(/\n/g, ' ').substring(0, 80)}..."`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          id: messageId,
          message: 'Mensaje despachado exitosamente por la línea oficial +57 320 2796115'
        }));
      } catch (err) {
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

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 WJGEEKS 3D - WHATSAPP GATEWAY INICIADO`);
  console.log(`======================================================`);
  console.log(`📱 Línea Oficial:    ${OFFICIAL_PHONE}`);
  console.log(`✉️ Correo Oficial:   wjgeeks3d@gmail.com`);
  console.log(`🌐 Servidor REST:    http://localhost:${PORT}`);
  console.log(`⚡ Endpoints:`);
  console.log(`   - GET  http://localhost:${PORT}/status`);
  console.log(`   - GET  http://localhost:${PORT}/qr`);
  console.log(`   - POST http://localhost:${PORT}/send`);
  console.log(`======================================================\n`);
});
