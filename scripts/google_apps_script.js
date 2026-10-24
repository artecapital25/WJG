/**
 * ============================================================================
 * WJGEEKS 3D PRO - GOOGLE APPS SCRIPT DATABASE SYNC & EMAIL DISPATCHER
 * ============================================================================
 * 
 * Este script cumple una doble función esencial para WJGEEKS 3D:
 * 1. Envío de Correos Transaccionales Automáticos desde wjgeeks3d@gmail.com
 *    (Cotizaciones, Abonos, Notificaciones de Pieza Terminada y Alertas).
 * 2. Sincronización en tiempo real de la base de datos con Google Sheets.
 * 
 * INSTRUCCIONES DE ACTUALIZACIÓN / INSTALACIÓN:
 * 1. Ve a https://script.google.com y abre el proyecto de WJGEEKS 3D.
 * 2. Borra el código anterior y pega TODO este archivo.
 * 3. Haz clic en "Guardar" (icono de disquete).
 * 4. Para autorizar el envío de correos por primera vez:
 *    - En el menú superior de funciones, selecciona "testEnviarCorreoPrueba".
 *    - Haz clic en "Ejecutar" (Run).
 *    - Google te pedirá "Revisar permisos" > Selecciona wjgeeks3d@gmail.com >
 *      Opciones avanzadas > "Ir a WJGEEKS Sync (no seguro)" > Permitir.
 *    - ¡Eso enviará de inmediato el correo de prueba a german.951026@gmail.com!
 * 5. Haz clic en "Implementar" (botón azul arriba a la derecha) > "Administrar implementaciones".
 *    - Haz clic en el icono del lápiz (Editar).
 *    - En "Versión", selecciona "Nueva versión".
 *    - Haz clic en "Implementar".
 * ============================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    app: "WJGEEKS 3D PRO Sync & Mail API",
    version: "3.0",
    message: "Google Apps Script activo y listo para despachar correos y sincronizaciones.",
    emailSender: "wjgeeks3d@gmail.com",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No se recibieron datos en el cuerpo de la petición."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(contents);

    // =========================================================
    // ENRUTADOR 1: DESPACHO DE CORREO TRANSACCIONAL
    // =========================================================
    if (data.action === "send_email" || data.destinatario_correo || data.tipo === "correo" || data.tipo === "prueba") {
      var emailResult = enviarCorreoTransaccionalGAS(data);
      return ContentService.createTextOutput(JSON.stringify(emailResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================
    // ENRUTADOR 2: SINCRONIZACIÓN DE GOOGLE SHEETS
    // =========================================================
    var ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (eSs) {
      ss = null;
    }

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "warning",
        message: "Petición procesada, pero no hay una hoja de cálculo vinculada a este script para sincronización de tablas.",
        recibido: Object.keys(data)
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var timezone = Session.getScriptTimeZone() || "GMT-5";
    var fechaActual = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd HH:mm:ss");

    // 1. TABLA RESUMEN GENERAL
    actualizarResumen(ss, data, fechaActual);

    // 2. TABLA DE COTIZACIONES
    if (data.cotizaciones && Array.isArray(data.cotizaciones)) {
      actualizarCotizaciones(ss, data.cotizaciones);
    }

    // 3. TABLA DE ÓRDENES DE TRABAJO
    if (data.ordenes && Array.isArray(data.ordenes)) {
      actualizarOrdenesTrabajo(ss, data.ordenes);
    }

    // 4. TABLA DE VENTAS POS EXPRESS
    if (data.ventas_express && Array.isArray(data.ventas_express)) {
      actualizarVentasPOS(ss, data.ventas_express);
    }

    // 5. TABLA DE CLIENTES
    if (data.clientes && Array.isArray(data.clientes)) {
      actualizarClientes(ss, data.clientes);
    }

    // 6. TABLA DE PRODUCTOS EN STOCK
    if (data.productos_stock && Array.isArray(data.productos_stock)) {
      actualizarProductosStock(ss, data.productos_stock);
    }

    // 7. TABLA DE RESINAS E INSUMOS
    actualizarMaterialesEInsumos(ss, data.resinas || [], data.insumos || []);

    // 8. TABLA DE HERRAMIENTAS & APPS 3D
    if (data.herramientas && Array.isArray(data.herramientas)) {
      actualizarHerramientas(ss, data.herramientas);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Base de datos sincronizada exitosamente con Google Sheets.",
      fechaSincronizacion: fechaActual,
      tablasActualizadas: 8
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================================
// FUNCIÓN CENTRAL: MOTOR DE CORREO TRANSACCIONAL WJGEEKS 3D
// =============================================================
function enviarCorreoTransaccionalGAS(data) {
  var destinatario = data.destinatario_correo || data.to || "";
  destinatario = destinatario.replace(/\.,com$/i, ".com").replace(/,\s*com$/i, ".com").trim();

  if (!destinatario || destinatario.indexOf("@") === -1) {
    return {
      status: "error",
      message: "Correo destinatario inválido: " + destinatario
    };
  }

  var nombre = data.destinatario_nombre || "Cliente WJGEEKS";
  var tipo = (data.tipo || "notificacion").toLowerCase();
  var asunto = data.asunto || ("WJGEEKS 3D PRO - Notificación Oficial (" + tipo.toUpperCase() + ")");
  var trackingUrl = data.tracking_url || "https://wjg-lyart.vercel.app/";
  var datos = data.datos || {};

  var numeroDoc = datos.numero_doc || "DOC-001";
  var total = typeof datos.total === "number" ? "$" + datos.total.toLocaleString("es-CO") + " COP" : "";
  var abono = typeof datos.abono === "number" ? "$" + datos.abono.toLocaleString("es-CO") + " COP" : "";
  var saldo = typeof datos.saldo_pendiente === "number" ? "$" + datos.saldo_pendiente.toLocaleString("es-CO") + " COP" : "";
  var metodoPago = datos.metodo_pago || "Bre-B / Nequi";
  var itemNombre = datos.item_nombre || "Prototipo / Pieza Impresión 3D";

  // Generación de Plantilla HTML Responsiva de Alto Impacto
  var htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${asunto}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
              
              <!-- HEADER CON GRADIENTE CYBERPUNK -->
              <tr>
                <td style="padding: 28px 24px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0369a1 100%); border-bottom: 2px solid #38bdf8;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase;">
                    WJGEEKS <span style="color: #a855f7;">3D PRO</span>
                  </h1>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase;">
                    Taller de Impresión 3D, Resina 8K & Prototipado Avanzado
                  </p>
                </td>
              </tr>

              <!-- CONTENIDO PRINCIPAL -->
              <tr>
                <td style="padding: 32px 28px;">
                  <div style="display: inline-block; padding: 4px 12px; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; border-radius: 20px; font-size: 11px; font-weight: bold; color: #38bdf8; text-transform: uppercase; margin-bottom: 16px;">
                    ${tipo === 'prueba' ? '⚡ PRUEBA DE CONEXIÓN' : (tipo === 'cotizacion' ? '💼 COTIZACIÓN FORMAL' : (tipo === 'abono' ? '💳 COMPROBANTE DE PAGO' : '🎉 PIEZA FINALIZADA'))}
                  </div>

                  <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff;">
                    Hola, <span style="color: #38bdf8;">${nombre}</span> 👋
                  </h2>

                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                    ${tipo === 'prueba' 
                      ? 'Este es un correo de prueba enviado automáticamente a través del canal oficial de mensajería de <strong>WJGEEKS 3D PRO</strong> desde <code>wjgeeks3d@gmail.com</code>.' 
                      : (tipo === 'cotizacion' 
                        ? 'Adjuntamos los detalles de tu cotización formal. Tu proyecto ha sido calculado con los parámetros óptimos de precisión y resistencia.' 
                        : (tipo === 'abono'
                          ? 'Hemos recibido y validado tu abono satisfactoriamente en el libro mayor contable.'
                          : '¡Grandes noticias! Tu modelo 3D ha completado con éxito la impresión, lavado y post-curado UV.'))}
                  </p>

                  <!-- TARJETA DE DETALLES DEL DOCUMENTO -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
                    <tr>
                      <td style="padding: 16px; border-bottom: 1px solid #1e293b;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Referencia / Documento</span>
                        <span style="font-size: 16px; font-weight: bold; color: #f8fafc;">${numeroDoc}</span>
                      </td>
                    </tr>
                    ${itemNombre ? `
                    <tr>
                      <td style="padding: 16px; border-bottom: 1px solid #1e293b;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Ítem / Proyecto</span>
                        <span style="font-size: 14px; color: #e2e8f0;">${itemNombre}</span>
                      </td>
                    </tr>` : ''}
                    ${total ? `
                    <tr>
                      <td style="padding: 16px; border-bottom: 1px solid #1e293b;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Valor Total</span>
                        <span style="font-size: 18px; font-weight: 800; color: #38bdf8;">${total}</span>
                      </td>
                    </tr>` : ''}
                    ${abono ? `
                    <tr>
                      <td style="padding: 16px; border-bottom: 1px solid #1e293b;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Abonado / Pagado (${metodoPago})</span>
                        <span style="font-size: 16px; font-weight: bold; color: #4ade80;">${abono}</span>
                      </td>
                    </tr>` : ''}
                    ${saldo ? `
                    <tr>
                      <td style="padding: 16px;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Saldo Remanente</span>
                        <span style="font-size: 16px; font-weight: bold; color: #f87171;">${saldo}</span>
                      </td>
                    </tr>` : ''}
                  </table>

                  <!-- BOTÓN DE ACCIÓN / SEGUIMIENTO -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${trackingUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); text-transform: uppercase; letter-spacing: 1px;">
                      👉 Acceder a WJGEEKS 3D en Vivo
                    </a>
                  </div>

                  <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                    Si tienes dudas sobre este mensaje, puedes responder directamente a este correo o contactar a nuestra línea oficial de atención.
                  </p>
                </td>
              </tr>

              <!-- FOOTER CORPORATIVO -->
              <tr>
                <td style="padding: 24px; background-color: #0b0f19; border-top: 1px solid #1f2937; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #94a3b8;">
                    WJGEEKS 3D - Taller y Producción
                  </p>
                  <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">
                    📱 WhatsApp Oficial: <a href="https://wa.me/573202796115" style="color: #38bdf8; text-decoration: none;">+57 320 2796115</a> | 📷 Instagram: <a href="https://instagram.com/WJGEEKS3D" style="color: #a855f7; text-decoration: none;">@WJGEEKS3D</a><br>
                    ✉️ Correo: <a href="mailto:wjgeeks3d@gmail.com" style="color: #94a3b8; text-decoration: none;">wjgeeks3d@gmail.com</a> | 🇨🇴 Bogotá, Colombia
                  </p>
                  <p style="margin: 0; font-size: 10px; color: #475569;">
                    © ${new Date().getFullYear()} WJGEEKS 3D. Sistema de Producción & Taller.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Despacho del Correo mediante MailApp nativo de Google Workspace / Gmail
  MailApp.sendEmail({
    to: destinatario,
    subject: asunto,
    htmlBody: htmlBody,
    name: "WJGEEKS 3D - Taller & Prototipado"
  });

  return {
    status: "success",
    action: "send_email",
    destinatario: destinatario,
    asunto: asunto,
    message: "Correo enviado exitosamente vía Gmail desde wjgeeks3d@gmail.com",
    timestamp: new Date().toISOString()
  };
}

// =============================================================
// FUNCIÓN DE PRUEBA RÁPIDA DESDE EL EDITOR DE GOOGLE APPS SCRIPT
// =============================================================
function testEnviarCorreoPrueba() {
  var resultado = enviarCorreoTransaccionalGAS({
    action: "send_email",
    destinatario_correo: "german.951026@gmail.com",
    destinatario_nombre: "Germán",
    asunto: "🚀 Prueba de Mensajería Transaccional - WJGEEKS 3D PRO",
    tipo: "prueba",
    datos: {
      numero_doc: "TEST-001",
      item_nombre: "Figura Articulada Dragón Mech 3D (Resina 8K)",
      total: 85000,
      abono: 45000,
      saldo_pendiente: 40000,
      metodo_pago: "Bre-B (0090778625)"
    }
  });

  Logger.log("Resultado del envío de prueba: " + JSON.stringify(resultado));
  return resultado;
}

// -------------------------------------------------------------
// UTILIDAD: OBTENER O CREAR HOJA CON ENCABEZADOS ESTILIZADOS
// -------------------------------------------------------------
function getOrCreateSheet(ss, name, headers, tabColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (tabColor) {
    sheet.setTabColor(tabColor);
  }
  sheet.clearContents();
  sheet.clearFormats();

  if (headers && headers.length > 0) {
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground("#0f172a");
    headerRange.setFontColor("#38bdf8");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function autoFitColumns(sheet, numCols) {
  for (var col = 1; col <= numCols; col++) {
    sheet.autoResizeColumn(col);
    var width = sheet.getColumnWidth(col);
    if (width < 110) sheet.setColumnWidth(col, 110);
    if (width > 360) sheet.setColumnWidth(col, 360);
  }
}

// -------------------------------------------------------------
// 1. RESUMEN EJECUTIVO
// -------------------------------------------------------------
function actualizarResumen(ss, data, fechaActual) {
  var headers = ["Métrica / Indicador", "Valor Registrado", "Detalle / Observación"];
  var sheet = getOrCreateSheet(ss, "📊 RESUMEN EJECUTIVO", headers, "#38bdf8");

  var totalVentas = (data.ventas_express || []).reduce(function(acc, v) { return acc + (v.total || 0); }, 0);
  var totalCotizaciones = (data.cotizaciones || []).length;
  var totalOTs = (data.ordenes || []).length;
  var otsActivas = (data.ordenes || []).filter(function(o) { return o.estado !== 'entregado' && o.estado !== 'cancelado'; }).length;
  var totalClientes = (data.clientes || []).length;
  var totalStock = (data.productos_stock || []).length;
  var totalHerramientas = (data.herramientas || []).length;

  var rows = [
    ["Última Sincronización", fechaActual, "Actualizado desde WJGEEKS 3D PRO"],
    ["Total Clientes Registrados", totalClientes, "Cartera de clientes del taller"],
    ["Total Cotizaciones Emitidas", totalCotizaciones, "Histórico de cotizaciones creadas"],
    ["Órdenes de Trabajo Activas", otsActivas, "En impresión, lavado, curado o entrega"],
    ["Total Órdenes Históricas", totalOTs, "Total de OTs gestionadas"],
    ["Ventas POS Express Registradas", (data.ventas_express || []).length, "Transacciones rápidas de mostrador"],
    ["Total Ingresos POS Express", totalVentas, "Suma monetaria de ventas rápidas"],
    ["Productos en Stock", totalStock, "Modelos físicos disponibles en vitrina"],
    ["Resinas en Catálogo", (data.resinas || []).length, "Fórmulas y resinas cargadas"],
    ["Insumos de Post-procesado", (data.insumos || []).length, "Alcohol, primers, pinturas, imanes"],
    ["Apps 3D & Herramientas", totalHerramientas, "Lanzador de utilidades del taller"]
  ];

  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet.getRange(2, 1, rows.length, 1).setFontWeight("bold");
  sheet.getRange(8, 2, 1, 1).setNumberFormat("$#,##0");
  autoFitColumns(sheet, 3);
}

// -------------------------------------------------------------
// 2. COTIZACIONES
// -------------------------------------------------------------
function actualizarCotizaciones(ss, cotizaciones) {
  var headers = [
    "ID Cotización", "Número", "Fecha", "Cliente", "Teléfono", 
    "Estado", "Subtotal ($)", "Descuento ($)", "Total Final ($)", 
    "Cant. Piezas", "Piezas / Modelos", "Notas"
  ];
  var sheet = getOrCreateSheet(ss, "💼 COTIZACIONES", headers, "#818cf8");

  if (cotizaciones.length === 0) return;

  var rows = cotizaciones.map(function(c) {
    var piezasNombres = (c.piezas || []).map(function(p) { return (p.nombre || 'Pieza') + " (x" + (p.cantidad || 1) + ")"; }).join(", ");
    return [
      c.id || "",
      c.numero || "",
      c.fecha || "",
      c.clienteNombre || c.cliente?.nombre || "Consumidor Final",
      c.clienteTelefono || c.cliente?.telefono || "",
      c.estado || "borrador",
      c.subtotal || 0,
      c.descuento || 0,
      c.total || 0,
      (c.piezas || []).length,
      piezasNombres,
      c.notas || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 7, rows.length, 3).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 3. ÓRDENES DE TRABAJO (OT)
// -------------------------------------------------------------
function actualizarOrdenesTrabajo(ss, ordenes) {
  var headers = [
    "ID OT", "Número OT", "Cliente", "Teléfono", "Pieza / Proyecto", 
    "Estado Producción", "Estado Pago", "Abono ($)", "Saldo Pendiente ($)", 
    "Total Cobrado ($)", "Impresora", "Resina", "Prioridad", "Fecha Compromiso"
  ];
  var sheet = getOrCreateSheet(ss, "🏭 ORDENES_TRABAJO", headers, "#34d399");

  if (ordenes.length === 0) return;

  var rows = ordenes.map(function(o) {
    return [
      o.id || "",
      o.numero_ot || "",
      o.cliente_nombre || "",
      o.cliente_telefono || "",
      o.item_nombre || "",
      o.estado || "pendiente",
      o.estado_pago || "pendiente",
      o.abono || 0,
      o.saldo_pendiente || 0,
      o.precio_cobrado || 0,
      o.impresora_asignada || "General",
      o.resina_usada || "Estándar",
      o.prioridad || "normal",
      o.fecha_compromiso || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 8, rows.length, 3).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 4. VENTAS POS EXPRESS
// -------------------------------------------------------------
function actualizarVentasPOS(ss, ventas) {
  var headers = [
    "ID Venta", "Fecha", "Cliente", "Teléfono", "Total Venta ($)", 
    "Método Pago", "Cant. Productos", "Productos Vendidos", "Vendedor"
  ];
  var sheet = getOrCreateSheet(ss, "⚡ VENTAS_POS_EXPRESS", headers, "#f59e0b");

  if (ventas.length === 0) return;

  var rows = ventas.map(function(v) {
    var itemsSummary = (v.items || []).map(function(i) { return (i.nombre || i.nombre_item) + " (x" + i.cantidad + ")"; }).join(", ");
    return [
      v.id || "",
      v.fecha || "",
      v.cliente_nombre || "Cliente Mostrador",
      v.cliente_telefono || "",
      v.total || 0,
      v.metodo_pago || "Efectivo",
      (v.items || []).length,
      itemsSummary,
      v.vendedor_nombre || "Taller WJ"
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 5, rows.length, 1).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 5. CLIENTES
// -------------------------------------------------------------
function actualizarClientes(ss, clientes) {
  var headers = ["Nombre", "Teléfono", "Correo", "Dirección / Ciudad", "Notas"];
  var sheet = getOrCreateSheet(ss, "👥 CLIENTES", headers, "#a78bfa");

  if (clientes.length === 0) return;

  var rows = clientes.map(function(c) {
    return [
      c.nombre || "",
      c.telefono || "",
      c.correo || "",
      c.direccion || "",
      c.notas || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 6. PRODUCTOS EN STOCK
// -------------------------------------------------------------
function actualizarProductosStock(ss, stock) {
  var headers = [
    "ID", "Nombre del Producto", "Categoría", "Stock Actual", 
    "Precio Venta ($)", "Precio Costo ($)", "Ubicación", "Estado"
  ];
  var sheet = getOrCreateSheet(ss, "📦 STOCK_INVENTARIO", headers, "#38bdf8");

  if (stock.length === 0) return;

  var rows = stock.map(function(p) {
    return [
      p.id || "",
      p.nombre || "",
      p.categoria || "general",
      p.stock !== undefined ? p.stock : 0,
      p.precio_venta || 0,
      p.precio_costo || 0,
      p.ubicacion || "Vitrina Principal",
      (p.stock || 0) > 0 ? "Disponible" : "Agotado"
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 5, rows.length, 2).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 7. RESINAS E INSUMOS
// -------------------------------------------------------------
function actualizarMaterialesEInsumos(ss, resinas, insumos) {
  var headers = [
    "Tipo", "Nombre", "Marca / Color", "Cantidad / Capacidad", 
    "Precio Compra ($)", "Unidad", "Costo x Gramo / Unidad ($)"
  ];
  var sheet = getOrCreateSheet(ss, "🧪 RESINAS_E_INSUMOS", headers, "#ec4899");

  var rows = [];

  (resinas || []).forEach(function(r) {
    rows.push([
      "Resina 3D",
      r.nombre || "",
      r.color || "Gris",
      (r.peso_kg || 1) + " kg (" + (r.gramos_totales || 1000) + "g)",
      r.costo_total || 0,
      "Gramos",
      r.costo_por_gramo || 0
    ]);
  });

  (insumos || []).forEach(function(i) {
    rows.push([
      "Insumo Taller",
      i.nombre || "",
      i.categoria || "Acabado",
      i.unidades_por_paquete || 1,
      i.costo_paquete || 0,
      i.unidad_medida || "unidad",
      i.costo_unitario || 0
    ]);
  });

  if (rows.length === 0) return;

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 5, rows.length, 1).setNumberFormat("$#,##0");
  sheet.getRange(2, 7, rows.length, 1).setNumberFormat("$#,##0.00");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 8. HERRAMIENTAS & APPS 3D
// -------------------------------------------------------------
function actualizarHerramientas(ss, herramientas) {
  var headers = [
    "ID", "Nombre de la Aplicación", "Categoría", "URL / Enlace Web", 
    "Etiqueta", "Uso Frecuente (⭐)", "Descripción / Propósito"
  ];
  var sheet = getOrCreateSheet(ss, "🛠️ APPS_3D_HERRAMIENTAS", headers, "#38bdf8");

  if (herramientas.length === 0) return;

  var rows = herramientas.map(function(h) {
    return [
      h.id || "",
      h.nombre || "",
      h.categoria || "ia_3d",
      h.url || "",
      h.etiqueta || "",
      h.esFrecuente ? "⭐ Sí (Frecuente)" : "No",
      h.descripcion || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  autoFitColumns(sheet, headers.length);
}
