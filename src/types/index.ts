export type TabType = 
  | 'cotizador' 
  | 'pos' 
  | 'workflow' 
  | 'cotizaciones' 
  | 'cuentas' 
  | 'catalogos' 
  | 'materiales'
  | 'directorio'
  | 'plan' 
  | 'stl' 
  | 'stock' 
  | 'seguimiento' 
  | 'finanzas' 
  | 'tareas' 
  | 'marketing' 
  | 'herramientas' 
  | 'calendario' 
  | 'usuarios';

export * from './pos';
export * from './tasks';
export * from './calendar';

export type CategoriaHerramienta = 'ia_3d' | 'stl_repos' | 'slicers' | 'pintura' | 'utilidades';

export interface HerramientaLink {
  id: string;
  nombre: string;
  url: string;
  categoria: CategoriaHerramienta;
  descripcion?: string;
  etiqueta?: string;
  icono?: string;
  esFrecuente?: boolean;
  creado_el?: string;
}

export interface ProductoStock {
  id: string;
  codigo?: string | number;
  nombre: string;
  categoria: string;
  precio_unitario: number;
  stock_actual: number;
  descripcion?: string;
  dimensiones?: string;
  material?: string;
  imagen_url?: string;
  fecha_actualizacion?: string;
}

export interface Resina {
  id: string;
  tipo: string;
  marca: string;
  color: string;
  volumen_l: number;
  densidad_g_cm3: number;
  peso_g: number;
  precio_compra: number;
  costo_gramo: number;
  velocidad_impresion_mm_h: number;
  resumen: string;
  imagen_url?: string;
  activo?: boolean;
}

export interface Filamento {
  id: string;
  marca: string;
  tipo: string; // PLA, PLA+, PETG, ABS, TPU, ASA, NYLON, etc.
  color: string;
  peso_bobina_g: number; // 1000g normalmente
  precio_compra: number; // COP
  costo_gramo: number; // calculado: precio_compra / peso_bobina_g
  stock_actual_g: number; // Gramos disponibles en bodega
  temperatura_nozzle?: number; // ej. 210°C
  temperatura_bed?: number; // ej. 60°C
  densidad_g_cm3?: number; // ej. 1.24 g/cm3
  enlace_compra?: string;
  imagen_url?: string;
  activo: boolean;
}

export interface Insumo {
  id: string;
  codigo: number;
  nombre: string;
  marca: string;
  categoria: string;
  presentacion: number;
  costo_total: number;
  costo_unitario: number;
  enlace_compra?: string;
  descripcion?: string;
  imagen_url?: string;
  stock_actual?: number;
  permite_fraccion?: boolean;
  unidad_medida?: string;
  activo?: boolean;
}

export interface RepuestoMaquina {
  id: string;
  nombre: string;              // Ej: "Pantalla LCD 4K Mono", "Film FEP 2.0", "Boquilla Latón 0.4mm"
  costo_compra: number;        // Costo de compra del repuesto en COP
  vida_util_horas: number;     // Horas estimadas de vida útil (ej. 2000)
  horas_acumuladas?: number;   // Horas trabajadas con este repuesto
  costo_hora: number;          // Calculado: costo_compra / vida_util_horas
  costo_minuto: number;        // Calculado: costo_hora / 60
  activo: boolean;             // Si se cobra en el tarifario actual
  fecha_instalacion?: string;  // Fecha del último cambio o instalación
}

export interface Maquina {
  id: string;
  nombre: string;
  tipo: string;
  tecnologia?: TecnologiaFabricacion;
  consumo_kwh: number;
  costo_minuto_energia?: number;
  costo_minuto_repuestos?: number;
  costo_minuto: number;
  estado: string;
  imagen_url?: string;
  repuestos?: RepuestoMaquina[];
}

export interface Personal {
  id: string;
  rol: string;
  costo_hora: number;
  costo_minuto: number;
}

export interface Cliente {
  id: string;
  codigo: number;
  nombre: string;
  nit_cc: string;
  telefono: string;
  correo: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  telefono: string;
  rubro: string; // Resinas, Insumos, Ferretería, Maquinaria, etc.
  enlace_web?: string;
}

export interface ConfiguracionTaller {
  tarifa_kwh: number;
  margen_merma_resina: number;
  margen_merma_fdm?: number;
  telefono_contacto: string;
  telefono_contacto2: string;
  correo?: string;
  instagram: string;
  nequi: string;
  bre_b?: string; // Bre-B Llave Única: 0090778625
  daviplata?: string; // Deprecado
  bancolombia?: string; // Deprecado
  titular_cuenta: string;
}

export interface MaquinaInvolucrada {
  maquina_id: string;
  maquina_nombre: string;
  tipo: string;
  proceso: string;
  tiempo_min: number;
  costo_minuto?: number;
  costo_energia?: number;
  costo_repuestos?: number;
  mostrar_en_cliente?: boolean; // Controla si se visualiza en la cotización/factura PDF y WhatsApp para el cliente
}

export interface EnlaceReferenciaCompra {
  id?: string;
  titulo: string;
  url: string;
  costo_estimado?: number;
}

export interface PiezaCotizada {
  id: string;
  nombre_item: string;
  cantidad: number;
  alto_mm: number;
  ancho_mm: number;
  profundidad_mm: number;
  volumen_cm3: number;
  peso_estimado_g: number;
  resina_id: string;
  resina_nombre: string;
  maquina_id: string;
  maquina_nombre: string;
  tiempo_impresion_min: number;
  tiempo_desarrollo_min: number;
  tiempo_armado_min: number;
  tiempo_pintura_min: number;
  costo_energia: number;
  costo_repuestos_maquina?: number;
  costo_resina: number;
  costo_curado: number;
  costo_insumos: number;
  costo_mano_obra: number;
  costo_modelo_comprado: number;
  costo_base_produccion: number;
  margen_ganancia: number;
  precio_unitario: number;
  precio_total: number;
  tiempo_entrega: string;
  descripcion_tecnica: string;
  imagen_url?: string;
  gramos_resina_manual?: number;
  modo_calculo_resina?: 'volumen' | 'manual';
  tipo_estructura?: 'solido' | 'ahuecado';
  porcentaje_relleno?: number;
  lista_pinturas?: { insumo_id?: string; nombre: string; cantidad_ml: number; costo: number }[];
  lista_accesorios?: {
    insumo_id?: string;
    nombre: string;
    cantidad: number; // Fracción o cantidad decimal equivalente en unidades (ej. 0.05 para 5%, 0.2 para 0.2 und)
    modo_consumo?: 'unidad' | 'porcentaje';
    valor_entrada?: number; // Ej: 5 (cuando es 5%) o 0.2 (cuando es fracción/unidad)
    costo: number;
  }[];
  lista_empaques?: { insumo_id?: string; nombre: string; cantidad: number; costo: number }[];
  tiene_empaque?: boolean;
  va_pintado?: boolean;
  costo_empaque?: number;
  requiere_curado?: boolean;
  curado_maquina_id?: string;
  tiempo_curado_min?: number;
  tiempo_curado_personalizado?: boolean;
  requiere_compresor_pintura?: boolean;
  compresor_maquina_id?: string;
  tiempo_compresor_min?: number;
  tiempo_compresor_sincronizado?: boolean;
  tiempo_impresion_modo?: 'auto' | 'manual';
  maquinas_involucradas?: MaquinaInvolucrada[];
  enlaces_compra?: EnlaceReferenciaCompra[];
  datos_pendientes?: boolean;
  notas_pendientes?: string;
  tarifa_tamano_aplicada?: {
    altura_cm: number;
    precio_sugerido: number;
  };
  precio_fijado_tarifa?: boolean;
  // Descuentos por Cantidad / Volumen
  aplica_descuento_volumen?: boolean;
  descuento_volumen_porcentaje?: number;
  descuento_volumen_monto?: number;
  precio_unitario_original?: number;

  // Multi-Fabricación Polimórfica
  tecnologia?: TecnologiaFabricacion;
  // FDM Filamento
  material_filamento?: string;
  filamento_id?: string;
  filamento_nombre?: string;
  filamento_marca?: string;
  filamento_color?: string;
  peso_filamento_g?: number;
  costo_filamento_kg?: number;
  desgaste_boquilla_costo?: number;
  merma_porcentaje?: number;
  // Corte & Grabado Láser CO2
  material_lamina?: string;
  espesor_lamina_mm?: number;
  longitud_corte_mm?: number;
  area_lamina_cm2?: number;
  tiempo_laser_min?: number;
  desgaste_tubo_laser_costo?: number;
  tipo_proceso_laser?: 'corte' | 'grabado' | 'ambos';
  // Router CNC
  material_bloque?: string;
  tiempo_mecanizado_min?: number;
  desgaste_fresa_costo?: number;
  // Diccionario genérico de parámetros
  parametros_tecnicos?: Record<string, any>;
}

export type TecnologiaFabricacion = 
  | 'SLA_RESINA' 
  | 'FDM_FILAMENTO' 
  | 'CORTE_LASER' 
  | 'GRABADO_LASER' 
  | 'CNC_ROUTER' 
  | 'OTRO';

export interface TarifaTamano {
  id: string;
  altura_cm: number;
  precio_sugerido: number;
  descripcion?: string;
  tiempo_estimado?: string;
  cm?: number;
  precio_cop?: number;
}

export type MotivoProduccionInterna = 
  | 'EXHIBICION' 
  | 'PRUEBA_CALIBRACION' 
  | 'MUESTRA_COMERCIAL' 
  | 'DESARROLLO_INTERNO'
  | 'DESPERDICIO_FALLA';

export interface RegistroProduccionInterna {
  id: string;
  nombre_pieza: string;
  motivo: MotivoProduccionInterna;
  tecnologia: TecnologiaFabricacion;
  material_id: string;
  material_nombre: string;
  peso_consumido_g: number;
  tiempo_minutos: number;
  costo_total_estimado: number;
  maquina_id?: string;
  maquina_nombre?: string;
  fecha: string;
  responsable: string;
  notas?: string;
}

export type EstadoCotizacion = 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Facturada' | 'Parcial';

export type EstadoPago = 'Pendiente' | 'Abono Parcial' | 'Pagado Total';

export interface DatosPagoRegistro {
  estado_pago: EstadoPago;
  abono: number;
  saldo_pendiente: number;
  metodo_pago?: string;
  comprobante_pago?: string;
}

export interface Cotizacion {
  id: string;
  numero_cot: string; // ej: 25-074
  cliente: Cliente;
  vendedor: string;
  fecha: string;
  estado: EstadoCotizacion;
  items: PiezaCotizada[];
  subtotal: number;
  iva_porcentaje: number;
  iva_monto?: number;
  descuento_porcentaje: number;
  descuento_monto?: number;
  ahorro_volumen_total?: number;
  total: number;
  tiempo_entrega_estimado: string;
  notas: string;
  
  // Estado Financiero y Anticipos
  estado_pago?: EstadoPago;
  abono?: number;
  saldo_pendiente?: number;
  metodo_pago?: string;
  comprobante_pago?: string;
  tracking_token?: string;
}

export type EstadoOT = 'En Cola' | 'Imprimiendo' | 'Curado' | 'Pintura y Armado' | 'Control de Calidad' | 'Listo para Entrega' | 'Entregado';

export type EstadoSTL = 'Modelado Pendiente' | 'Diseñado por Germán' | 'Laminado por Juan' | 'En Impresora' | 'Impreso';

export interface OrdenTrabajo {
  id: string;
  numero_ot: string; // ej: OT-0012
  cotizacion_id: string;
  cotizacion_numero: string;
  cliente_nombre: string;
  cliente_telefono: string;
  item_nombre: string;
  cantidad: number;
  estado: EstadoOT;
  operador_asignado: string;
  tracking_token?: string;
  fecha_creacion: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_finalizacion?: string;
  tiempo_impresion_min: number;
  tiempo_armado_min: number;
  tiempo_pintura_min: number;
  resina_nombre: string;
  maquina_nombre: string;
  maquinas_involucradas?: MaquinaInvolucrada[];
  enlaces_compra?: EnlaceReferenciaCompra[];
  lista_empaques?: { insumo_id?: string; nombre: string; cantidad: number; costo: number }[];
  lista_accesorios?: {
    insumo_id?: string;
    nombre: string;
    cantidad: number;
    modo_consumo?: 'unidad' | 'porcentaje';
    valor_entrada?: number;
    costo: number;
  }[];
  lista_pinturas?: { insumo_id?: string; nombre: string; cantidad_ml: number; costo: number }[];
  tiene_empaque?: boolean;
  va_pintado?: boolean;
  detalles_tecnicos: string;
  imagen_url?: string;
  observaciones?: string;
  peso_estimado_g?: number;
  resina_id?: string;
  tecnologia?: TecnologiaFabricacion;
  filamento_id?: string;
  filamento_nombre?: string;
  inventario_descontado?: boolean;
  
  // Trazabilidad de Modelos 3D y STL (Germán ➔ Juan)
  stl_url?: string;
  stl_estado?: EstadoSTL;
  stl_modelador?: string;
  stl_operador?: string;
  stl_version?: string;
  stl_notas?: string;
  altura_cm_tarifario?: number;
  precio_cobrado?: number;
  es_proyecto_rapido?: boolean;
  pos_venta_id?: string;

  // Estado Financiero y Pago
  estado_pago?: EstadoPago;
  abono?: number;
  saldo_pendiente?: number;
  metodo_pago?: string;
  comprobante_pago?: string;
}

export interface CuentaCobro {
  id: string;
  numero_cc: string; // ej: CC-0051
  cotizacion_id: string;
  cotizacion_numero: string;
  cliente: Cliente;
  fecha_emision: string;
  items_resumen: string;
  subtotal?: number;
  descuento_porcentaje?: number;
  descuento_monto?: number;
  iva_porcentaje?: number;
  iva_monto?: number;
  iva_regimen_nota?: string;
  total: number;
  abono: number;
  saldo_pendiente: number;
  estado_pago: EstadoPago;
  metodo_pago?: string;
  comprobante_url?: string;
}

export interface PaymentRecord {
  id: string;
  monto: number;
  metodo_pago: string;
  referencia_pago?: string;
  comprobante_url?: string;
  nota?: string;
  cliente_id?: string;
  cotizacion_id?: string;
  orden_trabajo_id?: string;
  pos_venta_id?: string;
  cuenta_cobro_id?: string;
  origen_modulo: 'pos' | 'cotizacion' | 'taller' | 'cuenta_cobro';
  registrado_por?: string;
  fecha_pago?: string;
  created_at?: string;
}

export interface WhatsAppHealthStatus {
  status: 'operativo' | 'alerta_critica' | 'desconocido';
  linea_oficial: string;
  linea_oficial_clean?: string;
  motor_activo: boolean;
  total_ultimas_24h: number;
  enviados_24h: number;
  fallidos_24h: number;
  pendientes_cola: number;
  estancados_mas_15m: number;
  tasa_fallo_pct: number;
  mensajes_programados_hoy: number;
  alerta_mensaje: string;
  evaluado_at?: string;
}

export interface WhatsAppPingResult {
  valido: boolean;
  proveedor: string;
  linea_oficial: string;
  verified_name?: string;
  quality_rating?: string;
  modo: string;
  mensaje: string;
  error?: string;
}

export interface DailyBriefingData {
  success: boolean;
  fecha_reporte: string;
  fecha_texto: string;
  whatsapp_health?: WhatsAppHealthStatus;
  finanzas_cobranzas?: {
    total_cobros_hoy: number;
    total_cartera_mora: number;
    clientes_cobro_hoy: any[];
    clientes_mora: any[];
    llave_bre_b: string;
  };
  taller_operaciones?: {
    conteo_ots_entrega_hoy: number;
    ots_entrega_hoy: any[];
    ots_en_proceso_taller: number;
    ots_control_calidad: number;
    ots_listas_entrega: number;
  };
  insumos_logistica?: {
    conteo_insumos_urgentes: number;
    insumos_criticos: any[];
  };
  acciones_recomendadas?: string[];
  mensaje_whatsapp: string;
}
