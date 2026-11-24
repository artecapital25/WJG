export type IntegranteEquipo = 'Germán' | 'Wendy' | 'Juan' | 'Todos';

export type PrioridadTarea = 'baja' | 'media' | 'alta' | 'urgente';

export type TipoTarea = 'puntual' | 'periodica';

export type FrecuenciaRecurrencia = 'diaria' | 'semanal' | 'quincenal' | 'mensual';

export interface TareaEquipo {
  id: string;
  titulo: string;
  descripcion?: string;
  asignado_a: IntegranteEquipo;
  tipo: TipoTarea;
  frecuencia?: FrecuenciaRecurrencia;
  prioridad: PrioridadTarea;
  completada: boolean;
  fecha_limite?: string;
  origen?: 'whatsapp' | 'manual' | 'taller';
  fecha_creacion: string;
  fecha_completada?: string;
  porcentaje_completado?: number;
  ultimo_avance_at?: string;
  total_avances?: number;
}

export interface TareaAvance {
  id: string;
  tarea_id: string;
  usuario_id?: string;
  usuario_nombre: string;
  nota_avance: string;
  porcentaje_avance?: number;
  created_at: string;
}

export interface TareaAvanceInput {
  tarea_id: string;
  usuario_id?: string;
  usuario_nombre: string;
  nota_avance: string;
  porcentaje_avance?: number;
}

export type UrgenciaInsumo = 'normal' | 'urgente' | 'taller_detenido';

export type EstadoSolicitudInsumo =
  | 'pendiente'
  | 'en_gestion'
  | 'orden_enviada'
  | 'comprado'
  | 'en_camino'
  | 'recibido'
  | 'cancelado';

export type TipoCompraInsumo = 'internet' | 'local';

export type CatalogoTipoVinculo = 'insumo' | 'resina' | 'filamento';

export interface SolicitudInsumo {
  id: string;
  insumo_nombre: string;
  categoria?: string; // Resina, Filamento, Pintura, Pincel, Alcohol, Ferretería, Empaque
  cantidad: number;
  unidad: string; // botes, bobinas, unidades, litros, ml, gramos
  urgencia: UrgenciaInsumo;
  solicitado_por: IntegranteEquipo | string; // Juan, Germán, Wendy, Sistema Bodega (Auto)
  encargado_compra: IntegranteEquipo; // Wendy, Germán, Juan, Todos
  estado: EstadoSolicitudInsumo;
  enlace_compra?: string;
  proveedor_sugerido?: string;
  notas?: string;
  fecha_solicitud: string;
  fecha_atendida?: string;
  // Gestión logística, compras por internet y trazabilidad de bodega
  tipo_compra?: TipoCompraInsumo;
  plataforma_tienda?: string;
  numero_pedido?: string;
  transportadora?: string;
  numero_guia?: string;
  enlace_rastreo?: string;
  fecha_estimada_llegada?: string;
  costo_estimado?: number;
  costo_real?: number;
  origen_tipo?: 'manual' | 'auto_stock_bajo';
  catalogo_tipo?: CatalogoTipoVinculo;
  catalogo_item_id?: string;
  stock_reabastecido?: boolean;
}
