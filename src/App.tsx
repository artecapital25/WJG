import React, { useState, useEffect } from 'react';
import { HeaderMinimal } from './components/ui/HeaderMinimal';
import { BottomNavBar, HubType } from './components/ui/BottomNavBar';
import { HubNavigationController } from './components/ui/HubNavigationController';
const CotizadorForm = React.lazy(() => import('./components/cotizador/CotizadorForm').then(m => ({ default: m.CotizadorForm })));
const CotizacionBuilder = React.lazy(() => import('./components/cotizador/CotizacionBuilder').then(m => ({ default: m.CotizacionBuilder })));
import { TabLoadingSkeleton } from './components/ui/TabLoadingSkeleton';
import { StaffLoginModal } from './components/auth/StaffLoginModal';
import { StaffAuthGuard } from './components/auth/StaffAuthGuard';
import { toast } from './components/ui/ToastProvider';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const WorkOrdersPipeline = React.lazy(() => import('./components/workflow/WorkOrdersPipeline').then(m => ({ default: m.WorkOrdersPipeline })));
const CotizacionesList = React.lazy(() => import('./components/cotizaciones/CotizacionesList').then(m => ({ default: m.CotizacionesList })));
const CuentasCobroList = React.lazy(() => import('./components/cuentasCobro/CuentasCobroList').then(m => ({ default: m.CuentasCobroList })));
const CatalogosManager = React.lazy(() => import('./components/catalogos/CatalogosManager').then(m => ({ default: m.CatalogosManager })));
const ProjectPlanView = React.lazy(() => import('./components/plan/ProjectPlanView').then(m => ({ default: m.ProjectPlanView })));
const STLAnalyzer = React.lazy(() => import('./components/stl/STLAnalyzer').then(m => ({ default: m.STLAnalyzer })));
const ProductosStockView = React.lazy(() => import('./components/stock/ProductosStockView').then(m => ({ default: m.ProductosStockView })));
const CustomerTrackingView = React.lazy(() => import('./components/tracking/CustomerTrackingView').then(m => ({ default: m.CustomerTrackingView })));
const FinancialReportView = React.lazy(() => import('./components/reports/FinancialReportView').then(m => ({ default: m.FinancialReportView })));
const POSExpressView = React.lazy(() => import('./components/pos/POSExpressView').then(m => ({ default: m.POSExpressView })));
const TeamTasksView = React.lazy(() => import('./components/team/TeamTasksView').then(m => ({ default: m.TeamTasksView })));
const MarketingHubView = React.lazy(() => import('./components/marketing/MarketingHubView').then(m => ({ default: m.MarketingHubView })));
const ToolsHubView = React.lazy(() => import('./components/tools/ToolsHubView').then(m => ({ default: m.ToolsHubView })));
const BackupDriveModal = React.lazy(() => import('./components/backup/BackupDriveModal').then(m => ({ default: m.BackupDriveModal })));
const CalendarOperationalView = React.lazy(() => import('./components/calendar/CalendarOperationalView').then(m => ({ default: m.CalendarOperationalView })));
const UsuariosManagerView = React.lazy(() => import('./components/admin/UsuariosManagerView').then(m => ({ default: m.UsuariosManagerView })));
const DailyBriefingModal = React.lazy(() => import('./components/admin/DailyBriefingModal').then(m => ({ default: m.DailyBriefingModal })));
import { AuthSecurityService } from './services/authSecurityService';
import { WhatsAppNotificationService } from './services/whatsappNotificationService';
import { useUsuariosTaller } from './hooks/useUsuariosTaller';
import { useAuthorization } from './hooks/useAuthorization';
import { AccessDeniedView } from './components/ui/AccessDeniedView';
import { CambiarPinModal } from './components/auth/CambiarPinModal';

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
import type { ItemDeudaConsolidado } from './components/cuentasCobro/CuentasCobroList';
import { StorageService } from './services/storageService';
import { CloudSyncService } from './services/cloudSyncService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabType;
      const validTabs: TabType[] = [
        'cotizador', 'pos', 'workflow', 'cotizaciones', 'cuentas', 'catalogos', 
        'plan', 'stl', 'stock', 'seguimiento', 'finanzas', 'tareas', 'marketing', 'herramientas', 'calendario', 'usuarios'
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

  const [activeHub, setActiveHub] = useState<HubType>(() => {
    if (['cotizador', 'cotizaciones', 'pos'].includes(activeTab)) return 'ventas';
    if (['workflow', 'stl', 'stock', 'calendario', 'seguimiento'].includes(activeTab)) return 'taller';
    if (['cuentas', 'finanzas', 'plan'].includes(activeTab)) return 'finanzas';
    return 'gestion';
  });

  const [activeOperator, setActiveOperator] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const trusted = AuthSecurityService.checkTrustedDevice();
      if (trusted.isTrusted && trusted.staffUser) return trusted.staffUser;
      const stored = localStorage.getItem('wjg_staff_user');
      if (stored) return stored;
    }
    return 'Juan';
  });
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);

  // Hook de Usuarios de Taller y RBAC
  const { usuarios: usuariosTaller, cambiarPin, recuperarPin } = useUsuariosTaller();
  const { currentUser, permisos, canAccessHub, canAccessTab } = useAuthorization(activeOperator, usuariosTaller);

  useEffect(() => {
    if (['cotizador', 'cotizaciones', 'pos'].includes(activeTab)) setActiveHub('ventas');
    else if (['workflow', 'stl', 'stock', 'calendario', 'seguimiento'].includes(activeTab)) setActiveHub('taller');
    else if (['cuentas', 'finanzas', 'plan'].includes(activeTab)) setActiveHub('finanzas');
    else if (activeTab === 'tareas') {
      if (activeHub === 'taller' || !canAccessHub('gestion')) {
        setActiveHub('taller');
      } else {
        setActiveHub('gestion');
      }
    } else setActiveHub('gestion');
  }, [activeTab, activeHub, canAccessHub]);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showDailyBriefingModal, setShowDailyBriefingModal] = useState(false);
  const [whatsappHealthStatus, setWhatsappHealthStatus] = useState<'operativo' | 'alerta_critica' | 'desconocido'>('operativo');

  // Monitor periódico de salud de WhatsApp (+57 320 2796115)
  useEffect(() => {
    let isMounted = true;
    const checkWA = async () => {
      try {
        const res = await WhatsAppNotificationService.obtenerSaludWhatsApp();
        if (isMounted && res?.status) {
          setWhatsappHealthStatus(res.status);
        }
      } catch {
        if (isMounted) setWhatsappHealthStatus('operativo');
      }
    };
    checkWA();
    const intervalId = setInterval(checkWA, 5 * 60 * 1000); // Cada 5 minutos
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Detección de Modo Portal de Cliente Aislado / Público
  const [isClientPortalMode, setIsClientPortalMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isExplicitPortal = params.get('portal') === 'cliente';
      const hasTrackingParam = Boolean(params.get('ot') || params.get('cot') || params.get('token'));
      const isExplicitAdmin = sessionStorage.getItem('wjg_admin_unlocked') === 'true' || AuthSecurityService.checkTrustedDevice().isTrusted;

      if ((isExplicitPortal || hasTrackingParam) && !isExplicitAdmin) {
        return true;
      }
    }
    return false;
  });

  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  
  // Autenticación Persistente ("Minuto Cero") y Dispositivos de Confianza
  const [staffUser, setStaffUser] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const trusted = AuthSecurityService.checkTrustedDevice();
      if (trusted.isTrusted && trusted.staffUser) return trusted.staffUser;
      return localStorage.getItem('wjg_staff_user');
    }
    return null;
  });

  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const trusted = AuthSecurityService.checkTrustedDevice();
      if (trusted.isTrusted) return true;
      return sessionStorage.getItem('wjg_admin_unlocked') === 'true';
    }
    return false;
  });

  const handleStaffLoginSuccess = (userLabel: string) => {
    setStaffUser(userLabel);
    setActiveOperator(userLabel);
    setIsStaffAuthenticated(true);
    setIsClientPortalMode(false);
  };

  const handleStaffLogout = () => {
    setStaffUser(null);
    setIsStaffAuthenticated(false);
    AuthSecurityService.revokeTrustedDevice();
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isExplicitPortal = params?.get('portal') === 'cliente';
    const hasTrackingParam = Boolean(params?.get('ot') || params?.get('cot') || params?.get('token'));
    setIsClientPortalMode(Boolean(isExplicitPortal || hasTrackingParam));
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

    // 2. Traer datos frescos de Supabase en segundo plano como Fuente Única de la Verdad (Single Source of Truth)
    const syncCloudData = async () => {
      try {
        const [cloudCots, cloudClis, cloudOTs, cloudVentas, cloudCCs, cloudTareas, cloudSolicitudes, cloudStock] = await Promise.all([
          CloudSyncService.fetchCotizaciones(),
          CloudSyncService.fetchClientes(),
          CloudSyncService.fetchOrdenes(),
          CloudSyncService.fetchVentasExpress(),
          CloudSyncService.fetchCuentas(),
          CloudSyncService.fetchTareasEquipo(),
          CloudSyncService.fetchSolicitudesInsumos(),
          CloudSyncService.fetchProductosStock()
        ]);

        if (cloudCots !== null) {
          setCotizaciones(cloudCots);
          StorageService.saveCotizaciones(cloudCots);
        }

        if (cloudClis !== null) {
          setClientes(cloudClis);
          StorageService.saveClientes(cloudClis);
        }

        if (cloudOTs !== null) {
          setOrdenes(cloudOTs);
          StorageService.saveOrdenes(cloudOTs);
        }

        if (cloudVentas !== null) {
          setVentasExpress(cloudVentas);
          StorageService.saveVentasExpress(cloudVentas);
        }

        if (cloudCCs !== null) {
          setCuentas(cloudCCs);
          StorageService.saveCuentas(cloudCCs);
        }

        if (cloudTareas !== null) {
          setTareas(cloudTareas);
          StorageService.saveTareas(cloudTareas);
        }

        if (cloudSolicitudes !== null) {
          setSolicitudesInsumos(cloudSolicitudes);
          StorageService.saveSolicitudesInsumos(cloudSolicitudes);
        }

        if (cloudStock !== null) {
          setProductosStock(cloudStock);
          StorageService.saveProductosStock(cloudStock);
        }

        setCloudSyncStatus('connected');
      } catch (err) {
        console.warn('Error sincronizando con Supabase:', err);
        setCloudSyncStatus('connected');
      }
    };

    syncCloudData();

    // 3. Suscripción reactiva en tiempo real a cambios de taller entre todos los dispositivos
    const channel = CloudSyncService.subscribeRealtime(
      async () => {
        const freshCots = await CloudSyncService.fetchCotizaciones();
        if (freshCots !== null) {
          setCotizaciones(freshCots);
          StorageService.saveCotizaciones(freshCots);
        }
      },
      async () => {
        const freshOTs = await CloudSyncService.fetchOrdenes();
        if (freshOTs !== null) {
          setOrdenes(freshOTs);
          StorageService.saveOrdenes(freshOTs);
        }
      },
      async () => {
        const freshCCs = await CloudSyncService.fetchCuentas();
        if (freshCCs !== null) {
          setCuentas(freshCCs);
          StorageService.saveCuentas(freshCCs);
        }
      },
      async () => {
        const freshVentas = await CloudSyncService.fetchVentasExpress();
        if (freshVentas !== null) {
          setVentasExpress(freshVentas);
          StorageService.saveVentasExpress(freshVentas);
        }
      },
      async () => {
        const freshTareas = await CloudSyncService.fetchTareasEquipo();
        if (freshTareas !== null) {
          setTareas(freshTareas);
          StorageService.saveTareas(freshTareas);
        }
      },
      async () => {
        const freshSols = await CloudSyncService.fetchSolicitudesInsumos();
        if (freshSols !== null) {
          setSolicitudesInsumos(freshSols);
          StorageService.saveSolicitudesInsumos(freshSols);
        }
      },
      async () => {
        // Sincronización Transaccional Global al recibir mutaciones en la tabla payments
        const [cots, ots, ccs, vts] = await Promise.all([
          CloudSyncService.fetchCotizaciones(),
          CloudSyncService.fetchOrdenes(),
          CloudSyncService.fetchCuentas(),
          CloudSyncService.fetchVentasExpress()
        ]);
        if (cots) { setCotizaciones(cots); StorageService.saveCotizaciones(cots); }
        if (ots) { setOrdenes(ots); StorageService.saveOrdenes(ots); }
        if (ccs) { setCuentas(ccs); StorageService.saveCuentas(ccs); }
        if (vts) { setVentasExpress(vts); StorageService.saveVentasExpress(vts); }
      },
      async () => {
        // Sincronización en tiempo real de productos_stock
        const freshStock = await CloudSyncService.fetchProductosStock();
        if (freshStock !== null) {
          setProductosStock(freshStock);
          StorageService.saveProductosStock(freshStock);
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

  // Guardar Cotización (nueva o modificada con Reconciliación Transaccional de OTs)
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

    // Sincronizar en la nube Supabase en segundo plano con notificación operativa
    CloudSyncService.saveCotizacion(cotizacion).then(ok => {
      if (!ok) {
        toast.warning(`Cotización ${cotizacion.numero_cot} guardada localmente. Sincronización en la nube pendiente.`);
      } else {
        toast.success(`Cotización ${cotizacion.numero_cot} guardada y sincronizada.`);
      }
    });

    // Reconciliación Transaccional con Órdenes de Trabajo (OT) del Taller si la cotización ya tiene OTs
    const currentOrders = StorageService.getOrdenes();
    const otsAsociadas = currentOrders.filter(o => 
      o.cotizacion_id === cotizacion.id || o.cotizacion_numero === cotizacion.numero_cot
    );

    if (otsAsociadas.length > 0) {
      let maxConsecutive = StorageService.getNextOTConsecutive(currentOrders);
      let otsActualizadas = [...currentOrders];
      const items = cotizacion.items || [];

      items.forEach((item, idx) => {
        const indexExistente = otsActualizadas.findIndex(o => 
          (o.cotizacion_id === cotizacion.id || o.cotizacion_numero === cotizacion.numero_cot) &&
          o.item_nombre?.trim().toLowerCase() === item.nombre_item?.trim().toLowerCase()
        );

        if (indexExistente !== -1) {
          // Actualizar OT existente con nuevos parámetros
          const otActual = otsActualizadas[indexExistente];
          const otModificada: OrdenTrabajo = {
            ...otActual,
            cliente_nombre: cotizacion.cliente.nombre,
            cliente_telefono: cotizacion.cliente.telefono,
            cantidad: item.cantidad || 1,
            tiempo_impresion_min: item.tiempo_impresion_min || otActual.tiempo_impresion_min,
            tiempo_armado_min: item.tiempo_armado_min || otActual.tiempo_armado_min,
            tiempo_pintura_min: item.tiempo_pintura_min || otActual.tiempo_pintura_min,
            peso_estimado_g: item.peso_estimado_g || otActual.peso_estimado_g,
            detalles_tecnicos: item.descripcion_tecnica || otActual.detalles_tecnicos,
            precio_cobrado: item.precio_total || otActual.precio_cobrado,
            imagen_url: item.imagen_url || otActual.imagen_url
          };
          otsActualizadas[indexExistente] = otModificada;
          CloudSyncService.saveOrdenTrabajo(otModificada);
        } else {
          // Nueva pieza agregada a la cotización aprobada: crear su OT
          maxConsecutive++;
          const numOT = `OT-${maxConsecutive.toString().padStart(4, '0')}`;
          const nuevaOT: OrdenTrabajo = {
            id: `ot-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            numero_ot: numOT,
            cotizacion_id: cotizacion.id,
            cotizacion_numero: cotizacion.numero_cot,
            cliente_nombre: cotizacion.cliente.nombre,
            cliente_telefono: cotizacion.cliente.telefono,
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
            detalles_tecnicos: item.descripcion_tecnica,
            imagen_url: item.imagen_url,
            precio_cobrado: item.precio_total,
            estado_pago: cotizacion.estado_pago || 'Pendiente'
          };
          otsActualizadas = [nuevaOT, ...otsActualizadas];
          CloudSyncService.saveOrdenTrabajo(nuevaOT);
        }
      });

      setOrdenes(otsActualizadas);
      StorageService.saveOrdenes(otsActualizadas);
      toast.info(`Se sincronizaron ${otsAsociadas.length} órdenes de trabajo en el taller`);
    }

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
    toast.success('Cotización guardada exitosamente');
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
    const totalItems = items.length;
    let abonoRestante = abonoFinal;

    items.forEach((item, index) => {
      // Verificar si ya existe una OT para esta pieza en esta cotización
      const yaExiste = currentOrders.some(o => 
        (o.cotizacion_id === cot.id || o.cotizacion_numero === cot.numero_cot) && 
        o.item_nombre?.trim().toLowerCase() === item.nombre_item?.trim().toLowerCase()
      );

      const itemPrecio = item.precio_total || (totalItems === 1 ? cot.total : 0);
      let itemAbono = 0;
      if (totalItems <= 1) {
        itemAbono = abonoFinal;
      } else if (cot.total > 0) {
        if (index === totalItems - 1) {
          itemAbono = Math.max(0, abonoRestante);
        } else {
          itemAbono = Math.min(itemPrecio, Math.round(abonoFinal * (itemPrecio / cot.total)));
          abonoRestante = Math.max(0, abonoRestante - itemAbono);
        }
      }
      const itemSaldo = Math.max(0, itemPrecio - itemAbono);
      const itemEstadoPago: EstadoPago = itemSaldo === 0 
        ? 'Pagado Total' 
        : (itemAbono > 0 ? 'Abono Parcial' : 'Pendiente');

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
          precio_cobrado: itemPrecio,
          estado_pago: itemEstadoPago,
          abono: itemAbono,
          saldo_pendiente: itemSaldo,
          metodo_pago: metodoPagoFinal,
          comprobante_pago: comprobanteFinal
        });
      }
    });

    // También actualizar OTs existentes asociadas con los datos de pago actualizados
    const existingMatching = currentOrders.filter(o => o.cotizacion_id === cot.id || o.cotizacion_numero === cot.numero_cot);
    const numExisting = existingMatching.length;

    let updatedOTs = currentOrders.map(o => {
      if (o.cotizacion_id === cot.id || o.cotizacion_numero === cot.numero_cot) {
        const itemPrecio = o.precio_cobrado || (numExisting === 1 ? cot.total : 0);
        let itemAbono = 0;
        if (numExisting <= 1) {
          itemAbono = abonoFinal;
        } else if (cot.total > 0) {
          itemAbono = Math.min(itemPrecio, Math.round(abonoFinal * (itemPrecio / cot.total)));
        }
        const itemSaldo = Math.max(0, itemPrecio - itemAbono);
        const itemEstadoPago: EstadoPago = itemSaldo === 0 ? 'Pagado Total' : (itemAbono > 0 ? 'Abono Parcial' : 'Pendiente');

        return {
          ...o,
          precio_cobrado: itemPrecio,
          estado_pago: itemEstadoPago,
          abono: itemAbono,
          saldo_pendiente: itemSaldo,
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
        const itemPrecio = o.precio_cobrado || targetCot.total;
        const prop = targetCot.total > 0 ? (itemPrecio / targetCot.total) : 1;
        const itemAbono = Math.round(datosPago.abono * prop);
        const itemSaldo = Math.max(0, itemPrecio - itemAbono);
        const itemEstado: EstadoPago = itemSaldo === 0 ? 'Pagado Total' : (itemAbono > 0 ? 'Abono Parcial' : 'Pendiente');

        return {
          ...o,
          precio_cobrado: itemPrecio,
          estado_pago: itemEstado,
          abono: itemAbono,
          saldo_pendiente: itemSaldo,
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

  // Generar Cuenta de Cobro a partir de una OT terminada (sin duplicaciones ni abonos inventados)
  const handleGenerarCuentaCobro = (ot: OrdenTrabajo) => {
    // 1. Verificar si ya existe una Cuenta de Cobro para esta OT o Cotización
    const existingCC = cuentas.find(c => 
      (ot.cotizacion_id && c.cotizacion_id === ot.cotizacion_id) ||
      (ot.cotizacion_numero && c.cotizacion_numero === ot.cotizacion_numero) ||
      c.id === ot.id ||
      c.numero_cc === ot.numero_ot ||
      (c.items_resumen && c.items_resumen.includes(ot.numero_ot))
    );

    const cotOriginal = cotizaciones.find(c => c.id === ot.cotizacion_id);
    const totalMonto = ot.precio_cobrado && ot.precio_cobrado > 0 
      ? ot.precio_cobrado 
      : (cotOriginal ? cotOriginal.total : ((ot.abono || 0) + (ot.saldo_pendiente || 0) || 50000));
    const abonoMonto = ot.abono || 0; // Usar el abono real registrado en taller, nunca inventar 50%
    const saldo = Math.max(0, totalMonto - abonoMonto);

    if (existingCC) {
      // Actualizar la existente sin duplicar
      const updated = cuentas.map(c => {
        if (c.id === existingCC.id) {
          return {
            ...c,
            total: totalMonto,
            abono: abonoMonto,
            saldo_pendiente: saldo,
            estado_pago: saldo === 0 ? ('Pagado Total' as const) : (abonoMonto > 0 ? ('Abono Parcial' as const) : ('Pendiente' as const)),
            items_resumen: c.items_resumen || `${ot.numero_ot}: ${ot.item_nombre} (x${ot.cantidad})`
          };
        }
        return c;
      });
      setCuentas(updated);
      StorageService.saveCuentas(updated);
      const target = updated.find(c => c.id === existingCC.id);
      if (target) CloudSyncService.saveCuentaCobro(target);
      toast.info(`Cuenta ${existingCC.numero_cc} sincronizada con orden ${ot.numero_ot}.`);
      setActiveTab('cuentas');
      return;
    }

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
      items_resumen: `${ot.numero_ot}: ${ot.item_nombre} (x${ot.cantidad})`,
      total: totalMonto,
      abono: abonoMonto,
      saldo_pendiente: saldo,
      estado_pago: saldo === 0 ? 'Pagado Total' : (abonoMonto > 0 ? 'Abono Parcial' : 'Pendiente')
    };

    const updated = [nuevaCC, ...cuentas];
    setCuentas(updated);
    StorageService.saveCuentas(updated);
    setActiveTab('cuentas');

    // Sincronizar cuenta de cobro en Supabase
    CloudSyncService.saveCuentaCobro(nuevaCC);
    toast.success(`Cuenta de cobro ${nuevaCC.numero_cc} generada para ${ot.item_nombre}.`);
  };

  // Actualizar Pago en Cuenta de Cobro y sincronizar multi-módulo
  const handleUpdatePago = (cuentaId: string, nuevoAbono: number) => {
    const cuentaPrevia = cuentas.find(c => c.id === cuentaId);
    if (!cuentaPrevia) return;

    const deltaAbono = Math.max(0, nuevoAbono - (cuentaPrevia.abono || 0));
    const saldo = Math.max(0, cuentaPrevia.total - nuevoAbono);
    const estadoPago = saldo === 0 ? ('Pagado Total' as const) : (nuevoAbono > 0 ? ('Abono Parcial' as const) : ('Pendiente' as const));

    const updated = cuentas.map(c => {
      if (c.id === cuentaId) {
        return {
          ...c,
          abono: nuevoAbono,
          saldo_pendiente: saldo,
          estado_pago: estadoPago
        };
      }
      return c;
    });
    setCuentas(updated);
    StorageService.saveCuentas(updated);

    const targetCC = updated.find(c => c.id === cuentaId);
    if (targetCC) {
      CloudSyncService.saveCuentaCobro(targetCC);

      // Sincronizar Cotización vinculada
      if (targetCC.cotizacion_id || targetCC.cotizacion_numero) {
        const updatedCots = cotizaciones.map(cot => {
          if ((targetCC.cotizacion_id && cot.id === targetCC.cotizacion_id) ||
              (targetCC.cotizacion_numero && cot.numero_cot === targetCC.cotizacion_numero)) {
            return {
              ...cot,
              abono: targetCC.abono,
              saldo_pendiente: targetCC.saldo_pendiente,
              estado_pago: targetCC.estado_pago,
              metodo_pago: targetCC.metodo_pago || cot.metodo_pago
            };
          }
          return cot;
        });
        setCotizaciones(updatedCots);
        StorageService.saveCotizaciones(updatedCots);
        const cotAfectada = updatedCots.find(c => 
          (targetCC.cotizacion_id && c.id === targetCC.cotizacion_id) ||
          (targetCC.cotizacion_numero && c.numero_cot === targetCC.cotizacion_numero)
        );
        if (cotAfectada) CloudSyncService.saveCotizacion(cotAfectada);
      }

      // Sincronizar OTs vinculadas
      const matchingOTs = ordenes.filter(o => 
        (targetCC.cotizacion_id && o.cotizacion_id === targetCC.cotizacion_id) ||
        (targetCC.cotizacion_numero && o.cotizacion_numero === targetCC.cotizacion_numero) ||
        targetCC.id === o.id ||
        targetCC.numero_cc === o.numero_ot ||
        (targetCC.items_resumen && targetCC.items_resumen.includes(o.numero_ot))
      );

      if (matchingOTs.length > 0) {
        const updatedOTs = ordenes.map(o => {
          const isMatch = matchingOTs.some(m => m.id === o.id);
          if (!isMatch) return o;

          if (matchingOTs.length === 1) {
            const otSaldo = Math.max(0, (o.precio_cobrado || targetCC.total) - nuevoAbono);
            return {
              ...o,
              abono: nuevoAbono,
              saldo_pendiente: otSaldo,
              estado_pago: otSaldo === 0 ? ('Pagado Total' as const) : (nuevoAbono > 0 ? ('Abono Parcial' as const) : ('Pendiente' as const)),
              metodo_pago: targetCC.metodo_pago || o.metodo_pago
            };
          } else {
            const ratio = (o.precio_cobrado || 1) / (targetCC.total || 1);
            const otAbono = Math.round(nuevoAbono * ratio);
            const otSaldo = Math.max(0, (o.precio_cobrado || 0) - otAbono);
            return {
              ...o,
              abono: otAbono,
              saldo_pendiente: otSaldo,
              estado_pago: otSaldo === 0 ? ('Pagado Total' as const) : (otAbono > 0 ? ('Abono Parcial' as const) : ('Pendiente' as const)),
              metodo_pago: targetCC.metodo_pago || o.metodo_pago
            };
          }
        });
        setOrdenes(updatedOTs);
        StorageService.saveOrdenes(updatedOTs);
        matchingOTs.forEach(m => {
          const u = updatedOTs.find(o => o.id === m.id);
          if (u) CloudSyncService.saveOrdenTrabajo(u);
        });
      }

      // Asentar en Ledger Central SOLO si hubo un incremento real (delta > 0)
      if (deltaAbono > 0) {
        CloudSyncService.savePayment({
          id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          monto: deltaAbono,
          metodo_pago: targetCC.metodo_pago || 'Bre-B',
          comprobante_url: targetCC.comprobante_url,
          cotizacion_id: targetCC.cotizacion_id,
          cuenta_cobro_id: targetCC.id,
          orden_trabajo_id: matchingOTs[0]?.id,
          origen_modulo: 'cuenta_cobro',
          nota: `Abono de $${deltaAbono.toLocaleString('es-CO')} en Cuenta de Cobro ${targetCC.numero_cc}`
        });
      }
    }
  };

  // Handler para crear una nueva Cuenta de Cobro / Deuda Manual
  const handleCrearCuentaCobro = (nuevaCC: CuentaCobro) => {
    const updated = [nuevaCC, ...cuentas];
    setCuentas(updated);
    StorageService.saveCuentas(updated);
    CloudSyncService.saveCuentaCobro(nuevaCC);

    // Si el cliente no existe en el catálogo de clientes, registrarlo automáticamente
    if (nuevaCC.cliente?.nombre) {
      const existeCliente = clientes.some(c => 
        c.nombre.toLowerCase().trim() === nuevaCC.cliente.nombre.toLowerCase().trim() ||
        (nuevaCC.cliente.telefono && c.telefono && c.telefono === nuevaCC.cliente.telefono)
      );
      if (!existeCliente) {
        handleAddCliente(nuevaCC.cliente);
      }
    }
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
    // Sincronizar en Supabase
    items.forEach(prod => CloudSyncService.saveProductoStock(prod));
  };

  const handleGuardarVentaExpress = (nuevaVenta: VentaExpress) => {
    let ventaFinal: VentaExpress = { ...nuevaVenta };

    // Conciliación y descuento inmediato de stock físico si aplica
    if (ventaFinal.descontar_stock && ventaFinal.producto_stock_id) {
      const cantVendida = ventaFinal.cantidad_vendida || 1;
      const updatedStock = productosStock.map(p => {
        if (p.id === ventaFinal.producto_stock_id) {
          const nuevoStock = Math.max(0, (p.stock_actual || 0) - cantVendida);
          return { ...p, stock_actual: nuevoStock, fecha_actualizacion: new Date().toISOString() };
        }
        return p;
      });
      setProductosStock(updatedStock);
      StorageService.saveProductosStock(updatedStock);
      const prodAfectado = updatedStock.find(p => p.id === ventaFinal.producto_stock_id);
      if (prodAfectado) {
        CloudSyncService.saveProductoStock(prodAfectado);
      }
    }

    // Si la venta requiere Orden de Trabajo (OT) y taller, generamos la OT con su trazabilidad de diseño
    if (ventaFinal.requiere_ot) {
      const currentOrders = StorageService.getOrdenes();
      const numOT = StorageService.getNextOTNumber(currentOrders);
      const otId = `ot-pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      ventaFinal.ot_numero = numOT;
      ventaFinal.ot_id = otId;

      const nuevaOT: OrdenTrabajo = {
        id: otId,
        numero_ot: numOT,
        cotizacion_id: ventaFinal.id,
        cotizacion_numero: ventaFinal.numero_venta,
        pos_venta_id: ventaFinal.id,
        cliente_nombre: ventaFinal.cliente_nombre,
        cliente_telefono: ventaFinal.cliente_telefono,
        item_nombre: ventaFinal.nombre_producto,
        cantidad: 1,
        estado: 'En Cola',
        operador_asignado: 'Juan (Taller)',
        fecha_creacion: new Date().toISOString(),
        tiempo_impresion_min: 120,
        tiempo_armado_min: 15,
        tiempo_pintura_min: 30,
        resina_nombre: 'Anycubic Standard Grey',
        maquina_nombre: 'Anycubic MONO 4',
        va_pintado: true,
        tiene_empaque: true,
        detalles_tecnicos: `Venta POS Express ${ventaFinal.numero_venta}${ventaFinal.notas ? ` | Notas: ${ventaFinal.notas}` : ''}${ventaFinal.notas_diseno ? ` | Req. Diseño: ${ventaFinal.notas_diseno}` : ''}`,
        imagen_url: ventaFinal.foto_url || undefined,
        precio_cobrado: ventaFinal.total,
        es_proyecto_rapido: true,
        stl_estado: ventaFinal.estado_diseno === 'requiere_nuevo' ? 'Modelado Pendiente' : 'Diseñado por Germán',
        stl_modelador: 'Germán',
        stl_operador: 'Juan',
        stl_url: ventaFinal.enlace_diseno || undefined,
        stl_notas: ventaFinal.notas_diseno || undefined,
        estado_pago: (ventaFinal.estado_pago as EstadoPago) || 'Pendiente',
        abono: ventaFinal.abono,
        saldo_pendiente: ventaFinal.saldo_pendiente,
        metodo_pago: ventaFinal.metodo_pago
      };

      const updatedOTs = [nuevaOT, ...ordenes];
      setOrdenes(updatedOTs);
      StorageService.saveOrdenes(updatedOTs);
      CloudSyncService.saveOrdenTrabajo(nuevaOT);
    }

    const updated = [ventaFinal, ...ventasExpress];
    setVentasExpress(updated);
    StorageService.saveVentasExpress(updated);

    // Asentar en Ledger Inmutable (abonos_pagos) el abono inicial recibido en el POS
    if (Number(ventaFinal.abono) > 0) {
      CloudSyncService.savePayment({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monto: Number(ventaFinal.abono),
        metodo_pago: ventaFinal.metodo_pago || 'Bre-B',
        pos_venta_id: ventaFinal.id,
        orden_trabajo_id: ventaFinal.ot_id || undefined,
        origen_modulo: 'pos',
        nota: `Abono inicial de $${Number(ventaFinal.abono).toLocaleString('es-CO')} en Venta ${ventaFinal.numero_venta} (${ventaFinal.nombre_producto})`
      });
    }

    CloudSyncService.saveVentaExpress(ventaFinal).then(res => {
      if (res && !res.success && res.error) {
        toast.warning(`Venta guardada localmente. Pendiente en nube: ${res.error}`);
      } else {
        toast.success(`Venta ${ventaFinal.numero_venta} registrada correctamente.`);
      }
    });
  };

  const handleActualizarVentaExpress = (ventaActualizada: VentaExpress) => {
    let ventaFinal: VentaExpress = { ...ventaActualizada };

    // Si antes no tenía OT y ahora se activa "requiere_ot", generarla
    if (ventaFinal.requiere_ot && !ventaFinal.ot_id && !ventaFinal.ot_numero) {
      const currentOrders = StorageService.getOrdenes();
      const numOT = StorageService.getNextOTNumber(currentOrders);
      const otId = `ot-pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      ventaFinal.ot_numero = numOT;
      ventaFinal.ot_id = otId;

      const nuevaOT: OrdenTrabajo = {
        id: otId,
        numero_ot: numOT,
        cotizacion_id: ventaFinal.id,
        cotizacion_numero: ventaFinal.numero_venta,
        pos_venta_id: ventaFinal.id,
        cliente_nombre: ventaFinal.cliente_nombre,
        cliente_telefono: ventaFinal.cliente_telefono,
        item_nombre: ventaFinal.nombre_producto,
        cantidad: 1,
        estado: 'En Cola',
        operador_asignado: 'Juan (Taller)',
        fecha_creacion: new Date().toISOString(),
        tiempo_impresion_min: 120,
        tiempo_armado_min: 15,
        tiempo_pintura_min: 30,
        resina_nombre: 'Anycubic Standard Grey',
        maquina_nombre: 'Anycubic MONO 4',
        va_pintado: true,
        tiene_empaque: true,
        detalles_tecnicos: `Venta POS Express ${ventaFinal.numero_venta}${ventaFinal.notas ? ` | Notas: ${ventaFinal.notas}` : ''}${ventaFinal.notas_diseno ? ` | Req. Diseño: ${ventaFinal.notas_diseno}` : ''}`,
        imagen_url: ventaFinal.foto_url || undefined,
        precio_cobrado: ventaFinal.total,
        es_proyecto_rapido: true,
        stl_estado: ventaFinal.estado_diseno === 'requiere_nuevo' ? 'Modelado Pendiente' : 'Diseñado por Germán',
        stl_modelador: 'Germán',
        stl_operador: 'Juan',
        stl_url: ventaFinal.enlace_diseno || undefined,
        stl_notas: ventaFinal.notas_diseno || undefined,
        estado_pago: (ventaFinal.estado_pago as EstadoPago) || 'Pendiente',
        abono: ventaFinal.abono,
        saldo_pendiente: ventaFinal.saldo_pendiente,
        metodo_pago: ventaFinal.metodo_pago
      };

      const updatedOTs = [nuevaOT, ...ordenes];
      setOrdenes(updatedOTs);
      StorageService.saveOrdenes(updatedOTs);
      CloudSyncService.saveOrdenTrabajo(nuevaOT);
    } else if (ventaFinal.ot_id || ventaFinal.ot_numero) {
      // Sincronizar la OT asociada con los datos actualizados de pago y diseño
      let otModificada: OrdenTrabajo | null = null;
      const updatedOTs = ordenes.map(o => {
        if (
          (ventaFinal.ot_id && o.id === ventaFinal.ot_id) ||
          (ventaFinal.ot_numero && o.numero_ot === ventaFinal.ot_numero) ||
          (o.pos_venta_id && o.pos_venta_id === ventaFinal.id) ||
          (o.cotizacion_numero && o.cotizacion_numero === ventaFinal.numero_venta)
        ) {
          const modif: OrdenTrabajo = {
            ...o,
            cliente_nombre: ventaFinal.cliente_nombre,
            cliente_telefono: ventaFinal.cliente_telefono,
            item_nombre: ventaFinal.nombre_producto,
            precio_cobrado: ventaFinal.total,
            estado_pago: (ventaFinal.estado_pago as EstadoPago) || o.estado_pago,
            abono: ventaFinal.abono,
            saldo_pendiente: ventaFinal.saldo_pendiente,
            metodo_pago: ventaFinal.metodo_pago || o.metodo_pago,
            imagen_url: ventaFinal.foto_url || o.imagen_url,
            stl_estado: ventaFinal.estado_diseno === 'requiere_nuevo' ? 'Modelado Pendiente' : 'Diseñado por Germán',
            stl_url: ventaFinal.enlace_diseno || o.stl_url,
            stl_notas: ventaFinal.notas_diseno || o.stl_notas
          };
          otModificada = modif;
          return modif;
        }
        return o;
      });

      if (otModificada) {
        setOrdenes(updatedOTs);
        StorageService.saveOrdenes(updatedOTs);
        CloudSyncService.saveOrdenTrabajo(otModificada);
      }
    }

    const updated = ventasExpress.map(v => v.id === ventaFinal.id ? ventaFinal : v);
    setVentasExpress(updated);
    StorageService.saveVentasExpress(updated);

    // Asentar en Ledger Central si hubo un incremento real en el abono (delta > 0)
    const prevVenta = ventasExpress.find(v => v.id === ventaFinal.id);
    const deltaAbonoVenta = Math.max(0, (ventaFinal.abono || 0) - (prevVenta?.abono || 0));
    if (deltaAbonoVenta > 0) {
      CloudSyncService.savePayment({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monto: deltaAbonoVenta,
        metodo_pago: ventaFinal.metodo_pago || 'Bre-B',
        pos_venta_id: ventaFinal.id,
        origen_modulo: 'pos',
        nota: `Abono de $${deltaAbonoVenta.toLocaleString('es-CO')} registrado en POS Express ${ventaFinal.numero_venta}`
      });
    }

    CloudSyncService.saveVentaExpress(ventaFinal).then(res => {
      if (res && !res.success && res.error) {
        toast.warning(`Cambios guardados localmente. Sincronización pendiente: ${res.error}`);
      } else {
        toast.success(`Venta ${ventaFinal.numero_venta} actualizada.`);
      }
    });
  };

  const handleEliminarVentaExpress = (ventaId: string) => {
    // Si la venta descontó stock físico, reponerlo al inventario
    const ventaAEliminar = ventasExpress.find(v => v.id === ventaId);
    if (ventaAEliminar?.descontar_stock && ventaAEliminar.producto_stock_id) {
      const cantDevuelta = ventaAEliminar.cantidad_vendida || 1;
      const updatedStock = productosStock.map(p => {
        if (p.id === ventaAEliminar.producto_stock_id) {
          return { ...p, stock_actual: (p.stock_actual || 0) + cantDevuelta, fecha_actualizacion: new Date().toISOString() };
        }
        return p;
      });
      setProductosStock(updatedStock);
      StorageService.saveProductosStock(updatedStock);
      const prodAfectado = updatedStock.find(p => p.id === ventaAEliminar.producto_stock_id);
      if (prodAfectado) {
        CloudSyncService.saveProductoStock(prodAfectado);
      }
    }

    const updated = ventasExpress.filter(v => v.id !== ventaId);
    setVentasExpress(updated);
    StorageService.saveVentasExpress(updated);

    CloudSyncService.deleteVentaExpress(ventaId).then(res => {
      if (res && !res.success && res.error) {
        toast.warning(`Venta eliminada localmente. Pendiente en nube: ${res.error}`);
      } else {
        toast.success('Venta eliminada e inventario repuesto.');
      }
    });
  };

  const handleEliminarCuentaCobro = (cuentaId: string) => {
    const cuentaAEliminar = cuentas.find(c => c.id === cuentaId);
    const updated = cuentas.filter(c => c.id !== cuentaId);
    setCuentas(updated);
    StorageService.saveCuentas(updated);
    CloudSyncService.deleteCuentaCobro(cuentaId, cuentaAEliminar?.numero_cc);
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

  // Handler para Crear Orden Rápida desde Tarifario Express (vinculación bidireccional inmediata sin duplicación)
  const handleCrearOrdenRapida = (nuevaOT: OrdenTrabajo, crearCobroPOS?: boolean) => {
    let otFinal: OrdenTrabajo = { ...nuevaOT };
    let nuevaVenta: VentaExpress | null = null;

    if (crearCobroPOS) {
      const precioEstimado = otFinal.altura_cm_tarifario ? (otFinal.altura_cm_tarifario * 10000) : (otFinal.precio_cobrado || 80000);
      const ventaId = `pos-${Date.now()}`;
      const numVenta = `POS-${(ventasExpress.length + 1).toString().padStart(3, '0')}`;

      nuevaVenta = {
        id: ventaId,
        numero_venta: numVenta,
        ot_id: otFinal.id,
        ot_numero: otFinal.numero_ot,
        nombre_producto: otFinal.item_nombre,
        cliente_nombre: otFinal.cliente_nombre,
        cliente_telefono: otFinal.cliente_telefono,
        total: precioEstimado,
        abono: otFinal.abono || 0,
        saldo_pendiente: Math.max(0, precioEstimado - (otFinal.abono || 0)),
        estado_pago: otFinal.estado_pago || 'Pendiente',
        fecha_venta: new Date().toISOString().slice(0, 10),
        foto_url: otFinal.imagen_url || '',
        notas: `Proyecto Rápido ${otFinal.numero_ot}`
      };

      otFinal.pos_venta_id = ventaId;
      otFinal.cotizacion_id = ventaId;
      otFinal.cotizacion_numero = numVenta;
    }

    const updatedOTs = [otFinal, ...ordenes];
    setOrdenes(updatedOTs);
    StorageService.saveOrdenes(updatedOTs);
    CloudSyncService.saveOrdenTrabajo(otFinal);

    if (nuevaVenta) {
      const updatedVentas = [nuevaVenta, ...ventasExpress];
      setVentasExpress(updatedVentas);
      StorageService.saveVentasExpress(updatedVentas);
      CloudSyncService.saveVentaExpress(nuevaVenta);
    }
  };

  // Handler Central Unificado de Pagos desde Cobranzas (Ledger Único Inmutable en abonos_pagos)
  const handleRegistrarPagoConsolidado = (
    item: ItemDeudaConsolidado,
    datos: DatosPagoRegistro
  ) => {
    const deltaAbono = Math.max(0, datos.abono - (item.abono || 0));

    // 1. Asentar en Ledger Inmutable Core V3 (abonos_pagos) EXACTAMENTE UNA VEZ si hubo incremento real
    if (deltaAbono > 0) {
      CloudSyncService.savePayment({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monto: deltaAbono,
        metodo_pago: datos.metodo_pago || 'Bre-B',
        comprobante_url: datos.comprobante_pago,
        cotizacion_id: item.rawOT?.cotizacion_id || item.rawCuenta?.cotizacion_id || (item.rawVenta ? item.rawVenta.id : undefined),
        cuenta_cobro_id: item.rawCuenta?.id,
        orden_trabajo_id: item.rawOT?.id,
        pos_venta_id: item.rawVenta?.id,
        origen_modulo: 'cuenta_cobro',
        nota: `Abono de $${deltaAbono.toLocaleString('es-CO')} recibido en Cobranzas para ${item.codigo} (${datos.metodo_pago})`
      });
    }

    // 2. Sincronizar en la Orden de Trabajo de taller (si existe o coincide)
    if (item.rawOT) {
      const isTotalmentePagado = datos.saldo_pendiente <= 0;
      const nuevoEstado = (isTotalmentePagado && (item.rawOT.estado === 'Control de Calidad' || item.rawOT.estado === 'Pintura y Armado' || item.rawOT.estado === 'Listo para Entrega'))
        ? 'Listo para Entrega'
        : item.rawOT.estado;

      const updatedOT: OrdenTrabajo = {
        ...item.rawOT,
        estado_pago: datos.estado_pago,
        abono: datos.abono,
        saldo_pendiente: datos.saldo_pendiente,
        metodo_pago: datos.metodo_pago,
        comprobante_pago: datos.comprobante_pago,
        estado: nuevoEstado
      };
      const updatedOTs = ordenes.map(o => o.id === updatedOT.id ? updatedOT : o);
      setOrdenes(updatedOTs);
      StorageService.saveOrdenes(updatedOTs);
      CloudSyncService.saveOrdenTrabajo(updatedOT);
    }

    // 3. Sincronizar en la Cuenta de Cobro formal (si existe o coincide)
    if (item.rawCuenta) {
      const updatedCC: CuentaCobro = {
        ...item.rawCuenta,
        estado_pago: datos.estado_pago,
        abono: datos.abono,
        saldo_pendiente: datos.saldo_pendiente,
        metodo_pago: datos.metodo_pago,
        comprobante_url: datos.comprobante_pago
      };
      const updatedCCs = cuentas.map(c => c.id === updatedCC.id ? updatedCC : c);
      setCuentas(updatedCCs);
      StorageService.saveCuentas(updatedCCs);
      CloudSyncService.saveCuentaCobro(updatedCC);
    }

    // 4. Sincronizar en la Venta Express de POS (si existe o coincide)
    if (item.rawVenta) {
      const updatedVenta: VentaExpress = {
        ...item.rawVenta,
        estado_pago: datos.estado_pago as any,
        abono: datos.abono,
        saldo_pendiente: datos.saldo_pendiente,
        metodo_pago: datos.metodo_pago
      };
      const updatedVentas = ventasExpress.map(v => v.id === updatedVenta.id ? updatedVenta : v);
      setVentasExpress(updatedVentas);
      StorageService.saveVentasExpress(updatedVentas);
      CloudSyncService.saveVentaExpress(updatedVenta);
    }

    // 5. Sincronizar en Cotización vinculada si existe
    const cotId = item.rawOT?.cotizacion_id || item.rawCuenta?.cotizacion_id;
    const cotNum = item.rawOT?.cotizacion_numero || item.rawCuenta?.cotizacion_numero;
    if (cotId || cotNum) {
      const updatedCots = cotizaciones.map(c => {
        if ((cotId && c.id === cotId) || (cotNum && c.numero_cot === cotNum)) {
          return {
            ...c,
            abono: datos.abono,
            saldo_pendiente: datos.saldo_pendiente,
            estado_pago: datos.estado_pago,
            metodo_pago: datos.metodo_pago,
            comprobante_pago: datos.comprobante_pago
          };
        }
        return c;
      });
      setCotizaciones(updatedCots);
      StorageService.saveCotizaciones(updatedCots);
      const cotAfectada = updatedCots.find(c => (cotId && c.id === cotId) || (cotNum && c.numero_cot === cotNum));
      if (cotAfectada) CloudSyncService.saveCotizacion(cotAfectada);
    }

    toast.success(`Pago de $${deltaAbono > 0 ? deltaAbono.toLocaleString('es-CO') : datos.abono.toLocaleString('es-CO')} COP registrado correctamente.`);
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

    // 4. Sincronizar en la Venta Express de POS vinculada (si la OT proviene de POS)
    if (otActualizada.pos_venta_id || otActualizada.numero_ot) {
      const ventaMatch = ventasExpress.find(v => 
        (otActualizada.pos_venta_id && v.id === otActualizada.pos_venta_id) ||
        (v.ot_id && v.ot_id === otActualizada.id) ||
        (v.ot_numero && v.ot_numero === otActualizada.numero_ot)
      );

      if (ventaMatch && otActualizada.estado_pago) {
        const updatedVentas = ventasExpress.map(v => {
          if (v.id === ventaMatch.id) {
            return {
              ...v,
              abono: otActualizada.abono !== undefined ? otActualizada.abono : v.abono,
              saldo_pendiente: otActualizada.saldo_pendiente !== undefined ? otActualizada.saldo_pendiente : v.saldo_pendiente,
              estado_pago: (otActualizada.estado_pago as any) || v.estado_pago,
              metodo_pago: otActualizada.metodo_pago || v.metodo_pago
            };
          }
          return v;
        });
        setVentasExpress(updatedVentas);
        StorageService.saveVentasExpress(updatedVentas);
        const vActualizada = updatedVentas.find(v => v.id === ventaMatch.id);
        if (vActualizada) CloudSyncService.saveVentaExpress(vActualizada);
      }
    }

    // 5. Asentar en Ledger Central (abonos_pagos) SOLO si hubo un incremento real en el abono (delta > 0)
    const prevOT = ordenes.find(o => o.id === otActualizada.id);
    const deltaAbonoOT = Math.max(0, (otActualizada.abono || 0) - (prevOT?.abono || 0));
    if (deltaAbonoOT > 0) {
      CloudSyncService.savePayment({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monto: deltaAbonoOT,
        metodo_pago: otActualizada.metodo_pago || 'Bre-B',
        comprobante_url: otActualizada.comprobante_pago,
        cotizacion_id: otActualizada.cotizacion_id,
        orden_trabajo_id: otActualizada.id,
        pos_venta_id: otActualizada.pos_venta_id,
        origen_modulo: 'taller',
        nota: `Abono de $${deltaAbonoOT.toLocaleString('es-CO')} registrado desde Taller OT ${otActualizada.numero_ot}`
      });
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
          />
        </main>
      </div>
    );
  }

  // Guardián Global de Autenticación (Auth Guard): Bloqueo estricto de rutas para usuarios anónimos
  if (!isStaffAuthenticated) {
    return (
      <StaffAuthGuard 
        onLoginSuccess={handleStaffLoginSuccess}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Header Minimalista Mobile-First */}
      <HeaderMinimal 
        cloudStatus={cloudSyncStatus}
        activeOperator={activeOperator}
        onOpenDailyBriefing={() => setShowDailyBriefingModal(true)}
        onOpenChangePin={() => setShowChangePinModal(true)}
        onLogout={handleStaffLogout}
        dailyAlertsCount={pendingOTs}
      />

      {/* Subpestañas contextuales al Hub activo */}
      <HubNavigationController 
        activeHub={activeHub}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Contenido Principal según Pestaña con Suspense y Lazy Loading */}
      <main className="main-content">
        {!canAccessTab(activeTab) ? (
          <AccessDeniedView 
            requiredArea={activeHub}
            operatorName={activeOperator}
            onGoBack={() => {
              setActiveHub('taller');
              setActiveTab('workflow');
            }}
          />
        ) : (
        <ErrorBoundary fallbackTitle="Error al cargar la sección activa">
          <React.Suspense fallback={<TabLoadingSkeleton />}>
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
            ordenes={ordenes}
            productosStock={productosStock}
            onGuardarVenta={handleGuardarVentaExpress}
            onActualizarVenta={handleActualizarVentaExpress}
            onEliminarVenta={handleEliminarVentaExpress}
            onCrearCliente={handleAddCliente}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'cuentas' && (
          <CuentasCobroList 
            cuentas={cuentas}
            ventasExpress={ventasExpress}
            ordenes={ordenes}
            clientes={clientes}
            config={config}
            onUpdatePago={handleUpdatePago}
            onUpdateVentaExpress={handleActualizarVentaExpress}
            onEliminarVentaExpress={handleEliminarVentaExpress}
            onEliminarCuentaCobro={handleEliminarCuentaCobro}
            onActualizarOT={handleActualizarOT}
            onCrearCuentaCobro={handleCrearCuentaCobro}
            onRegistrarPagoConsolidado={handleRegistrarPagoConsolidado}
            onNavigateTab={setActiveTab}
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
            onUpdateResinas={r => { 
              setResinas(r); 
              StorageService.saveResinas(r); 
              r.forEach(res => CloudSyncService.saveResina(res));
            }}
            onUpdateInsumos={i => { 
              setInsumos(i); 
              StorageService.saveInsumos(i); 
              i.forEach(ins => CloudSyncService.saveInsumo(ins));
            }}
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
            onRefreshStock={async () => {
              const freshStock = await CloudSyncService.fetchProductosStock();
              if (freshStock !== null) {
                setProductosStock(freshStock);
                StorageService.saveProductosStock(freshStock);
              }
              return freshStock;
            }}
          />
        )}

        {activeTab === 'finanzas' && (
          <FinancialReportView 
            cotizaciones={cotizaciones}
            ordenes={ordenes}
            cuentas={cuentas}
            resinas={resinas}
            ventasExpress={ventasExpress}
            whatsappStatus={whatsappHealthStatus}
            onOpenDailyBriefing={() => setShowDailyBriefingModal(true)}
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
            activeOperator={activeOperator}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'marketing' && (
          <MarketingHubView 
            productosStock={productosStock}
            tarifasTamanos={tarifasTamanos}
            config={config}
            onUpdateProductoStock={(prod) => {
              const updated = productosStock.map(p => p.id === prod.id ? prod : p);
              handleUpdateProductosStock(updated);
            }}
          />
        )}

        {activeTab === 'herramientas' && (
          <ToolsHubView />
        )}

        {activeTab === 'calendario' && (
          <CalendarOperationalView 
            ordenes={ordenes}
            cuentas={cuentas}
            cotizaciones={cotizaciones}
            tareas={tareas}
            solicitudesInsumos={solicitudesInsumos}
            config={config}
            onActualizarOT={handleActualizarOT}
            onActualizarCuenta={handleUpdatePago ? (cuenta) => handleUpdatePago(cuenta.id, cuenta.abono) : undefined}
            onActualizarTarea={handleActualizarTarea}
            onNavigateTab={setActiveTab}
          />
        )}

        {(activeTab === 'usuarios' || (activeTab as string) === 'personal') && (
          <UsuariosManagerView />
        )}
          </React.Suspense>
        </ErrorBoundary>
        )}
      </main>

      {/* Barra de Navegación Inferior Fija de 4 Hubs con Filtrado RBAC */}
      <BottomNavBar 
        activeHub={activeHub}
        allowedHubs={permisos}
        onSelectHub={(hub) => {
          if (!canAccessHub(hub)) {
            toast.warning(`Acceso restringido: ${activeOperator} no tiene privilegios para el área de ${hub.toUpperCase()}`);
            return;
          }
          setActiveHub(hub);
          const defaultTabs: Record<HubType, TabType> = {
            ventas: 'cotizador',
            taller: 'workflow',
            finanzas: 'cuentas',
            gestion: 'tareas',
          };
          setActiveTab(defaultTabs[hub]);
        }}
        pendingQuotesCount={cotizaciones.filter(c => c.estado === 'Borrador' || c.estado === 'Enviada').length}
        activeOTsCount={pendingOTs}
        pendingDebtsCount={cuentas.filter(c => c.saldo_pendiente > 0).length}
      />

      {/* Modal de Respaldos y Google Drive */}
      <React.Suspense fallback={null}>
        <BackupDriveModal 
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          cloudStatus={cloudSyncStatus}
        />
      </React.Suspense>

      {/* Modal de Autenticación de Personal Staff */}
      <StaffLoginModal 
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onLoginSuccess={handleStaffLoginSuccess}
        onLogout={handleStaffLogout}
        isAuthenticated={isStaffAuthenticated}
        currentUser={staffUser}
      />

      {/* Modal de Daily Briefing y Monitor de WhatsApp */}
      <React.Suspense fallback={null}>
        <DailyBriefingModal 
          isOpen={showDailyBriefingModal}
          onClose={() => setShowDailyBriefingModal(false)}
          onSuccessDispatch={() => {
            toast.success('Daily Briefing despachado por WhatsApp a Germán y Wendy');
          }}
        />
      </React.Suspense>
      {/* Modal de Cambio de PIN de Operador */}
      <CambiarPinModal 
        isOpen={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        mode="internal"
        usuarioId={currentUser.id}
        usuarioNombre={currentUser.nombre}
        onCambiarPinInterno={cambiarPin}
        onRecuperarPin={recuperarPin}
      />
    </div>
  );
};
