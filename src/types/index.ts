export type TabType = 'cotizador' | 'workflow' | 'cotizaciones' | 'cuentas' | 'catalogos' | 'plan' | 'stl' | 'stock';

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
}

export interface Maquina {
  id: string;
  nombre: string;
  tipo: string;
  consumo_kwh: number;
  costo_minuto: number;
  estado: string;
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
  telefono_contacto: string;
  telefono_contacto2: string;
  instagram: string;
  nequi: string;
  daviplata: string;
  bancolombia: string;
  titular_cuenta: string;
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
  lista_pinturas?: { nombre: string; cantidad_ml: number; costo: number }[];
  lista_accesorios?: { nombre: string; cantidad: number; costo: number }[];
  datos_pendientes?: boolean;
  notas_pendientes?: string;
  tarifa_tamano_aplicada?: {
    altura_cm: number;
    precio_sugerido: number;
  };
  precio_fijado_tarifa?: boolean;
}

export interface TarifaTamano {
  id: string;
  altura_cm: number;
  precio_sugerido: number;
  descripcion?: string;
  tiempo_estimado?: string;
}

export type EstadoCotizacion = 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Facturada' | 'Parcial';

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
  descuento_porcentaje: number;
  total: number;
  tiempo_entrega_estimado: string;
  notas: string;
}

export type EstadoOT = 'En Cola' | 'Imprimiendo' | 'Curado' | 'Pintura y Armado' | 'Control de Calidad' | 'Listo para Entrega';

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
  fecha_creacion: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  tiempo_impresion_min: number;
  tiempo_armado_min: number;
  tiempo_pintura_min: number;
  resina_nombre: string;
  maquina_nombre: string;
  detalles_tecnicos: string;
  imagen_url?: string;
  observaciones?: string;
}

export type EstadoPago = 'Pendiente' | 'Abono Parcial' | 'Pagado Total';

export interface CuentaCobro {
  id: string;
  numero_cc: string; // ej: CC-0051
  cotizacion_id: string;
  cotizacion_numero: string;
  cliente: Cliente;
  fecha_emision: string;
  items_resumen: string;
  total: number;
  abono: number;
  saldo_pendiente: number;
  estado_pago: EstadoPago;
  metodo_pago?: string;
  comprobante_url?: string;
}
