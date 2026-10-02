import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { OrdenTrabajo, EstadoOT, ConfiguracionTaller } from '../../types';
import { formatWhatsAppPhone, openWhatsApp } from '../../services/whatsappService';

interface WorkOrdersPipelineProps {
  ordenes: OrdenTrabajo[];
  config: ConfiguracionTaller;
  onUpdateEstado: (otId: string, nuevoEstado: EstadoOT) => void;
  onGenerarCuentaCobro?: (ot: OrdenTrabajo) => void;
}

const ETAPAS: EstadoOT[] = [
  'En Cola',
  'Imprimiendo',
  'Curado',
  'Pintura y Armado',
  'Control de Calidad',
  'Listo para Entrega'
];

export const WorkOrdersPipeline: React.FC<WorkOrdersPipelineProps> = ({
  ordenes,
  config,
  onUpdateEstado,
  onGenerarCuentaCobro
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const getSiguienteEstado = (actual: EstadoOT): EstadoOT | null => {
    const idx = ETAPAS.indexOf(actual);
    if (idx >= 0 && idx < ETAPAS.length - 1) {
      return ETAPAS[idx + 1];
    }
    return null;
  };

  const handleNotificarCliente = (ot: OrdenTrabajo) => {
    const phone = formatWhatsAppPhone(ot.cliente_telefono);
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

¡Te mantendremos al tanto! 🚀`;

    openWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`);
  };

  const ordenesFiltradas = filtroEstado === 'todos' 
    ? ordenes 
    : ordenes.filter(o => o.estado === filtroEstado);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Kanban size={22} color="var(--brand-cyan)" />
            Taller & Órdenes de Trabajo (OT)
          </h2>
          <p className="section-subtitle">Flujo interno de fabricación: Ventas ➔ Cotizador ➔ Impresor ➔ Pintor</p>
        </div>
      </div>

      {/* Filtros Rápidos Touch para Celular */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        <button 
          className={`btn btn-sm ${filtroEstado === 'todos' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setFiltroEstado('todos')}
        >
          Todos ({ordenes.length})
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
            Las OTs se generan automáticamente cuando una Cotización es marcada como "Aceptada".
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {ordenesFiltradas.map(ot => {
            const sigEstado = getSiguienteEstado(ot.estado);

            return (
              <div key={ot.id} className="ot-card">
                <div className="ot-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ot-badge">{ot.numero_ot}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Cot: {ot.cotizacion_numero}
                    </span>
                  </div>
                  
                  <span className={`status-pill status-${ot.estado.toLowerCase().replace(/\s+/g, '-')}`}>
                    {ot.estado}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', margin: '10px 0' }}>
                  {ot.imagen_url && (
                    <img 
                      src={ot.imagen_url} 
                      alt={ot.item_nombre} 
                      style={{ width: '55px', height: '55px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  )}
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                      {ot.item_nombre} (x{ot.cantidad})
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      👤 Cliente: {ot.cliente_nombre}
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem', margin: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>🖨️ {ot.maquina_nombre}</span>
                    <span>🧪 {ot.resina_nombre}</span>
                  </div>
                  {ot.maquinas_involucradas && ot.maquinas_involucradas.length > 1 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', marginBottom: '4px' }}>
                      ⚙️ Equipos: {ot.maquinas_involucradas.map(m => `${m.proceso} (${m.maquina_nombre})`).join(' • ')}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-subtle)', marginBottom: '4px' }}>
                    ⏱️ Impresión: ~{ot.tiempo_impresion_min} min | Pintura: ~{ot.tiempo_pintura_min} min
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                    <span style={{ color: ot.va_pintado ? '#c084fc' : 'var(--text-muted)' }}>
                      {ot.va_pintado ? '🎨 Con Pintura' : '⚪ Sin Pintura'}
                    </span>
                    <span style={{ color: ot.tiene_empaque ? '#4ade80' : 'var(--text-muted)' }}>
                      {ot.tiene_empaque ? `📦 Empaque: ${ot.lista_empaques?.map(e => e.nombre).join(', ') || 'Sí'}` : '📦 Sin Empaque'}
                    </span>
                  </div>

                  {ot.enlaces_compra && ot.enlaces_compra.length > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px 10px', 
                      background: 'rgba(245, 158, 11, 0.12)', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(245, 158, 11, 0.3)' 
                    }}>
                      <div style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        color: '#fbbf24', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px', 
                        marginBottom: '6px' 
                      }}>
                        <ShoppingCart size={13} />
                        <span>Insumos / STL a Comprar ({ot.enlaces_compra.length}):</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {ot.enlaces_compra.map((lnk, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 600 }}>
                              • {lnk.titulo || 'Referencia'}:
                            </span>
                            {lnk.url ? (
                              <a
                                href={lnk.url.startsWith('http') ? lnk.url : `https://${lnk.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ 
                                  fontSize: '0.72rem', 
                                  color: 'var(--brand-cyan)', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '3px',
                                  textDecoration: 'underline',
                                  wordBreak: 'break-all'
                                }}
                                title="Abrir enlace de compra en pestaña nueva"
                              >
                                <span>Ver / Comprar</span>
                                <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>(Sin link)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    title="Enviar actualización por WhatsApp al cliente"
                  >
                    <MessageCircle size={14} />
                    <span>Avisar</span>
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
    </div>
  );
};
