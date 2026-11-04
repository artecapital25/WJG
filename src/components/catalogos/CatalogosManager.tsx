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
  Sparkles,
  Camera,
  Eye,
  Zap
} from 'lucide-react';
import { 
  Resina, 
  Insumo, 
  Maquina, 
  Personal, 
  Cliente, 
  Proveedor,
  ConfiguracionTaller,
  TarifaTamano,
  RepuestoMaquina
} from '../../types';
import { StorageService } from '../../services/storageService';
import { CloudSyncService, ensureValidUuid } from '../../services/cloudSyncService';
import { ImageUploadField } from '../common/ImageUploadField';
import { toast } from '../ui/ToastProvider';

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
  onOpenBackup?: () => void;
  onRefreshCatalogos?: () => Promise<void>;
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
  onUpdateTarifasTamanos,
  onOpenBackup,
  onRefreshCatalogos
}) => {
  const [subTab, setSubTab] = useState<SubTab>('resinas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales de Edición / Creación
  const [modalType, setModalType] = useState<string | null>(null);
  const [itemEnEdicion, setItemEnEdicion] = useState<any>(null);
  const [zoomModalImg, setZoomModalImg] = useState<{ url: string; title: string } | null>(null);
  const [nuevoRepuesto, setNuevoRepuesto] = useState({ nombre: '', costo_compra: '', vida_util_horas: '' });
  const [unidadPotencia, setUnidadPotencia] = useState<'W' | 'kW'>('W');

  // Estados de Configuración
  const [tarifaKwh, setTarifaKwh] = useState(config.tarifa_kwh);
  const [margenMerma, setMargenMerma] = useState(config.margen_merma_resina);
  const [nequi, setNequi] = useState(config.nequi);
  const [breB, setBreB] = useState(config.bre_b || '0090778625');
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
      setItemEnEdicion({ ...res, isEdit: true, imagen_url: res.imagen_url || '' });
    } else {
      setItemEnEdicion({
        id: ensureValidUuid(),
        tipo: 'Resina Standar',
        marca: 'Anycubic',
        color: 'Negro',
        volumen_l: 1.0,
        densidad_g_cm3: 1.13,
        peso_g: 1130,
        precio_compra: 89000,
        velocidad_impresion_mm_h: 20.0,
        imagen_url: '',
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
      resumen,
      imagen_url: itemEnEdicion.imagen_url || ''
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
      const resinaABorrar = resinas.find(r => r.id !== id);
      const updated = resinas.filter(r => r.id !== id);
      onUpdateResinas(updated);
      CloudSyncService.deleteResina(id, resinaABorrar?.tipo);
      toast.success('Resina eliminada del catálogo');
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS INSUMOS
  // -----------------------------------------------------------------
  const handleOpenModalInsumo = (ins?: Insumo) => {
    if (ins) {
      setItemEnEdicion({ ...ins, isEdit: true, imagen_url: ins.imagen_url || '' });
    } else {
      setItemEnEdicion({
        id: ensureValidUuid(),
        codigo: insumos.length + 1,
        nombre: '',
        marca: 'Genérico',
        categoria: 'Pintura',
        presentacion: 60,
        costo_total: 6000,
        enlace_compra: '',
        imagen_url: '',
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
      enlace_compra: itemEnEdicion.enlace_compra,
      imagen_url: itemEnEdicion.imagen_url || ''
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
      const insumoABorrar = insumos.find(i => i.id !== id);
      const updated = insumos.filter(i => i.id !== id);
      onUpdateInsumos(updated);
      CloudSyncService.deleteInsumo(id, insumoABorrar?.nombre);
      toast.success('Insumo eliminado');
    }
  };

  // -----------------------------------------------------------------
  // HANDLERS MAQUINARIA
  // -----------------------------------------------------------------
  const handleOpenModalMaquina = (maq?: Maquina) => {
    if (maq) {
      setItemEnEdicion({ 
        ...maq, 
        isEdit: true, 
        imagen_url: maq.imagen_url || '',
        repuestos: Array.isArray(maq.repuestos) ? maq.repuestos.map(r => ({ ...r })) : []
      });
    } else {
      setItemEnEdicion({
        id: ensureValidUuid(),
        nombre: 'Bambulab P1S / P2S',
        tipo: 'Impresora 3D Filamento (FDM)',
        consumo_kwh: 0.13,
        repuestos: [],
        estado: 'Disponible',
        imagen_url: '',
        isEdit: false
      });
    }
    setNuevoRepuesto({ nombre: '', costo_compra: '', vida_util_horas: '' });
    setModalType('maquina');
  };

  const handleAddRepuesto = (preset?: { nombre: string; costo_compra: number; vida_util_horas: number }) => {
    const nombre = preset ? preset.nombre : nuevoRepuesto.nombre.trim();
    const costo = preset ? preset.costo_compra : Number(nuevoRepuesto.costo_compra);
    const horas = preset ? preset.vida_util_horas : Number(nuevoRepuesto.vida_util_horas);

    if (!nombre) {
      toast.error('Indica el nombre del repuesto o componente');
      return;
    }
    if (!costo || costo <= 0) {
      toast.error('Indica el costo de compra del repuesto');
      return;
    }
    if (!horas || horas <= 0) {
      toast.error('Indica la vida útil estimada en horas de impresión');
      return;
    }

    const costo_hora = Number((costo / horas).toFixed(2));
    const costo_minuto = Number((costo / (horas * 60)).toFixed(4));

    const item: RepuestoMaquina = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nombre,
      costo_compra: costo,
      vida_util_horas: horas,
      costo_hora,
      costo_minuto,
      activo: true
    };

    const currentRepuestos = Array.isArray(itemEnEdicion?.repuestos) ? itemEnEdicion.repuestos : [];
    setItemEnEdicion({
      ...itemEnEdicion,
      repuestos: [...currentRepuestos, item]
    });
    setNuevoRepuesto({ nombre: '', costo_compra: '', vida_util_horas: '' });
    toast.success(`Repuesto "${nombre}" añadido`);
  };

  const handleRemoveRepuesto = (id: string) => {
    const currentRepuestos = Array.isArray(itemEnEdicion?.repuestos) ? itemEnEdicion.repuestos : [];
    setItemEnEdicion({
      ...itemEnEdicion,
      repuestos: currentRepuestos.filter((r: RepuestoMaquina) => r.id !== id)
    });
  };

  const handleToggleRepuesto = (id: string) => {
    const currentRepuestos = Array.isArray(itemEnEdicion?.repuestos) ? itemEnEdicion.repuestos : [];
    setItemEnEdicion({
      ...itemEnEdicion,
      repuestos: currentRepuestos.map((r: RepuestoMaquina) => r.id === id ? { ...r, activo: !r.activo } : r)
    });
  };

  const handleSaveMaquina = (e: React.FormEvent) => {
    e.preventDefault();
    const consumoKwh = Number(itemEnEdicion.consumo_kwh) || 0.05;
    const tarifa = config.tarifa_kwh || 834.0;
    const costo_minuto_energia = (consumoKwh * tarifa) / 60;

    const repuestos: RepuestoMaquina[] = Array.isArray(itemEnEdicion.repuestos) ? itemEnEdicion.repuestos : [];
    const costo_minuto_repuestos = repuestos
      .filter(r => r.activo !== false)
      .reduce((sum, r) => sum + (Number(r.costo_minuto) || 0), 0);

    const costo_total_min = costo_minuto_energia + costo_minuto_repuestos;

    const maquinaGuardada: Maquina = {
      id: itemEnEdicion.id,
      nombre: itemEnEdicion.nombre,
      tipo: itemEnEdicion.tipo,
      consumo_kwh: consumoKwh,
      costo_minuto_energia: Number(costo_minuto_energia.toFixed(4)),
      costo_minuto_repuestos: Number(costo_minuto_repuestos.toFixed(4)),
      costo_minuto: Number(costo_total_min.toFixed(4)),
      repuestos,
      estado: itemEnEdicion.estado || 'Disponible',
      imagen_url: itemEnEdicion.imagen_url || ''
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

  const handleCalibrarPotencias = () => {
    if (!confirm('¿Deseas calibrar automáticamente todas las máquinas con sus potencias reales de fábrica (50W para Anycubic Mono 4, 60W para Mono X 6Ks, 130W para Bambulab P1S/P2S)? Esto corregirá el consumo antiguo del Excel (450W) y configurará los repuestos recomendados.')) return;

    const tarifa = config.tarifa_kwh || 834.0;
    const updated = maquinas.map(m => {
      let nuevoConsumo = m.consumo_kwh;
      let nuevosRepuestos = Array.isArray(m.repuestos) && m.repuestos.length > 0 ? [...m.repuestos] : [];

      const nom = m.nombre.toLowerCase();
      if (nom.includes('mono 4') || nom.includes('mono 2') || nom.includes('photon mono')) {
        nuevoConsumo = 0.05; // 50W
        if (nuevosRepuestos.length === 0) {
          nuevosRepuestos = [
            { id: `rep-${m.id}-fep`, nombre: 'Film FEP / Release Film', costo_compra: 75000, vida_util_horas: 300, costo_hora: 250, costo_minuto: 4.167, activo: true },
            { id: `rep-${m.id}-lcd`, nombre: 'Pantalla LCD 4K Monocromática', costo_compra: 180000, vida_util_horas: 2000, costo_hora: 90, costo_minuto: 1.5, activo: true }
          ];
        }
      } else if (nom.includes('6k') || nom.includes('mono x')) {
        nuevoConsumo = 0.06; // 60W
        if (nuevosRepuestos.length === 0) {
          nuevosRepuestos = [
            { id: `rep-${m.id}-fep6k`, nombre: 'Film FEP Gran Formato', costo_compra: 85000, vida_util_horas: 300, costo_hora: 283.33, costo_minuto: 4.722, activo: true },
            { id: `rep-${m.id}-lcd6k`, nombre: 'Pantalla LCD 6Ks 9.1 pulgadas', costo_compra: 220000, vida_util_horas: 2000, costo_hora: 110, costo_minuto: 1.833, activo: true }
          ];
        }
      } else if (nom.includes('bambu') || nom.includes('p1s') || nom.includes('p2s') || nom.includes('x1')) {
        nuevoConsumo = 0.13; // 130W
        if (nuevosRepuestos.length === 0) {
          nuevosRepuestos = [
            { id: `rep-${m.id}-nozzle`, nombre: 'Hotend & Boquilla Endurecida', costo_compra: 45000, vida_util_horas: 600, costo_hora: 75, costo_minuto: 1.25, activo: true },
            { id: `rep-${m.id}-bed`, nombre: 'Placa Texturada PEI & Lubricación', costo_compra: 40000, vida_util_horas: 1000, costo_hora: 40, costo_minuto: 0.667, activo: true }
          ];
        }
      } else if (nom.includes('kobra') || nom.includes('ender') || nom.includes('fdm') || nom.includes('filamento')) {
        nuevoConsumo = 0.15; // 150W
        if (nuevosRepuestos.length === 0) {
          nuevosRepuestos = [
            { id: `rep-${m.id}-nozzle`, nombre: 'Boquilla Latón 0.4mm', costo_compra: 25000, vida_util_horas: 500, costo_hora: 50, costo_minuto: 0.833, activo: true }
          ];
        }
      } else if (nom.includes('wash') || nom.includes('cure') || nom.includes('curado')) {
        nuevoConsumo = 0.048; // 48W
      } else if (nom.includes('compresor') || nom.includes('paasche') || nom.includes('aerograf')) {
        nuevoConsumo = 0.15; // 150W
      } else if (nom.includes('dremel') || nom.includes('pulidora')) {
        nuevoConsumo = 0.13; // 130W
      }

      const costo_energia_min = (nuevoConsumo * tarifa) / 60;
      const costo_repuestos_min = nuevosRepuestos
        .filter(r => r.activo !== false)
        .reduce((sum, r) => sum + (Number(r.costo_minuto) || 0), 0);
      const costo_total_min = costo_energia_min + costo_repuestos_min;

      return {
        ...m,
        consumo_kwh: nuevoConsumo,
        costo_minuto_energia: Number(costo_energia_min.toFixed(4)),
        costo_minuto_repuestos: Number(costo_repuestos_min.toFixed(4)),
        costo_minuto: Number(costo_total_min.toFixed(4)),
        repuestos: nuevosRepuestos
      };
    });

    onUpdateMaquinas(updated);
    toast.success('¡Maquinaria calibrada a potencias reales de fábrica con repuestos!');
  };

  const handleDeleteMaquina = (id: string) => {
    if (confirm('¿Eliminar esta máquina del taller?')) {
      const maquinaABorrar = maquinas.find(m => m.id === id);
      const updated = maquinas.filter(m => m.id !== id);
      onUpdateMaquinas(updated);
      CloudSyncService.deleteMaquina(id, maquinaABorrar?.nombre);
      toast.success('Máquina eliminada del taller');
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
      CloudSyncService.deleteTarifaPersonal(id);
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
    const cotizaciones = StorageService.getCotizaciones();
    const cuentas = StorageService.getCuentas();
    const cliente = clientes.find(c => c.id === id);

    const cotsAsociadas = cotizaciones.filter(c => c.cliente?.id === id || c.cliente?.nombre === cliente?.nombre);
    const cuentasAsociadas = cuentas.filter(c => c.cliente?.id === id || c.cliente?.nombre === cliente?.nombre);
    const tieneDeudas = cuentasAsociadas.some(c => c.saldo_pendiente > 0);

    if (tieneDeudas) {
      toast.error(`No es posible eliminar a ${cliente?.nombre || 'este cliente'} porque tiene saldos pendientes por cobrar en Cuentas de Cobro.`);
      return;
    }

    if (cotsAsociadas.length > 0) {
      if (!confirm(`El cliente "${cliente?.nombre}" tiene ${cotsAsociadas.length} cotización(es) histórica(s). ¿Deseas eliminarlo del directorio de clientes frecuentes?`)) {
        return;
      }
    } else {
      if (!confirm(`¿Eliminar al cliente "${cliente?.nombre || 'seleccionado'}" del directorio?`)) {
        return;
      }
    }

    const updated = clientes.filter(c => c.id !== id);
    onUpdateClientes(updated);
    toast.success('Cliente eliminado del catálogo');
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
      CloudSyncService.deleteProveedor(id);
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
        CloudSyncService.deleteTarifaTamano(id);
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
      bre_b: breB,
      instagram
    };
    onUpdateConfig(updated);
    
    // Recalcular en cascada las tarifas de maquinaria ante el cambio de tarifa eléctrica
    const newTarifa = Number(tarifaKwh) || 834.0;
    if (maquinas && maquinas.length > 0) {
      const updatedMaquinas = maquinas.map(m => {
        const consumo = typeof m.consumo_kwh === 'number' && m.consumo_kwh > 0 ? m.consumo_kwh : 0.05;
        const costo_energia_min = (consumo * newTarifa) / 60;
        const repuestos = Array.isArray(m.repuestos) ? m.repuestos : [];
        const costo_repuestos_min = repuestos
          .filter(r => r.activo !== false)
          .reduce((sum, r) => sum + (Number(r.costo_minuto) || 0), 0);
        
        let costo_total_min = costo_energia_min + costo_repuestos_min;
        if (costo_repuestos_min === 0 && typeof m.costo_minuto === 'number' && m.costo_minuto > 0) {
          costo_total_min = m.costo_minuto;
        }

        return {
          ...m,
          costo_minuto_energia: Number(costo_energia_min.toFixed(4)),
          costo_minuto_repuestos: Number(costo_repuestos_min.toFixed(4)),
          costo_minuto: Number(costo_total_min.toFixed(4)),
          repuestos
        };
      });
      onUpdateMaquinas(updatedMaquinas);
    }

    toast.success('Configuración guardada y tarifas de maquinaria actualizadas en cascada');
  };

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="section-title">
            <Settings size={22} color="var(--brand-cyan)" />
            Ajustes & Catálogos Editables
          </h2>
          <p className="section-subtitle">Edita, agrega o elimina resinas, insumos, maquinaria, tarifas, clientes y proveedores</p>
        </div>
        {onRefreshCatalogos && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              toast.info('Sincronizando catálogos con la nube...');
              await onRefreshCatalogos();
              toast.success('¡Catálogos sincronizados con la nube (Supabase)!');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--brand-cyan)', borderColor: 'rgba(56, 189, 248, 0.4)' }}
            title="Trae las impresoras, insumos y tarifas creadas por compañeros desde Supabase"
          >
            <Cloud size={15} />
            <span>Sincronizar Catálogos Ahora</span>
          </button>
        )}
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
              <div key={res.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      {/* Miniatura de Resina */}
                      {res.imagen_url ? (
                        <div 
                          onClick={() => setZoomModalImg({ url: res.imagen_url!, title: `${res.tipo} - ${res.color}` })}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            background: '#050508'
                          }}
                          title="Clic para ampliar foto"
                        >
                          <img src={res.imagen_url} alt={res.tipo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleOpenModalResina(res)}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: 'rgba(56, 189, 248, 0.08)',
                            border: '1px dashed rgba(56, 189, 248, 0.3)',
                            cursor: 'pointer',
                            color: 'var(--brand-cyan)'
                          }}
                          title="Agregar foto a esta resina"
                        >
                          <Camera size={18} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {res.tipo}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--brand-cyan)', fontWeight: 600 }}>
                          Color: {res.color}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '4px 8px', minHeight: 'auto' }} 
                        onClick={() => handleOpenModalResina(res)}
                        title="Editar resina y foto"
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

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Marca: {res.marca} | Densidad: {res.densidad_g_cm3} g/cm³ | Peso: {res.peso_g}g
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.85rem', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
              placeholder="Buscar insumo (pescadores, tornillos, imanes...)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {insumos
              .filter(i => i.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || i.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(ins => (
                <div key={ins.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {ins.categoria}
                      </span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {ins.enlace_compra && (
                          <a href={ins.enlace_compra} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-cyan)', padding: '2px 4px' }} title="Ver enlace de compra">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '3px 6px', minHeight: 'auto' }}
                          onClick={() => handleOpenModalInsumo(ins)}
                          title="Editar insumo y foto"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '3px 6px', minHeight: 'auto' }}
                          onClick={() => handleDeleteInsumo(ins.id)}
                          title="Eliminar insumo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {/* Miniatura de Foto del Insumo (pescador, tornillo, imán, etc.) */}
                      {ins.imagen_url ? (
                        <div
                          onClick={() => setZoomModalImg({ url: ins.imagen_url!, title: ins.nombre })}
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            background: '#050508'
                          }}
                          title="Clic para ampliar foto"
                        >
                          <img src={ins.imagen_url} alt={ins.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div
                          onClick={() => handleOpenModalInsumo(ins)}
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px dashed rgba(255, 255, 255, 0.18)',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            gap: '2px'
                          }}
                          title="Tomar o agregar foto"
                        >
                          <Camera size={16} />
                          <span style={{ fontSize: '0.62rem' }}>+ Foto</span>
                        </div>
                      )}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', lineHeight: '1.25' }}>
                          {ins.nombre}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Marca: {ins.marca} | Presentación: {ins.presentacion}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.88rem', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    ${ins.costo_unitario.toLocaleString('es-CO')} / unidad <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Total: ${ins.costo_total.toLocaleString('es-CO')})</span>
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
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={18} color="var(--brand-cyan)" />
                Maquinaria & Equipos de Producción
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Tarifas por minuto calculadas según potencia real en Watts y amortización de repuestos
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={handleCalibrarPotencias}
                title="Ajusta todas las máquinas a sus consumos reales de fabricante (50W resina, 130W Bambulab) y activa los repuestos recomendados"
                style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--brand-cyan)' }}
              >
                <Zap size={14} />
                <span>Calibrar Potencias Reales (50W / 130W)</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenModalMaquina()}>
                <Plus size={14} />
                <span>Agregar Máquina</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {maquinas.map(m => {
              const watts = Math.round((m.consumo_kwh || 0.05) * 1000);
              const costoEnergiaMin = m.costo_minuto_energia !== undefined ? m.costo_minuto_energia : (m.consumo_kwh * (config.tarifa_kwh || 834)) / 60;
              const repuestosActivos = Array.isArray(m.repuestos) ? m.repuestos.filter(r => r.activo !== false) : [];
              const costoRepuestosMin = m.costo_minuto_repuestos !== undefined ? m.costo_minuto_repuestos : repuestosActivos.reduce((s, r) => s + (Number(r.costo_minuto) || 0), 0);
              const costoTotalMin = m.costo_minuto;
              const esConsumoInflado = m.consumo_kwh >= 0.35 && (m.tipo.toLowerCase().includes('resina') || m.nombre.toLowerCase().includes('mono'));

              return (
                <div 
                  key={m.id} 
                  style={{ 
                    background: 'rgba(15, 23, 42, 0.45)', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    border: esConsumoInflado ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <div>
                    {/* Encabezado */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {m.imagen_url ? (
                          <div 
                            onClick={() => setZoomModalImg({ url: m.imagen_url!, title: m.nombre })}
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              cursor: 'pointer',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              background: '#050508'
                            }}
                            title="Clic para ampliar foto"
                          >
                            <img src={m.imagen_url} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div 
                            onClick={() => handleOpenModalMaquina(m)}
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px dashed rgba(255, 255, 255, 0.18)',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              gap: '2px'
                            }}
                            title="Agregar foto a la máquina"
                          >
                            <Camera size={16} />
                            <span style={{ fontSize: '0.62rem' }}>+ Foto</span>
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#fff', lineHeight: 1.25 }}>
                            {m.nombre}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.72rem', color: m.estado === 'Disponible' ? 'var(--accent-success)' : m.estado === 'En Uso' ? '#fde047' : '#f87171', fontWeight: 600 }}>
                              ● {m.estado}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                              {m.tipo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '4px 8px', minHeight: 'auto' }} 
                          onClick={() => handleOpenModalMaquina(m)}
                          title="Editar máquina y repuestos"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '4px 8px', minHeight: 'auto' }} 
                          onClick={() => handleDeleteMaquina(m.id)}
                          title="Eliminar máquina"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Alerta de Consumo Inflado Histórico */}
                    {esConsumoInflado && (
                      <div style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.72rem', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span>⚠️ Potencia ({watts}W) inflada del Excel antiguo.</span>
                        <button 
                          type="button" 
                          className="btn btn-xs btn-cyan" 
                          style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                          onClick={handleCalibrarPotencias}
                        >
                          Calibrar a 50W
                        </button>
                      </div>
                    )}

                    {/* Bloque 1: Consumo Eléctrico Puro */}
                    <div style={{ marginTop: '12px', background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={12} />
                          Energía Eléctrica
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {watts} Watts ({m.consumo_kwh} kW)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                          ${costoEnergiaMin.toFixed(2)} COP/min
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                          ${(costoEnergiaMin * 60).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP/h
                        </span>
                      </div>
                    </div>

                    {/* Bloque 2: Fondo de Repuestos & Mantenimiento */}
                    <div style={{ marginTop: '8px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.18)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Wrench size={12} />
                          Fondo Repuestos & Desgaste
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {repuestosActivos.length} componente(s)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f59e0b' }}>
                          {costoRepuestosMin > 0 ? `+$${costoRepuestosMin.toFixed(2)} COP/min` : '$0.00 COP/min'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                          ${(costoRepuestosMin * 60).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP/h
                        </span>
                      </div>
                      {repuestosActivos.length > 0 ? (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Piezas: {repuestosActivos.map(r => r.nombre).join(', ')}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontStyle: 'italic', marginTop: '4px' }}>
                          Sin repuestos específicos (Cobro solo energía)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloque 3: Tarifa Total Consolidada */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Tarifa Total Taller
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                        ${(costoTotalMin * 60).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP/hora
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
                        ${costoTotalMin.toFixed(3)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', marginLeft: '3px' }}>
                        COP/min
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* GUÍA TÉCNICA VISUAL DE TARIFAS Y POTENCIAS */}
          <div style={{ marginTop: '24px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.02rem', color: '#f8fafc' }}>
                  ¿Cómo se calcula la tarifa por minuto de cada máquina y por qué es importante?
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Metodología de costos de taller: Energía eléctrica real + fondo de reposición de componentes
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                La <strong>Tarifa por Minuto</strong> es el cobro técnico aplicado por cada minuto que una máquina está operando en un pedido. Para que el precio al cliente sea justo y el taller no pierda dinero, se divide en <strong>dos componentes transparentes</strong>:
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
                  <div style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} /> 1. Consumo Eléctrico Puro
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Calculado con la potencia real en Watts de la máquina y la tarifa del recibo (actualmente <strong>${config.tarifa_kwh || 834} COP/kWh</strong>).<br/>
                    <em>Fórmula:</em> (Watts ÷ 1000) × Tarifa kWh ÷ 60 min.<br/>
                    <em>Ejemplo:</em> 50 Watts = <strong>$0.70 COP/min</strong> ($41.70 COP/hora).
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={14} /> 2. Fondo de Repuestos & Mantenimiento
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Recupera el desgaste de piezas que deben reemplazarse periódicamente (Film FEP, pantalla LCD mono, boquillas, placas PEI).<br/>
                    <em>Fórmula:</em> (Costo del repuesto) ÷ (Horas vida útil × 60 min).<br/>
                    <em>Ejemplo:</em> FEP ($75k/300h = $4.17/min) + LCD ($180k/2000h = $1.50/min).
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.82rem' }}>
                  📌 ¿Por qué antes aparecía un costo alto de $6.255/min o más en la Anycubic Mono 4?
                </div>
                <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginTop: '4px' }}>
                  En el archivo Excel histórico de WJGEEKS, se le asignaba a la impresora de resina un consumo inflado de <strong>0.45 kW (450 Watts)</strong> para que la energía por sí sola cobrara <strong>$6.255 COP/min</strong> y así cubrir la pantalla sin desglosarla. Si hoy se mantenía en 450W y además se le agregaban repuestos, la tarifa saltaba al doble (~$12.00 COP/min). Con la calibración actual, la máquina queda en sus <strong>50 Watts reales</strong> ($0.70/min) y los repuestos suman ~$5.67/min, logrando la tarifa exacta (~$6.36 COP/min) con total claridad contable.
                </div>
              </div>

              {/* Tabla de Referencia Típica */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--brand-cyan)' }}>
                      <th style={{ padding: '8px 10px' }}>Equipo / Máquina</th>
                      <th style={{ padding: '8px 10px' }}>Potencia Real</th>
                      <th style={{ padding: '8px 10px' }}>Luz / hora</th>
                      <th style={{ padding: '8px 10px' }}>Luz / min</th>
                      <th style={{ padding: '8px 10px' }}>Repuestos Amortizados</th>
                      <th style={{ padding: '8px 10px' }}>Tarifa Total Sugerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Anycubic MONO 4 (Resina 4K)</td>
                      <td style={{ padding: '8px 10px' }}>50 W (0.05 kW)</td>
                      <td style={{ padding: '8px 10px' }}>$41.70</td>
                      <td style={{ padding: '8px 10px', color: '#38bdf8' }}>$0.70/min</td>
                      <td style={{ padding: '8px 10px', color: '#f59e0b' }}>+$5.67/min (FEP + LCD)</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-cyan)' }}>$6.36 COP/min</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Anycubic Mono X 6Ks (Resina 6K)</td>
                      <td style={{ padding: '8px 10px' }}>60 W (0.06 kW)</td>
                      <td style={{ padding: '8px 10px' }}>$50.04</td>
                      <td style={{ padding: '8px 10px', color: '#38bdf8' }}>$0.83/min</td>
                      <td style={{ padding: '8px 10px', color: '#f59e0b' }}>+$6.56/min (FEP 6K + LCD)</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-cyan)' }}>$7.39 COP/min</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Bambulab P1S / P2S (Filamento FDM)</td>
                      <td style={{ padding: '8px 10px' }}>130 W (0.13 kW)</td>
                      <td style={{ padding: '8px 10px' }}>$108.42</td>
                      <td style={{ padding: '8px 10px', color: '#38bdf8' }}>$1.81/min</td>
                      <td style={{ padding: '8px 10px', color: '#f59e0b' }}>+$1.92/min (Nozzle + Cama)</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-cyan)' }}>$3.72 COP/min</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Anycubic Wash & Cure 3</td>
                      <td style={{ padding: '8px 10px' }}>48 W (0.048 kW)</td>
                      <td style={{ padding: '8px 10px' }}>$40.03</td>
                      <td style={{ padding: '8px 10px', color: '#38bdf8' }}>$0.67/min</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>$0 (Sin repuestos)</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-cyan)' }}>$0.67 COP/min</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Compresor Paasche S220R</td>
                      <td style={{ padding: '8px 10px' }}>150 W (0.15 kW)</td>
                      <td style={{ padding: '8px 10px' }}>$125.10</td>
                      <td style={{ padding: '8px 10px', color: '#38bdf8' }}>$2.09/min</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>$0 (Solo energía)</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-cyan)' }}>$2.09 COP/min</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
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
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tarifa de Energía Eléctrica (COP / kWh)</span>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>⚡ Actualiza toda la maquinaria</span>
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={tarifaKwh}
                  onChange={e => setTarifaKwh(parseFloat(e.target.value) || 0)}
                  title="Costo de la energía del taller (ej. $834 COP/kWh)"
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

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ color: '#06b6d4', fontWeight: 800 }}>
                  🔑 Llave Bre-B Oficial (Identificador Único Interoperable)
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={breB}
                  onChange={e => setBreB(e.target.value)}
                  placeholder="0090778625"
                  style={{ borderColor: 'rgba(6, 182, 212, 0.4)', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  Sistema nacional de pagos inmediatos interoperable. Reemplaza transferencias tradicionales.
                </span>
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

              {onOpenBackup && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={onOpenBackup}
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Cloud size={16} />
                  <span>Base de Datos Google Drive (3:00 AM) & Respaldos</span>
                </button>
              )}

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
                <ImageUploadField
                  label="Fotografía del Bote o Muestra de Resina"
                  helperText="Sube foto del envase o tómala con la cámara del celular en el taller."
                  value={itemEnEdicion.imagen_url || ''}
                  onChange={(url) => setItemEnEdicion({ ...itemEnEdicion, imagen_url: url })}
                />
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
                <ImageUploadField
                  label="Fotografía del Insumo (Pescador, Tornillo, Imán, Empaque, etc.)"
                  helperText="Toma foto directa del insumo físico con la cámara del celular o sube una imagen."
                  value={itemEnEdicion.imagen_url || ''}
                  onChange={(url) => setItemEnEdicion({ ...itemEnEdicion, imagen_url: url })}
                />
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
                <ImageUploadField
                  label="Fotografía de la Máquina / Impresora 3D"
                  helperText="Foto de la máquina en el taller para control visual e inventario."
                  value={itemEnEdicion.imagen_url || ''}
                  onChange={(url) => setItemEnEdicion({ ...itemEnEdicion, imagen_url: url })}
                />
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
                    <input 
                      type="text" 
                      list="tipos-maquina-list"
                      className="form-input"
                      value={itemEnEdicion.tipo}
                      onChange={e => setItemEnEdicion({ ...itemEnEdicion, tipo: e.target.value })}
                      placeholder="Selecciona o escribe el tipo..."
                      required
                    />
                    <datalist id="tipos-maquina-list">
                      <option value="Impresora 3D Resina" />
                      <option value="Impresora 3D Filamento (FDM)" />
                      <option value="Estación de Curado" />
                      <option value="Aerógrafo / Pintura" />
                      <option value="Herramienta Eléctrica" />
                      <option value="Cortadora / Grabadora Láser" />
                      <option value="Horno / Cámara Térmica" />
                      <option value="Pulidora / Desbaste" />
                    </datalist>
                  </div>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        Potencia / Consumo
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className={`btn btn-xs ${unidadPotencia === 'W' ? 'btn-cyan' : 'btn-secondary'}`}
                          style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                          onClick={() => setUnidadPotencia('W')}
                        >
                          Watts (W)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${unidadPotencia === 'kW' ? 'btn-cyan' : 'btn-secondary'}`}
                          style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                          onClick={() => setUnidadPotencia('kW')}
                        >
                          kW
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        step={unidadPotencia === 'W' ? "1" : "0.001"}
                        className="form-input" 
                        value={unidadPotencia === 'W' ? Math.round((Number(itemEnEdicion.consumo_kwh) || 0) * 1000) : itemEnEdicion.consumo_kwh}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const kwh = unidadPotencia === 'W' ? val / 1000 : val;
                          setItemEnEdicion({ ...itemEnEdicion, consumo_kwh: kwh });
                        }}
                        required
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                        {unidadPotencia === 'W' ? 'W' : 'kW'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#38bdf8', display: 'block', marginTop: '2px' }}>
                      ⚡ {Math.round((Number(itemEnEdicion.consumo_kwh) || 0) * 1000)}W = ${(((Number(itemEnEdicion.consumo_kwh) || 0) * (config.tarifa_kwh || 834)) / 60).toFixed(2)}/min luz
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.64rem', padding: '1px 5px' }}
                        onClick={() => setItemEnEdicion({ ...itemEnEdicion, consumo_kwh: 0.05 })}
                      >
                        50W (Resina 4K)
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.64rem', padding: '1px 5px' }}
                        onClick={() => setItemEnEdicion({ ...itemEnEdicion, consumo_kwh: 0.06 })}
                      >
                        60W (Resina 6K)
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.64rem', padding: '1px 5px' }}
                        onClick={() => setItemEnEdicion({ ...itemEnEdicion, consumo_kwh: 0.13 })}
                      >
                        130W (Bambulab)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado de la Máquina</label>
                  <select
                    className="form-select"
                    value={itemEnEdicion.estado || 'Disponible'}
                    onChange={e => setItemEnEdicion({ ...itemEnEdicion, estado: e.target.value })}
                  >
                    <option value="Disponible">🟢 Disponible para Producción</option>
                    <option value="En Uso">🟡 En Uso</option>
                    <option value="Mantenimiento">🔴 En Mantenimiento</option>
                  </select>
                </div>

                {/* MODULO DE REPUESTOS Y MANTENIMIENTO DENTRO DEL MODAL */}
                {(() => {
                  const consumoKwh = Number(itemEnEdicion.consumo_kwh) || 0.05;
                  const tarifa = config.tarifa_kwh || 834.0;
                  const energiaMin = (consumoKwh * tarifa) / 60;
                  const repuestosList: RepuestoMaquina[] = Array.isArray(itemEnEdicion.repuestos) ? itemEnEdicion.repuestos : [];
                  const repuestosMin = repuestosList
                    .filter(r => r.activo !== false)
                    .reduce((sum, r) => sum + (Number(r.costo_minuto) || 0), 0);
                  const totalMin = energiaMin + repuestosMin;

                  return (
                    <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.35)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wrench size={15} />
                            Repuestos, Desgaste y Mantenimiento
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Amortización por horas de vida útil sumada a la tarifa de impresión
                          </span>
                        </div>
                      </div>

                      {/* Presets Rápidos */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                          PRESETS RÁPIDOS SUGERIDOS:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                            onClick={() => handleAddRepuesto({ nombre: 'Film FEP / Release Film', costo_compra: 75000, vida_util_horas: 300 })}
                          >
                            + Film FEP ($75k/300h)
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                            onClick={() => handleAddRepuesto({ nombre: 'Pantalla LCD Mono 4K/8K', costo_compra: 180000, vida_util_horas: 2000 })}
                          >
                            + Pantalla LCD ($180k/2000h)
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                            onClick={() => handleAddRepuesto({ nombre: 'Boquilla / Nozzle Endurecido', costo_compra: 45000, vida_util_horas: 500 })}
                          >
                            + Nozzle FDM ($45k/500h)
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                            onClick={() => handleAddRepuesto({ nombre: 'Lubricación & Grasa Eje Z', costo_compra: 20000, vida_util_horas: 200 })}
                          >
                            + Grasa Eje Z ($20k/200h)
                          </button>
                        </div>
                      </div>

                      {/* Lista de Repuestos */}
                      {repuestosList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                          {repuestosList.map((r, idx) => (
                            <div 
                              key={r.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                background: r.activo !== false ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '6px',
                                opacity: r.activo !== false ? 1 : 0.5
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <input 
                                  type="checkbox"
                                  checked={r.activo !== false}
                                  onChange={() => handleToggleRepuesto(r.id)}
                                  title="Activar o desactivar este repuesto de la tarifa"
                                  style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                                />
                                <div>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                                    {r.nombre}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    ${Number(r.costo_compra || 0).toLocaleString('es-CO')} COP / {r.vida_util_horas} horas
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>
                                    +${(Number(r.costo_minuto) || 0).toFixed(2)}/min
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                                    ${(Number(r.costo_hora) || 0).toLocaleString('es-CO')}/h
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '3px 6px', minHeight: 'auto' }}
                                  onClick={() => handleRemoveRepuesto(r.id)}
                                  title="Eliminar repuesto"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic', marginBottom: '10px' }}>
                          Sin repuestos específicos configurados aún. La máquina cobrará únicamente energía eléctrica pura más cualquier tarifa base configurada.
                        </div>
                      )}

                      {/* Mini Formulario */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          + Agregar Repuesto Personalizado
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                          <input 
                            type="text"
                            className="form-input"
                            style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                            placeholder="Nombre componente..."
                            value={nuevoRepuesto.nombre}
                            onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, nombre: e.target.value })}
                          />
                          <input 
                            type="number"
                            className="form-input"
                            style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                            placeholder="Costo COP"
                            value={nuevoRepuesto.costo_compra}
                            onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, costo_compra: e.target.value })}
                          />
                          <input 
                            type="number"
                            className="form-input"
                            style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                            placeholder="Horas uso"
                            value={nuevoRepuesto.vida_util_horas}
                            onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, vida_util_horas: e.target.value })}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '6px 10px', whiteSpace: 'nowrap' }}
                            onClick={() => handleAddRepuesto()}
                          >
                            <Plus size={12} /> Agregar
                          </button>
                        </div>
                      </div>

                      {/* Resumen Total */}
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ⚡ Energía: <strong style={{ color: '#38bdf8' }}>${energiaMin.toFixed(2)}/min</strong> + 🛠️ Repuestos: <strong style={{ color: '#f59e0b' }}>${repuestosMin.toFixed(2)}/min</strong>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                            Tarifa por hora: ${(totalMin * 60).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP/hora
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tarifa Minuto Total:</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
                            ${totalMin.toFixed(3)} COP/min
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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

      {/* MODAL ZOOM DE FOTO EN ALTA DEFINICIÓN */}
      {zoomModalImg && (
        <div 
          onClick={() => setZoomModalImg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#0a0a0f',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <button
              type="button"
              onClick={() => setZoomModalImg(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-cyan)', marginBottom: '12px' }}>
              {zoomModalImg.title}
            </div>
            <img
              src={zoomModalImg.url}
              alt={zoomModalImg.title}
              style={{
                maxWidth: '85vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
