// ==============================================================================
// WJGEEKS 3D PRO - TIPOS TYPESCRIPT ESTRICTOS CORE V3.0 (POSTGRESQL NORMALIZADO)
// ==============================================================================

export type TipoMetodoPago = 'NEQUI' | 'BRE_B' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

export type EstadoCotizacionEnum = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'CANCELADA' | 'EXPIRADA';

export type EstadoOTCodigo = 
  | 'COTIZACION'
  | 'EN_COLA_OT'
  | 'IMPRESION'
  | 'CURADO'
  | 'PINTADO_ARMADO'
  | 'CONTROL_CALIDAD'
  | 'ENTREGADO'
  | 'CANCELADO';

export type CanalNotificacionEnum = 'WHATSAPP_CLOUD_API' | 'WHATSAPP_WEB_DIRECT' | 'SISTEMA_INTERNO';

export type EstadoNotificacionEnum = 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | 'CANCELADO';

export interface UsuarioTaller {
  id: string;
  nombre: 'Juan' | 'Wendy' | 'Germán' | string;
  rol: 'IMPRESION_MANTENIMIENTO' | 'PINTURA_ACABADOS' | 'ADMIN_COBRANZAS' | string;
  telefono: string;
  telefono_notificaciones: string;
  pin_acceso?: string;
  activo: boolean;
  created_at?: string;
}

export interface ClienteRecord {
  id: string;
  nombre: string;
  telefono: string;
  nit_cc?: string;
  correo?: string;
  direccion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CotizacionRecord {
  id: string;
  numero_cot: string; // ej: COT-26-001
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  subtotal: number;
  descuento_porcentaje: number;
  total: number;
  estado: EstadoCotizacionEnum;
  tiempo_entrega_estimado: string;
  notas?: string;
  fecha_emision?: string;
  vigencia_dias?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EstadoOTRecord {
  codigo: EstadoOTCodigo;
  nombre: string;
  orden_secuencia: number;
  responsable_defecto_id?: string;
  requiere_notificacion_equipo: boolean;
  notificar_cliente: boolean;
  descripcion?: string;
}

export interface OrdenTrabajoRecord {
  id: string;
  numero_ot: string; // ej: OT-26-001
  cotizacion_id: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  item_descripcion: string;
  cantidad: number;
  total_ot: number;
  total_abonado: number;
  saldo_pendiente: number; // GENERATED ALWAYS AS (total_ot - total_abonado) STORED
  estado_actual: EstadoOTCodigo;
  responsable_actual_id?: string;
  tracking_token: string;
  stl_url?: string;
  dimensiones_xyz?: string;
  peso_resina_g?: number;
  fecha_aprobacion?: string;
  fecha_entrega_prometida?: string;
  fecha_finalizacion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HistorialEstadoOTRecord {
  id: string;
  orden_trabajo_id: string;
  estado_anterior?: EstadoOTCodigo;
  estado_nuevo: EstadoOTCodigo;
  modificado_por?: string;
  observaciones?: string;
  cambiado_at: string;
}

export interface AbonoPagoRecord {
  id: string;
  orden_trabajo_id: string;
  cotizacion_id?: string;
  monto: number;
  metodo_pago: TipoMetodoPago;
  referencia_transaccion?: string;
  comprobante_url?: string;
  cuenta_receptora: string;
  registrado_por?: string;
  nota?: string;
  fecha_pago?: string;
  created_at?: string;
}

export interface RegistroNotificacionRecord {
  id: string;
  idempotency_key: string;
  orden_trabajo_id?: string;
  destinatario_nombre: string;
  destinatario_telefono: string;
  rol_destinatario: 'CLIENTE' | 'JUAN_TALLER' | 'WENDY_PINTURA' | 'GERMAN_ADMIN' | 'TRIPARTITO' | string;
  canal: CanalNotificacionEnum;
  plantilla_hsm?: string;
  variables_plantilla?: Record<string, string>;
  mensaje_plano: string;
  estado: EstadoNotificacionEnum;
  intentos: number;
  ultimo_error?: string;
  id_externo_meta?: string;
  created_at?: string;
  enviado_at?: string;
}
