/**
 * Motores puros de cálculo para la Suite 3D PRO (Fase C)
 * 1. Convertidor Volumen / Metros <-> Peso <-> Costo COP
 * 2. Calculadora de Escala 3D (% <-> Altura <-> Consumo cúbico k^3)
 * 3. Calculadora de Cama / Lote Multi-Pieza
 * 4. Estimador de Tiempo y Energía por Altura de Capa
 * 5. Calculadora de Envío Volumétrico Colombia
 */

export interface ConversionMaterialInput {
  tecnologia: 'SLA_RESINA' | 'FDM_FILAMENTO';
  modoEntrada: 'volumen_cm3' | 'gramos' | 'metros_filamento';
  valor: number;
  densidadGCm3: number;
  costoGramoCop: number;
  diametroFilamentoMm?: 1.75 | 2.85;
  mermaPct?: number;
}

export interface ConversionMaterialResult {
  volumenCm3: number;
  pesoNetoG: number;
  pesoConMermaG: number;
  metrosFilamento: number;
  costoMaterialCop: number;
}

export function convertirVolumenPesoCosto(input: ConversionMaterialInput): ConversionMaterialResult {
  const val = Math.max(0, Number(input.valor) || 0);
  const densidad = Math.max(0.1, Number(input.densidadGCm3) || (input.tecnologia === 'SLA_RESINA' ? 1.1 : 1.24));
  const costoG = Math.max(0, Number(input.costoGramoCop) || 0);
  const merma = Math.max(0, Number(input.mermaPct) || 0) / 100;
  const diam = input.diametroFilamentoMm === 2.85 ? 2.85 : 1.75;
  const areaSeccionCm2 = Math.PI * Math.pow(diam / 2 / 10, 2); // cm²

  let volumenCm3 = 0;
  let pesoNetoG = 0;
  let metrosFilamento = 0;

  if (input.modoEntrada === 'volumen_cm3') {
    volumenCm3 = val;
    pesoNetoG = volumenCm3 * densidad;
    metrosFilamento = (volumenCm3 / areaSeccionCm2) / 100;
  } else if (input.modoEntrada === 'gramos') {
    pesoNetoG = val;
    volumenCm3 = pesoNetoG / densidad;
    metrosFilamento = (volumenCm3 / areaSeccionCm2) / 100;
  } else {
    metrosFilamento = val;
    volumenCm3 = metrosFilamento * 100 * areaSeccionCm2;
    pesoNetoG = volumenCm3 * densidad;
  }

  const pesoConMermaG = pesoNetoG * (1 + merma);
  const costoMaterialCop = Math.round(pesoConMermaG * costoG);

  return {
    volumenCm3: Number(volumenCm3.toFixed(2)),
    pesoNetoG: Number(pesoNetoG.toFixed(2)),
    pesoConMermaG: Number(pesoConMermaG.toFixed(2)),
    metrosFilamento: Number(metrosFilamento.toFixed(2)),
    costoMaterialCop
  };
}

export interface Escala3DInput {
  alturaActualMm: number;
  alturaObjetivoMm: number;
  pesoActualG: number;
  tiempoActualMin?: number;
  costoGramoCop?: number;
}

export interface Escala3DResult {
  factorLineal: number;
  porcentajeSlicer: number;
  factorAreaSuperficial: number;
  factorVolumen: number;
  pesoProyectadoG: number;
  tiempoProyectadoMin: number;
  costoMaterialProyectadoCop: number;
}

export function calcularEscala3D(input: Escala3DInput): Escala3DResult {
  const actualMm = Math.max(0.1, Number(input.alturaActualMm) || 1);
  const objetivoMm = Math.max(0.1, Number(input.alturaObjetivoMm) || actualMm);
  const pesoActual = Math.max(0, Number(input.pesoActualG) || 0);
  const tiempoActual = Math.max(0, Number(input.tiempoActualMin) || 0);
  const costoG = Math.max(0, Number(input.costoGramoCop) || 0);

  const k = objetivoMm / actualMm;
  const k2 = Math.pow(k, 2);
  const k3 = Math.pow(k, 3);
  const pesoProyectadoG = pesoActual * k3;
  // El tiempo en impresión 3D crece entre k (altura Z en SLA) y k^2.2 (FDM volumen/perímetros)
  const tiempoProyectadoMin = Math.round(tiempoActual * Math.pow(k, 2));

  return {
    factorLineal: Number(k.toFixed(3)),
    porcentajeSlicer: Number((k * 100).toFixed(1)),
    factorAreaSuperficial: Number(k2.toFixed(2)),
    factorVolumen: Number(k3.toFixed(2)),
    pesoProyectadoG: Number(pesoProyectadoG.toFixed(1)),
    tiempoProyectadoMin,
    costoMaterialProyectadoCop: Math.round(pesoProyectadoG * costoG)
  };
}

export interface CamaLoteInput {
  camaAnchoMm: number;
  camaProfMm: number;
  piezaAnchoMm: number;
  piezaProfMm: number;
  margenEntrePiezasMm: number;
  cantidadPedido: number;
  tiempoPorCamaMin: number;
}

export interface CamaLoteResult {
  piezasPorCama: number;
  orientacionOptima: 'normal' | 'rotada_90';
  columnas: number;
  filas: number;
  cantidadCamas: number;
  tiempoTotalMin: number;
  eficienciaAreaPct: number;
}

export function calcularCamaMultiPieza(input: CamaLoteInput): CamaLoteResult {
  const camaX = Math.max(10, Number(input.camaAnchoMm) || 220);
  const camaY = Math.max(10, Number(input.camaProfMm) || 220);
  const pX = Math.max(1, Number(input.piezaAnchoMm) || 40);
  const pY = Math.max(1, Number(input.piezaProfMm) || 40);
  const gap = Math.max(0, Number(input.margenEntrePiezasMm) || 4);
  const qty = Math.max(1, Math.round(Number(input.cantidadPedido) || 1));
  const tCama = Math.max(0, Number(input.tiempoPorCamaMin) || 0);

  const fitGrid = (w: number, d: number) => {
    const cols = Math.floor((camaX + gap) / (w + gap));
    const rows = Math.floor((camaY + gap) / (d + gap));
    return { cols: Math.max(0, cols), rows: Math.max(0, rows), total: Math.max(0, cols) * Math.max(0, rows) };
  };

  const normal = fitGrid(pX, pY);
  const rotada = fitGrid(pY, pX);
  const usaRotada = rotada.total > normal.total;
  const best = usaRotada ? rotada : normal;
  const piezasPorCama = Math.max(0, best.total);
  const cantidadCamas = piezasPorCama > 0 ? Math.ceil(qty / piezasPorCama) : 0;
  const areaOcupada = piezasPorCama * pX * pY;
  const areaCama = camaX * camaY;

  return {
    piezasPorCama,
    orientacionOptima: usaRotada ? 'rotada_90' : 'normal',
    columnas: best.cols,
    filas: best.rows,
    cantidadCamas,
    tiempoTotalMin: cantidadCamas * tCama,
    eficienciaAreaPct: areaCama > 0 ? Number(Math.min(100, (areaOcupada / areaCama) * 100).toFixed(1)) : 0
  };
}

export interface EstimadorCapaInput {
  tecnologia: 'SLA_RESINA' | 'FDM_FILAMENTO';
  alturaPiezaMm: number;
  capaBaseMm: number;
  tiempoBaseMin: number;
  capaNuevaMm: number;
  consumoKwh: number;
  tarifaKwhCop: number;
}

export interface EstimadorCapaResult {
  capasBase: number;
  capasNuevas: number;
  factorCambio: number;
  tiempoNuevoMin: number;
  diferenciaMin: number;
  costoEnergiaBaseCop: number;
  costoEnergiaNuevoCop: number;
}

export function estimarTiempoPorAlturaCapa(input: EstimadorCapaInput): EstimadorCapaResult {
  const alturaMm = Math.max(1, Number(input.alturaPiezaMm) || 100);
  const capaBase = Math.max(0.01, Number(input.capaBaseMm) || 0.05);
  const capaNueva = Math.max(0.01, Number(input.capaNuevaMm) || 0.05);
  const tiempoBase = Math.max(1, Number(input.tiempoBaseMin) || 60);
  const kwh = Math.max(0, Number(input.consumoKwh) || 0.1);
  const tarifa = Math.max(0, Number(input.tarifaKwhCop) || 834);

  const capasBase = Math.ceil(alturaMm / capaBase);
  const capasNuevas = Math.ceil(alturaMm / capaNueva);
  // En SLA, tiempo escala casi linealmente con el número de capas; en FDM tiene un piso del 15% por desplazamientos/calentamiento
  const ratioCapas = capasNuevas / Math.max(1, capasBase);
  const factorCambio =
    input.tecnologia === 'SLA_RESINA'
      ? ratioCapas
      : 0.15 + 0.85 * ratioCapas;

  const tiempoNuevoMin = Math.max(1, Math.round(tiempoBase * factorCambio));
  const costoEnergiaBaseCop = Math.round((tiempoBase / 60) * kwh * tarifa);
  const costoEnergiaNuevoCop = Math.round((tiempoNuevoMin / 60) * kwh * tarifa);

  return {
    capasBase,
    capasNuevas,
    factorCambio: Number(factorCambio.toFixed(2)),
    tiempoNuevoMin,
    diferenciaMin: tiempoNuevoMin - tiempoBase,
    costoEnergiaBaseCop,
    costoEnergiaNuevoCop
  };
}

export interface EnvioVolumetricoInput {
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  pesoRealKg: number;
  divisorVolumetrico?: number; // Estándar Colombia / aéreo: 5000 (algunas transportadoras terrestres usan 2500 o 4000)
  destinoTipo: 'local_ciudad' | 'nacional_principal' | 'trayecto_especial';
}

export interface EnvioVolumetricoResult {
  pesoVolumetricoKg: number;
  pesoFacturableKg: number;
  aplicaVolumetrico: boolean;
  fleteEstimadoCop: number;
}

export function calcularEnvioVolumetricoColombia(input: EnvioVolumetricoInput): EnvioVolumetricoResult {
  const L = Math.max(1, Number(input.largoCm) || 1);
  const A = Math.max(1, Number(input.anchoCm) || 1);
  const H = Math.max(1, Number(input.altoCm) || 1);
  const realKg = Math.max(0.05, Number(input.pesoRealKg) || 0.5);
  const divisor = Math.max(1000, Number(input.divisorVolumetrico) || 5000);

  const pesoVol = (L * A * H) / divisor;
  const facturableRaw = Math.max(realKg, pesoVol);
  const kgEntero = Math.max(1, Math.ceil(facturableRaw));

  const tarifaBase =
    input.destinoTipo === 'local_ciudad'
      ? { base: 9500, extraKg: 2500 }
      : input.destinoTipo === 'trayecto_especial'
      ? { base: 24000, extraKg: 5500 }
      : { base: 15500, extraKg: 3800 };

  const fleteEstimadoCop = Math.round((tarifaBase.base + Math.max(0, kgEntero - 1) * tarifaBase.extraKg) / 100) * 100;

  return {
    pesoVolumetricoKg: Number(pesoVol.toFixed(2)),
    pesoFacturableKg: Number(facturableRaw.toFixed(2)),
    aplicaVolumetrico: pesoVol > realKg,
    fleteEstimadoCop
  };
}
