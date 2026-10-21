import React, { useState, useRef } from 'react';
import { 
  Kanban, 
  Play, 
  CheckCircle, 
  RotateCw, 
  Clock, 
  User, 
  MessageCircle, 
  Sparkles, 
  ChevronRight, 
  Filter, 
  ShoppingCart, 
  ExternalLink,
  Compass,
  Copy,
  Check,
  Plus,
  Box,
  Send,
  Camera,
  Layers,
  FileCode,
  Share2,
  DollarSign,
  FileText,
  Globe,
  Link2,
  X,
  Trash2,
  CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';
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
} from '../../types';
import { toast } from '../ui/ToastProvider';
import { formatWhatsAppPhone, openWhatsApp } from '../../services/whatsappService';
import { processAndOptimizeImage } from '../../services/imageService';
import { StorageService } from '../../services/storageService';
import { detect3DPlatform, formatExternalUrl } from '../../services/platformUtils';
import { ModalRegistrarPago } from '../common/ModalRegistrarPago';
import { ModalEliminarOT } from '../common/ModalEliminarOT';

interface WorkOrdersPipelineProps {
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

const ETAPAS: EstadoOT[] = [
  'En Cola',
  'Imprimiendo',
  'Curado',
  'Pintura y Armado',
  'Control de Calidad',
  'Listo para Entrega'
];

const ESTADOS_STL: EstadoSTL[] = [
  'Modelado Pendiente',
  'Diseñado por Germán',
  'Laminado por Juan',
  'En Impresora',
  'Impreso'
];

export const WorkOrdersPipeline: React.FC<WorkOrdersPipelineProps> = ({
  ordenes,
  config,
  cotizaciones = [],
  tarifasTamanos = [],
  clientes = [],
  onUpdateEstado,
  onGenerarCuentaCobro,
  onCrearOrdenRapida,
  onActualizarOT,
  onEliminarOT,
  onNavigateToCotizaciones
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [copiedOtId, setCopiedOtId] = useState<string | null>(null);
  const [notifEliminacion, setNotifEliminacion] = useState<string | null>(null);

  // Modal Proyecto Rápido (Tarifario Express)
  const [showModalRapido, setShowModalRapido] = useState(false);
  const [fotoUrlRapida, setFotoUrlRapida] = useState('');
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [nombreItemRapido, setNombreItemRapido] = useState('');
  const [clienteNombreRapido, setClienteNombreRapido] = useState('');
  const [clienteTelefonoRapido, setClienteTelefonoRapido] = useState('');
  const [alturaSeleccionada, setAlturaSeleccionada] = useState<number>(8);
  const [crearCobroPOS, setCrearCobroPOS] = useState<boolean>(true);

  // Modal Edición / Trazabilidad STL
  const [otParaSTL, setOtParaSTL] = useState<OrdenTrabajo | null>(null);
  const [inputStlUrl, setInputStlUrl] = useState('');
  const [inputStlVersion, setInputStlVersion] = useState('v1.0');
  const [inputStlEstado, setInputStlEstado] = useState<EstadoSTL>('Diseñado por Germán');

  // Modal Detalle de Cotización Vinculada (Enlace OT ➔ Cotización)
  const [selectedCotizacionForModal, setSelectedCotizacionForModal] = useState<Cotizacion | null>(null);

  // Modal de Gestión de Enlaces Web / Compra del Modelo 3D para la OT
  const [otParaEditarLinks, setOtParaEditarLinks] = useState<OrdenTrabajo | null>(null);
  const [modalLinksList, setModalLinksList] = useState<{ id?: string; titulo: string; url: string; costo_estimado?: number }[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Modal de Gestión de Pago para la OT
  const [otParaPago, setOtParaPago] = useState<OrdenTrabajo | null>(null);

  // Modal de Eliminación / Cancelación de OT
  const [otParaEliminar, setOtParaEliminar] = useState<OrdenTrabajo | null>(null);

  const handleConfirmarEliminarOT = (
    otId: string, 
    motivo: string, 
    revertirCotizacion?: boolean, 
    nuevoEstadoCot?: EstadoCotizacion
  ) => {
    if (onEliminarOT) {
      const otBorrada = ordenes.find(o => o.id === otId);
      onEliminarOT(otId, motivo, revertirCotizacion, nuevoEstadoCot);
      setNotifEliminacion(`✅ Orden ${otBorrada?.numero_ot || ''} eliminada correctamente.`);
      setTimeout(() => setNotifEliminacion(null), 4500);
    }
    setOtParaEliminar(null);
  };

  const handleConfirmarPagoOT = (datos: DatosPagoRegistro) => {
    if (!otParaPago || !onActualizarOT) return;
    const updatedOT: OrdenTrabajo = {
      ...otParaPago,
      estado_pago: datos.estado_pago,
      abono: datos.abono,
      saldo_pendiente: datos.saldo_pendiente,
      metodo_pago: datos.metodo_pago,
      comprobante_pago: datos.comprobante_pago
    };
    onActualizarOT(updatedOT);
    setOtParaPago(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSiguienteEstado = (actual: EstadoOT): EstadoOT | null => {
    const idx = ETAPAS.indexOf(actual);
    if (idx >= 0 && idx < ETAPAS.length - 1) {
      return ETAPAS[idx + 1];
    }
    return null;
  };

  const handleCopyTrackingLink = (ot: OrdenTrabajo) => {
    const trackingUrl = `${window.location.origin}/?portal=cliente&ot=${encodeURIComponent(ot.numero_ot)}`;
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopiedOtId(ot.id);
      setTimeout(() => setCopiedOtId(null), 2500);
    });
  };

  const handleNotificarCliente = (ot: OrdenTrabajo) => {
    const phone = formatWhatsAppPhone(ot.cliente_telefono);
    const trackingUrl = `${window.location.origin}/?portal=cliente&ot=${encodeURIComponent(ot.numero_ot)}`;
    const mensaje = 
`👋 ¡Hola *${ot.cliente_nombre}*! 
Desde el taller de *WJGEEKS 3D* te informamos sobre el avance de tu orden:

📦 *Orden de Trabajo:* ${ot.numero_ot} (${ot.cotizacion_numero})
🛠️ *Pieza:* ${ot.item_nombre} (Cant: ${ot.cantidad})
🚦 *Estado Actual:* *${ot.estado}* ✨

${ot.estado === 'Imprimiendo' ? '⏳ La pieza se encuentra en la Anycubic MONO 4 en proceso de impresión.' : ''}
${ot.estado === 'Curado' ? '☀️ La pieza pasó a lavado y curado UV para máxima resistencia mecánica.' : ''}
${ot.estado === 'Pintura y Armado' ? '🎨 Nuestros artistas están aplicando los acabados y pintura de detalle.' : ''}
${ot.estado === 'Listo para Entrega' ? '🎉 ¡Tu pedido ha superado el control de calidad y está listo para despacho!' : ''}

🔍 Sigue el avance de tu pieza en vivo aquí:
${trackingUrl}

¡Te mantendremos al tanto! 🚀`;

    openWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`);
  };

  // Notificar STL a Juan (WhatsApp interno entre miembros)
  const handleNotificarSTLAJuan = (ot: OrdenTrabajo) => {
    // Teléfono de Juan o del taller
    const mensaje = 
`👋 ¡Hola Juan! 🎨🖨️
Te comparto el modelo 3D listo para impresión en el taller de *WJGEEKS 3D*:

📦 *Orden:* ${ot.numero_ot}
🛠️ *Pieza:* ${ot.item_nombre}
📏 *Altura:* ${ot.altura_cm_tarifario || 10} cm
📁 *Versión STL:* ${ot.stl_version || 'v1.0'}
🚦 *Estado STL:* ${ot.stl_estado || 'Diseñado por Germán'}

${ot.stl_url ? `🔗 *Enlace de descarga:* ${ot.stl_url}` : '📂 *Ubicación:* Archivo en carpeta compartida de taller.'}

Por favor verifica la malla, genera los soportes en Chitubox/Lychee y confirma cuando esté en máquina. ¡Gracias! 🚀`;

    // Abrir WhatsApp con número predeterminado de Juan o general
    openWhatsApp(`https://wa.me/573202796115?text=${encodeURIComponent(mensaje)}`);
  };

  // Subida de imagen para proyecto rápido
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImg(true);
      const opt = await processAndOptimizeImage(file, 800, 800, 0.82);
      setFotoUrlRapida(opt);
    } catch (err) {
      console.error('Error optimizando foto proyecto rápido:', err);
      toast.error('Error al procesar la foto.');
    } finally {
      setIsProcessingImg(false);
    }
  };

  // Guardar Proyecto Rápido (Tarifario Express)
  const handleGuardarProyectoRapido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreItemRapido.trim()) {
      toast.warning('Ingresa el nombre de la figura o proyecto.');
      return;
    }
    if (!clienteNombreRapido.trim()) {
      toast.warning('Ingresa el nombre del cliente.');
      return;
    }

    const tarifaEncontrada = tarifasTamanos.find(t => t.altura_cm === alturaSeleccionada);
    const precioCalculado = tarifaEncontrada 
      ? tarifaEncontrada.precio_sugerido 
      : (alturaSeleccionada * 10000);

    // Consecutivo nuevo garantizado único
    const siguienteNum = StorageService.getNextOTNumber(ordenes);

    const nuevaOT: OrdenTrabajo = {
      id: `ot-${Date.now()}`,
      numero_ot: siguienteNum,
      cotizacion_id: `COT-RAPIDA-${Date.now()}`,
      cotizacion_numero: `RAPIDA-${alturaSeleccionada}CM`,
      cliente_nombre: clienteNombreRapido.trim(),
      cliente_telefono: clienteTelefonoRapido.trim() || '3202796115',
      item_nombre: nombreItemRapido.trim(),
      cantidad: 1,
      estado: 'En Cola',
      operador_asignado: 'Juan (Taller)',
      fecha_creacion: new Date().toISOString(),
      tiempo_impresion_min: Math.round(alturaSeleccionada * 18),
      tiempo_armado_min: 15,
      tiempo_pintura_min: 30,
      resina_nombre: 'Anycubic Standard Grey',
      maquina_nombre: 'Anycubic MONO 4',
      va_pintado: true,
      tiene_empaque: true,
      detalles_tecnicos: `Proyecto Rápido desde Tarifario (${alturaSeleccionada} cm). Precio base fijado: $${precioCalculado.toLocaleString('es-CO')} COP.`,
      imagen_url: fotoUrlRapida || undefined,
      altura_cm_tarifario: alturaSeleccionada,
      precio_cobrado: precioCalculado,
      es_proyecto_rapido: true,
      stl_estado: 'Modelado Pendiente',
      stl_modelador: 'Germán',
      stl_operador: 'Juan'
    };

    if (onCrearOrdenRapida) {
      onCrearOrdenRapida(nuevaOT, crearCobroPOS);
    }

    confetti({ particleCount: 70, spread: 60 });
    setShowModalRapido(false);

    // Reset Form
    setFotoUrlRapida('');
    setNombreItemRapido('');
    setClienteNombreRapido('');
    setClienteTelefonoRapido('');
    setAlturaSeleccionada(8);
  };

  // Abrir modal de trazabilidad STL
  const handleOpenModalSTL = (ot: OrdenTrabajo) => {
    setOtParaSTL(ot);
    setInputStlUrl(ot.stl_url || '');
    setInputStlVersion(ot.stl_version || 'v1.0');
    setInputStlEstado(ot.stl_estado || 'Diseñado por Germán');
  };

  // Guardar actualización de STL
  const handleGuardarSTL = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otParaSTL || !onActualizarOT) return;

    const updated: OrdenTrabajo = {
      ...otParaSTL,
      stl_url: inputStlUrl.trim() || undefined,
      stl_version: inputStlVersion.trim(),
      stl_estado: inputStlEstado
    };

    onActualizarOT(updated);
    setOtParaSTL(null);
  };

  // Helper para resolver los enlaces de compra de un modelo 3D (con fallback a cotización)
  const getLinksDeOT = (ot: OrdenTrabajo): EnlaceReferenciaCompra[] => {
    if (ot.enlaces_compra && ot.enlaces_compra.length > 0) {
      return ot.enlaces_compra;
    }
    if (ot.cotizacion_numero || ot.cotizacion_id) {
      const parentCot = cotizaciones.find(c => 
        (ot.cotizacion_id && c.id === ot.cotizacion_id) || 
        (ot.cotizacion_numero && c.numero_cot === ot.cotizacion_numero)
      );
      if (parentCot && parentCot.items) {
        const matchingItem = parentCot.items.find(it => 
          it.nombre_item?.toLowerCase().trim() === ot.item_nombre?.toLowerCase().trim()
        );
        if (matchingItem?.enlaces_compra && matchingItem.enlaces_compra.length > 0) {
          return matchingItem.enlaces_compra;
        }
      }
    }
    return [];
  };

  // Copiar URL de enlace de modelo 3D
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(formatExternalUrl(url)).then(() => {
      setCopiedLinkId(id);
      setTimeout(() => setCopiedLinkId(null), 2500);
    });
  };

  // Abrir Modal de Detalle de Cotización Vinculada
  const handleOpenCotizacionModal = (ot: OrdenTrabajo) => {
    const parentCot = cotizaciones.find(c => 
      (ot.cotizacion_id && c.id === ot.cotizacion_id) || 
      (ot.cotizacion_numero && c.numero_cot === ot.cotizacion_numero)
    );
    if (parentCot) {
      setSelectedCotizacionForModal(parentCot);
    } else {
      // Sintético para dar visibilidad si no está en memoria
      setSelectedCotizacionForModal({
        id: ot.cotizacion_id || 'cot-ot',
        numero_cot: ot.cotizacion_numero || 'Sin número',
        cliente: {
          id: 'cli',
          codigo: 0,
          nombre: ot.cliente_nombre,
          telefono: ot.cliente_telefono,
          nit_cc: '',
          correo: ''
        },
        vendedor: 'Taller',
        fecha: ot.fecha_creacion?.slice(0, 10) || '',
        estado: 'Aceptada',
        items: [{
          id: 'it-1',
          nombre_item: ot.item_nombre,
          cantidad: ot.cantidad,
          alto_mm: 0,
          ancho_mm: 0,
          profundidad_mm: 0,
          volumen_cm3: 0,
          peso_estimado_g: ot.peso_estimado_g || 0,
          resina_id: ot.resina_id || '',
          resina_nombre: ot.resina_nombre,
          maquina_id: 'maq-1',
          maquina_nombre: ot.maquina_nombre,
          tiempo_impresion_min: ot.tiempo_impresion_min || 0,
          tiempo_desarrollo_min: 0,
          tiempo_armado_min: ot.tiempo_armado_min || 0,
          tiempo_pintura_min: ot.tiempo_pintura_min || 0,
          costo_energia: 0,
          costo_resina: 0,
          costo_curado: 0,
          costo_insumos: 0,
          costo_mano_obra: 0,
          costo_modelo_comprado: 0,
          costo_base_produccion: 0,
          margen_ganancia: 0.4,
          precio_unitario: ot.precio_cobrado || 0,
          precio_total: (ot.precio_cobrado || 0) * (ot.cantidad || 1),
          tiempo_entrega: '',
          descripcion_tecnica: ot.detalles_tecnicos || '',
          enlaces_compra: ot.enlaces_compra,
          imagen_url: ot.imagen_url,
          va_pintado: ot.va_pintado,
          tiene_empaque: ot.tiene_empaque
        }],
        subtotal: (ot.precio_cobrado || 0) * (ot.cantidad || 1),
        iva_porcentaje: 0,
        descuento_porcentaje: 0,
        total: (ot.precio_cobrado || 0) * (ot.cantidad || 1),
        tiempo_entrega_estimado: 'N/A',
        notas: ot.observaciones || ot.detalles_tecnicos || ''
      });
    }
  };

  // Abrir Modal de Gestión de Enlaces para la OT
  const handleOpenLinksModal = (ot: OrdenTrabajo) => {
    setOtParaEditarLinks(ot);
    const existing = getLinksDeOT(ot);
    setModalLinksList(existing.length > 0 ? existing.map(e => ({ ...e })) : [
      { id: `link-${Date.now()}`, titulo: '', url: '', costo_estimado: 0 }
    ]);
  };

  const handleAddModalLink = () => {
    setModalLinksList(prev => [
      ...prev,
      { id: `link-${Date.now()}`, titulo: '', url: '', costo_estimado: 0 }
    ]);
  };

  const handleUpdateModalLink = (index: number, field: string, value: any) => {
    setModalLinksList(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      if (field === 'url' && value && (!updated.titulo || updated.titulo.trim() === '')) {
        const plat = detect3DPlatform(value);
        if (plat.name !== 'Web 3D') {
          updated.titulo = `${plat.name} - ${otParaEditarLinks?.item_nombre || 'Modelo'}`;
        }
      }
      return updated;
    }));
  };

  const handleRemoveModalLink = (index: number) => {
    setModalLinksList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveLinksModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otParaEditarLinks || !onActualizarOT) return;

    const cleanLinks = modalLinksList
      .filter(l => l.url.trim() || l.titulo.trim())
      .map(l => ({
        id: l.id || `enl-${Date.now()}`,
        titulo: l.titulo.trim() || detect3DPlatform(l.url).name,
        url: formatExternalUrl(l.url),
        costo_estimado: Number(l.costo_estimado) || undefined
      }));

    const updatedOT: OrdenTrabajo = {
      ...otParaEditarLinks,
      enlaces_compra: cleanLinks
    };

    onActualizarOT(updatedOT);
    setOtParaEditarLinks(null);
  };

  const conSaldoCount = ordenes.filter(o => 
    o.estado_pago !== 'Pagado Total' && 
    ((o.saldo_pendiente ?? Math.max(0, (o.precio_cobrado || 0) - (o.abono || 0))) > 0)
  ).length;

  const ordenesFiltradas = filtroEstado === 'todos' 
    ? ordenes 
    : filtroEstado === 'con_saldo'
      ? ordenes.filter(o => 
          o.estado_pago !== 'Pagado Total' && 
          ((o.saldo_pendiente ?? Math.max(0, (o.precio_cobrado || 0) - (o.abono || 0))) > 0)
        )
      : ordenes.filter(o => o.estado === filtroEstado);

  // Conteo de proyectos rápidos
  const proyectosRapidosCount = ordenes.filter(o => o.es_proyecto_rapido).length;

  return (
    <div style={{ paddingBottom: '70px' }}>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Kanban size={22} color="var(--brand-cyan)" />
            Taller & Órdenes de Trabajo (OT)
          </h2>
          <p className="section-subtitle">
            Flujo de manufactura 3D, proyectos directos por tarifario y trazabilidad STL (Germán ➔ Juan).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowModalRapido(true)}
            style={{ fontWeight: 800, padding: '8px 14px' }}
          >
            <Plus size={16} />
            <span>➕ Proyecto Rápido (Tarifario)</span>
          </button>
        </div>
      </div>

      {/* Notificación de eliminación */}
      {notifEliminacion && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.86rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Trash2 size={16} />
          <span>{notifEliminacion}</span>
        </div>
      )}

      {/* Filtros Rápidos Touch para Celular en Cuadrícula Ordenada */}
      <div className="etapas-grid-mobile" style={{ marginBottom: '16px' }}>
        <button 
          className={`btn btn-sm ${filtroEstado === 'todos' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setFiltroEstado('todos')}
        >
          Todas ({ordenes.length})
        </button>
        <button 
          className={`btn btn-sm ${filtroEstado === 'con_saldo' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFiltroEstado('con_saldo')}
          style={{
            background: filtroEstado === 'con_saldo' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.08)',
            borderColor: filtroEstado === 'con_saldo' ? '#f87171' : 'rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontWeight: 800,
            whiteSpace: 'nowrap'
          }}
        >
          🔴 Con Saldo ({conSaldoCount})
        </button>
        {ETAPAS.map(etapa => {
          const count = ordenes.filter(o => o.estado === etapa).length;
          return (
            <button 
              key={etapa}
              className={`btn btn-sm ${filtroEstado === etapa ? 'btn-cyan' : 'btn-secondary'}`}
              onClick={() => setFiltroEstado(etapa)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {etapa} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de Órdenes */}
      {ordenesFiltradas.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p>No hay órdenes de trabajo en este estado.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Puedes registrar un <strong>Proyecto Rápido</strong> con el botón superior o aceptar una Cotización formal.
          </p>
        </div>
      ) : (
        <div className="cards-grid-mobile">
          {ordenesFiltradas.map(ot => {
            const sigEstado = getSiguienteEstado(ot.estado);

            // Estado STL badge styling
            const stlState = ot.stl_estado || 'Modelado Pendiente';
            const isStlReady = stlState === 'Diseñado por Germán' || stlState === 'Laminado por Juan' || stlState === 'En Impresora' || stlState === 'Impreso';

            return (
              <div key={ot.id} className="ot-card">
                {/* Header de la tarjeta */}
                <div className="ot-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="ot-badge">{ot.numero_ot}</span>
                    {ot.pos_venta_id || ot.cotizacion_numero?.startsWith('POS-') ? (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        background: 'rgba(56, 189, 248, 0.18)', 
                        color: 'var(--brand-cyan)', 
                        border: '1px solid rgba(56, 189, 248, 0.45)', 
                        padding: '1px 7px', 
                        borderRadius: '4px', 
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <span>🛍️ POS: {ot.cotizacion_numero}</span>
                      </span>
                    ) : ot.es_proyecto_rapido ? (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        ⚡ RAPIDO {ot.altura_cm_tarifario ? `${ot.altura_cm_tarifario}cm` : ''}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCotizacionModal(ot)}
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          color: 'var(--brand-cyan)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Ver detalle completo de la cotización original (piezas, valores, notas, links)"
                      >
                        <FileText size={11} />
                        <span>Cot: {ot.cotizacion_numero || 'Ver'}</span>
                        <ExternalLink size={10} />
                      </button>
                    )}

                    {/* Badge de Estado de Pago en la OT */}
                    {ot.estado_pago === 'Pagado Total' ? (
                      <span 
                        style={{ 
                          fontSize: '0.68rem', 
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#34d399', 
                          border: '1px solid rgba(16, 185, 129, 0.4)', 
                          padding: '1px 7px', 
                          borderRadius: '4px', 
                          fontWeight: 700, 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="100% Pagado"
                      >
                        <span>🟢 Pagado</span>
                      </span>
                    ) : ot.estado_pago === 'Abono Parcial' ? (
                      <span 
                        style={{ 
                          fontSize: '0.68rem', 
                          background: 'rgba(245, 158, 11, 0.15)', 
                          color: '#fbbf24', 
                          border: '1px solid rgba(245, 158, 11, 0.4)', 
                          padding: '1px 7px', 
                          borderRadius: '4px', 
                          fontWeight: 700, 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title={`Abonó: $${(ot.abono || 0).toLocaleString('es-CO')} | Resta: $${(ot.saldo_pendiente || 0).toLocaleString('es-CO')}`}
                      >
                        <span>🟡 Abono: ${(ot.abono || 0).toLocaleString('es-CO')}</span>
                        {ot.saldo_pendiente ? <span style={{ color: '#f87171' }}>• Resta: ${ot.saldo_pendiente.toLocaleString('es-CO')}</span> : null}
                      </span>
                    ) : (
                      <span 
                        style={{ 
                          fontSize: '0.68rem', 
                          background: 'rgba(239, 68, 68, 0.12)', 
                          color: '#f87171', 
                          border: '1px solid rgba(239, 68, 68, 0.3)', 
                          padding: '1px 7px', 
                          borderRadius: '4px', 
                          fontWeight: 700, 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="Pendiente de pago"
                      >
                        <span>🔴 Sin Pago</span>
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`status-pill status-${ot.estado.toLowerCase().replace(/\s+/g, '-')}`}>
                      {ot.estado}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtParaEliminar(ot)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      title="Eliminar o cancelar esta Orden de Trabajo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Pieza & Cliente */}
                <div style={{ display: 'flex', gap: '12px', margin: '10px 0' }}>
                  {ot.imagen_url ? (
                    <img 
                      src={ot.imagen_url} 
                      alt={ot.item_nombre} 
                      style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-subtle)' }} 
                    />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Box size={24} color="var(--text-muted)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 3px 0' }}>
                      {ot.item_nombre} (x{ot.cantidad})
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      👤 Cliente: <strong style={{ color: 'var(--text-main)' }}>{ot.cliente_nombre}</strong>
                    </p>
                    {ot.precio_cobrado && (
                      <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, marginTop: '2px' }}>
                        💵 Valor acordado: ${ot.precio_cobrado.toLocaleString('es-CO')} COP
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOQUE DE MODELO 3D EN INTERNET / COMPRA WEB */}
                {(() => {
                  const links = getLinksDeOT(ot);
                  return (
                    <div style={{
                      background: links.length > 0 ? 'rgba(236, 72, 153, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      border: links.length > 0 ? '1px solid rgba(236, 72, 153, 0.35)' : '1px dashed rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      margin: '10px 0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: links.length > 0 ? '6px' : '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShoppingCart size={13} color={links.length > 0 ? '#f472b6' : 'var(--text-muted)'} />
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: links.length > 0 ? '#f472b6' : 'var(--text-muted)' }}>
                            MODELO 3D WEB / ENLACE DE COMPRA
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenLinksModal(ot)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--brand-cyan)',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 700
                          }}
                        >
                          {links.length > 0 ? 'Editar Links' : '+ Vincular Web'}
                        </button>
                      </div>

                      {links.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {links.map((enl, idx) => {
                            const plat = detect3DPlatform(enl.url);
                            const linkId = `${ot.id}-link-${idx}`;
                            const isCopied = copiedLinkId === linkId;

                            return (
                              <div 
                                key={idx}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: `1px solid ${plat.borderColor}`,
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    color: plat.color,
                                    background: plat.bg,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    flexShrink: 0
                                  }}>
                                    {plat.icon} {plat.name}
                                  </span>

                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {enl.titulo || plat.name}
                                  </span>

                                  {enl.costo_estimado && enl.costo_estimado > 0 && (
                                    <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>
                                      ${enl.costo_estimado.toLocaleString('es-CO')}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  <a
                                    href={formatExternalUrl(enl.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm"
                                    style={{
                                      background: 'linear-gradient(135deg, #ec4899, #db2777)',
                                      color: '#fff',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '3px 8px',
                                      textDecoration: 'none',
                                      borderRadius: '5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 2px 6px rgba(236, 72, 153, 0.3)'
                                    }}
                                    title={`Abrir página web de compra/descarga de ${plat.name}`}
                                  >
                                    <span>🛒 Abrir en {plat.name}</span>
                                    <ExternalLink size={10} />
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(enl.url, linkId)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.68rem', padding: '3px 6px' }}
                                    title="Copiar enlace al portapapeles"
                                  >
                                    {isCopied ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
                                    <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span>⚠️ Sin enlace web de modelo guardado</span>
                          <button
                            type="button"
                            onClick={() => handleOpenLinksModal(ot)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: 'var(--brand-cyan)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            + Pegar Link
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* BLOQUE DE TRAZABILIDAD STL (Germán ➔ Juan) */}
                <div style={{ 
                  background: 'rgba(56, 189, 248, 0.05)', 
                  border: '1px solid rgba(56, 189, 248, 0.2)', 
                  borderRadius: '8px', 
                  padding: '8px 10px', 
                  margin: '10px 0' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileCode size={14} color="var(--brand-cyan)" />
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
                        TRAZABILIDAD MODELO 3D (STL)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenModalSTL(ot)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-cyan)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontWeight: 700
                      }}
                    >
                      Editar STL
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 800, 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      background: isStlReady ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: isStlReady ? '#34d399' : '#fbbf24'
                    }}>
                      {stlState} ({ot.stl_version || 'v1.0'})
                    </span>

                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Germán ➔ {ot.operador_asignado?.split(' ')[0] || 'Juan'}
                    </span>
                  </div>

                  {(ot.pos_venta_id || ot.cotizacion_numero?.startsWith('POS-')) && (
                    <div style={{
                      marginTop: '5px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: isStlReady ? '#34d399' : '#fbbf24',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{isStlReady ? '🟢' : '🎨'}</span>
                      <span>
                        {isStlReady 
                          ? 'Venta POS: Diseño listo para producción' 
                          : 'Venta POS: Requiere diseño nuevo por Germán'}
                      </span>
                    </div>
                  )}

                  {/* Acciones de STL */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {ot.stl_url && (
                      <a 
                        href={ot.stl_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.68rem', padding: '2px 8px', textDecoration: 'none' }}
                        title="Descargar o inspeccionar el archivo STL"
                      >
                        <ExternalLink size={11} />
                        <span>Descargar STL</span>
                      </a>
                    )}

                    <button
                      type="button"
                      className="btn btn-whatsapp btn-sm"
                      onClick={() => handleNotificarSTLAJuan(ot)}
                      style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                      title="Enviar archivo o aviso a Juan por WhatsApp para impresión"
                    >
                      <Share2 size={11} />
                      <span>Pasar a Juan</span>
                    </button>
                  </div>
                </div>

                {/* Especificaciones técnicas de taller */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem', margin: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>🖨️ {ot.maquina_nombre}</span>
                    <span>🧪 {ot.resina_nombre}</span>
                  </div>
                  <div style={{ color: 'var(--text-subtle)', marginBottom: '4px' }}>
                    ⏱️ Impresión: ~{ot.tiempo_impresion_min} min | Pintura: ~{ot.tiempo_pintura_min} min
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                    <span style={{ color: ot.va_pintado ? '#c084fc' : 'var(--text-muted)' }}>
                      {ot.va_pintado ? '🎨 Con Pintura' : '⚪ Sin Pintura'}
                    </span>
                    <span style={{ color: ot.tiene_empaque ? '#4ade80' : 'var(--text-muted)' }}>
                      {ot.tiene_empaque ? '📦 Con Empaque' : '📦 Sin Empaque'}
                    </span>
                  </div>
                </div>

                {/* Acciones de la OT */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {sigEstado && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => onUpdateEstado(ot.id, sigEstado)}
                    >
                      <span>Avanzar a {sigEstado}</span>
                      <ChevronRight size={14} />
                    </button>
                  )}

                  <button 
                    className="btn btn-whatsapp btn-sm"
                    onClick={() => handleNotificarCliente(ot)}
                    title="Enviar actualización y enlace de seguimiento por WhatsApp al cliente"
                  >
                    <MessageCircle size={14} />
                    <span>Avisar</span>
                  </button>

                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyTrackingLink(ot)}
                    title="Copiar enlace de seguimiento en vivo para el cliente"
                  >
                    {copiedOtId === ot.id ? <Check size={14} color="#4ade80" /> : <Compass size={14} color="var(--brand-cyan)" />}
                    <span>{copiedOtId === ot.id ? '¡Copiado!' : 'Rastreo'}</span>
                  </button>

                  {/* Botón Gestión Rápida de Pago en Taller */}
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOtParaPago(ot)}
                    style={{ 
                      borderColor: ot.estado_pago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.4)' : ot.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(239, 68, 68, 0.35)', 
                      color: ot.estado_pago === 'Pagado Total' ? '#34d399' : ot.estado_pago === 'Abono Parcial' ? '#fbbf24' : '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Registrar o actualizar pago / abono recibido de esta orden"
                  >
                    <CreditCard size={13} />
                    <span>Pago</span>
                  </button>

                  {/* Botón Cancelar / Eliminar OT */}
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOtParaEliminar(ot)}
                    style={{ 
                      borderColor: 'rgba(239, 68, 68, 0.35)', 
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Cancelar y eliminar orden si el comprador se arrepintió u otro motivo"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar OT</span>
                  </button>

                  {ot.estado === 'Listo para Entrega' && onGenerarCuentaCobro && (
                    <button 
                      className="btn btn-cyan btn-sm"
                      onClick={() => onGenerarCuentaCobro(ot)}
                      style={{ width: '100%' }}
                    >
                      <Sparkles size={14} />
                      <span>Generar Cuenta de Cobro</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: PROYECTO RÁPIDO (TARIFARIO EXPRESS) */}
      {showModalRapido && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setShowModalRapido(false)}
        >
          <div 
            className="glass-card" 
            style={{ maxWidth: '480px', width: '100%', margin: 0, padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--brand-cyan)" />
                Proyecto Rápido (Entrada por Tarifario)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModalRapido(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ingresa la foto del cliente y el tamaño estándar. El sistema fija el precio oficial y genera la orden de trabajo directa para el taller.
            </p>

            <form onSubmit={handleGuardarProyectoRapido}>
              {/* Foto de Referencia */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  FOTO / IMAGEN DE REFERENCIA:
                </label>
                {fotoUrlRapida ? (
                  <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '120px' }}>
                    <img src={fotoUrlRapida} alt="Referencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setFotoUrlRapida('')}
                      style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed var(--border-subtle)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <Camera size={24} color="var(--brand-cyan)" style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                      {isProcessingImg ? 'Comprimiendo imagen...' : 'Toma foto o selecciona imagen'}
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>

              {/* Nombre de la pieza */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  NOMBRE DE LA FIGURA / MODELO:
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Estatua Batman 10cm" 
                  value={nombreItemRapido} 
                  onChange={e => setNombreItemRapido(e.target.value)} 
                  required 
                />
              </div>

              {/* Cliente & Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    CLIENTE:
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nombre del cliente" 
                    value={clienteNombreRapido} 
                    onChange={e => setClienteNombreRapido(e.target.value)} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    WHATSAPP:
                  </label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Ej: 3202796115" 
                    value={clienteTelefonoRapido} 
                    onChange={e => setClienteTelefonoRapido(e.target.value)} 
                  />
                </div>
              </div>

              {/* Selector de Altura del Nuevo Tarifario */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    SELECCIONA TAMAÑO (TARIFARIO OFICIAL):
                  </label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399' }}>
                    ${(alturaSeleccionada * 10000).toLocaleString('es-CO')} COP
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[5, 6, 7, 8, 9, 10, 11, 12].map(cm => (
                    <button
                      key={cm}
                      type="button"
                      onClick={() => setAlturaSeleccionada(cm)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '8px',
                        border: `1px solid ${alturaSeleccionada === cm ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                        background: alturaSeleccionada === cm ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: alturaSeleccionada === cm ? 'var(--brand-cyan)' : '#fff',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <div>{cm} cm</div>
                      <div style={{ fontSize: '0.68rem', color: alturaSeleccionada === cm ? '#fff' : 'var(--text-muted)' }}>
                        ${cm * 10}k
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox para crear cobro en POS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="chkCobroPOS"
                  checked={crearCobroPOS} 
                  onChange={e => setCrearCobroPOS(e.target.checked)} 
                />
                <label htmlFor="chkCobroPOS" style={{ fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  Registrar venta en el POS Express para controlar cobro y abono
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModalRapido(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                  Crear Proyecto en Taller 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRAZABILIDAD Y VERSIÓN STL (Germán ➔ Juan) */}
      {otParaSTL && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setOtParaSTL(null)}
        >
          <div 
            className="glass-card" 
            style={{ maxWidth: '440px', width: '100%', margin: 0, padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={18} color="var(--brand-cyan)" />
                Trazabilidad STL • {otParaSTL.numero_ot}
              </h3>
              <button 
                type="button" 
                onClick={() => setOtParaSTL(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Figura: <strong style={{ color: '#fff' }}>{otParaSTL.item_nombre}</strong><br />
              Responsable de Modelado: <strong>Germán</strong> ➔ Impresión: <strong>Juan</strong>
            </div>

            <form onSubmit={handleGuardarSTL}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  ESTADO TÉCNICO DEL STL:
                </label>
                <select 
                  className="form-select"
                  value={inputStlEstado}
                  onChange={e => setInputStlEstado(e.target.value as EstadoSTL)}
                >
                  {ESTADOS_STL.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Recordatorio de Pago al Aprobar Diseño */}
              <div style={{
                background: otParaSTL.estado_pago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.12)' : otParaSTL.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${otParaSTL.estado_pago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.35)' : otParaSTL.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PAGO DEL CLIENTE (APROBACIÓN DISEÑO):</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: otParaSTL.estado_pago === 'Pagado Total' ? '#34d399' : otParaSTL.estado_pago === 'Abono Parcial' ? '#fbbf24' : '#f87171' }}>
                    {otParaSTL.estado_pago === 'Pagado Total' && '🟢 Pagado Total (100%)'}
                    {otParaSTL.estado_pago === 'Abono Parcial' && `🟡 Abonó: $${(otParaSTL.abono || 0).toLocaleString('es-CO')} (Debe: $${(otParaSTL.saldo_pendiente || 0).toLocaleString('es-CO')})`}
                    {(!otParaSTL.estado_pago || otParaSTL.estado_pago === 'Pendiente') && '🔴 Sin Pago / Pendiente'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    const otRef = otParaSTL;
                    setOtParaSTL(null);
                    setOtParaPago(otRef);
                  }}
                >
                  <CreditCard size={13} color="var(--brand-cyan)" />
                  <span>Registrar Pago</span>
                </button>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  VERSIÓN DEL ARCHIVO 3D:
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: v1.0, v1.2-hueco-con-drenaje" 
                  value={inputStlVersion} 
                  onChange={e => setInputStlVersion(e.target.value)} 
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  ENLACE AL ARCHIVO STL (DRIVE / SUPABASE / CLOUD):
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="https://drive.google.com/... o enlace local" 
                  value={inputStlUrl} 
                  onChange={e => setInputStlUrl(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOtParaSTL(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                  Guardar Trazabilidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE COMPLETO DE COTIZACIÓN VINCULADA */}
      {selectedCotizacionForModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setSelectedCotizacionForModal(null)}
        >
          <div 
            className="glass-card" 
            style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', margin: 0, padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} color="var(--brand-cyan)" />
                    Cotización #{selectedCotizacionForModal.numero_cot}
                  </h3>
                  <span className={`status-pill status-${(selectedCotizacionForModal.estado || 'borrador').toLowerCase()}`}>
                    {selectedCotizacionForModal.estado}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Fecha: {selectedCotizacionForModal.fecha} • Asesor: {selectedCotizacionForModal.vendedor}
                </p>
              </div>

              <button 
                type="button" 
                onClick={() => setSelectedCotizacionForModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Datos del Cliente */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: '8px', 
              padding: '12px 14px', 
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Cliente
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                  {selectedCotizacionForModal.cliente?.nombre || 'Cliente General'}
                </div>
                {selectedCotizacionForModal.cliente?.telefono && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    📱 {selectedCotizacionForModal.cliente.telefono}
                  </div>
                )}
              </div>

              {selectedCotizacionForModal.cliente?.telefono && (
                <button
                  type="button"
                  className="btn btn-whatsapp btn-sm"
                  onClick={() => openWhatsApp(`https://wa.me/${formatWhatsAppPhone(selectedCotizacionForModal.cliente.telefono)}`)}
                  style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>

            {/* Lista de Ítems / Piezas de la Cotización */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Box size={15} color="var(--brand-cyan)" />
                <span>Piezas Cotizadas ({selectedCotizacionForModal.items?.length || 0})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedCotizacionForModal.items?.map((item, idx) => (
                  <div 
                    key={item.id || idx}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {item.imagen_url ? (
                          <img 
                            src={item.imagen_url} 
                            alt={item.nombre_item} 
                            style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                          />
                        ) : (
                          <div style={{ width: '45px', height: '45px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box size={20} color="var(--text-muted)" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>
                            {item.nombre_item} <span style={{ color: 'var(--brand-cyan)' }}>(x{item.cantidad})</span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {item.alto_mm > 0 ? `${item.alto_mm}x${item.ancho_mm}x${item.profundidad_mm}mm` : 'Medidas de software'} • {item.resina_nombre}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>
                          ${item.precio_total?.toLocaleString('es-CO')} COP
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          (${item.precio_unitario?.toLocaleString('es-CO')} c/u)
                        </div>
                      </div>
                    </div>

                    {/* Especificaciones */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: item.va_pintado ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.05)', color: item.va_pintado ? '#c084fc' : 'var(--text-muted)' }}>
                        {item.va_pintado ? '🎨 Pintado' : '⚪ Sin Pintar'}
                      </span>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: item.tiene_empaque ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)', color: item.tiene_empaque ? '#4ade80' : 'var(--text-muted)' }}>
                        {item.tiene_empaque ? '📦 Con Empaque' : '📦 Sin Empaque'}
                      </span>
                    </div>

                    {/* Enlaces de Compra / Modelo 3D de esta pieza */}
                    {item.enlaces_compra && item.enlaces_compra.length > 0 && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f472b6', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShoppingCart size={12} />
                          <span>Enlaces de Compra / Descarga Modelo 3D:</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {item.enlaces_compra.map((enl, elIdx) => {
                            const plat = detect3DPlatform(enl.url);
                            return (
                              <div key={elIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: plat.color, background: plat.bg, padding: '1px 5px', borderRadius: '3px' }}>
                                    {plat.icon} {plat.name}
                                  </span>
                                  <span style={{ fontSize: '0.73rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {enl.titulo || plat.name}
                                  </span>
                                </div>
                                <a
                                  href={formatExternalUrl(enl.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm"
                                  style={{
                                    background: 'linear-gradient(135deg, #ec4899, #db2777)',
                                    color: '#fff',
                                    fontSize: '0.68rem',
                                    padding: '2px 8px',
                                    textDecoration: 'none',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontWeight: 700
                                  }}
                                >
                                  <span>Abrir</span>
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notas y Condiciones */}
            {selectedCotizacionForModal.notas && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Notas / Observaciones de la Cotización:
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
                  {selectedCotizacionForModal.notas}
                </div>
              </div>
            )}

            {/* Total Financiero y Pagos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Valor Total Cotizado:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-cyan)' }}>
                  ${selectedCotizacionForModal.total?.toLocaleString('es-CO')} COP
                </div>
                <div style={{ marginTop: '4px' }}>
                  {selectedCotizacionForModal.estado_pago === 'Pagado Total' ? (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      🟢 100% Pagado
                    </span>
                  ) : selectedCotizacionForModal.estado_pago === 'Abono Parcial' ? (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      🟡 Abono: ${(selectedCotizacionForModal.abono || 0).toLocaleString('es-CO')} • Saldo: ${(selectedCotizacionForModal.saldo_pendiente ?? Math.max(0, (selectedCotizacionForModal.total || 0) - (selectedCotizacionForModal.abono || 0))).toLocaleString('es-CO')}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      🔴 Sin Pago / Pendiente
                    </span>
                  )}
                </div>
              </div>

              {selectedCotizacionForModal.tiempo_entrega_estimado && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entrega prometida:</span>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                    ⏱️ {selectedCotizacionForModal.tiempo_entrega_estimado}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Pie de Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {onNavigateToCotizaciones && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const cotId = selectedCotizacionForModal.id;
                    setSelectedCotizacionForModal(null);
                    onNavigateToCotizaciones(cotId);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={13} />
                  <span>Ver en Pestaña Cotizaciones</span>
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={() => setSelectedCotizacionForModal(null)}
                style={{ fontWeight: 700 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓN DE ENLACES DE MODELO 3D PARA LA ORDEN DE TRABAJO */}
      {otParaEditarLinks && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setOtParaEditarLinks(null)}
        >
          <div 
            className="glass-card" 
            style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', margin: 0, padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} color="#f472b6" />
                Enlaces Web del Modelo • {otParaEditarLinks.numero_ot}
              </h3>
              <button 
                type="button" 
                onClick={() => setOtParaEditarLinks(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Figura: <strong style={{ color: '#fff' }}>{otParaEditarLinks.item_nombre}</strong><br />
              Guarda el enlace de Cults3D, CGTrader o Thingiverse para que cualquier operador del taller pueda acceder a comprar o descargar los archivos directamente.
            </div>

            <form onSubmit={handleSaveLinksModal}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {modalLinksList.map((link, idx) => {
                  const plat = detect3DPlatform(link.url);
                  return (
                    <div 
                      key={idx}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: `1px solid ${link.url ? plat.borderColor : 'var(--border-subtle)'}`,
                        borderRadius: '8px',
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: plat.color, background: plat.bg, padding: '2px 6px', borderRadius: '4px' }}>
                          {plat.icon} {plat.name} #{idx + 1}
                        </span>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', color: '#f87171', fontSize: '0.7rem' }}
                          onClick={() => handleRemoveModalLink(idx)}
                          title="Eliminar link"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Nombre o descripción (ej: Cults3D - Armadura Thanos)"
                          value={link.titulo}
                          onChange={e => handleUpdateModalLink(idx, 'titulo', e.target.value)}
                          style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                        />

                        <input 
                          type="url" 
                          className="form-input" 
                          placeholder="https://cults3d.com/... o enlace de descarga"
                          value={link.url}
                          onChange={e => handleUpdateModalLink(idx, 'url', e.target.value)}
                          style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                          required
                        />

                        <div className="input-with-unit" style={{ width: '100%' }}>
                          <input 
                            type="number" 
                            className="form-input" 
                            placeholder="Costo Estimado de Compra ($ COP)"
                            value={link.costo_estimado || ''}
                            onChange={e => handleUpdateModalLink(idx, 'costo_estimado', parseFloat(e.target.value) || 0)}
                            style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                          />
                          <span className="input-unit-badge">COP</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddModalLink}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Plus size={13} />
                  <span>+ Agregar Otro Enlace</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOtParaEditarLinks(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    Guardar Enlaces
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR O ACTUALIZAR PAGO DE LA ORDEN DE TRABAJO */}
      {otParaPago && (
        <ModalRegistrarPago
          isOpen={true}
          onClose={() => setOtParaPago(null)}
          titulo={`Gestión de Pago • ${otParaPago.numero_ot}`}
          subtitulo={`${otParaPago.item_nombre} • Cliente: ${otParaPago.cliente_nombre}`}
          referenciaDoc={otParaPago.numero_ot}
          clienteNombre={otParaPago.cliente_nombre}
          clienteTelefono={otParaPago.cliente_telefono}
          montoTotal={
            otParaPago.precio_cobrado || 
            (cotizaciones.find(c => c.id === otParaPago.cotizacion_id || c.numero_cot === otParaPago.cotizacion_numero)?.total) || 
            50000
          }
          pagoActual={{
            estado_pago: otParaPago.estado_pago,
            abono: otParaPago.abono,
            saldo_pendiente: otParaPago.saldo_pendiente,
            metodo_pago: otParaPago.metodo_pago,
            comprobante_pago: otParaPago.comprobante_pago
          }}
          esAprobacionCotizacion={false}
          onConfirmarPago={handleConfirmarPagoOT}
        />
      )}

      {/* MODAL: ELIMINAR O CANCELAR ORDEN DE TRABAJO */}
      <ModalEliminarOT
        isOpen={Boolean(otParaEliminar)}
        ot={otParaEliminar}
        cotizaciones={cotizaciones}
        onClose={() => setOtParaEliminar(null)}
        onConfirmarEliminar={handleConfirmarEliminarOT}
      />
    </div>
  );
};
