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
}

export type UrgenciaInsumo = 'normal' | 'urgente' | 'taller_detenido';

export type EstadoSolicitudInsumo = 'pendiente' | 'orden_enviada' | 'comprado' | 'en_camino' | 'recibido';

export interface SolicitudInsumo {
  id: string;
  insumo_nombre: string;
  categoria?: string; // Resina, Pintura, Pincel, Alcohol, Ferretería, Empaque
  cantidad: number;
  unidad: string; // botes, unidades, litros, ml, gramos
  urgencia: UrgenciaInsumo;
  solicitado_por: IntegranteEquipo | string; // Juan, Germán, Pintor
  encargado_compra: IntegranteEquipo; // Wendy, Germán
  estado: EstadoSolicitudInsumo;
  enlace_compra?: string;
  proveedor_sugerido?: string;
  notas?: string;
  fecha_solicitud: string;
  fecha_atendida?: string;
}
