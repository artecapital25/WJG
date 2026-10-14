import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Send, 
  ShoppingCart, 
  ExternalLink, 
  RotateCw, 
  MessageSquare, 
  Sparkles, 
  Trash2, 
  Check, 
  Filter, 
  Tag, 
  User, 
  Flame,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  TareaEquipo, 
  IntegranteEquipo, 
  SolicitudInsumo, 
  UrgenciaInsumo, 
  Insumo, 
  ConfiguracionTaller 
} from '../../types';
import { openWhatsApp } from '../../services/whatsappService';

interface TeamTasksViewProps {
  tareas: TareaEquipo[];
  solicitudesInsumos: SolicitudInsumo[];
  insumosCatalogo: Insumo[];
  config: ConfiguracionTaller;
  onGuardarTarea: (nueva: TareaEquipo) => void;
  onActualizarTarea: (tarea: TareaEquipo) => void;
  onEliminarTarea: (id: string) => void;
  onCrearSolicitudInsumo: (solicitud: SolicitudInsumo) => void;
  onActualizarSolicitudInsumo: (solicitud: SolicitudInsumo) => void;
}

const INTEGRANTES: IntegranteEquipo[] = ['Germán', 'Wendy', 'Juan', 'Todos'];

export const TeamTasksView: React.FC<TeamTasksViewProps> = ({
  tareas,
  solicitudesInsumos,
  insumosCatalogo,
  config,
  onGuardarTarea,
  onActualizarTarea,
  onEliminarTarea,
  onCrearSolicitudInsumo,
  onActualizarSolicitudInsumo
}) => {
  const [activeTab, setActiveTab] = useState<IntegranteEquipo | 'periodicas' | 'sos'>('Germán');

  // Formulario Nueva Tarea / Idea Rápida de WhatsApp
  const [tituloTarea, setTituloTarea] = useState('');
  const [descripcionTarea, setDescripcionTarea] = useState('');
  const [asignadoA, setAsignadoA] = useState<IntegranteEquipo>('Germán');
  const [tipoTarea, setTipoTarea] = useState<'puntual' | 'periodica'>('puntual');
  const [frecuencia, setFrecuencia] = useState<'diaria' | 'semanal' | 'quincenal' | 'mensual'>('semanal');
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [origenWhatsApp, setOrigenWhatsApp] = useState(false);

  // Formulario S.O.S Insumos / Orden de Compra
  const [showModalSOS, setShowModalSOS] = useState(false);
  const [insumoNombre, setInsumoNombre] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState<number>(1);
  const [unidadInsumo, setUnidadInsumo] = useState('unidades');
  const [urgenciaInsumo, setUrgenciaInsumo] = useState<UrgenciaInsumo>('normal');
  const [solicitadoPor, setSolicitadoPor] = useState('Juan (Pintor/Impresor)');
  const [encargadoCompra, setEncargadoCompra] = useState<IntegranteEquipo>('Wendy');
  const [enlaceCompra, setEnlaceCompra] = useState('');
  const [notasInsumo, setNotasInsumo] = useState('');

  // Guardar Tarea / Idea
  const handleCrearTarea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTarea.trim()) return;

    const nueva: TareaEquipo = {
      id: `task-${Date.now()}`,
      titulo: tituloTarea.trim(),
      descripcion: descripcionTarea.trim() || undefined,
      asignado_a: asignadoA,
      tipo: tipoTarea,
      frecuencia: tipoTarea === 'periodica' ? frecuencia : undefined,
      prioridad: prioridad,
      completada: false,
      origen: origenWhatsApp ? 'whatsapp' : 'manual',
      fecha_creacion: new Date().toISOString().slice(0, 10)
    };

    onGuardarTarea(nueva);
    setTituloTarea('');
    setDescripcionTarea('');
    setOrigenWhatsApp(false);
  };

  // Alternar estado de tarea (completada / pendiente)
  const handleToggleCompletada = (t: TareaEquipo) => {
    const updated: TareaEquipo = {
      ...t,
      completada: !t.completada,
      fecha_completada: !t.completada ? new Date().toISOString().slice(0, 10) : undefined
    };
    onActualizarTarea(updated);

    if (updated.completada) {
      confetti({ particleCount: 40, spread: 50 });
    }
  };

  // Manejo de autocompletado si selecciona insumo del catálogo existente
  const handleSelectInsumoCatalogo = (nombre: string) => {
    setInsumoNombre(nombre);
    const encontrado = insumosCatalogo.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());
    if (encontrado?.enlace_compra) {
      setEnlaceCompra(encontrado.enlace_compra);
    }
  };

  // Guardar y enviar S.O.S Insumo
  const handleGuardarSolicitudInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoNombre.trim()) return;

    const nuevaSolicitud: SolicitudInsumo = {
      id: `sos-${Date.now()}`,
      insumo_nombre: insumoNombre.trim(),
      cantidad: cantidadInsumo,
      unidad: unidadInsumo,
      urgencia: urgenciaInsumo,
      solicitado_por: solicitadoPor,
      encargado_compra: encargadoCompra,
      estado: 'pendiente',
      enlace_compra: enlaceCompra.trim() || undefined,
      notas: notasInsumo.trim() || undefined,
      fecha_solicitud: new Date().toISOString().slice(0, 10)
    };

    onCrearSolicitudInsumo(nuevaSolicitud);
    setShowModalSOS(false);

    // Preparar mensaje de WhatsApp para el encargado de compras
    const urgenciaEmoji = urgenciaInsumo === 'taller_detenido' ? '🚨 ¡TALLER DETENIDO!' : urgenciaInsumo === 'urgente' ? '⚠️ URGENTE' : '📦 Normal';
    const mensaje = 
`👋 ¡Hola *${encargadoCompra}*!
Desde el taller de *WJGEEKS 3D* te enviamos una solicitud de insumos / orden de compra:

🛒 *Insumo requerido:* ${nuevaSolicitud.insumo_nombre}
🔢 *Cantidad:* ${nuevaSolicitud.cantidad} ${nuevaSolicitud.unidad}
🚦 *Nivel de Urgencia:* ${urgenciaEmoji}
👤 *Solicitado por:* ${nuevaSolicitud.solicitado_por}

${nuevaSolicitud.enlace_compra ? `🔗 *Enlace de compra sugerido:* ${nuevaSolicitud.enlace_compra}\n` : ''}${nuevaSolicitud.notas ? `📝 *Observación:* ${nuevaSolicitud.notas}\n` : ''}
Por favor confirmar la compra para mantener la producción al día. ¡Muchas gracias! ✨`;

    // Teléfono de la empresa o de Wendy/Germán
    openWhatsApp(`https://wa.me/573202796115?text=${encodeURIComponent(mensaje)}`);

    // Reset Form S.O.S
    setInsumoNombre('');
    setCantidadInsumo(1);
    setEnlaceCompra('');
    setNotasInsumo('');
  };

  // Filtrado de tareas según pestaña activa
  const tareasFiltradas = tareas.filter(t => {
    if (activeTab === 'periodicas') return t.tipo === 'periodica';
    if (activeTab === 'sos') return false;
    return t.asignado_a === activeTab || t.asignado_a === 'Todos';
  });

  const solicitudesPendientes = solicitudesInsumos.filter(s => s.estado !== 'recibido');
  const tareasPendientesCount = tareas.filter(t => !t.completada).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '70px' }}>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Users size={24} color="var(--brand-cyan)" />
            Equipo, Tareas & S.O.S Insumos
          </h2>
          <p className="section-subtitle">
            Responsabilidades por integrante (Germán, Wendy, Juan), rutinas periódicas y alertas inmediatas de compras para taller.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setShowModalSOS(true)}
            style={{ 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(245, 158, 11, 0.2))',
              border: '1px solid #ef4444',
              color: '#f87171',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px'
            }}
          >
            <Flame size={16} color="#ef4444" />
            <span>🚨 S.O.S Insumos (Pedir Material)</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas por Integrante en Cuadrícula Ordenada */}
      <div className="subtabs-grid-mobile" style={{ marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {INTEGRANTES.filter(i => i !== 'Todos').map(integ => {
          const count = tareas.filter(t => t.asignado_a === integ && !t.completada).length;
          return (
            <button
              key={integ}
              type="button"
              className={`btn btn-sm ${activeTab === integ ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(integ)}
              style={{ fontWeight: 800, whiteSpace: 'nowrap' }}
            >
              <span>👤 {integ}</span>
              {count > 0 && <span className="nav-badge-pill" style={{ position: 'static' }}>{count}</span>}
            </button>
          );
        })}

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'periodicas' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('periodicas')}
          style={{ fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          <RotateCw size={14} />
          <span>Rutinas Periódicas</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'sos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('sos')}
          style={{ fontWeight: 800, color: solicitudesPendientes.length > 0 ? '#f87171' : 'inherit', whiteSpace: 'nowrap' }}
        >
          <ShoppingCart size={14} />
          <span>Órdenes de Insumos ({solicitudesPendientes.length})</span>
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      {activeTab === 'sos' ? (
        /* PESTAÑA S.O.S INSUMOS / ÓRDENES DE COMPRA */
        <div>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              📦 Historial de Solicitudes de Insumos & Materiales de Taller
            </h3>
          </div>

          {solicitudesInsumos.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '10px', opacity: 0.8 }} />
              <p>No hay solicitudes de insumos pendientes. El taller cuenta con stock completo.</p>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => setShowModalSOS(true)}
                style={{ marginTop: '12px' }}
              >
                + Crear primera orden de insumo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {solicitudesInsumos.map(sol => {
                const esDetenido = sol.urgencia === 'taller_detenido';
                const esUrgente = sol.urgencia === 'urgente';

                return (
                  <div 
                    key={sol.id} 
                    className="glass-card" 
                    style={{ 
                      margin: 0, 
                      padding: '16px',
                      borderLeft: `4px solid ${esDetenido ? '#ef4444' : esUrgente ? '#f59e0b' : '#38bdf8'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 800, 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            background: esDetenido ? 'rgba(239, 68, 68, 0.2)' : esUrgente ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                            color: esDetenido ? '#f87171' : esUrgente ? '#fbbf24' : '#38bdf8'
                          }}>
                            {sol.urgencia.toUpperCase().replace('_', ' ')}
                          </span>

                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Fecha: {sol.fecha_solicitud}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '4px 0 2px 0' }}>
                          {sol.insumo_nombre} (x{sol.cantidad} {sol.unidad})
                        </h4>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Solicitado por: <strong style={{ color: '#fff' }}>{sol.solicitado_por}</strong> ➔ Encargado/a de compra: <strong style={{ color: 'var(--brand-cyan)' }}>{sol.encargado_compra}</strong>
                        </div>

                        {sol.notas && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
                            📝 {sol.notas}
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {sol.enlace_compra && (
                          <a 
                            href={sol.enlace_compra.startsWith('http') ? sol.enlace_compra : `https://${sol.enlace_compra}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                          >
                            <ExternalLink size={13} />
                            <span>Comprar</span>
                          </a>
                        )}

                        <button
                          type="button"
                          className="btn btn-whatsapp btn-sm"
                          onClick={() => {
                            const msg = `Hola ${sol.encargado_compra}, sobre la solicitud de *${sol.insumo_nombre}* (Cant: ${sol.cantidad} ${sol.unidad}): ¿ya pudiste gestionar la compra?`;
                            openWhatsApp(`https://wa.me/573202796115?text=${encodeURIComponent(msg)}`);
                          }}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <Send size={13} />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          className={`btn btn-sm ${sol.estado === 'recibido' ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => {
                            const nuevoEstado = sol.estado === 'recibido' ? 'pendiente' : 'recibido';
                            onActualizarSolicitudInsumo({ ...sol, estado: nuevoEstado, fecha_atendida: new Date().toISOString().slice(0, 10) });
                          }}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <Check size={13} />
                          <span>{sol.estado === 'recibido' ? 'Recibido ✓' : 'Marcar Recibido'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* PESTAÑAS DE INTEGRANTES O RUTINAS */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: '24px', alignItems: 'start' }} className="pos-layout-grid">
          {/* PANEL IZQUIERDO: BUZÓN RÁPIDO DE TAREAS & WHATSAPP */}
          <div className="glass-card" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--brand-cyan)" />
              {activeTab === 'periodicas' ? 'Nueva Rutina Periódica' : `Nueva Tarea para ${activeTab}`}
            </h3>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Pega encargos o ideas que te lleguen por WhatsApp para no perderlos en el chat.
            </p>

            <form onSubmit={handleCrearTarea}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  TÍTULO DE LA TAREA O ENCARGO:
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Afinar soportes de figura Tanjiro / Cambiar FEP" 
                  value={tituloTarea} 
                  onChange={e => setTituloTarea(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  DETALLES O NOTAS ADICIONALES:
                </label>
                <textarea 
                  className="form-input" 
                  rows={2}
                  placeholder="Detalles técnicos, parámetros de curado, cliente relacionado..." 
                  value={descripcionTarea} 
                  onChange={e => setDescripcionTarea(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    RESPONSABLE:
                  </label>
                  <select 
                    className="form-select"
                    value={asignadoA}
                    onChange={e => setAsignadoA(e.target.value as IntegranteEquipo)}
                  >
                    {INTEGRANTES.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    PRIORIDAD:
                  </label>
                  <select 
                    className="form-select"
                    value={prioridad}
                    onChange={e => setPrioridad(e.target.value as any)}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">🔥 Urgente</option>
                  </select>
                </div>
              </div>

              {/* Tipo de tarea (Puntual vs Periódica) */}
              <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="tipoTarea" 
                      checked={tipoTarea === 'puntual'} 
                      onChange={() => setTipoTarea('puntual')} 
                    />
                    Puntual (1 sola vez)
                  </label>

                  <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="tipoTarea" 
                      checked={tipoTarea === 'periodica'} 
                      onChange={() => setTipoTarea('periodica')} 
                    />
                    Rutina Periódica 🔄
                  </label>
                </div>

                {tipoTarea === 'periodica' && (
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      FRECUENCIA DE REPETICIÓN:
                    </label>
                    <select 
                      className="form-select"
                      value={frecuencia}
                      onChange={e => setFrecuencia(e.target.value as any)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      <option value="diaria">Diaria (Todos los días)</option>
                      <option value="semanal">Semanal (Una vez por semana)</option>
                      <option value="quincenal">Quincenal (Cada 15 días)</option>
                      <option value="mensual">Mensual (Cada mes)</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="chkWhatsapp"
                  checked={origenWhatsApp}
                  onChange={e => setOrigenWhatsApp(e.target.checked)} 
                />
                <label htmlFor="chkWhatsapp" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  💬 Encargo recibido por WhatsApp
                </label>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', fontWeight: 800, padding: '10px' }}
              >
                <Plus size={16} />
                <span>Agregar a la Lista</span>
              </button>
            </form>
          </div>

          {/* PANEL DERECHO: LISTA DE TAREAS Y RUTINAS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {activeTab === 'periodicas' ? '🔄 Rutinas de Taller & Mantenimiento' : `Tareas Asignadas a ${activeTab}`} ({tareasFiltradas.length})
              </h3>
            </div>

            {tareasFiltradas.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '10px', opacity: 0.8 }} />
                <p>No hay tareas pendientes en este apartado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tareasFiltradas.map(t => {
                  const esUrgente = t.prioridad === 'urgente';
                  const esAlta = t.prioridad === 'alta';

                  return (
                    <div 
                      key={t.id} 
                      className="glass-card" 
                      style={{ 
                        margin: 0, 
                        padding: '14px', 
                        opacity: t.completada ? 0.6 : 1,
                        borderLeft: `4px solid ${esUrgente ? '#ef4444' : esAlta ? '#f59e0b' : 'var(--border-subtle)'}` 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Checkbox circular */}
                        <button
                          type="button"
                          onClick={() => handleToggleCompletada(t)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `2px solid ${t.completada ? '#10b981' : 'var(--text-muted)'}`,
                            background: t.completada ? '#10b981' : 'transparent',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          {t.completada && <Check size={14} />}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                            <span style={{ 
                              fontSize: '0.92rem', 
                              fontWeight: 700, 
                              color: t.completada ? 'var(--text-muted)' : '#fff',
                              textDecoration: t.completada ? 'line-through' : 'none' 
                            }}>
                              {t.titulo}
                            </span>

                            {t.tipo === 'periodica' && (
                              <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                🔄 {t.frecuencia}
                              </span>
                            )}

                            {t.origen === 'whatsapp' && (
                              <span style={{ fontSize: '0.68rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                💬 WhatsApp
                              </span>
                            )}

                            {esUrgente && (
                              <span style={{ fontSize: '0.68rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                🔥 Urgente
                              </span>
                            )}
                          </div>

                          {t.descripcion && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                              {t.descripcion}
                            </p>
                          )}

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'flex', gap: '10px' }}>
                            <span>Asignado: <strong>{t.asignado_a}</strong></span>
                            <span>Creado: {t.fecha_creacion}</span>
                            {t.fecha_completada && <span style={{ color: '#34d399' }}>Completado: {t.fecha_completada}</span>}
                          </div>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          onClick={() => onEliminarTarea(t.id)}
                          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '4px' }}
                          title="Eliminar tarea"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL S.O.S INSUMOS / SOLICITUD DE COMPRA RÁPIDA */}
      {showModalSOS && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setShowModalSOS(false)}
        >
          <div 
            className="glass-card" 
            style={{ maxWidth: '460px', width: '100%', margin: 0, padding: '24px', border: '1px solid #ef4444' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={20} color="#ef4444" />
                S.O.S Taller • Pedir Insumo o Material
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModalSOS(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              ¿Se acabó la resina, se rompió un pincel o falta alcohol? Notifica al encargado de compras al instante.
            </p>

            <form onSubmit={handleGuardarSolicitudInsumo}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  ¿QUÉ INSUMO SE ACABÓ O SE DAÑÓ?:
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Resina Anycubic Gris / Pincel fino 00 / Alcohol" 
                  value={insumoNombre} 
                  onChange={e => setInsumoNombre(e.target.value)} 
                  required 
                />

                {/* Sugerencias de insumos comunes */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {['Resina Gris', 'Pincel 00', 'Alcohol 96%', 'Primer Negro', 'Lijas finas'].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleSelectInsumoCatalogo(sug)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    CANTIDAD REQUERIDA:
                  </label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={cantidadInsumo} 
                    onChange={e => setCantidadInsumo(Number(e.target.value))} 
                    min="1" 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    NIVEL DE URGENCIA:
                  </label>
                  <select 
                    className="form-select"
                    value={urgenciaInsumo}
                    onChange={e => setUrgenciaInsumo(e.target.value as UrgenciaInsumo)}
                    style={{ color: urgenciaInsumo === 'taller_detenido' ? '#f87171' : 'inherit', fontWeight: 700 }}
                  >
                    <option value="normal">Normal (Para próximos días)</option>
                    <option value="urgente">⚠️ Urgente (Queda poco)</option>
                    <option value="taller_detenido">🚨 ¡TALLER DETENIDO!</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    SOLICITA:
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={solicitadoPor} 
                    onChange={e => setSolicitadoPor(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    ENCARGADO DE COMPRA:
                  </label>
                  <select 
                    className="form-select"
                    value={encargadoCompra}
                    onChange={e => setEncargadoCompra(e.target.value as IntegranteEquipo)}
                  >
                    <option value="Wendy">Wendy (Compras/Admin)</option>
                    <option value="Germán">Germán (Dirección)</option>
                    <option value="Juan">Juan (Taller)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  ENLACE DE COMPRA / PROVEEDOR (OPCIONAL):
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="https://mercadolibre.com/... o tienda" 
                  value={enlaceCompra} 
                  onChange={e => setEnlaceCompra(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModalSOS(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800, background: '#ef4444' }}>
                  <Send size={14} />
                  <span>Enviar Orden por WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
