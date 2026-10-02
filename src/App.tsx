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
  TarifaTamano,
  ProductoStock
} from './types';
import { StorageService } from './services/storageService';
import { CloudSyncService } from './services/cloudSyncService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabType;
      const validTabs: TabType[] = [
        'cotizador', 'workflow', 'cotizaciones', 'cuentas', 'catalogos', 
        'plan', 'stl', 'stock', 'seguimiento', 'finanzas'
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

    if (!CloudSyncService.isAvailable()) {
      setCloudSyncStatus('offline');
      return;
    }

    setCloudSyncStatus('syncing');

    // 2. Traer datos frescos de Supabase en segundo plano y fusionar
    const syncCloudData = async () => {
      try {
        const [cloudCots, cloudClis, cloudOTs] = await Promise.all([
          CloudSyncService.fetchCotizaciones(),
          CloudSyncService.fetchClientes(),
          CloudSyncService.fetchOrdenes()
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
            cloudOTs.forEach(o => map.set(o.numero_ot, o));
            const merged = Array.from(map.values());
            StorageService.saveOrdenes(merged);
            return merged;
          });
        }

        setCloudSyncStatus('connected');
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
          setOrdenes(freshOTs);
          StorageService.saveOrdenes(freshOTs);
        }
      },
      async () => {
        const freshCCs = await CloudSyncService.fetchCuentas();
        if (freshCCs && freshCCs.length > 0) {
          setCuentas(freshCCs);
          StorageService.saveCuentas(freshCCs);
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
  };

  // Aprobar Cotización -> Dispara automáticamente Órdenes de Trabajo (OT)
  const handleAprobarCotizacion = (cot: Cotizacion) => {
    // 1. Actualizar estado de la cotización
    const updatedCots = cotizaciones.map(c => 
      c.id === cot.id ? { ...c, estado: 'Aceptada' as EstadoCotizacion } : c
    );
    setCotizaciones(updatedCots);
    StorageService.saveCotizaciones(updatedCots);

    // 2. Generar correlativo de OTs para cada pieza (como en codigo2.txt)
    let ultimoNum = ordenes.length;
    const nuevasOTs: OrdenTrabajo[] = cot.items.map((item) => {
      ultimoNum++;
      const numOT = `OT-${ultimoNum.toString().padStart(4, '0')}`;

      return {
        id: `ot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        numero_ot: numOT,
        cotizacion_id: cot.id,
        cotizacion_numero: cot.numero_cot,
        cliente_nombre: cot.cliente.nombre,
        cliente_telefono: cot.cliente.telefono,
        item_nombre: item.nombre_item,
        cantidad: item.cantidad,
        estado: 'En Cola',
        operador_asignado: 'Operador 3D',
        fecha_creacion: new Date().toISOString(),
        tiempo_impresion_min: item.tiempo_impresion_min,
        tiempo_armado_min: item.tiempo_armado_min,
        tiempo_pintura_min: item.tiempo_pintura_min,
        peso_estimado_g: item.peso_estimado_g,
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
    });

    const updatedOTs = [...nuevasOTs, ...ordenes];
    setOrdenes(updatedOTs);
    StorageService.saveOrdenes(updatedOTs);

    // Sincronizar cotización aceptada y OTs generadas en Supabase
    const cotAceptada = updatedCots.find(c => c.id === cot.id);
    if (cotAceptada) CloudSyncService.saveCotizacion(cotAceptada);
    nuevasOTs.forEach(ot => CloudSyncService.saveOrdenTrabajo(ot));

    // Redirigir a vista de taller
    setActiveTab('workflow');
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

  const pendingOTs = ordenes.filter(o => o.estado !== 'Listo para Entrega').length;

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
            onUpdateEstado={handleUpdateEstadoOT}
            onGenerarCuentaCobro={handleGenerarCuentaCobro}
          />
        )}

        {activeTab === 'cotizaciones' && (
          <CotizacionesList 
            cotizaciones={cotizaciones}
            config={config}
            onUpdateEstado={(id, st) => {
              const u = cotizaciones.map(c => c.id === id ? { ...c, estado: st } : c);
              setCotizaciones(u);
              StorageService.saveCotizaciones(u);
            }}
            onEditarCotizacion={handleEditarCotizacion}
            onAprobarCotizacion={handleAprobarCotizacion}
            onNuevaCotizacion={handleNuevaCotizacion}
          />
        )}

        {activeTab === 'cuentas' && (
          <CuentasCobroList 
            cuentas={cuentas}
            config={config}
            onUpdatePago={handleUpdatePago}
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
      </main>

      {/* Barra de Navegación Inferior Mobile-First */}
      <BottomNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOTsCount={pendingOTs}
        draftItemsCount={draftPieces.length}
      />
    </div>
  );
};
