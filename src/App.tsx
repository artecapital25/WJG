import React, { useState, useEffect } from 'react';
import { Navbar } from './components/ui/Navbar';
import { BottomNav } from './components/ui/BottomNav';
import { CotizadorForm } from './components/cotizador/CotizadorForm';
import { CotizacionBuilder } from './components/cotizador/CotizacionBuilder';
import { WorkOrdersPipeline } from './components/workflow/WorkOrdersPipeline';
import { CotizacionesList } from './components/cotizaciones/CotizacionesList';
import { CuentasCobroList } from './components/cuentasCobro/CuentasCobroList';
import { CatalogosManager } from './components/catalogos/CatalogosManager';
import { ProjectPlanView } from './components/plan/ProjectPlanView';
import { STLAnalyzer } from './components/stl/STLAnalyzer';
import { ProductosStockView } from './components/stock/ProductosStockView';
import { CustomerTrackingView } from './components/tracking/CustomerTrackingView';
import { FinancialReportView } from './components/reports/FinancialReportView';
import { POSExpressView } from './components/pos/POSExpressView';
import { TeamTasksView } from './components/team/TeamTasksView';
import { MarketingHubView } from './components/marketing/MarketingHubView';
import { ToolsHubView } from './components/tools/ToolsHubView';
import { BackupDriveModal } from './components/backup/BackupDriveModal';

import { 
  TabType, 
  Resina, 
  Insumo, 
  Maquina, 
  Personal, 
  Cliente, 
  Proveedor,
  ConfiguracionTaller, 
  PiezaCotizada, 
  Cotizacion, 
  OrdenTrabajo, 
  CuentaCobro, 
  EstadoOT, 
  EstadoCotizacion,
  EstadoPago,
  DatosPagoRegistro,
  TarifaTamano,
  ProductoStock,
  VentaExpress,
  TareaEquipo,
  SolicitudInsumo
} from './types';
import { StorageService } from './services/storageService';
import { CloudSyncService } from './services/cloudSyncService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabType;
      const validTabs: TabType[] = [
        'cotizador', 'pos', 'workflow', 'cotizaciones', 'cuentas', 'catalogos', 
        'plan', 'stl', 'stock', 'seguimiento', 'finanzas', 'tareas', 'marketing', 'herramientas'
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
      if (params.get('ot') || params.get('cot')) {
        return 'seguimiento';
      }
    }
    return 'cotizador';
  });

  const [showBackupModal, setShowBackupModal] = useState(false);

  // Detección de Modo Portal de Cliente Aislado / Público
  const [isClientPortalMode, setIsClientPortalMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isExplicitPortal = params.get('portal') === 'cliente';
      const hasTrackingParam = Boolean(params.get('ot') || params.get('cot'));
      const isExplicitAdmin = params.get('admin') === '1' || sessionStorage.getItem('wjg_admin_unlocked') === 'true';

      if ((isExplicitPortal || hasTrackingParam) && !isExplicitAdmin) {
        return true;
      }
    }
    return false;
  });

  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  const handleUnlockAdmin = () => {
    setShowAdminPinModal(true);
    setAdminPinInput('');
    setAdminPinError(null);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminPinInput.trim().toLowerCase();
    // Claves válidas: wjg3d o teléfonos corporativos
    if (cleanPin === 'wjg3d' || cleanPin === '3202796115' || cleanPin === '3217273025') {
      sessionStorage.setItem('wjg_admin_unlocked', 'true');
      setIsClientPortalMode(false);
      setShowAdminPinModal(false);
    } else {
      setAdminPinError('PIN incorrecto. Intenta de nuevo.');
    }
  };

  // Estado PWA (Instalación nativa en navegador / móvil)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      alert("📲 Para instalar WJGEEKS 3D Pro en tu celular:\n\n1. En Chrome / Android: Toca el menú (⋮) y selecciona 'Instalar aplicación' o 'Agregar a pantalla principal'.\n2. En iPhone / Safari: Toca el botón Compartir y elige 'Agregar al inicio'.");
    }
  };

  const [stlAppliedData, setStlAppliedData] = useState<{
    altoMm: number;
    anchoMm: number;
    profundidadMm: number;
    pesoResinaG: number;
    nombrePieza: string;
    imagenUrl?: string;
    tipoEstructura?: 'solido' | 'ahuecado';
    porcentajeRelleno?: number;
  } | null>(null);

  // Datos Maestros
  const [resinas, setResinas] = useState<Resina[]>(() => StorageService.getResinas());
  const [insumos, setInsumos] = useState<Insumo[]>(() => StorageService.getInsumos());
  const [maquinas, setMaquinas] = useState<Maquina[]>(() => StorageService.getMaquinas());
  const [personal, setPersonal] = useState<Personal[]>(() => StorageService.getPersonal());
  const [clientes, setClientes] = useState<Cliente[]>(() => StorageService.getClientes());
  const [proveedores, setProveedores] = useState<Proveedor[]>(() => StorageService.getProveedores());
  const [config, setConfig] = useState<ConfiguracionTaller>(() => StorageService.getConfig());
  const [tarifasTamanos, setTarifasTamanos] = useState<TarifaTamano[]>(() => StorageService.getTarifasTamanos());
  const [productosStock, setProductosStock] = useState<ProductoStock[]>(() => StorageService.getProductosStock());

  // Estado Transaccional
  const [draftPieces, setDraftPieces] = useState<PiezaCotizada[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(() => StorageService.getCotizaciones());
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
  const [pieceToEditInCalculator, setPieceToEditInCalculator] = useState<PiezaCotizada | null>(null);
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>(() => StorageService.getOrdenes());
  const [cuentas, setCuentas] = useState<CuentaCobro[]>(() => StorageService.getCuentas());
  const [ventasExpress, setVentasExpress] = useState<VentaExpress[]>(() => StorageService.getVentasExpress());
  const [tareas, setTareas] = useState<TareaEquipo[]>(() => StorageService.getTareas());
  const [solicitudesInsumos, setSolicitudesInsumos] = useState<SolicitudInsumo[]>(() => StorageService.getSolicitudesInsumos());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // Cargar datos iniciales y sincronizar bidireccionalmente con Supabase
  useEffect(() => {
    // 1. Carga local inmediata para rapidez y soporte offline
    setResinas(StorageService.getResinas());
    setInsumos(StorageService.getInsumos());
    setMaquinas(StorageService.getMaquinas());
    setPersonal(StorageService.getPersonal());
    setClientes(StorageService.getClientes());
    setProveedores(StorageService.getProveedores());
    setConfig(StorageService.getConfig());
    setTarifasTamanos(StorageService.getTarifasTamanos());
    setProductosStock(StorageService.getProductosStock());
    setCotizaciones(StorageService.getCotizaciones());
    setOrdenes(StorageService.getOrdenes());
    setCuentas(StorageService.getCuentas());
    setVentasExpress(StorageService.getVentasExpress());
    setTareas(StorageService.getTareas());
    setSolicitudesInsumos(StorageService.getSolicitudesInsumos());

    if (!CloudSyncService.isAvailable()) {
      setCloudSyncStatus('offline');
      return;
    }

    setCloudSyncStatus('syncing');

    // 2. Traer datos frescos de Supabase en segundo plano y fusionar
    const syncCloudData = async () => {
      try {
        const [cloudCots, cloudClis, cloudOTs, cloudVentas, cloudTareas, cloudSolicitudes] = await Promise.all([
          CloudSyncService.fetchCotizaciones(),
          CloudSyncService.fetchClientes(),
          CloudSyncService.fetchOrdenes(),
          CloudSyncService.fetchVentasExpress(),
          CloudSyncService.fetchTareasEquipo(),
          CloudSyncService.fetchSolicitudesInsumos()
        ]);

        if (cloudCots && cloudCots.length > 0) {
          setCotizaciones(prev => {
            const map = new Map(prev.map(c => [c.numero_cot, c]));
            cloudCots.forEach(c => map.set(c.numero_cot, c));
            const merged = Array.from(map.values()).sort((a, b) => b.numero_cot.localeCompare(a.numero_cot));
            StorageService.saveCotizaciones(merged);
            return merged;
          });
        }

        if (cloudClis && cloudClis.length > 0) {
          setClientes(prev => {
            const map = new Map(prev.map(c => [c.telefono, c]));
            cloudClis.forEach(c => map.set(c.telefono, c));
            const merged = Array.from(map.values());
            StorageService.saveClientes(merged);
            return merged;
          });
        }

        if (cloudOTs && cloudOTs.length > 0) {
          setOrdenes(prev => {
            const map = new Map(prev.map(o => [o.numero_ot, o]));
            cloudOTs.forEach(cloudOT => {
              const local = map.get(cloudOT.numero_ot);
              if (local) {
                map.set(cloudOT.numero_ot, {
                  ...local,
                  ...cloudOT,
                  imagen_url: local.imagen_url || cloudOT.imagen_url,
                  detalles_tecnicos: local.detalles_tecnicos || cloudOT.detalles_tecnicos,
                  tiempo_impresion_min: local.tiempo_impresion_min || cloudOT.tiempo_impresion_min,
                  resina_nombre: local.resina_nombre || cloudOT.resina_nombre,
                  maquina_nombre: local.maquina_nombre || cloudOT.maquina_nombre,
                  cotizacion_numero: local.cotizacion_numero || cloudOT.cotizacion_numero,
                  cliente_telefono: local.cliente_telefono || cloudOT.cliente_telefono
                });
              } else {
                map.set(cloudOT.numero_ot, cloudOT);
              }
            });
            const merged = Array.from(map.values());
            StorageService.saveOrdenes(merged);
            return merged;
          });
        }

        if (cloudVentas && cloudVentas.length > 0) {
          setVentasExpress(prev => {
            const map = new Map(prev.map(v => [v.id, v]));
            cloudVentas.forEach(v => map.set(v.id, v));
            const merged = Array.from(map.values()).sort((a, b) => b.numero_venta.localeCompare(a.numero_venta));
            StorageService.saveVentasExpress(merged);
            return merged;
          });
        }

        if (cloudTareas && cloudTareas.length > 0) {
          setTareas(prev => {
            const map = new Map(prev.map(t => [t.id, t]));
            cloudTareas.forEach(t => map.set(t.id, t));
            const merged = Array.from(map.values());
            StorageService.saveTareas(merged);
            return merged;
          });
        }

        if (cloudSolicitudes && cloudSolicitudes.length > 0) {
          setSolicitudesInsumos(prev => {
            const map = new Map(prev.map(s => [s.id, s]));
            cloudSolicitudes.forEach(s => map.set(s.id, s));
            const merged = Array.from(map.values());
            StorageService.saveSolicitudesInsumos(merged);
            return merged;
          });
        }

        setCloudSyncStatus('connected');

        // 4. Auto-recuperación: Si existen cotizaciones Aceptadas sin OTs en taller, regenerarlas automáticamente
        try {
          const currentCots = StorageService.getCotizaciones();
          const currentOTs = StorageService.getOrdenes();
          let maxConsecutive = StorageService.getNextOTConsecutive(currentOTs);
          const recoveredOTs: OrdenTrabajo[] = [];

          currentCots.forEach(cot => {
            if (cot.estado === 'Aceptada') {
              (cot.items || []).forEach(item => {
                const yaExiste = currentOTs.some(o => 
                  (o.cotizacion_id === cot.id || o.cotizacion_numero === cot.numero_cot) &&
                  o.item_nombre?.trim().toLowerCase() === item.nombre_item?.trim().toLowerCase()
                );

                if (!yaExiste) {
                  maxConsecutive++;
                  const numOT = `OT-${maxConsecutive.toString().padStart(4, '0')}`;
                  const nuevaOT: OrdenTrabajo = {
                    id: `ot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    numero_ot: numOT,
                    cotizacion_id: cot.id,
                    cotizacion_numero: cot.numero_cot,
                    cliente_nombre: cot.cliente.nombre,
                    cliente_telefono: cot.cliente.telefono,
                    item_nombre: item.nombre_item,
                    cantidad: item.cantidad || 1,
                    estado: 'En Cola',
                    operador_asignado: 'Operador 3D',
                    fecha_creacion: new Date().toISOString(),
                    tiempo_impresion_min: item.tiempo_impresion_min || 0,
                    tiempo_armado_min: item.tiempo_armado_min || 0,
                    tiempo_pintura_min: item.tiempo_pintura_min || 0,
                    peso_estimado_g: item.peso_estimado_g || 0,
                    resina_id: item.resina_id,
                    inventario_descontado: false,
                    resina_nombre: item.resina_nombre,
                    maquina_nombre: item.maquina_nombre,
                    maquinas_involucradas: item.maquinas_involucradas,
                    enlaces_compra: item.enlaces_compra,
                    va_pintado: item.va_pintado,
                    tiene_empaque: item.tiene_empaque,
                    lista_empaques: item.lista_empaques,
                    detalles_tecnicos: item.descripcion_tecnica,
                    imagen_url: item.imagen_url
                  };
                  recoveredOTs.push(nuevaOT);
                }
              });
            }
          });

          if (recoveredOTs.length > 0) {
            setOrdenes(prev => {
              const fullOTs = [...recoveredOTs, ...prev];
              StorageService.saveOrdenes(fullOTs);
              recoveredOTs.forEach(ot => CloudSyncService.saveOrdenTrabajo(ot));
              return fullOTs;
            });
          }
        } catch (healErr) {
          console.warn('Error en auto-recuperación de órdenes:', healErr);
        }
      } catch (err) {
        console.warn('Error sincronizando con Supabase:', err);
        setCloudSyncStatus('connected');
      }
    };

    syncCloudData();

    // 3. Suscripción en tiempo real a cambios de taller
    const channel = CloudSyncService.subscribeRealtime(
      async () => {
        const freshCots = await CloudSyncService.fetchCotizaciones();
        if (freshCots && freshCots.length > 0) {
          setCotizaciones(freshCots);
          StorageService.saveCotizaciones(freshCots);
        }
      },
      async () => {
        const freshOTs = await CloudSyncService.fetchOrdenes();
        if (freshOTs && freshOTs.length > 0) {
          setOrdenes(prev => {
            const map = new Map(prev.map(o => [o.numero_ot, o]));
            freshOTs.forEach(cloudOT => {
              const local = map.get(cloudOT.numero_ot);
              if (local) {
                map.set(cloudOT.numero_ot, {
                  ...local,
                  ...cloudOT,
                  imagen_url: local.imagen_url || cloudOT.imagen_url,
                  detalles_tecnicos: local.detalles_tecnicos || cloudOT.detalles_tecnicos,
                  tiempo_impresion_min: local.tiempo_impresion_min || cloudOT.tiempo_impresion_min,
                  resina_nombre: local.resina_nombre || cloudOT.resina_nombre,
                  maquina_nombre: local.maquina_nombre || cloudOT.maquina_nombre,
                  cotizacion_numero: local.cotizacion_numero || cloudOT.cotizacion_numero,
                  cliente_telefono: local.cliente_telefono || cloudOT.cliente_telefono
                });
              } else {
                map.set(cloudOT.numero_ot, cloudOT);
              }
            });
            const merged = Array.from(map.values());
            StorageService.saveOrdenes(merged);
            return merged;
          });
        }
      },
      async () => {
        const freshCCs = await CloudSyncService.fetchCuentas();
        if (freshCCs && freshCCs.length > 0) {
          setCuentas(freshCCs);
          StorageService.saveCuentas(freshCCs);
        }
      },
      async () => {
        const freshVentas = await CloudSyncService.fetchVentasExpress();
        if (freshVentas && freshVentas.length > 0) {
          setVentasExpress(freshVentas);
          StorageService.saveVentasExpress(freshVentas);
        }
      },
      async () => {
        const freshTareas = await CloudSyncService.fetchTareasEquipo();
        if (freshTareas && freshTareas.length > 0) {
          setTareas(freshTareas);
          StorageService.saveTareas(freshTareas);
        }
      },
      async () => {
        const freshSols = await CloudSyncService.fetchSolicitudesInsumos();
        if (freshSols && freshSols.length > 0) {
          setSolicitudesInsumos(freshSols);
          StorageService.saveSolicitudesInsumos(freshSols);
        }
      }
    );

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  // Handlers para Piezas en Borrador / Cotización en Edición
  const handleAgregarPieza = (pieza: PiezaCotizada) => {
    setDraftPieces(prev => {
      const exists = prev.some(p => p.id === pieza.id);
      if (exists) {
        return prev.map(p => p.id === pieza.id ? pieza : p);
      }
      return [...prev, pieza];
    });
    setPieceToEditInCalculator(null);
  };

  const handleLoadPieceToCalculator = (pieza: PiezaCotizada) => {
    setPieceToEditInCalculator(pieza);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveDraftPiece = (id: string) => {
    setDraftPieces(prev => prev.filter(p => p.id !== id));
    if (pieceToEditInCalculator?.id === id) {
      setPieceToEditInCalculator(null);
    }
  };

  const handleUpdateDraftPiece = (updatedPiece: PiezaCotizada) => {
    setDraftPieces(prev => prev.map(p => p.id === updatedPiece.id ? updatedPiece : p));
  };

  const handleUpdateDraftPieceQuantity = (id: string, newCantidad: number) => {
    if (newCantidad < 1) return;
    setDraftPieces(prev => prev.map(p => {
      if (p.id === id) {
        const precio_total = Math.ceil((p.precio_unitario * newCantidad) / 100) * 100;
        return {
          ...p,
          cantidad: newCantidad,
          precio_total
        };
      }
      return p;
    }));
  };

  const handleUpdateDraftPieceImage = (id: string, imagenUrl: string) => {
    setDraftPieces(prev => prev.map(p => p.id === id ? { ...p, imagen_url: imagenUrl } : p));
  };

  const handleEditarCotizacion = (cot: Cotizacion) => {
    setEditingCotizacion(cot);
    setDraftPieces([...cot.items]);
    setPieceToEditInCalculator(null);
    setActiveTab('cotizador');
  };

  const handleCancelarEdicion = () => {
    setEditingCotizacion(null);
    setDraftPieces([]);
    setPieceToEditInCalculator(null);
    setActiveTab('cotizaciones');
  };

  const handleNuevaCotizacion = () => {
    setEditingCotizacion(null);
    setDraftPieces([]);
    setPieceToEditInCalculator(null);
    setActiveTab('cotizador');
  };

  // Guardar Cotización (nueva o modificada)
  const handleSaveCotizacion = (cotizacion: Cotizacion) => {
    let updated: Cotizacion[];
    if (editingCotizacion && editingCotizacion.id === cotizacion.id) {
      updated = cotizaciones.map(c => c.id === cotizacion.id ? cotizacion : c);
    } else {
      updated = [cotizacion, ...cotizaciones];
    }
    setCotizaciones(updated);
    StorageService.saveCotizaciones(updated);
    setDraftPieces([]); // Limpiar borrador
    setEditingCotizacion(null);
    setActiveTab('cotizaciones');

    // Sincronizar en la nube Supabase en segundo plano
    CloudSyncService.saveCotizacion(cotizacion);

    // Si la cotización tiene abono o pago registrado, crear o actualizar automáticamente Cuenta de Cobro
    if (cotizacion.estado_pago && cotizacion.estado_pago !== 'Pendiente') {
      const ccExistente = cuentas.find(c => 
        c.cotizacion_id === cotizacion.id || c.cotizacion_numero === cotizacion.numero_cot
      );
      if (ccExistente) {
        const updatedCCs = cuentas.map(c => 
          c.id === ccExistente.id ? {
            ...c,
            total: cotizacion.total,
            abono: cotizacion.abono || 0,
            saldo_pendiente: cotizacion.saldo_pendiente ?? Math.max(0, cotizacion.total - (cotizacion.abono || 0)),
            estado_pago: cotizacion.estado_pago!,
            metodo_pago: cotizacion.metodo_pago || c.metodo_pago,
            comprobante_url: cotizacion.comprobante_pago || c.comprobante_url
          } : c
        );
        setCuentas(updatedCCs);
        StorageService.saveCuentas(updatedCCs);
        const ccActualizada = updatedCCs.find(c => c.id === ccExistente.id);
        if (ccActualizada) CloudSyncService.saveCuentaCobro(ccActualizada);
      } else {
        const nuevaCC: CuentaCobro = {
          id: `cc-${Date.now()}`,
          numero_cc: `CC-${(cuentas.length + 1).toString().padStart(3, '0')}`,
          cotizacion_id: cotizacion.id,
          cotizacion_numero: cotizacion.numero_cot,
          cliente: cotizacion.cliente,
          fecha_emision: cotizacion.fecha || new Date().toISOString().slice(0, 10),
          items_resumen: cotizacion.items?.map(i => `${i.nombre_item} (x${i.cantidad})`).join(', ') || 'Piezas 3D',
          total: cotizacion.total,
          abono: cotizacion.abono || 0,
          saldo_pendiente: cotizacion.saldo_pendiente ?? Math.max(0, cotizacion.total - (cotizacion.abono || 0)),
          estado_pago: cotizacion.estado_pago,
          metodo_pago: cotizacion.metodo_pago,
          comprobante_url: cotizacion.comprobante_pago
        };
        const updatedCCs = [nuevaCC, ...cuentas];
        setCuentas(updatedCCs);
        StorageService.saveCuentas(updatedCCs);
        CloudSyncService.saveCuentaCobro(nuevaCC);
      }
    }
  };

  // Aprobar Cotización -> Dispara automáticamente Órdenes de Trabajo (OT) y registra pagos / cuentas de cobro
  const handleAprobarCotizacion = (
    cot: Cotizacion, 
    datosPago?: DatosPagoRegistro,
    redirigirTaller: boolean = true
  ) => {
    // 1. Obtener datos de pago (si no se pasan, tomar los de la cotización o 'Pendiente')
    const estadoPagoFinal: EstadoPago = datosPago?.estado_pago || cot.estado_pago || 'Pendiente';
    const abonoFinal: number = datosPago?.abono !== undefined ? datosPago.abono : (cot.abono ?? 0);
    const saldoFinal: number = datosPago?.saldo_pendiente !== undefined ? datosPago.saldo_pendiente : (cot.saldo_pendiente ?? Math.max(0, cot.total - abonoFinal));
    const metodoPagoFinal: string | undefined = datosPago?.metodo_pago || cot.metodo_pago;
    const comprobanteFinal: string | undefined = datosPago?.comprobante_pago || cot.comprobante_pago;

    // 2. Actualizar estado y pagos de la cotización
    const cotActualizada: Cotizacion = {
      ...cot,
      estado: 'Aceptada' as EstadoCotizacion,
      estado_pago: estadoPagoFinal,
      abono: abonoFinal,
      saldo_pendiente: saldoFinal,
      metodo_pago: metodoPagoFinal,
      comprobante_pago: comprobanteFinal
    };

    const updatedCots = cotizaciones.map(c => 
      c.id === cot.id ? cotActualizada : c
    );
    setCotizaciones(updatedCots);
    StorageService.saveCotizaciones(updatedCots);

    // 3. Traer órdenes actuales frescas para calcular el consecutivo sin colisiones
    const currentOrders = StorageService.getOrdenes();
    let maxConsecutive = StorageService.getNextOTConsecutive(currentOrders);

    // 4. Generar OTs para piezas que no tengan OT aún en el taller
    const nuevasOTs: OrdenTrabajo[] = [];
    const items = cot.items || [];

    items.forEach((item) => {
      // Verificar si ya existe una OT para esta pieza en esta cotización
      const yaExiste = currentOrders.some(o => 
        (o.cotizacion_id === cot.id || o.cotizacion_numero === cot.numero_cot) && 
        o.item_nombre?.trim().toLowerCase() === item.nombre_item?.trim().toLowerCase()
      );

      if (!yaExiste) {
        maxConsecutive++;
        const numOT = `OT-${maxConsecutive.toString().padStart(4, '0')}`;

        nuevasOTs.push({
          id: `ot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          numero_ot: numOT,
          cotizacion_id: cot.id,
          cotizacion_numero: cot.numero_cot,
          cliente_nombre: cot.cliente.nombre,
          cliente_telefono: cot.cliente.telefono,
          item_nombre: item.nombre_item,
          cantidad: item.cantidad || 1,
          estado: 'En Cola',
          operador_asignado: 'Operador 3D',
          fecha_creacion: new Date().toISOString(),
          tiempo_impresion_min: item.tiempo_impresion_min || 0,
          tiempo_armado_min: item.tiempo_armado_min || 0,
          tiempo_pintura_min: item.tiempo_pintura_min || 0,
          peso_estimado_g: item.peso_estimado_g || 0,
          resina_id: item.resina_id,
          inventario_descontado: false,
          resina_nombre: item.resina_nombre,
          maquina_nombre: item.maquina_nombre,
          maquinas_involucradas: item.maquinas_involucradas,
          enlaces_compra: item.enlaces_compra,
          va_pintado: item.va_pintado,
          tiene_empaque: item.tiene_empaque,
          lista_empaques: item.lista_empaques,
          detalles_tecnicos: item.descripcion_tecnica,
          imagen_url: item.imagen_url,
          precio_cobrado: item.precio_total,
          estado_pago: estadoPagoFinal,
          abono: abonoFinal,
          saldo_pendiente: saldoFinal,
          metodo_pago: metodoPagoFinal,
          comprobante_pago: comprobanteFinal
        });
      }
    });

    // También actualizar OTs existentes asociadas con los datos de pago actualizados
    let updatedOTs = currentOrders.map(o => {
      if (o.cotizacion_id === cot.id || o.cotizacion_numero === cot.numero_cot) {
        return {
          ...o,
          estado_pago: estadoPagoFinal,
          abono: abonoFinal,
          saldo_pendiente: saldoFinal,
          metodo_pago: metodoPagoFinal || o.metodo_pago,
          comprobante_pago: comprobanteFinal || o.comprobante_pago
        };
      }
      return o;
    });

    if (nuevasOTs.length > 0) {
      updatedOTs = [...nuevasOTs, ...updatedOTs];
      nuevasOTs.forEach(ot => CloudSyncService.saveOrdenTrabajo(ot));
    }
    setOrdenes(updatedOTs);
    StorageService.saveOrdenes(updatedOTs);

    // 5. Crear o Actualizar automáticamente la Cuenta de Cobro (CuentaCobro)
    const ccExistente = cuentas.find(c => 
      c.cotizacion_id === cot.id || c.cotizacion_numero === cot.numero_cot
    );

    let updatedCuentas = [...cuentas];
    if (ccExistente) {
      updatedCuentas = cuentas.map(c => 
        c.id === ccExistente.id ? {
          ...c,
          total: cot.total,
          abono: abonoFinal,
          saldo_pendiente: saldoFinal,
          estado_pago: estadoPagoFinal,
          metodo_pago: metodoPagoFinal || c.metodo_pago,
          comprobante_url: comprobanteFinal || c.comprobante_url
        } : c
      );
      const ccActualizada = updatedCuentas.find(c => c.id === ccExistente.id);
      if (ccActualizada) CloudSyncService.saveCuentaCobro(ccActualizada);
    } else {
      const nuevaCC: CuentaCobro = {
        id: `cc-${Date.now()}`,
        numero_cc: `CC-${(cuentas.length + 1).toString().padStart(3, '0')}`,
        cotizacion_id: cot.id,
        cotizacion_numero: cot.numero_cot,
        cliente: cot.cliente,
        fecha_emision: new Date().toISOString().slice(0, 10),
        items_resumen: cot.items?.map(i => `${i.nombre_item} (x${i.cantidad})`).join(', ') || 'Piezas 3D',
        total: cot.total,
        abono: abonoFinal,
        saldo_pendiente: saldoFinal,
        estado_pago: estadoPagoFinal,
        metodo_pago: metodoPagoFinal,
        comprobante_url: comprobanteFinal
      };
      updatedCuentas = [nuevaCC, ...cuentas];
      CloudSyncService.saveCuentaCobro(nuevaCC);
    }
    setCuentas(updatedCuentas);
    StorageService.saveCuentas(updatedCuentas);

    // 6. Sincronizar cotización aceptada en Supabase
    CloudSyncService.saveCotizacion(cotActualizada);

    // 7. Redirigir a vista de taller si corresponde
    if (redirigirTaller) {
      setActiveTab('workflow');
    }
  };

  // Actualizar solo el pago de una Cotización (sin alterar estado de aprobación ni redirigir)
  const handleActualizarPagoCotizacion = (cotId: string, datosPago: DatosPagoRegistro) => {
    const targetCot = cotizaciones.find(c => c.id === cotId);
    if (!targetCot) return;

    const cotActualizada: Cotizacion = {
      ...targetCot,
      estado_pago: datosPago.estado_pago,
      abono: datosPago.abono,
      saldo_pendiente: datosPago.saldo_pendiente,
      metodo_pago: datosPago.metodo_pago,
      comprobante_pago: datosPago.comprobante_pago
    };

    const updatedCots = cotizaciones.map(c => c.id === cotId ? cotActualizada : c);
    setCotizaciones(updatedCots);
    StorageService.saveCotizaciones(updatedCots);
    CloudSyncService.saveCotizacion(cotActualizada);

    // Actualizar OTs asociadas
    const updatedOTs = ordenes.map(o => {
      if (o.cotizacion_id === targetCot.id || o.cotizacion_numero === targetCot.numero_cot) {
        return {
          ...o,
          estado_pago: datosPago.estado_pago,
          abono: datosPago.abono,
          saldo_pendiente: datosPago.saldo_pendiente,
          metodo_pago: datosPago.metodo_pago || o.metodo_pago,
          comprobante_pago: datosPago.comprobante_pago || o.comprobante_pago
        };
      }
      return o;
    });
    setOrdenes(updatedOTs);
    StorageService.saveOrdenes(updatedOTs);

    // Actualizar o crear Cuenta de Cobro
    const ccExistente = cuentas.find(c => 
      c.cotizacion_id === targetCot.id || c.cotizacion_numero === targetCot.numero_cot
    );
    if (ccExistente) {
      const updatedCCs = cuentas.map(c => 
        c.id === ccExistente.id ? {
          ...c,
          total: targetCot.total,
          abono: datosPago.abono,
          saldo_pendiente: datosPago.saldo_pendiente,
          estado_pago: datosPago.estado_pago,
          metodo_pago: datosPago.metodo_pago || c.metodo_pago,
          comprobante_url: datosPago.comprobante_pago || c.comprobante_url
        } : c
      );
      setCuentas(updatedCCs);
      StorageService.saveCuentas(updatedCCs);
      const ccActualizada = updatedCCs.find(c => c.id === ccExistente.id);
      if (ccActualizada) CloudSyncService.saveCuentaCobro(ccActualizada);
    } else {
      const nuevaCC: CuentaCobro = {
        id: `cc-${Date.now()}`,
        numero_cc: `CC-${(cuentas.length + 1).toString().padStart(3, '0')}`,
        cotizacion_id: targetCot.id,
        cotizacion_numero: targetCot.numero_cot,
        cliente: targetCot.cliente,
        fecha_emision: new Date().toISOString().slice(0, 10),
        items_resumen: targetCot.items?.map(i => `${i.nombre_item} (x${i.cantidad})`).join(', ') || 'Piezas 3D',
        total: targetCot.total,
        abono: datosPago.abono,
        saldo_pendiente: datosPago.saldo_pendiente,
        estado_pago: datosPago.estado_pago,
        metodo_pago: datosPago.metodo_pago,
        comprobante_url: datosPago.comprobante_pago
      };
      const updatedCCs = [nuevaCC, ...cuentas];
      setCuentas(updatedCCs);
      StorageService.saveCuentas(updatedCCs);
      CloudSyncService.saveCuentaCobro(nuevaCC);
    }
  };

  // Actualizar Estado de OT con Descuento Automático de Inventario
  const handleUpdateEstadoOT = (otId: string, nuevoEstado: EstadoOT) => {
    const targetOT = ordenes.find(o => o.id === otId);
    if (!targetOT) return;

    let discountApplied = false;
    const etapasDescuento: EstadoOT[] = ['Curado', 'Pintura y Armado', 'Control de Calidad', 'Listo para Entrega'];

    // Si avanza a una etapa de fabricación avanzada y aún no se ha descontado del inventario
    if (etapasDescuento.includes(nuevoEstado) && !targetOT.inventario_descontado) {
      const cant = targetOT.cantidad || 1;
      const gramosARestar = (targetOT.peso_estimado_g || 40) * cant;

      // 1. Descontar resina líquida del catálogo de resinas
      const updatedResinas = resinas.map(r => {
        const match = r.id === targetOT.resina_id || 
                      r.resumen === targetOT.resina_nombre || 
                      `${r.marca} ${r.tipo} ${r.color}`.toLowerCase().includes((targetOT.resina_nombre || '').toLowerCase());
        if (match) {
          const nuevoPeso = Math.max(0, Math.round((r.peso_g - gramosARestar) * 10) / 10);
          return { ...r, peso_g: nuevoPeso };
        }
        return r;
      });
      setResinas(updatedResinas);
      StorageService.saveResinas(updatedResinas);

      // 2. Descontar alcohol isopropílico de insumos (aprox 30ml por pieza impresa)
      const mlAlcohol = 30 * cant;
      const updatedInsumos = insumos.map(ins => {
        const nom = ins.nombre.toLowerCase();
        if (nom.includes('alcohol') || nom.includes('isoprop')) {
          const nuevaPres = Math.max(0, ins.presentacion - mlAlcohol);
          return { ...ins, presentacion: nuevaPres };
        }
        return ins;
      });
      setInsumos(updatedInsumos);
      StorageService.saveInsumos(updatedInsumos);

      discountApplied = true;
    }

    const updated = ordenes.map(o => {
      if (o.id === otId) {
        return {
          ...o,
          estado: nuevoEstado,
          inventario_descontado: o.inventario_descontado || discountApplied
        };
      }
      return o;
    });

    setOrdenes(updated);
    StorageService.saveOrdenes(updated);

    const updatedTargetOT = updated.find(o => o.id === otId);
    if (updatedTargetOT) CloudSyncService.saveOrdenTrabajo(updatedTargetOT);
  };

  // Generar Cuenta de Cobro a partir de una OT terminada
  const handleGenerarCuentaCobro = (ot: OrdenTrabajo) => {
    const cotOriginal = cotizaciones.find(c => c.id === ot.cotizacion_id);
    const totalMonto = cotOriginal ? cotOriginal.total : 50000;
    const abonoMonto = Math.round(totalMonto * 0.5); // 50% anticipo por defecto
    const saldo = totalMonto - abonoMonto;

    const nuevaCC: CuentaCobro = {
      id: `cc-${Date.now()}`,
      numero_cc: `CC-${(cuentas.length + 1).toString().padStart(3, '0')}`,
      cotizacion_id: ot.cotizacion_id,
      cotizacion_numero: ot.cotizacion_numero,
      cliente: cotOriginal ? cotOriginal.cliente : {
        id: 'cli-temp',
        codigo: 99,
        nombre: ot.cliente_nombre,
        telefono: ot.cliente_telefono,
        nit_cc: '',
        correo: ''
      },
      fecha_emision: new Date().toISOString().slice(0, 10),
      items_resumen: `${ot.item_nombre} (x${ot.cantidad})`,
      total: totalMonto,
      abono: abonoMonto,
      saldo_pendiente: saldo,
      estado_pago: saldo === 0 ? 'Pagado Total' : 'Abono Parcial'
    };

    const updated = [nuevaCC, ...cuentas];
    setCuentas(updated);
    StorageService.saveCuentas(updated);
    setActiveTab('cuentas');

    // Sincronizar cuenta de cobro en Supabase
    CloudSyncService.saveCuentaCobro(nuevaCC);
  };

  // Actualizar Pago en Cuenta de Cobro
  const handleUpdatePago = (cuentaId: string, nuevoAbono: number) => {
    const updated = cuentas.map(c => {
      if (c.id === cuentaId) {
        const saldo = Math.max(0, c.total - nuevoAbono);
        return {
          ...c,
          abono: nuevoAbono,
          saldo_pendiente: saldo,
          estado_pago: saldo === 0 ? ('Pagado Total' as const) : ('Abono Parcial' as const)
        };
      }
      return c;
    });
    setCuentas(updated);
    StorageService.saveCuentas(updated);
  };

  // Agregar nuevo cliente
  const handleAddCliente = (nuevo: Cliente) => {
    const updated = [nuevo, ...clientes];
    setClientes(updated);
    StorageService.saveClientes(updated);
    CloudSyncService.saveCliente(nuevo);
  };

  const handleUpdateProductosStock = (items: ProductoStock[]) => {
    setProductosStock(items);
    StorageService.saveProductosStock(items);
  };

  const handleGuardarVentaExpress = (nuevaVenta: VentaExpress) => {
    const updated = [nuevaVenta, ...ventasExpress];
    setVentasExpress(updated);
    StorageService.saveVentasExpress(updated);
    CloudSyncService.saveVentaExpress(nuevaVenta);
  };

  const handleActualizarVentaExpress = (ventaActualizada: VentaExpress) => {
    const updated = ventasExpress.map(v => v.id === ventaActualizada.id ? ventaActualizada : v);
    setVentasExpress(updated);
    StorageService.saveVentasExpress(updated);
    CloudSyncService.saveVentaExpress(ventaActualizada);
  };

  // Handlers para Tareas de Equipo
  const handleGuardarTarea = (nueva: TareaEquipo) => {
    const updated = [nueva, ...tareas];
    setTareas(updated);
    StorageService.saveTareas(updated);
    CloudSyncService.saveTareaEquipo(nueva);
  };

  const handleActualizarTarea = (tarea: TareaEquipo) => {
    const updated = tareas.map(t => t.id === tarea.id ? tarea : t);
    setTareas(updated);
    StorageService.saveTareas(updated);
    CloudSyncService.saveTareaEquipo(tarea);
  };

  const handleEliminarTarea = (id: string) => {
    const updated = tareas.filter(t => t.id !== id);
    setTareas(updated);
    StorageService.saveTareas(updated);
    CloudSyncService.deleteTareaEquipo(id);
  };

  // Handlers para Solicitudes S.O.S de Insumos
  const handleCrearSolicitudInsumo = (solicitud: SolicitudInsumo) => {
    const updated = [solicitud, ...solicitudesInsumos];
    setSolicitudesInsumos(updated);
    StorageService.saveSolicitudesInsumos(updated);
    CloudSyncService.saveSolicitudInsumo(solicitud);
  };

  const handleActualizarSolicitudInsumo = (solicitud: SolicitudInsumo) => {
    const updated = solicitudesInsumos.map(s => s.id === solicitud.id ? solicitud : s);
    setSolicitudesInsumos(updated);
    StorageService.saveSolicitudesInsumos(updated);
    CloudSyncService.saveSolicitudInsumo(solicitud);
  };

  // Handler para Crear Orden Rápida desde Tarifario Express
  const handleCrearOrdenRapida = (nuevaOT: OrdenTrabajo, crearCobroPOS?: boolean) => {
    const updatedOTs = [nuevaOT, ...ordenes];
    setOrdenes(updatedOTs);
    StorageService.saveOrdenes(updatedOTs);
    CloudSyncService.saveOrdenTrabajo(nuevaOT);

    if (crearCobroPOS) {
      const precioEstimado = nuevaOT.altura_cm_tarifario ? (nuevaOT.altura_cm_tarifario * 10000) : (nuevaOT.precio_cobrado || 80000);
      const nuevaVenta: VentaExpress = {
        id: `pos-${Date.now()}`,
        numero_venta: `POS-${(ventasExpress.length + 1).toString().padStart(3, '0')}`,
        nombre_producto: nuevaOT.item_nombre,
        cliente_nombre: nuevaOT.cliente_nombre,
        cliente_telefono: nuevaOT.cliente_telefono,
        total: precioEstimado,
        abono: 0,
        saldo_pendiente: precioEstimado,
        estado_pago: 'Pendiente',
        fecha_venta: new Date().toISOString().slice(0, 10),
        foto_url: nuevaOT.imagen_url || '',
        notas: `Proyecto Rápido ${nuevaOT.numero_ot}`
      };
      handleGuardarVentaExpress(nuevaVenta);
    }
  };

  // Handler para Actualizar Trazabilidad STL, detalles de OT y Pagos
  const handleActualizarOT = (otActualizada: OrdenTrabajo) => {
    // 1. Si la OT actualizó estado_pago, replicarlo también en las demás OTs de la misma cotización
    const updated = ordenes.map(o => {
      if (o.id === otActualizada.id) return otActualizada;
      if (otActualizada.estado_pago && 
          ((otActualizada.cotizacion_id && o.cotizacion_id === otActualizada.cotizacion_id) ||
           (otActualizada.cotizacion_numero && o.cotizacion_numero === otActualizada.cotizacion_numero))) {
        return {
          ...o,
          estado_pago: otActualizada.estado_pago,
          abono: otActualizada.abono,
          saldo_pendiente: otActualizada.saldo_pendiente,
          metodo_pago: otActualizada.metodo_pago || o.metodo_pago,
          comprobante_pago: otActualizada.comprobante_pago || o.comprobante_pago
        };
      }
      return o;
    });
    setOrdenes(updated);
    StorageService.saveOrdenes(updated);
    CloudSyncService.saveOrdenTrabajo(otActualizada);

    // 2. Sincronizar en la cotización padre (enlaces_compra y estado_pago)
    if (otActualizada.cotizacion_numero || otActualizada.cotizacion_id) {
      const updatedCots = cotizaciones.map(c => {
        const matchesCot = (otActualizada.cotizacion_id && c.id === otActualizada.cotizacion_id) ||
                           (otActualizada.cotizacion_numero && c.numero_cot === otActualizada.cotizacion_numero);
        if (!matchesCot) return c;

        let updatedItems = c.items;
        if (otActualizada.enlaces_compra) {
          updatedItems = c.items.map(it => {
            if (it.nombre_item?.toLowerCase().trim() === otActualizada.item_nombre?.toLowerCase().trim()) {
              return { ...it, enlaces_compra: otActualizada.enlaces_compra };
            }
            return it;
          });
        }

        return { 
          ...c, 
          items: updatedItems,
          estado_pago: otActualizada.estado_pago || c.estado_pago,
          abono: otActualizada.abono !== undefined ? otActualizada.abono : c.abono,
          saldo_pendiente: otActualizada.saldo_pendiente !== undefined ? otActualizada.saldo_pendiente : c.saldo_pendiente,
          metodo_pago: otActualizada.metodo_pago || c.metodo_pago,
          comprobante_pago: otActualizada.comprobante_pago || c.comprobante_pago
        };
      });
      setCotizaciones(updatedCots);
      StorageService.saveCotizaciones(updatedCots);

      const cotAfectada = updatedCots.find(c => 
        (otActualizada.cotizacion_id && c.id === otActualizada.cotizacion_id) ||
        (otActualizada.cotizacion_numero && c.numero_cot === otActualizada.cotizacion_numero)
      );
      if (cotAfectada) CloudSyncService.saveCotizacion(cotAfectada);

      // 3. Sincronizar también en la Cuenta de Cobro
      if (otActualizada.estado_pago) {
        const ccMatch = cuentas.find(cc => 
          (otActualizada.cotizacion_id && cc.cotizacion_id === otActualizada.cotizacion_id) ||
          (otActualizada.cotizacion_numero && cc.cotizacion_numero === otActualizada.cotizacion_numero)
        );
        if (ccMatch) {
          const updatedCCs = cuentas.map(cc => {
            if (cc.id === ccMatch.id) {
              return {
                ...cc,
                abono: otActualizada.abono !== undefined ? otActualizada.abono : cc.abono,
                saldo_pendiente: otActualizada.saldo_pendiente !== undefined ? otActualizada.saldo_pendiente : cc.saldo_pendiente,
                estado_pago: otActualizada.estado_pago || cc.estado_pago,
                metodo_pago: otActualizada.metodo_pago || cc.metodo_pago,
                comprobante_url: otActualizada.comprobante_pago || cc.comprobante_url
              };
            }
            return cc;
          });
          setCuentas(updatedCCs);
          StorageService.saveCuentas(updatedCCs);
          const ccActualizada = updatedCCs.find(cc => cc.id === ccMatch.id);
          if (ccActualizada) CloudSyncService.saveCuentaCobro(ccActualizada);
        }
      }
    }
  };

  // Handler para Eliminar o Cancelar una Orden de Trabajo (OT)
  const handleEliminarOT = (
    otId: string, 
    motivo: string, 
    revertirCotizacion?: boolean, 
    nuevoEstadoCot?: EstadoCotizacion
  ) => {
    const otAEliminar = ordenes.find(o => o.id === otId);
    if (!otAEliminar) return;

    // 1. Filtrar lista de órdenes de trabajo
    const updatedOTs = ordenes.filter(o => o.id !== otId);
    setOrdenes(updatedOTs);
    StorageService.saveOrdenes(updatedOTs);

    // 2. Eliminar de la base de datos de Supabase si aplica
    CloudSyncService.deleteOrdenTrabajo(otAEliminar.id, otAEliminar.numero_ot);

    // 3. Si se solicitó actualizar la cotización vinculada (ej: rechazada por cliente)
    if (revertirCotizacion && (otAEliminar.cotizacion_id || otAEliminar.cotizacion_numero)) {
      const estadoDestino = nuevoEstadoCot || 'Rechazada';
      const updatedCots = cotizaciones.map(c => {
        const matches = (otAEliminar.cotizacion_id && c.id === otAEliminar.cotizacion_id) ||
                        (otAEliminar.cotizacion_numero && c.numero_cot === otAEliminar.cotizacion_numero);
        if (!matches) return c;

        const timestamp = new Date().toISOString().slice(0, 10);
        const notaCancelacion = `[${timestamp}] OT ${otAEliminar.numero_ot} cancelada (${motivo})`;
        const notasFinales = c.notas ? `${c.notas}\n${notaCancelacion}` : notaCancelacion;

        return {
          ...c,
          estado: estadoDestino,
          notas: notasFinales
        };
      });
      setCotizaciones(updatedCots);
      StorageService.saveCotizaciones(updatedCots);

      const cotAfectada = updatedCots.find(c => 
        (otAEliminar.cotizacion_id && c.id === otAEliminar.cotizacion_id) ||
        (otAEliminar.cotizacion_numero && c.numero_cot === otAEliminar.cotizacion_numero)
      );
      if (cotAfectada) {
        CloudSyncService.saveCotizacion(cotAfectada);
      }
    }
  };

  const pendingOTs = ordenes.filter(o => o.estado !== 'Listo para Entrega').length;

  // Si estamos en Modo Portal de Cliente Aislado, NO mostrar barra de navegación ni opciones administrativas
  if (isClientPortalMode) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
        <main className="main-content" style={{ padding: '24px 16px', maxWidth: '850px', margin: '0 auto' }}>
          <CustomerTrackingView 
            ordenes={ordenes}
            cotizaciones={cotizaciones}
            config={config}
            isIsolatedMode={true}
            onUnlockAdmin={handleUnlockAdmin}
          />
        </main>

        {/* Modal de Desbloqueo Admin para el equipo de WJGEEKS */}
        {showAdminPinModal && (
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
            onClick={() => setShowAdminPinModal(false)}
          >
            <div 
              className="glass-card" 
              style={{ maxWidth: '380px', width: '100%', margin: 0, padding: '24px', border: '1px solid var(--brand-cyan)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔒</span> Acceso Taller WJGEEKS
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowAdminPinModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Ingresa el PIN de seguridad del taller para desbloquear el panel administrativo completo en este equipo:
              </p>

              <form onSubmit={handleVerifyAdminPin}>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Ingresa clave o PIN (ej: wjg3d)"
                  value={adminPinInput}
                  onChange={e => setAdminPinInput(e.target.value)}
                  autoFocus
                  style={{ width: '100%', marginBottom: '10px', fontSize: '1rem', padding: '10px 14px' }}
                />

                {adminPinError && (
                  <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '12px', fontWeight: 600 }}>
                    {adminPinError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAdminPinModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 700 }}
                  >
                    Desbloquear Taller
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Barra de Navegación Superior */}
      <Navbar 
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewQuoteClick={handleNuevaCotizacion} 
        cloudStatus={cloudSyncStatus}
        onInstallPwa={handleInstallPwa}
        isInstallable={isInstallable}
        onOpenBackupModal={() => setShowBackupModal(true)}
      />

      {/* Contenido Principal según Pestaña */}
      <main className="main-content">
        {activeTab === 'cotizador' && (
          <div>
            <CotizadorForm 
              resinas={resinas}
              maquinas={maquinas}
              insumos={insumos}
              personal={personal}
              config={config}
              tarifasTamanos={tarifasTamanos}
              onAgregarPieza={handleAgregarPieza}
              onOpenSTLViewer={() => setActiveTab('stl')}
              onNavigateToCatalogos={() => setActiveTab('catalogos')}
              initialPieceData={stlAppliedData}
              piezaEnEdicion={pieceToEditInCalculator}
              onCancelarEdicionPieza={() => setPieceToEditInCalculator(null)}
            />

            <CotizacionBuilder 
              items={draftPieces}
              clientes={clientes}
              config={config}
              cotizaciones={cotizaciones}
              cotizacionEnEdicion={editingCotizacion}
              resinas={resinas}
              maquinas={maquinas}
              insumos={insumos}
              onCancelarEdicion={handleCancelarEdicion}
              onRemoveItem={handleRemoveDraftPiece}
              onUpdatePiece={handleUpdateDraftPiece}
              onUpdatePieceQuantity={handleUpdateDraftPieceQuantity}
              onUpdatePieceImage={handleUpdateDraftPieceImage}
              onSaveCotizacion={handleSaveCotizacion}
              onAddCliente={handleAddCliente}
              onLoadPieceToCalculator={handleLoadPieceToCalculator}
            />
          </div>
        )}

        {activeTab === 'workflow' && (
          <WorkOrdersPipeline 
            ordenes={ordenes}
            config={config}
            cotizaciones={cotizaciones}
            tarifasTamanos={tarifasTamanos}
            clientes={clientes}
            onUpdateEstado={handleUpdateEstadoOT}
            onGenerarCuentaCobro={handleGenerarCuentaCobro}
            onCrearOrdenRapida={handleCrearOrdenRapida}
            onActualizarOT={handleActualizarOT}
            onEliminarOT={handleEliminarOT}
            onNavigateToCotizaciones={(cotId) => {
              setActiveTab('cotizaciones');
            }}
          />
        )}

        {activeTab === 'cotizaciones' && (
          <CotizacionesList 
            cotizaciones={cotizaciones}
            config={config}
            ordenes={ordenes}
            onUpdateEstado={(id, st) => {
              const u = cotizaciones.map(c => c.id === id ? { ...c, estado: st } : c);
              setCotizaciones(u);
              StorageService.saveCotizaciones(u);
            }}
            onEditarCotizacion={handleEditarCotizacion}
            onAprobarCotizacion={handleAprobarCotizacion}
            onActualizarPagoCotizacion={handleActualizarPagoCotizacion}
            onNuevaCotizacion={handleNuevaCotizacion}
          />
        )}

        {activeTab === 'pos' && (
          <POSExpressView 
            ventas={ventasExpress}
            clientes={clientes}
            config={config}
            onGuardarVenta={handleGuardarVentaExpress}
            onActualizarVenta={handleActualizarVentaExpress}
            onCrearCliente={handleAddCliente}
          />
        )}

        {activeTab === 'cuentas' && (
          <CuentasCobroList 
            cuentas={cuentas}
            ventasExpress={ventasExpress}
            config={config}
            onUpdatePago={handleUpdatePago}
            onUpdateVentaExpress={handleActualizarVentaExpress}
          />
        )}

        {activeTab === 'catalogos' && (
          <CatalogosManager 
            resinas={resinas}
            insumos={insumos}
            maquinas={maquinas}
            personal={personal}
            clientes={clientes}
            proveedores={proveedores}
            config={config}
            tarifasTamanos={tarifasTamanos}
            onUpdateResinas={r => { setResinas(r); StorageService.saveResinas(r); }}
            onUpdateInsumos={i => { setInsumos(i); StorageService.saveInsumos(i); }}
            onUpdateMaquinas={m => { setMaquinas(m); StorageService.saveMaquinas(m); }}
            onUpdatePersonal={p => { setPersonal(p); StorageService.savePersonal(p); }}
            onUpdateClientes={c => { setClientes(c); StorageService.saveClientes(c); }}
            onUpdateProveedores={pr => { setProveedores(pr); StorageService.saveProveedores(pr); }}
            onUpdateConfig={cfg => { setConfig(cfg); StorageService.saveConfig(cfg); }}
            onUpdateTarifasTamanos={t => { setTarifasTamanos(t); StorageService.saveTarifasTamanos(t); }}
          />
        )}

        {activeTab === 'plan' && (
          <ProjectPlanView />
        )}

        {activeTab === 'stl' && (
          <STLAnalyzer 
            resinas={resinas}
            onApplyToCotizador={(data) => {
              setStlAppliedData(data);
              setActiveTab('cotizador');
            }}
          />
        )}

        {activeTab === 'stock' && (
          <ProductosStockView 
            productos={productosStock}
            onUpdateProductos={handleUpdateProductosStock}
            onAgregarACotizacion={(pieza) => {
              handleAgregarPieza(pieza);
            }}
            onNavigateToCotizador={() => setActiveTab('cotizador')}
          />
        )}

        {activeTab === 'finanzas' && (
          <FinancialReportView 
            cotizaciones={cotizaciones}
            ordenes={ordenes}
            cuentas={cuentas}
            resinas={resinas}
          />
        )}

        {activeTab === 'seguimiento' && (
          <CustomerTrackingView 
            ordenes={ordenes}
            cotizaciones={cotizaciones}
            config={config}
          />
        )}

        {activeTab === 'tareas' && (
          <TeamTasksView 
            tareas={tareas}
            solicitudesInsumos={solicitudesInsumos}
            insumosCatalogo={insumos}
            config={config}
            onGuardarTarea={handleGuardarTarea}
            onActualizarTarea={handleActualizarTarea}
            onEliminarTarea={handleEliminarTarea}
            onCrearSolicitudInsumo={handleCrearSolicitudInsumo}
            onActualizarSolicitudInsumo={handleActualizarSolicitudInsumo}
          />
        )}

        {activeTab === 'marketing' && (
          <MarketingHubView 
            productosStock={productosStock}
            tarifasTamanos={tarifasTamanos}
            config={config}
          />
        )}

        {activeTab === 'herramientas' && (
          <ToolsHubView />
        )}
      </main>

      {/* Barra de Navegación Inferior Mobile-First */}
      <BottomNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOTsCount={pendingOTs}
        draftItemsCount={draftPieces.length}
        onOpenBackupModal={() => setShowBackupModal(true)}
      />

      {/* Modal de Respaldos y Google Drive */}
      <BackupDriveModal 
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        cloudStatus={cloudSyncStatus}
      />
    </div>
  );
};
