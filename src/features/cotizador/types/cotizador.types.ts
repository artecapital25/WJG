import { 
  Resina, 
  Maquina, 
  Insumo, 
  Personal, 
  ConfiguracionTaller, 
  PiezaCotizada,
  TarifaTamano 
} from '../../../types';

export interface ItemPinturaForm {
  tempId: string;
  insumoId: string;
  cantidadMl: number;
}

export interface ItemAccesorioForm {
  tempId: string;
  insumoId: string;
  cantidad: number;
}

export interface ItemMaquinaExtraForm {
  tempId: string;
  maquinaId: string;
  proceso: string;
  tiempoMin: number;
  mostrarEnCliente?: boolean;
}

export interface ItemEmpaqueForm {
  tempId: string;
  insumoId: string;
  cantidad: number;
}

export interface ItemEnlaceCompraForm {
  tempId: string;
  titulo: string;
  url: string;
  costoEstimado?: number;
}

export interface CotizadorFormProps {
  resinas: Resina[];
  maquinas: Maquina[];
  insumos: Insumo[];
  personal: Personal[];
  config: ConfiguracionTaller;
  tarifasTamanos?: TarifaTamano[];
  onAgregarPieza: (pieza: PiezaCotizada) => void;
  onOpenSTLViewer?: () => void;
  onNavigateToCatalogos?: () => void;
  initialPieceData?: {
    altoMm?: number;
    anchoMm?: number;
    profundidadMm?: number;
    pesoResinaG?: number;
    nombrePieza?: string;
    imagenUrl?: string;
    tipoEstructura?: 'solido' | 'ahuecado';
    porcentajeRelleno?: number;
  } | null;
  piezaEnEdicion?: PiezaCotizada | null;
  onCancelarEdicionPieza?: () => void;
}

export interface CotizacionBuilderProps {
  items: PiezaCotizada[];
  clientes: import('../../../types').Cliente[];
  config: ConfiguracionTaller;
  cotizaciones?: import('../../../types').Cotizacion[];
  cotizacionEnEdicion?: import('../../../types').Cotizacion | null;
  resinas?: Resina[];
  maquinas?: Maquina[];
  insumos?: Insumo[];
  onCancelarEdicion?: () => void;
  onRemoveItem: (id: string) => void;
  onUpdatePiece?: (item: PiezaCotizada) => void;
  onUpdatePieceQuantity?: (id: string, newCantidad: number) => void;
  onUpdatePieceImage?: (id: string, imagenUrl: string) => void;
  onSaveCotizacion: (cotizacion: import('../../../types').Cotizacion) => void;
  onAddCliente: (cliente: import('../../../types').Cliente) => void;
  onLoadPieceToCalculator?: (item: PiezaCotizada) => void;
}

export interface CotizadorItemListProps {
  items: PiezaCotizada[];
  onRemoveItem: (id: string) => void;
  onUpdatePieceQuantity?: (id: string, newCantidad: number) => void;
  onUpdatePieceImage?: (id: string, imagenUrl: string) => void;
  onOpenEditPiece: (item: PiezaCotizada) => void;
  onPreviewImage: (preview: { url: string; title: string }) => void;
  onItemImageUpload: (itemId: string, file: File) => void;
}

export interface CotizadorPaymentWarningProps {
  total: number;
  estadoPagoInicial: import('../../../types').EstadoPago;
  setEstadoPagoInicial: (estado: import('../../../types').EstadoPago) => void;
  abonoInicial: number;
  setAbonoInicial: (abono: number) => void;
  metodoPagoInicial: string;
  setMetodoPagoInicial: (metodo: string) => void;
  abonoEfectivo: number;
  saldoPendiente: number;
}

export interface CotizadorTotalsSummaryProps {
  subtotal: number;
  descuentoPorcentaje: number;
  setDescuentoPorcentaje: (desc: number) => void;
  descuentoMonto: number;
  total: number;
  tipoEstado: 'Enviada' | 'Parcial' | 'Borrador';
  setTipoEstado: (tipo: 'Enviada' | 'Parcial' | 'Borrador') => void;
  vendedorNombre: string;
  setVendedorNombre: (nombre: string) => void;
  notas: string;
  setNotas: (notas: string) => void;
  tieneItemsPendientes: boolean;
  esEdicion: boolean;
  numeroCotFinal: string;
  onSave: () => void;
  onSendWhatsApp: () => void;
  onSharePDFWhatsApp: () => void;
  onDownloadPDF: () => void;
  onCancelarEdicion?: () => void;
}
