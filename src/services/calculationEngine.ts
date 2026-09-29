import { Resina, Maquina, Insumo, Personal, ConfiguracionTaller, PiezaCotizada } from '../types';

export interface ParametrosPiezaInput {
  nombre_item: string;
  cantidad: number;
  alto_mm: number;
  ancho_mm: number;
  profundidad_mm: number;
  resina: Resina;
  impresora: Maquina;
  estacionCurado?: Maquina;
  insumoCurado?: Insumo;
  tiempoDesarrolloMin: number;
  tiempoArmadoMin: number;
  tiempoPinturaMin: number;
  accesorios: { insumo: Insumo; cantidad: number }[];
  pinturas: { insumo: Insumo; cantidad_ml: number }[];
  costoModeloComprado: number;
  margenGanancia: number; // Ej: 0.40 para 40%
  imagen_url?: string;
  modoCalculoResina?: 'volumen' | 'manual';
  pesoResinaManualG?: number;
  datosPendientes?: boolean;
  notasPendientes?: string;
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
  const volumen_cm3 = (alto * ancho * prof) / 1000;
  
  // Si los datos están pendientes, peso de resina es 0 o manual si fue estimado
  let peso_estimado_g = 0;
  if (!esParcial) {
    if (input.modoCalculoResina === 'manual' && input.pesoResinaManualG && input.pesoResinaManualG > 0) {
      peso_estimado_g = Number(input.pesoResinaManualG.toFixed(2));
    } else {
      // En modo volumen geométrico (caja envolvente X*Y*Z):
      // Una figura o modelo 3D de resina promedio ocupa un ~30% del volumen de la caja delimitadora (ahuecado estándar).
      const factorLlenadoEnvolvente = 0.30;
      peso_estimado_g = Number((volumen_cm3 * input.resina.densidad_g_cm3 * factorLlenadoEnvolvente).toFixed(2));
    }
  } else if (input.pesoResinaManualG && input.pesoResinaManualG > 0) {
    peso_estimado_g = Number(input.pesoResinaManualG.toFixed(2));
  }

  // 2. Tiempo de Impresión (minutos)
  const vel = input.resina.velocidad_impresion_mm_h > 0 ? input.resina.velocidad_impresion_mm_h : 20;
  const tiempo_impresion_min = (esParcial && alto === 0) ? 0 : Math.round((alto / vel) * 60);

  // 3. Costo de Energía Eléctrica Impresora
  const costo_energia_impresion = tiempo_impresion_min * (input.impresora.costo_minuto || 6.255);

  // 4. Costo de Resina con factor de merma y soportes
  let costo_resina = 0;
  if (peso_estimado_g > 0) {
    if (input.modoCalculoResina === 'manual') {
      // En modo manual (desde el Slicer Chitubox/Lychee o Visor STL 3D), los gramos ya incluyen figura y soportes.
      // Se aplica un 10% de merma técnica de taller (residuos en película FEP, tina y lavado).
      costo_resina = peso_estimado_g * input.resina.costo_gramo * 1.10;
    } else {
      // En modo volumen geométrico, se aplica el factor completo de merma y soportes configurado (1.35x - 1.4x)
      const factorMerma = config.margen_merma_resina || 1.35;
      costo_resina = peso_estimado_g * input.resina.costo_gramo * factorMerma;
    }
  }

  // 5. Curado Térmico / UV y Químico (Etanol / Alcohol)
  const tiempo_curado_min = peso_estimado_g >= 250 ? 15 : peso_estimado_g <= 50 ? 5 : 10;
  const costo_minuto_curado = input.estacionCurado ? input.estacionCurado.costo_minuto : 5.004;
  const costo_energia_curado = (esParcial && peso_estimado_g === 0) ? 0 : tiempo_curado_min * costo_minuto_curado;
  
  // Insumo curado (etanol ~ 10 COP por gramo de pieza lavada)
  const costo_unitario_insumo_curado = input.insumoCurado ? input.insumoCurado.costo_unitario : 10.27;
  const costo_quimico_curado = peso_estimado_g * costo_unitario_insumo_curado;
  const costo_curado = costo_energia_curado + costo_quimico_curado;

  // 6. Insumos Adicionales (Accesorios, bisutería, empaque, pinturas)
  const costoAccesorios = input.accesorios.reduce(
    (acc, item) => acc + (item.insumo.costo_unitario * item.cantidad),
    0
  );
  const costoPinturas = input.pinturas.reduce(
    (acc, item) => acc + (item.insumo.costo_unitario * item.cantidad_ml),
    0
  );
  const costo_insumos = costoAccesorios + costoPinturas;

  // 7. Tarifas de Mano de Obra (Personal)
  const tarifaDev = personal.find(p => p.rol.toLowerCase().includes('desarrollador'))?.costo_minuto || 166.67;
  const tarifaPintor = personal.find(p => p.rol.toLowerCase().includes('pintor'))?.costo_minuto || 166.67;

  const valorDesarrollo = input.tiempoDesarrolloMin * tarifaDev;
  const valorArmado = input.tiempoArmadoMin * tarifaPintor;
  const valorPintura = input.tiempoPinturaMin * tarifaPintor;
  const costo_mano_obra = valorDesarrollo + valorArmado + valorPintura;

  // 8. Costo Base de Producción
  const costo_base_produccion = 
    costo_energia_impresion +
    costo_resina +
    costo_curado +
    costo_insumos +
    costo_mano_obra +
    (input.costoModeloComprado || 0);

  // 9. Precio de Venta (Redondeado a centenas COP exactas con MROUND)
  const precio_unitario_raw = costo_base_produccion * (1 + input.margenGanancia);
  const precio_unitario = Math.round(precio_unitario_raw / 100) * 100;
  const precio_total = Math.ceil((precio_unitario * input.cantidad) / 100) * 100;

  // 10. Tiempo Estimado de Entrega de Taller
  const tiempoTotalFabricacion = tiempo_curado_min + tiempo_impresion_min + input.tiempoPinturaMin + input.tiempoArmadoMin;
  let tiempo_entrega = '(3) Días hábiles';
  if (tiempoTotalFabricacion > 600) {
    tiempo_entrega = '(10) Días hábiles';
  } else if (tiempoTotalFabricacion > 300) {
    tiempo_entrega = '(7) Días hábiles';
  }

  // 11. Descripción Técnica Detallada
  const descMedidas = esParcial && (!alto || !ancho || !prof)
    ? 'Dimensiones: [Pendiente de verificar en Software/Slicer 3D]'
    : `Medidas: ${alto}mm (Alto Z) x ${ancho}mm (Ancho X) x ${prof}mm (Fondo Y)`;

  const descResina = esParcial && peso_estimado_g === 0
    ? `Impresión en ${input.resina.resumen || input.resina.tipo} [Gramos y tiempo pendientes de corte]`
    : `Impresión en ${input.resina.resumen || input.resina.tipo}`;

  const descripcion_tecnica = `${descMedidas}\n${descResina}\nTiempo de entrega: ${tiempo_entrega}${esParcial ? '\n[Cotización preliminar sujeta a corte en software]' : ''}`;

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
    costo_energia: Math.round(costo_energia_impresion),
    costo_resina: Math.round(costo_resina),
    costo_curado: Math.round(costo_curado),
    costo_insumos: Math.round(costo_insumos),
    costo_mano_obra: Math.round(costo_mano_obra),
    costo_modelo_comprado: input.costoModeloComprado || 0,
    costo_base_produccion: Math.round(costo_base_produccion),
    margen_ganancia: input.margenGanancia,
    precio_unitario,
    precio_total,
    tiempo_entrega,
    descripcion_tecnica,
    imagen_url: input.imagen_url,
    gramos_resina_manual: input.pesoResinaManualG,
    modo_calculo_resina: input.modoCalculoResina,
    datos_pendientes: esParcial,
    notas_pendientes: input.notasPendientes,
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
