import React, { useState } from 'react';
import { 
  Settings, 
  Layers, 
  Wrench, 
  Package, 
  Users, 
  Briefcase, 
  CreditCard, 
  Save, 
  Plus, 
  Trash2, 
  Edit3,
  ExternalLink,
  Phone,
  Database,
  Truck,
  Check,
  X,
  Cloud,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { 
  Resina, 
  Insumo, 
  Maquina, 
  Personal, 
  Cliente, 
  Proveedor,
  ConfiguracionTaller,
  TarifaTamano 
} from '../../types';
import { StorageService } from '../../services/storageService';
import { CloudSyncService } from '../../services/cloudSyncService';

interface CatalogosManagerProps {
  resinas: Resina[];
  insumos: Insumo[];
  maquinas: Maquina[];
  personal: Personal[];
  clientes: Cliente[];
  proveedores: Proveedor[];
  config: ConfiguracionTaller;
  tarifasTamanos?: TarifaTamano[];
  onUpdateResinas: (r: Resina[]) => void;
  onUpdateInsumos: (i: Insumo[]) => void;
  onUpdateMaquinas: (m: Maquina[]) => void;
  onUpdatePersonal: (p: Personal[]) => void;
  onUpdateClientes: (c: Cliente[]) => void;
  onUpdateProveedores: (pr: Proveedor[]) => void;
  onUpdateConfig: (cfg: ConfiguracionTaller) => void;
  onUpdateTarifasTamanos?: (t: TarifaTamano[]) => void;
}

type SubTab = 'resinas' | 'insumos' | 'maquinaria' | 'personal' | 'clientes' | 'proveedores' | 'configuracion' | 'tarifas';

export const CatalogosManager: React.FC<CatalogosManagerProps> = ({
  resinas,
  insumos,
  maquinas,
  personal,
  clientes,
  proveedores,
  config,
  tarifasTamanos = [],
  onUpdateResinas,
  onUpdateInsumos,
  onUpdateMaquinas,
  onUpdatePersonal,
  onUpdateClientes,
  onUpdateProveedores,
  onUpdateConfig,
  onUpdateTarifasTamanos
}) => {
  const [subTab, setSubTab] = useState<SubTab>('resinas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales de Edición / Creación
  const [modalType, setModalType] = useState<string | null>(null);
  const [itemEnEdicion, setItemEnEdicion] = useState<any>(null);

  // Estados de Configuración
  const [tarifaKwh, setTarifaKwh] = useState(config.tarifa_kwh);
  const [margenMerma, setMargenMerma] = useState(config.margen_merma_resina);
  const [nequi, setNequi] = useState(config.nequi);
  const [daviplata, setDaviplata] = useState(config.daviplata);
  const [bancolombia, setBancolombia] = useState(config.bancolombia);
  const [instagram, setInstagram] = useState(config.instagram);

  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  const handleTestCloud = async () => {
    setIsCloudLoading(true);
    const res = await CloudSyncService.checkConnection();
    setCloudStatus(res.message);
    setIsCloudLoading(false);
  };

  const handleSeedCloud = async () => {
    if (!confirm('¿Deseas subir todos los datos maestros del Excel (resinas, insumos, clientes, maquinaria) a tu base de datos Supabase en la nube?')) return;
    setIsCloudLoading(true);
    const res = await CloudSyncService.seedInitialData();
    setCloudStatus(res.message);
    setIsCloudLoading(false);
  };

  // -----------------------------------------------------------------
  // HANDLERS RESINAS
  // -----------------------------------------------------------------
  const handleOpenModalResina = (res?: Resina) => {
    if (res) {
      setItemEnEdicion({ ...res, isEdit: true });
    } else {
      setItemEnEdicion({
        id: `res-${Date.now()}`,
        tipo: 'Resina Standar',
        marca: 'Anycubic',
        color: 'Negro',
        volumen_l: 1.0,
        densidad_g_cm3: 1.13,
        peso_g: 1130,
        precio_compra: 89000,
        velocidad_impresion_mm_h: 20.0,
        isEdit: false
      });
    }
    setModalType('resina');
  };

  const handleSaveResina = (e: React.FormEvent) => {
    e.preventDefault();
    const peso = itemEnEdicion.peso_g || (itemEnEdicion.densidad_g_cm3 * (itemEnEdicion.volumen_l * 1000));
    const costo_gramo = peso > 0 ? (itemEnEdicion.precio_compra / peso) : 0;
    const resumen = `${itemEnEdicion.tipo} Color ${itemEnEdicion.color}`;

    const resinaGuardada: Resina = {
      id: itemEnEdicion.id,
      tipo: itemEnEdicion.tipo,
      marca: itemEnEdicion.marca,
      color: itemEnEdicion.color,
      volumen_l: Number(itemEnEdicion.volumen_l),
      densidad_g_cm3: Number(itemEnEdicion.densidad_g_cm3),
      peso_g: Number(peso),
      precio_compra: Number(itemEnEdicion.precio_compra),
      costo_gramo: Number(costo_gramo.toFixed(4)),
      velocidad_impresion_mm_h: Number(itemEnEdicion.velocidad_impresion_mm_h),
      resumen
    };

    let updated: Resina[];
    if (itemEnEdicion.isEdit) {
      updated = resinas.map(r => r.id === resinaGuardada.id ? resinaGuardada : r);
    } else {
      updated = [resinaGuardada, ...resinas];
    }

    onUpdateResinas(updated);
    setModalType(null);
    setItemEnEdicion(null);
  };

  const handleDeleteResina = (id: string) => {
    if (confirm('¿Eliminar esta resina del catálogo?')) {
      const updated = resinas.filter(r => r.id !== id);
      onUpdateResinas(updated);
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS INSUMOS
  // -----------------------------------------------------------------
  const handleOpenModalInsumo = (ins?: Insumo) => {
    if (ins) {
      setItemEnEdicion({ ...ins, isEdit: true });
    } else {
      setItemEnEdicion({
        id: `ins-${Date.now()}`,
        codigo: insumos.length + 1,
        nombre: '',
        marca: 'Genérico',
        categoria: 'Pintura',
        presentacion: 60,
        costo_total: 6000,
        enlace_compra: '',
        isEdit: false
      });
    }
    setModalType('insumo');
  };

  const handleSaveInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const costo_unitario = itemEnEdicion.presentacion > 0 
      ? (itemEnEdicion.costo_total / itemEnEdicion.presentacion) 
      : 0;

    const insumoGuardado: Insumo = {
      id: itemEnEdicion.id,
      codigo: itemEnEdicion.codigo || insumos.length + 1,
      nombre: itemEnEdicion.nombre,
      marca: itemEnEdicion.marca,
      categoria: itemEnEdicion.categoria,
      presentacion: Number(itemEnEdicion.presentacion),
      costo_total: Number(itemEnEdicion.costo_total),
      costo_unitario: Number(costo_unitario.toFixed(2)),
      enlace_compra: itemEnEdicion.enlace_compra
    };

    let updated: Insumo[];
    if (itemEnEdicion.isEdit) {
      updated = insumos.map(i => i.id === insumoGuardado.id ? insumoGuardado : i);
    } else {
      updated = [insumoGuardado, ...insumos];
    }

    onUpdateInsumos(updated);
    setModalType(null);
    setItemEnEdicion(null);
  };

  const handleDeleteInsumo = (id: string) => {
    if (confirm('¿Eliminar este insumo del taller?')) {
      const updated = insumos.filter(i => i.id !== id);
      onUpdateInsumos(updated);
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS MAQUINARIA
  // -----------------------------------------------------------------
  const handleOpenModalMaquina = (maq?: Maquina) => {
    if (maq) {
      setItemEnEdicion({ ...maq, isEdit: true });
    } else {
      setItemEnEdicion({
        id: `maq-${Date.now()}`,
        nombre: 'Anycubic Kobra Neo',
        tipo: 'Impresora 3D',
        consumo_kwh: 0.35,
        estado: 'Disponible',
        isEdit: false
      });
    }
    setModalType('maquina');
  };

  const handleSaveMaquina = (e: React.FormEvent) => {
    e.preventDefault();
    const costo_minuto = (Number(itemEnEdicion.consumo_kwh) * config.tarifa_kwh) / 60;

    const maquinaGuardada: Maquina = {
      id: itemEnEdicion.id,
      nombre: itemEnEdicion.nombre,
      tipo: itemEnEdicion.tipo,
      consumo_kwh: Number(itemEnEdicion.consumo_kwh),
      costo_minuto: Number(costo_minuto.toFixed(4)),
      estado: itemEnEdicion.estado || 'Disponible'
    };

    let updated: Maquina[];
    if (itemEnEdicion.isEdit) {
      updated = maquinas.map(m => m.id === maquinaGuardada.id ? maquinaGuardada : m);
    } else {
      updated = [maquinaGuardada, ...maquinas];
    }

    onUpdateMaquinas(updated);
    setModalType(null);
    setItemEnEdicion(null);
  };

  const handleDeleteMaquina = (id: string) => {
    if (confirm('¿Eliminar esta máquina del taller?')) {
      const updated = maquinas.filter(m => m.id !== id);
      onUpdateMaquinas(updated);
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS PERSONAL
  // -----------------------------------------------------------------
  const handleOpenModalPersonal = (per?: Personal) => {
    if (per) {
      setItemEnEdicion({ ...per, isEdit: true });
    } else {
      setItemEnEdicion({
        id: `per-${Date.now()}`,
        rol: '',
        costo_hora: 10000,
        isEdit: false
      });
    }
    setModalType('personal');
  };

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    const costo_minuto = Number(itemEnEdicion.costo_hora) / 60;

    const personalGuardado: Personal = {
      id: itemEnEdicion.id,
      rol: itemEnEdicion.rol,
      costo_hora: Number(itemEnEdicion.costo_hora),
      costo_minuto: Number(costo_minuto.toFixed(2))
    };

    let updated: Personal[];
    if (itemEnEdicion.isEdit) {
      updated = personal.map(p => p.id === personalGuardado.id ? personalGuardado : p);
    } else {
      updated = [...personal, personalGuardado];
    }

    onUpdatePersonal(updated);
    setModalType(null);
    setItemEnEdicion(null);
  };

  const handleDeletePersonal = (id: string) => {
    if (confirm('¿Eliminar este rol de tarifa?')) {
      const updated = personal.filter(p => p.id !== id);
      onUpdatePersonal(updated);
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS CLIENTES
  // -----------------------------------------------------------------
  const handleOpenModalCliente = (cli?: Cliente) => {
    if (cli) {
      setItemEnEdicion({ ...cli, isEdit: true });
    } else {
      setItemEnEdicion({
        id: `cli-${Date.now()}`,
        codigo: clientes.length + 1,
        nombre: '',
        nit_cc: '',
        telefono: '',
        correo: '',
        isEdit: false
      });
    }
    setModalType('cliente');
  };

  const handleSaveCliente = (e: React.FormEvent) => {
    e.preventDefault();
    const clienteGuardado: Cliente = {
      id: itemEnEdicion.id,
      codigo: itemEnEdicion.codigo || clientes.length + 1,
      nombre: itemEnEdicion.nombre,
      nit_cc: itemEnEdicion.nit_cc || '',
      telefono: itemEnEdicion.telefono,
      correo: itemEnEdicion.correo || ''
    };

    let updated: Cliente[];
    if (itemEnEdicion.isEdit) {
      updated = clientes.map(c => c.id === clienteGuardado.id ? clienteGuardado : c);
    } else {
      updated = [clienteGuardado, ...clientes];
    }

    onUpdateClientes(updated);
    setModalType(null);
    setItemEnEdicion(null);
  };

  const handleDeleteCliente = (id: string) => {
    if (confirm('¿Eliminar este cliente?')) {
      const updated = clientes.filter(c => c.id !== id);
      onUpdateClientes(updated);
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS PROVEEDORES
  // -----------------------------------------------------------------
  const handleOpenModalProveedor = (prov?: Proveedor) => {
    if (prov) {
      setItemEnEdicion({ ...prov, isEdit: true });
    } else {
      setItemEnEdicion({
        id: `prov-${Date.now()}`,
        nombre: '',
        contacto: '',
        telefono: '',
        rubro: 'Insumos 3D',
        enlace_web: '',
        isEdit: false
      });
    }
    setModalType('proveedor');
  };

  const handleSaveProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    const provGuardado: Proveedor = {
      id: itemEnEdicion.id,
      nombre: itemEnEdicion.nombre,
      contacto: itemEnEdicion.contacto || '',
      telefono: itemEnEdicion.telefono,
      rubro: itemEnEdicion.rubro,
      enlace_web: itemEnEdicion.enlace_web || ''
    };

    let updated: Proveedor[];
    if (itemEnEdicion.isEdit) {
      updated = proveedores.map(p => p.id === provGuardado.id ? provGuardado : p);
    } else {
      updated = [provGuardado, ...proveedores];
    }

    onUpdateProveedores(updated);
    setModalType(null);
    setItemEnEdicion(null);
  };

  const handleDeleteProveedor = (id: string) => {
    if (confirm('¿Eliminar este proveedor?')) {
      const updated = proveedores.filter(p => p.id !== id);
      onUpdateProveedores(updated);
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS TARIFARIO DE TAMAÑOS
  // -----------------------------------------------------------------
  const handleOpenModalTarifa = (tar?: TarifaTamano) => {
    if (tar) {
      setItemEnEdicion({ ...tar, isEdit: true });
    } else {
      setItemEnEdicion({
        id: `tt-${Date.now()}`,
        altura_cm: 13,
        precio_sugerido: 125000,
        descripcion: 'Estatua coleccionable (13 cm)',
        tiempo_estimado: '(7) Días hábiles',
        isEdit: false
      });
    }
    setModalType('tarifa');
  };

  const handleSaveTarifa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateTarifasTamanos) return;

    const tarifaGuardada: TarifaTamano = {
      id: itemEnEdicion.id,
      altura_cm: Number(itemEnEdicion.altura_cm) || 5,
      precio_sugerido: Number(itemEnEdicion.precio_sugerido) || 0,
      descripcion: itemEnEdicion.descripcion || '',
      tiempo_estimado: itemEnEdicion.tiempo_estimado || '(3) Días hábiles'
    };

    let updated: TarifaTamano[];
    if (itemEnEdicion.isEdit) {
      updated = tarifasTamanos.map(t => t.id === tarifaGuardada.id ? tarifaGuardada : t);
    } else {
      updated = [...tarifasTamanos, tarifaGuardada];
    }

    updated.sort((a, b) => a.altura_cm - b.altura_cm);
    onUpdateTarifasTamanos(updated);
    setModalType(null);
    setItemEnEdicion(null);
  };

  const handleDeleteTarifa = (id: string) => {
    if (confirm('¿Eliminar esta tarifa por tamaño del catálogo?')) {
      if (onUpdateTarifasTamanos) {
        const updated = tarifasTamanos.filter(t => t.id !== id);
        onUpdateTarifasTamanos(updated);
      }
    }
  };

  // -----------------------------------------------------------------
  // GUARDAR CONFIGURACIÓN
  // -----------------------------------------------------------------
  const handleGuardarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ConfiguracionTaller = {
      ...config,
      tarifa_kwh: Number(tarifaKwh),
      margen_merma_resina: Number(margenMerma),
      nequi,
      daviplata,
      bancolombia,
      instagram
    };
    onUpdateConfig(updated);
    alert('Configuración guardada exitosamente.');
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Settings size={22} color="var(--brand-cyan)" />
            Ajustes & Catálogos Editables
          </h2>
          <p className="section-subtitle">Edita, agrega o elimina resinas, insumos, maquinaria, tarifas, clientes y proveedores</p>
        </div>
      </div>

      {/* Navegación Touch */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        <button 
          className={`btn btn-sm ${subTab === 'resinas' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('resinas')}
        >
          <Layers size={14} />
          <span>Resinas ({resinas.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${subTab === 'insumos' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('insumos')}
        >
          <Package size={14} />
          <span>Insumos ({insumos.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${subTab === 'maquinaria' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('maquinaria')}
        >
          <Wrench size={14} />
          <span>Maquinaria ({maquinas.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${subTab === 'personal' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('personal')}
        >
          <Briefcase size={14} />
          <span>Tarifas Personal</span>
        </button>

        <button 
          className={`btn btn-sm ${subTab === 'clientes' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('clientes')}
        >
          <Users size={14} />
          <span>Clientes ({clientes.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${subTab === 'proveedores' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('proveedores')}
        >
          <Truck size={14} />
          <span>Proveedores ({proveedores.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${subTab === 'configuracion' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('configuracion')}
        >
          <CreditCard size={14} />
          <span>Bancos & Taller</span>
        </button>

        <button 
          className={`btn btn-sm ${subTab === 'tarifas' ? 'btn-cyan' : 'btn-secondary'}`}
          onClick={() => setSubTab('tarifas')}
        >
          <Sparkles size={14} />
          <span>Tarifario Tamaños ({tarifasTamanos.length})</span>
        </button>
      </div>

      {/* VISTA 1: RESINAS */}
      {subTab === 'resinas' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Catálogo de Resinas 3D</h3>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalResina()}>
              <Plus size={14} />
              <span>Agregar Resina</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {resinas.map(res => (
              <div key={res.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                    {res.tipo} - {res.color}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '4px 8px', minHeight: 'auto' }} 
                      onClick={() => handleOpenModalResina(res)}
                      title="Editar resina"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ padding: '4px 8px', minHeight: 'auto' }} 
                      onClick={() => handleDeleteResina(res.id)}
                      title="Eliminar resina"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Marca: {res.marca} | Densidad: {res.densidad_g_cm3} g/cm³ | Peso: {res.peso_g}g
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                    ${res.costo_gramo.toFixed(1)} / g (${res.precio_compra.toLocaleString('es-CO')}/bote)
                  </span>
                  <span style={{ color: 'var(--text-subtle)' }}>
                    {res.velocidad_impresion_mm_h} mm/h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: INSUMOS */}
      {subTab === 'insumos' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Insumos de Acabados & Taller</h3>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalInsumo()}>
                <Plus size={14} />
                <span>Agregar Insumo</span>
              </button>
            </div>
            <input 
              type="text" 
              className="form-input" 
              style={{ maxWidth: '240px', padding: '6px 12px', minHeight: '36px' }}
              placeholder="Buscar insumo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {insumos
              .filter(i => i.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || i.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(ins => (
                <div key={ins.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', padding: '2px 6px', borderRadius: '4px' }}>
                      {ins.categoria}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {ins.enlace_compra && (
                        <a href={ins.enlace_compra} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-cyan)', padding: '2px 4px' }}>
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '3px 6px', minHeight: 'auto' }}
                        onClick={() => handleOpenModalInsumo(ins)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        style={{ padding: '3px 6px', minHeight: 'auto' }}
                        onClick={() => handleDeleteInsumo(ins.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '6px' }}>
                    {ins.nombre}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Marca: {ins.marca} | Presentación: {ins.presentacion}
                  </div>
                  <div style={{ marginTop: '8px', fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.88rem' }}>
                    ${ins.costo_unitario.toLocaleString('es-CO')} / unidad (Total: ${ins.costo_total.toLocaleString('es-CO')})
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VISTA 3: MAQUINARIA */}
      {subTab === 'maquinaria' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Maquinaria & Equipos</h3>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalMaquina()}>
              <Plus size={14} />
              <span>Agregar Máquina</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {maquinas.map(m => (
              <div key={m.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                    {m.nombre}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '4px 8px', minHeight: 'auto' }} 
                      onClick={() => handleOpenModalMaquina(m)}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ padding: '4px 8px', minHeight: 'auto' }} 
                      onClick={() => handleDeleteMaquina(m.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Tipo: {m.tipo} | Estado: {m.estado}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Potencia: {m.consumo_kwh} kW/h</span>
                  <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                    ${m.costo_minuto.toFixed(3)} COP/min
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 4: TARIFAS DE PERSONAL */}
      {subTab === 'personal' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Tarifas de Mano de Obra</h3>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalPersonal()}>
              <Plus size={14} />
              <span>Agregar Rol</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {personal.map(p => (
              <div key={p.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                    Rol: {p.rol}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '4px 8px', minHeight: 'auto' }} 
                      onClick={() => handleOpenModalPersonal(p)}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ padding: '4px 8px', minHeight: 'auto' }} 
                      onClick={() => handleDeletePersonal(p.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                  <div>Hora: ${p.costo_hora.toLocaleString('es-CO')} COP</div>
                  <div style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                    Minuto: ${p.costo_minuto.toFixed(2)} COP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 5: CLIENTES */}
      {subTab === 'clientes' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Directorio de Clientes ({clientes.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalCliente()}>
                <Plus size={14} />
                <span>Agregar Cliente</span>
              </button>
            </div>
            <input 
              type="text" 
              className="form-input" 
              style={{ maxWidth: '240px', padding: '6px 12px', minHeight: '36px' }}
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {clientes
              .filter(c => c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || c.telefono.includes(searchQuery))
              .map(c => (
                <div key={c.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {c.nombre}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '3px 6px', minHeight: 'auto' }} 
                        onClick={() => handleOpenModalCliente(c)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        style={{ padding: '3px 6px', minHeight: 'auto' }} 
                        onClick={() => handleDeleteCliente(c.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📱 {c.telefono} | NIT/CC: {c.nit_cc || 'N/A'}
                  </div>
                  {c.correo && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                      ✉️ {c.correo}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VISTA 6: PROVEEDORES */}
      {subTab === 'proveedores' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Directorio de Proveedores ({proveedores.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalProveedor()}>
                <Plus size={14} />
                <span>Agregar Proveedor</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {proveedores.map(p => (
              <div key={p.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>
                    {p.nombre}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '3px 6px', minHeight: 'auto' }} 
                      onClick={() => handleOpenModalProveedor(p)}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ padding: '3px 6px', minHeight: 'auto' }} 
                      onClick={() => handleDeleteProveedor(p.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--brand-cyan)', marginTop: '2px' }}>
                  Rubro: {p.rubro}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Contacto: {p.contacto || 'N/A'} | 📱 {p.telefono}
                </div>
                {p.enlace_web && (
                  <a href={p.enlace_web} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                    <span>Visitar Tienda / Catálogo</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 7: CONFIGURACIÓN DE TALLER & BANCOS */}
      {subTab === 'configuracion' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', marginBottom: '14px' }}>Parámetros de Taller y Medios de Pago</h3>
          <form onSubmit={handleGuardarConfig}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Tarifa de Energía Eléctrica (COP / kWh)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={tarifaKwh}
                  onChange={e => setTarifaKwh(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Factor de Merma / Soportes de Resina</label>
                <input 
                  type="number" 
                  step="0.05"
                  className="form-input" 
                  value={margenMerma}
                  onChange={e => setMargenMerma(parseFloat(e.target.value) || 1.4)}
                  title="1.4 equivale al 40% de merma"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Número Nequi</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={nequi}
                  onChange={e => setNequi(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Número Daviplata</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={daviplata}
                  onChange={e => setDaviplata(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuenta Bancolombia</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={bancolombia}
                  onChange={e => setBancolombia(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram Oficial</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                <span>Guardar Cambios</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => StorageService.exportBackup()}
              >
                <Database size={16} />
                <span>Exportar Copia de Seguridad JSON</span>
              </button>
            </div>
          </form>

          {/* TARJETA SUPABASE CLOUD & SINCRONIZACIÓN */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Cloud size={20} color="var(--brand-cyan)" />
              <h4 style={{ fontSize: '1rem', margin: 0 }}>Base de Datos en la Nube (Supabase)</h4>
              <span className={`status-pill ${CloudSyncService.isAvailable() ? 'status-terminado' : 'status-curado'}`}>
                {CloudSyncService.isAvailable() ? 'Conectado a la Nube' : 'Modo Local / Offline'}
              </span>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Para que todo el equipo (vendedores, cotizadores e impresores) comparta la misma base de datos en tiempo real desde cualquier celular, vincula tu proyecto de Supabase.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleTestCloud}
                disabled={isCloudLoading}
              >
                <CheckCircle2 size={14} />
                <span>Probar Conexión Supabase</span>
              </button>

              <button 
                type="button" 
                className="btn btn-cyan btn-sm"
                onClick={handleSeedCloud}
                disabled={isCloudLoading}
              >
                <Cloud size={14} />
                <span>Subir Datos del Excel a Supabase</span>
              </button>
            </div>

            {cloudStatus && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--brand-cyan)' }}>
                ℹ️ {cloudStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 8: TARIFARIO DE TAMAÑOS / PRECIOS BÁSICOS */}
      {subTab === 'tarifas' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--brand-cyan)" />
                Tarifario Estándar de Tamaños y Valores Básicos
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Valores de referencia para miniaturas y figuras en resina UV. Utilizados en el cotizador y para respuestas rápidas de WhatsApp.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalTarifa()}>
              <Plus size={14} />
              <span>Agregar Tamaño / Tarifa</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Altura (Z)</th>
                  <th style={{ width: '160px' }}>Precio Sugerido</th>
                  <th>Descripción / Tipo de Pieza</th>
                  <th style={{ width: '160px' }}>Tiempo de Entrega</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tarifasTamanos.map(tar => (
                  <tr key={tar.id}>
                    <td>
                      <span style={{ 
                        fontWeight: 800, 
                        color: 'var(--brand-cyan)', 
                        background: 'rgba(56, 189, 248, 0.12)', 
                        padding: '3px 8px', 
                        borderRadius: '6px' 
                      }}>
                        {tar.altura_cm} cm
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({tar.altura_cm * 10} mm)
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.95rem' }}>
                        ${tar.precio_sugerido.toLocaleString('es-CO')}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>COP</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{tar.descripcion || 'Figura coleccionable estándar'}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {tar.tiempo_estimado || '(3) Días hábiles'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleOpenModalTarifa(tar)} 
                          title="Editar tarifa"
                          style={{ padding: '4px 6px' }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleDeleteTarifa(tar.id)} 
                          title="Eliminar tarifa"
                          style={{ padding: '4px 6px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL GENERATIVO PARA CREAR / EDITAR CUALQUIER ELEMENTO */}
      {modalType && itemEnEdicion && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>
              {itemEnEdicion.isEdit ? 'Editar' : 'Agregar'} {modalType.toUpperCase()}
            </h3>

            {/* FORMULARIO RESINA */}
            {modalType === 'resina' && (
              <form onSubmit={handleSaveResina}>
                <div className="form-group">
                  <label className="form-label">Tipo de Resina (Línea)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.tipo}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, tipo: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Marca</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={itemEnEdicion.marca}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, marca: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={itemEnEdicion.color}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, color: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Precio Compra Envase ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={itemEnEdicion.precio_compra}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, precio_compra: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Peso del Bote (Gramos)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={itemEnEdicion.peso_g}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, peso_g: parseFloat(e.target.value) || 1000 })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Densidad (g/cm³)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      value={itemEnEdicion.densidad_g_cm3}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, densidad_g_cm3: parseFloat(e.target.value) || 1.13 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Velocidad (mm/h)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={itemEnEdicion.velocidad_impresion_mm_h}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, velocidad_impresion_mm_h: parseFloat(e.target.value) || 20 })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Resina</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {/* FORMULARIO INSUMO */}
            {modalType === 'insumo' && (
              <form onSubmit={handleSaveInsumo}>
                <div className="form-group">
                  <label className="form-label">Nombre del Insumo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.nombre}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, nombre: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select 
                      className="form-select"
                      value={itemEnEdicion.categoria}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, categoria: e.target.value })}
                    >
                      <option value="Pintura">Pintura</option>
                      <option value="Químicos">Químicos</option>
                      <option value="Bisutería">Bisutería</option>
                      <option value="Ferretería">Ferretería</option>
                      <option value="Empaque">Empaque</option>
                      <option value="Electrónica">Electrónica</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Marca</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={itemEnEdicion.marca}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, marca: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Costo Total ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={itemEnEdicion.costo_total}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, costo_total: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Presentación (ml, g, und)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={itemEnEdicion.presentacion}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, presentacion: parseFloat(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Enlace de Compra (URL)</label>
                  <input 
                    type="url" 
                    className="form-input" 
                    value={itemEnEdicion.enlace_compra || ''}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, enlace_compra: e.target.value })}
                    placeholder="https://mercadolibre.com..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Insumo</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {/* FORMULARIO MAQUINARIA */}
            {modalType === 'maquina' && (
              <form onSubmit={handleSaveMaquina}>
                <div className="form-group">
                  <label className="form-label">Nombre de la Máquina</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.nombre}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, nombre: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Equipo</label>
                    <select 
                      className="form-select"
                      value={itemEnEdicion.tipo}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, tipo: e.target.value })}
                    >
                      <option value="Impresora 3D Resina">Impresora 3D Resina</option>
                      <option value="Impresora 3D Filamento (FDM)">Impresora 3D Filamento</option>
                      <option value="Estación de Curado">Estación de Curado</option>
                      <option value="Aerógrafo / Pintura">Aerógrafo / Pintura</option>
                      <option value="Herramienta Eléctrica">Herramienta Eléctrica</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consumo Eléctrico (kW/h)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      value={itemEnEdicion.consumo_kwh}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, consumo_kwh: parseFloat(e.target.value) || 0.1 })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Máquina</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {/* FORMULARIO PERSONAL */}
            {modalType === 'personal' && (
              <form onSubmit={handleSavePersonal}>
                <div className="form-group">
                  <label className="form-label">Rol / Cargo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.rol}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, rol: e.target.value })}
                    placeholder="Ej: Modelador 3D / Diseñador"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo por Hora (COP)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={itemEnEdicion.costo_hora}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, costo_hora: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Tarifa</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {/* FORMULARIO CLIENTE */}
            {modalType === 'cliente' && (
              <form onSubmit={handleSaveCliente}>
                <div className="form-group">
                  <label className="form-label">Nombre del Cliente *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.nombre}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono / WhatsApp *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={itemEnEdicion.telefono}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, telefono: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">NIT / CC</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={itemEnEdicion.nit_cc || ''}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, nit_cc: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={itemEnEdicion.correo || ''}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, correo: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cliente</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {/* FORMULARIO PROVEEDOR */}
            {modalType === 'proveedor' && (
              <form onSubmit={handleSaveProveedor}>
                <div className="form-group">
                  <label className="form-label">Nombre Empresa / Proveedor *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.nombre}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, nombre: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Rubro</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={itemEnEdicion.rubro}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, rubro: e.target.value })}
                      placeholder="Resinas, Pinturas, Ferretería..."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono / WhatsApp *</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      value={itemEnEdicion.telefono}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, telefono: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Persona de Contacto</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={itemEnEdicion.contacto || ''}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, contacto: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Página Web / Catálogo</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      value={itemEnEdicion.enlace_web || ''}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, enlace_web: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Proveedor</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {/* FORMULARIO TARIFA POR TAMAÑO */}
            {modalType === 'tarifa' && (
              <form onSubmit={handleSaveTarifa}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Altura (en centímetros) *</label>
                    <div className="input-with-unit">
                      <input 
                        type="number" 
                        className="form-input" 
                        min="1"
                        max="100"
                        step="0.5"
                        value={itemEnEdicion.altura_cm}
                        onChange={e => setItemEnEdicion({ ...itemEnEdicion, altura_cm: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      <span className="input-unit-badge">cm ({Math.round((itemEnEdicion.altura_cm || 0) * 10)} mm)</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Precio Sugerido (COP) *</label>
                    <div className="input-with-unit">
                      <input 
                        type="number" 
                        className="form-input" 
                        min="0"
                        step="1000"
                        value={itemEnEdicion.precio_sugerido}
                        onChange={e => setItemEnEdicion({ ...itemEnEdicion, precio_sugerido: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      <span className="input-unit-badge">COP</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción / Categoría de Pieza *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.descripcion}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, descripcion: e.target.value })}
                    placeholder="Ej: Figura coleccionable estándar"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tiempo Estimado de Entrega</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={itemEnEdicion.tiempo_estimado}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, tiempo_estimado: e.target.value })}
                    placeholder="Ej: (3) Días hábiles"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Tarifa</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
