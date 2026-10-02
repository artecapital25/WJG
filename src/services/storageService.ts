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
  ProductoStock
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
  PRODUCTOS_STOCK: 'wjg_productos_stock'
};

function loadItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return fallback;
  }
}

function saveItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
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

  getClientes: (): Cliente[] => loadItem(STORAGE_KEYS.CLIENTES, CLIENTES_INICIALES),
  saveClientes: (items: Cliente[]) => saveItem(STORAGE_KEYS.CLIENTES, items),

  getProveedores: (): Proveedor[] => loadItem(STORAGE_KEYS.PROVEEDORES, PROVEEDORES_INICIALES),
  saveProveedores: (items: Proveedor[]) => saveItem(STORAGE_KEYS.PROVEEDORES, items),

  getConfig: (): ConfiguracionTaller => loadItem(STORAGE_KEYS.CONFIG, CONFIGURACION_INICIAL),
  saveConfig: (config: ConfiguracionTaller) => saveItem(STORAGE_KEYS.CONFIG, config),

  getCotizaciones: (): Cotizacion[] => loadItem(STORAGE_KEYS.COTIZACIONES, COTIZACIONES_INICIALES),
  saveCotizaciones: (items: Cotizacion[]) => saveItem(STORAGE_KEYS.COTIZACIONES, items),

  getOrdenes: (): OrdenTrabajo[] => loadItem(STORAGE_KEYS.ORDENES, []),
  saveOrdenes: (items: OrdenTrabajo[]) => saveItem(STORAGE_KEYS.ORDENES, items),

  getCuentas: (): CuentaCobro[] => loadItem(STORAGE_KEYS.CUENTAS, []),
  saveCuentas: (items: CuentaCobro[]) => saveItem(STORAGE_KEYS.CUENTAS, items),

  getTarifasTamanos: (): TarifaTamano[] => loadItem(STORAGE_KEYS.TARIFAS_TAMANOS, TARIFAS_TAMANOS_INICIALES),
  saveTarifasTamanos: (items: TarifaTamano[]) => saveItem(STORAGE_KEYS.TARIFAS_TAMANOS, items),

  getProductosStock: (): ProductoStock[] => loadItem(STORAGE_KEYS.PRODUCTOS_STOCK, PRODUCTOS_STOCK_INICIALES),
  saveProductosStock: (items: ProductoStock[]) => saveItem(STORAGE_KEYS.PRODUCTOS_STOCK, items),

  // Export full backup
  exportBackup: () => {
    const backup = {
      version: '1.0',
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
      productos_stock: StorageService.getProductosStock()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WJGEEKS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Import full backup
  importBackup: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.resinas) StorageService.saveResinas(data.resinas);
      if (data.insumos) StorageService.saveInsumos(data.insumos);
      if (data.maquinas) StorageService.saveMaquinas(data.maquinas);
      if (data.personal) StorageService.savePersonal(data.personal);
      if (data.clientes) StorageService.saveClientes(data.clientes);
      if (data.config) StorageService.saveConfig(data.config);
      if (data.cotizaciones) StorageService.saveCotizaciones(data.cotizaciones);
      if (data.ordenes) StorageService.saveOrdenes(data.ordenes);
      if (data.cuentas) StorageService.saveCuentas(data.cuentas);
      if (data.tarifas_tamanos) StorageService.saveTarifasTamanos(data.tarifas_tamanos);
      if (data.productos_stock) StorageService.saveProductosStock(data.productos_stock);
      return true;
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  }
};
