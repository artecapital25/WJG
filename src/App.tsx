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
  EstadoCotizacion 
} from './types';
import { StorageService } from './services/storageService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('cotizador');
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
  const [resinas, setResinas] = useState<Resina[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [config, setConfig] = useState<ConfiguracionTaller>(StorageService.getConfig());

  // Estado Transaccional
  const [draftPieces, setDraftPieces] = useState<PiezaCotizada[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [cuentas, setCuentas] = useState<CuentaCobro[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    setResinas(StorageService.getResinas());
    setInsumos(StorageService.getInsumos());
    setMaquinas(StorageService.getMaquinas());
    setPersonal(StorageService.getPersonal());
    setClientes(StorageService.getClientes());
    setProveedores(StorageService.getProveedores());
    setConfig(StorageService.getConfig());
    setCotizaciones(StorageService.getCotizaciones());
    setOrdenes(StorageService.getOrdenes());
    setCuentas(StorageService.getCuentas());
  }, []);

  // Handlers para Piezas en Borrador
  const handleAgregarPieza = (pieza: PiezaCotizada) => {
    setDraftPieces(prev => [...prev, pieza]);
  };

  const handleRemoveDraftPiece = (id: string) => {
    setDraftPieces(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateDraftPieceImage = (id: string, imagenUrl: string) => {
    setDraftPieces(prev => prev.map(p => p.id === id ? { ...p, imagen_url: imagenUrl } : p));
  };

  // Guardar Cotización
  const handleSaveCotizacion = (cotizacion: Cotizacion) => {
    const updated = [cotizacion, ...cotizaciones];
    setCotizaciones(updated);
    StorageService.saveCotizaciones(updated);
    setDraftPieces([]); // Limpiar borrador
    setActiveTab('cotizaciones');
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
        resina_nombre: item.resina_nombre,
        maquina_nombre: item.maquina_nombre,
        detalles_tecnicos: item.descripcion_tecnica,
        imagen_url: item.imagen_url
      };
    });

    const updatedOTs = [...nuevasOTs, ...ordenes];
    setOrdenes(updatedOTs);
    StorageService.saveOrdenes(updatedOTs);

    // Redirigir a vista de taller
    setActiveTab('workflow');
  };

  // Actualizar Estado de OT
  const handleUpdateEstadoOT = (otId: string, nuevoEstado: EstadoOT) => {
    const updated = ordenes.map(o => o.id === otId ? { ...o, estado: nuevoEstado } : o);
    setOrdenes(updated);
    StorageService.saveOrdenes(updated);
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
  };

  const pendingOTs = ordenes.filter(o => o.estado !== 'Listo para Entrega').length;

  return (
    <div className="app-container">
      {/* Barra de Navegación Superior */}
      <Navbar 
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewQuoteClick={() => setActiveTab('cotizador')} 
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
              onAgregarPieza={handleAgregarPieza}
              onOpenSTLViewer={() => setActiveTab('stl')}
              initialPieceData={stlAppliedData}
            />

            <CotizacionBuilder 
              items={draftPieces}
              clientes={clientes}
              config={config}
              cotizaciones={cotizaciones}
              onRemoveItem={handleRemoveDraftPiece}
              onUpdatePieceImage={handleUpdateDraftPieceImage}
              onSaveCotizacion={handleSaveCotizacion}
              onAddCliente={handleAddCliente}
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
            onAprobarCotizacion={handleAprobarCotizacion}
            onNuevaCotizacion={() => setActiveTab('cotizador')}
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
            onUpdateResinas={r => { setResinas(r); StorageService.saveResinas(r); }}
            onUpdateInsumos={i => { setInsumos(i); StorageService.saveInsumos(i); }}
            onUpdateMaquinas={m => { setMaquinas(m); StorageService.saveMaquinas(m); }}
            onUpdatePersonal={p => { setPersonal(p); StorageService.savePersonal(p); }}
            onUpdateClientes={c => { setClientes(c); StorageService.saveClientes(c); }}
            onUpdateProveedores={pr => { setProveedores(pr); StorageService.saveProveedores(pr); }}
            onUpdateConfig={cfg => { setConfig(cfg); StorageService.saveConfig(cfg); }}
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
