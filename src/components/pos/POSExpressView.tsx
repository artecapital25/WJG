import React, { useState, useRef, useMemo } from 'react';
import { 
  Camera, 
  DollarSign, 
  UserPlus,
  UserCheck,
  Users,
  AlertTriangle, 
  Send, 
  Sparkles, 
  Trash2, 
  Plus, 
  Search, 
  Receipt,
  RotateCcw,
  Edit3,
  Wrench,
  CheckCircle2,
  Boxes,
  Copy,
  FileText,
  Link2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WjgButton, WjgProgressBar, WjgSearchInput, WjgSelect, getAlertSurfaceClassName, resolvePaymentAlert, toast } from '../ui';
import { VentaExpress, EstadoPagoExpress, EstadoDisenoPOS } from '../../types/pos';
import { Cliente, ConfiguracionTaller, OrdenTrabajo, TabType, ProductoStock, Cotizacion } from '../../types';
import { processAndOptimizeImage } from '../../services/imageService';
import { 
  calcularAlertaCobro, 
  generarConsecutivoPOS, 
  generarTextoComprobantePOS,
  generarWhatsAppComprobantePOS, 
  generarTextoRecordatorioCobro
} from '../../services/posService';
import { openWhatsApp } from '../../services/whatsappService';
import { ModalEditarVentaExpress } from './ModalEditarVentaExpress';
import { ModalConfirmacionWhatsApp } from '../common/ModalConfirmacionWhatsApp';
import { ModalVisualizadorDocumento } from '../common/ModalVisualizadorDocumento';
import { WjgMessageDispatcherModal } from '../messaging/WjgMessageDispatcherModal';
import { obtenerBlobURLReciboPOS } from '../../services/pdfService';
import { LEYENDA_IVA_CERO } from '../../features/cotizador/utils/pricingCalculator';
import { EmailNotificationService } from '../../services/emailNotificationService';
import { StorageService } from '../../services/storageService';
import {
  CatalogoClientesStats,
  FiltroTipoCliente,
  coincideBusquedaCliente,
  buscarCoincidenciasCliente,
  normalizarNitCc,
  normalizarCorreo
} from '../../utils/customerClassification';

interface POSExpressViewProps {
  ventas: VentaExpress[];
  clientes: Cliente[];
  config: ConfiguracionTaller;
  ordenes?: OrdenTrabajo[];
  productosStock?: ProductoStock[];
  cotizaciones?: Cotizacion[];
  onGuardarVenta: (nuevaVenta: VentaExpress) => void;
  onActualizarVenta: (ventaActualizada: VentaExpress) => void;
  onEliminarVenta?: (ventaId: string) => void;
  onCrearCliente?: (cliente: Cliente, opciones?: { allowShorterName?: boolean }) => Cliente | void;
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
  productosStock = [],
  cotizaciones = [],
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
  const [descontarStock, setDescontarStock] = useState<boolean>(false);
  const [cantidadVender, setCantidadVender] = useState<number>(1);
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [clienteTelefono, setClienteTelefono] = useState<string>('');
  const [clienteNitCc, setClienteNitCc] = useState<string>('');
  const [clienteCorreo, setClienteCorreo] = useState<string>('');
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState<boolean>(false);
  const [homonimoIgnorado, setHomonimoIgnorado] = useState<boolean>(false);
  const [total, setTotal] = useState<number | ''>(80000);
  const [abono, setAbono] = useState<number | ''>(40000);
  const [fechaPrometida, setFechaPrometida] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [metodoPago, setMetodoPago] = useState<string>('Bre-B');
  const [copiadoLlavePOS, setCopiadoLlavePOS] = useState<boolean>(false);

  const handleCopiarLlaveBreB = () => {
    navigator.clipboard.writeText('0090778625');
    setCopiadoLlavePOS(true);
    toast.success('Llave Bre-B (0090778625) copiada al portapapeles');
    setTimeout(() => setCopiadoLlavePOS(false), 2500);
  };

  const [notas, setNotas] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTipoCliente, setFiltroTipoCliente] = useState<FiltroTipoCliente>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Catálogo consolidado de clientes y métricas de transacciones
  const clientesStats = useMemo(() => {
    const listadoCotizaciones = cotizaciones && cotizaciones.length > 0
      ? cotizaciones
      : (typeof window !== 'undefined' ? StorageService.getCotizaciones() : []);
    return new CatalogoClientesStats(listadoCotizaciones, ventas);
  }, [cotizaciones, ventas]);

  // Conteos para los chips segmentadores por tipo de cliente
  const conteosTipoCliente = useMemo(() => {
    let nuevos = 0;
    let recurrentes = 0;
    ventas.forEach(v => {
      if (clientesStats.esClienteNuevo({ nombre: v.cliente_nombre, telefono: v.cliente_telefono })) {
        nuevos++;
      } else {
        recurrentes++;
      }
    });
    return { todos: ventas.length, nuevos, recurrentes };
  }, [ventas, clientesStats]);

  // Validación de Producción (OT) y Estado del Diseño 3D
  const [requiereOT, setRequiereOT] = useState<boolean>(true);
  const [estadoDiseno, setEstadoDiseno] = useState<EstadoDisenoPOS>('ya_realizado');
  const [enlaceDiseno, setEnlaceDiseno] = useState<string>('');
  const [notasDiseno, setNotasDiseno] = useState<string>('');

  // Modales de Edición, Eliminación y Gestión / Corrección de Pago Rápido
  const [ventaParaEditar, setVentaParaEditar] = useState<VentaExpress | null>(null);
  const [ventaParaNotificar, setVentaParaNotificar] = useState<{ venta: VentaExpress; modo: 'comprobante' | 'cobro' } | null>(null);

  const resolveClienteCorreoPOS = (v: VentaExpress): string => {
    if (v.cliente_correo && v.cliente_correo.includes('@')) return v.cliente_correo.trim();
    const match = clientes.find(
      c =>
        (v.cliente_id && c.id === v.cliente_id) ||
        c.nombre.trim().toLowerCase() === v.cliente_nombre.trim().toLowerCase()
    );
    return match?.correo || '';
  };
  const [ventaParaEliminar, setVentaParaEliminar] = useState<VentaExpress | null>(null);
  const [ventaParaAbono, setVentaParaAbono] = useState<VentaExpress | null>(null);
  const [estadoPagoModal, setEstadoPagoModal] = useState<EstadoPagoExpress>('Abono Parcial');
  const [abonoTotalModal, setAbonoTotalModal] = useState<number>(0);
  const [metodoPagoModal, setMetodoPagoModal] = useState<string>('Bre-B');
  const [ventaParaConfirmarWhatsApp, setVentaParaConfirmarWhatsApp] = useState<VentaExpress | null>(null);
  const [ivaPorcentajePOS, setIvaPorcentajePOS] = useState<number>(0);

  // Modal Visualizador de Documentos PDF y Texto Estructurado
  const [documentoVisualizar, setDocumentoVisualizar] = useState<{
    venta: VentaExpress;
    formato: 'ticket80mm' | 'reciboCarta';
    blobUrl: string | null;
    textoDescriptivo: string;
  } | null>(null);

  const handleAbrirVisorDocumento = async (venta: VentaExpress, formato: 'ticket80mm' | 'reciboCarta' = 'reciboCarta') => {
    try {
      const blobUrl = await obtenerBlobURLReciboPOS(venta, config, formato);
      const texto = generarTextoComprobantePOS(venta, config);
      setDocumentoVisualizar({
        venta,
        formato,
        blobUrl,
        textoDescriptivo: texto
      });
    } catch (e) {
      console.error('Error generando preview de recibo POS:', e);
      toast.error('No se pudo generar la vista previa del recibo.');
    }
  };

  const handleCambiarFormatoVisor = async (nuevoFormato: 'ticket80mm' | 'reciboCarta') => {
    if (!documentoVisualizar) return;
    try {
      const blobUrl = await obtenerBlobURLReciboPOS(documentoVisualizar.venta, config, nuevoFormato);
      setDocumentoVisualizar(prev => prev ? { ...prev, formato: nuevoFormato, blobUrl } : null);
    } catch (e) {
      console.error('Error cambiando formato de recibo:', e);
    }
  };

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

  // Coincidencias en tiempo real con todo el directorio de clientes (Cédula, Teléfono, Correo, Nombre)
  const coincidenciaCliente = useMemo(() => {
    return buscarCoincidenciasCliente(
      {
        id: clienteIdSeleccionado || undefined,
        nombre: clienteNombre,
        telefono: clienteTelefono,
        nit_cc: clienteNitCc,
        correo: clienteCorreo
      },
      clientes
    );
  }, [clienteIdSeleccionado, clienteNombre, clienteTelefono, clienteNitCc, clienteCorreo, clientes]);

  const sugerenciasAutocompletar = useMemo(() => {
    const q = (clienteNombre || clienteTelefono || clienteNitCc || clienteCorreo).trim();
    if (!q) return clientes.slice(0, 8);
    return clientes.filter(c => coincideBusquedaCliente(c, q)).slice(0, 8);
  }, [clientes, clienteNombre, clienteTelefono, clienteNitCc, clienteCorreo]);

  // Autocompletar datos si selecciona cliente existente o cotejo del directorio
  const handleSelectCliente = (cli: Cliente) => {
    setClienteIdSeleccionado(cli.id);
    setClienteNombre(cli.nombre);
    setClienteTelefono(cli.telefono || '');
    setClienteNitCc(cli.nit_cc || '');
    setClienteCorreo(cli.correo || '');
    setMostrarSugerenciasCliente(false);
    setHomonimoIgnorado(false);
  };

  const handleLimpiarClienteSeleccionado = () => {
    setClienteIdSeleccionado('');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteNitCc('');
    setClienteCorreo('');
    setHomonimoIgnorado(false);
  };

  // Manejo de Selección de Producto en Stock Físico (Conciliación pausada hasta validación futura)
  const handleSelectProductoStock = (prodId: string) => {
    setProductoStockId(prodId);
    if (!prodId) return;

    const prod = productosStock.find(p => p.id === prodId);
    if (prod) {
      setNombreProducto(prod.nombre);
      const precioTotal = prod.precio_unitario * cantidadVender;
      setTotal(precioTotal);
      setAbono(precioTotal);
      setDescontarStock(false);
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

    const subtotalCalc = ivaPorcentajePOS > 0 
      ? Math.round(totalNum / (1 + (ivaPorcentajePOS / 100)))
      : totalNum;
    const ivaMontoCalc = totalNum - subtotalCalc;

    const clienteVinculadoId = clienteIdSeleccionado || coincidenciaCliente.exactMatch?.id || undefined;
    const nuevaVenta: VentaExpress = {
      id: `pos-${Date.now()}`,
      numero_venta: generarConsecutivoPOS(ventas),
      foto_url: fotoUrl || undefined,
      nombre_producto: nombreProducto.trim(),
      cliente_id: clienteVinculadoId,
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: clienteTelefono.trim() || coincidenciaCliente.exactMatch?.telefono || '3000000000',
      cliente_nit_cc: normalizarNitCc(clienteNitCc) || coincidenciaCliente.exactMatch?.nit_cc || undefined,
      cliente_correo: normalizarCorreo(clienteCorreo) || coincidenciaCliente.exactMatch?.correo || undefined,
      subtotal: subtotalCalc,
      iva_porcentaje: ivaPorcentajePOS,
      iva_monto: ivaMontoCalc,
      iva_regimen_nota: ivaPorcentajePOS === 0 ? LEYENDA_IVA_CERO : undefined,
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

    // Detener reseteo automático y abrir modal de confirmación con vista previa
    setVentaParaConfirmarWhatsApp(nuevaVenta);
  };

  // Ejecución del guardado final y limpieza de estado solo tras validación
  const ejecutarGuardadoFinalVenta = (ventaAGuardar: VentaExpress) => {
    let ventaFinal: VentaExpress = { ...ventaAGuardar };

    // Crear o actualizar SIEMPRE al cliente en el directorio único (actualiza campos nuevos en cada compra)
    let clienteCanonic: Cliente | undefined;
    if (onCrearCliente && ventaFinal.cliente_nombre.trim()) {
      const resCli = onCrearCliente({
        id: ventaFinal.cliente_id || `cli-${Date.now()}`,
        codigo: clientes.length + 1,
        nombre: ventaFinal.cliente_nombre.trim(),
        telefono: ventaFinal.cliente_telefono.trim(),
        nit_cc: normalizarNitCc(ventaFinal.cliente_nit_cc),
        correo: normalizarCorreo(ventaFinal.cliente_correo)
      });
      if (resCli && typeof resCli === 'object') {
        clienteCanonic = resCli;
        ventaFinal = {
          ...ventaFinal,
          cliente_id: resCli.id,
          cliente_nombre: resCli.nombre,
          cliente_telefono: resCli.telefono || ventaFinal.cliente_telefono,
          cliente_nit_cc: resCli.nit_cc || ventaFinal.cliente_nit_cc,
          cliente_correo: resCli.correo || ventaFinal.cliente_correo
        };
      }
    }

    onGuardarVenta(ventaFinal);

    // Efecto visual de éxito
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });

    const detalleOT = ventaFinal.requiere_ot 
      ? ` • OT programada (${ventaFinal.estado_diseno === 'ya_realizado' ? 'Diseño Listo' : 'Modelado por Germán'})` 
      : '';

    toast.success(`Venta ${ventaFinal.numero_venta} registrada exitosamente`, detalleOT || undefined);

    // Disparo dual por correo de contingencia si el cliente tiene correo registrado
    const clienteMatch = clienteCanonic || coincidenciaCliente.exactMatch || clientes.find(
      c => c.id === ventaFinal.cliente_id || c.nombre.toLowerCase().trim() === ventaFinal.cliente_nombre.toLowerCase().trim()
    );
    const correoDestino = ventaFinal.cliente_correo || clienteMatch?.correo;
    if (correoDestino) {
      EmailNotificationService.enviarCorreoAbono(
        {
          ...(clienteMatch || {
            id: ventaFinal.cliente_id || 'cli-temp',
            codigo: 1,
            nombre: ventaFinal.cliente_nombre,
            telefono: ventaFinal.cliente_telefono,
            nit_cc: ventaFinal.cliente_nit_cc || '',
            correo: correoDestino
          }),
          correo: correoDestino
        },
        ventaFinal.numero_venta,
        ventaFinal.abono,
        ventaFinal.saldo_pendiente,
        ventaFinal.total,
        ventaFinal.metodo_pago
      );
    }

    // Reset Form SOLO tras confirmación explícita
    setFotoUrl('');
    setProductoStockId('');
    setDescontarStock(false);
    setCantidadVender(1);
    setNombreProducto('');
    setClienteIdSeleccionado('');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteNitCc('');
    setClienteCorreo('');
    setHomonimoIgnorado(false);
    setMostrarSugerenciasCliente(false);
    setTotal(80000);
    setAbono(40000);
    setNotas('');
    setRequiereOT(true);
    setEstadoDiseno('ya_realizado');
    setEnlaceDiseno('');
    setNotasDiseno('');
    setVentaParaConfirmarWhatsApp(null);
  };

  // Abrir modal de gestión / corrección de pago (permite incrementar, corregir a la baja o reversar a $0)
  const abrirModalGestionPagoPOS = (venta: VentaExpress) => {
    setVentaParaAbono(venta);
    const esPagadoTotal = venta.saldo_pendiente <= 0 && venta.total > 0;
    const estadoInicial: EstadoPagoExpress = esPagadoTotal
      ? 'Pagado Total'
      : (venta.abono > 0 ? 'Abono Parcial' : 'Pendiente');
    setEstadoPagoModal(estadoInicial);
    setAbonoTotalModal(venta.abono || 0);
    setMetodoPagoModal(venta.metodo_pago || 'Bre-B');
  };

  // Guardar abono o corrección de pago en modal
  const handleGuardarAbonoModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaParaAbono) return;

    let nuevoAbonoTotal = 0;
    if (estadoPagoModal === 'Pagado Total') {
      nuevoAbonoTotal = ventaParaAbono.total;
    } else if (estadoPagoModal === 'Pendiente') {
      nuevoAbonoTotal = 0;
    } else {
      nuevoAbonoTotal = Math.min(ventaParaAbono.total, Math.max(0, Number(abonoTotalModal) || 0));
    }

    const nuevoSaldo = Math.max(0, ventaParaAbono.total - nuevoAbonoTotal);
    const nuevoEstadoPago: EstadoPagoExpress = nuevoSaldo <= 0 && ventaParaAbono.total > 0
      ? 'Pagado Total'
      : (nuevoAbonoTotal > 0 ? 'Abono Parcial' : 'Pendiente');

    const updated: VentaExpress = {
      ...ventaParaAbono,
      abono: nuevoAbonoTotal,
      saldo_pendiente: nuevoSaldo,
      estado_pago: nuevoEstadoPago,
      metodo_pago: metodoPagoModal || ventaParaAbono.metodo_pago || 'Bre-B'
    };

    onActualizarVenta(updated);
    setVentaParaAbono(null);

    if (nuevoSaldo <= 0 && ventaParaAbono.total > 0) {
      confetti({ particleCount: 50, spread: 50 });
    }
  };

  // Filtrado de ventas recientes con búsqueda y segmentación por tipo de cliente
  const ventasFiltradas = ventas.filter(v => {
    const matchBusqueda = coincideBusquedaCliente({ nombre: v.cliente_nombre, telefono: v.cliente_telefono }, busqueda) ||
      v.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.numero_venta.toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;

    // Filtro por tipo de cliente (Nuevo vs Recurrente)
    if (filtroTipoCliente === 'nuevos' && !clientesStats.esClienteNuevo({ nombre: v.cliente_nombre, telefono: v.cliente_telefono })) {
      return false;
    }
    if (filtroTipoCliente === 'recurrentes' && !clientesStats.esClienteRecurrente({ nombre: v.cliente_nombre, telefono: v.cliente_telefono })) {
      return false;
    }

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
                  style={{
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '18px 16px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Camera size={28} color="var(--brand-cyan)" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '10px' }}>
                    {isProcessingImg ? 'Optimizando foto...' : 'Adjuntar foto de la pieza'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📁 Elegir de Galería / Archivo
                    </button>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      📷 Tomar con Cámara
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Se comprime automáticamente para que el sistema sea ultra rápido
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
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
                <WjgSelect
                  value={productoStockId}
                  onChange={handleSelectProductoStock}
                  searchPlaceholder="Buscar producto en vitrina..."
                  style={{ borderColor: productoStockId ? '#38bdf8' : undefined }}
                  options={[
                    { value: '', label: 'Personalizado / A pedido', subtitle: 'No descuenta vitrina' },
                    ...productosStock.map(p => ({
                      value: p.id,
                      label: p.nombre,
                      subtitle: `Disponibles: ${p.stock_actual} • $${p.precio_unitario.toLocaleString('es-CO')} COP`,
                    })),
                  ]}
                />

                {productoStockId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: descontarStock ? '#34d399' : 'inherit' }}>
                        <input 
                          type="checkbox"
                          checked={descontarStock}
                          onChange={e => setDescontarStock(e.target.checked)}
                        />
                        <span>Descontar inventario al guardar</span>
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
                    <div style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', padding: '4px 8px' }}>
                      ⏸️ Descuento automático desactivado por defecto (en validación futura en Estado de la Empresa).
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

            {/* Identificación Inteligente de Cliente en Base de Datos */}
            <div style={{ background: 'rgba(56, 189, 248, 0.04)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '12px', marginBottom: '14px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Users size={14} />
                  <span>CLIENTE / COMPRADOR (Directorio Único: {clientes.length})</span>
                </span>
                {(clienteIdSeleccionado || clienteNombre || clienteTelefono || clienteNitCc || clienteCorreo) && (
                  <button
                    type="button"
                    onClick={handleLimpiarClienteSeleccionado}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <X size={12} />
                    <span>Limpiar cliente</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    NOMBRE COMPLETO / BUSCAR *:
                  </label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Buscar o escribir nombre..."
                    value={clienteNombre}
                    onFocus={() => setMostrarSugerenciasCliente(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerenciasCliente(false), 200)}
                    onChange={e => {
                      setClienteNombre(e.target.value);
                      setMostrarSugerenciasCliente(true);
                      setHomonimoIgnorado(false);
                    }}
                    required
                  />
                  {mostrarSugerenciasCliente && sugerenciasAutocompletar.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 60,
                      marginTop: '4px',
                      background: '#0b1329',
                      border: '1px solid rgba(56, 189, 248, 0.45)',
                      borderRadius: '8px',
                      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.65)',
                      maxHeight: '210px',
                      overflowY: 'auto'
                    }}>
                      {sugerenciasAutocompletar.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            handleSelectCliente(c);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 10px',
                            background: clienteIdSeleccionado === c.id ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{c.nombre}</span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            📱 {c.telefono || 'Sin tel'} {c.nit_cc ? `• 🆔 ${c.nit_cc}` : ''} {c.correo ? `• ✉️ ${c.correo}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    CÉDULA / NIT (OPCIONAL):
                  </label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Ej: 1018480904"
                    value={clienteNitCc}
                    onChange={e => setClienteNitCc(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    CORREO ELECTRÓNICO (OPCIONAL):
                  </label>
                  <input 
                    type="email" 
                    className="form-input"
                    placeholder="cliente@correo.com"
                    value={clienteCorreo}
                    onChange={e => setClienteCorreo(e.target.value)}
                  />
                </div>
              </div>

              {/* Aviso de Cliente Existente Vinculado Automáticamente */}
              {coincidenciaCliente.exactMatch && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.74rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link2 size={14} color="#34d399" />
                    <span>
                      <strong>Vinculado a {coincidenciaCliente.exactMatch.nombre}</strong>
                      {' '}({coincidenciaCliente.matchReason === 'nit_cc' ? 'por Cédula/NIT' : coincidenciaCliente.matchReason === 'telefono' ? 'por Teléfono' : coincidenciaCliente.matchReason === 'correo' ? 'por Correo' : 'del Directorio'}). Los cambios actualizarán su ficha.
                    </span>
                  </div>
                  {(
                    (!clienteTelefono.trim() && coincidenciaCliente.exactMatch.telefono) ||
                    (!clienteNitCc.trim() && coincidenciaCliente.exactMatch.nit_cc) ||
                    (!clienteCorreo.trim() && coincidenciaCliente.exactMatch.correo) ||
                    clienteIdSeleccionado !== coincidenciaCliente.exactMatch.id
                  ) && (
                    <button
                      type="button"
                      onClick={() => handleSelectCliente(coincidenciaCliente.exactMatch!)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.25)',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        color: '#ecfdf5',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Cargar datos completos
                    </button>
                  )}
                </div>
              )}

              {/* Tarjeta de Cotejo cuando solo coincide por Nombre (previene duplicados al dar solo nombre) */}
              {!coincidenciaCliente.exactMatch && coincidenciaCliente.nameMatches.length > 0 && !homonimoIgnorado && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#fbbf24' }}>
                      ⚠️ Encontramos {coincidenciaCliente.nameMatches.length} cliente(s) similar(es) en la base de datos:
                    </span>
                    <button
                      type="button"
                      onClick={() => setHomonimoIgnorado(true)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#cbd5e1',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Es otra persona (Crear nuevo)
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {coincidenciaCliente.nameMatches.slice(0, 3).map(cand => (
                      <div key={cand.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ fontSize: '0.73rem', color: '#f8fafc' }}>
                          <strong>{cand.nombre}</strong>
                          <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                            📱 {cand.telefono || 'Sin tel'} {cand.nit_cc ? `• 🆔 ${cand.nit_cc}` : ''} {cand.correo ? `• ✉️ ${cand.correo}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectCliente(cand)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.2)',
                            border: '1px solid rgba(56, 189, 248, 0.45)',
                            color: '#7dd3fc',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Vincular este cliente
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clientes Recientes Chips */}
              {clientes.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>
                    Acceso rápido directorio:
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {clientes.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCliente(c)}
                        style={{
                          background: clienteIdSeleccionado === c.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '6px',
                          padding: '2px 7px',
                          fontSize: '0.69rem',
                          color: 'var(--brand-cyan)',
                          cursor: 'pointer'
                        }}
                      >
                        {c.nombre.split(' ').slice(0, 2).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Valores Financieros */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  PRECIO TOTAL (COP):
                </label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  className="form-input"
                  value={total}
                  onChange={e => setTotal(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  min="0"
                  step="any"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  ABONO ACTUAL (COP):
                </label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  className="form-input"
                  value={abono}
                  onChange={e => setAbono(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  min="0"
                  step="any"
                />
              </div>
            </div>

            {/* Tratamiento Tributario e IVA Obligatorio */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '10px 12px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  IMPUESTO (IVA):
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ivaPorcentajePOS > 0 ? 'var(--brand-cyan)' : 'var(--text-muted)' }}>
                  {ivaPorcentajePOS === 0 ? `0% (${LEYENDA_IVA_CERO})` : `${ivaPorcentajePOS}%`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${ivaPorcentajePOS === 0 ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem' }}
                  onClick={() => setIvaPorcentajePOS(0)}
                >
                  0% (Sin IVA)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${ivaPorcentajePOS === 19 ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem' }}
                  onClick={() => setIvaPorcentajePOS(19)}
                >
                  19% (General)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${ivaPorcentajePOS === 5 ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem' }}
                  onClick={() => setIvaPorcentajePOS(5)}
                >
                  5%
                </button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  MÉTODO DE PAGO:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <WjgSelect
                      value={metodoPago}
                      onChange={setMetodoPago}
                      options={[
                        { value: 'Bre-B', label: 'Bre-B', subtitle: 'Llave: 0090778625' },
                        { value: 'Nequi', label: 'Nequi' },
                        { value: 'Efectivo', label: 'Efectivo' },
                        { value: 'Transferencia', label: 'Transferencia Bancaria' },
                        { value: 'Tarjeta', label: 'Tarjeta / Datáfono' },
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopiarLlaveBreB}
                    title="Copiar llave Bre-B (0090778625)"
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: copiadoLlavePOS ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.15)',
                      borderColor: copiadoLlavePOS ? '#10b981' : '#06b6d4',
                      color: copiadoLlavePOS ? '#34d399' : '#38bdf8',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copiadoLlavePOS ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    {copiadoLlavePOS ? '¡Copiada!' : 'Copiar llave Bre-B'}
                  </button>
                </div>
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
            <WjgButton
              type="submit"
              variant="quote"
              fullWidth
              leftIcon={<Sparkles size={18} />}
              style={{ padding: '12px', fontSize: '0.95rem' }}
            >
              Registrar Venta Express
            </WjgButton>
          </form>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL DE VENTAS EXPRESS & ALERTAS DE COBRO */}
        <div>
          {/* Barra de Filtros y Búsqueda */}
          <div className="glass-card" style={{ margin: '0 0 16px 0', padding: '14px' }}>
            <div className="pos-filter-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <WjgSearchInput
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar por cliente, figura o código..."
                compact
                style={{ flex: 1, minWidth: '200px' }}
              />

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

            {/* Segmentador Rápido por Tipo de Cliente (Nuevos vs Recurrentes) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={13} color="var(--brand-cyan)" />
                CLIENTE:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFiltroTipoCliente('todos')}
                  className={`btn btn-sm ${filtroTipoCliente === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                >
                  Todos ({conteosTipoCliente.todos})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoCliente('nuevos')}
                  className={`btn btn-sm ${filtroTipoCliente === 'nuevos' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ 
                    padding: '3px 10px', 
                    fontSize: '0.78rem', 
                    borderRadius: '6px',
                    borderColor: filtroTipoCliente === 'nuevos' ? undefined : 'rgba(16, 185, 129, 0.4)',
                    color: filtroTipoCliente === 'nuevos' ? undefined : '#34d399'
                  }}
                >
                  <UserPlus size={12} style={{ marginRight: '4px' }} />
                  Nuevos ({conteosTipoCliente.nuevos})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoCliente('recurrentes')}
                  className={`btn btn-sm ${filtroTipoCliente === 'recurrentes' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ 
                    padding: '3px 10px', 
                    fontSize: '0.78rem', 
                    borderRadius: '6px',
                    borderColor: filtroTipoCliente === 'recurrentes' ? undefined : 'rgba(59, 130, 246, 0.4)',
                    color: filtroTipoCliente === 'recurrentes' ? undefined : '#60a5fa'
                  }}
                >
                  <UserCheck size={12} style={{ marginRight: '4px' }} />
                  Recurrentes ({conteosTipoCliente.recurrentes})
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
                const payAlert = resolvePaymentAlert({
                  total: venta.total,
                  abono: venta.abono,
                  saldoPendiente: venta.saldo_pendiente,
                  estadoPago: venta.estado_pago,
                  vencido: alerta.nivel === 'vencido' || alerta.nivel === 'hoy',
                  porVencer: alerta.nivel === 'proximo',
                });

                return (
                  <div key={venta.id} className={getAlertSurfaceClassName(payAlert.tone, 'glass-card')} style={{ margin: 0, padding: '16px' }}>
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '3px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 700 }}>
                                👤 {venta.cliente_nombre}
                              </span>
                              {clientesStats.esClienteNuevo({ nombre: venta.cliente_nombre, telefono: venta.cliente_telefono }) ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: '9999px',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.35)'
                                  }}
                                  title="Primera cotización o compra registrada"
                                >
                                  <UserPlus size={10} />
                                  Nuevo
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: '9999px',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(59, 130, 246, 0.35)'
                                  }}
                                  title={`Cliente frecuente (${clientesStats.getTransaccionesCount({ nombre: venta.cliente_nombre, telefono: venta.cliente_telefono })} transacciones)`}
                                >
                                  <UserCheck size={10} />
                                  Frecuente
                                </span>
                              )}
                              {venta.cliente_telefono && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  • 📱 {venta.cliente_telefono}
                                </span>
                              )}
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
                        <div style={{ marginTop: '10px' }}>
                          <WjgProgressBar
                            percent={payAlert.percent ?? 0}
                            label="Pago"
                            rightText={`${payAlert.percent ?? 0}% ($${venta.abono.toLocaleString('es-CO')} / $${venta.total.toLocaleString('es-CO')})`}
                            size="sm"
                            showPercent={false}
                          />
                        </div>
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

                            {/* Botón Ver / Descargar Recibo PDF y Texto */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleAbrirVisorDocumento(venta, 'ticket80mm')}
                              style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--brand-cyan)' }}
                              title="Ver recibo formal en PDF y copiar texto para WhatsApp"
                            >
                              <FileText size={13} />
                              <span>Recibo PDF</span>
                            </button>

                            {/* Botón Siempre Visible: Abonar o Cambiar / Corregir Pago */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => abrirModalGestionPagoPOS(venta)}
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                borderColor: esPagado ? 'rgba(245, 158, 11, 0.45)' : 'rgba(74, 222, 128, 0.4)',
                                color: esPagado ? '#fbbf24' : '#4ade80'
                              }}
                              title={esPagado ? 'Corregir o cambiar abono / estado de pago' : 'Registrar abono o liquidar saldo'}
                            >
                              {esPagado ? <RotateCcw size={13} color="#fbbf24" /> : <DollarSign size={13} color="#4ade80" />}
                              <span>{esPagado ? 'Cambiar Pago' : 'Abonar'}</span>
                            </button>

                            {/* Botón WhatsApp y Correo Comprobante / Cobro */}
                            <button
                              type="button"
                              className="btn btn-whatsapp btn-sm"
                              onClick={() =>
                                setVentaParaNotificar({
                                  venta,
                                  modo: esPagado ? 'comprobante' : 'cobro'
                                })
                              }
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              title={esPagado ? 'Enviar recibo de pago por WhatsApp y Correo' : 'Enviar recordatorio de cobro por WhatsApp y Correo'}
                            >
                              <Send size={13} />
                              <span>{esPagado ? 'Comprobante' : 'Cobrar / Notificar'}</span>
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

      {/* MODAL DE GESTIÓN Y CORRECCIÓN DE PAGO POS */}
      {ventaParaAbono && (() => {
        const abonoObjetivoPreview = estadoPagoModal === 'Pagado Total'
          ? ventaParaAbono.total
          : estadoPagoModal === 'Pendiente'
            ? 0
            : Math.min(ventaParaAbono.total, Math.max(0, Number(abonoTotalModal) || 0));
        const nuevoSaldoPreview = Math.max(0, ventaParaAbono.total - abonoObjetivoPreview);
        const esReversion = abonoObjetivoPreview < (ventaParaAbono.abono || 0);
        return (
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
              style={{ maxWidth: '460px', width: '100%', margin: 0, padding: '24px', maxHeight: '92vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#fff' }}>
                  💳 Gestionar / Corregir Pago • {ventaParaAbono.numero_venta}
                </h3>
                <button
                  type="button"
                  onClick={() => setVentaParaAbono(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', minWidth: '32px', minHeight: '32px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>Cliente: <strong style={{ color: '#fff' }}>{ventaParaAbono.cliente_nombre}</strong></div>
                <div>Producto: <strong style={{ color: '#e2e8f0' }}>{ventaParaAbono.nombre_producto}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>Total Venta: <strong style={{ color: '#fff' }}>${ventaParaAbono.total.toLocaleString('es-CO')}</strong></span>
                  <span>Abonado Actual: <strong style={{ color: '#38bdf8' }}>${(ventaParaAbono.abono || 0).toLocaleString('es-CO')}</strong></span>
                </div>
              </div>

              <form onSubmit={handleGuardarAbonoModal}>
                {/* Selector de 3 estados para corregir libremente */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    ESTADO DE PAGO REAL:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEstadoPagoModal('Pendiente');
                        setAbonoTotalModal(0);
                      }}
                      className="btn btn-sm"
                      style={{
                        minHeight: '42px',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        background: estadoPagoModal === 'Pendiente' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${estadoPagoModal === 'Pendiente' ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
                        color: estadoPagoModal === 'Pendiente' ? '#fca5a5' : 'var(--text-muted)'
                      }}
                    >
                      Sin Pago ($0)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEstadoPagoModal('Abono Parcial');
                        if (abonoTotalModal <= 0 || abonoTotalModal >= ventaParaAbono.total) {
                          setAbonoTotalModal(Math.round(ventaParaAbono.total / 2));
                        }
                      }}
                      className="btn btn-sm"
                      style={{
                        minHeight: '42px',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        background: estadoPagoModal === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${estadoPagoModal === 'Abono Parcial' ? '#f59e0b' : 'rgba(255,255,255,0.12)'}`,
                        color: estadoPagoModal === 'Abono Parcial' ? '#fcd34d' : 'var(--text-muted)'
                      }}
                    >
                      Abono Parcial
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEstadoPagoModal('Pagado Total');
                        setAbonoTotalModal(ventaParaAbono.total);
                      }}
                      className="btn btn-sm"
                      style={{
                        minHeight: '42px',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        background: estadoPagoModal === 'Pagado Total' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${estadoPagoModal === 'Pagado Total' ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
                        color: estadoPagoModal === 'Pagado Total' ? '#6ee7b7' : 'var(--text-muted)'
                      }}
                    >
                      Pagado 100%
                    </button>
                  </div>
                </div>

                {/* Monto total abonado acumulado (sin step restrictivo) */}
                {estadoPagoModal === 'Abono Parcial' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      ABONO TOTAL RECIBIDO ACUMULADO (COP):
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={abonoTotalModal === 0 ? '' : abonoTotalModal}
                      onChange={e => setAbonoTotalModal(e.target.value === '' ? 0 : Number(e.target.value))}
                      min="0"
                      step="any"
                      max={ventaParaAbono.total}
                      autoFocus
                      required
                      style={{ fontSize: '1.15rem', fontWeight: 800, padding: '10px 12px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setAbonoTotalModal(Math.round(ventaParaAbono.total * 0.5))}
                      >
                        50% (${Math.round(ventaParaAbono.total * 0.5).toLocaleString('es-CO')})
                      </button>
                      {ventaParaAbono.saldo_pendiente > 0 && ventaParaAbono.abono > 0 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAbonoTotalModal(ventaParaAbono.total)}
                        >
                          Completar Saldo (+${ventaParaAbono.saldo_pendiente.toLocaleString('es-CO')})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Método de pago */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    MÉTODO DE PAGO:
                  </label>
                  <WjgSelect
                    value={metodoPagoModal}
                    onChange={setMetodoPagoModal}
                    options={[
                      { value: 'Bre-B', label: 'Bre-B / Llave' },
                      { value: 'Nequi', label: 'Nequi' },
                      { value: 'Efectivo', label: 'Efectivo' },
                      { value: 'Transferencia', label: 'Transferencia Bancaria' },
                      { value: 'Tarjeta', label: 'Tarjeta / Datáfono' },
                    ]}
                  />
                </div>

                {/* Resumen de impacto y alerta si es reversión */}
                <div style={{
                  marginBottom: '14px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: esReversion ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                  border: `1px solid ${esReversion ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.25)'}`,
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Nuevo Abono Total:</span>
                    <strong style={{ color: '#fff' }}>${abonoObjetivoPreview.toLocaleString('es-CO')} COP</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Nuevo Saldo Pendiente:</span>
                    <strong style={{ color: nuevoSaldoPreview > 0 ? '#fbbf24' : '#34d399' }}>
                      ${nuevoSaldoPreview.toLocaleString('es-CO')} COP
                    </strong>
                  </div>
                  {esReversion && (
                    <div style={{ marginTop: '6px', color: '#fcd34d', fontSize: '0.72rem' }}>
                      ⚠️ Reversión detectada: el libro contable (<code>abonos_pagos</code>) y cuentas asociadas se ajustarán al instante.
                    </div>
                  )}
                </div>

                {/* Llave Bre-B en Modal de Abono */}
                <div style={{
                  marginBottom: '16px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Llave <strong style={{ color: '#06b6d4' }}>Bre-B</strong>: <span style={{ color: '#38bdf8', fontWeight: 800 }}>0090778625</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopiarLlaveBreB}
                    className="btn btn-sm"
                    style={{
                      background: copiadoLlavePOS ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.2)',
                      border: `1px solid ${copiadoLlavePOS ? '#10b981' : '#06b6d4'}`,
                      color: copiadoLlavePOS ? '#34d399' : '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px'
                    }}
                  >
                    {copiadoLlavePOS ? '¡Copiada!' : 'Copiar'}
                  </button>
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
                    {esReversion ? 'Aplicar Corrección' : 'Guardar Pago'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL EDITAR VENTA EXPRESS */}
      {ventaParaEditar && (
        <ModalEditarVentaExpress
          isOpen={!!ventaParaEditar}
          venta={ventaParaEditar}
          clientes={clientes}
          onClose={() => setVentaParaEditar(null)}
          onGuardarCambios={(v) => {
            let ventaConCli = v;
            if (onCrearCliente && v.cliente_nombre.trim()) {
              const cliRes = onCrearCliente({
                id: v.cliente_id || `cli-${Date.now()}`,
                codigo: clientes.length + 1,
                nombre: v.cliente_nombre.trim(),
                telefono: v.cliente_telefono?.trim() || '',
                nit_cc: v.cliente_nit_cc || '',
                correo: v.cliente_correo || ''
              });
              if (cliRes && typeof cliRes === 'object') {
                ventaConCli = {
                  ...v,
                  cliente_id: cliRes.id,
                  cliente_nombre: cliRes.nombre,
                  cliente_telefono: cliRes.telefono || v.cliente_telefono,
                  cliente_nit_cc: cliRes.nit_cc || v.cliente_nit_cc,
                  cliente_correo: cliRes.correo || v.cliente_correo
                };
              }
            }
            onActualizarVenta(ventaConCli);
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

      {/* Modal de Confirmación y Despacho WhatsApp + Correo Corporativo */}
      {ventaParaConfirmarWhatsApp && (
        <ModalConfirmacionWhatsApp
          isOpen={Boolean(ventaParaConfirmarWhatsApp)}
          onClose={() => setVentaParaConfirmarWhatsApp(null)}
          titulo={`Confirmar Recibo ${ventaParaConfirmarWhatsApp.numero_venta}`}
          subtitulo="Valida los datos y el comprobante antes de despachar por WhatsApp y Correo."
          clienteNombre={ventaParaConfirmarWhatsApp.cliente_nombre}
          clienteTelefono={ventaParaConfirmarWhatsApp.cliente_telefono}
          clienteCorreo={resolveClienteCorreoPOS(ventaParaConfirmarWhatsApp)}
          mensajeWhatsApp={generarTextoComprobantePOS(ventaParaConfirmarWhatsApp, config)}
          context="pos"
          emailType={ventaParaConfirmarWhatsApp.saldo_pendiente <= 0 ? 'abono' : 'cuenta_cobro'}
          emailSubject={
            ventaParaConfirmarWhatsApp.saldo_pendiente <= 0
              ? `🧾 Comprobante de Compra ${ventaParaConfirmarWhatsApp.numero_venta} — WJGEEKS 3D`
              : `💳 Recibo ${ventaParaConfirmarWhatsApp.numero_venta} y Saldo Pendiente — WJGEEKS 3D`
          }
          emailData={{
            numero_doc: ventaParaConfirmarWhatsApp.numero_venta,
            total: ventaParaConfirmarWhatsApp.total,
            abono: ventaParaConfirmarWhatsApp.abono,
            saldo_pendiente: ventaParaConfirmarWhatsApp.saldo_pendiente,
            metodo_pago: ventaParaConfirmarWhatsApp.metodo_pago || 'Bre-B',
            fecha: ventaParaConfirmarWhatsApp.fecha_venta
          }}
          entidadTipo="venta_express"
          entidadId={ventaParaConfirmarWhatsApp.id}
          config={config}
          resumenDetalle={[
            { etiqueta: 'Figura / Producto', valor: ventaParaConfirmarWhatsApp.nombre_producto },
            { etiqueta: 'Valor Total', valor: `$${ventaParaConfirmarWhatsApp.total.toLocaleString('es-CO')} COP`, destacado: true },
            { etiqueta: 'Abono Recibido', valor: `$${ventaParaConfirmarWhatsApp.abono.toLocaleString('es-CO')} COP` },
            { etiqueta: 'Saldo Pendiente', valor: `$${ventaParaConfirmarWhatsApp.saldo_pendiente.toLocaleString('es-CO')} COP` },
            { etiqueta: 'Medio de Pago', valor: ventaParaConfirmarWhatsApp.metodo_pago || 'Bre-B' }
          ]}
          onConfirmadoExitoso={() => ejecutarGuardadoFinalVenta(ventaParaConfirmarWhatsApp)}
          onConfirmarSinEnvio={() => ejecutarGuardadoFinalVenta(ventaParaConfirmarWhatsApp)}
        />
      )}

      {/* Despacho Centralizado desde Historial POS */}
      {ventaParaNotificar && (
        <WjgMessageDispatcherModal
          isOpen={Boolean(ventaParaNotificar)}
          onClose={() => setVentaParaNotificar(null)}
          title={
            ventaParaNotificar.modo === 'comprobante'
              ? `Enviar Comprobante ${ventaParaNotificar.venta.numero_venta}`
              : `Cobrar Saldo • ${ventaParaNotificar.venta.numero_venta}`
          }
          subtitle="Despacho directo por WhatsApp (+57 320 2796115) y Correo Verificado"
          context="pos"
          defaultTargetMode="cliente"
          hideModeSelector={true}
          externalRecipient={{
            nombre: ventaParaNotificar.venta.cliente_nombre,
            telefono: ventaParaNotificar.venta.cliente_telefono,
            correo: resolveClienteCorreoPOS(ventaParaNotificar.venta)
          }}
          initialWhatsAppText={
            ventaParaNotificar.modo === 'comprobante'
              ? generarTextoComprobantePOS(ventaParaNotificar.venta, config)
              : generarTextoRecordatorioCobro(ventaParaNotificar.venta, config)
          }
          initialEmailSubject={
            ventaParaNotificar.modo === 'comprobante'
              ? `🧾 Comprobante de Pago ${ventaParaNotificar.venta.numero_venta} — WJGEEKS 3D`
              : `💳 Recordatorio de Saldo ${ventaParaNotificar.venta.numero_venta} — WJGEEKS 3D`
          }
          emailType={ventaParaNotificar.modo === 'comprobante' ? 'abono' : 'cuenta_cobro'}
          emailData={{
            numero_doc: ventaParaNotificar.venta.numero_venta,
            total: ventaParaNotificar.venta.total,
            abono: ventaParaNotificar.venta.abono,
            saldo_pendiente: ventaParaNotificar.venta.saldo_pendiente,
            metodo_pago: ventaParaNotificar.venta.metodo_pago || 'Bre-B',
            fecha: ventaParaNotificar.venta.fecha_venta
          }}
          resumenDetalle={[
            { etiqueta: 'Producto', valor: ventaParaNotificar.venta.nombre_producto },
            { etiqueta: 'Total', valor: `$${ventaParaNotificar.venta.total.toLocaleString('es-CO')} COP`, destacado: true },
            { etiqueta: 'Abonado', valor: `$${ventaParaNotificar.venta.abono.toLocaleString('es-CO')} COP` },
            { etiqueta: 'Saldo Pendiente', valor: `$${ventaParaNotificar.venta.saldo_pendiente.toLocaleString('es-CO')} COP` }
          ]}
          entidadTipo="venta_express"
          entidadId={ventaParaNotificar.venta.id}
          config={config}
        />
      )}

      {/* Modal Visualizador Universal de Documentos PDF y Texto Estructurado */}
      {documentoVisualizar && (
        <ModalVisualizadorDocumento
          isOpen={Boolean(documentoVisualizar)}
          onClose={() => setDocumentoVisualizar(null)}
          titulo={`Recibo de Venta ${documentoVisualizar.venta.numero_venta}`}
          subtitulo={`${documentoVisualizar.venta.cliente_nombre} • Total: $${documentoVisualizar.venta.total.toLocaleString('es-CO')} COP`}
          pdfBlobUrl={documentoVisualizar.blobUrl}
          nombreArchivoPDF={`Recibo_${documentoVisualizar.venta.numero_venta}_${documentoVisualizar.venta.cliente_nombre.replace(/[^a-zA-Z0-9]/g, '_')}`}
          textoDescriptivo={documentoVisualizar.textoDescriptivo}
          clienteTelefono={documentoVisualizar.venta.cliente_telefono}
          selectorFormatoPOS={{
            formatoActual: documentoVisualizar.formato,
            onChangeFormato: handleCambiarFormatoVisor
          }}
          onEnviarWhatsApp={() => {
            const url = generarWhatsAppComprobantePOS(documentoVisualizar.venta, config);
            openWhatsApp(url);
          }}
        />
      )}
    </div>
  );
};

export default POSExpressView;
