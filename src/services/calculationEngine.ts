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
  TecnologiaFabricacion,
  ModoMargen,
  TipoObjetivoPrecio,
  NivelComplejidad,
  DesgloseApartado
} from '../types';

export const MULTIPLICADOR_COMPLEJIDAD: Record<NivelComplejidad, number> = {
  simple: 1.0,
  estandar: 1.25,
  complejo: 1.6,
  extremo: 2.2
};

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

  // Multicolor / AMS (FDM)
  amsActivo?: boolean;
  amsColores?: number;
  amsPurgaPct?: number;
  amsPurgaGramosManual?: number;

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

  // Cotizador 2.0: Margen dual, prorrateo, riesgo, overhead y comisiones
  modoMargen?: ModoMargen;
  tipoObjetivoPrecio?: TipoObjetivoPrecio;
  gananciaDeseadaCop?: number;
  prorratearArchivo3D?: boolean;
  prorratearDiseno3D?: boolean;
  tasaFalloPct?: number;
  nivelComplejidad?: NivelComplejidad;
  gastosFijosMensuales?: number;
  horasFacturablesMes?: number;
  consumiblesSlaPorImpresion?: number;
  comisionPasarelaPct?: number;
  costoEnvio?: number;
}

export interface DesgloseTarifaMaquina {
  costoMinutoEnergia: number;
  costoMinutoRepuestos: number;
  costoMinutoDepreciacion: number;
  costoMinutoTotal: number;
}

export interface ResultadoPrecioUnificado {
  precioActivo: number;
  precioMargenBruto: number;
  precioMarkup: number;
  precioGananciaFija: number;
  costoComision: number;
  utilidadNeta: number;
  margenRealSobreVenta: number;
  factorMultiplicadorCobro: number;
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
 * 1. Energía eléctrica = (consumo_kwh * tarifa_kwh) / 60
 * 2. Repuestos activos = suma de (costo_compra / (vida_util_horas * 60))
 * 3. Depreciación / amortización = ((precio_compra / vida_util_horas) + (mantenimiento_mensual / 100)) / 60
 */
export function resolverTarifasMaquina(maquina: Maquina, tarifaKwhConfig?: number): DesgloseTarifaMaquina {
  const tarifaKwh = (tarifaKwhConfig && tarifaKwhConfig > 0) ? tarifaKwhConfig : 834.0;
  const consumoKwh = (typeof maquina.consumo_kwh === 'number' && maquina.consumo_kwh > 0)
    ? maquina.consumo_kwh
    : 0.05;

  const costoMinutoEnergia = (consumoKwh * tarifaKwh) / 60;

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

  const precioCompra = Number(maquina.precio_compra) || 0;
  const vidaHoras = (Number(maquina.vida_util_horas) || 0) > 0 ? Number(maquina.vida_util_horas) : 4000;
  const mantMensual = Number(maquina.mantenimiento_mensual) || 0;
  const costoHoraDep = (precioCompra > 0 ? precioCompra / vidaHoras : 0) + (mantMensual > 0 ? mantMensual / 100 : 0);
  const costoMinutoDepreciacion = costoHoraDep / 60;

  let costoMinutoTotal = costoMinutoEnergia + costoMinutoRepuestos + costoMinutoDepreciacion;
  if (
    costoMinutoRepuestos === 0 &&
    costoMinutoDepreciacion === 0 &&
    (!Array.isArray(maquina.repuestos) || maquina.repuestos.length === 0) &&
    typeof maquina.costo_minuto === 'number' &&
    maquina.costo_minuto > 0
  ) {
    costoMinutoTotal = maquina.costo_minuto;
  }

  return {
    costoMinutoEnergia: Number(costoMinutoEnergia.toFixed(4)),
    costoMinutoRepuestos: Number(costoMinutoRepuestos.toFixed(4)),
    costoMinutoDepreciacion: Number(costoMinutoDepreciacion.toFixed(4)),
    costoMinutoTotal: Number(costoMinutoTotal.toFixed(4))
  };
}

/**
 * Calcula simultáneamente Margen Bruto sobre venta, Markup sobre costo y Ganancia Fija deseada,
 * con protección estricta contra división por cero / precios negativos.
 */
export function calcularPrecioVentaUnificado(params: {
  costoBase: number;
  margen: number;
  modoMargen?: ModoMargen;
  tipoObjetivoPrecio?: TipoObjetivoPrecio;
  gananciaDeseadaCop?: number;
  comisionPct?: number;
}): ResultadoPrecioUnificado {
  const costo = Math.max(0, Number(params.costoBase) || 0);
  const comision = Math.min(0.85, Math.max(0, (Number(params.comisionPct) || 0) / 100));
  const denomCom = Math.max(0.10, 1 - comision);

  const mBruto = Math.min(0.90, Math.max(0, Number(params.margen) || 0));
  const denomBruto = Math.max(0.05, 1 - mBruto - comision);
  const precioMargenBruto = costo > 0 ? Math.ceil((costo / denomBruto) / 100) * 100 : 0;

  const mMarkup = Math.max(0, Number(params.margen) || 0);
  const precioMarkup = costo > 0 ? Math.round(((costo * (1 + mMarkup)) / denomCom) / 100) * 100 : 0;

  const gananciaFija = Math.max(0, Number(params.gananciaDeseadaCop) || 0);
  const precioGananciaFija = (costo > 0 || gananciaFija > 0)
    ? Math.ceil(((costo + gananciaFija) / denomCom) / 100) * 100
    : 0;

  const modo = params.modoMargen || 'margen_bruto';
  let precioActivo = modo === 'markup' ? precioMarkup : precioMargenBruto;
  if (params.tipoObjetivoPrecio === 'ganancia_fija') {
    precioActivo = precioGananciaFija;
  }

  const costoComision = Math.round(precioActivo * comision);
  const utilidadNeta = Math.round(precioActivo - costo - costoComision);
  const margenRealSobreVenta = precioActivo > 0 ? Number(((utilidadNeta / precioActivo) * 100).toFixed(1)) : 0;
  const factorMultiplicadorCobro = costo > 0 ? precioActivo / costo : 1;

  return {
    precioActivo,
    precioMargenBruto,
    precioMarkup,
    precioGananciaFija,
    costoComision,
    utilidadNeta,
    margenRealSobreVenta,
    factorMultiplicadorCobro
  };
}

interface ApartadoRaw {
  clave: string;
  etiqueta: string;
  costoUnitario: number;
  esProrrateado?: boolean;
  color: string;
  detalle?: string;
}

function construirDesgloseApartados(
  apartadosRaw: ApartadoRaw[],
  cantidad: number,
  precioUnitarioBase: number,
  costoComision: number
): DesgloseApartado[] {
  const cant = Math.max(1, cantidad || 1);
  const activos = apartadosRaw
    .map(a => ({ ...a, costoUnitario: Math.max(0, Math.round(a.costoUnitario)) }))
    .filter(a => a.costoUnitario > 0);

  const sumaCostos = activos.reduce((s, a) => s + a.costoUnitario, 0);
  const precioDisponibleSinComision = Math.max(0, precioUnitarioBase - costoComision);
  const factor = sumaCostos > 0 ? precioDisponibleSinComision / sumaCostos : 1;

  const resultado: DesgloseApartado[] = activos.map(a => {
    const cobroUnitario = Math.round(a.costoUnitario * factor);
    const utilidadUnitaria = cobroUnitario - a.costoUnitario;
    return {
      clave: a.clave,
      etiqueta: a.etiqueta,
      costoUnitario: a.costoUnitario,
      cobroUnitario,
      utilidadUnitaria,
      costoLote: a.costoUnitario * cant,
      cobroLote: cobroUnitario * cant,
      esProrrateado: a.esProrrateado,
      color: a.color,
      detalle: a.detalle
    };
  });

  if (costoComision > 0) {
    resultado.push({
      clave: 'comision',
      etiqueta: 'Comisión Pasarela / Canal',
      costoUnitario: costoComision,
      cobroUnitario: costoComision,
      utilidadUnitaria: 0,
      costoLote: costoComision * cant,
      cobroLote: costoComision * cant,
      esProrrateado: false,
      color: '#ec4899',
      detalle: 'Cargo financiero pasarela/marketplace'
    });
  }

  // Ajustar delta mínimo de redondeo en el apartado principal para cuadre exacto contra precioUnitarioBase
  if (resultado.length > 0 && precioUnitarioBase > 0) {
    const sumaCobros = resultado.reduce((s, r) => s + r.cobroUnitario, 0);
    const diff = precioUnitarioBase - sumaCobros;
    if (diff !== 0) {
      const idxMayor = resultado.reduce((bestIdx, item, idx, arr) =>
        item.clave !== 'comision' && item.costoUnitario > arr[bestIdx].costoUnitario ? idx : bestIdx, 0);
      resultado[idxMayor].cobroUnitario = Math.max(0, resultado[idxMayor].cobroUnitario + diff);
      resultado[idxMayor].utilidadUnitaria = resultado[idxMayor].cobroUnitario - resultado[idxMayor].costoUnitario;
      resultado[idxMayor].cobroLote = resultado[idxMayor].cobroUnitario * cant;
    }
  }

  return resultado;
}

function resolverTarifasPersonal(personal: Personal[]) {
  const tarifaDev = personal.find(p => {
    const r = (p.rol || (p as any).cargo || '').toLowerCase();
    return r.includes('desarroll') || r.includes('diseñ') || r.includes('model');
  })?.costo_minuto || 166.67;

  const tarifaPintor = personal.find(p => {
    const r = (p.rol || (p as any).cargo || '').toLowerCase();
    return r.includes('pint') || r.includes('acabad') || r.includes('armad');
  })?.costo_minuto || 166.67;

  const tarifaOperario = personal[0]?.costo_minuto || tarifaPintor || 166.67;

  return { tarifaDev, tarifaPintor, tarifaOperario };
}

function calcularDescuentoVolumen(
  precioUnitarioBase: number,
  cantidad: number,
  aplicaDescuentoVolumen?: boolean,
  descuentoVolumenPorcentaje?: number
) {
  let precioUnitario = precioUnitarioBase;
  let descVolumenPct = 0;
  let descVolumenMonto = 0;
  const aplicaVolumen = aplicaDescuentoVolumen !== false;

  if (aplicaVolumen) {
    if (descuentoVolumenPorcentaje !== undefined && descuentoVolumenPorcentaje > 0) {
      descVolumenPct = descuentoVolumenPorcentaje;
    } else if (cantidad >= 24) {
      descVolumenPct = 20;
    } else if (cantidad >= 12) {
      descVolumenPct = 15;
    } else if (cantidad >= 6) {
      descVolumenPct = 10;
    }

    if (descVolumenPct > 0) {
      descVolumenMonto = Math.round((precioUnitarioBase * (descVolumenPct / 100)) / 100) * 100;
      precioUnitario = Math.max(0, precioUnitarioBase - descVolumenMonto);
    }
  }

  const precioTotal = Math.ceil((precioUnitario * cantidad) / 100) * 100;
  return { aplicaVolumen, descVolumenPct, descVolumenMonto, precioUnitario, precioTotal };
}

export function calcularPieza3D(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  const esParcial = Boolean(input.datosPendientes);
  const cantidad = Math.max(1, Number(input.cantidad) || 1);
  const nivelComplejidad: NivelComplejidad = input.nivelComplejidad || 'simple';
  const multComplejidad = MULTIPLICADOR_COMPLEJIDAD[nivelComplejidad] || 1.0;

  // 1. Geometría y Peso
  const alto = esParcial ? (input.alto_mm || 0) : Math.max(0, input.alto_mm || 0);
  const ancho = esParcial ? (input.ancho_mm || 0) : Math.max(0, input.ancho_mm || 0);
  const prof = esParcial ? (input.profundidad_mm || 0) : Math.max(0, input.profundidad_mm || 0);
  const volumen_cm3 = (alto * ancho * prof) / 1000;

  let peso_estimado_g = 0;
  if (!esParcial) {
    if (input.modoCalculoResina === 'manual' && input.pesoResinaManualG && input.pesoResinaManualG > 0) {
      peso_estimado_g = Number(input.pesoResinaManualG.toFixed(2));
    } else {
      const ratioRelleno = input.tipoEstructura === 'ahuecado'
        ? ((input.porcentajeRelleno && input.porcentajeRelleno > 0) ? input.porcentajeRelleno / 100 : 0.35)
        : 1.0;
      peso_estimado_g = Number((volumen_cm3 * input.resina.densidad_g_cm3 * ratioRelleno).toFixed(2));
    }
  } else if (input.pesoResinaManualG && input.pesoResinaManualG > 0) {
    peso_estimado_g = Number(input.pesoResinaManualG.toFixed(2));
  }

  // 2. Proceso 1: Impresión 3D Principal (Energía + Repuestos + Depreciación)
  const vel = input.resina.velocidad_impresion_mm_h > 0 ? input.resina.velocidad_impresion_mm_h : 20;
  const tiempo_impresion_calc = (esParcial && alto === 0) ? 0 : Math.round((alto / vel) * 60);
  const tiempo_impresion_min = (input.tiempoImpresionManualMin !== undefined && input.tiempoImpresionManualMin > 0)
    ? input.tiempoImpresionManualMin
    : tiempo_impresion_calc;

  const impresoraTarifas = resolverTarifasMaquina(input.impresora, config.tarifa_kwh);
  const costo_energia_impresion = tiempo_impresion_min * impresoraTarifas.costoMinutoEnergia;
  const costo_repuestos_impresion = tiempo_impresion_min * impresoraTarifas.costoMinutoRepuestos;
  const costo_dep_impresion = tiempo_impresion_min * impresoraTarifas.costoMinutoDepreciacion;

  // 3. Proceso 2: Lavado y Curado UV
  const requiereCurado = input.requiereCurado !== false;
  let tiempo_curado_min = 0;
  let costo_energia_curado = 0;
  let costo_repuestos_curado = 0;
  let costo_dep_curado = 0;
  let costo_quimico_curado = 0;
  let curadoTarifas: DesgloseTarifaMaquina = { costoMinutoEnergia: 0, costoMinutoRepuestos: 0, costoMinutoDepreciacion: 0, costoMinutoTotal: 0 };

  if (requiereCurado) {
    tiempo_curado_min = (input.tiempoCuradoMin !== undefined && input.tiempoCuradoMin >= 0)
      ? input.tiempoCuradoMin
      : (peso_estimado_g >= 250 ? 15 : peso_estimado_g <= 50 ? 5 : 10);

    if (input.estacionCurado) {
      curadoTarifas = resolverTarifasMaquina(input.estacionCurado, config.tarifa_kwh);
    } else {
      const eMin = (0.36 * (config.tarifa_kwh || 834)) / 60;
      curadoTarifas = { costoMinutoEnergia: eMin, costoMinutoRepuestos: 0, costoMinutoDepreciacion: 0, costoMinutoTotal: eMin };
    }

    costo_energia_curado = (esParcial && peso_estimado_g === 0) ? 0 : tiempo_curado_min * curadoTarifas.costoMinutoEnergia;
    costo_repuestos_curado = (esParcial && peso_estimado_g === 0) ? 0 : tiempo_curado_min * curadoTarifas.costoMinutoRepuestos;
    costo_dep_curado = (esParcial && peso_estimado_g === 0) ? 0 : tiempo_curado_min * curadoTarifas.costoMinutoDepreciacion;

    const costo_unitario_insumo_curado = input.insumoCurado ? input.insumoCurado.costo_unitario : 10.27;
    costo_quimico_curado = peso_estimado_g * costo_unitario_insumo_curado;
  }
  const costoConsumiblesSlaExtra = (requiereCurado && !esParcial)
    ? Math.max(0, Number(input.consumiblesSlaPorImpresion ?? 0))
    : 0;
  const costo_curado_solo = Math.round(costo_energia_curado + costo_repuestos_curado + costo_dep_curado + costo_quimico_curado + costoConsumiblesSlaExtra);

  // 4. Proceso 3: Compresor de Pintura
  let tiempo_compresor_min = 0;
  let costo_energia_compresor = 0;
  let costo_repuestos_compresor = 0;
  let costo_dep_compresor = 0;
  let compresorTarifas: DesgloseTarifaMaquina = { costoMinutoEnergia: 0, costoMinutoRepuestos: 0, costoMinutoDepreciacion: 0, costoMinutoTotal: 0 };

  if (input.requiereCompresorPintura && input.maquinaPintura) {
    tiempo_compresor_min = (input.tiempoCompresorMin !== undefined && input.tiempoCompresorMin >= 0)
      ? input.tiempoCompresorMin
      : input.tiempoPinturaMin;
    compresorTarifas = resolverTarifasMaquina(input.maquinaPintura, config.tarifa_kwh);
    costo_energia_compresor = tiempo_compresor_min * compresorTarifas.costoMinutoEnergia;
    costo_repuestos_compresor = tiempo_compresor_min * compresorTarifas.costoMinutoRepuestos;
    costo_dep_compresor = tiempo_compresor_min * compresorTarifas.costoMinutoDepreciacion;
  }

  // 5. Máquinas Adicionales Dinámicas
  let costo_energia_adicionales = 0;
  let costo_repuestos_adicionales = 0;
  let costo_dep_adicionales = 0;
  const maquinasAdicionalesList: MaquinaInvolucrada[] = [];
  if (input.maquinasAdicionales && input.maquinasAdicionales.length > 0) {
    for (const item of input.maquinasAdicionales) {
      if (item.maquina && item.tiempo_min > 0) {
        const adicTarifas = resolverTarifasMaquina(item.maquina, config.tarifa_kwh);
        const costo_maq_energia = item.tiempo_min * adicTarifas.costoMinutoEnergia;
        const costo_maq_repuestos = item.tiempo_min * adicTarifas.costoMinutoRepuestos;
        const costo_maq_dep = item.tiempo_min * adicTarifas.costoMinutoDepreciacion;
        costo_energia_adicionales += costo_maq_energia;
        costo_repuestos_adicionales += costo_maq_repuestos;
        costo_dep_adicionales += costo_maq_dep;

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

  const costo_energia_total = Math.round(
    costo_energia_impresion + costo_energia_curado + costo_energia_compresor + costo_energia_adicionales
  );
  const costo_repuestos_total = Math.round(
    costo_repuestos_impresion + costo_repuestos_curado + costo_repuestos_compresor + costo_repuestos_adicionales
  );
  const costo_depreciacion_maquina = Math.round(
    costo_dep_impresion + costo_dep_curado + costo_dep_compresor + costo_dep_adicionales
  );

  // Separar costo máquina principal + extras (sin duplicar el curado en desglose_apartados)
  const costoMaquinaImpresionYExtras = Math.round(
    costo_energia_impresion + costo_repuestos_impresion + costo_dep_impresion +
    costo_energia_compresor + costo_repuestos_compresor + costo_dep_compresor +
    costo_energia_adicionales + costo_repuestos_adicionales + costo_dep_adicionales
  );

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

  // 6. Costo de Resina con factor de merma
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
    costo_resina = Math.round(peso_estimado_g * costoGramoResina * factorMerma);
  }

  // 7. Insumos Adicionales (100% por figura: herrajes, pinturas y empaques)
  const va_pintado = typeof input.vaPintadoManual === 'boolean'
    ? input.vaPintadoManual
    : (input.tiempoPinturaMin > 0 || input.pinturas.length > 0 || Boolean(input.requiereCompresorPintura));

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

  const pinturasCalculadas = (va_pintado ? input.pinturas : []).map(p => ({
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

  // 8. Mano de Obra (Diseño 3D prorrateable en lote; Armado y Pintura 100% por figura)
  const { tarifaDev, tarifaPintor } = resolverTarifasPersonal(personal);
  const prorratearDiseno = input.prorratearDiseno3D !== false;
  const valorDesarrolloTotal = (input.tiempoDesarrolloMin || 0) * tarifaDev * multComplejidad;
  const costo_diseno_unitario = Math.round(prorratearDiseno ? (valorDesarrolloTotal / cantidad) : valorDesarrolloTotal);
  const costo_armado_unitario = Math.round((input.tiempoArmadoMin || 0) * tarifaPintor * multComplejidad);
  const costo_pintura_mo_unitario = Math.round(va_pintado ? (input.tiempoPinturaMin || 0) * tarifaPintor : 0);
  const costo_mano_obra = costo_diseno_unitario + costo_armado_unitario + costo_pintura_mo_unitario;

  // 9. Archivo 3D Comprado (prorrateado por defecto entre N figuras) & Envío unitario
  const prorratearArchivo = input.prorratearArchivo3D !== false;
  const costoModeloUnitario = Math.round(
    prorratearArchivo ? ((input.costoModeloComprado || 0) / cantidad) : (input.costoModeloComprado || 0)
  );
  const costoEnvioUnitario = Math.max(0, Math.round(Number(input.costoEnvio) || 0));

  // 10. Gastos Fijos (Overhead) y Tasa de Fallo / Riesgo
  const overheadPorHora = (input.gastosFijosMensuales && input.gastosFijosMensuales > 0)
    ? (input.gastosFijosMensuales / Math.max(1, input.horasFacturablesMes || 160))
    : 0;
  const costo_gastos_fijos = Math.round(overheadPorHora * (tiempo_impresion_min / 60));

  const subtotalAntesRiesgo =
    costo_resina +
    costoMaquinaImpresionYExtras +
    costo_curado_solo +
    costo_mano_obra +
    costoAccesorios +
    costoPinturas +
    costoEmpaques +
    costoModeloUnitario +
    costoEnvioUnitario +
    costo_gastos_fijos;

  const tasaFalloPct = Math.min(80, Math.max(0, (Number(input.tasaFalloPct) || 0) * multComplejidad));
  const factorFallo = tasaFalloPct > 0 ? (tasaFalloPct / 100) / (1 - tasaFalloPct / 100) : 0;
  const costo_riesgo_fallo = Math.round(subtotalAntesRiesgo * factorFallo);

  const costo_base_produccion = Math.round(subtotalAntesRiesgo + costo_riesgo_fallo);

  // 11. Precio de Venta Dual (Margen Bruto vs Markup vs Ganancia Fija + Tarifa Fijada)
  const modoMargen: ModoMargen = input.modoMargen || 'margen_bruto';
  const tipoObjetivoPrecio: TipoObjetivoPrecio = input.tipoObjetivoPrecio || 'porcentaje';

  const resPrecio = calcularPrecioVentaUnificado({
    costoBase: costo_base_produccion,
    margen: input.margenGanancia,
    modoMargen,
    tipoObjetivoPrecio,
    gananciaDeseadaCop: input.gananciaDeseadaCop,
    comisionPct: input.comisionPasarelaPct
  });

  let precio_unitario_base = resPrecio.precioActivo;
  let margen_calculado = input.margenGanancia;

  if (input.precioFijadoTarifa && input.precioUnitarioManual && input.precioUnitarioManual > 0) {
    precio_unitario_base = Math.round(input.precioUnitarioManual / 100) * 100;
    if (costo_base_produccion > 0) {
      margen_calculado = modoMargen === 'markup'
        ? (precio_unitario_base - costo_base_produccion) / costo_base_produccion
        : (precio_unitario_base - costo_base_produccion) / precio_unitario_base;
    }
  }

  const comisionPct = Math.min(85, Math.max(0, Number(input.comisionPasarelaPct) || 0));
  const costo_comision_pasarela = Math.round(precio_unitario_base * (comisionPct / 100));
  const utilidad_neta_unitaria = Math.round(precio_unitario_base - costo_base_produccion - costo_comision_pasarela);

  const desglose_apartados = construirDesgloseApartados(
    [
      { clave: 'material', etiqueta: 'Resina & Merma', costoUnitario: costo_resina, color: '#38bdf8', detalle: `${peso_estimado_g} g` },
      { clave: 'maquina', etiqueta: 'Impresora, Energía & Desgaste', costoUnitario: costoMaquinaImpresionYExtras, color: '#f59e0b', detalle: `${tiempo_impresion_min} min` },
      { clave: 'curado', etiqueta: 'Lavado, Curado UV & Consumibles', costoUnitario: costo_curado_solo, color: '#06b6d4', detalle: requiereCurado ? `${tiempo_curado_min} min + IPA/PPE` : 'No aplica' },
      { clave: 'mano_obra', etiqueta: 'Mano de Obra (Diseño/Armado/Pintura)', costoUnitario: costo_mano_obra, esProrrateado: prorratearDiseno && input.tiempoDesarrolloMin > 0, color: '#10b981' },
      { clave: 'pinturas', etiqueta: 'Pinturas & Acabados', costoUnitario: costoPinturas, color: '#a855f7' },
      { clave: 'herrajes', etiqueta: 'Herrajes & Insumos (por figura)', costoUnitario: costoAccesorios, color: '#6366f1' },
      { clave: 'empaques', etiqueta: 'Empaques & Cajas (por figura)', costoUnitario: costoEmpaques, color: '#14b8a6' },
      { clave: 'archivo_envio', etiqueta: 'Archivo 3D & Envío', costoUnitario: costoModeloUnitario + costoEnvioUnitario, esProrrateado: prorratearArchivo && (input.costoModeloComprado || 0) > 0, color: '#64748b' },
      { clave: 'riesgo_overhead', etiqueta: 'Riesgo de Fallo & Gastos Fijos', costoUnitario: costo_riesgo_fallo + costo_gastos_fijos, color: '#ef4444', detalle: `${tasaFalloPct.toFixed(1)}% riesgo` }
    ],
    cantidad,
    precio_unitario_base,
    costo_comision_pasarela
  );

  // Descuento por Cantidad / Volumen
  const vol = calcularDescuentoVolumen(
    precio_unitario_base,
    cantidad,
    input.aplicaDescuentoVolumen,
    input.descuentoVolumenPorcentaje
  );

  const precioDespuesDescSinComision = vol.precioUnitario;
  const utilidadNetaFinalUnit = Math.round(precioDespuesDescSinComision - costo_base_produccion - Math.round(precioDespuesDescSinComision * (comisionPct / 100)));
  const margen_real_venta_pct = precioDespuesDescSinComision > 0
    ? Number(((utilidadNetaFinalUnit / precioDespuesDescSinComision) * 100).toFixed(1))
    : 0;

  // 12. Tiempo Estimado de Entrega
  const tiempoTotalFabricacion = tiempo_curado_min + tiempo_impresion_min + input.tiempoPinturaMin + input.tiempoArmadoMin;
  let tiempo_entrega = '(3) Días hábiles';
  if (tiempoTotalFabricacion > 600) {
    tiempo_entrega = '(10) Días hábiles';
  } else if (tiempoTotalFabricacion > 300) {
    tiempo_entrega = '(7) Días hábiles';
  }

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
    cantidad,
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
    costo_resina,
    costo_curado: costo_curado_solo,
    costo_insumos,
    costo_mano_obra,
    costo_modelo_comprado: costoModeloUnitario,
    costo_base_produccion,
    margen_ganancia: margen_calculado,
    precio_unitario: vol.precioUnitario,
    precio_total: vol.precioTotal,
    aplica_descuento_volumen: vol.aplicaVolumen && vol.descVolumenPct > 0,
    descuento_volumen_porcentaje: vol.descVolumenPct > 0 ? vol.descVolumenPct : undefined,
    descuento_volumen_monto: vol.descVolumenMonto > 0 ? vol.descVolumenMonto : undefined,
    precio_unitario_original: vol.descVolumenPct > 0 ? precio_unitario_base : undefined,
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
    tiempo_curado_min,
    tiempo_curado_personalizado: input.tiempoCuradoPersonalizado,
    requiere_compresor_pintura: input.requiereCompresorPintura,
    compresor_maquina_id: input.maquinaPintura?.id,
    tiempo_compresor_min,
    tiempo_compresor_sincronizado: input.tiempoCompresorSincronizado,
    tiempo_impresion_modo: input.tiempoImpresionModo || (input.tiempoImpresionManualMin !== undefined ? 'manual' : 'auto'),
    maquinas_involucradas,
    enlaces_compra: input.enlacesCompra && input.enlacesCompra.length > 0 ? input.enlacesCompra : undefined,
    va_pintado,
    tiene_empaque,
    costo_empaque: costoEmpaques,
    lista_empaques,
    tecnologia: 'SLA_RESINA',
    lista_pinturas: pinturasCalculadas,
    lista_accesorios: accesoriosCalculados,
    // Campos Cotizador 2.0
    modo_margen: modoMargen,
    tipo_objetivo_precio: tipoObjetivoPrecio,
    ganancia_deseada_cop: input.gananciaDeseadaCop,
    precio_con_margen_bruto: resPrecio.precioMargenBruto,
    precio_con_markup: resPrecio.precioMarkup,
    utilidad_neta_unitaria: utilidadNetaFinalUnit,
    utilidad_neta_total: utilidadNetaFinalUnit * cantidad,
    margen_real_venta_pct,
    prorratear_archivo_3d: prorratearArchivo,
    prorratear_diseno_3d: prorratearDiseno,
    tasa_fallo_pct: tasaFalloPct,
    costo_riesgo_fallo,
    nivel_complejidad: nivelComplejidad,
    costo_depreciacion_maquina,
    costo_gastos_fijos,
    costo_consumibles_sla_extra: costoConsumiblesSlaExtra,
    costo_comision_pasarela,
    comision_pasarela_pct: comisionPct,
    costo_envio: costoEnvioUnitario,
    desglose_apartados,
    costo_diseno_unitario,
    costo_armado_unitario,
    costo_pintura_mo_unitario,
    costo_herrajes_total: costoAccesorios,
    costo_pinturas_total: costoPinturas
  };
}

/**
 * Motor de Cálculo para Impresión 3D FDM (Filamentos PLA, PETG, ABS, TPU, etc.)
 * Paridad completa con SLA: compresor, máquinas extra, roles de personal, AMS, fallo, depreciación y margen dual.
 */
export function calcularPiezaFDM(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  const esParcial = Boolean(input.datosPendientes);
  const tarifaKwh = config.tarifa_kwh || 834.0;
  const cantidad = Math.max(1, input.cantidad || 1);
  const nivelComplejidad: NivelComplejidad = input.nivelComplejidad || 'simple';
  const multComplejidad = MULTIPLICADOR_COMPLEJIDAD[nivelComplejidad] || 1.0;

  const pesoBaseGramos = esParcial ? (Number(input.pesoFilamentoG) || 0) : (Number(input.pesoFilamentoG) || 50);

  // 1. Filamento + Purga Multicolor AMS + Merma Editable
  const filamento = input.filamentoSeleccionado;
  const materialFilamento = filamento ? `${filamento.marca} ${filamento.tipo} (${filamento.color})` : (input.materialFilamento || 'PLA');
  const costoGramo = filamento?.costo_gramo || ((Number(input.costoRolloKg) || 85000) / 1000);
  const costoRolloKg = filamento ? (filamento.costo_gramo * 1000) : (Number(input.costoRolloKg) || 85000);

  let purgaAmsGramos = 0;
  if (input.amsActivo && pesoBaseGramos > 0) {
    if (input.amsPurgaGramosManual !== undefined && input.amsPurgaGramosManual > 0) {
      purgaAmsGramos = Number(input.amsPurgaGramosManual);
    } else {
      const pctPurga = Number(input.amsPurgaPct ?? 45);
      purgaAmsGramos = Number(((pesoBaseGramos * pctPurga) / 100).toFixed(2));
    }
  }
  const pesoTotalMaterialG = Number((pesoBaseGramos + purgaAmsGramos).toFixed(2));

  const mermaPct = input.mermaPorcentajeFdm !== undefined
    ? input.mermaPorcentajeFdm
    : (config.margen_merma_fdm !== undefined ? config.margen_merma_fdm : 5);
  const factorMerma = 1 + (mermaPct / 100);
  const costoFilamento = Math.round(pesoTotalMaterialG * factorMerma * costoGramo);

  const tiempoMinutos = Number(input.tiempoFDMMin) || 180;
  const alto = Number(input.alto_mm) || 60;
  const ancho = Number(input.ancho_mm) || 60;
  const prof = Number(input.profundidad_mm) || 60;

  // 2. Energía + Desgaste + Depreciación (Impresora principal + Compresor + Máquinas Adicionales)
  const desgloseMaquina = resolverTarifasMaquina(input.impresora, tarifaKwh);
  const costoEnergiaPrincipal = tiempoMinutos * desgloseMaquina.costoMinutoEnergia;
  const costoRepuestosPrincipal = desgloseMaquina.costoMinutoRepuestos > 0
    ? tiempoMinutos * desgloseMaquina.costoMinutoRepuestos
    : (Number(input.desgasteBoquillaCosto) || (tiempoMinutos * 1.25));
  const costoDepPrincipal = tiempoMinutos * desgloseMaquina.costoMinutoDepreciacion;

  let tiempo_compresor_min = 0;
  let costoEnergiaCompresor = 0;
  let costoRepuestosCompresor = 0;
  let costoDepCompresor = 0;
  let compresorTarifas: DesgloseTarifaMaquina = { costoMinutoEnergia: 0, costoMinutoRepuestos: 0, costoMinutoDepreciacion: 0, costoMinutoTotal: 0 };

  if (input.requiereCompresorPintura && input.maquinaPintura) {
    tiempo_compresor_min = (input.tiempoCompresorMin !== undefined && input.tiempoCompresorMin >= 0)
      ? input.tiempoCompresorMin
      : input.tiempoPinturaMin;
    compresorTarifas = resolverTarifasMaquina(input.maquinaPintura, tarifaKwh);
    costoEnergiaCompresor = tiempo_compresor_min * compresorTarifas.costoMinutoEnergia;
    costoRepuestosCompresor = tiempo_compresor_min * compresorTarifas.costoMinutoRepuestos;
    costoDepCompresor = tiempo_compresor_min * compresorTarifas.costoMinutoDepreciacion;
  }

  let costoEnergiaAdicionales = 0;
  let costoRepuestosAdicionales = 0;
  let costoDepAdicionales = 0;
  const maquinasAdicionalesList: MaquinaInvolucrada[] = [];

  if (input.maquinasAdicionales && input.maquinasAdicionales.length > 0) {
    for (const item of input.maquinasAdicionales) {
      if (item.maquina && item.tiempo_min > 0) {
        const adicTarifas = resolverTarifasMaquina(item.maquina, tarifaKwh);
        const eAdic = item.tiempo_min * adicTarifas.costoMinutoEnergia;
        const rAdic = item.tiempo_min * adicTarifas.costoMinutoRepuestos;
        const dAdic = item.tiempo_min * adicTarifas.costoMinutoDepreciacion;
        costoEnergiaAdicionales += eAdic;
        costoRepuestosAdicionales += rAdic;
        costoDepAdicionales += dAdic;

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
          costo_energia: Math.round(eAdic),
          costo_repuestos: Math.round(rAdic),
          mostrar_en_cliente: esVisibleCliente
        });
      }
    }
  }

  const costoEnergia = Math.round(costoEnergiaPrincipal + costoEnergiaCompresor + costoEnergiaAdicionales);
  const costoRepuestos = Math.round(costoRepuestosPrincipal + costoRepuestosCompresor + costoRepuestosAdicionales);
  const costo_depreciacion_maquina = Math.round(costoDepPrincipal + costoDepCompresor + costoDepAdicionales);
  const costoMaquinaTotal = costoEnergia + costoRepuestos + costo_depreciacion_maquina;

  const maquinas_involucradas: MaquinaInvolucrada[] = [
    {
      maquina_id: input.impresora?.id || 'maq-fdm',
      maquina_nombre: input.impresora?.nombre || 'Impresora FDM',
      tipo: input.impresora?.tipo || 'Impresora 3D FDM',
      proceso: 'Impresión 3D FDM',
      tiempo_min: tiempoMinutos,
      costo_minuto: Number(desgloseMaquina.costoMinutoTotal.toFixed(4)),
      costo_energia: Math.round(costoEnergiaPrincipal),
      costo_repuestos: Math.round(costoRepuestosPrincipal)
    }
  ];
  if (input.requiereCompresorPintura && input.maquinaPintura) {
    maquinas_involucradas.push({
      maquina_id: input.maquinaPintura.id,
      maquina_nombre: input.maquinaPintura.nombre,
      tipo: input.maquinaPintura.tipo,
      proceso: 'Pintura y Aerografía',
      tiempo_min: tiempo_compresor_min,
      costo_minuto: Number(compresorTarifas.costoMinutoTotal.toFixed(4)),
      costo_energia: Math.round(costoEnergiaCompresor),
      costo_repuestos: Math.round(costoRepuestosCompresor)
    });
  }
  maquinas_involucradas.push(...maquinasAdicionalesList);

  // 3. Mano de obra con roles diferenciados (Desarrollador prorrateado en lote + Pintor/Armado unitario)
  const va_pintado = typeof input.vaPintadoManual === 'boolean'
    ? input.vaPintadoManual
    : (input.tiempoPinturaMin > 0 || (input.pinturas && input.pinturas.length > 0) || Boolean(input.requiereCompresorPintura));

  const { tarifaDev, tarifaPintor } = resolverTarifasPersonal(personal);
  const prorratearDiseno = input.prorratearDiseno3D !== false;
  const valorDesarrolloTotal = (input.tiempoDesarrolloMin || 0) * tarifaDev * multComplejidad;
  const costo_diseno_unitario = Math.round(prorratearDiseno ? (valorDesarrolloTotal / cantidad) : valorDesarrolloTotal);
  const costo_armado_unitario = Math.round((input.tiempoArmadoMin || 0) * tarifaPintor * multComplejidad);
  const costo_pintura_mo_unitario = Math.round(va_pintado ? (input.tiempoPinturaMin || 0) * tarifaPintor : 0);
  const costoManoObra = costo_diseno_unitario + costo_armado_unitario + costo_pintura_mo_unitario;

  // 4. Insumos, Pinturas y Empaques (100% por figura)
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

  // 5. Archivo 3D (prorrateado), Envío, Overhead y Riesgo de Fallo
  const prorratearArchivo = input.prorratearArchivo3D !== false;
  const costoModeloUnitario = Math.round(
    prorratearArchivo ? ((input.costoModeloComprado || 0) / cantidad) : (input.costoModeloComprado || 0)
  );
  const costoEnvioUnitario = Math.max(0, Math.round(Number(input.costoEnvio) || 0));

  const overheadPorHora = (input.gastosFijosMensuales && input.gastosFijosMensuales > 0)
    ? (input.gastosFijosMensuales / Math.max(1, input.horasFacturablesMes || 160))
    : 0;
  const costo_gastos_fijos = Math.round(overheadPorHora * (tiempoMinutos / 60));

  const subtotalAntesRiesgo =
    costoFilamento +
    costoMaquinaTotal +
    costoManoObra +
    costoAccesorios +
    costoPinturas +
    costoEmpaques +
    costoModeloUnitario +
    costoEnvioUnitario +
    costo_gastos_fijos;

  const tasaFalloPct = Math.min(80, Math.max(0, (Number(input.tasaFalloPct) || 0) * multComplejidad));
  const factorFallo = tasaFalloPct > 0 ? (tasaFalloPct / 100) / (1 - tasaFalloPct / 100) : 0;
  const costo_riesgo_fallo = Math.round(subtotalAntesRiesgo * factorFallo);

  const costoBaseProduccion = Math.round(subtotalAntesRiesgo + costo_riesgo_fallo);

  // 6. Precio Dual (Margen Bruto vs Markup vs Ganancia Fija)
  const modoMargen: ModoMargen = input.modoMargen || 'margen_bruto';
  const tipoObjetivoPrecio: TipoObjetivoPrecio = input.tipoObjetivoPrecio || 'porcentaje';
  const margenInput = Number(input.margenGanancia) || 0.40;

  const resPrecio = calcularPrecioVentaUnificado({
    costoBase: costoBaseProduccion,
    margen: margenInput,
    modoMargen,
    tipoObjetivoPrecio,
    gananciaDeseadaCop: input.gananciaDeseadaCop,
    comisionPct: input.comisionPasarelaPct
  });

  let precioUnitarioBase = resPrecio.precioActivo;
  let margenCalculado = margenInput;
  if (input.precioFijadoTarifa && input.precioUnitarioManual && input.precioUnitarioManual > 0) {
    precioUnitarioBase = Math.round(input.precioUnitarioManual / 100) * 100;
    if (costoBaseProduccion > 0) {
      margenCalculado = modoMargen === 'markup'
        ? (precioUnitarioBase - costoBaseProduccion) / costoBaseProduccion
        : (precioUnitarioBase - costoBaseProduccion) / precioUnitarioBase;
    }
  }

  const comisionPct = Math.min(85, Math.max(0, Number(input.comisionPasarelaPct) || 0));
  const costo_comision_pasarela = Math.round(precioUnitarioBase * (comisionPct / 100));

  const desglose_apartados = construirDesgloseApartados(
    [
      { clave: 'material', etiqueta: input.amsActivo ? 'Filamento + Purga AMS & Merma' : 'Filamento & Merma', costoUnitario: costoFilamento, color: '#38bdf8', detalle: `${pesoTotalMaterialG} g total` },
      { clave: 'maquina', etiqueta: 'Impresora FDM, Energía & Desgaste', costoUnitario: costoMaquinaTotal, color: '#f59e0b', detalle: `${tiempoMinutos} min` },
      { clave: 'mano_obra', etiqueta: 'Mano de Obra (Diseño/Armado/Pintura)', costoUnitario: costoManoObra, esProrrateado: prorratearDiseno && (input.tiempoDesarrolloMin || 0) > 0, color: '#10b981' },
      { clave: 'pinturas', etiqueta: 'Pinturas & Acabados', costoUnitario: costoPinturas, color: '#a855f7' },
      { clave: 'herrajes', etiqueta: 'Herrajes & Insumos (por figura)', costoUnitario: costoAccesorios, color: '#6366f1' },
      { clave: 'empaques', etiqueta: 'Empaques & Cajas (por figura)', costoUnitario: costoEmpaques, color: '#14b8a6' },
      { clave: 'archivo_envio', etiqueta: 'Archivo 3D & Envío', costoUnitario: costoModeloUnitario + costoEnvioUnitario, esProrrateado: prorratearArchivo && (input.costoModeloComprado || 0) > 0, color: '#64748b' },
      { clave: 'riesgo_overhead', etiqueta: 'Riesgo de Fallo & Gastos Fijos', costoUnitario: costo_riesgo_fallo + costo_gastos_fijos, color: '#ef4444', detalle: `${tasaFalloPct.toFixed(1)}% riesgo` }
    ],
    cantidad,
    precioUnitarioBase,
    costo_comision_pasarela
  );

  const vol = calcularDescuentoVolumen(
    precioUnitarioBase,
    cantidad,
    input.aplicaDescuentoVolumen,
    input.descuentoVolumenPorcentaje
  );

  const utilidadNetaFinalUnit = Math.round(vol.precioUnitario - costoBaseProduccion - Math.round(vol.precioUnitario * (comisionPct / 100)));
  const margen_real_venta_pct = vol.precioUnitario > 0
    ? Number(((utilidadNetaFinalUnit / vol.precioUnitario) * 100).toFixed(1))
    : 0;

  const amsNota = input.amsActivo ? ` • Multicolor AMS (${input.amsColores || 4} colores, +${purgaAmsGramos}g purga)` : '';
  const descTecnica = `Tecnología: Impresión 3D FDM • Material: Filamento ${materialFilamento}${amsNota}\nPeso: ${pesoTotalMaterialG}g (+${mermaPct}% merma) • Medidas: ${alto}x${ancho}x${prof}mm\nTiempo est.: ${Math.floor(tiempoMinutos / 60)}h ${tiempoMinutos % 60}m • Máquina: ${input.impresora?.nombre || 'Bambulab P1S'}`;

  return {
    id: `fdm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nombre_item: input.nombre_item,
    cantidad,
    alto_mm: alto,
    ancho_mm: ancho,
    profundidad_mm: prof,
    volumen_cm3: Number(((ancho * prof * alto) / 1000).toFixed(2)),
    peso_estimado_g: pesoTotalMaterialG,
    tecnologia: 'FDM_FILAMENTO',
    material_filamento: materialFilamento,
    filamento_id: filamento?.id,
    filamento_nombre: filamento ? `${filamento.marca} ${filamento.tipo}` : materialFilamento,
    filamento_marca: filamento?.marca,
    filamento_color: filamento?.color,
    merma_porcentaje: mermaPct,
    peso_filamento_g: pesoBaseGramos,
    costo_filamento_kg: costoRolloKg,
    desgaste_boquilla_costo: costoRepuestos,
    resina_id: filamento?.id || 'fdm-filamento',
    resina_nombre: `Filamento ${materialFilamento}`,
    maquina_id: input.impresora?.id || 'maq-fdm',
    maquina_nombre: input.impresora?.nombre || 'Impresora FDM',
    tiempo_impresion_min: tiempoMinutos,
    tiempo_desarrollo_min: input.tiempoDesarrolloMin || 0,
    tiempo_armado_min: input.tiempoArmadoMin || 0,
    tiempo_pintura_min: va_pintado ? (input.tiempoPinturaMin || 0) : 0,
    requiere_compresor_pintura: input.requiereCompresorPintura,
    compresor_maquina_id: input.maquinaPintura?.id,
    tiempo_compresor_min,
    tiempo_compresor_sincronizado: input.tiempoCompresorSincronizado,
    maquinas_involucradas,
    costo_energia: costoEnergia,
    costo_repuestos_maquina: costoRepuestos,
    costo_resina: costoFilamento,
    costo_curado: 0,
    costo_insumos: costoAccesorios + costoPinturas + costoEmpaques,
    costo_mano_obra: costoManoObra,
    costo_modelo_comprado: costoModeloUnitario,
    costo_base_produccion: costoBaseProduccion,
    margen_ganancia: margenCalculado,
    precio_unitario: vol.precioUnitario,
    precio_total: vol.precioTotal,
    aplica_descuento_volumen: vol.aplicaVolumen && vol.descVolumenPct > 0,
    descuento_volumen_porcentaje: vol.descVolumenPct > 0 ? vol.descVolumenPct : undefined,
    descuento_volumen_monto: vol.descVolumenMonto > 0 ? vol.descVolumenMonto : undefined,
    precio_unitario_original: vol.descVolumenPct > 0 ? precioUnitarioBase : undefined,
    tarifa_tamano_aplicada: input.tarifaTamanoAplicada,
    precio_fijado_tarifa: input.precioFijadoTarifa,
    tiempo_entrega: tiempoMinutos > 360 ? '(2 a 3) Días hábiles' : '(1 a 2) Días hábiles',
    descripcion_tecnica: descTecnica,
    imagen_url: input.imagen_url,
    datos_pendientes: esParcial,
    notas_pendientes: input.notasPendientes,
    enlaces_compra: input.enlacesCompra && input.enlacesCompra.length > 0 ? input.enlacesCompra : undefined,
    va_pintado,
    tiene_empaque: empaquesCalculados.length > 0,
    costo_empaque: costoEmpaques,
    lista_empaques: empaquesCalculados,
    lista_pinturas: pinturasCalculadas,
    lista_accesorios: accesoriosCalculados,
    // Campos Cotizador 2.0
    modo_margen: modoMargen,
    tipo_objetivo_precio: tipoObjetivoPrecio,
    ganancia_deseada_cop: input.gananciaDeseadaCop,
    precio_con_margen_bruto: resPrecio.precioMargenBruto,
    precio_con_markup: resPrecio.precioMarkup,
    utilidad_neta_unitaria: utilidadNetaFinalUnit,
    utilidad_neta_total: utilidadNetaFinalUnit * cantidad,
    margen_real_venta_pct,
    prorratear_archivo_3d: prorratearArchivo,
    prorratear_diseno_3d: prorratearDiseno,
    tasa_fallo_pct: tasaFalloPct,
    costo_riesgo_fallo,
    nivel_complejidad: nivelComplejidad,
    costo_depreciacion_maquina,
    costo_gastos_fijos,
    costo_comision_pasarela,
    comision_pasarela_pct: comisionPct,
    costo_envio: costoEnvioUnitario,
    ams_activo: Boolean(input.amsActivo),
    ams_colores: input.amsActivo ? (input.amsColores || 4) : undefined,
    ams_purga_pct: input.amsActivo ? (input.amsPurgaPct ?? 45) : undefined,
    ams_purga_gramos: input.amsActivo ? purgaAmsGramos : undefined,
    desglose_apartados,
    costo_diseno_unitario,
    costo_armado_unitario,
    costo_pintura_mo_unitario,
    costo_herrajes_total: costoAccesorios,
    costo_pinturas_total: costoPinturas
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
  const costoM2 = Number(input.costoMetroCuadradoLamina) || 95000;
  const tiempoLaserMin = Number(input.tiempoLaserMin) || 15;
  const proceso = input.tipoProcesoLaser || 'corte';

  const areaCm2 = (anchoMm * altoMm) / 100;
  const areaM2 = (areaCm2 / 10000) * 1.15;
  const costoMaterial = Math.round(areaM2 * costoM2);

  const potenciaKw = 1.2;
  const costoEnergia = Math.round((potenciaKw * (tiempoLaserMin / 60)) * tarifaKwh);
  const costoDesgasteTubo = Math.round(tiempoLaserMin * 12);

  const { tarifaDev, tarifaOperario } = resolverTarifasPersonal(personal);
  const prorratearDiseno = input.prorratearDiseno3D !== false;
  const devTotal = (input.tiempoDesarrolloMin || 10) * tarifaDev;
  const costo_diseno_unitario = Math.round(prorratearDiseno ? devTotal / cantidad : devTotal);
  const costo_armado_unitario = Math.round((input.tiempoArmadoMin || 5) * tarifaOperario);
  const costoManoObra = costo_diseno_unitario + costo_armado_unitario;

  const empaquesCalculados = (input.empaques || []).map(e => {
    const calc = calcularCostoInsumoItem(e.insumo, e.cantidad, 'unidad', e.cantidad);
    return { insumo_id: e.insumo.id, nombre: e.insumo.nombre, cantidad: calc.cantidadEquivalente, costo: calc.costo };
  });
  const costoEmpaques = empaquesCalculados.reduce((acc, e) => acc + e.costo, 0);

  const accesoriosCalculados = (input.accesorios || []).map(a => {
    const calc = calcularCostoInsumoItem(a.insumo, a.cantidad, a.modo_consumo, a.valor_entrada);
    return { insumo_id: a.insumo.id, nombre: a.insumo.nombre, cantidad: calc.cantidadEquivalente, modo_consumo: calc.modo, valor_entrada: calc.valor, costo: calc.costo };
  });
  const costoAccesorios = accesoriosCalculados.reduce((acc, a) => acc + a.costo, 0);

  const prorratearArchivo = input.prorratearArchivo3D !== false;
  const costoModeloUnitario = Math.round(prorratearArchivo ? ((input.costoModeloComprado || 0) / cantidad) : (input.costoModeloComprado || 0));
  const costoEnvioUnitario = Math.max(0, Math.round(Number(input.costoEnvio) || 0));

  const subtotalAntesRiesgo = costoMaterial + costoEnergia + costoDesgasteTubo + costoManoObra + costoEmpaques + costoAccesorios + costoModeloUnitario + costoEnvioUnitario;
  const tasaFalloPct = Math.min(80, Math.max(0, Number(input.tasaFalloPct) || 0));
  const costo_riesgo_fallo = tasaFalloPct > 0 ? Math.round(subtotalAntesRiesgo * ((tasaFalloPct / 100) / (1 - tasaFalloPct / 100))) : 0;
  const costoBaseProduccion = subtotalAntesRiesgo + costo_riesgo_fallo;

  const modoMargen: ModoMargen = input.modoMargen || 'margen_bruto';
  const tipoObjetivoPrecio: TipoObjetivoPrecio = input.tipoObjetivoPrecio || 'porcentaje';
  const margen = Number(input.margenGanancia) || 0.45;

  const resPrecio = calcularPrecioVentaUnificado({
    costoBase: costoBaseProduccion,
    margen,
    modoMargen,
    tipoObjetivoPrecio,
    gananciaDeseadaCop: input.gananciaDeseadaCop,
    comisionPct: input.comisionPasarelaPct
  });
  const precioUnitarioBase = (input.precioFijadoTarifa && input.precioUnitarioManual && input.precioUnitarioManual > 0)
    ? Math.round(input.precioUnitarioManual / 100) * 100
    : resPrecio.precioActivo;

  const comisionPct = Math.min(85, Math.max(0, Number(input.comisionPasarelaPct) || 0));
  const costo_comision_pasarela = Math.round(precioUnitarioBase * (comisionPct / 100));

  const desglose_apartados = construirDesgloseApartados(
    [
      { clave: 'material', etiqueta: 'Lámina & Merma Corte', costoUnitario: costoMaterial, color: '#38bdf8' },
      { clave: 'maquina', etiqueta: 'Láser CO₂, Energía & Tubo', costoUnitario: costoEnergia + costoDesgasteTubo, color: '#f59e0b' },
      { clave: 'mano_obra', etiqueta: 'Mano de Obra', costoUnitario: costoManoObra, esProrrateado: prorratearDiseno, color: '#10b981' },
      { clave: 'herrajes', etiqueta: 'Herrajes & Insumos', costoUnitario: costoAccesorios, color: '#6366f1' },
      { clave: 'empaques', etiqueta: 'Empaques', costoUnitario: costoEmpaques, color: '#14b8a6' },
      { clave: 'archivo_envio', etiqueta: 'Vector / Archivo & Envío', costoUnitario: costoModeloUnitario + costoEnvioUnitario, esProrrateado: prorratearArchivo, color: '#64748b' },
      { clave: 'riesgo_overhead', etiqueta: 'Riesgo de Fallo', costoUnitario: costo_riesgo_fallo, color: '#ef4444' }
    ],
    cantidad,
    precioUnitarioBase,
    costo_comision_pasarela
  );

  const vol = calcularDescuentoVolumen(precioUnitarioBase, cantidad, input.aplicaDescuentoVolumen, input.descuentoVolumenPorcentaje);
  const utilidadNetaFinalUnit = Math.round(vol.precioUnitario - costoBaseProduccion - Math.round(vol.precioUnitario * (comisionPct / 100)));
  const margen_real_venta_pct = vol.precioUnitario > 0 ? Number(((utilidadNetaFinalUnit / vol.precioUnitario) * 100).toFixed(1)) : 0;

  const descTecnica = `Corte Láser CO₂: ${materialLamina} (${espesorMm}mm)\nDimensiones: ${anchoMm}x${altoMm}mm (${areaCm2.toFixed(1)} cm²)\nProceso: ${proceso.toUpperCase()} • Tiempo láser: ${tiempoLaserMin} min`;

  return {
    id: `laser-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nombre_item: input.nombre_item,
    cantidad,
    alto_mm: altoMm,
    ancho_mm: anchoMm,
    profundidad_mm: espesorMm,
    volumen_cm3: Number(((anchoMm * altoMm * espesorMm) / 1000).toFixed(2)),
    peso_estimado_g: Math.round(areaCm2 * espesorMm * 0.12),
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
    costo_insumos: costoAccesorios + costoEmpaques,
    costo_mano_obra: costoManoObra,
    costo_modelo_comprado: costoModeloUnitario,
    costo_base_produccion: costoBaseProduccion,
    margen_ganancia: margen,
    precio_unitario: vol.precioUnitario,
    precio_total: vol.precioTotal,
    aplica_descuento_volumen: vol.aplicaVolumen && vol.descVolumenPct > 0,
    descuento_volumen_porcentaje: vol.descVolumenPct > 0 ? vol.descVolumenPct : undefined,
    descuento_volumen_monto: vol.descVolumenMonto > 0 ? vol.descVolumenMonto : undefined,
    precio_unitario_original: vol.descVolumenPct > 0 ? precioUnitarioBase : undefined,
    tiempo_entrega: '(1 a 2) Días hábiles',
    descripcion_tecnica: descTecnica,
    imagen_url: input.imagen_url,
    tiene_empaque: empaquesCalculados.length > 0,
    costo_empaque: costoEmpaques,
    lista_empaques: empaquesCalculados,
    lista_pinturas: [],
    lista_accesorios: accesoriosCalculados,
    modo_margen: modoMargen,
    tipo_objetivo_precio: tipoObjetivoPrecio,
    ganancia_deseada_cop: input.gananciaDeseadaCop,
    precio_con_margen_bruto: resPrecio.precioMargenBruto,
    precio_con_markup: resPrecio.precioMarkup,
    utilidad_neta_unitaria: utilidadNetaFinalUnit,
    utilidad_neta_total: utilidadNetaFinalUnit * cantidad,
    margen_real_venta_pct,
    prorratear_archivo_3d: prorratearArchivo,
    prorratear_diseno_3d: prorratearDiseno,
    tasa_fallo_pct: tasaFalloPct,
    costo_riesgo_fallo,
    costo_comision_pasarela,
    comision_pasarela_pct: comisionPct,
    costo_envio: costoEnvioUnitario,
    desglose_apartados,
    costo_diseno_unitario,
    costo_armado_unitario,
    costo_pintura_mo_unitario: 0,
    costo_herrajes_total: costoAccesorios,
    costo_pinturas_total: 0
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

  const potenciaKw = 1.5;
  const costoEnergia = Math.round((potenciaKw * (tiempoMecanizadoMin / 60)) * tarifaKwh);
  const costoDesgasteFresa = Math.round(Number(input.desgasteFresaCosto) || (tiempoMecanizadoMin * 15));

  const { tarifaDev, tarifaOperario } = resolverTarifasPersonal(personal);
  const prorratearDiseno = input.prorratearDiseno3D !== false;
  const devTotal = (input.tiempoDesarrolloMin || 15) * tarifaDev;
  const costo_diseno_unitario = Math.round(prorratearDiseno ? devTotal / cantidad : devTotal);
  const costo_armado_unitario = Math.round((input.tiempoArmadoMin || 10) * tarifaOperario);
  const costoManoObra = costo_diseno_unitario + costo_armado_unitario;

  const prorratearArchivo = input.prorratearArchivo3D !== false;
  const costoModeloUnitario = Math.round(prorratearArchivo ? ((input.costoModeloComprado || 0) / cantidad) : (input.costoModeloComprado || 0));
  const costoEnvioUnitario = Math.max(0, Math.round(Number(input.costoEnvio) || 0));

  const subtotalAntesRiesgo = costoMaterial + costoEnergia + costoDesgasteFresa + costoManoObra + costoModeloUnitario + costoEnvioUnitario;
  const tasaFalloPct = Math.min(80, Math.max(0, Number(input.tasaFalloPct) || 0));
  const costo_riesgo_fallo = tasaFalloPct > 0 ? Math.round(subtotalAntesRiesgo * ((tasaFalloPct / 100) / (1 - tasaFalloPct / 100))) : 0;
  const costoBaseProduccion = subtotalAntesRiesgo + costo_riesgo_fallo;

  const modoMargen: ModoMargen = input.modoMargen || 'margen_bruto';
  const tipoObjetivoPrecio: TipoObjetivoPrecio = input.tipoObjetivoPrecio || 'porcentaje';
  const margen = Number(input.margenGanancia) || 0.40;

  const resPrecio = calcularPrecioVentaUnificado({
    costoBase: costoBaseProduccion,
    margen,
    modoMargen,
    tipoObjetivoPrecio,
    gananciaDeseadaCop: input.gananciaDeseadaCop,
    comisionPct: input.comisionPasarelaPct
  });
  const precioUnitarioBase = (input.precioFijadoTarifa && input.precioUnitarioManual && input.precioUnitarioManual > 0)
    ? Math.round(input.precioUnitarioManual / 100) * 100
    : resPrecio.precioActivo;

  const comisionPct = Math.min(85, Math.max(0, Number(input.comisionPasarelaPct) || 0));
  const costo_comision_pasarela = Math.round(precioUnitarioBase * (comisionPct / 100));

  const desglose_apartados = construirDesgloseApartados(
    [
      { clave: 'material', etiqueta: 'Bloque Material CNC', costoUnitario: costoMaterial, color: '#38bdf8' },
      { clave: 'maquina', etiqueta: 'Router CNC, Energía & Fresa', costoUnitario: costoEnergia + costoDesgasteFresa, color: '#f59e0b' },
      { clave: 'mano_obra', etiqueta: 'Mano de Obra CAM/Acabado', costoUnitario: costoManoObra, esProrrateado: prorratearDiseno, color: '#10b981' },
      { clave: 'archivo_envio', etiqueta: 'Archivo / Diseño & Envío', costoUnitario: costoModeloUnitario + costoEnvioUnitario, esProrrateado: prorratearArchivo, color: '#64748b' },
      { clave: 'riesgo_overhead', etiqueta: 'Riesgo de Fallo', costoUnitario: costo_riesgo_fallo, color: '#ef4444' }
    ],
    cantidad,
    precioUnitarioBase,
    costo_comision_pasarela
  );

  const vol = calcularDescuentoVolumen(precioUnitarioBase, cantidad, input.aplicaDescuentoVolumen, input.descuentoVolumenPorcentaje);
  const utilidadNetaFinalUnit = Math.round(vol.precioUnitario - costoBaseProduccion - Math.round(vol.precioUnitario * (comisionPct / 100)));
  const margen_real_venta_pct = vol.precioUnitario > 0 ? Number(((utilidadNetaFinalUnit / vol.precioUnitario) * 100).toFixed(1)) : 0;

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
    costo_modelo_comprado: costoModeloUnitario,
    costo_base_produccion: costoBaseProduccion,
    margen_ganancia: margen,
    precio_unitario: vol.precioUnitario,
    precio_total: vol.precioTotal,
    aplica_descuento_volumen: vol.aplicaVolumen && vol.descVolumenPct > 0,
    descuento_volumen_porcentaje: vol.descVolumenPct > 0 ? vol.descVolumenPct : undefined,
    descuento_volumen_monto: vol.descVolumenMonto > 0 ? vol.descVolumenMonto : undefined,
    precio_unitario_original: vol.descVolumenPct > 0 ? precioUnitarioBase : undefined,
    tiempo_entrega: '(2 a 3) Días hábiles',
    descripcion_tecnica: descTecnica,
    imagen_url: input.imagen_url,
    tiene_empaque: false,
    costo_empaque: 0,
    lista_empaques: [],
    lista_pinturas: [],
    lista_accesorios: [],
    modo_margen: modoMargen,
    tipo_objetivo_precio: tipoObjetivoPrecio,
    ganancia_deseada_cop: input.gananciaDeseadaCop,
    precio_con_margen_bruto: resPrecio.precioMargenBruto,
    precio_con_markup: resPrecio.precioMarkup,
    utilidad_neta_unitaria: utilidadNetaFinalUnit,
    utilidad_neta_total: utilidadNetaFinalUnit * cantidad,
    margen_real_venta_pct,
    prorratear_archivo_3d: prorratearArchivo,
    prorratear_diseno_3d: prorratearDiseno,
    tasa_fallo_pct: tasaFalloPct,
    costo_riesgo_fallo,
    costo_comision_pasarela,
    comision_pasarela_pct: comisionPct,
    costo_envio: costoEnvioUnitario,
    desglose_apartados,
    costo_diseno_unitario,
    costo_armado_unitario,
    costo_pintura_mo_unitario: 0,
    costo_herrajes_total: 0,
    costo_pinturas_total: 0
  };
}

/**
 * Alterna el modo de cobro (Margen Bruto ⇄ Markup) de una pieza ya cotizada
 * preservando su costo base, descuentos de volumen y retrocompatibilidad.
 */
export function recalcularPiezaPorModoMargen(pieza: PiezaCotizada, nuevoModo: ModoMargen): PiezaCotizada {
  const cantidad = Math.max(1, pieza.cantidad || 1);
  const costoBase = Number(pieza.costo_base_produccion) || 0;
  const margen = Number(pieza.margen_ganancia) || 0.40;
  const comisionPct = Number(pieza.comision_pasarela_pct) || 0;

  const resPrecio = calcularPrecioVentaUnificado({
    costoBase,
    margen,
    modoMargen: nuevoModo,
    tipoObjetivoPrecio: pieza.tipo_objetivo_precio || 'porcentaje',
    gananciaDeseadaCop: pieza.ganancia_deseada_cop,
    comisionPct
  });

  if (pieza.precio_fijado_tarifa) {
    return {
      ...pieza,
      modo_margen: nuevoModo,
      precio_con_margen_bruto: resPrecio.precioMargenBruto,
      precio_con_markup: resPrecio.precioMarkup
    };
  }

  const precioUnitarioBase = resPrecio.precioActivo;
  const costoComision = Math.round(precioUnitarioBase * (comisionPct / 100));

  const vol = calcularDescuentoVolumen(
    precioUnitarioBase,
    cantidad,
    pieza.aplica_descuento_volumen,
    pieza.descuento_volumen_porcentaje
  );

  const utilidadNetaUnit = Math.round(vol.precioUnitario - costoBase - Math.round(vol.precioUnitario * (comisionPct / 100)));
  const margenRealPct = vol.precioUnitario > 0
    ? Number(((utilidadNetaUnit / vol.precioUnitario) * 100).toFixed(1))
    : 0;

  const desgloseActualizado = Array.isArray(pieza.desglose_apartados) && pieza.desglose_apartados.length > 0
    ? construirDesgloseApartados(
        pieza.desglose_apartados
          .filter(d => d.clave !== 'comision')
          .map(d => ({
            clave: d.clave,
            etiqueta: d.etiqueta,
            costoUnitario: d.costoUnitario,
            esProrrateado: d.esProrrateado,
            color: d.color,
            detalle: d.detalle
          })),
        cantidad,
        precioUnitarioBase,
        costoComision
      )
    : undefined;

  return {
    ...pieza,
    modo_margen: nuevoModo,
    precio_con_margen_bruto: resPrecio.precioMargenBruto,
    precio_con_markup: resPrecio.precioMarkup,
    precio_unitario: vol.precioUnitario,
    precio_total: vol.precioTotal,
    precio_unitario_original: vol.descVolumenPct > 0 ? precioUnitarioBase : undefined,
    descuento_volumen_monto: vol.descVolumenMonto > 0 ? vol.descVolumenMonto : undefined,
    utilidad_neta_unitaria: utilidadNetaUnit,
    utilidad_neta_total: utilidadNetaUnit * cantidad,
    margen_real_venta_pct: margenRealPct,
    costo_comision_pasarela: costoComision,
    desglose_apartados: desgloseActualizado
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
