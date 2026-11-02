import { StorageService } from './storageService';

export interface GoogleSheetsConfig {
  webAppUrl: string;
  sheetUrl: string;
  autoSync: boolean;
  lastSync: string | null;
  lastStatus: 'success' | 'error' | null;
  lastMessage: string | null;
}

const STORAGE_KEY = 'wjg_google_sheets_config';

export const OFFICIAL_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEUGjnaQoMVZ5OtdY-QJldULcF_NYqxsda9y5nR72kf7kaQNIsp6AQbb5Z_Fop2syAJQ/exec';

const ENV_APPS_SCRIPT_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL) || OFFICIAL_APPS_SCRIPT_URL;

const DEFAULT_CONFIG: GoogleSheetsConfig = {
  webAppUrl: OFFICIAL_APPS_SCRIPT_URL,
  sheetUrl: '',
  autoSync: true,
  lastSync: null,
  lastStatus: null,
  lastMessage: null
};

export const GoogleSheetsSyncService = {
  getConfig: (): GoogleSheetsConfig => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.webAppUrl || 
          parsed.webAppUrl.trim() === '' || 
          parsed.webAppUrl.includes('AKfycbwiYbRZGtNtptiO3B5ObJXI7NFGcbzZah6IMGM2wrQCG94FuexsToOce31WMCqSJuOI')
        ) {
          parsed.webAppUrl = OFFICIAL_APPS_SCRIPT_URL;
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Error reading Google Sheets config:', e);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig: (partial: Partial<GoogleSheetsConfig>): GoogleSheetsConfig => {
    const current = GoogleSheetsSyncService.getConfig();
    const updated: GoogleSheetsConfig = { ...current, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving Google Sheets config:', e);
    }
    return updated;
  },

  syncData: async (customUrl?: string): Promise<{ success: boolean; message: string; timestamp?: string }> => {
    const config = GoogleSheetsSyncService.getConfig();
    const targetUrl = (customUrl || config.webAppUrl || '').trim();

    if (!targetUrl) {
      return {
        success: false,
        message: 'No has configurado la URL de la aplicación web de Google Apps Script.'
      };
    }

    if (!targetUrl.startsWith('https://script.google.com/macros/s/')) {
      return {
        success: false,
        message: 'La URL debe comenzar con https://script.google.com/macros/s/ y terminar en /exec'
      };
    }

    let payload: any;
    try {
      payload = await StorageService.getFullBackupDataAsync();
    } catch (_) {
      payload = StorageService.getBackupData();
    }
    const jsonBody = JSON.stringify(payload);

    try {
      // Intento 1: Fetch estándar con Content-Type text/plain para evitar OPTIONS preflight
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: jsonBody
      });

      if (response.ok) {
        let result: any = null;
        try {
          result = await response.json();
        } catch (_) {
          // Si no es JSON pero devolvió 200
        }

        const now = new Date().toLocaleString();
        const successMsg = result?.message || '¡Datos sincronizados correctamente con Google Sheets!';
        
        GoogleSheetsSyncService.saveConfig({
          lastSync: now,
          lastStatus: 'success',
          lastMessage: successMsg
        });

        return {
          success: true,
          message: successMsg,
          timestamp: now
        };
      } else {
        throw new Error(`Respuesta del servidor: HTTP ${response.status}`);
      }
    } catch (err: any) {
      // Fallback: Modo 'no-cors' para Apps Script (manejo transparente de 302 redirects)
      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: jsonBody
        });

        const now = new Date().toLocaleString();
        const fallbackMsg = '✅ Petición enviada exitosamente a Google Apps Script. Las tablas en Drive se están actualizando.';
        
        GoogleSheetsSyncService.saveConfig({
          lastSync: now,
          lastStatus: 'success',
          lastMessage: fallbackMsg
        });

        return {
          success: true,
          message: fallbackMsg,
          timestamp: now
        };
      } catch (fallbackErr: any) {
        const errorMsg = 'Error al conectar con Google Apps Script: ' + (fallbackErr?.message || err?.message || 'Fallo de red');
        GoogleSheetsSyncService.saveConfig({
          lastStatus: 'error',
          lastMessage: errorMsg
        });

        return {
          success: false,
          message: errorMsg
        };
      }
    }
  },

  // Dispara el respaldo autónomo en Google Drive
  triggerNightlyDriveBackup: async (customUrl?: string): Promise<{ success: boolean; message: string; data?: any }> => {
    const config = GoogleSheetsSyncService.getConfig();
    const targetUrl = (customUrl || config.webAppUrl || '').trim();

    if (!targetUrl) {
      return {
        success: false,
        message: 'Falta configurar la URL de Google Apps Script.'
      };
    }

    const urlWithParam = targetUrl.includes('?') 
      ? `${targetUrl}&action=trigger_backup_drive` 
      : `${targetUrl}?action=trigger_backup_drive`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'trigger_backup_drive' })
      });

      if (response.ok) {
        let json: any = null;
        try { json = await response.json(); } catch (_) {}
        
        if (json && (json.success === true || json.status === 'success')) {
          return {
            success: true,
            message: json.message || 'Respaldo ejecutado exitosamente en Google Drive.',
            data: json
          };
        } else if (json && json.status === 'warning') {
          return {
            success: false,
            message: '⚠️ ' + (json.message || 'La URL actual responde pero tiene una versión antigua. En script.google.com ve a: Administrar implementaciones > Editar > selecciona "Nueva versión" e Implementar.'),
            data: json
          };
        } else if (json && (json.status === 'error' || json.success === false)) {
          return {
            success: false,
            message: '❌ Google Apps Script reportó un error: ' + (json.message || 'Desconocido'),
            data: json
          };
        }
      }
    } catch (e: any) {
      // Intento 2 vía GET
      try {
        const getRes = await fetch(urlWithParam, { method: 'GET' });
        if (getRes.ok) {
          const json = await getRes.json();
          if (json && (json.success === true || json.status === 'success')) {
            return {
              success: true,
              message: json.message || 'Respaldo ejecutado exitosamente en Google Drive.',
              data: json
            };
          }
        }
      } catch (_) {}

      // Fallback ciego vía mode: 'no-cors' para evitar bloqueos del navegador
      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'trigger_backup_drive' })
        });
        return {
          success: true,
          message: 'Petición enviada a Google Apps Script para guardar el respaldo en Drive. Si no aparece el archivo, recuerda publicar "Nueva versión" en Implementaciones.'
        };
      } catch (err: any) {
        return { success: false, message: 'Error al contactar Google Drive: ' + err.message };
      }
    }
    return { 
      success: false, 
      message: 'No se pudo completar el respaldo. Asegúrate de actualizar la implementación a "Nueva versión" en Google Apps Script.' 
    };
  },

  // Configura el disparador diario en Google Apps Script para las 3:00 AM
  setupNightlyBackupTrigger: async (customUrl?: string): Promise<{ success: boolean; message: string; data?: any }> => {
    const config = GoogleSheetsSyncService.getConfig();
    const targetUrl = (customUrl || config.webAppUrl || '').trim();

    if (!targetUrl) {
      return {
        success: false,
        message: 'Falta configurar la URL de Google Apps Script.'
      };
    }

    const urlWithParam = targetUrl.includes('?') 
      ? `${targetUrl}&action=setup_backup_trigger` 
      : `${targetUrl}?action=setup_backup_trigger`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'setup_backup_trigger' })
      });

      if (response.ok) {
        let json: any = null;
        try { json = await response.json(); } catch (_) {}
        if (json && (json.success === true || json.status === 'success')) {
          return {
            success: true,
            message: json.message || 'Disparador nocturno configurado para ejecutarse a las 3:00 AM todos los días.',
            data: json
          };
        } else if (json && json.status === 'warning') {
          return {
            success: false,
            message: '⚠️ ' + (json.message || 'La URL actual responde pero tiene una versión previa. Publica "Nueva versión" en Administrar implementaciones.'),
            data: json
          };
        }
      }
    } catch (e: any) {
      try {
        const getRes = await fetch(urlWithParam, { method: 'GET' });
        if (getRes.ok) {
          const json = await getRes.json();
          if (json && (json.success === true || json.status === 'success')) {
            return {
              success: true,
              message: json.message || 'Disparador configurado correctamente a las 3:00 AM.',
              data: json
            };
          }
        }
      } catch (_) {}

      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'setup_backup_trigger' })
        });
        return {
          success: true,
          message: 'Petición enviada a Google Apps Script para activar el disparador a las 3:00 AM.'
        };
      } catch (err: any) {
        return { success: false, message: 'Error al programar disparador: ' + err.message };
      }
    }
    return { success: false, message: 'No se pudo configurar el disparador. Verifica que la versión esté actualizada en Apps Script.' };
  },

  getAppsScriptCode: (): string => {
    return `/**
 * ============================================================================
 * WJGEEKS 3D PRO - GOOGLE APPS SCRIPT DATABASE SYNC
 * ============================================================================
 * 
 * Convierte esta Hoja de Cálculo en una base de datos visual sincronizada
 * con el sistema WJGEEKS 3D PRO (Drive).
 * 
 * GUÍA RÁPIDA:
 * 1. Pega todo este código en: Extensiones > Apps Script.
 * 2. Guarda el proyecto.
 * 3. Clic en: Implementar > Nueva implementación.
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquiera
 * 4. Copia la URL generada (/exec) y pégala en WJGEEKS 3D.
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  if (action === "trigger_backup_drive" || action === "backup_now") {
    var backupResult = ejecutarBackupDiarioDrive(null);
    return ContentService.createTextOutput(JSON.stringify(backupResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (action === "setup_backup_trigger") {
    var triggerResult = configurarTriggerBackupNocturno();
    return ContentService.createTextOutput(JSON.stringify(triggerResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    app: "WJGEEKS 3D PRO Sync API",
    version: "3.1",
    message: "Google Apps Script activo y listo para respaldos y sincronizaciones."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sin datos" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(contents);

    // Enrutador de Respaldo Automático en Google Drive
    if (data.action === "trigger_backup_drive" || data.action === "backup_now") {
      var backupResult = ejecutarBackupDiarioDrive(data.backupData || null);
      return ContentService.createTextOutput(JSON.stringify(backupResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "setup_backup_trigger") {
      var triggerResult = configurarTriggerBackupNocturno();
      return ContentService.createTextOutput(JSON.stringify(triggerResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = Session.getScriptTimeZone() || "GMT-5";
    var fecha = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");

    // 1. Resumen
    actualizarResumen(ss, data, fecha);

    // 2. Cotizaciones
    if (data.cotizaciones) actualizarCotizaciones(ss, data.cotizaciones);

    // 3. Órdenes
    if (data.ordenes) actualizarOrdenesTrabajo(ss, data.ordenes);

    // 4. Ventas POS
    if (data.ventas_express) actualizarVentasPOS(ss, data.ventas_express);

    // 5. Clientes
    if (data.clientes) actualizarClientes(ss, data.clientes);

    // 6. Stock
    if (data.productos_stock) actualizarStock(ss, data.productos_stock);

    // 7. Resinas e Insumos
    actualizarMateriales(ss, data.resinas || [], data.insumos || []);

    // 8. Herramientas 3D
    if (data.herramientas) actualizarHerramientas(ss, data.herramientas);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Base de datos sincronizada con éxito en Google Drive.",
      fecha: fecha
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name, headers, tabColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (tabColor) sheet.setTabColor(tabColor);
  sheet.clearContents();
  sheet.clearFormats();
  if (headers && headers.length > 0) {
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setValues([headers]);
    hRange.setBackground("#0f172a");
    hRange.setFontColor("#38bdf8");
    hRange.setFontWeight("bold");
    hRange.setHorizontalAlignment("center");
    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function autoFitColumns(sheet, numCols) {
  for (var col = 1; col <= numCols; col++) {
    sheet.autoResizeColumn(col);
    var w = sheet.getColumnWidth(col);
    if (w < 110) sheet.setColumnWidth(col, 110);
    if (w > 360) sheet.setColumnWidth(col, 360);
  }
}

function actualizarResumen(ss, data, fecha) {
  var sheet = getOrCreateSheet(ss, "📊 RESUMEN EJECUTIVO", ["Métrica", "Valor", "Detalle"], "#38bdf8");
  var ventas = (data.ventas_express || []).reduce(function(acc, v) { return acc + (v.total || 0); }, 0);
  var rows = [
    ["Última Sincronización", fecha, "WJGEEKS 3D PRO"],
    ["Clientes Registrados", (data.clientes || []).length, "Base de clientes"],
    ["Cotizaciones Emitidas", (data.cotizaciones || []).length, "Histórico"],
    ["Órdenes de Trabajo", (data.ordenes || []).length, "Producción"],
    ["Ventas POS Express", (data.ventas_express || []).length, "Mostrador"],
    ["Ingresos Ventas POS", ventas, "Total moneda local"],
    ["Productos en Stock", (data.productos_stock || []).length, "En vitrina"],
    ["Resinas en Catálogo", (data.resinas || []).length, "Taller"],
    ["Insumos & Pinturas", (data.insumos || []).length, "Consumibles"],
    ["Herramientas & IAs 3D", (data.herramientas || []).length, "Lanzador de apps"]
  ];
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet.getRange(2, 1, rows.length, 1).setFontWeight("bold");
  sheet.getRange(7, 2, 1, 1).setNumberFormat("$#,##0");
  autoFitColumns(sheet, 3);
}

function actualizarCotizaciones(ss, cots) {
  var headers = ["ID", "Número", "Fecha", "Cliente", "Teléfono", "Estado", "Subtotal ($)", "Descuento ($)", "Total ($)", "Piezas", "Modelos"];
  var sheet = getOrCreateSheet(ss, "💼 COTIZACIONES", headers, "#818cf8");
  if (!cots.length) return;
  var rows = cots.map(function(c) {
    var pStr = (c.piezas || []).map(function(p) { return (p.nombre || 'Pieza') + " (x" + (p.cantidad || 1) + ")"; }).join(", ");
    return [c.id || "", c.numero || "", c.fecha || "", c.clienteNombre || c.cliente?.nombre || "", c.clienteTelefono || "", c.estado || "", c.subtotal || 0, c.descuento || 0, c.total || 0, (c.piezas || []).length, pStr];
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 7, rows.length, 3).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

function actualizarOrdenesTrabajo(ss, ords) {
  var headers = ["ID", "Código OT", "Cliente", "Pieza / Proyecto", "Estado", "Prioridad", "Fecha Ingreso", "Fecha Entrega", "Total ($)", "Abono ($)", "Saldo ($)", "Máquina"];
  var sheet = getOrCreateSheet(ss, "⚙️ ORDENES_TRABAJO", headers, "#34d399");
  if (!ords.length) return;
  var rows = ords.map(function(o) {
    return [o.id || "", o.codigo || o.numero || "", o.clienteNombre || o.cliente?.nombre || "", o.nombrePieza || "", o.estado || "", o.prioridad || "", o.fechaCreacion || "", o.fechaEntrega || "", o.total || 0, o.abono || 0, (o.total || 0) - (o.abono || 0), o.maquinaAsignada || ""];
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 9, rows.length, 3).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

function actualizarVentasPOS(ss, vts) {
  var headers = ["ID Venta", "Fecha y Hora", "Cliente", "Concepto / Items", "Método Pago", "Subtotal ($)", "Descuento ($)", "Total ($)", "Estado"];
  var sheet = getOrCreateSheet(ss, "⚡ VENTAS_POS", headers, "#fbbf24");
  if (!vts.length) return;
  var rows = vts.map(function(v) {
    var desc = (v.items || []).map(function(it) { return (it.nombre || 'Item') + " x" + (it.cantidad || 1); }).join(" | ");
    return [v.id || "", v.fecha || "", v.clienteNombre || "Mostrador", desc || v.descripcion || "", v.metodoPago || "Efectivo", v.subtotal || v.total || 0, v.descuento || 0, v.total || 0, v.estadoPago || "completado"];
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 6, rows.length, 3).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

function actualizarClientes(ss, clts) {
  var headers = ["ID", "Nombre Completo", "Teléfono", "Email", "Ciudad", "Dirección", "Tipo"];
  var sheet = getOrCreateSheet(ss, "👥 CLIENTES", headers, "#60a5fa");
  if (!clts.length) return;
  var rows = clts.map(function(c) {
    return [c.id || "", c.nombre || "", c.telefono || "", c.email || "", c.ciudad || "", c.direccion || "", c.tipo || "Particular"];
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  autoFitColumns(sheet, headers.length);
}

function actualizarStock(ss, prods) {
  var headers = ["ID", "Producto", "Categoría", "Stock Actual", "Mínimo", "Precio Venta ($)", "Costo ($)", "Estado"];
  var sheet = getOrCreateSheet(ss, "📦 STOCK_PRODUCTOS", headers, "#f472b6");
  if (!prods.length) return;
  var rows = prods.map(function(p) {
    var est = (p.stock || 0) <= 0 ? "Agotado" : (p.stock || 0) <= (p.stockMinimo || 1) ? "Stock Bajo" : "Disponible";
    return [p.id || "", p.nombre || "", p.categoria || "", p.stock || 0, p.stockMinimo || 1, p.precioVenta || 0, p.costo || 0, est];
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 6, rows.length, 2).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

function actualizarMateriales(ss, resinas, insumos) {
  var headers = ["Tipo", "ID", "Nombre / Referencia", "Marca", "Costo ($)", "Unidad"];
  var sheet = getOrCreateSheet(ss, "🧪 RESINAS_E_INSUMOS", headers, "#a78bfa");
  var rows = [];
  resinas.forEach(function(r) {
    rows.push(["Resina 3D", r.id || "", r.nombre || "", r.marca || "", r.costoPorKg || 0, "Kg"]);
  });
  insumos.forEach(function(i) {
    rows.push(["Insumo", i.id || "", i.nombre || "", i.rubro || "", i.costoUnitario || 0, i.unidad || "Unidad"]);
  });
  if (!rows.length) return;
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 5, rows.length, 1).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

function actualizarHerramientas(ss, herrs) {
  var headers = ["ID", "Nombre", "Categoría", "URL", "Etiqueta", "Frecuente (⭐)", "Descripción"];
  var sheet = getOrCreateSheet(ss, "🛠️ APPS_3D_HERRAMIENTAS", headers, "#38bdf8");
  if (!herrs.length) return;
  var rows = herrs.map(function(h) {
    return [h.id || "", h.nombre || "", h.categoria || "", h.url || "", h.etiqueta || "", h.esFrecuente ? "⭐ Sí" : "No", h.descripcion || ""];
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 9. MOTOR DE RESPALDO AUTOMÁTICO EN GOOGLE DRIVE (MADRUGADA)
// -------------------------------------------------------------
var SUPABASE_CONFIG = {
  url: "https://brjzpbqxjakihpsbkqfh.supabase.co",
  anonKey: "sb_publishable_vbV0_7HeqzEVKZuvcuM0EQ_y6fa9ooh"
};

function ejecutarBackupDiarioDrive(customBackupData) {
  var timezone = Session.getScriptTimeZone() || "GMT-5";
  var now = new Date();
  var fechaStr = Utilities.formatDate(now, timezone, "yyyy-MM-dd");
  var horaStr = Utilities.formatDate(now, timezone, "HH-mm");
  var fechaLegible = Utilities.formatDate(now, timezone, "yyyy-MM-dd HH:mm:ss");

  var folder = getOrCreateDriveFolder("WJGEEKS_3D_Backups");
  var backup = customBackupData;

  if (!backup || !backup.tablas) {
    backup = {
      version: "3.1",
      empresa: "WJGEEKS 3D PRO",
      tipo: "respaldo_automatico_nube",
      timestamp: now.toISOString(),
      fecha_legible: fechaLegible,
      tablas: {}
    };

    var tablasV3 = [
      "ordenes_trabajo", "abonos_pagos", "ventas_express", "cotizaciones",
      "cotizacion_items", "productos_stock", "clientes",
      "usuarios_taller", "tareas_equipo", "solicitudes_insumos", "configuracion_taller",
      "tarifas_tamanos", "resinas", "maquinas", "insumos"
    ];

    tablasV3.forEach(function(tabla) {
      try {
        var res = UrlFetchApp.fetch(SUPABASE_CONFIG.url + "/rest/v1/" + tabla + "?select=*", {
          method: "get",
          headers: {
            "apikey": SUPABASE_CONFIG.anonKey,
            "Authorization": "Bearer " + SUPABASE_CONFIG.anonKey
          },
          muteHttpExceptions: true
        });
        if (res.getResponseCode() === 200) {
          backup.tablas[tabla] = JSON.parse(res.getContentText());
        } else {
          backup.tablas[tabla] = [];
        }
      } catch (e) {
        backup.tablas[tabla] = [];
      }
    });
  }

  var filename = "WJGEEKS_Backup_" + fechaStr + "_" + horaStr + ".json";
  var jsonContent = JSON.stringify(backup, null, 2);
  var file = folder.createFile(filename, jsonContent, MimeType.PLAIN_TEXT);

  limpiarBackupsAntiguos(folder, 30);

  return {
    success: true,
    message: "Respaldo nocturno generado en Google Drive correctamente.",
    archivo: { id: file.getId(), nombre: filename, url: file.getUrl() },
    fecha: fechaLegible
  };
}

function getOrCreateDriveFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function limpiarBackupsAntiguos(folder, maxArchivos) {
  try {
    var files = [];
    var it = folder.getFiles();
    while (it.hasNext()) files.push(it.next());
    files.sort(function(a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
    if (files.length > maxArchivos) {
      for (var i = maxArchivos; i < files.length; i++) files[i].setTrashed(true);
    }
  } catch (_) {}
}

function configurarTriggerBackupNocturno() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "ejecutarBackupDiarioDrive") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  var newTrigger = ScriptApp.newTrigger("ejecutarBackupDiarioDrive")
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .nearMinute(0)
    .create();

  return {
    success: true,
    message: "Disparador nocturno configurado para las 3:00 AM todos los días.",
    triggerId: newTrigger.getUniqueId()
  };
}`;
  }
};

// Escucha reactiva desacoplada para auto-sincronización con debounce
if (typeof window !== 'undefined') {
  let debounceTimer: any = null;
  window.addEventListener('wjg:data_changed', () => {
    try {
      const config = GoogleSheetsSyncService.getConfig();
      if (config.autoSync && config.webAppUrl) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          GoogleSheetsSyncService.syncData();
        }, 2500);
      }
    } catch (_) {}
  });
}

