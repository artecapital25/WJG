import {
  Filamento,
  Insumo,
  Resina,
  SolicitudInsumo,
  CatalogoTipoVinculo
} from '../types';

export const UMBRAL_STOCK_BAJO_RESINA_G = 200;
export const UMBRAL_STOCK_BAJO_FILAMENTO_G = 200;
export const UMBRAL_STOCK_BAJO_INSUMO_DEFAULT = 2;

export function normalizarNombreStock(valor?: string): string {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function existeSolicitudAbierta(
  solicitudesExistentes: SolicitudInsumo[],
  catalogoTipo: CatalogoTipoVinculo,
  catalogoItemId?: string,
  nombreItem?: string
): boolean {
  const normNombre = normalizarNombreStock(nombreItem);
  return solicitudesExistentes.some(sol => {
    if (sol.estado === 'recibido' || sol.estado === 'cancelado') return false;
    if (catalogoItemId && sol.catalogo_item_id === catalogoItemId && (!sol.catalogo_tipo || sol.catalogo_tipo === catalogoTipo)) {
      return true;
    }
    if (normNombre && normalizarNombreStock(sol.insumo_nombre) === normNombre) {
      return true;
    }
    return false;
  });
}

export interface DetectarStockBajoInput {
  resinasAfectadas?: Resina[];
  filamentosAfectados?: Filamento[];
  insumosAfectados?: Insumo[];
  solicitudesExistentes: SolicitudInsumo[];
  origenNota?: string;
}

/**
 * Detecta materiales o insumos cuyo stock físico quedó por debajo del mínimo operativo tras un descuento
 * y genera automáticamente solicitudes de compra S.O.S sin duplicar órdenes abiertas.
 */
export function detectarYCrearSolicitudesStockBajo(
  input: DetectarStockBajoInput
): SolicitudInsumo[] {
  const nuevasSolicitudes: SolicitudInsumo[] = [];
  const existentesMasNuevas = [...input.solicitudesExistentes];
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const notaBase = input.origenNota ? ` • Origen: ${input.origenNota}` : '';

  // 1. Resinas SLA
  (input.resinasAfectadas || []).forEach(res => {
    const pesoActual = Number(res.peso_g) || 0;
    if (pesoActual > UMBRAL_STOCK_BAJO_RESINA_G) return;

    const nombreResina = res.resumen || `${res.marca} ${res.tipo} ${res.color}`.trim();
    if (existeSolicitudAbierta(existentesMasNuevas, 'resina', res.id, nombreResina)) return;

    const nueva: SolicitudInsumo = {
      id: `sos-auto-res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      insumo_nombre: nombreResina,
      categoria: 'Resina',
      cantidad: 1,
      unidad: 'botellas',
      urgencia: pesoActual <= 0 ? 'taller_detenido' : 'urgente',
      solicitado_por: 'Sistema Bodega (Auto)',
      encargado_compra: 'Wendy',
      estado: 'pendiente',
      tipo_compra: 'internet',
      notas: `Stock bajo automático (${pesoActual}g disponibles <= ${UMBRAL_STOCK_BAJO_RESINA_G}g mínimo)${notaBase}`,
      fecha_solicitud: fechaHoy,
      origen_tipo: 'auto_stock_bajo',
      catalogo_tipo: 'resina',
      catalogo_item_id: res.id,
      stock_reabastecido: false
    };
    nuevasSolicitudes.push(nueva);
    existentesMasNuevas.push(nueva);
  });

  // 2. Filamentos FDM
  (input.filamentosAfectados || []).forEach(fil => {
    const stockActualG = Number(fil.stock_actual_g) || 0;
    if (stockActualG > UMBRAL_STOCK_BAJO_FILAMENTO_G) return;

    const nombreFil = `${fil.marca} ${fil.tipo} ${fil.color}`.trim();
    if (existeSolicitudAbierta(existentesMasNuevas, 'filamento', fil.id, nombreFil)) return;

    const nueva: SolicitudInsumo = {
      id: `sos-auto-fil-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      insumo_nombre: nombreFil,
      categoria: 'Filamento',
      cantidad: 1,
      unidad: 'bobinas',
      urgencia: stockActualG <= 0 ? 'taller_detenido' : 'urgente',
      solicitado_por: 'Sistema Bodega (Auto)',
      encargado_compra: 'Wendy',
      estado: 'pendiente',
      enlace_compra: fil.enlace_compra || undefined,
      tipo_compra: 'internet',
      notas: `Stock bajo automático (${stockActualG}g disponibles <= ${UMBRAL_STOCK_BAJO_FILAMENTO_G}g mínimo)${notaBase}`,
      fecha_solicitud: fechaHoy,
      origen_tipo: 'auto_stock_bajo',
      catalogo_tipo: 'filamento',
      catalogo_item_id: fil.id,
      stock_reabastecido: false
    };
    nuevasSolicitudes.push(nueva);
    existentesMasNuevas.push(nueva);
  });

  // 3. Insumos de bodega (pinturas, IPA, guantes, herrajes, empaques)
  (input.insumosAfectados || []).forEach(ins => {
    const stockActual = ins.stock_actual !== undefined ? Number(ins.stock_actual) : Number(ins.presentacion);
    const unidad = (ins.unidad_medida || 'und').toLowerCase();
    const esPorMlOG = unidad === 'ml' || unidad === 'g' || unidad === 'gr' || unidad === 'gramos';
    const umbral = esPorMlOG ? 50 : UMBRAL_STOCK_BAJO_INSUMO_DEFAULT;
    if (Number.isNaN(stockActual) || stockActual > umbral) return;

    if (existeSolicitudAbierta(existentesMasNuevas, 'insumo', ins.id, ins.nombre)) return;

    const cantidadSugerida = esPorMlOG
      ? Math.max(100, Number(ins.presentacion) || 500)
      : Math.max(1, Number(ins.presentacion) > 1 ? Number(ins.presentacion) : 2);

    const nueva: SolicitudInsumo = {
      id: `sos-auto-ins-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      insumo_nombre: ins.nombre,
      categoria: ins.categoria || 'Insumo',
      cantidad: cantidadSugerida,
      unidad: ins.unidad_medida || 'unidades',
      urgencia: stockActual <= 0 ? 'taller_detenido' : 'urgente',
      solicitado_por: 'Sistema Bodega (Auto)',
      encargado_compra: 'Wendy',
      estado: 'pendiente',
      enlace_compra: ins.enlace_compra || undefined,
      tipo_compra: ins.enlace_compra ? 'internet' : 'local',
      notas: `Stock bajo automático (${stockActual} ${ins.unidad_medida || 'und'} restantes)${notaBase}`,
      fecha_solicitud: fechaHoy,
      origen_tipo: 'auto_stock_bajo',
      catalogo_tipo: 'insumo',
      catalogo_item_id: ins.id,
      stock_reabastecido: false
    };
    nuevasSolicitudes.push(nueva);
    existentesMasNuevas.push(nueva);
  });

  return nuevasSolicitudes;
}

export interface ResultadoReabastecimiento {
  aplicado: boolean;
  catalogoTipo?: CatalogoTipoVinculo;
  resinaActualizada?: Resina;
  filamentoActualizado?: Filamento;
  insumoActualizado?: Insumo;
  mensaje: string;
}

/**
 * Calcula la actualización de stock cuando una Solicitud de Insumo pasa a estado 'recibido'.
 * Protege contra doble suma mediante `solicitud.stock_reabastecido`.
 */
export function calcularReabastecimientoAlRecibir(
  solicitud: SolicitudInsumo,
  catalogos: {
    resinas: Resina[];
    filamentos: Filamento[];
    insumos: Insumo[];
  }
): ResultadoReabastecimiento {
  if (solicitud.stock_reabastecido) {
    return {
      aplicado: false,
      mensaje: 'Esta orden ya había sido sumada previamente a bodega.'
    };
  }

  const cantidad = Math.max(0, Number(solicitud.cantidad) || 0);
  if (cantidad <= 0) {
    return {
      aplicado: false,
      mensaje: 'Cantidad inválida para reabastecer.'
    };
  }

  const unidadLower = (solicitud.unidad || '').toLowerCase();
  const nombreNorm = normalizarNombreStock(solicitud.insumo_nombre);

  // Determinar tipo de catálogo explícito o inferido por ID/nombre
  let tipo = solicitud.catalogo_tipo;
  if (!tipo && solicitud.catalogo_item_id) {
    if (catalogos.resinas.some(r => r.id === solicitud.catalogo_item_id)) tipo = 'resina';
    else if (catalogos.filamentos.some(f => f.id === solicitud.catalogo_item_id)) tipo = 'filamento';
    else if (catalogos.insumos.some(i => i.id === solicitud.catalogo_item_id)) tipo = 'insumo';
  }

  if (tipo === 'resina' || (!tipo && catalogos.resinas.some(r => normalizarNombreStock(r.resumen || `${r.marca} ${r.tipo} ${r.color}`) === nombreNorm))) {
    const res = catalogos.resinas.find(
      r =>
        (solicitud.catalogo_item_id && r.id === solicitud.catalogo_item_id) ||
        normalizarNombreStock(r.resumen || `${r.marca} ${r.tipo} ${r.color}`) === nombreNorm
    );
    if (!res) {
      return { aplicado: false, mensaje: 'No se encontró la resina vinculada en catálogo.' };
    }
    const esEnGramosOMl = unidadLower === 'g' || unidadLower.includes('gramo') || unidadLower === 'ml';
    const pesoPorBotella = Math.round((Number(res.volumen_l) || 1) * (Number(res.densidad_g_cm3) || 1.13) * 1000);
    const gramosASumar = esEnGramosOMl ? cantidad : Math.round(cantidad * pesoPorBotella);
    const nuevoPeso = Math.round(((Number(res.peso_g) || 0) + gramosASumar) * 10) / 10;

    return {
      aplicado: true,
      catalogoTipo: 'resina',
      resinaActualizada: { ...res, peso_g: nuevoPeso },
      mensaje: `+${gramosASumar}g sumados a resina "${res.resumen || res.tipo}" (Total: ${nuevoPeso}g)`
    };
  }

  if (tipo === 'filamento' || (!tipo && catalogos.filamentos.some(f => normalizarNombreStock(`${f.marca} ${f.tipo} ${f.color}`) === nombreNorm))) {
    const fil = catalogos.filamentos.find(
      f =>
        (solicitud.catalogo_item_id && f.id === solicitud.catalogo_item_id) ||
        normalizarNombreStock(`${f.marca} ${f.tipo} ${f.color}`) === nombreNorm
    );
    if (!fil) {
      return { aplicado: false, mensaje: 'No se encontró el filamento vinculado en catálogo.' };
    }
    const esEnGramos = unidadLower === 'g' || unidadLower.includes('gramo');
    const pesoBobina = Number(fil.peso_bobina_g) || 1000;
    const gramosASumar = esEnGramos ? cantidad : Math.round(cantidad * pesoBobina);
    const nuevoStockG = Math.round(((Number(fil.stock_actual_g) || 0) + gramosASumar) * 10) / 10;

    return {
      aplicado: true,
      catalogoTipo: 'filamento',
      filamentoActualizado: { ...fil, stock_actual_g: nuevoStockG },
      mensaje: `+${gramosASumar}g sumados a filamento "${fil.marca} ${fil.tipo} ${fil.color}" (Total: ${nuevoStockG}g)`
    };
  }

  // Insumo general
  const ins = catalogos.insumos.find(
    i =>
      (solicitud.catalogo_item_id && i.id === solicitud.catalogo_item_id) ||
      normalizarNombreStock(i.nombre) === nombreNorm
  );
  if (!ins) {
    return {
      aplicado: false,
      mensaje: 'La orden no está vinculada a un ítem existente del catálogo.'
    };
  }

  const stockBase = ins.stock_actual !== undefined ? Number(ins.stock_actual) : Number(ins.presentacion) || 0;
  const nuevoStock = Math.round((stockBase + cantidad) * 100) / 100;

  return {
    aplicado: true,
    catalogoTipo: 'insumo',
    insumoActualizado: {
      ...ins,
      stock_actual: nuevoStock,
      presentacion: ins.presentacion !== undefined ? Math.max(Number(ins.presentacion) || 0, nuevoStock) : nuevoStock
    },
    mensaje: `+${cantidad} ${solicitud.unidad || ins.unidad_medida || 'und'} sumadas a "${ins.nombre}" (Stock actual: ${nuevoStock})`
  };
}
