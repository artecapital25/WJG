import {
  Resina,
  Insumo,
  Maquina,
  Personal,
  Cliente,
  Proveedor,
  ConfiguracionTaller,
  Cotizacion,
  OrdenTrabajo,
  CuentaCobro,
  TarifaTamano,
  ProductoStock,
  VentaExpress,
  TareaEquipo,
  SolicitudInsumo,
  HerramientaLink
} from '../types';
import {
  RESINAS_INICIALES,
  INSUMOS_INICIALES,
  MAQUINAS_INICIALES,
  PERSONAL_INICIAL,
  CLIENTES_INICIALES,
  CONFIGURACION_INICIAL,
  TARIFAS_TAMANOS_INICIALES,
  PRODUCTOS_STOCK_INICIALES
} from '../data/initialData';
import { COTIZACIONES_INICIALES } from '../data/initialCotizaciones';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const PROVEEDORES_INICIALES: Proveedor[] = [
  { id: 'prov-1', nombre: 'Anycubic Oficial Colombia', contacto: 'Soporte Ventas', telefono: '3150001122', rubro: 'Resinas y Maquinaria 3D', enlace_web: 'https://anycubic.com' },
  { id: 'prov-2', nombre: 'Play Art Pinturas', contacto: 'Distribución', telefono: '3203334455', rubro: 'Pinturas Acrílicas y Primers' },
  { id: 'prov-3', nombre: 'Químicos Andina', contacto: 'Ventas Granel', telefono: '3109998877', rubro: 'Alcohol Isopropílico y Etanol 96%' },
  { id: 'prov-4', nombre: 'Ferretería & Imanes Tech', contacto: 'Despachos', telefono: '3124445566', rubro: 'Tornillería M3, Imanes Neodimio y Herrajes' }
];

const STORAGE_KEYS = {
  RESINAS: 'wjg_resinas',
  INSUMOS: 'wjg_insumos',
  MAQUINAS: 'wjg_maquinas',
  PERSONAL: 'wjg_personal',
  CLIENTES: 'wjg_clientes',
  PROVEEDORES: 'wjg_proveedores',
  CONFIG: 'wjg_configuracion',
  COTIZACIONES: 'wjg_cotizaciones',
  ORDENES: 'wjg_ordenes_trabajo',
  CUENTAS: 'wjg_cuentas_cobro',
  TARIFAS_TAMANOS: 'wjg_tarifas_tamanos',
  PRODUCTOS_STOCK: 'wjg_productos_stock',
  VENTAS_EXPRESS: 'wjg_ventas_express',
  TAREAS: 'wjg_tareas_equipo',
  SOLICITUDES_INSUMOS: 'wjg_solicitudes_insumos',
  HERRAMIENTAS: 'wjg_herramientas_links',
  GOOGLE_SHEETS_CONFIG: 'wjg_google_sheets_config'
};

const TAREAS_INICIALES: TareaEquipo[] = [
  {
    id: 'task-1',
    titulo: 'Revisión y lubricación de eje Z en Anycubic Photon',
    descripcion: 'Aplicar grasa de teflón en el husillo para evitar banding en capas de 0.03mm',
    asignado_a: 'Juan',
    tipo: 'periodica',
    frecuencia: 'semanal',
    prioridad: 'alta',
    completada: false,
    fecha_creacion: new Date().toISOString().slice(0, 10)
  },
  {
    id: 'task-2',
    titulo: 'Filtrado y limpieza de tina de resina UV',
    descripcion: 'Filtrar resina con embudo de 190 micras para retirar microfragmentos curados en el film FEP',
    asignado_a: 'Juan',
    tipo: 'periodica',
    frecuencia: 'diaria',
    prioridad: 'media',
    completada: false,
    fecha_creacion: new Date().toISOString().slice(0, 10)
  },
  {
    id: 'task-3',
    titulo: 'Conciliación de abonos Nequi, Daviplata y Bancolombia',
    descripcion: 'Verificar comprobantes de anticipos y cuentas por cobrar de la semana',
    asignado_a: 'Wendy',
    tipo: 'periodica',
    frecuencia: 'semanal',
    prioridad: 'alta',
    completada: false,
    fecha_creacion: new Date().toISOString().slice(0, 10)
  },
  {
    id: 'task-4',
    titulo: 'Modelado y optimización de mallas STL con drenaje de 3mm',
    descripcion: 'Verificar ahuecado y orientación de soportes para figuras personalizadas',
    asignado_a: 'Germán',
    tipo: 'puntual',
    prioridad: 'alta',
    completada: false,
    fecha_creacion: new Date().toISOString().slice(0, 10)
  }
];

export const HERRAMIENTAS_INICIALES: HerramientaLink[] = [
  {
    id: 'tool-hunyuan',
    nombre: '腾讯混元3D (Tencent Hunyuan 3D)',
    url: 'https://3d.hunyuan.tencent.com/studio/creation/geo',
    categoria: 'ia_3d',
    descripcion: 'Generador y modelador 3D con Inteligencia Artificial de Tencent para mallas de alta precisión.',
    etiqueta: 'IA Oficial',
    esFrecuente: true,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-tripo',
    nombre: 'Tripo 3D',
    url: 'https://www.tripo3d.ai/',
    categoria: 'ia_3d',
    descripcion: 'Generación instantánea de modelos 3D y geometrías en segundos desde texto o imagen.',
    etiqueta: 'Generador IA',
    esFrecuente: true,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-rodin',
    nombre: 'Rodin Gen-2 (Deemos)',
    url: 'https://hyperhuman.deemos.com/rodin',
    categoria: 'ia_3d',
    descripcion: 'Escultura digital con IA para personajes, bustos y figuras de colección con hiperdetalle.',
    etiqueta: 'Escultura IA',
    esFrecuente: true,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-csm',
    nombre: 'CSM (Common Sense Machines)',
    url: 'https://3d.csm.ai/',
    categoria: 'ia_3d',
    descripcion: 'Conversión de fotos e imágenes conceptuales 2D a mallas 3D para impresión.',
    etiqueta: '2D a 3D',
    esFrecuente: false,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-cults',
    nombre: 'Cults 3D',
    url: 'https://cults3d.com/es',
    categoria: 'stl_repos',
    descripcion: 'Plataforma líder en archivos STL para impresión 3D, figuras de anime, videojuegos y cine.',
    etiqueta: 'Catálogo STL',
    esFrecuente: true,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-cgtrader',
    nombre: 'CGTrader',
    url: 'https://www.cgtrader.com/',
    categoria: 'stl_repos',
    descripcion: 'Repositorio profesional de modelos 3D y estatuas premium para impresión SLA de alta gama.',
    etiqueta: 'Estatuas Premium',
    esFrecuente: true,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-printables',
    nombre: 'Printables (Prusa)',
    url: 'https://www.printables.com/',
    categoria: 'stl_repos',
    descripcion: 'Comunidad abierta con miles de modelos libres, accesorios y repuestos para taller.',
    etiqueta: 'Modelos Libres',
    esFrecuente: false,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-thingiverse',
    nombre: 'Thingiverse',
    url: 'https://www.thingiverse.com/',
    categoria: 'stl_repos',
    descripcion: 'Biblioteca global de archivos 3D de código abierto para modificaciones y prototipos rápidos.',
    etiqueta: 'Biblioteca Abierta',
    esFrecuente: false,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-chitubox',
    nombre: 'Chitubox Slicer',
    url: 'https://www.chitubox.com/',
    categoria: 'slicers',
    descripcion: 'Software laminador oficial para impresoras de resina LCD/SLA. Calibración de soportes.',
    etiqueta: 'Laminador SLA',
    esFrecuente: true,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-lychee',
    nombre: 'Lychee Slicer',
    url: 'https://mango3d.io/lychee-slicer-for-sla-3d-printers/',
    categoria: 'slicers',
    descripcion: 'Laminador avanzado con auto-soportes dinámicos, ahuecado y detección automática de islas.',
    etiqueta: 'Slicer Avanzado',
    esFrecuente: true,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-heroforge',
    nombre: 'Hero Forge Miniaturas',
    url: 'https://www.heroforge.com/',
    categoria: 'pintura',
    descripcion: 'Creador de personajes y miniaturas para juegos de rol, coleccionismo y pintura a mano.',
    etiqueta: 'Miniaturas',
    esFrecuente: false,
    creado_el: '2026-10-14'
  },
  {
    id: 'tool-meta',
    nombre: 'Meta Commerce Manager',
    url: 'https://business.facebook.com/commerce',
    categoria: 'utilidades',
    descripcion: 'Panel para vincular el catálogo de figuras con Instagram Shopping y WhatsApp Business.',
    etiqueta: 'Catálogo Redes',
    esFrecuente: true,
    creado_el: '2026-10-14'
  }
];

function loadItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return fallback;
  }
}

function triggerAutoSyncIfEnabled(key: string): void {
  // Notificar cambio de datos de forma desacoplada
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wjg:data_changed', { detail: { key } }));
  }
}

function saveItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    triggerAutoSyncIfEnabled(key);
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

export const StorageService = {
  getResinas: (): Resina[] => {
    const list = loadItem<Resina[]>(STORAGE_KEYS.RESINAS, RESINAS_INICIALES);
    return list.map(r => ({
      ...r,
      velocidad_impresion_mm_h: r.velocidad_impresion_mm_h || 20.0
    }));
  },
  saveResinas: (items: Resina[]) => saveItem(STORAGE_KEYS.RESINAS, items),

  getInsumos: (): Insumo[] => {
    const loaded = loadItem<Insumo[]>(STORAGE_KEYS.INSUMOS, INSUMOS_INICIALES);
    const existingIds = new Set(loaded.map(i => i.id));
    const missing = INSUMOS_INICIALES.filter(i => !existingIds.has(i.id));
    if (missing.length > 0) {
      const merged = [...loaded, ...missing];
      saveItem(STORAGE_KEYS.INSUMOS, merged);
      return merged;
    }
    return loaded;
  },
  saveInsumos: (items: Insumo[]) => saveItem(STORAGE_KEYS.INSUMOS, items),

  getMaquinas: (): Maquina[] => {
    const loaded = loadItem<Maquina[]>(STORAGE_KEYS.MAQUINAS, MAQUINAS_INICIALES);
    const existingIds = new Set(loaded.map(m => m.id));
    const missing = MAQUINAS_INICIALES.filter(m => !existingIds.has(m.id));
    if (missing.length > 0) {
      const merged = [...loaded, ...missing];
      saveItem(STORAGE_KEYS.MAQUINAS, merged);
      return merged;
    }
    return loaded;
  },
  saveMaquinas: (items: Maquina[]) => saveItem(STORAGE_KEYS.MAQUINAS, items),

  getPersonal: (): Personal[] => loadItem(STORAGE_KEYS.PERSONAL, PERSONAL_INICIAL),
  savePersonal: (items: Personal[]) => saveItem(STORAGE_KEYS.PERSONAL, items),

  getClientes: (): Cliente[] => loadItem(STORAGE_KEYS.CLIENTES, isSupabaseConfigured ? [] : CLIENTES_INICIALES),
  saveClientes: (items: Cliente[]) => saveItem(STORAGE_KEYS.CLIENTES, items),

  getProveedores: (): Proveedor[] => loadItem(STORAGE_KEYS.PROVEEDORES, PROVEEDORES_INICIALES),
  saveProveedores: (items: Proveedor[]) => saveItem(STORAGE_KEYS.PROVEEDORES, items),

  getConfig: (): ConfiguracionTaller => loadItem(STORAGE_KEYS.CONFIG, CONFIGURACION_INICIAL),
  saveConfig: (config: ConfiguracionTaller) => saveItem(STORAGE_KEYS.CONFIG, config),

  getCotizaciones: (): Cotizacion[] => loadItem(STORAGE_KEYS.COTIZACIONES, isSupabaseConfigured ? [] : COTIZACIONES_INICIALES),
  saveCotizaciones: (items: Cotizacion[]) => saveItem(STORAGE_KEYS.COTIZACIONES, items),

  getOrdenes: (): OrdenTrabajo[] => loadItem(STORAGE_KEYS.ORDENES, []),
  saveOrdenes: (items: OrdenTrabajo[]) => saveItem(STORAGE_KEYS.ORDENES, items),

  // Calcula el consecutivo máximo de OT para evitar cualquier colisión o reemplazo
  getNextOTConsecutive: (items?: OrdenTrabajo[]): number => {
    const list = items || loadItem<OrdenTrabajo[]>(STORAGE_KEYS.ORDENES, []);
    let max = 0;
    list.forEach(o => {
      if (o && o.numero_ot) {
        const matches = o.numero_ot.match(/\d+/g);
        if (matches && matches.length > 0) {
          const val = parseInt(matches[matches.length - 1], 10);
          if (!isNaN(val) && val > max) max = val;
        }
      }
    });
    return max;
  },

  getNextOTNumber: (items?: OrdenTrabajo[]): string => {
    const next = StorageService.getNextOTConsecutive(items) + 1;
    return `OT-${next.toString().padStart(4, '0')}`;
  },

  getCuentas: (): CuentaCobro[] => loadItem(STORAGE_KEYS.CUENTAS, []),
  saveCuentas: (items: CuentaCobro[]) => saveItem(STORAGE_KEYS.CUENTAS, items),

  getTarifasTamanos: (): TarifaTamano[] => {
    const loaded = loadItem<TarifaTamano[]>(STORAGE_KEYS.TARIFAS_TAMANOS, TARIFAS_TAMANOS_INICIALES);
    const item5 = loaded.find(t => t.altura_cm === 5);
    if (item5 && item5.precio_sugerido === 45000) {
      saveItem(STORAGE_KEYS.TARIFAS_TAMANOS, TARIFAS_TAMANOS_INICIALES);
      return TARIFAS_TAMANOS_INICIALES;
    }
    return loaded;
  },
  saveTarifasTamanos: (items: TarifaTamano[]) => saveItem(STORAGE_KEYS.TARIFAS_TAMANOS, items),

  getProductosStock: (): ProductoStock[] => loadItem(STORAGE_KEYS.PRODUCTOS_STOCK, isSupabaseConfigured ? [] : PRODUCTOS_STOCK_INICIALES),
  saveProductosStock: (items: ProductoStock[]) => saveItem(STORAGE_KEYS.PRODUCTOS_STOCK, items),

  getVentasExpress: (): VentaExpress[] => loadItem(STORAGE_KEYS.VENTAS_EXPRESS, []),
  saveVentasExpress: (items: VentaExpress[]) => saveItem(STORAGE_KEYS.VENTAS_EXPRESS, items),

  getTareas: (): TareaEquipo[] => loadItem(STORAGE_KEYS.TAREAS, isSupabaseConfigured ? [] : TAREAS_INICIALES),
  saveTareas: (items: TareaEquipo[]) => saveItem(STORAGE_KEYS.TAREAS, items),

  getSolicitudesInsumos: (): SolicitudInsumo[] => loadItem(STORAGE_KEYS.SOLICITUDES_INSUMOS, []),
  saveSolicitudesInsumos: (items: SolicitudInsumo[]) => saveItem(STORAGE_KEYS.SOLICITUDES_INSUMOS, items),

  getHerramientas: (): HerramientaLink[] => loadItem(STORAGE_KEYS.HERRAMIENTAS, HERRAMIENTAS_INICIALES),
  saveHerramientas: (items: HerramientaLink[]) => saveItem(STORAGE_KEYS.HERRAMIENTAS, items),

  // Get structured backup object
  getBackupData: () => {
    return {
      version: '2.0',
      empresa: 'WJGEEKS 3D PRO',
      timestamp: new Date().toISOString(),
      resinas: StorageService.getResinas(),
      insumos: StorageService.getInsumos(),
      maquinas: StorageService.getMaquinas(),
      personal: StorageService.getPersonal(),
      clientes: StorageService.getClientes(),
      config: StorageService.getConfig(),
      cotizaciones: StorageService.getCotizaciones(),
      ordenes: StorageService.getOrdenes(),
      cuentas: StorageService.getCuentas(),
      tarifas_tamanos: StorageService.getTarifasTamanos(),
      productos_stock: StorageService.getProductosStock(),
      ventas_express: StorageService.getVentasExpress(),
      tareas: StorageService.getTareas(),
      solicitudes_insumos: StorageService.getSolicitudesInsumos(),
      herramientas: StorageService.getHerramientas()
    };
  },

  // Obtiene el respaldo completo extrayendo datos en vivo desde Supabase si está disponible
  getFullBackupDataAsync: async () => {
    const local = StorageService.getBackupData();
    const backup: any = {
      ...local,
      version: '3.1',
      empresa: 'WJGEEKS 3D PRO',
      timestamp: new Date().toISOString(),
      fecha_legible: new Date().toLocaleString('es-CO'),
      tablas: {
        resinas: local.resinas,
        insumos: local.insumos,
        maquinas: local.maquinas,
        personal: local.personal,
        configuracion_taller: local.config,
        tarifas_tamanos: local.tarifas_tamanos,
        herramientas: local.herramientas,
        cuentas_cobro: local.cuentas,
        clientes: local.clientes,
        cotizaciones: local.cotizaciones,
        ordenes_trabajo: local.ordenes,
        productos_stock: local.productos_stock,
        ventas_express: local.ventas_express,
        tareas_equipo: local.tareas,
        solicitudes_insumos: local.solicitudes_insumos,
        abonos_pagos: []
      }
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const tablasConsultar = [
          'ordenes_trabajo',
          'abonos_pagos',
          'ventas_express',
          'cotizaciones',
          'cotizacion_items',
          'piezas_cotizacion',
          'productos_stock',
          'clientes',
          'usuarios_taller',
          'tareas_equipo',
          'solicitudes_insumos',
          'configuracion_taller',
          'tarifas_tamanos',
          'resinas',
          'maquinas',
          'insumos'
        ];

        await Promise.all(
          tablasConsultar.map(async (tbl) => {
            try {
              const { data, error } = await supabase!.from(tbl).select('*');
              if (!error && data && data.length > 0) {
                backup.tablas[tbl] = data;
              }
            } catch (_) {}
          })
        );

        if (backup.tablas.clientes?.length) backup.clientes = backup.tablas.clientes;
        if (backup.tablas.ordenes_trabajo?.length) backup.ordenes = backup.tablas.ordenes_trabajo;
        if (backup.tablas.ventas_express?.length) backup.ventas_express = backup.tablas.ventas_express;
        if (backup.tablas.cotizaciones?.length) backup.cotizaciones = backup.tablas.cotizaciones;
        if (backup.tablas.productos_stock?.length) backup.productos_stock = backup.tablas.productos_stock;
        if (backup.tablas.tareas_equipo?.length) backup.tareas = backup.tablas.tareas_equipo;
        if (backup.tablas.solicitudes_insumos?.length) backup.solicitudes_insumos = backup.tablas.solicitudes_insumos;
        if (backup.tablas.abonos_pagos?.length) backup.abonos_pagos = backup.tablas.abonos_pagos;
      } catch (err) {
        console.warn('Aviso extrayendo datos para respaldo de Supabase:', err);
      }
    }

    return backup;
  },

  // Exportar archivo JSON completo (Manual PC / Celular)
  exportBackup: async (): Promise<string> => {
    const backup = await StorageService.getFullBackupDataAsync();
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `WJGEEKS_Backup_${dateStr}_${timeStr}.json`;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return fileName;
  },

  // Exportar hacia Google Drive o Compartir en Celular (Web Share API nativo Android/iOS)
  exportBackupToDriveOrShare: async (): Promise<{ success: boolean; method: 'share' | 'download'; fileName: string; aborted?: boolean }> => {
    const backup = await StorageService.getFullBackupDataAsync();
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `WJGEEKS_Backup_${dateStr}_${timeStr}.json`;
    const jsonStr = JSON.stringify(backup, null, 2);

    // En celulares (Android / iOS): abrir menú de compartir nativo
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([jsonStr], fileName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Copia de Seguridad WJGEEKS 3D',
            text: 'Respaldo de base de datos WJGEEKS 3D PRO para guardar en Google Drive.',
            files: [file]
          });
          return { success: true, method: 'share', fileName };
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, method: 'share', fileName, aborted: true };
        }
        console.warn('Web Share falló, procediendo con descarga estándar:', err);
      }
    }

    // Descarga estándar como fallback en PC o navegadores sin share
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, method: 'download', fileName };
  },

  // Restaurar copia de seguridad desde archivo JSON (soporta V2 plano y V3 con tablas)
  importBackup: (jsonData: string): { success: boolean; stats: Record<string, number> } => {
    try {
      const data = JSON.parse(jsonData);
      const tablas = data.tablas || {};

      const resinas = data.resinas || tablas.resinas;
      const insumos = data.insumos || tablas.insumos;
      const maquinas = data.maquinas || tablas.maquinas;
      const personal = data.personal || tablas.personal || tablas.usuarios_taller;
      const clientes = data.clientes || tablas.clientes;
      const config = data.config || tablas.configuracion_taller;
      const cotizaciones = data.cotizaciones || tablas.cotizaciones;
      const ordenes = data.ordenes || tablas.ordenes_trabajo;
      const cuentas = data.cuentas || tablas.cuentas_cobro;
      const tarifas = data.tarifas_tamanos || tablas.tarifas_tamanos;
      const stock = data.productos_stock || tablas.productos_stock;
      const ventas = data.ventas_express || tablas.ventas_express;
      const tareas = data.tareas || tablas.tareas_equipo;
      const solicitudes = data.solicitudes_insumos || tablas.solicitudes_insumos;
      const herramientas = data.herramientas || tablas.herramientas;

      const stats: Record<string, number> = {};

      if (Array.isArray(resinas)) { StorageService.saveResinas(resinas); stats.resinas = resinas.length; }
      if (Array.isArray(insumos)) { StorageService.saveInsumos(insumos); stats.insumos = insumos.length; }
      if (Array.isArray(maquinas)) { StorageService.saveMaquinas(maquinas); stats.maquinas = maquinas.length; }
      if (Array.isArray(personal)) { StorageService.savePersonal(personal); stats.personal = personal.length; }
      if (Array.isArray(clientes)) { StorageService.saveClientes(clientes); stats.clientes = clientes.length; }
      if (config && typeof config === 'object') { StorageService.saveConfig(config); stats.config = 1; }
      if (Array.isArray(cotizaciones)) { StorageService.saveCotizaciones(cotizaciones); stats.cotizaciones = cotizaciones.length; }
      if (Array.isArray(ordenes)) { StorageService.saveOrdenes(ordenes); stats.ordenes = ordenes.length; }
      if (Array.isArray(cuentas)) { StorageService.saveCuentas(cuentas); stats.cuentas = cuentas.length; }
      if (Array.isArray(tarifas)) { StorageService.saveTarifasTamanos(tarifas); stats.tarifas = tarifas.length; }
      if (Array.isArray(stock)) { StorageService.saveProductosStock(stock); stats.stock = stock.length; }
      if (Array.isArray(ventas)) { StorageService.saveVentasExpress(ventas); stats.ventas = ventas.length; }
      if (Array.isArray(tareas)) { StorageService.saveTareas(tareas); stats.tareas = tareas.length; }
      if (Array.isArray(solicitudes)) { StorageService.saveSolicitudesInsumos(solicitudes); stats.solicitudes = solicitudes.length; }
      if (Array.isArray(herramientas)) { StorageService.saveHerramientas(herramientas); stats.herramientas = herramientas.length; }

      return { success: true, stats };
    } catch (e) {
      console.error('Error importing backup:', e);
      return { success: false, stats: {} };
    }
  }
};
