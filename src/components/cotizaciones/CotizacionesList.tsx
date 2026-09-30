import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Send, 
  FileDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Plus,
  Search,
  ArrowUpDown,
  Filter,
  X,
  User,
  Hash,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Cotizacion, EstadoCotizacion, ConfiguracionTaller } from '../../types';
import { generarPDFCotizacion, compartirPDFWhatsApp } from '../../services/pdfService';
import { generateCotizacionWhatsAppUrl, openWhatsApp } from '../../services/whatsappService';

interface CotizacionesListProps {
  cotizaciones: Cotizacion[];
  config: ConfiguracionTaller;
  onUpdateEstado: (cotId: string, nuevoEstado: EstadoCotizacion) => void;
  onAprobarCotizacion: (cot: Cotizacion) => void;
  onNuevaCotizacion: () => void;
}

export type TipoOrden = 'reciente' | 'antigua' | 'cliente_az' | 'cliente_za' | 'monto_desc' | 'monto_asc';

export const CotizacionesList: React.FC<CotizacionesListProps> = ({
  cotizaciones,
  config,
  onUpdateEstado,
  onAprobarCotizacion,
  onNuevaCotizacion
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('todos');
  const [criterioOrden, setCriterioOrden] = useState<TipoOrden>('reciente');
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string } | null>(null);

  // Función auxiliar para parsear y comparar números de cotización como "25-073"
  const parseCotNumber = (num: string): number => {
    const clean = (num || '').trim();
    const match = clean.match(/^(\d{2})-(\d+)$/);
    if (match) {
      const year = parseInt(match[1], 10) || 0;
      const seq = parseInt(match[2], 10) || 0;
      return year * 100000 + seq;
    }
    const digitsOnly = parseInt(clean.replace(/\D/g, ''), 10);
    return isNaN(digitsOnly) ? 0 : digitsOnly;
  };

  // Lista de clientes únicos con conteo de cotizaciones
  const listaClientesUnicos = useMemo(() => {
    const map = new Map<string, number>();
    cotizaciones.forEach(c => {
      const nombre = c.cliente?.nombre?.trim();
      if (nombre) {
        map.set(nombre, (map.get(nombre) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [cotizaciones]);

  // Filtrado y ordenamiento de cotizaciones
  const cotizacionesProcesadas = useMemo(() => {
    let resultado = [...cotizaciones];

    // 1. Filtro por Estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(c => c.estado === filtroEstado);
    }

    // 2. Filtro por Cliente
    if (clienteSeleccionado !== 'todos') {
      resultado = resultado.filter(c => 
        c.cliente?.nombre?.toLowerCase().trim() === clienteSeleccionado.toLowerCase().trim()
      );
    }

    // 3. Filtro por Búsqueda (Número de cotización, cliente o nombre de ítem/pieza)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(c => {
        const matchNumero = c.numero_cot?.toLowerCase().includes(q);
        const matchCliente = c.cliente?.nombre?.toLowerCase().includes(q);
        const matchItems = c.items?.some(it => it.nombre_item?.toLowerCase().includes(q));
        return matchNumero || matchCliente || matchItems;
      });
    }

    // 4. Ordenamiento
    resultado.sort((a, b) => {
      switch (criterioOrden) {
        case 'reciente': // Más reciente primero (ej: 25-073 a 25-001)
          return parseCotNumber(b.numero_cot) - parseCotNumber(a.numero_cot);
        case 'antigua': // Más antigua primero (ej: 25-001 a 25-073)
          return parseCotNumber(a.numero_cot) - parseCotNumber(b.numero_cot);
        case 'cliente_az': // Por cliente A-Z
          return (a.cliente?.nombre || '').localeCompare(b.cliente?.nombre || '');
        case 'cliente_za': // Por cliente Z-A
          return (b.cliente?.nombre || '').localeCompare(a.cliente?.nombre || '');
        case 'monto_desc': // Mayor valor primero
          return b.total - a.total;
        case 'monto_asc': // Menor valor primero
          return a.total - b.total;
        default:
          return parseCotNumber(b.numero_cot) - parseCotNumber(a.numero_cot);
      }
    });

    return resultado;
  }, [cotizaciones, filtroEstado, clienteSeleccionado, busqueda, criterioOrden]);

  const hayFiltrosActivos = busqueda.trim() !== '' || clienteSeleccionado !== 'todos' || filtroEstado !== 'todos';

  const limpiarFiltros = () => {
    setBusqueda('');
    setClienteSeleccionado('todos');
    setFiltroEstado('todos');
    setCriterioOrden('reciente');
  };

  const handleAceptar = (cot: Cotizacion) => {
    onAprobarCotizacion(cot);
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <FileText size={22} color="var(--brand-cyan)" />
            Historial de Cotizaciones
          </h2>
          <p className="section-subtitle">
            {cotizaciones.length} cotizaciones registradas • Búsqueda rápida, filtros y orden personalizado
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={onNuevaCotizacion}>
          <Plus size={16} />
          <span>Nueva Cotización</span>
        </button>
      </div>

      {/* Barra de Búsqueda, Filtro por Cliente y Ordenamiento */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'center' }}>
          
          {/* Búsqueda por Número de Cotización o Pieza */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={13} color="var(--brand-cyan)" />
              BUSCAR POR N° O ÍTEM
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                className="form-input"
                style={{ paddingLeft: '34px', paddingRight: busqueda ? '32px' : '12px', minHeight: '40px', fontSize: '0.88rem' }}
                placeholder="Ej: 25-073, Itachi, Muñeco..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                  title="Borrar búsqueda"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Filtro por Cliente */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={13} color="var(--brand-blue)" />
              FILTRAR POR CLIENTE
            </label>
            <select
              className="form-select"
              style={{ minHeight: '40px', fontSize: '0.88rem' }}
              value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
            >
              <option value="todos">Todos los clientes ({listaClientesUnicos.length})</option>
              {listaClientesUnicos.map(({ nombre, count }) => (
                <option key={nombre} value={nombre}>
                  {nombre} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpDown size={13} color="var(--brand-purple)" />
              ORDENAR POR
            </label>
            <select
              className="form-select"
              style={{ minHeight: '40px', fontSize: '0.88rem' }}
              value={criterioOrden}
              onChange={(e) => setCriterioOrden(e.target.value as TipoOrden)}
            >
              <option value="reciente">⚡ Más reciente a más antigua (25-073 → 25-001)</option>
              <option value="antigua">🕰️ Más antigua a más reciente (25-001 → 25-073)</option>
              <option value="cliente_az">👤 Cliente (A ➔ Z)</option>
              <option value="cliente_za">👤 Cliente (Z ➔ A)</option>
              <option value="monto_desc">💰 Mayor a menor valor ($$$ → $)</option>
              <option value="monto_asc">💵 Menor a mayor valor ($ → $$$)</option>
            </select>
          </div>
        </div>

        {/* Resumen de estado de los filtros */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Mostrando <strong style={{ color: 'var(--brand-cyan)' }}>{cotizacionesProcesadas.length}</strong> de <strong>{cotizaciones.length}</strong> cotizaciones
          </span>

          {hayFiltrosActivos && (
            <button 
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={limpiarFiltros}
            >
              <X size={13} />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Filtro por Estado */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {[
          { id: 'todos', label: 'Todas' },
          { id: 'Parcial', label: '🟡 Parciales' },
          { id: 'Facturada', label: 'Facturadas' },
          { id: 'Aceptada', label: 'Aceptadas' },
          { id: 'Enviada', label: 'Enviadas' },
          { id: 'Borrador', label: 'Borradores' }
        ].map(({ id, label }) => {
          const count = id === 'todos' 
            ? cotizaciones.length 
            : cotizaciones.filter(c => c.estado === id).length;

          return (
            <button 
              key={id}
              className={`btn btn-sm ${filtroEstado === id ? 'btn-cyan' : 'btn-secondary'}`}
              onClick={() => setFiltroEstado(id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de Cotizaciones */}
      {cotizacionesProcesadas.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <FileText size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>No se encontraron cotizaciones con los filtros aplicados.</p>
          {hayFiltrosActivos ? (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '14px' }} onClick={limpiarFiltros}>
              Restablecer Filtros
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }} onClick={onNuevaCotizacion}>
              Crear Primera Cotización
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cotizacionesProcesadas.map(cot => (
            <div key={cot.id} className="glass-card" style={{ margin: 0, padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--brand-cyan)' }}>
                      #{cot.numero_cot}
                    </span>
                    <span className={`status-pill ${
                      cot.estado === 'Facturada' 
                        ? 'status-terminado' 
                        : cot.estado === 'Aceptada'
                        ? 'status-curado'
                        : cot.estado === 'Enviada'
                        ? 'status-imprimiendo'
                        : cot.estado === 'Parcial'
                        ? 'status-cola'
                        : 'status-cola'
                    }`}
                    style={cot.estado === 'Parcial' ? { background: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.4)' } : {}}
                    >
                      {cot.estado === 'Parcial' ? '🟡 Parcial (Pendiente Slicer)' : cot.estado}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 600, marginTop: '5px' }}>
                    👤 {cot.cliente.nombre}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📅 {cot.fecha} | Vendedor: {cot.vendedor} {cot.cliente.telefono && `| 📱 ${cot.cliente.telefono}`}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.35rem', color: '#fff' }}>
                    ${cot.total.toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {cot.items.length} pieza(s) cotizada(s)
                  </div>
                </div>
              </div>

              {/* Resumen de piezas */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cot.items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {it.imagen_url && (
                        <img 
                          src={it.imagen_url} 
                          alt={it.nombre_item} 
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '5px',
                            objectFit: 'cover',
                            border: '1px solid var(--border-subtle)',
                            background: '#090d15',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          onClick={() => setPreviewModalImg({ url: it.imagen_url!, title: it.nombre_item })}
                          title="Clic para ver foto en grande"
                        />
                      )}
                      <span>
                        • <strong style={{ color: 'var(--text-main)' }}>{it.nombre_item}</strong> (x{it.cantidad})
                        {it.alto_mm > 0 && <span style={{ opacity: 0.7, marginLeft: '6px', fontSize: '0.75rem' }}>[{it.alto_mm}x{it.ancho_mm}x{it.profundidad_mm}mm]</span>}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600 }}>${it.precio_total.toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button 
                  className="btn btn-whatsapp btn-sm"
                  onClick={() => openWhatsApp(generateCotizacionWhatsAppUrl(cot, config))}
                  title="Enviar resumen escrito por WhatsApp"
                >
                  <Send size={14} />
                  <span>WhatsApp</span>
                </button>

                <button 
                  className="btn btn-cyan btn-sm"
                  onClick={() => compartirPDFWhatsApp(cot, config)}
                  title="Compartir PDF oficial por WhatsApp"
                >
                  <FileDown size={14} />
                  <span>PDF WhatsApp</span>
                </button>

                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => generarPDFCotizacion(cot, config)}
                  title="Descargar documento PDF"
                >
                  <FileDown size={14} />
                  <span>Descargar PDF</span>
                </button>

                {cot.estado !== 'Aceptada' && cot.estado !== 'Facturada' && (
                  <button 
                    className="btn btn-primary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => handleAceptar(cot)}
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprobar ➔ Taller</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Lightbox para foto de pieza en cotizaciones */}
      {previewModalImg && (
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
          onClick={() => setPreviewModalImg(null)}
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
                <span>{previewModalImg.title} — Vista de Referencia</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewModalImg(null)}
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: '10px', background: '#090d15', minHeight: '200px' }}>
              <img 
                src={previewModalImg.url} 
                alt={previewModalImg.title} 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewModalImg(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
