export type TipoEventoCalendario = 
  | 'tarea_individual' 
  | 'tarea_grupal' 
  | 'rutina_diaria' 
  | 'vencimiento_cobro' 
  | 'entrega_pedido' 
  | 'llegada_insumo' 
  | 'vencimiento_cotizacion';

export type EstadoEventoCalendario = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';

export interface CalendarEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string; // ISO string o YYYY-MM-DD
  fecha_fin?: string;
  hora?: string;
  todo_el_dia?: boolean;
  tipo_evento: TipoEventoCalendario;
  color: string;
  monto?: number;
  cliente_nombre?: string;
  responsable: string; // 'Germán' | 'Wendy' | 'Juan' | 'Todos'
  responsable_avatar_url?: string;
  es_recurrente?: boolean;
  regla_recurrencia?: 'diaria' | 'semanal' | 'quincenal' | 'mensual';
  estado: EstadoEventoCalendario;
  entidad_origen_tipo?: 'orden_trabajo' | 'cuenta_cobro' | 'cotizacion' | 'tarea_equipo' | 'solicitud_insumo' | 'evento_manual';
  entidad_origen_id?: string;
  created_at?: string;
}

export interface FiltrosCalendario {
  responsable: string; // 'todos' | 'Germán' | 'Wendy' | 'Juan'
  tipoEvento: string;  // 'todos' | TipoEventoCalendario
  estado: string;      // 'todos' | EstadoEventoCalendario
  busqueda: string;
}
