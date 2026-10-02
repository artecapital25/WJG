import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, 
  Trash2, 
  Send, 
  FileDown, 
  Check, 
  Plus, 
  Tag, 
  Calendar,
  Camera,
  Image as ImageIcon,
  Eye,
  X,
  Edit,
  Save,
  Minus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Cliente, 
  PiezaCotizada, 
  Cotizacion, 
  ConfiguracionTaller 
} from '../../types';
import { generarPDFCotizacion, compartirPDFWhatsApp } from '../../services/pdfService';
import { generateCotizacionWhatsAppUrl, openWhatsApp } from '../../services/whatsappService';
import { processAndOptimizeImage } from '../../services/imageService';

interface CotizacionBuilderProps {
  items: PiezaCotizada[];
  clientes: Cliente[];
  config: ConfiguracionTaller;
  cotizaciones?: Cotizacion[];
  cotizacionEnEdicion?: Cotizacion | null;
  onCancelarEdicion?: () => void;
  onRemoveItem: (id: string) => void;
  onUpdatePiece?: (item: PiezaCotizada) => void;
  onUpdatePieceQuantity?: (id: string, newCantidad: number) => void;
  onUpdatePieceImage?: (id: string, imagenUrl: string) => void;
  onSaveCotizacion: (cotizacion: Cotizacion) => void;
  onAddCliente: (cliente: Cliente) => void;
}

export const CotizacionBuilder: React.FC<CotizacionBuilderProps> = ({
  items,
  clientes,
  config,
  cotizaciones = [],
  cotizacionEnEdicion,
  onCancelarEdicion,
  onRemoveItem,
  onUpdatePiece,
  onUpdatePieceQuantity,
  onUpdatePieceImage,
  onSaveCotizacion,
  onAddCliente
}) => {
  const [clienteId, setClienteId] = useState<string>(clientes[0]?.id || '');
  const [vendedorNombre, setVendedorNombre] = useState('Wendy');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [notas, setNotas] = useState('- No incluye transporte\n- Pago 50% anticipo y 50% contra entrega');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Modal para editar pieza/ítem individual
  const [piezaEditando, setPiezaEditando] = useState<PiezaCotizada | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCantidad, setEditCantidad] = useState(1);
  const [editPrecioUnitario, setEditPrecioUnitario] = useState(0);

  // Precargar datos si viene una cotización en edición
  useEffect(() => {
    if (cotizacionEnEdicion) {
      if (cotizacionEnEdicion.cliente?.id) {
        setClienteId(cotizacionEnEdicion.cliente.id);
      }
      if (cotizacionEnEdicion.vendedor) {
        setVendedorNombre(cotizacionEnEdicion.vendedor);
      }
      setDescuentoPorcentaje(cotizacionEnEdicion.descuento_porcentaje || 0);
      setNotas(cotizacionEnEdicion.notas || '');
      if (cotizacionEnEdicion.estado) {
        setTipoEstado(cotizacionEnEdicion.estado as any);
      }
    }
  }, [cotizacionEnEdicion]);

  const handleItemImageUpload = async (itemId: string, file: File) => {
    if (!onUpdatePieceImage) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen (PNG, JPG o WebP).');
      return;
    }
    try {
      const optimized = await processAndOptimizeImage(file, 800, 800, 0.85);
      onUpdatePieceImage(itemId, optimized);
    } catch (e) {
      console.error('Error optimizando foto del ítem:', e);
    }
  };

  // Detección de piezas parciales
  const tieneItemsPendientes = items.some(it => it.datos_pendientes);
  const [tipoEstado, setTipoEstado] = useState<'Enviada' | 'Parcial' | 'Borrador'>('Enviada');

  // Ajustar estado automáticamente si se agregan piezas pendientes
  React.useEffect(() => {
    if (tieneItemsPendientes) {
      setTipoEstado('Parcial');
    }
  }, [tieneItemsPendientes]);

  // Nuevo cliente rápido
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoNit, setNuevoNit] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');

  // Cálculos globales
  const subtotal = items.reduce((sum, item) => sum + item.precio_total, 0);
  const descuentoMonto = (subtotal * descuentoPorcentaje) / 100;
  const total = Math.max(0, subtotal - descuentoMonto);

  const clienteSeleccionado = clientes.find(c => c.id === clienteId) || clientes[0];

  // Generar número correlativo consecutivo exacto (ej: 25-074)
  const numeroCotSugerido = useMemo(() => {
    let maxNum = 73;
    (cotizaciones || []).forEach(c => {
      const match = c.numero_cot?.match(/^(\d{2})-(\d+)$/);
      if (match) {
        const val = parseInt(match[2], 10);
        if (val > maxNum) maxNum = val;
      }
    });
    const añoDosDigitos = new Date().getFullYear().toString().slice(-2);
    return `${añoDosDigitos}-${(maxNum + 1).toString().padStart(3, '0')}`;
  }, [cotizaciones]);

  const esEdicion = Boolean(cotizacionEnEdicion);
  const numeroCotFinal = cotizacionEnEdicion ? cotizacionEnEdicion.numero_cot : numeroCotSugerido;
  const cotizacionIdFinal = cotizacionEnEdicion ? cotizacionEnEdicion.id : `cot-${Date.now()}`;
  const cotizacionFechaFinal = cotizacionEnEdicion ? cotizacionEnEdicion.fecha : new Date().toISOString().slice(0, 10);

  const handleCrearNuevoCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoTelefono) return;

    const nuevo: Cliente = {
      id: `cli-${Date.now()}`,
      codigo: clientes.length + 1,
      nombre: nuevoNombre,
      nit_cc: nuevoNit,
      telefono: nuevoTelefono,
      correo: nuevoCorreo
    };

    onAddCliente(nuevo);
    setClienteId(nuevo.id);
    setShowNewClientModal(false);
    setNuevoNombre('');
    setNuevoTelefono('');
    setNuevoNit('');
    setNuevoCorreo('');
  };

  const handleFinalizar = (enviarWhatsApp: boolean = false) => {
    if (!clienteSeleccionado || items.length === 0) return;

    const cotizacionFinal: Cotizacion = {
      id: cotizacionIdFinal,
      numero_cot: numeroCotFinal,
      cliente: clienteSeleccionado,
      vendedor: vendedorNombre,
      fecha: cotizacionFechaFinal,
      estado: tipoEstado,
      items: [...items],
      subtotal,
      iva_porcentaje: 0,
      descuento_porcentaje: descuentoPorcentaje,
      total,
      tiempo_entrega_estimado: items[0]?.tiempo_entrega || '(3) Días hábiles',
      notas: tipoEstado === 'Parcial' 
        ? `${notas}\n- NOTA: Cotización preliminar. Medidas y resina sujetas a verificación en software 3D.`
        : notas
    };

    onSaveCotizacion(cotizacionFinal);

    // Celebración visual
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (enviarWhatsApp) {
      const url = generateCotizacionWhatsAppUrl(cotizacionFinal, config);
      openWhatsApp(url);
    }
  };

  const handleDescargarPDF = () => {
    if (!clienteSeleccionado || items.length === 0) return;
    const cotTemp: Cotizacion = {
      id: cotizacionIdFinal,
      numero_cot: numeroCotFinal,
      cliente: clienteSeleccionado,
      vendedor: vendedorNombre,
      fecha: cotizacionFechaFinal,
      estado: cotizacionEnEdicion ? cotizacionEnEdicion.estado : 'Borrador',
      items,
      subtotal,
      iva_porcentaje: 0,
      descuento_porcentaje: descuentoPorcentaje,
      total,
      tiempo_entrega_estimado: items[0]?.tiempo_entrega || '(3) Días hábiles',
      notas
    };
    generarPDFCotizacion(cotTemp, config);
  };

  const handleCompartirPDF = () => {
    if (!clienteSeleccionado || items.length === 0) return;
    const cotizacionFinal: Cotizacion = {
      id: cotizacionIdFinal,
      numero_cot: numeroCotFinal,
      cliente: clienteSeleccionado,
      vendedor: vendedorNombre,
      fecha: cotizacionFechaFinal,
      estado: cotizacionEnEdicion ? cotizacionEnEdicion.estado : 'Enviada',
      items: [...items],
      subtotal,
      iva_porcentaje: 0,
      descuento_porcentaje: descuentoPorcentaje,
      total,
      tiempo_entrega_estimado: items[0]?.tiempo_entrega || '(3) Días hábiles',
      notas
    };
    onSaveCotizacion(cotizacionFinal);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    compartirPDFWhatsApp(cotizacionFinal, config);
  };

  return (
    <div className="glass-card">
      {/* Banner de Modo Edición */}
      {cotizacionEnEdicion && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              <Edit size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.98rem' }}>
                Modo Edición Activo: Cotización N° {cotizacionEnEdicion.numero_cot}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cliente actual: <strong style={{ color: 'var(--text-main)' }}>{cotizacionEnEdicion.cliente?.nombre}</strong> • Puedes agregar productos nuevos arriba, modificar cantidades o precios aquí abajo.
              </div>
            </div>
          </div>
          {onCancelarEdicion && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onCancelarEdicion}
              style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}
              title="Descartar cambios y salir del modo edición"
            >
              <X size={14} />
              <span>Cancelar Edición</span>
            </button>
          )}
        </div>
      )}

      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Tag size={20} color="var(--brand-cyan)" />
            {esEdicion ? `Editando Cotización N° ${numeroCotFinal}` : `Resumen de la Cotización (${items.length} piezas)`}
          </h2>
          <span style={{ fontSize: '0.8rem', color: esEdicion ? '#fbbf24' : 'var(--brand-cyan)', fontWeight: 600 }}>
            {esEdicion ? `Modificando registro oficial ${numeroCotFinal}` : `N° Sugerido: ${numeroCotSugerido}`}
          </span>
        </div>
      </div>

      {/* Selector de Cliente */}
      <div className="form-group" style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" style={{ margin: 0 }}>
            <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Cliente Asignado
          </label>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowNewClientModal(true)}
          >
            <Plus size={14} />
            <span>Nuevo Cliente</span>
          </button>
        </div>

        <select 
          className="form-select"
          value={clienteId}
          onChange={e => setClienteId(e.target.value)}
        >
          {clientes.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre} (Tel: {c.telefono})
            </option>
          ))}
        </select>

        {clienteSeleccionado && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span>📱 WhatsApp: {clienteSeleccionado.telefono}</span>
            <span>🆔 NIT/CC: {clienteSeleccionado.nit_cc || 'N/A'}</span>
          </div>
        )}
      </div>

      {/* Lista de Piezas Agregadas */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
          <p>No has agregado piezas a esta cotización aún.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Configura las dimensiones arriba y haz clic en "Agregar Pieza".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
          {items.map((item, idx) => (
            <div 
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                gap: '12px'
              }}
            >
              {item.imagen_url ? (
                <div 
                  style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => setPreviewImage({ url: item.imagen_url!, title: item.nombre_item })}
                  title="Clic para ver imagen en tamaño completo"
                >
                  <img 
                    src={item.imagen_url} 
                    alt={item.nombre_item} 
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      background: '#090d15'
                    }} 
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: '3px',
                    padding: '1px 2px',
                    display: 'flex'
                  }}>
                    <Eye size={10} color="#fff" />
                  </div>
                </div>
              ) : onUpdatePieceImage ? (
                <label 
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'var(--text-muted)',
                    fontSize: '0.62rem',
                    flexShrink: 0,
                    textAlign: 'center'
                  }}
                  title="Adjuntar foto o render a este ítem"
                >
                  <Camera size={13} color="var(--brand-cyan)" />
                  <span>+ Foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleItemImageUpload(item.id, e.target.files[0]);
                      }
                    }}
                  />
                </label>
              ) : null}

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>{idx + 1}. {item.nombre_item} (x{item.cantidad})</span>
                  {item.datos_pendientes && (
                    <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                      🟡 Pendiente Slicer
                    </span>
                  )}
                  {item.precio_fijado_tarifa && item.tarifa_tamano_aplicada && (
                    <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                      🏷️ Tarifa {item.tarifa_tamano_aplicada.altura_cm}cm
                    </span>
                  )}
                  {item.va_pintado ? (
                    <span style={{ background: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                      🎨 Pintado
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)', border: '1px solid rgba(148, 163, 184, 0.25)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                      ⚪ Sin Pintar
                    </span>
                  )}
                  {item.tiene_empaque ? (
                    <span style={{ background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.35)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                      📦 Con Empaque
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)', border: '1px solid rgba(148, 163, 184, 0.25)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                      📦 Sin Empaque
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.datos_pendientes 
                    ? `[Medidas y peso pendientes de software] • Material: ${item.resina_nombre}`
                    : `Medidas: ${item.alto_mm}x${item.ancho_mm}x${item.profundidad_mm}mm • Material: ${item.resina_nombre} (${item.peso_estimado_g}g)`
                  }
                  {item.lista_empaques && item.lista_empaques.length > 0 && (
                    <span style={{ color: '#4ade80' }}> • Empaque: {item.lista_empaques.map(e => `${e.nombre} (x${e.cantidad})`).join(', ')}</span>
                  )}
                </div>
              </div>

              {/* Stepper rápido de Cantidad */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '1px solid var(--border-subtle)', padding: '2px', flexShrink: 0 }}>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: item.cantidad <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: item.cantidad <= 1 ? 'not-allowed' : 'pointer',
                    padding: '3px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  disabled={item.cantidad <= 1}
                  onClick={() => onUpdatePieceQuantity && onUpdatePieceQuantity(item.id, item.cantidad - 1)}
                  title="Disminuir cantidad"
                >
                  <Minus size={12} />
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>
                  {item.cantidad}
                </span>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    padding: '3px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => onUpdatePieceQuantity && onUpdatePieceQuantity(item.id, item.cantidad + 1)}
                  title="Aumentar cantidad"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--brand-cyan)', fontSize: '0.95rem' }}>
                  ${item.precio_total.toLocaleString('es-CO')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  (${item.precio_unitario.toLocaleString('es-CO')} c/u)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {onUpdatePiece && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 8px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.35)' }}
                    onClick={() => {
                      setPiezaEditando(item);
                      setEditNombre(item.nombre_item);
                      setEditCantidad(item.cantidad);
                      setEditPrecioUnitario(item.precio_unitario);
                    }}
                    title="Editar nombre, cantidad o precio unitario"
                  >
                    <Edit size={13} />
                  </button>
                )}

                {onUpdatePieceImage && (
                  <label 
                    className="btn btn-secondary btn-sm" 
                    style={{ cursor: 'pointer', padding: '5px 8px' }} 
                    title={item.imagen_url ? 'Cambiar foto de este ítem' : 'Agregar foto a este ítem'}
                  >
                    <Camera size={13} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleItemImageUpload(item.id, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}

                <button 
                  type="button" 
                  className="btn btn-danger btn-sm"
                  onClick={() => onRemoveItem(item.id)}
                  title="Eliminar ítem"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Parámetros Finales: Descuento, Vendedor y Notas */}
      {items.length > 0 && (
        <>
          {/* Selector de Tipo de Cotización */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Tipo / Estado de la Cotización</span>
              {tieneItemsPendientes && (
                <span style={{ color: '#fde047', fontSize: '0.75rem', fontWeight: 600 }}>
                  ⚠️ Contiene piezas con medidas pendientes
                </span>
              )}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${tipoEstado === 'Enviada' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTipoEstado('Enviada')}
              >
                Oficial (Enviada)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${tipoEstado === 'Parcial' ? 'btn-cyan' : 'btn-secondary'}`}
                style={tipoEstado === 'Parcial' ? { background: '#ca8a04', color: '#fff', borderColor: '#eab308' } : {}}
                onClick={() => setTipoEstado('Parcial')}
              >
                🟡 Parcial (Pendiente)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${tipoEstado === 'Borrador' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => setTipoEstado('Borrador')}
              >
                Borrador
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', margin: '16px 0' }}>
            <div className="form-group">
              <label className="form-label">Descuento (%)</label>
              <input 
                type="number" 
                className="form-input" 
                min="0" 
                max="50" 
                value={descuentoPorcentaje}
                onChange={e => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vendedor / Asesor</label>
              <input 
                type="text" 
                className="form-input" 
                value={vendedorNombre}
                onChange={e => setVendedorNombre(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Condiciones & Observaciones</label>
            <textarea 
              className="form-textarea" 
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>

          {/* Desglose de Totales */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span>${subtotal.toLocaleString('es-CO')} COP</span>
            </div>
            {descuentoPorcentaje > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--accent-warning)' }}>
                <span>Descuento ({descuentoPorcentaje}%):</span>
                <span>-${descuentoMonto.toLocaleString('es-CO')} COP</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontWeight: 800, fontSize: '1.25rem' }}>
              <span>TOTAL:</span>
              <span style={{ color: 'var(--brand-cyan)' }}>${total.toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-primary"
              style={esEdicion ? { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#f59e0b', color: '#000', fontWeight: 700 } : {}}
              onClick={() => handleFinalizar(false)}
            >
              <Save size={16} />
              <span>{esEdicion ? `Guardar Cambios N° ${numeroCotFinal}` : 'Guardar Cotización Oficial'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-whatsapp" 
              onClick={() => handleFinalizar(true)}
            >
              <Send size={16} />
              <span>Enviar Texto WhatsApp</span>
            </button>

            <button 
              type="button" 
              className="btn btn-cyan" 
              onClick={handleCompartirPDF}
            >
              <FileDown size={16} />
              <span>Enviar PDF por WhatsApp</span>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleDescargarPDF}
            >
              <FileDown size={16} />
              <span>Descargar PDF</span>
            </button>

            {esEdicion && onCancelarEdicion && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onCancelarEdicion}
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
              >
                <X size={16} />
                <span>Cancelar Edición</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Modal Nuevo Cliente */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Agregar Nuevo Cliente</h3>
            <form onSubmit={handleCrearNuevoCliente}>
              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Laura Martínez"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono / WhatsApp *</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  value={nuevoTelefono}
                  onChange={e => setNuevoTelefono(e.target.value)}
                  placeholder="Ej: 3201234567"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NIT / CC</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={nuevoNit}
                  onChange={e => setNuevoNit(e.target.value)}
                  placeholder="1018..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={nuevoCorreo}
                  onChange={e => setNuevoCorreo(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Guardar Cliente
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowNewClientModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lightbox para foto de pieza en resumen */}
      {previewImage && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div 
            style={{
              background: 'var(--bg-card, #0f172a)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '16px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={16} color="var(--brand-cyan)" />
                <span>{previewImage.title} — Vista de Referencia</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewImage(null)}
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: '10px', background: '#090d15', minHeight: '200px' }}>
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewImage(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar ítem de cotización */}
      {piezaEditando && (
        <div className="modal-overlay" onClick={() => setPiezaEditando(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={16} color="#fbbf24" />
                <span>Modificar Pieza / Ítem</span>
              </h3>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setPiezaEditando(null)}
                style={{ padding: '3px 6px' }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!piezaEditando || !onUpdatePiece) return;
              const nuevaCant = Math.max(1, editCantidad);
              const nuevoUnit = Math.max(0, editPrecioUnitario);
              const nuevoTot = Math.ceil((nuevoUnit * nuevaCant) / 100) * 100;
              onUpdatePiece({
                ...piezaEditando,
                nombre_item: editNombre.trim() || piezaEditando.nombre_item,
                cantidad: nuevaCant,
                precio_unitario: nuevoUnit,
                precio_total: nuevoTot
              });
              setPiezaEditando(null);
            }}>
              <div className="form-group">
                <label className="form-label">Nombre o Descripción del Ítem</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  placeholder="Ej: Prototipo Carcasa"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Cantidad</label>
                  <input 
                    type="number" 
                    min="1"
                    className="form-input" 
                    value={editCantidad}
                    onChange={e => setEditCantidad(parseInt(e.target.value, 10) || 1)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Precio Unitario (COP)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="500"
                    className="form-input" 
                    value={editPrecioUnitario}
                    onChange={e => setEditPrecioUnitario(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', margin: '14px 0', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Cálculo:</span>
                  <span>{editCantidad} x ${editPrecioUnitario.toLocaleString('es-CO')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '4px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>
                  <span>Nuevo Total Ítem:</span>
                  <span>${(Math.ceil((editPrecioUnitario * editCantidad) / 100) * 100).toLocaleString('es-CO')} COP</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Guardar Cambios
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setPiezaEditando(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
