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
  Image as ImageIcon,
  Edit,
  RotateCw,
  Check,
  ShoppingCart,
  ExternalLink,
  CreditCard,
  DollarSign,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Cotizacion, EstadoCotizacion, ConfiguracionTaller, OrdenTrabajo, DatosPagoRegistro } from '../../types';
import { generarPDFCotizacion, compartirPDFWhatsApp } from '../../services/pdfService';
import { generateCotizacionWhatsAppUrl, openWhatsApp } from '../../services/whatsappService';
import { detect3DPlatform, formatExternalUrl } from '../../services/platformUtils';
import { ModalRegistrarPago } from '../common/ModalRegistrarPago';

interface CotizacionesListProps {
  cotizaciones: Cotizacion[];
  config: ConfiguracionTaller;
  ordenes?: OrdenTrabajo[];
  onUpdateEstado: (cotId: string, nuevoEstado: EstadoCotizacion) => void;
  onEditarCotizacion?: (cot: Cotizacion) => void;
  onAprobarCotizacion: (cot: Cotizacion, datosPago?: DatosPagoRegistro, redirigirTaller?: boolean) => void;
  onActualizarPagoCotizacion?: (cotId: string, datosPago: DatosPagoRegistro) => void;
  onEliminarCotizacion?: (cotId: string, numeroCot?: string) => void;
  onNuevaCotizacion: () => void;
}

export type TipoOrden = 'reciente' | 'antigua' | 'cliente_az' | 'cliente_za' | 'monto_desc' | 'monto_asc';

export const CotizacionesList: React.FC<CotizacionesListProps> = ({
  cotizaciones,
  config,
  ordenes = [],
  onUpdateEstado,
  onEditarCotizacion,
  onAprobarCotizacion,
  onActualizarPagoCotizacion,
  onEliminarCotizacion,
  onNuevaCotizacion
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPago, setFiltroPago] = useState<'todos' | 'pendiente' | 'abono' | 'pagado'>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('todos');
  const [criterioOrden, setCriterioOrden] = useState<TipoOrden>('reciente');
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string } | null>(null);
  const [cotParaGestionarPago, setCotParaGestionarPago] = useState<{ cot: Cotizacion; esAprobacion: boolean } | null>(null);
  const [cotParaEliminar, setCotParaEliminar] = useState<Cotizacion | null>(null);

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

    // 2. Filtro por Estado de Pago
    if (filtroPago !== 'todos') {
      resultado = resultado.filter(c => {
        if (filtroPago === 'pagado') return c.estado_pago === 'Pagado Total';
        if (filtroPago === 'abono') return c.estado_pago === 'Abono Parcial';
        if (filtroPago === 'pendiente') return !c.estado_pago || c.estado_pago === 'Pendiente';
        return true;
      });
    }

    // 3. Filtro por Cliente
    if (clienteSeleccionado !== 'todos') {
      resultado = resultado.filter(c => 
        c.cliente?.nombre?.toLowerCase().trim() === clienteSeleccionado.toLowerCase().trim()
      );
    }

    // 4. Filtro por Búsqueda (Número de cotización, cliente o nombre de ítem/pieza)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(c => {
        const matchNumero = c.numero_cot?.toLowerCase().includes(q);
        const matchCliente = c.cliente?.nombre?.toLowerCase().includes(q);
        const matchItems = c.items?.some(it => it.nombre_item?.toLowerCase().includes(q));
        return matchNumero || matchCliente || matchItems;
      });
    }

    // 5. Ordenamiento
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
  }, [cotizaciones, filtroEstado, filtroPago, clienteSeleccionado, busqueda, criterioOrden]);

  const hayFiltrosActivos = busqueda.trim() !== '' || clienteSeleccionado !== 'todos' || filtroEstado !== 'todos' || filtroPago !== 'todos';

  const limpiarFiltros = () => {
    setBusqueda('');
    setClienteSeleccionado('todos');
    setFiltroEstado('todos');
    setFiltroPago('todos');
    setCriterioOrden('reciente');
  };

  const handleAceptar = (cot: Cotizacion) => {
    // Abrir modal de aprobación para registrar pago de inmediato
    setCotParaGestionarPago({ cot, esAprobacion: true });
  };

  const handleConfirmarPagoModal = (
    datos: DatosPagoRegistro,
    accion: 'aprobar_y_taller' | 'solo_guardar'
  ) => {
    if (!cotParaGestionarPago) return;
    const { cot, esAprobacion } = cotParaGestionarPago;

    if (accion === 'aprobar_y_taller' || esAprobacion) {
      onAprobarCotizacion(cot, datos, accion === 'aprobar_y_taller');
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
    } else {
      if (onActualizarPagoCotizacion) {
        onActualizarPagoCotizacion(cot.id, datos);
      } else {
        onAprobarCotizacion(cot, datos, false);
      }
    }
    setCotParaGestionarPago(null);
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

          {/* Filtro por Estado de Pago */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CreditCard size={13} color="#10b981" />
              ESTADO DE PAGO
            </label>
            <select
              className="form-select"
              style={{ minHeight: '40px', fontSize: '0.88rem' }}
              value={filtroPago}
              onChange={(e) => setFiltroPago(e.target.value as any)}
            >
              <option value="todos">Todos los pagos</option>
              <option value="pagado">🟢 Pagado Total</option>
              <option value="abono">🟡 Con Abono Parcial</option>
              <option value="pendiente">🔴 Sin Pago / Pendiente</option>
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
                  {/* Badge de Estado Financiero y Pago */}
                  <div style={{ marginTop: '5px' }}>
                    {cot.estado_pago === 'Pagado Total' ? (
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#34d399', 
                          border: '1px solid rgba(16, 185, 129, 0.4)', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700, 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>🟢 Pagado Total</span>
                        {cot.metodo_pago && <span style={{ opacity: 0.8, fontSize: '0.66rem' }}>({cot.metodo_pago})</span>}
                      </span>
                    ) : cot.estado_pago === 'Abono Parcial' ? (
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          background: 'rgba(245, 158, 11, 0.15)', 
                          color: '#fbbf24', 
                          border: '1px solid rgba(245, 158, 11, 0.4)', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700, 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Abonó: $${(cot.abono || 0).toLocaleString('es-CO')} | Resta: $${(cot.saldo_pendiente ?? Math.max(0, cot.total - (cot.abono || 0))).toLocaleString('es-CO')}`}
                      >
                        <span>🟡 Abono: ${(cot.abono || 0).toLocaleString('es-CO')}</span>
                        <span style={{ color: '#f87171', fontWeight: 800 }}>• Debe: ${(cot.saldo_pendiente ?? Math.max(0, cot.total - (cot.abono || 0))).toLocaleString('es-CO')}</span>
                      </span>
                    ) : (
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          background: 'rgba(239, 68, 68, 0.12)', 
                          color: '#f87171', 
                          border: '1px solid rgba(239, 68, 68, 0.3)', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700, 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>🔴 Sin Pago</span>
                        <span style={{ opacity: 0.85, fontSize: '0.68rem' }}>($ {cot.total.toLocaleString('es-CO')})</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen de piezas */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cot.items.map((it) => (
                  <div key={it.id} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                    {/* Enlaces de Compra / Modelo 3D Web */}
                    {it.enlaces_compra && it.enlaces_compra.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: it.imagen_url ? '36px' : '14px', marginTop: '4px' }}>
                        {it.enlaces_compra.map((enl, elIdx) => {
                          const plat = detect3DPlatform(enl.url);
                          return (
                            <a
                              key={elIdx}
                              href={formatExternalUrl(enl.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.7rem',
                                color: plat.color,
                                background: plat.bg,
                                border: `1px solid ${plat.borderColor}`,
                                borderRadius: '4px',
                                padding: '2px 7px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700
                              }}
                              title={`Abrir ${enl.url}`}
                            >
                              <span>{plat.icon}</span>
                              <span>{enl.titulo || plat.name} ↗</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
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

                {onEditarCotizacion && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEditarCotizacion(cot)}
                    style={{ borderColor: 'rgba(245, 158, 11, 0.45)', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.08)' }}
                    title="Modificar esta cotización (corregir datos, agregar piezas o editar valores)"
                  >
                    <Edit size={14} />
                    <span>Modificar</span>
                  </button>
                )}

                {onEliminarCotizacion && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCotParaEliminar(cot)}
                    style={{ borderColor: 'rgba(239, 68, 68, 0.45)', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', gap: '5px' }}
                    title="Eliminar esta cotización y purgar sus abonos asociados en contabilidad"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar</span>
                  </button>
                )}

                {/* Botón Gestión Rápida de Pago / Anticipo */}
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCotParaGestionarPago({ cot, esAprobacion: false })}
                  style={{ 
                    borderColor: cot.estado_pago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.4)' : cot.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(239, 68, 68, 0.35)', 
                    color: cot.estado_pago === 'Pagado Total' ? '#34d399' : cot.estado_pago === 'Abono Parcial' ? '#fbbf24' : '#f87171', 
                    background: 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Registrar o actualizar estado de pago, anticipo, abono o comprobante de esta cotización"
                >
                  <CreditCard size={13} />
                  <span>Pago / Abono</span>
                </button>

                {/* Botón Inteligente: Aprobar / Reenviar OTs a Taller */}
                {(() => {
                  const otsAsociadas = ordenes.filter(o => 
                    o.cotizacion_id === cot.id || 
                    o.cotizacion_numero === cot.numero_cot ||
                    (o.cliente_nombre?.toLowerCase() === cot.cliente?.nombre?.toLowerCase() && 
                     cot.items.some(it => it.nombre_item?.toLowerCase() === o.item_nombre?.toLowerCase()))
                  );
                  const estaAceptada = cot.estado === 'Aceptada' || cot.estado === 'Facturada';

                  if (!estaAceptada) {
                    return (
                      <button 
                        className="btn btn-primary btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => handleAceptar(cot)}
                        title="Aprobar esta cotización y generar sus Órdenes de Trabajo en el Taller"
                      >
                        <CheckCircle2 size={14} />
                        <span>Aprobar ➔ Taller</span>
                      </button>
                    );
                  }

                  return (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {otsAsociadas.length > 0 ? (
                        <span 
                          style={{ 
                            fontSize: '0.74rem', 
                            fontWeight: 700, 
                            color: '#34d399', 
                            background: 'rgba(34, 197, 94, 0.12)', 
                            border: '1px solid rgba(34, 197, 94, 0.3)', 
                            padding: '4px 10px', 
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title={`Órdenes activas en taller: ${otsAsociadas.map(o => o.numero_ot).join(', ')}`}
                        >
                          <Check size={12} />
                          <span>{otsAsociadas.length} OT en Taller ({otsAsociadas.map(o => o.numero_ot).join(', ')})</span>
                        </span>
                      ) : (
                        <span 
                          style={{ 
                            fontSize: '0.74rem', 
                            fontWeight: 700, 
                            color: '#fbbf24', 
                            background: 'rgba(245, 158, 11, 0.12)', 
                            border: '1px solid rgba(245, 158, 11, 0.3)', 
                            padding: '4px 8px', 
                            borderRadius: '6px'
                          }}
                        >
                          ⚠️ Sin OT en Taller
                        </span>
                      )}

                      <button 
                        className="btn btn-sm"
                        style={{ 
                          background: otsAsociadas.length === 0 ? 'linear-gradient(135deg, #10b981, #0ea5e9)' : 'rgba(56, 189, 248, 0.12)',
                          borderColor: 'var(--brand-cyan)',
                          color: '#fff',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => handleAceptar(cot)}
                        title={otsAsociadas.length === 0 ? 'Generar OTs de esta cotización en el Taller' : 'Reenviar o restaurar OTs en el Taller'}
                      >
                        <RotateCw size={13} />
                        <span>{otsAsociadas.length === 0 ? 'Aprobar & Enviar a Taller' : 'Reenviar a Taller'}</span>
                      </button>
                    </div>
                  );
                })()}
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

      {/* Modal para Registrar o Modificar Pago de Cotización */}
      {cotParaGestionarPago && (
        <ModalRegistrarPago
          isOpen={true}
          onClose={() => setCotParaGestionarPago(null)}
          titulo={cotParaGestionarPago.esAprobacion ? 'Aprobar Cotización y Registrar Pago' : `Gestión de Pago • Cot: ${cotParaGestionarPago.cot.numero_cot}`}
          subtitulo={`Cliente: ${cotParaGestionarPago.cot.cliente.nombre} • Total: $${cotParaGestionarPago.cot.total.toLocaleString('es-CO')} COP`}
          referenciaDoc={`Cot: ${cotParaGestionarPago.cot.numero_cot}`}
          clienteNombre={cotParaGestionarPago.cot.cliente.nombre}
          clienteTelefono={cotParaGestionarPago.cot.cliente.telefono}
          montoTotal={cotParaGestionarPago.cot.total}
          pagoActual={{
            estado_pago: cotParaGestionarPago.cot.estado_pago,
            abono: cotParaGestionarPago.cot.abono,
            saldo_pendiente: cotParaGestionarPago.cot.saldo_pendiente,
            metodo_pago: cotParaGestionarPago.cot.metodo_pago,
            comprobante_pago: cotParaGestionarPago.cot.comprobante_pago
          }}
          esAprobacionCotizacion={cotParaGestionarPago.esAprobacion}
          onConfirmarPago={handleConfirmarPagoModal}
        />
      )}

      {/* Modal de Confirmación para Eliminar Cotización */}
      {cotParaEliminar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', marginBottom: '14px' }}>
              <AlertCircle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>¿Eliminar Cotización {cotParaEliminar.numero_cot}?</h3>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 16px' }}>
              Se removerá la cotización de <strong style={{ color: '#fff' }}>{cotParaEliminar.cliente.nombre}</strong> con valor total de <strong style={{ color: '#fff' }}>${cotParaEliminar.total.toLocaleString('es-CO')} COP</strong>.
            </p>

            {Number(cotParaEliminar.abono) > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: '#fca5a5'
              }}>
                ⚠️ <strong>Aviso Contable:</strong> Esta cotización cuenta con un abono registrado de <strong>${Number(cotParaEliminar.abono).toLocaleString('es-CO')} COP</strong>. Al eliminarla, este abono será purgado de los registros contables y del balance general para mantener consistencia.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCotParaEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444', fontWeight: 700 }}
                onClick={() => {
                  if (onEliminarCotizacion) {
                    onEliminarCotizacion(cotParaEliminar.id, cotParaEliminar.numero_cot);
                  }
                  setCotParaEliminar(null);
                }}
              >
                Sí, Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionesList;
