import { 
  OrdenTrabajo, 
  EstadoOT, 
  ConfiguracionTaller, 
  TarifaTamano, 
  Cliente, 
  EstadoSTL, 
  Cotizacion, 
  EstadoCotizacion,
  EnlaceReferenciaCompra,
  DatosPagoRegistro
} from '../../../types';

export interface WorkOrdersPipelineProps {
  ordenes: OrdenTrabajo[];
  config: ConfiguracionTaller;
  cotizaciones?: Cotizacion[];
  tarifasTamanos?: TarifaTamano[];
  clientes?: Cliente[];
  onUpdateEstado: (otId: string, nuevoEstado: EstadoOT) => void;
  onGenerarCuentaCobro?: (ot: OrdenTrabajo) => void;
  onCrearOrdenRapida?: (nuevaOT: OrdenTrabajo, crearCobroPOS?: boolean) => void;
  onActualizarOT?: (otActualizada: OrdenTrabajo) => void;
  onEliminarOT?: (otId: string, motivo: string, revertirCotizacion?: boolean, nuevoEstadoCot?: EstadoCotizacion) => void;
  onNavigateToCotizaciones?: (cotNumeroOId?: string) => void;
}

export interface HandoffConfig {
  label: string;
  nombre: string;
  telefono: string;
  icono: string;
  title: string;
  mensaje: string;
}

export interface ModalLinkItem {
  id?: string;
  titulo: string;
  url: string;
  costo_estimado?: number;
}
