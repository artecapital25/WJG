import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  Trash2, 
  Camera, 
  UploadCloud, 
  DollarSign, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Save,
  Phone,
  Tag,
  Wrench,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { VentaExpress, EstadoPagoExpress, EstadoDisenoPOS } from '../../types/pos';
import { Cliente } from '../../types';
import { processAndOptimizeImage } from '../../services/imageService';
import { calcularAlertaCobro } from '../../services/posService';

interface ModalEditarVentaExpressProps {
  isOpen: boolean;
  venta: VentaExpress | null;
  clientes?: Cliente[];
  onClose: () => void;
  onGuardarCambios: (ventaActualizada: VentaExpress) => void;
  onEliminarVenta?: (ventaId: string) => void;
}

export const ModalEditarVentaExpress: React.FC<ModalEditarVentaExpressProps> = ({
  isOpen,
  venta,
  clientes = [],
  onClose,
  onGuardarCambios,
  onEliminarVenta
}) => {
  if (!isOpen || !venta) return null;

  const [nombreProducto, setNombreProducto] = useState(venta.nombre_producto);
  const [clienteNombre, setClienteNombre] = useState(venta.cliente_nombre);
  const [clienteTelefono, setClienteTelefono] = useState(venta.cliente_telefono || '');
  const [total, setTotal] = useState<number | ''>(venta.total);
  const [abono, setAbono] = useState<number | ''>(venta.abono);
  const [fechaVenta, setFechaVenta] = useState(venta.fecha_venta || new Date().toISOString().slice(0, 10));
  const [fechaPrometida, setFechaPrometida] = useState(venta.fecha_prometida_pago || '');
  const [metodoPago, setMetodoPago] = useState(venta.metodo_pago || 'Nequi');
  const [notas, setNotas] = useState(venta.notas || '');
  const [fotoUrl, setFotoUrl] = useState(venta.foto_url || '');
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // Validación y Producción de Diseño 3D (OT)
  const [requiereOT, setRequiereOT] = useState<boolean>(Boolean(venta.requiere_ot));
  const [estadoDiseno, setEstadoDiseno] = useState<EstadoDisenoPOS>(venta.estado_diseno || 'ya_realizado');
  const [enlaceDiseno, setEnlaceDiseno] = useState<string>(venta.enlace_diseno || '');
  const [notasDiseno, setNotasDiseno] = useState<string>(venta.notas_diseno || '');

  // Confirmación de eliminación
  const [mostrarConfirmarEliminar, setMostrarConfirmarEliminar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar si cambia la venta recibida
  useEffect(() => {
    if (venta) {
      setNombreProducto(venta.nombre_producto);
      setClienteNombre(venta.cliente_nombre);
      setClienteTelefono(venta.cliente_telefono || '');
      setTotal(venta.total);
      setAbono(venta.abono);
      setFechaVenta(venta.fecha_venta || new Date().toISOString().slice(0, 10));
      setFechaPrometida(venta.fecha_prometida_pago || '');
      setMetodoPago(venta.metodo_pago || 'Nequi');
      setNotas(venta.notas || '');
      setFotoUrl(venta.foto_url || '');
      setRequiereOT(Boolean(venta.requiere_ot));
      setEstadoDiseno(venta.estado_diseno || 'ya_realizado');
      setEnlaceDiseno(venta.enlace_diseno || '');
      setNotasDiseno(venta.notas_diseno || '');
      setMostrarConfirmarEliminar(false);
    }
  }, [venta]);

  // Cálculos dinámicos
  const totalNum = Number(total) || 0;
  const abonoNum = Number(abono) || 0;
  const saldoPendiente = Math.max(0, totalNum - abonoNum);

  const estadoPagoCalculado: EstadoPagoExpress = saldoPendiente <= 0 
    ? 'Pagado Total' 
    : abonoNum > 0 
      ? 'Abono Parcial' 
      : 'Pendiente';

  const alertaCobro = calcularAlertaCobro(fechaPrometida, saldoPendiente);

  // Manejo de carga de foto
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImg(true);
      const optimized = await processAndOptimizeImage(file, 800, 800, 0.82);
      setFotoUrl(optimized);
    } catch (err) {
      console.error('Error optimizando foto POS:', err);
      alert('Hubo un error al procesar la nueva imagen.');
    } finally {
      setIsProcessingImg(false);
    }
  };

  const handleSetDiasFechaPrometida = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    setFechaPrometida(d.toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreProducto.trim() || !clienteNombre.trim() || totalNum <= 0) {
      alert('Por favor completa el nombre de la figura, cliente y valor total.');
      return;
    }

    if (requiereOT && !estadoDiseno) {
      alert('Debes validar si el diseño 3D ya está realizado o si requiere un nuevo diseño antes de guardar.');
      return;
    }

    const ventaActualizada: VentaExpress = {
      ...venta,
      nombre_producto: nombreProducto.trim(),
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: clienteTelefono.trim(),
      total: totalNum,
      abono: abonoNum,
      saldo_pendiente: saldoPendiente,
      estado_pago: estadoPagoCalculado,
      fecha_venta: fechaVenta,
      fecha_prometida_pago: saldoPendiente > 0 ? fechaPrometida : undefined,
      metodo_pago: metodoPago,
      notas: notas.trim(),
      foto_url: fotoUrl,
      requiere_ot: requiereOT,
      estado_diseno: requiereOT ? estadoDiseno : undefined,
      enlace_diseno: (requiereOT && enlaceDiseno.trim()) ? enlaceDiseno.trim() : undefined,
      notas_diseno: (requiereOT && notasDiseno.trim()) ? notasDiseno.trim() : undefined
    };

    onGuardarCambios(ventaActualizada);
    onClose();
  };

  const handleConfirmarEliminar = () => {
    if (onEliminarVenta) {
      onEliminarVenta(venta.id);
      onClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          padding: '24px',
          position: 'relative',
          background: 'linear-gradient(180deg, #111827 0%, #0b0f17 100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            padding: '10px',
            borderRadius: '12px'
          }}>
            <Edit3 size={24} color="var(--brand-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-cyan)', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                {venta.numero_venta}
              </span>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Editar Venta POS Express
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Corrige cualquier dato del pedido, cliente, abonos o estado de pago.
            </p>
          </div>
        </div>

        {/* ALERTA DE CONFIRMACIÓN DE ELIMINACIÓN */}
        {mostrarConfirmarEliminar ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: '8px' }} />
            <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px 0' }}>
              ¿Eliminar definitivamente la venta {venta.numero_venta}?
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Se eliminará de la lista de ventas POS y de la base de cobros/cartera de <strong>{venta.cliente_nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMostrarConfirmarEliminar(false)}
              >
                No, volver
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmarEliminar}
                style={{ fontWeight: 800 }}
              >
                Sí, eliminar venta
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* FIGURA Y FOTO */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={14} />
                <span>Figura / Producto y Foto</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {/* Miniatura y Botón de Foto */}
                <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
                  {fotoUrl ? (
                    <img 
                      src={fotoUrl} 
                      alt="Figura" 
                      style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-subtle)' }}>
                      <Camera size={22} color="var(--text-muted)" />
                    </div>
                  )}

                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: '-6px',
                      right: '-6px',
                      background: 'var(--brand-cyan)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                    }}
                    title="Cambiar foto"
                  >
                    <UploadCloud size={12} />
                  </button>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    NOMBRE DE LA FIGURA / PRODUCTO *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={nombreProducto}
                    onChange={e => setNombreProducto(e.target.value)}
                    required
                    style={{ fontSize: '0.9rem' }}
                  />
                  {fotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFotoUrl('')}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.7rem', cursor: 'pointer', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={11} />
                      <span>Quitar foto actual</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* DATOS DEL CLIENTE */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                <span>Datos del Cliente / Comprador</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    NOMBRE DEL CLIENTE *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={clienteNombre}
                    onChange={e => setClienteNombre(e.target.value)}
                    required
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    TELÉFONO / WHATSAPP
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={clienteTelefono}
                    onChange={e => setClienteTelefono(e.target.value)}
                    placeholder="Ej: 3001234567"
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>

            {/* MONTOS FINANCIEROS Y ABONO */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={14} />
                <span>Valores Financieros y Abonos</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    VALOR TOTAL ($ COP) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={total}
                    onChange={e => setTotal(e.target.value === '' ? '' : Number(e.target.value))}
                    min="1"
                    step="1000"
                    required
                    style={{ fontSize: '1rem', fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    ABONO ACTUAL ($ COP)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={abono}
                    onChange={e => setAbono(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    min="0"
                    step="1000"
                    style={{ fontSize: '1rem', fontWeight: 800 }}
                  />
                </div>
              </div>

              {/* Saldo y Estado */}
              <div style={{
                background: saldoPendiente > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${saldoPendiente > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>SALDO QUE DEBE:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: saldoPendiente > 0 ? '#fbbf24' : '#34d399' }}>
                    ${saldoPendiente.toLocaleString('es-CO')} COP
                  </span>
                </div>
                <div style={{
                  background: saldoPendiente > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: saldoPendiente > 0 ? '#fbbf24' : '#34d399',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {estadoPagoCalculado}
                </div>
              </div>
            </div>

            {/* PRODUCCIÓN & ESTADO DEL DISEÑO 3D (OT) */}
            <div style={{
              background: requiereOT ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${requiereOT ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-subtle)'}`,
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={15} color="var(--brand-cyan)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                    PRODUCCIÓN EN TALLER & ORDEN DE TRABAJO
                  </span>
                  {venta.ot_numero && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--brand-cyan)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      {venta.ot_numero}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setRequiereOT(false)}
                    style={{
                      background: !requiereOT ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      color: !requiereOT ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📦 Sin OT
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequiereOT(true)}
                    style={{
                      background: requiereOT ? 'var(--brand-cyan)' : 'transparent',
                      color: requiereOT ? '#000' : 'var(--text-muted)',
                      border: '1px solid var(--brand-cyan)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    🛠️ Con OT
                  </button>
                </div>
              </div>

              {requiereOT && (
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand-cyan)', display: 'block', marginBottom: '6px' }}>
                    ESTADO DEL MODELO 3D / DISEÑO:
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div
                      onClick={() => setEstadoDiseno('ya_realizado')}
                      style={{
                        background: estadoDiseno === 'ya_realizado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                        border: `2px solid ${estadoDiseno === 'ya_realizado' ? '#34d399' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '8px',
                        padding: '8px 10px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <CheckCircle2 size={14} color={estadoDiseno === 'ya_realizado' ? '#34d399' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: estadoDiseno === 'ya_realizado' ? '#34d399' : '#fff' }}>
                          Diseño Ya Realizado
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>
                        Listo para impresión en taller
                      </span>
                    </div>

                    <div
                      onClick={() => setEstadoDiseno('requiere_nuevo')}
                      style={{
                        background: estadoDiseno === 'requiere_nuevo' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                        border: `2px solid ${estadoDiseno === 'requiere_nuevo' ? '#fbbf24' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '8px',
                        padding: '8px 10px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Sparkles size={14} color={estadoDiseno === 'requiere_nuevo' ? '#fbbf24' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: estadoDiseno === 'requiere_nuevo' ? '#fbbf24' : '#fff' }}>
                          Requiere Diseño Nuevo
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>
                        Germán debe modelarlo antes
                      </span>
                    </div>
                  </div>

                  {estadoDiseno === 'ya_realizado' ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                        ENLACE O RUTA DEL ARCHIVO STL (OPCIONAL):
                      </label>
                      <input
                        type="url"
                        className="input-field"
                        placeholder="https://drive.google.com/... o cults3d.com/..."
                        value={enlaceDiseno}
                        onChange={e => setEnlaceDiseno(e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                        NOTAS / REQUERIMIENTOS DEL DISEÑO:
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Detalles para modelar..."
                        value={notasDiseno}
                        onChange={e => setNotasDiseno(e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FECHAS, MÉTODO Y NOTAS */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    FECHA DE LA VENTA
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={fechaVenta}
                    onChange={e => setFechaVenta(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    MÉTODO DE PAGO
                  </label>
                  <select
                    className="form-select"
                    value={metodoPago}
                    onChange={e => setMetodoPago(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Bancolombia">Bancolombia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
              </div>

              {/* Fecha Promesa de Pago si tiene saldo */}
              {saldoPendiente > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      FECHA PROMESA DE PAGO:
                    </label>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: alertaCobro.color, background: alertaCobro.badgeBg, padding: '2px 6px', borderRadius: '4px' }}>
                      {alertaCobro.texto}
                    </span>
                  </div>
                  <input
                    type="date"
                    className="input-field"
                    value={fechaPrometida}
                    onChange={e => setFechaPrometida(e.target.value)}
                    style={{ marginBottom: '6px' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => handleSetDiasFechaPrometida(0)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '3px 6px' }}>Hoy</button>
                    <button type="button" onClick={() => handleSetDiasFechaPrometida(1)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '3px 6px' }}>Mañana</button>
                    <button type="button" onClick={() => handleSetDiasFechaPrometida(3)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '3px 6px' }}>En 3 días</button>
                    <button type="button" onClick={() => handleSetDiasFechaPrometida(7)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '3px 6px' }}>En 7 días</button>
                    <button type="button" onClick={() => handleSetDiasFechaPrometida(15)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '3px 6px' }}>En 15 días</button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  NOTAS / OBSERVACIÓN
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Detalles de entrega, acabados o recordatorios..."
                />
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              {onEliminarVenta && (
                <button
                  type="button"
                  onClick={() => setMostrarConfirmarEliminar(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                  title="Eliminar esta venta"
                >
                  <Trash2 size={14} />
                  <span>Eliminar Venta</span>
                </button>
              )}

              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{ padding: '8px 16px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    padding: '8px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={16} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
