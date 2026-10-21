import React, { useState, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  DollarSign, 
  User, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Send, 
  Sparkles, 
  Trash2, 
  Plus, 
  Search, 
  Receipt,
  Phone,
  Tag,
  CreditCard,
  RotateCcw,
  Edit3,
  Wrench,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VentaExpress, EstadoPagoExpress, EstadoDisenoPOS } from '../../types/pos';
import { Cliente, ConfiguracionTaller, OrdenTrabajo, TabType, ProductoStock } from '../../types';
import { processAndOptimizeImage } from '../../services/imageService';
import { 
  calcularAlertaCobro, 
  generarConsecutivoPOS, 
  generarWhatsAppComprobantePOS, 
  generarWhatsAppRecordatorioCobro 
} from '../../services/posService';
import { openWhatsApp } from '../../services/whatsappService';
import { ModalEditarVentaExpress } from './ModalEditarVentaExpress';
import { toast } from '../ui/ToastProvider';

interface POSExpressViewProps {
  ventas: VentaExpress[];
  clientes: Cliente[];
  config: ConfiguracionTaller;
  ordenes?: OrdenTrabajo[];
  productosStock?: ProductoStock[];
  onGuardarVenta: (nuevaVenta: VentaExpress) => void;
  onActualizarVenta: (ventaActualizada: VentaExpress) => void;
  onEliminarVenta?: (ventaId: string) => void;
  onCrearCliente?: (cliente: Cliente) => void;
  onNavigateTab?: (tab: TabType) => void;
}

const PRECIOS_RAPIDOS = [50000, 60000, 70000, 80000, 100000, 120000];

const PRODUCTOS_SUGERIDOS = [
  'Figura Personalizada en Resina',
  'Miniatura Pintada a Mano',
  'Estatua Coleccionable',
  'Diorama / Escenario',
  'Llavero / Accesorio Geek'
];

export const POSExpressView: React.FC<POSExpressViewProps> = ({
  ventas,
  clientes,
  config,
  ordenes = [],
  productosStock = [],
  onGuardarVenta,
  onActualizarVenta,
  onEliminarVenta,
  onCrearCliente,
  onNavigateTab
}) => {
  // Form State
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);
  const [nombreProducto, setNombreProducto] = useState<string>('');
  const [productoStockId, setProductoStockId] = useState<string>('');
  const [descontarStock, setDescontarStock] = useState<boolean>(true);
  const [cantidadVender, setCantidadVender] = useState<number>(1);
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [clienteTelefono, setClienteTelefono] = useState<string>('');
  const [total, setTotal] = useState<number | ''>(80000);
  const [abono, setAbono] = useState<number | ''>(40000);
  const [fechaPrometida, setFechaPrometida] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [metodoPago, setMetodoPago] = useState<string>('Nequi');
  const [notas, setNotas] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Validación de Producción (OT) y Estado del Diseño 3D
  const [requiereOT, setRequiereOT] = useState<boolean>(true);
  const [estadoDiseno, setEstadoDiseno] = useState<EstadoDisenoPOS>('ya_realizado');
  const [enlaceDiseno, setEnlaceDiseno] = useState<string>('');
  const [notasDiseno, setNotasDiseno] = useState<string>('');

  // Modales de Edición, Eliminación y Abono Rápido
  const [ventaParaEditar, setVentaParaEditar] = useState<VentaExpress | null>(null);
  const [ventaParaEliminar, setVentaParaEliminar] = useState<VentaExpress | null>(null);
  const [ventaParaAbono, setVentaParaAbono] = useState<VentaExpress | null>(null);
  const [montoNuevoAbono, setMontoNuevoAbono] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cálculos dinámicos del formulario
  const totalNum = Number(total) || 0;
  const abonoNum = Number(abono) || 0;
  const saldoPendiente = Math.max(0, totalNum - abonoNum);

  const estadoPagoCalculado: EstadoPagoExpress = saldoPendiente <= 0 
    ? 'Pagado Total' 
    : abonoNum > 0 
      ? 'Abono Parcial' 
      : 'Pendiente';

  const alertaCobro = calcularAlertaCobro(fechaPrometida, saldoPendiente);

  // Manejo de captura / subida de foto
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImg(true);
      const optimized = await processAndOptimizeImage(file, 800, 800, 0.82);
      setFotoUrl(optimized);
    } catch (err) {
      console.error('Error optimizando foto POS:', err);
      toast.error('Hubo un error al procesar la foto.');
    } finally {
      setIsProcessingImg(false);
    }
  };

  // Autocompletar datos si selecciona cliente existente
  const handleSelectCliente = (cli: Cliente) => {
    setClienteNombre(cli.nombre);
    setClienteTelefono(cli.telefono);
  };

  // Manejo de Selección de Producto en Stock Físico (Conciliación Automática)
  const handleSelectProductoStock = (prodId: string) => {
    setProductoStockId(prodId);
    if (!prodId) return;

    const prod = productosStock.find(p => p.id === prodId);
    if (prod) {
      setNombreProducto(prod.nombre);
      const precioTotal = prod.precio_unitario * cantidadVender;
      setTotal(precioTotal);
      setAbono(precioTotal);
      setDescontarStock(true);
      setRequiereOT(false); // Entrega física inmediata de vitrina
      if (prod.imagen_url) {
        setFotoUrl(prod.imagen_url);
      }
    }
  };

  const handleCambiarCantidadVender = (nuevaCant: number) => {
    const cant = Math.max(1, nuevaCant);
    setCantidadVender(cant);
    if (productoStockId) {
      const prod = productosStock.find(p => p.id === productoStockId);
      if (prod) {
        const precioTotal = prod.precio_unitario * cant;
        setTotal(precioTotal);
        setAbono(precioTotal);
      }
    }
  };

  // Atajos para fecha prometida
  const setDiasFechaPrometida = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    setFechaPrometida(d.toISOString().slice(0, 10));
  };

  // Guardar Venta
  const handleSubmitVenta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreProducto.trim()) {
      toast.warning('Ingresa el nombre de la figura o producto.');
      return;
    }
    if (!clienteNombre.trim()) {
      toast.warning('Ingresa el nombre de la persona que compra/debe.');
      return;
    }
    if (totalNum <= 0) {
      toast.warning('Ingresa un valor total válido mayor a $0.');
      return;
    }

    if (requiereOT && !estadoDiseno) {
      toast.warning('Debes validar si el diseño 3D ya está realizado o si requiere un nuevo diseño antes de registrar la venta.');
      return;
    }

    const nuevaVenta: VentaExpress = {
      id: `pos-${Date.now()}`,
      numero_venta: generarConsecutivoPOS(ventas),
      foto_url: fotoUrl || undefined,
      nombre_producto: nombreProducto.trim(),
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: clienteTelefono.trim() || '3000000000',
      total: totalNum,
      abono: abonoNum,
      saldo_pendiente: saldoPendiente,
      estado_pago: estadoPagoCalculado,
      fecha_venta: new Date().toISOString().slice(0, 10),
      fecha_prometida_pago: saldoPendiente > 0 ? fechaPrometida : undefined,
      notas: notas.trim(),
      metodo_pago: metodoPago,
      creado_por: 'Equipo WJGEEKS',
      requiere_ot: requiereOT,
      estado_diseno: requiereOT ? estadoDiseno : undefined,
      enlace_diseno: (requiereOT && enlaceDiseno.trim()) ? enlaceDiseno.trim() : undefined,
      notas_diseno: (requiereOT && notasDiseno.trim()) ? notasDiseno.trim() : undefined,
      producto_stock_id: productoStockId || undefined,
      descontar_stock: Boolean(productoStockId && descontarStock),
      cantidad_vendida: cantidadVender
    };

    onGuardarVenta(nuevaVenta);

    // Si es cliente nuevo y tenemos onCrearCliente, registrarlo
    const existeCliente = clientes.some(c => c.nombre.toLowerCase() === clienteNombre.trim().toLowerCase());
    if (!existeCliente && onCrearCliente && clienteNombre.trim()) {
      onCrearCliente({
        id: `cli-${Date.now()}`,
        codigo: clientes.length + 1,
        nombre: clienteNombre.trim(),
        telefono: clienteTelefono.trim() || '3000000000',
        nit_cc: '222222222222',
        correo: ''
      });
    }

    // Efecto visual de éxito
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });

    // Preguntar si desea enviar comprobante por WhatsApp
    const detalleOT = nuevaVenta.requiere_ot 
      ? `\n🛠️ Se programó la Orden de Trabajo (${nuevaVenta.estado_diseno === 'ya_realizado' ? 'Diseño Listo para taller' : 'Requiere Modelado Nuevo por Germán'}).` 
      : '';

    if (nuevaVenta.cliente_telefono && nuevaVenta.cliente_telefono !== '3000000000') {
      const waUrl = generarWhatsAppComprobantePOS(nuevaVenta, config);
      if (confirm(`¡Venta ${nuevaVenta.numero_venta} registrada exitosamente!${detalleOT}\n\n¿Deseas enviar el comprobante por WhatsApp a ${nuevaVenta.cliente_nombre}?`)) {
        openWhatsApp(waUrl);
      }
    }

    // Reset Form
    setFotoUrl('');
    setProductoStockId('');
    setDescontarStock(true);
    setCantidadVender(1);
    setNombreProducto('');
    setClienteNombre('');
    setClienteTelefono('');
    setTotal(80000);
    setAbono(40000);
    setNotas('');
    setRequiereOT(true);
    setEstadoDiseno('ya_realizado');
    setEnlaceDiseno('');
    setNotasDiseno('');
  };

  // Guardar abono en modal
  const handleGuardarAbonoModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaParaAbono) return;

    const extraAbono = Number(montoNuevoAbono) || 0;
    if (extraAbono <= 0) return;

    const nuevoAbonoTotal = Math.min(ventaParaAbono.total, ventaParaAbono.abono + extraAbono);
    const nuevoSaldo = Math.max(0, ventaParaAbono.total - nuevoAbonoTotal);

    const updated: VentaExpress = {
      ...ventaParaAbono,
      abono: nuevoAbonoTotal,
      saldo_pendiente: nuevoSaldo,
      estado_pago: nuevoSaldo <= 0 ? 'Pagado Total' : 'Abono Parcial'
    };

    onActualizarVenta(updated);
    setVentaParaAbono(null);

    confetti({ particleCount: 50, spread: 50 });
  };

  // Filtrado de ventas recientes
  const ventasFiltradas = ventas.filter(v => {
    const matchBusqueda = v.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.numero_venta.toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;

    if (filtroEstado === 'todos') return true;
    if (filtroEstado === 'pendientes') return v.saldo_pendiente > 0;
    if (filtroEstado === 'pagados') return v.saldo_pendiente <= 0;
    if (filtroEstado === 'urgentes') {
      const alerta = calcularAlertaCobro(v.fecha_prometida_pago, v.saldo_pendiente);
      return alerta.nivel === 'vencido' || alerta.nivel === 'hoy' || alerta.nivel === 'proximo';
    }

    return true;
  });

  // Métricas rápidas del POS
  const totalVendido = ventas.reduce((sum, v) => sum + v.total, 0);
  const totalRecaudado = ventas.reduce((sum, v) => sum + v.abono, 0);
  const totalPorCobrar = ventas.reduce((sum, v) => sum + v.saldo_pendiente, 0);
  const totalAlertasUrgentes = ventas.filter(v => {
    const a = calcularAlertaCobro(v.fecha_prometida_pago, v.saldo_pendiente);
    return a.nivel === 'vencido' || a.nivel === 'hoy';
  }).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '70px' }}>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Camera size={24} color="var(--brand-cyan)" />
            POS Express • Ventas & Cobro Rápido
          </h2>
          <p className="section-subtitle">
            Toma una foto, registra el comprador, asigna abono y programa recordatorios de pago inteligentes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ 
            background: 'rgba(56, 189, 248, 0.12)', 
            border: '1px solid rgba(56, 189, 248, 0.35)', 
            color: 'var(--brand-cyan)', 
            padding: '6px 12px', 
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <DollarSign size={14} />
            <span>Por Cobrar: ${totalPorCobrar.toLocaleString('es-CO')}</span>
          </div>

          {totalAlertasUrgentes > 0 && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.15)', 
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              color: '#f87171', 
              padding: '6px 12px', 
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertTriangle size={14} />
              <span>{totalAlertasUrgentes} cobro(s) hoy/vencidos</span>
            </div>
          )}
        </div>
      </div>

      <div className="pos-layout-grid">
        {/* COLUMNA IZQUIERDA: FORMULARIO DE REGISTRO RÁPIDO */}
        <div className="glass-card" style={{ margin: 0, padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="var(--brand-cyan)" />
            Nueva Venta Express
          </h3>

          <form onSubmit={handleSubmitVenta}>
            {/* Foto de la Figura */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                FOTO DE LA FIGURA / PRODUCTO:
              </label>

              {fotoUrl ? (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: '200px' }}>
                  <img src={fotoUrl} alt="Preview figura" style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setFotoUrl('')}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(239, 68, 68, 0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Eliminar foto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover-card"
                >
                  <Camera size={32} color="var(--brand-cyan)" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    {isProcessingImg ? 'Optimizando foto...' : 'Toma una foto o sube imagen'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Se comprime automáticamente para que el sistema sea ultra rápido
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                capture="environment"
                style={{ display: 'none' }} 
                onChange={handleImageUpload} 
              />
            </div>

            {/* Selector Rápido de Stock Físico (Conciliación Automática de Vitrina) */}
            {productosStock.length > 0 && (
              <div style={{ marginBottom: '14px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Boxes size={14} />
                    VENDER FIGURA DESDE STOCK FÍSICO:
                  </label>
                  {productoStockId && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductoStockId('');
                        setNombreProducto('');
                        setDescontarStock(false);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      ✕ Quitar selección
                    </button>
                  )}
                </div>
                <select 
                  className="form-input"
                  style={{ background: '#0b1329', borderColor: productoStockId ? '#38bdf8' : 'var(--border-subtle)' }}
                  value={productoStockId}
                  onChange={e => handleSelectProductoStock(e.target.value)}
                >
                  <option value="">-- Personalizado / A pedido (no descuenta vitrina) --</option>
                  {productosStock.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Disponibles: {p.stock_actual} | ${p.precio_unitario.toLocaleString('es-CO')})
                    </option>
                  ))}
                </select>

                {productoStockId && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: descontarStock ? '#34d399' : 'inherit' }}>
                      <input 
                        type="checkbox"
                        checked={descontarStock}
                        onChange={e => setDescontarStock(e.target.checked)}
                      />
                      <span>✓ Descontar inventario al guardar</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Cantidad:</span>
                      <input 
                        type="number"
                        min="1"
                        max="99"
                        value={cantidadVender}
                        onChange={e => handleCambiarCantidadVender(parseInt(e.target.value) || 1)}
                        style={{ width: '52px', padding: '2px 6px', background: '#020617', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nombre del Producto */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                NOMBRE DE LA FIGURA / ARTÍCULO:
              </label>
              <input 
                type="text" 
                className="form-input"
                placeholder="Ej: Estatua Goku Ultra Instinto 10cm"
                value={nombreProducto}
                onChange={e => setNombreProducto(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {PRODUCTOS_SUGERIDOS.slice(0, 3).map(sug => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNombreProducto(sug)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '2px 8px',
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

            {/* Cliente & Teléfono */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  CLIENTE / COMPRADOR:
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Nombre de la persona"
                  value={clienteNombre}
                  onChange={e => setClienteNombre(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  TELÉFONO (WHATSAPP):
                </label>
                <input 
                  type="tel" 
                  className="form-input"
                  placeholder="Ej: 3202796115"
                  value={clienteTelefono}
                  onChange={e => setClienteTelefono(e.target.value)}
                />
              </div>
            </div>

            {/* Clientes Frecuentes Chips */}
            {clientes.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>
                  Clientes frecuentes:
                </span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {clientes.slice(0, 4).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCliente(c)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        color: 'var(--brand-cyan)',
                        cursor: 'pointer'
                      }}
                    >
                      {c.nombre.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Valores Financieros */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  PRECIO TOTAL (COP):
                </label>
                <input 
                  type="number" 
                  className="form-input"
                  value={total}
                  onChange={e => setTotal(e.target.value === '' ? '' : Number(e.target.value))}
                  step="5000"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  ABONO ACTUAL (COP):
                </label>
                <input 
                  type="number" 
                  className="form-input"
                  value={abono}
                  onChange={e => setAbono(e.target.value === '' ? '' : Number(e.target.value))}
                  step="5000"
                />
              </div>
            </div>

            {/* Precios Rápidos del Tarifario en Cuadrícula Simétrica */}
            <div className="mobile-grid-4" style={{ marginBottom: '14px' }}>
              {PRECIOS_RAPIDOS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setTotal(p);
                    setAbono(Math.round(p / 2));
                  }}
                  style={{
                    background: total === p ? 'var(--brand-cyan)' : 'rgba(255, 255, 255, 0.05)',
                    color: total === p ? '#000' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  ${(p / 1000)}k (50%)
                </button>
              ))}
            </div>

            {/* Saldo y Estado Calculado */}
            <div style={{
              background: saldoPendiente > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${saldoPendiente > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SALDO PENDIENTE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: saldoPendiente > 0 ? '#fbbf24' : '#34d399' }}>
                  ${saldoPendiente.toLocaleString('es-CO')} COP
                </div>
              </div>

              <div style={{
                background: saldoPendiente > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: saldoPendiente > 0 ? '#fbbf24' : '#34d399',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 800
              }}>
                {estadoPagoCalculado}
              </div>
            </div>

            {/* Fecha Prometida de Pago (Solo si hay saldo pendiente) */}
            {saldoPendiente > 0 && (
              <div style={{ marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    FECHA PROMESA DE PAGO:
                  </label>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: alertaCobro.color, background: alertaCobro.badgeBg, padding: '2px 8px', borderRadius: '6px' }}>
                    {alertaCobro.texto}
                  </span>
                </div>

                <input 
                  type="date" 
                  className="form-input"
                  value={fechaPrometida}
                  onChange={e => setFechaPrometida(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />

                <div className="mobile-grid-3" style={{ gap: '6px' }}>
                  <button type="button" onClick={() => setDiasFechaPrometida(0)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '5px 4px' }}>Hoy</button>
                  <button type="button" onClick={() => setDiasFechaPrometida(1)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '5px 4px' }}>Mañana</button>
                  <button type="button" onClick={() => setDiasFechaPrometida(3)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '5px 4px' }}>En 3 días</button>
                  <button type="button" onClick={() => setDiasFechaPrometida(7)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '5px 4px' }}>En 7 días</button>
                  <button type="button" onClick={() => setDiasFechaPrometida(15)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '5px 4px' }}>En 15 días</button>
                </div>
              </div>
            )}

            {/* Medio de pago & Notas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  MÉTODO DE PAGO:
                </label>
                <select 
                  className="form-select"
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                >
                  <option value="Nequi">Nequi</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Bancolombia">Bancolombia</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  NOTAS / OBSERVACIÓN:
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Detalles de entrega, etc."
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                />
              </div>
            </div>

            {/* SECCIÓN DE VALIDACIÓN: PRODUCCIÓN EN TALLER & ESTADO DEL DISEÑO 3D */}
            <div style={{
              background: requiereOT ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${requiereOT ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-subtle)'}`,
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={16} color="var(--brand-cyan)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                    PRODUCCIÓN & ORDEN DE TRABAJO (OT)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setRequiereOT(false)}
                    style={{
                      background: !requiereOT ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: !requiereOT ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📦 Solo Mostrador
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequiereOT(true)}
                    style={{
                      background: requiereOT ? 'var(--brand-cyan)' : 'rgba(255, 255, 255, 0.03)',
                      color: requiereOT ? '#000' : 'var(--text-muted)',
                      border: '1px solid var(--brand-cyan)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: requiereOT ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none'
                    }}
                  >
                    🛠️ Requiere OT
                  </button>
                </div>
              </div>

              {requiereOT ? (
                <div>
                  <div style={{ 
                    fontSize: '0.78rem', 
                    fontWeight: 800, 
                    color: 'var(--brand-cyan)', 
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>⚠️ VALIDACIÓN DEL DISEÑO 3D (OBLIGATORIO):</span>
                  </div>

                  {/* Selector de Estado del Diseño */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    {/* Opción A: Diseño Ya Realizado */}
                    <div 
                      onClick={() => setEstadoDiseno('ya_realizado')}
                      style={{
                        background: estadoDiseno === 'ya_realizado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                        border: `2px solid ${estadoDiseno === 'ya_realizado' ? '#34d399' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '10px',
                        padding: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: estadoDiseno === 'ya_realizado' ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <CheckCircle2 size={16} color={estadoDiseno === 'ya_realizado' ? '#34d399' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: estadoDiseno === 'ya_realizado' ? '#34d399' : '#fff' }}>
                          Diseño Ya Realizado
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                        El modelo 3D ya existe o está listo. Pasa a taller para impresión directa.
                      </p>
                    </div>

                    {/* Opción B: Requiere Diseño Nuevo */}
                    <div 
                      onClick={() => setEstadoDiseno('requiere_nuevo')}
                      style={{
                        background: estadoDiseno === 'requiere_nuevo' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                        border: `2px solid ${estadoDiseno === 'requiere_nuevo' ? '#fbbf24' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '10px',
                        padding: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: estadoDiseno === 'requiere_nuevo' ? '0 0 12px rgba(245, 158, 11, 0.25)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Sparkles size={16} color={estadoDiseno === 'requiere_nuevo' ? '#fbbf24' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: estadoDiseno === 'requiere_nuevo' ? '#fbbf24' : '#fff' }}>
                          Requiere Diseño Nuevo
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                        Germán debe modelar o diseñar antes de imprimir (<em>Modelado Pendiente</em>).
                      </p>
                    </div>
                  </div>

                  {/* Campos complementarios según la opción seleccionada */}
                  {estadoDiseno === 'ya_realizado' ? (
                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        ENLACE O RUTA DEL ARCHIVO 3D / STL (OPCIONAL):
                      </label>
                      <input 
                        type="url"
                        className="form-input"
                        placeholder="https://drive.google.com/... o cults3d.com/..."
                        value={enlaceDiseno}
                        onChange={e => setEnlaceDiseno(e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        DETALLES O REQUERIMIENTOS PARA EL NUEVO DISEÑO:
                      </label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="Ej: Posición de combate, logo grabado en base, escala 1:12..."
                        value={notasDiseno}
                        onChange={e => setNotasDiseno(e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                  )}

                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '0.72rem', 
                    color: estadoDiseno === 'ya_realizado' ? '#34d399' : '#fbbf24',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>ℹ️</span>
                    <span>
                      {estadoDiseno === 'ya_realizado' 
                        ? 'Se creará la OT con estado STL "Diseñado por Germán" lista para taller.'
                        : 'Se creará la OT con estado STL "Modelado Pendiente" para diseño previo por Germán.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Venta directa de mostrador: se registra el pago sin generar orden de producción en taller.
                </div>
              )}
            </div>

            {/* Botón Guardar Venta */}
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontWeight: 800, fontSize: '0.95rem' }}
            >
              <Sparkles size={18} />
              <span>Registrar Venta Express</span>
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL DE VENTAS EXPRESS & ALERTAS DE COBRO */}
        <div>
          {/* Barra de Filtros y Búsqueda */}
          <div className="glass-card" style={{ margin: '0 0 16px 0', padding: '14px' }}>
            <div className="pos-filter-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Buscar por cliente, figura o código..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
                />
              </div>

              <div className="pos-filters-grid">
                <button
                  type="button"
                  className={`btn btn-sm ${filtroEstado === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFiltroEstado('todos')}
                >
                  Todas ({ventas.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filtroEstado === 'urgentes' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFiltroEstado('urgentes')}
                  style={{ color: filtroEstado === 'urgentes' ? '#fff' : '#f87171' }}
                >
                  ⚠️ Alertas
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filtroEstado === 'pendientes' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFiltroEstado('pendientes')}
                >
                  Por Cobrar
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filtroEstado === 'pagados' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFiltroEstado('pagados')}
                >
                  Pagadas
                </button>
              </div>
            </div>
          </div>

          {/* Listado de Ventas Express */}
          {ventasFiltradas.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Receipt size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>No hay ventas express registradas con este filtro</div>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                Registra una venta rápida en el panel izquierdo para comenzar.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ventasFiltradas.map(venta => {
                const alerta = calcularAlertaCobro(venta.fecha_prometida_pago, venta.saldo_pendiente);
                const esPagado = venta.saldo_pendiente <= 0;

                return (
                  <div key={venta.id} className="glass-card" style={{ margin: 0, padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      {/* Miniatura Foto */}
                      {venta.foto_url ? (
                        <img 
                          src={venta.foto_url} 
                          alt={venta.nombre_producto} 
                          style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-subtle)' }} 
                        />
                      ) : (
                        <div style={{ width: '70px', height: '70px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-subtle)' }}>
                          <Camera size={24} color="var(--text-muted)" />
                        </div>
                      )}

                      {/* Información Principal */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-cyan)' }}>
                                {venta.numero_venta}
                              </span>
                              <span style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 800, 
                                padding: '2px 8px', 
                                borderRadius: '6px',
                                background: alerta.badgeBg,
                                color: alerta.color
                              }}>
                                {alerta.texto}
                              </span>
                            </div>

                            <h4 style={{ margin: '3px 0 2px 0', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                              {venta.nombre_producto}
                            </h4>

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              👤 <strong>{venta.cliente_nombre}</strong> • 📱 {venta.cliente_telefono}
                            </div>

                            {/* Badge de OT y Estado del Diseño */}
                            {venta.requiere_ot ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  padding: '2px 8px', 
                                  borderRadius: '6px',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: 'var(--brand-cyan)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Wrench size={11} />
                                  <span>{venta.ot_numero || 'OT en Taller'}</span>
                                </span>

                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: 800, 
                                  padding: '2px 8px', 
                                  borderRadius: '6px',
                                  background: venta.estado_diseno === 'requiere_nuevo' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                  color: venta.estado_diseno === 'requiere_nuevo' ? '#fbbf24' : '#34d399',
                                  border: `1px solid ${venta.estado_diseno === 'requiere_nuevo' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {venta.estado_diseno === 'requiere_nuevo' ? '🎨 Req. Diseño Nuevo' : '🟢 Diseño Listo'}
                                </span>

                                {onNavigateTab && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateTab('workflow')}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--brand-cyan)',
                                      fontSize: '0.7rem',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      fontWeight: 700,
                                      padding: '0 2px'
                                    }}
                                    title="Ir al Pipeline de Taller para ver esta OT"
                                  >
                                    Ver en Taller →
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div style={{ marginTop: '4px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  📦 Mostrador (Sin OT)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Valores */}
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: esPagado ? '#34d399' : '#fbbf24' }}>
                              {esPagado ? 'PAGADO COMPLETO' : `Debe: $${venta.saldo_pendiente.toLocaleString('es-CO')}`}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Total: ${venta.total.toLocaleString('es-CO')} • Abono: ${venta.abono.toLocaleString('es-CO')}
                            </div>
                          </div>
                        </div>

                        {/* Pie de la tarjeta con acciones */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            📅 Venta: {venta.fecha_venta} {venta.metodo_pago && `• 💳 ${venta.metodo_pago}`}
                          </div>

                          <div className="btn-group-mobile">
                            {/* Botón Editar Venta */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setVentaParaEditar(venta)}
                              style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Editar datos de esta venta"
                            >
                              <Edit3 size={13} color="var(--brand-cyan)" />
                              <span>Editar</span>
                            </button>

                            {/* Botón Registrar Abono */}
                            {!esPagado && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setVentaParaAbono(venta);
                                  setMontoNuevoAbono(venta.saldo_pendiente);
                                }}
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              >
                                <DollarSign size={13} color="#4ade80" />
                                <span>Abonar</span>
                              </button>
                            )}

                            {/* Botón WhatsApp Comprobante / Cobro */}
                            <button
                              type="button"
                              className="btn btn-whatsapp btn-sm"
                              onClick={() => {
                                const url = esPagado 
                                  ? generarWhatsAppComprobantePOS(venta, config)
                                  : generarWhatsAppRecordatorioCobro(venta, config);
                                openWhatsApp(url);
                              }}
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              title={esPagado ? 'Enviar recibo de pago por WhatsApp' : 'Enviar recordatorio de cobro por WhatsApp'}
                            >
                              <Send size={13} />
                              <span>{esPagado ? 'Comprobante' : 'Cobrar WhatsApp'}</span>
                            </button>

                            {/* Botón Eliminar Venta */}
                            {onEliminarVenta && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setVentaParaEliminar(venta)}
                                style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                title="Eliminar venta express"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE ABONO RÁPIDO */}
      {ventaParaAbono && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setVentaParaAbono(null)}
        >
          <div 
            className="glass-card" 
            style={{ maxWidth: '400px', width: '100%', margin: 0, padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                Registrar Abono • {ventaParaAbono.numero_venta}
              </h3>
              <button 
                type="button" 
                onClick={() => setVentaParaAbono(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Cliente: <strong style={{ color: '#fff' }}>{ventaParaAbono.cliente_nombre}</strong><br />
              Figura: <strong>{ventaParaAbono.nombre_producto}</strong><br />
              Saldo actual adeudado: <strong style={{ color: '#fbbf24' }}>${ventaParaAbono.saldo_pendiente.toLocaleString('es-CO')} COP</strong>
            </div>

            <form onSubmit={handleGuardarAbonoModal}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  MONTO DEL NUEVO ABONO (COP):
                </label>
                <input 
                  type="number"
                  className="form-input"
                  value={montoNuevoAbono}
                  onChange={e => setMontoNuevoAbono(Number(e.target.value))}
                  step="5000"
                  max={ventaParaAbono.saldo_pendiente}
                  autoFocus
                  required
                  style={{ fontSize: '1.2rem', fontWeight: 800, padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMontoNuevoAbono(ventaParaAbono.saldo_pendiente)}
                >
                  Pagar Todo (${ventaParaAbono.saldo_pendiente.toLocaleString('es-CO')})
                </button>
                {ventaParaAbono.saldo_pendiente > 20000 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setMontoNuevoAbono(Math.round(ventaParaAbono.saldo_pendiente / 2))}
                  >
                    La Mitad
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setVentaParaAbono(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ fontWeight: 800 }}
                >
                  Guardar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR VENTA EXPRESS */}
      {ventaParaEditar && (
        <ModalEditarVentaExpress
          isOpen={!!ventaParaEditar}
          venta={ventaParaEditar}
          clientes={clientes}
          onClose={() => setVentaParaEditar(null)}
          onGuardarCambios={(v) => {
            onActualizarVenta(v);
            setVentaParaEditar(null);
          }}
          onEliminarVenta={(id) => {
            if (onEliminarVenta) {
              onEliminarVenta(id);
              setVentaParaEditar(null);
            }
          }}
        />
      )}

      {/* DIÁLOGO CONFIRMAR ELIMINACIÓN DE VENTA EXPRESS */}
      {ventaParaEliminar && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setVentaParaEliminar(null)}
        >
          <div 
            className="glass-card" 
            style={{ 
              maxWidth: '420px', 
              width: '100%', 
              margin: 0, 
              padding: '24px', 
              textAlign: 'center', 
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 12px 35px rgba(239, 68, 68, 0.25)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '50%',
              width: '54px',
              height: '54px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto'
            }}>
              <Trash2 size={26} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff', fontWeight: 800 }}>
              ¿Eliminar Venta {ventaParaEliminar.numero_venta}?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Se removerá la figura <strong style={{ color: '#fff' }}>{ventaParaEliminar.nombre_producto}</strong> de <strong style={{ color: '#fff' }}>{ventaParaEliminar.cliente_nombre}</strong> (${ventaParaEliminar.total.toLocaleString('es-CO')} COP).<br/>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setVentaParaEliminar(null)}
                style={{ padding: '8px 18px' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ fontWeight: 800, padding: '8px 20px' }}
                onClick={() => {
                  if (onEliminarVenta) onEliminarVenta(ventaParaEliminar.id);
                  setVentaParaEliminar(null);
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
