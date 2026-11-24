/**
 * ==============================================================================
 * SERVIDOR GATEWAY REAL DE WHATSAPP CON BAILEYS (WJGEEKS 3D PRO)
 * Línea Oficial: +57 320 2796115
 * Correo Oficial: wjgeeks3d@gmail.com
 * ==============================================================================
 * Conecta directamente a la red oficial de WhatsApp mediante el protocolo Multi-Device
 * usando @whiskeysockets/baileys.
 *
 * - Persistencia PERMANENTE en Supabase (`public.whatsapp_baileys_sessions`) cuando
 *   existen SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (sobrevive reinicios de Render).
 * - Fallback automático a carpeta local `auth_info_baileys` en desarrollo local.
 * - Reconexión con backoff exponencial (2s -> 4s -> 8s -> 15s -> 30s).
 * - Endpoint /reset para forzar limpieza limpia cuando el usuario lo solicite.
 * ==============================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const { createClient } = require('@supabase/supabase-js');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  initAuthCreds,
  BufferJSON,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const PORT = process.env.PORT || 3001;
const OFFICIAL_PHONE = '+57 320 2796115';
const AUTH_DIR = path.join(__dirname, '..', 'auth_info_baileys');
const WA_SESSION_ID = process.env.WA_SESSION_ID || 'wjgeeks-main';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STARTED_AT = Date.now();

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

const STORAGE_MODE = supabaseAdmin ? 'supabase_persistent' : 'local_ephemeral';

if (!supabaseAdmin && !fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let rawQrCode = null;
let base64QrCode = null;
let isReconnecting = false;
let reconnectAttempts = 0;

let sessionState = {
  connected: false,
  status: 'connecting',
  phone: OFFICIAL_PHONE,
  qrCode: null,
  pairingCode: null,
  totalSent: 0,
  history: []
};

function formatToJid(numberStr) {
  let clean = String(numberStr).replace(/[^0-9]/g, '');
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = '57' + clean;
  }
  return clean + '@s.whatsapp.net';
}

function cleanLocalSessionFolder() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const file of files) {
        fs.rmSync(path.join(AUTH_DIR, file), { recursive: true, force: true });
      }
      console.log('[WA-BAILEYS] Carpeta auth_info_baileys purgada.');
    }
  } catch (err) {
    console.error('[WA-BAILEYS] Error limpiando auth_info_baileys:', err.message);
  }
}

async function cleanSupabaseSession() {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin
      .from('whatsapp_baileys_sessions')
      .delete()
      .eq('session_id', WA_SESSION_ID);
    console.log(`[WA-BAILEYS] Sesión Supabase "${WA_SESSION_ID}" purgada.`);
  } catch (err) {
    console.error('[WA-BAILEYS] Error limpiando sesión en Supabase:', err.message);
  }
}

/**
 * AuthState persistente sobre tabla `public.whatsapp_baileys_sessions` en Supabase.
 * Si la tabla aún no existe o hay fallo puntual, hace fallback automático a disco local.
 */
async function useSupabaseAuthState() {
  if (!supabaseAdmin) {
    return useMultiFileAuthState(AUTH_DIR);
  }

  // Verificar accesibilidad de la tabla antes de arrancar
  const probe = await supabaseAdmin
    .from('whatsapp_baileys_sessions')
    .select('key_id')
    .eq('session_id', WA_SESSION_ID)
    .limit(1);

  if (probe.error) {
    console.warn('[WA-BAILEYS] Tabla whatsapp_baileys_sessions no disponible, usando disco local:', probe.error.message);
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    return useMultiFileAuthState(AUTH_DIR);
  }

  const readData = async (keyId) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_baileys_sessions')
        .select('data_json')
        .eq('session_id', WA_SESSION_ID)
        .eq('key_id', keyId)
        .maybeSingle();
      if (error || !data?.data_json) return null;
      return JSON.parse(JSON.stringify(data.data_json), BufferJSON.reviver);
    } catch (_) {
      return null;
    }
  };

  const writeData = async (keyId, value) => {
    try {
      const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
      await supabaseAdmin.from('whatsapp_baileys_sessions').upsert(
        {
          session_id: WA_SESSION_ID,
          key_id: keyId,
          data_json: serialized,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'session_id,key_id' }
      );
    } catch (err) {
      console.error(`[WA-BAILEYS] Error guardando key ${keyId}:`, err.message);
    }
  };

  const removeData = async (keyId) => {
    try {
      await supabaseAdmin
        .from('whatsapp_baileys_sessions')
        .delete()
        .eq('session_id', WA_SESSION_ID)
        .eq('key_id', keyId);
    } catch (_) {}
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          const keys = ids.map(id => `${type}-${id}`);
          try {
            const { data } = await supabaseAdmin
              .from('whatsapp_baileys_sessions')
              .select('key_id, data_json')
              .eq('session_id', WA_SESSION_ID)
              .in('key_id', keys);
            const rowMap = new Map((data || []).map(r => [r.key_id, r.data_json]));
            ids.forEach(id => {
              const raw = rowMap.get(`${type}-${id}`);
              if (raw) {
                result[id] = JSON.parse(JSON.stringify(raw), BufferJSON.reviver);
              }
            });
          } catch (_) {}
          return result;
        },
        set: async (data) => {
          const rows = [];
          const deletes = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const val = data[category][id];
              const keyId = `${category}-${id}`;
              if (val) {
                rows.push({
                  session_id: WA_SESSION_ID,
                  key_id: keyId,
                  data_json: JSON.parse(JSON.stringify(val, BufferJSON.replacer)),
                  updated_at: new Date().toISOString()
                });
              } else {
                deletes.push(keyId);
              }
            }
          }
          if (rows.length > 0) {
            await supabaseAdmin
              .from('whatsapp_baileys_sessions')
              .upsert(rows, { onConflict: 'session_id,key_id' });
          }
          if (deletes.length > 0) {
            await supabaseAdmin
              .from('whatsapp_baileys_sessions')
              .delete()
              .eq('session_id', WA_SESSION_ID)
              .in('key_id', deletes);
          }
        }
      }
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    }
  };
}

function getBackoffDelayMs() {
  const delays = [2000, 4000, 8000, 15000, 30000];
  const idx = Math.min(reconnectAttempts, delays.length - 1);
  reconnectAttempts += 1;
  return delays[idx];
}

async function startWhatsAppSocket(forceReset = false) {
  if (isReconnecting) return;
  isReconnecting = true;

  if (forceReset) {
    reconnectAttempts = 0;
    cleanLocalSessionFolder();
    await cleanSupabaseSession();
  }

  try {
    if (sock) {
      try { sock.end(undefined); } catch (_) {}
      sock = null;
    }

    const { state, saveCreds } = await useSupabaseAuthState();
    let version = [2, 3000, 1043857760];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v?.version) version = v.version;
    } catch (_) {}

    console.log(`[WA-BAILEYS] Iniciando socket Multi-Device (v${version.join('.')}, modo: ${STORAGE_MODE})...`);

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
          console.log('[WA-BAILEYS] Código QR criptográfico generado.');
        } catch (err) {
          console.error('[WA-BAILEYS] Error generando DataURL QR:', err.message);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = !isLoggedOut;

        sessionState.connected = false;
        sessionState.status = shouldReconnect ? (sessionState.qrCode ? 'qr_ready' : 'connecting') : 'disconnected';
        sessionState.message = shouldReconnect
          ? (sessionState.qrCode ? 'Código QR listo para escanear' : 'Reconectando sesión con WhatsApp...')
          : 'Sesión cerrada desde el teléfono. Escanea nuevamente el código QR.';

        if (isLoggedOut) {
          sessionState.qrCode = null;
          rawQrCode = null;
          base64QrCode = null;
        }

        const delayMs = getBackoffDelayMs();
        console.log(`[WA-BAILEYS] Conexión cerrada (Código: ${statusCode || 'timeout'}). Reconectando en ${delayMs}ms (Reset: ${isLoggedOut})`);

        isReconnecting = false;
        if (shouldReconnect) {
          setTimeout(() => startWhatsAppSocket(false), delayMs);
        } else {
          setTimeout(() => startWhatsAppSocket(true), 2500);
        }
      } else if (connection === 'open') {
        isReconnecting = false;
        reconnectAttempts = 0;
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

        console.log(`[WA-BAILEYS] WHATSAPP OFICIAL CONECTADO (${sessionState.phone}) [${STORAGE_MODE}]`);
      }
    });
  } catch (err) {
    console.error('[WA-BAILEYS] Error al iniciar socket:', err.message);
    isReconnecting = false;
    setTimeout(() => startWhatsAppSocket(false), getBackoffDelayMs());
  } finally {
    isReconnecting = false;
  }
}

startWhatsAppSocket(false);

const server = http.createServer(async (req, res) => {
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
  const uptimeSec = Math.floor((Date.now() - STARTED_AT) / 1000);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'WJGEEKS 3D - WhatsApp Gateway Cloud',
      connected: sessionState.connected,
      phone: sessionState.phone,
      storageMode: STORAGE_MODE,
      sessionId: WA_SESSION_ID,
      uptimeSec,
      totalSent: sessionState.totalSent,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: sessionState.connected,
      status: sessionState.connected ? 'connected' : (sessionState.qrCode ? 'qr_ready' : 'connecting'),
      phone: sessionState.phone,
      qr: sessionState.qrCode,
      pairingCode: sessionState.pairingCode,
      storageMode: STORAGE_MODE,
      uptimeSec,
      totalSent: sessionState.totalSent,
      message: sessionState.connected
        ? `Línea oficial activa: ${sessionState.phone}`
        : (sessionState.qrCode ? 'Código QR listo para escanear' : 'Conectando con WhatsApp...')
    }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/qr') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      connected: sessionState.connected,
      qr: sessionState.qrCode,
      storageMode: STORAGE_MODE,
      message: sessionState.connected
        ? `WhatsApp ya está conectado con ${sessionState.phone}`
        : (sessionState.qrCode ? 'Escanea el código QR desde WhatsApp > Dispositivos vinculados' : 'Generando QR criptográfico...')
    }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/reset') {
    console.log('[WA-BAILEYS] Solicitud de reseteo completo de sesión.');
    sessionState.connected = false;
    sessionState.status = 'connecting';
    sessionState.qrCode = null;
    sessionState.pairingCode = null;

    startWhatsAppSocket(true);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Sesión reseteada correctamente. Generando nuevo código QR limpio...'
    }));
    return;
  }

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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada en WhatsApp Gateway' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WJGEEKS 3D - WHATSAPP GATEWAY (${STORAGE_MODE}) en puerto ${PORT}`);
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://wjg.onrender.com';
  setInterval(() => {
    try {
      const https = require('https');
      https.get(`${renderUrl}/health`, () => {}).on('error', () => {});
    } catch (_) {}
  }, 8 * 60 * 1000);
});
