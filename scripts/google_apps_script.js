/**
 * ============================================================================
 * WJGEEKS 3D PRO - GOOGLE APPS SCRIPT DATABASE SYNC
 * ============================================================================
 * 
 * Este script convierte tu Google Spreadsheet en una base de datos visual
 * sincronizada en tiempo real con la aplicación WJGEEKS 3D PRO.
 * 
 * INSTRUCCIONES DE INSTALACIÓN (3 PASOS):
 * 1. En Google Drive, crea una Hoja de Cálculo nueva llamada "WJGEEKS 3D - Base de Datos".
 * 2. En el menú superior de la hoja, ve a: Extensiones > Apps Script.
 * 3. Borra todo el código que aparezca y pega TODO este archivo.
 * 4. Haz clic en "Guardar" (icono de disquete).
 * 5. Haz clic en "Implementar" (botón azul arriba a la derecha) > "Nueva implementación".
 *    - Tipo: Aplicación web
 *    - Descripción: WJGEEKS Sync API
 *    - Ejecutar como: Yo (tu correo de Google)
 *    - Quién tiene acceso: Cualquiera (Anyone)
 * 6. Copia la "URL de la aplicación web" generada (termina en /exec) y pégala
 *    en la ventana de Google Sheets de WJGEEKS 3D.
 * ============================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    app: "WJGEEKS 3D PRO Sync API",
    version: "2.0",
    message: "Google Apps Script activo y listo para recibir sincronizaciones.",
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
// 3. ÓRDENES DE TRABAJO (OTs)
// -------------------------------------------------------------
function actualizarOrdenesTrabajo(ss, ordenes) {
  var headers = [
    "ID OT", "Código OT", "Cliente", "Pieza / Proyecto", "Estado Taller", 
    "Prioridad", "Fecha Ingreso", "Fecha Entrega", "Total ($)", "Abono ($)", 
    "Saldo Pendiente ($)", "Máquina", "Notas Técnicas"
  ];
  var sheet = getOrCreateSheet(ss, "⚙️ ORDENES_TRABAJO", headers, "#34d399");

  if (ordenes.length === 0) return;

  var rows = ordenes.map(function(o) {
    return [
      o.id || "",
      o.codigo || o.numero || "",
      o.clienteNombre || o.cliente?.nombre || "",
      o.nombrePieza || o.descripcion || "",
      o.estado || "pendiente",
      o.prioridad || "normal",
      o.fechaCreacion || o.fecha || "",
      o.fechaEntrega || "",
      o.total || 0,
      o.abono || 0,
      (o.total || 0) - (o.abono || 0),
      o.maquinaAsignada || o.maquina || "No asignada",
      o.notas || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 9, rows.length, 3).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 4. VENTAS POS EXPRESS
// -------------------------------------------------------------
function actualizarVentasPOS(ss, ventas) {
  var headers = [
    "ID Venta", "Fecha y Hora", "Cliente", "Detalle de Productos", 
    "Método de Pago", "Subtotal ($)", "Descuento ($)", "Total Pagado ($)", 
    "Estado Pago", "Referencia / Notas"
  ];
  var sheet = getOrCreateSheet(ss, "⚡ VENTAS_POS", headers, "#fbbf24");

  if (ventas.length === 0) return;

  var rows = ventas.map(function(v) {
    var itemsDesc = (v.items || []).map(function(it) { 
      return (it.nombre || 'Item') + " x" + (it.cantidad || 1) + " ($" + (it.precioUnitario || 0) + ")"; 
    }).join(" | ");

    return [
      v.id || "",
      v.fecha || "",
      v.clienteNombre || "Cliente Mostrador",
      itemsDesc || v.descripcion || "Venta de mostrador",
      v.metodoPago || "Efectivo",
      v.subtotal || v.total || 0,
      v.descuento || 0,
      v.total || 0,
      v.estadoPago || "completado",
      v.notas || v.referencia || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 6, rows.length, 3).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 5. CLIENTES
// -------------------------------------------------------------
function actualizarClientes(ss, clientes) {
  var headers = [
    "ID Cliente", "Nombre Completo", "Teléfono / WhatsApp", 
    "Email", "Ciudad", "Dirección", "Tipo Cliente", "Notas"
  ];
  var sheet = getOrCreateSheet(ss, "👥 CLIENTES", headers, "#60a5fa");

  if (clientes.length === 0) return;

  var rows = clientes.map(function(c) {
    return [
      c.id || "",
      c.nombre || "",
      c.telefono || "",
      c.email || "",
      c.ciudad || "",
      c.direccion || "",
      c.tipo || "Particular",
      c.notas || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 6. PRODUCTOS EN STOCK
// -------------------------------------------------------------
function actualizarProductosStock(ss, productos) {
  var headers = [
    "ID", "Nombre de Figura / Producto", "Categoría", "Stock Actual", 
    "Stock Mínimo", "Precio Venta ($)", "Costo Estimado ($)", "Dimensiones", "Estado"
  ];
  var sheet = getOrCreateSheet(ss, "📦 STOCK_PRODUCTOS", headers, "#f472b6");

  if (productos.length === 0) return;

  var rows = productos.map(function(p) {
    var estado = (p.stock || 0) <= 0 ? "Agotado" : (p.stock || 0) <= (p.stockMinimo || 1) ? "Stock Bajo" : "Disponible";
    return [
      p.id || "",
      p.nombre || "",
      p.categoria || "Figuras",
      p.stock || 0,
      p.stockMinimo || 1,
      p.precioVenta || 0,
      p.costo || 0,
      p.dimensiones || "",
      estado
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 6, rows.length, 2).setNumberFormat("$#,##0");
  autoFitColumns(sheet, headers.length);
}

// -------------------------------------------------------------
// 7. RESINAS E INSUMOS
// -------------------------------------------------------------
function actualizarMaterialesEInsumos(ss, resinas, insumos) {
  var headers = [
    "Tipo Material", "ID", "Nombre / Referencia", "Marca / Rubro", 
    "Costo Unitario ($)", "Unidad Medida", "Costo por Gramo/ML ($)", "Notas"
  ];
  var sheet = getOrCreateSheet(ss, "🧪 RESINAS_E_INSUMOS", headers, "#a78bfa");

  var rows = [];

  resinas.forEach(function(r) {
    rows.push([
      "Resina 3D",
      r.id || "",
      r.nombre || "",
      r.marca || "",
      r.costoPorKg || r.costo || 0,
      "Kg / Litro",
      r.costoPorGramo || ((r.costoPorKg || 0) / 1000),
      "Densidad: " + (r.densidad || 1.1) + " g/cm³"
    ]);
  });

  insumos.forEach(function(i) {
    rows.push([
      "Insumo / Pintura",
      i.id || "",
      i.nombre || "",
      i.categoria || i.rubro || "Consumible",
      i.costoUnitario || i.costo || 0,
      i.unidad || "Unidad",
      0,
      i.descripcion || ""
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
