import { Resina, Maquina, Insumo, Personal, ConfiguracionTaller, PiezaCotizada, MaquinaInvolucrada, EnlaceReferenciaCompra } from '../types';

export interface ParametrosPiezaInput {
  nombre_item: string;
  cantidad: number;
  alto_mm: number;
  ancho_mm: number;
  profundidad_mm: number;
  resina: Resina;
  impresora: Maquina;
  tiempoImpresionManualMin?: number;
  requiereCurado?: boolean;
  estacionCurado?: Maquina;
  tiempoCuradoMin?: number;
  insumoCurado?: Insumo;
  requiereCompresorPintura?: boolean;
  maquinaPintura?: Maquina;
  tiempoCompresorMin?: number;
  maquinasAdicionales?: { maquina: Maquina; proceso: string; tiempo_min: number; mostrar_en_cliente?: boolean }[];
  enlacesCompra?: EnlaceReferenciaCompra[];
  tiempoDesarrolloMin: number;
  tiempoArmadoMin: number;
  tiempoPinturaMin: number;
  accesorios: { insumo: Insumo; cantidad: number }[];
  pinturas: { insumo: Insumo; cantidad_ml: number }[];
  empaques?: { insumo: Insumo; cantidad: number }[];
  vaPintadoManual?: boolean;
  costoModeloComprado: number;
  margenGanancia: number; // Ej: 0.40 para 40%
  imagen_url?: string;
  modoCalculoResina?: 'volumen' | 'manual';
  tipoEstructura?: 'solido' | 'ahuecado';
  porcentajeRelleno?: number;
  pesoResinaManualG?: number;
  datosPendientes?: boolean;
  notasPendientes?: string;
  precioUnitarioManual?: number;
  tarifaTamanoAplicada?: {
    altura_cm: number;
    precio_sugerido: number;
  };
  precioFijadoTarifa?: boolean;
  aplicaDescuentoVolumen?: boolean;
  descuentoVolumenPorcentaje?: number;
}

export interface DesgloseTarifaMaquina {
  costoMinutoEnergia: number;
  costoMinutoRepuestos: number;
  costoMinutoTotal: number;
}

/**
 * Resuelve y desglosa con exactitud el costo por minuto de una máquina:
 * 1. Costo por minuto de energía eléctrica = (consumo_kwh * tarifa_kwh) / 60
 * 2. Costo por minuto de repuestos y amortización de desgaste = suma de repuestos activos (costo / vida_útil_min)
 * 3. Tarifa total por minuto = energía + repuestos (respetando tarifas históricas si no hay desglose cargado)
 */
export function resolverTarifasMaquina(maquina: Maquina, tarifaKwhConfig?: number): DesgloseTarifaMaquina {
  const tarifaKwh = (tarifaKwhConfig && tarifaKwhConfig > 0) ? tarifaKwhConfig : 834.0;
  
  // Consumo eléctrico en kW
  const consumoKwh = (typeof maquina.consumo_kwh === 'number' && maquina.consumo_kwh > 0)
    ? maquina.consumo_kwh
    : 0.05;

  // Costo minuto de energía
  const costoMinutoEnergia = (consumoKwh * tarifaKwh) / 60;

  // Costo minuto de repuestos y desgaste
  let costoMinutoRepuestos = 0;
  if (Array.isArray(maquina.repuestos) && maquina.repuestos.length > 0) {
    costoMinutoRepuestos = maquina.repuestos
      .filter(r => r.activo !== false)
      .reduce((acc, r) => {
        if (typeof r.costo_minuto === 'number' && r.costo_minuto > 0) return acc + r.costo_minuto;
        if (r.costo_compra && r.vida_util_horas && r.vida_util_horas > 0) {
          return acc + (r.costo_compra / (r.vida_util_horas * 60));
        }
        return acc;
      }, 0);
  } else if (typeof maquina.costo_minuto_repuestos === 'number' && maquina.costo_minuto_repuestos > 0) {
    costoMinutoRepuestos = maquina.costo_minuto_repuestos;
  }

  // Costo total por minuto
  let costoMinutoTotal = costoMinutoEnergia + costoMinutoRepuestos;
  // Solo si no hay repuestos configurados y existe una tarifa plana previa se usa como fallback
  if (costoMinutoRepuestos === 0 && (!Array.isArray(maquina.repuestos) || maquina.repuestos.length === 0) && typeof maquina.costo_minuto === 'number' && maquina.costo_minuto > 0) {
    costoMinutoTotal = maquina.costo_minuto;
  }

  return {
    costoMinutoEnergia: Number(costoMinutoEnergia.toFixed(4)),
    costoMinutoRepuestos: Number(costoMinutoRepuestos.toFixed(4)),
    costoMinutoTotal: Number(costoMinutoTotal.toFixed(4))
  };
}

export function calcularPieza3D(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  const esParcial = Boolean(input.datosPendientes);

  // 1. Geometría y Peso
  const alto = esParcial ? (input.alto_mm || 0) : Math.max(0, input.alto_mm || 0);
  const ancho = esParcial ? (input.ancho_mm || 0) : Math.max(0, input.ancho_mm || 0);
  const prof = esParcial ? (input.profundidad_mm || 0) : Math.max(0, input.profundidad_mm || 0);
  
  // Volumen de la pieza en cm3 (ml): (Alto mm * Ancho mm * Profundidad mm) / 1000
  // Fórmula exacta verificada de WJGEEKS.xlsx celda AN2: = (L2 * K2 * J2) / 1000
  const volumen_cm3 = (alto * ancho * prof) / 1000;
  
  // Si los datos están pendientes, peso de resina es 0 o manual si fue estimado
  let peso_estimado_g = 0;
  if (!esParcial) {
    if (input.modoCalculoResina === 'manual' && input.pesoResinaManualG && input.pesoResinaManualG > 0) {
      peso_estimado_g = Number(input.pesoResinaManualG.toFixed(2));
    } else {
      // Modo volumen geométrico:
      // Fórmula oficial WJGEEKS.xlsx celda AO2: =AN2*Densidad (100% Sólido / Macizo por defecto).
      // Si el usuario especifica estructura ahuecada (ej. 35% o personalizado), se aplica dicho ratio.
      const ratioRelleno = input.tipoEstructura === 'ahuecado'
        ? ((input.porcentajeRelleno && input.porcentajeRelleno > 0) ? input.porcentajeRelleno / 100 : 0.35)
        : 1.0;
      peso_estimado_g = Number((volumen_cm3 * input.resina.densidad_g_cm3 * ratioRelleno).toFixed(2));
    }
  } else if (input.pesoResinaManualG && input.pesoResinaManualG > 0) {
    peso_estimado_g = Number(input.pesoResinaManualG.toFixed(2));
  }

  // 2. Proceso 1: Impresión 3D Principal (Desglose Dinámico Energía + Repuestos)
  const vel = input.resina.velocidad_impresion_mm_h > 0 ? input.resina.velocidad_impresion_mm_h : 20;
  const tiempo_impresion_calc = (esParcial && alto === 0) ? 0 : Math.round((alto / vel) * 60);
  const tiempo_impresion_min = (input.tiempoImpresionManualMin !== undefined && input.tiempoImpresionManualMin > 0)
    ? input.tiempoImpresionManualMin
    : tiempo_impresion_calc;
  
  const impresoraTarifas = resolverTarifasMaquina(input.impresora, config.tarifa_kwh);
  const costo_energia_impresion = tiempo_impresion_min * impresoraTarifas.costoMinutoEnergia;
  const costo_repuestos_impresion = tiempo_impresion_min * impresoraTarifas.costoMinutoRepuestos;

  // 3. Proceso 2: Curado Térmico / UV y Químico (Wash & Cure)
  const requiereCurado = input.requiereCurado !== false;
  let tiempo_curado_min = 0;
  let costo_energia_curado = 0;
  let costo_repuestos_curado = 0;
  let costo_quimico_curado = 0;
  let curadoTarifas: DesgloseTarifaMaquina = { costoMinutoEnergia: 0, costoMinutoRepuestos: 0, costoMinutoTotal: 0 };

  if (requiereCurado) {
    tiempo_curado_min = (input.tiempoCuradoMin !== undefined && input.tiempoCuradoMin >= 0)
      ? input.tiempoCuradoMin
      : (peso_estimado_g >= 250 ? 15 : peso_estimado_g <= 50 ? 5 : 10);
    
    if (input.estacionCurado) {
      curadoTarifas = resolverTarifasMaquina(input.estacionCurado, config.tarifa_kwh);
    } else {
      curadoTarifas = { costoMinutoEnergia: (0.36 * (config.tarifa_kwh || 834)) / 60, costoMinutoRepuestos: 0, costoMinutoTotal: (0.36 * (config.tarifa_kwh || 834)) / 60 };
    }

    costo_energia_curado = (esParcial && peso_estimado_g === 0) ? 0 : tiempo_curado_min * curadoTarifas.costoMinutoEnergia;
    costo_repuestos_curado = (esParcial && peso_estimado_g === 0) ? 0 : tiempo_curado_min * curadoTarifas.costoMinutoRepuestos;
    
    // Insumo curado (etanol ~ 10.27 COP por gramo de pieza lavada)
    const costo_unitario_insumo_curado = input.insumoCurado ? input.insumoCurado.costo_unitario : 10.27;
    costo_quimico_curado = peso_estimado_g * costo_unitario_insumo_curado;
  }
  const costo_curado = costo_energia_curado + costo_repuestos_curado + costo_quimico_curado;

  // 4. Proceso 3: Pintura y Acabado / Aerografía (Compresor de Pintura)
  let tiempo_compresor_min = 0;
  let costo_energia_compresor = 0;
  let costo_repuestos_compresor = 0;
  let compresorTarifas: DesgloseTarifaMaquina = { costoMinutoEnergia: 0, costoMinutoRepuestos: 0, costoMinutoTotal: 0 };

  if (input.requiereCompresorPintura && input.maquinaPintura) {
    tiempo_compresor_min = (input.tiempoCompresorMin !== undefined && input.tiempoCompresorMin >= 0)
      ? input.tiempoCompresorMin
      : input.tiempoPinturaMin;
    compresorTarifas = resolverTarifasMaquina(input.maquinaPintura, config.tarifa_kwh);
    costo_energia_compresor = tiempo_compresor_min * compresorTarifas.costoMinutoEnergia;
    costo_repuestos_compresor = tiempo_compresor_min * compresorTarifas.costoMinutoRepuestos;
  }

  // 5. Procesos 4: Máquinas Adicionales Dinámicas (FDM, Láser, Dremel, Hornos, etc.)
  let costo_energia_adicionales = 0;
  let costo_repuestos_adicionales = 0;
  const maquinasAdicionalesList: MaquinaInvolucrada[] = [];
  if (input.maquinasAdicionales && input.maquinasAdicionales.length > 0) {
    for (const item of input.maquinasAdicionales) {
      if (item.maquina && item.tiempo_min > 0) {
        const adicTarifas = resolverTarifasMaquina(item.maquina, config.tarifa_kwh);
        const costo_maq_energia = item.tiempo_min * adicTarifas.costoMinutoEnergia;
        const costo_maq_repuestos = item.tiempo_min * adicTarifas.costoMinutoRepuestos;
        costo_energia_adicionales += costo_maq_energia;
        costo_repuestos_adicionales += costo_maq_repuestos;

        const procesoSanitizado = (item.proceso || '').trim();
        const esVisibleCliente = Boolean(item.mostrar_en_cliente) && 
          procesoSanitizado !== '' && 
          !procesoSanitizado.toLowerCase().includes('proceso adicional') &&
          !procesoSanitizado.toLowerCase().includes('proceso extra');

        maquinasAdicionalesList.push({
          maquina_id: item.maquina.id,
          maquina_nombre: item.maquina.nombre,
          tipo: item.maquina.tipo,
          proceso: procesoSanitizado || item.maquina.nombre,
          tiempo_min: item.tiempo_min,
          costo_minuto: Number(adicTarifas.costoMinutoTotal.toFixed(4)),
          costo_energia: Math.round(costo_maq_energia),
          costo_repuestos: Math.round(costo_maq_repuestos),
          mostrar_en_cliente: esVisibleCliente
        });
      }
    }
  }

  // Costo Total de Energía Eléctrica Consolidada
  const costo_energia_total = Math.round(
    costo_energia_impresion +
    costo_energia_curado +
    costo_energia_compresor +
    costo_energia_adicionales
  );

  // Costo Total de Desgaste y Repuestos de Maquinaria Consolidado
  const costo_repuestos_total = Math.round(
    costo_repuestos_impresion +
    costo_repuestos_curado +
    costo_repuestos_compresor +
    costo_repuestos_adicionales
  );

  // Lista detallada de todas las máquinas y procesos involucrados
  const maquinas_involucradas: MaquinaInvolucrada[] = [
    {
      maquina_id: input.impresora.id,
      maquina_nombre: input.impresora.nombre,
      tipo: input.impresora.tipo,
      proceso: 'Impresión 3D',
      tiempo_min: tiempo_impresion_min,
      costo_minuto: Number(impresoraTarifas.costoMinutoTotal.toFixed(4)),
      costo_energia: Math.round(costo_energia_impresion),
      costo_repuestos: Math.round(costo_repuestos_impresion)
    }
  ];

  if (requiereCurado && input.estacionCurado) {
    maquinas_involucradas.push({
      maquina_id: input.estacionCurado.id,
      maquina_nombre: input.estacionCurado.nombre,
      tipo: input.estacionCurado.tipo,
      proceso: 'Lavado y Curado UV',
      tiempo_min: tiempo_curado_min,
      costo_minuto: Number(curadoTarifas.costoMinutoTotal.toFixed(4)),
      costo_energia: Math.round(costo_energia_curado),
      costo_repuestos: Math.round(costo_repuestos_curado)
    });
  }

  if (input.requiereCompresorPintura && input.maquinaPintura) {
    maquinas_involucradas.push({
      maquina_id: input.maquinaPintura.id,
      maquina_nombre: input.maquinaPintura.nombre,
      tipo: input.maquinaPintura.tipo,
      proceso: 'Pintura y Aerografía',
      tiempo_min: tiempo_compresor_min,
      costo_minuto: Number(compresorTarifas.costoMinutoTotal.toFixed(4)),
      costo_energia: Math.round(costo_energia_compresor),
      costo_repuestos: Math.round(costo_repuestos_compresor)
    });
  }

  maquinas_involucradas.push(...maquinasAdicionalesList);

  // 6. Costo de Resina con factor de merma y soportes
  let costo_resina = 0;
  if (peso_estimado_g > 0) {
    if (input.modoCalculoResina === 'manual') {
      costo_resina = peso_estimado_g * input.resina.costo_gramo * 1.10;
    } else {
      const factorMerma = config.margen_merma_resina || 1.40;
      costo_resina = peso_estimado_g * input.resina.costo_gramo * factorMerma;
    }
  }

  // 7. Insumos Adicionales (Accesorios, bisutería, empaque, pinturas)
  const costoAccesorios = input.accesorios.reduce(
    (acc, item) => acc + (item.insumo.costo_unitario * item.cantidad),
    0
  );
  const costoPinturas = input.pinturas.reduce(
    (acc, item) => acc + (item.insumo.costo_unitario * item.cantidad_ml),
    0
  );
  const costoEmpaques = (input.empaques || []).reduce(
    (acc, item) => acc + (item.insumo.costo_unitario * item.cantidad),
    0
  );
  const costo_insumos = costoAccesorios + costoPinturas + costoEmpaques;

  // 8. Tarifas de Mano de Obra (Personal)
  const tarifaDev = personal.find(p => p.rol.toLowerCase().includes('desarrollador'))?.costo_minuto || 166.67;
  const tarifaPintor = personal.find(p => p.rol.toLowerCase().includes('pintor'))?.costo_minuto || 166.67;

  const valorDesarrollo = input.tiempoDesarrolloMin * tarifaDev;
  const valorArmado = input.tiempoArmadoMin * tarifaPintor;
  const valorPintura = input.tiempoPinturaMin * tarifaPintor;
  const costo_mano_obra = valorDesarrollo + valorArmado + valorPintura;

  // 9. Costo Base de Producción (Incluye Energía + Fondo de Repuestos/Desgaste + Materiales + Personal)
  const costo_base_produccion = 
    costo_energia_total +
    costo_repuestos_total +
    costo_resina +
    costo_quimico_curado +
    costo_insumos +
    costo_mano_obra +
    (input.costoModeloComprado || 0);

  // 10. Precio de Venta (Redondeado a centenas COP exactas con MROUND)
  let precio_unitario_base: number;
  let margen_calculado = input.margenGanancia;

  if (input.precioFijadoTarifa && input.precioUnitarioManual && input.precioUnitarioManual > 0) {
    precio_unitario_base = Math.round(input.precioUnitarioManual / 100) * 100;
    if (costo_base_produccion > 0) {
      margen_calculado = (precio_unitario_base - costo_base_produccion) / costo_base_produccion;
    }
  } else {
    const precio_unitario_raw = costo_base_produccion * (1 + input.margenGanancia);
    precio_unitario_base = Math.round(precio_unitario_raw / 100) * 100;
  }

  // Descuento por Cantidad / Volumen (Escala 6+ unidades)
  let precio_unitario = precio_unitario_base;
  let descVolumenPct = 0;
  let descVolumenMonto = 0;
  const aplicaVolumen = input.aplicaDescuentoVolumen !== false;

  if (aplicaVolumen) {
    if (input.descuentoVolumenPorcentaje !== undefined && input.descuentoVolumenPorcentaje > 0) {
      descVolumenPct = input.descuentoVolumenPorcentaje;
    } else if (input.cantidad >= 24) {
      descVolumenPct = 20;
    } else if (input.cantidad >= 12) {
      descVolumenPct = 15;
    } else if (input.cantidad >= 6) {
      descVolumenPct = 10;
    }

    if (descVolumenPct > 0) {
      descVolumenMonto = Math.round((precio_unitario_base * (descVolumenPct / 100)) / 100) * 100;
      precio_unitario = Math.max(0, precio_unitario_base - descVolumenMonto);
    }
  }

  const precio_total = Math.ceil((precio_unitario * input.cantidad) / 100) * 100;

  // 11. Tiempo Estimado de Entrega de Taller
  const tiempoTotalFabricacion = tiempo_curado_min + tiempo_impresion_min + input.tiempoPinturaMin + input.tiempoArmadoMin;
  let tiempo_entrega = '(3) Días hábiles';
  if (tiempoTotalFabricacion > 600) {
    tiempo_entrega = '(10) Días hábiles';
  } else if (tiempoTotalFabricacion > 300) {
    tiempo_entrega = '(7) Días hábiles';
  }

  // 12. Descripción Técnica Detallada
  const va_pintado = typeof input.vaPintadoManual === 'boolean'
    ? input.vaPintadoManual
    : (input.tiempoPinturaMin > 0 || input.pinturas.length > 0 || Boolean(input.requiereCompresorPintura));

  const tiene_empaque = Boolean(input.empaques && input.empaques.length > 0);
  const lista_empaques = (input.empaques || []).map(e => ({
    nombre: e.insumo.nombre,
    cantidad: e.cantidad,
    costo: Math.round(e.insumo.costo_unitario * e.cantidad)
  }));

  const descMedidas = esParcial && (!alto || !ancho || !prof)
    ? 'Dimensiones: [Pendiente de verificar en Software/Slicer 3D]'
    : `Medidas: ${alto}mm (Alto Z) x ${ancho}mm (Ancho X) x ${prof}mm (Fondo Y)`;

  const descResina = esParcial && peso_estimado_g === 0
    ? `Material: ${input.resina.resumen || input.resina.tipo} [Gramos y tiempo pendientes de corte]`
    : `Material: ${input.resina.resumen || input.resina.tipo}`;

  const descPintura = va_pintado ? 'Acabado: Pintado' : 'Acabado: Sin pintar (Color base resina)';
  const descEmpaque = tiene_empaque && lista_empaques.length > 0
    ? `Empaque: Con empaque (${lista_empaques.map(e => e.nombre).join(', ')})`
    : tiene_empaque ? 'Empaque: Con empaque' : 'Empaque: Sin empaque especial';

  // Procesos visibles para el cliente (nunca 'Proceso Adicional' ni pasos internos de impresión/curado)
  const procesosCliente = maquinas_involucradas.filter(m => 
    Boolean(m.mostrar_en_cliente) && 
    m.proceso && 
    m.proceso.trim() !== '' &&
    !m.proceso.toLowerCase().includes('proceso adicional') &&
    !m.proceso.toLowerCase().includes('proceso extra') &&
    m.proceso.trim().toLowerCase() !== 'impresión 3d' &&
    m.proceso.trim().toLowerCase() !== 'lavado y curado uv'
  );

  const descMaquinas = procesosCliente.length > 0
    ? `\nServicios Especiales: ${procesosCliente.map(m => m.proceso.trim()).join(' • ')}`
    : '';

  const descripcion_tecnica = `${descMedidas} • ${descResina}\n${descPintura} • ${descEmpaque}${descMaquinas}\nTiempo de entrega: ${tiempo_entrega}${esParcial ? '\n[Cotización preliminar sujeta a corte en software]' : ''}`;

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nombre_item: input.nombre_item,
    cantidad: input.cantidad,
    alto_mm: alto,
    ancho_mm: ancho,
    profundidad_mm: prof,
    volumen_cm3: Number(volumen_cm3.toFixed(2)),
    peso_estimado_g,
    resina_id: input.resina.id,
    resina_nombre: input.resina.resumen || `${input.resina.tipo} ${input.resina.color}`,
    maquina_id: input.impresora.id,
    maquina_nombre: input.impresora.nombre,
    tiempo_impresion_min,
    tiempo_desarrollo_min: input.tiempoDesarrolloMin,
    tiempo_armado_min: input.tiempoArmadoMin,
    tiempo_pintura_min: input.tiempoPinturaMin,
    costo_energia: costo_energia_total,
    costo_repuestos_maquina: costo_repuestos_total,
    costo_resina: Math.round(costo_resina),
    costo_curado: Math.round(costo_curado),
    costo_insumos: Math.round(costo_insumos),
    costo_mano_obra: Math.round(costo_mano_obra),
    costo_modelo_comprado: input.costoModeloComprado || 0,
    costo_base_produccion: Math.round(costo_base_produccion),
    margen_ganancia: margen_calculado,
    precio_unitario,
    precio_total,
    aplica_descuento_volumen: aplicaVolumen && descVolumenPct > 0,
    descuento_volumen_porcentaje: descVolumenPct > 0 ? descVolumenPct : undefined,
    descuento_volumen_monto: descVolumenMonto > 0 ? descVolumenMonto : undefined,
    precio_unitario_original: descVolumenPct > 0 ? precio_unitario_base : undefined,
    tarifa_tamano_aplicada: input.tarifaTamanoAplicada,
    precio_fijado_tarifa: input.precioFijadoTarifa,
    tiempo_entrega,
    descripcion_tecnica,
    imagen_url: input.imagen_url,
    gramos_resina_manual: input.pesoResinaManualG,
    modo_calculo_resina: input.modoCalculoResina,
    tipo_estructura: input.tipoEstructura || 'solido',
    porcentaje_relleno: input.porcentajeRelleno || (input.tipoEstructura === 'ahuecado' ? 35 : 100),
    datos_pendientes: esParcial,
    maquinas_involucradas,
    enlaces_compra: input.enlacesCompra && input.enlacesCompra.length > 0 ? input.enlacesCompra : undefined,
    va_pintado,
    tiene_empaque,
    costo_empaque: Math.round(costoEmpaques),
    lista_empaques,
    lista_pinturas: input.pinturas.map(p => ({
      nombre: p.insumo.nombre,
      cantidad_ml: p.cantidad_ml,
      costo: Math.round(p.insumo.costo_unitario * p.cantidad_ml)
    })),
    lista_accesorios: input.accesorios.map(a => ({
      nombre: a.insumo.nombre,
      cantidad: a.cantidad,
      costo: Math.round(a.insumo.costo_unitario * a.cantidad)
    }))
  };
}
