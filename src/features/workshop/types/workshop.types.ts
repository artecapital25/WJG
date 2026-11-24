import { 
  OrdenTrabajo, 
  EstadoOT, 
  ConfiguracionTaller, 
  TarifaTamano, 
  Cliente, 
  Cotizacion, 
  EstadoCotizacion,
  Insumo,
  Resina,
  Filamento,
  Personal,
  ConsumoRealProduccion,
  TratamientoAbonoOT
} from '../../../types';
import { UsuarioTaller } from '../../../types/usuarios.types';

export interface WorkOrdersPipelineProps {
  ordenes: OrdenTrabajo[];
  config: ConfiguracionTaller;
  cotizaciones?: Cotizacion[];
  tarifasTamanos?: TarifaTamano[];
  clientes?: Cliente[];
  insumos?: Insumo[];
  resinas?: Resina[];
  filamentos?: Filamento[];
  personal?: Personal[];
  usuarios?: UsuarioTaller[];
  consumosReales?: ConsumoRealProduccion[];
  activeOperator?: string;
  activeOperatorId?: string;
  onSaveConsumoReal?: (registro: ConsumoRealProduccion, descontarInventario: boolean) => void;
  onDeleteConsumoReal?: (consumoId: string) => void;
  onUpdateEstado: (otId: string, nuevoEstado: EstadoOT) => void;
  onGenerarCuentaCobro?: (ot: OrdenTrabajo) => void;
  onCrearOrdenRapida?: (nuevaOT: OrdenTrabajo, crearCobroPOS?: boolean) => void;
  onActualizarOT?: (otActualizada: OrdenTrabajo) => void;
  onEliminarOT?: (otId: string, motivo: string, revertirCotizacion?: boolean, nuevoEstadoCot?: EstadoCotizacion, tratamientoAbono?: TratamientoAbonoOT) => void;
  onNavigateToCotizaciones?: (cotNumeroOId?: string) => void;
  onOpenProduccionInterna?: () => void;
}

export interface HandoffConfig {
  label: string;
  nombre: string;
  telefono: string;
  correo?: string;
  isGrupoEquipo?: boolean;
  isCliente?: boolean;
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
