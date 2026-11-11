import { 
  Resina, 
  Filamento,
  Maquina, 
  Insumo, 
  Personal, 
  ConfiguracionTaller, 
  PiezaCotizada, 
  MaquinaInvolucrada, 
  EnlaceReferenciaCompra,
  TecnologiaFabricacion
} from '../types';

export interface ParametrosPiezaInput {
  nombre_item: string;
  cantidad: number;
  alto_mm: number;
  ancho_mm: number;
  profundidad_mm: number;
  resina: Resina;
  impresora: Maquina;
  tecnologia?: TecnologiaFabricacion;

  // Parámetros FDM Filamento
  filamentoSeleccionado?: Filamento;
  materialFilamento?: string;
  pesoFilamentoG?: number;
  costoRolloKg?: number;
  tiempoFDMMin?: number;
  desgasteBoquillaCosto?: number;
  mermaPorcentajeFdm?: number;
  mermaPorcentajeResina?: number;

  // Parámetros Láser CO2
  materialLamina?: string;
  espesorLaminaMm?: number;
  anchoLaminaMm?: number;
  altoLaminaMm?: number;
  longitudCorteMm?: number;
  costoMetroCuadradoLamina?: number;
  tiempoLaserMin?: number;
  tipoProcesoLaser?: 'corte' | 'grabado' | 'ambos';
  potenciaLaserWatts?: number;

  // Parámetros Router CNC
  materialBloque?: string;
  costoBloqueMaterial?: number;
  tiempoMecanizadoMin?: number;
  desgasteFresaCosto?: number;

  tiempoImpresionManualMin?: number;
  tiempoImpresionModo?: 'auto' | 'manual';
  requiereCurado?: boolean;
  estacionCurado?: Maquina;
  tiempoCuradoMin?: number;
  tiempoCuradoPersonalizado?: boolean;
  insumoCurado?: Insumo;
  requiereCompresorPintura?: boolean;
  maquinaPintura?: Maquina;
  tiempoCompresorMin?: number;
  tiempoCompresorSincronizado?: boolean;
  maquinasAdicionales?: { maquina: Maquina; proceso: string; tiempo_min: number; mostrar_en_cliente?: boolean }[];
  enlacesCompra?: EnlaceReferenciaCompra[];
  tiempoDesarrolloMin: number;
  tiempoArmadoMin: number;
  tiempoPinturaMin: number;
  accesorios: { insumo: Insumo; cantidad: number; modo_consumo?: 'unidad' | 'porcentaje'; valor_entrada?: number }[];
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
 * Calcula el costo y la fracción equivalente en inventario para un insumo (soporta modo unidad, fracción decimal ej. 0.2 y porcentaje ej. 5%)
 */
export function calcularCostoInsumoItem(
  insumo: Insumo,
  cantidad: number,
  modoConsumo?: 'unidad' | 'porcentaje',
  valorEntrada?: number
): { costo: number; cantidadEquivalente: number; modo: 'unidad' | 'porcentaje'; valor: number } {
  const modo = modoConsumo || 'unidad';
  const costoTotalEmpaque = insumo.costo_total > 0 ? insumo.costo_total : insumo.costo_unitario;
  const costoUnitario = insumo.costo_unitario > 0 ? insumo.costo_unitario : costoTotalEmpaque;

  if (modo === 'porcentaje') {
    const pct = Math.max(0, Number(valorEntrada !== undefined ? valorEntrada : cantidad * 100) || 0);
    const fraccion = pct / 100;
    const costo = fraccion * costoTotalEmpaque;
    return {
      costo: Math.round(costo),
      cantidadEquivalente: Number(fraccion.toFixed(4)),
      modo: 'porcentaje',
      valor: pct
    };
  }

  const cant = Math.max(0, Number(valorEntrada !== undefined ? valorEntrada : cantidad) || 0);
  // Si el usuario ingresa un decimal menor a 1 (ej. 0.2 de cinta), calcula esa fracción sobre el total del rollo/empaque
  const costo = (cant > 0 && cant < 1)
    ? cant * costoTotalEmpaque
    : cant * costoUnitario;

  return {
    costo: Math.round(costo),
    cantidadEquivalente: Number(cant.toFixed(4)),
    modo: 'unidad',
    valor: cant
  };
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
  const costoGramoResina = input.resina.costo_gramo || (input.resina.precio_compra ? input.resina.precio_compra / 1000 : 135);
  if (peso_estimado_g > 0) {
    let factorMerma: number;
    if (input.mermaPorcentajeResina !== undefined) {
      factorMerma = 1 + (input.mermaPorcentajeResina / 100);
    } else if (input.modoCalculoResina === 'manual') {
      factorMerma = 1.10;
    } else {
      factorMerma = config.margen_merma_resina || 1.40;
    }
    costo_resina = peso_estimado_g * costoGramoResina * factorMerma;
  }

  // 7. Insumos Adicionales (Accesorios, cintas, porcionados, bisutería, empaque, pinturas - Uso Interno Taller)
  const accesoriosCalculados = input.accesorios.map(item => {
    const calc = calcularCostoInsumoItem(item.insumo, item.cantidad, item.modo_consumo, item.valor_entrada);
    return {
      insumo_id: item.insumo.id,
      nombre: item.insumo.nombre,
      cantidad: calc.cantidadEquivalente,
      modo_consumo: calc.modo,
      valor_entrada: calc.valor,
      costo: calc.costo
    };
  });
  const costoAccesorios = accesoriosCalculados.reduce((acc, item) => acc + item.costo, 0);

  const pinturasCalculadas = input.pinturas.map(p => ({
    insumo_id: p.insumo.id,
    nombre: p.insumo.nombre,
    cantidad_ml: p.cantidad_ml,
    costo: Math.round(p.insumo.costo_unitario * p.cantidad_ml)
  }));
  const costoPinturas = pinturasCalculadas.reduce((acc, item) => acc + item.costo, 0);

  const empaquesCalculados = (input.empaques || []).map(e => {
    const calc = calcularCostoInsumoItem(e.insumo, e.cantidad, 'unidad', e.cantidad);
    return {
      insumo_id: e.insumo.id,
      nombre: e.insumo.nombre,
      cantidad: calc.cantidadEquivalente,
      costo: calc.costo
    };
  });
  const costoEmpaques = empaquesCalculados.reduce((acc, item) => acc + item.costo, 0);
  const costo_insumos = costoAccesorios + costoPinturas + costoEmpaques;

  // 8. Tarifas de Mano de Obra (Personal)
  const tarifaDev = personal.find(p => (p.rol || (p as any).cargo || '').toLowerCase().includes('desarrollador'))?.costo_minuto || 166.67;
  const tarifaPintor = personal.find(p => (p.rol || (p as any).cargo || '').toLowerCase().includes('pintor'))?.costo_minuto || 166.67;

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

  const tiene_empaque = Boolean(empaquesCalculados.length > 0);
  const lista_empaques = empaquesCalculados;

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
    gramos_resina_manual: input.modoCalculoResina === 'manual' ? input.pesoResinaManualG : undefined,
    modo_calculo_resina: input.modoCalculoResina || 'volumen',
    merma_porcentaje: input.mermaPorcentajeResina,
    tipo_estructura: input.tipoEstructura || 'solido',
    porcentaje_relleno: input.porcentajeRelleno || (input.tipoEstructura === 'ahuecado' ? 35 : 100),
    datos_pendientes: esParcial,
    notas_pendientes: input.notasPendientes,
    requiere_curado: requiereCurado,
    curado_maquina_id: input.estacionCurado?.id,
    tiempo_curado_min: tiempo_curado_min,
    tiempo_curado_personalizado: input.tiempoCuradoPersonalizado,
    requiere_compresor_pintura: input.requiereCompresorPintura,
    compresor_maquina_id: input.maquinaPintura?.id,
    tiempo_compresor_min: tiempo_compresor_min,
    tiempo_compresor_sincronizado: input.tiempoCompresorSincronizado,
    tiempo_impresion_modo: input.tiempoImpresionModo || (input.tiempoImpresionManualMin !== undefined ? 'manual' : 'auto'),
    maquinas_involucradas,
    enlaces_compra: input.enlacesCompra && input.enlacesCompra.length > 0 ? input.enlacesCompra : undefined,
    va_pintado,
    tiene_empaque,
    costo_empaque: Math.round(costoEmpaques),
    lista_empaques,
    tecnologia: 'SLA_RESINA',
    lista_pinturas: pinturasCalculadas,
    lista_accesorios: accesoriosCalculados
  };
}

/**
 * Motor de Cálculo para Impresión 3D FDM (Filamentos PLA, PETG, ABS, TPU, etc.)
 * Implementa el estándar industrial 3DPCC (Material + Merma + Energía + Desgaste + Mano de Obra)
 */
export function calcularPiezaFDM(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  const tarifaKwh = config.tarifa_kwh || 834.0;
  const cantidad = Math.max(1, input.cantidad || 1);
  const pesoGramos = Number(input.pesoFilamentoG) || 50;

  // 1. Filamento y Merma Editable
  const filamento = input.filamentoSeleccionado;
  const materialFilamento = filamento ? `${filamento.marca} ${filamento.tipo} (${filamento.color})` : (input.materialFilamento || 'PLA');
  const costoGramo = filamento?.costo_gramo || ((Number(input.costoRolloKg) || 85000) / 1000);
  const costoRolloKg = filamento ? (filamento.costo_gramo * 1000) : (Number(input.costoRolloKg) || 85000);

  // Merma de seguridad (% editable, por defecto config o 5%)
  const mermaPct = input.mermaPorcentajeFdm !== undefined
    ? input.mermaPorcentajeFdm
    : (config.margen_merma_fdm !== undefined ? config.margen_merma_fdm : 5);
  const factorMerma = 1 + (mermaPct / 100);

  // Costo Material = Peso Slicer * Factor Merma * Costo Gramo
  const costoFilamento = Math.round(pesoGramos * factorMerma * costoGramo);

  const tiempoMinutos = Number(input.tiempoFDMMin) || 180;
  const alto = Number(input.alto_mm) || 60;
  const ancho = Number(input.ancho_mm) || 60;
  const prof = Number(input.profundidad_mm) || 60;

  // 2. Energía FDM (Tarifas dinámicas de máquina)
  const desgloseMaquina = resolverTarifasMaquina(input.impresora, tarifaKwh);
  const costoEnergia = Math.round(tiempoMinutos * desgloseMaquina.costoMinutoEnergia);

  // 3. Desgaste y Repuestos (Amortización boquilla, PEI, lubricación)
  const costoRepuestos = Math.round(
    desgloseMaquina.costoMinutoRepuestos > 0
      ? tiempoMinutos * desgloseMaquina.costoMinutoRepuestos
      : (Number(input.desgasteBoquillaCosto) || (tiempoMinutos * 1.25))
  );

  // 4. Mano de obra operario (Slicing, cama, retiro soportes + pintura si aplica)
  const va_pintado = typeof input.vaPintadoManual === 'boolean'
    ? input.vaPintadoManual
    : (input.tiempoPinturaMin > 0 || (input.pinturas && input.pinturas.length > 0));
  const tiempoPinturaMin = va_pintado ? (input.tiempoPinturaMin || 0) : 0;
  const operador = personal[0];
  const costoMinutoOperario = operador?.costo_minuto || 130.21;
  const tiempoOperario = (input.tiempoDesarrolloMin || 0) + (input.tiempoArmadoMin || 0) + tiempoPinturaMin;
  const costoManoObra = Math.round(tiempoOperario * costoMinutoOperario);

  // 5. Insumos, Pinturas y Empaques (con soporte de fracción decimal y porcentaje)
  const accesoriosCalculados = (input.accesorios || []).map(a => {
    const calc = calcularCostoInsumoItem(a.insumo, a.cantidad, a.modo_consumo, a.valor_entrada);
    return {
      insumo_id: a.insumo.id,
      nombre: a.insumo.nombre,
      cantidad: calc.cantidadEquivalente,
      modo_consumo: calc.modo,
      valor_entrada: calc.valor,
      costo: calc.costo
    };
  });
  const costoAccesorios = accesoriosCalculados.reduce((acc, item) => acc + item.costo, 0);

  const pinturasCalculadas = (va_pintado ? (input.pinturas || []) : []).map(p => ({
    insumo_id: p.insumo.id,
    nombre: p.insumo.nombre,
    cantidad_ml: p.cantidad_ml,
    costo: Math.round(p.insumo.costo_unitario * p.cantidad_ml)
  }));
  const costoPinturas = pinturasCalculadas.reduce((acc, item) => acc + item.costo, 0);

  const empaquesCalculados = (input.empaques || []).map(e => {
    const calc = calcularCostoInsumoItem(e.insumo, e.cantidad, 'unidad', e.cantidad);
    return {
      insumo_id: e.insumo.id,
      nombre: e.insumo.nombre,
      cantidad: calc.cantidadEquivalente,
      costo: calc.costo
    };
  });
  const costoEmpaques = empaquesCalculados.reduce((acc, item) => acc + item.costo, 0);

  // 6. Costo Base de Producción Industrial (3DPCC)
  const costoBaseProduccion = costoFilamento + costoEnergia + costoRepuestos + costoManoObra + costoEmpaques + costoAccesorios + costoPinturas + (input.costoModeloComprado || 0);

  // 7. Margen de ganancia
  const margen = Number(input.margenGanancia) || 0.40;
  let precioUnitarioBase: number;
  if (input.precioFijadoTarifa && input.precioUnitarioManual && input.precioUnitarioManual > 0) {
    precioUnitarioBase = Math.round(input.precioUnitarioManual / 100) * 100;
  } else {
    precioUnitarioBase = Math.ceil((costoBaseProduccion / (1 - margen)) / 100) * 100;
  }

  // 8. Escala de Descuento por Volumen (6+ = 10%, 12+ = 15%, 24+ = 20%)
  const aplicaVolumen = input.aplicaDescuentoVolumen !== false;
  let descVolumenPct = 0;
  if (aplicaVolumen) {
    if (input.descuentoVolumenPorcentaje !== undefined) {
      descVolumenPct = input.descuentoVolumenPorcentaje;
    } else if (cantidad >= 24) descVolumenPct = 20;
    else if (cantidad >= 12) descVolumenPct = 15;
    else if (cantidad >= 6) descVolumenPct = 10;
  }
  const descVolumenMonto = Math.round(precioUnitarioBase * (descVolumenPct / 100));
  const precioUnitario = precioUnitarioBase - descVolumenMonto;
  const precioTotal = Math.ceil((precioUnitario * cantidad) / 100) * 100;

  const descTecnica = `Tecnología: Impresión 3D FDM • Material: Filamento ${materialFilamento}\nPeso: ${pesoGramos}g (+${mermaPct}% merma) • Medidas: ${alto}x${ancho}x${prof}mm\nTiempo est.: ${Math.floor(tiempoMinutos / 60)}h ${tiempoMinutos % 60}m • Máquina: ${input.impresora?.nombre || 'Bambulab P1S'}`;

  return {
    id: `fdm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nombre_item: input.nombre_item,
    cantidad,
    alto_mm: alto,
    ancho_mm: ancho,
    profundidad_mm: prof,
    volumen_cm3: Number(((ancho * prof * alto) / 1000).toFixed(2)),
    peso_estimado_g: pesoGramos,
    tecnologia: 'FDM_FILAMENTO',
    material_filamento: materialFilamento,
    filamento_id: filamento?.id,
    filamento_nombre: filamento ? `${filamento.marca} ${filamento.tipo}` : materialFilamento,
    filamento_marca: filamento?.marca,
    filamento_color: filamento?.color,
    merma_porcentaje: mermaPct,
    peso_filamento_g: pesoGramos,
    costo_filamento_kg: costoRolloKg,
    desgaste_boquilla_costo: costoRepuestos,
    resina_id: filamento?.id || 'fdm-filamento',
    resina_nombre: `Filamento ${materialFilamento}`,
    maquina_id: input.impresora?.id || 'maq-fdm',
    maquina_nombre: input.impresora?.nombre || 'Impresora FDM',
    tiempo_impresion_min: tiempoMinutos,
    tiempo_desarrollo_min: input.tiempoDesarrolloMin || 0,
    tiempo_armado_min: input.tiempoArmadoMin || 0,
    tiempo_pintura_min: tiempoPinturaMin,
    costo_energia: costoEnergia,
    costo_repuestos_maquina: costoRepuestos,
    costo_resina: costoFilamento,
    costo_curado: 0,
    costo_insumos: costoAccesorios + costoPinturas + costoEmpaques,
    costo_mano_obra: costoManoObra,
    costo_modelo_comprado: input.costoModeloComprado || 0,
    costo_base_produccion: costoBaseProduccion,
    margen_ganancia: margen,
    precio_unitario: precioUnitario,
    precio_total: precioTotal,
    aplica_descuento_volumen: aplicaVolumen && descVolumenPct > 0,
    descuento_volumen_porcentaje: descVolumenPct > 0 ? descVolumenPct : undefined,
    descuento_volumen_monto: descVolumenMonto > 0 ? descVolumenMonto : undefined,
    precio_unitario_original: descVolumenPct > 0 ? precioUnitarioBase : undefined,
    tarifa_tamano_aplicada: input.tarifaTamanoAplicada,
    precio_fijado_tarifa: input.precioFijadoTarifa,
    tiempo_entrega: tiempoMinutos > 360 ? '(2 a 3) Días hábiles' : '(1 a 2) Días hábiles',
    descripcion_tecnica: descTecnica,
    imagen_url: input.imagen_url,
    datos_pendientes: Boolean(input.datosPendientes),
    notas_pendientes: input.notasPendientes,
    enlaces_compra: input.enlacesCompra && input.enlacesCompra.length > 0 ? input.enlacesCompra : undefined,
    va_pintado,
    tiene_empaque: empaquesCalculados.length > 0,
    costo_empaque: costoEmpaques,
    lista_empaques: empaquesCalculados,
    lista_pinturas: pinturasCalculadas,
    lista_accesorios: accesoriosCalculados
  };
}

/**
 * Motor de Cálculo para Corte y Grabado Láser CO2 / Fibra
 */
export function calcularPiezaLaser(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  const tarifaKwh = config.tarifa_kwh || 834.0;
  const cantidad = Math.max(1, input.cantidad || 1);
  const anchoMm = Number(input.anchoLaminaMm || input.ancho_mm) || 100;
  const altoMm = Number(input.altoLaminaMm || input.alto_mm) || 100;
  const espesorMm = Number(input.espesorLaminaMm) || 3;
  const materialLamina = input.materialLamina || 'Acrílico Cristal 3mm';
  const costoM2 = Number(input.costoMetroCuadradoLamina) || 95000; // COP/m2
  const tiempoLaserMin = Number(input.tiempoLaserMin) || 15;
  const proceso = input.tipoProcesoLaser || 'corte';

  // 1. Costo Material de Lámina (área en cm2 convertida a m2 con 15% desperdicio corte)
  const areaCm2 = (anchoMm * altoMm) / 100;
  const areaM2 = (areaCm2 / 10000) * 1.15;
  const costoMaterial = Math.round(areaM2 * costoM2);

  // 2. Energía Láser (Láser CO2 80W-100W consume ~1.2 kW con chiller, extractor y compresor)
  const potenciaKw = 1.2;
  const costoEnergia = Math.round((potenciaKw * (tiempoLaserMin / 60)) * tarifaKwh);

  // 3. Amortización del Tubo Láser CO2 ($1.800.000 COP / 2500 horas = ~$720 COP/hora)
  const costoTuboMinuto = 12; // ~$720 COP / 60 min
  const costoDesgasteTubo = Math.round(tiempoLaserMin * costoTuboMinuto);

  // 4. Mano de Obra (Vectorizado, preparación de cama y desprendimiento)
  const operador = personal[0];
  const costoMinutoOperario = operador?.costo_minuto || 130.21;
  const tiempoOperario = (input.tiempoDesarrolloMin || 10) + (input.tiempoArmadoMin || 5);
  const costoManoObra = Math.round(tiempoOperario * costoMinutoOperario);

  // 5. Costo Base de Producción
  const costoEmpaques = (input.empaques || []).reduce((acc, e) => acc + (e.insumo.costo_unitario * e.cantidad), 0);
  const costoBaseProduccion = costoMaterial + costoEnergia + costoDesgasteTubo + costoManoObra + costoEmpaques + (input.costoModeloComprado || 0);

  // 6. Margen de ganancia
  const margen = Number(input.margenGanancia) || 0.45;
  const precioUnitarioBase = Math.ceil((costoBaseProduccion / (1 - margen)) / 100) * 100;

  // 7. Descuento por Volumen
  const aplicaVolumen = input.aplicaDescuentoVolumen !== false;
  let descVolumenPct = 0;
  if (aplicaVolumen) {
    if (input.descuentoVolumenPorcentaje !== undefined) {
      descVolumenPct = input.descuentoVolumenPorcentaje;
    } else if (cantidad >= 24) descVolumenPct = 20;
    else if (cantidad >= 12) descVolumenPct = 15;
    else if (cantidad >= 6) descVolumenPct = 10;
  }
  const descVolumenMonto = Math.round(precioUnitarioBase * (descVolumenPct / 100));
  const precioUnitario = precioUnitarioBase - descVolumenMonto;
  const precioTotal = Math.ceil((precioUnitario * cantidad) / 100) * 100;

  const descTecnica = `Corte Láser CO₂: ${materialLamina} (${espesorMm}mm)\nDimensiones: ${anchoMm}x${altoMm}mm (${areaCm2.toFixed(1)} cm²)\nProceso: ${proceso.toUpperCase()} • Tiempo láser: ${tiempoLaserMin} min`;

  return {
    id: `laser-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nombre_item: input.nombre_item,
    cantidad,
    alto_mm: altoMm,
    ancho_mm: anchoMm,
    profundidad_mm: espesorMm,
    volumen_cm3: Number(((anchoMm * altoMm * espesorMm) / 1000).toFixed(2)),
    peso_estimado_g: Math.round(areaCm2 * espesorMm * 0.12), // Densidad aprox acrílico/mdf
    tecnologia: 'CORTE_LASER',
    material_lamina: materialLamina,
    espesor_lamina_mm: espesorMm,
    area_lamina_cm2: areaCm2,
    tiempo_laser_min: tiempoLaserMin,
    tipo_proceso_laser: proceso,
    desgaste_tubo_laser_costo: costoDesgasteTubo,
    resina_id: 'laser-lamina',
    resina_nombre: materialLamina,
    maquina_id: input.impresora?.id || 'maq-laser',
    maquina_nombre: input.impresora?.nombre || 'Cortadora Láser CO2',
    tiempo_impresion_min: tiempoLaserMin,
    tiempo_desarrollo_min: input.tiempoDesarrolloMin || 10,
    tiempo_armado_min: input.tiempoArmadoMin || 5,
    tiempo_pintura_min: 0,
    costo_energia: costoEnergia,
    costo_repuestos_maquina: costoDesgasteTubo,
    costo_resina: costoMaterial,
    costo_curado: 0,
    costo_insumos: 0,
    costo_mano_obra: costoManoObra,
    costo_modelo_comprado: input.costoModeloComprado || 0,
    costo_base_produccion: costoBaseProduccion,
    margen_ganancia: margen,
    precio_unitario: precioUnitario,
    precio_total: precioTotal,
    aplica_descuento_volumen: aplicaVolumen && descVolumenPct > 0,
    descuento_volumen_porcentaje: descVolumenPct > 0 ? descVolumenPct : undefined,
    descuento_volumen_monto: descVolumenMonto > 0 ? descVolumenMonto : undefined,
    precio_unitario_original: descVolumenPct > 0 ? precioUnitarioBase : undefined,
    tiempo_entrega: '(1 a 2) Días hábiles',
    descripcion_tecnica: descTecnica,
    imagen_url: input.imagen_url,
    tiene_empaque: (input.empaques || []).length > 0,
    costo_empaque: costoEmpaques,
    lista_empaques: (input.empaques || []).map(e => ({ nombre: e.insumo.nombre, cantidad: e.cantidad, costo: e.insumo.costo_unitario * e.cantidad })),
    lista_pinturas: [],
    lista_accesorios: []
  };
}

/**
 * Motor de Cálculo para Router CNC / Mecanizado
 */
export function calcularPiezaCNC(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  const tarifaKwh = config.tarifa_kwh || 834.0;
  const cantidad = Math.max(1, input.cantidad || 1);
  const anchoMm = Number(input.ancho_mm) || 120;
  const altoMm = Number(input.alto_mm) || 120;
  const profMm = Number(input.profundidad_mm) || 20;
  const materialBloque = input.materialBloque || 'Madera Cedro / MDF';
  const costoMaterial = Number(input.costoBloqueMaterial) || 35000;
  const tiempoMecanizadoMin = Number(input.tiempoMecanizadoMin) || 45;

  const potenciaKw = 1.5; // Spindle CNC + motores
  const costoEnergia = Math.round((potenciaKw * (tiempoMecanizadoMin / 60)) * tarifaKwh);
  const costoDesgasteFresa = Math.round(Number(input.desgasteFresaCosto) || (tiempoMecanizadoMin * 15));

  const operador = personal[0];
  const costoMinutoOperario = operador?.costo_minuto || 130.21;
  const tiempoOperario = (input.tiempoDesarrolloMin || 15) + (input.tiempoArmadoMin || 10);
  const costoManoObra = Math.round(tiempoOperario * costoMinutoOperario);

  const costoBaseProduccion = costoMaterial + costoEnergia + costoDesgasteFresa + costoManoObra + (input.costoModeloComprado || 0);
  const margen = Number(input.margenGanancia) || 0.40;
  const precioUnitarioBase = Math.ceil((costoBaseProduccion / (1 - margen)) / 100) * 100;

  const aplicaVolumen = input.aplicaDescuentoVolumen !== false;
  let descVolumenPct = 0;
  if (aplicaVolumen) {
    if (input.descuentoVolumenPorcentaje !== undefined) {
      descVolumenPct = input.descuentoVolumenPorcentaje;
    } else if (cantidad >= 24) descVolumenPct = 20;
    else if (cantidad >= 12) descVolumenPct = 15;
    else if (cantidad >= 6) descVolumenPct = 10;
  }
  const descVolumenMonto = Math.round(precioUnitarioBase * (descVolumenPct / 100));
  const precioUnitario = precioUnitarioBase - descVolumenMonto;
  const precioTotal = Math.ceil((precioUnitario * cantidad) / 100) * 100;

  const descTecnica = `Mecanizado Router CNC: ${materialBloque}\nMedidas: ${altoMm}x${anchoMm}x${profMm}mm • Tiempo: ${tiempoMecanizadoMin} min`;

  return {
    id: `cnc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nombre_item: input.nombre_item,
    cantidad,
    alto_mm: altoMm,
    ancho_mm: anchoMm,
    profundidad_mm: profMm,
    volumen_cm3: Number(((anchoMm * profMm * altoMm) / 1000).toFixed(2)),
    peso_estimado_g: 250,
    tecnologia: 'CNC_ROUTER',
    material_bloque: materialBloque,
    tiempo_mecanizado_min: tiempoMecanizadoMin,
    desgaste_fresa_costo: costoDesgasteFresa,
    resina_id: 'cnc-material',
    resina_nombre: materialBloque,
    maquina_id: input.impresora?.id || 'maq-cnc',
    maquina_nombre: input.impresora?.nombre || 'Router CNC Industrial',
    tiempo_impresion_min: tiempoMecanizadoMin,
    tiempo_desarrollo_min: input.tiempoDesarrolloMin || 15,
    tiempo_armado_min: input.tiempoArmadoMin || 10,
    tiempo_pintura_min: 0,
    costo_energia: costoEnergia,
    costo_repuestos_maquina: costoDesgasteFresa,
    costo_resina: costoMaterial,
    costo_curado: 0,
    costo_insumos: 0,
    costo_mano_obra: costoManoObra,
    costo_modelo_comprado: input.costoModeloComprado || 0,
    costo_base_produccion: costoBaseProduccion,
    margen_ganancia: margen,
    precio_unitario: precioUnitario,
    precio_total: precioTotal,
    aplica_descuento_volumen: aplicaVolumen && descVolumenPct > 0,
    descuento_volumen_porcentaje: descVolumenPct > 0 ? descVolumenPct : undefined,
    descuento_volumen_monto: descVolumenMonto > 0 ? descVolumenMonto : undefined,
    precio_unitario_original: descVolumenPct > 0 ? precioUnitarioBase : undefined,
    tiempo_entrega: '(2 a 3) Días hábiles',
    descripcion_tecnica: descTecnica,
    imagen_url: input.imagen_url,
    tiene_empaque: false,
    costo_empaque: 0,
    lista_empaques: [],
    lista_pinturas: [],
    lista_accesorios: []
  };
}

/**
 * Función Despachadora Polimórfica que ejecuta el motor de cálculo según la tecnología de fabricación
 */
export function calcularCotizacionIntegral(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  const tec = input.tecnologia || 'SLA_RESINA';
  if (tec === 'FDM_FILAMENTO') {
    return calcularPiezaFDM(input, personal, config);
  }
  if (tec === 'CORTE_LASER' || tec === 'GRABADO_LASER') {
    return calcularPiezaLaser(input, personal, config);
  }
  if (tec === 'CNC_ROUTER') {
    return calcularPiezaCNC(input, personal, config);
  }
  return calcularPieza3D(input, personal, config);
}
