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
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  OrdenTrabajo, 
  EstadoOT, 
  ConfiguracionTaller, 
  TarifaTamano, 
  Cliente, 
  EstadoSTL 
} from '../../types';
import { formatWhatsAppPhone, openWhatsApp } from '../../services/whatsappService';
import { processAndOptimizeImage } from '../../services/imageService';

interface WorkOrdersPipelineProps {
  ordenes: OrdenTrabajo[];
  config: ConfiguracionTaller;
  tarifasTamanos?: TarifaTamano[];
  clientes?: Cliente[];
  onUpdateEstado: (otId: string, nuevoEstado: EstadoOT) => void;
  onGenerarCuentaCobro?: (ot: OrdenTrabajo) => void;
  onCrearOrdenRapida?: (nuevaOT: OrdenTrabajo, crearCobroPOS?: boolean) => void;
  onActualizarOT?: (otActualizada: OrdenTrabajo) => void;
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
  tarifasTamanos = [],
  clientes = [],
  onUpdateEstado,
  onGenerarCuentaCobro,
  onCrearOrdenRapida,
  onActualizarOT
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [copiedOtId, setCopiedOtId] = useState<string | null>(null);

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
      alert('Error al procesar la foto.');
    } finally {
      setIsProcessingImg(false);
    }
  };

  // Guardar Proyecto Rápido (Tarifario Express)
  const handleGuardarProyectoRapido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreItemRapido.trim()) {
      alert('Ingresa el nombre de la figura o proyecto.');
      return;
    }
    if (!clienteNombreRapido.trim()) {
      alert('Ingresa el nombre del cliente.');
      return;
    }

    const tarifaEncontrada = tarifasTamanos.find(t => t.altura_cm === alturaSeleccionada);
    const precioCalculado = tarifaEncontrada 
      ? tarifaEncontrada.precio_sugerido 
      : (alturaSeleccionada * 10000);

    // Consecutivo nuevo
    const numerosExistentes = ordenes.map(o => {
      const match = o.numero_ot.match(/OT-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = Math.max(0, ...numerosExistentes);
    const siguienteNum = `OT-${String(maxNum + 1).padStart(4, '0')}`;

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

  const ordenesFiltradas = filtroEstado === 'todos' 
    ? ordenes 
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

      {/* Filtros Rápidos Touch para Celular */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        <button 
          className={`btn btn-sm ${filtroEstado === 'todos' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setFiltroEstado('todos')}
        >
          Todas ({ordenes.length})
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {ordenesFiltradas.map(ot => {
            const sigEstado = getSiguienteEstado(ot.estado);

            // Estado STL badge styling
            const stlState = ot.stl_estado || 'Modelado Pendiente';
            const isStlReady = stlState === 'Diseñado por Germán' || stlState === 'Laminado por Juan' || stlState === 'En Impresora' || stlState === 'Impreso';

            return (
              <div key={ot.id} className="ot-card">
                {/* Header de la tarjeta */}
                <div className="ot-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ot-badge">{ot.numero_ot}</span>
                    {ot.es_proyecto_rapido ? (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        ⚡ RAPIDO {ot.altura_cm_tarifario ? `${ot.altura_cm_tarifario}cm` : ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Cot: {ot.cotizacion_numero}
                      </span>
                    )}
                  </div>
                  
                  <span className={`status-pill status-${ot.estado.toLowerCase().replace(/\s+/g, '-')}`}>
                    {ot.estado}
                  </span>
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
    </div>
  );
};
