export type EstadoPagoExpress = 'Pagado Total' | 'Abono Parcial' | 'Pendiente';

export interface VentaExpress {
  id: string;
  numero_venta: string; // ej: POS-001
  foto_url?: string;
  nombre_producto: string;
  cliente_nombre: string;
  cliente_telefono: string;
  total: number;
  abono: number;
  saldo_pendiente: number;
  estado_pago: EstadoPagoExpress;
  fecha_venta: string; // YYYY-MM-DD
  fecha_prometida_pago?: string; // YYYY-MM-DD
  notas?: string;
  metodo_pago?: string; // Nequi, Daviplata, Efectivo, Bancolombia
  creado_por?: string; // Germán, Wendy, Juan
  notificado_whatsapp?: boolean;
}

export type NivelAlertaPago = 'vencido' | 'hoy' | 'proximo' | 'al_dia' | 'pagado';

export interface AlertaCobroInfo {
  nivel: NivelAlertaPago;
  diasDiferencia: number;
  texto: string;
  color: string;
  badgeBg: string;
}

export interface DeudorConsolidado {
  cliente_nombre: string;
  cliente_telefono: string;
  total_deuda: number;
  total_abonos: number;
  saldo_pendiente_total: number;
  ventas_pendientes: VentaExpress[];
  cuentas_pendientes_ids: string[];
  peor_alerta: NivelAlertaPago;
  fecha_proximo_pago?: string;
}
