import { describe, it, expect, beforeEach } from 'vitest';
import { Resina, Insumo, Maquina, ProductoStock } from '../../types';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorageMock() as any;
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: globalThis.localStorage,
    dispatchEvent: () => true
  };
} else if (!(globalThis as any).window.dispatchEvent) {
  (globalThis as any).window.dispatchEvent = () => true;
}

// Import StorageService after localStorage is mocked
import { StorageService } from '../storageService';

describe('Soporte Fotográfico en Inventarios y Catálogos', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('debe persistir y recuperar imagen_url en Resinas', () => {
    const mockResina: Resina = {
      id: 'res-test-1',
      tipo: 'Resina Anycubic Standard',
      marca: 'Anycubic',
      color: 'Gris',
      volumen_l: 1.0,
      densidad_g_cm3: 1.13,
      peso_g: 1130,
      precio_compra: 89000,
      costo_gramo: 78.76,
      velocidad_impresion_mm_h: 22.0,
      resumen: 'Resina Standard Gris',
      imagen_url: 'data:image/jpeg;base64,mockResinaPhotoData'
    };

    StorageService.saveResinas([mockResina]);
    const loaded = StorageService.getResinas();

    const found = loaded.find(r => r.id === 'res-test-1');
    expect(found).toBeDefined();
    expect(found?.imagen_url).toBe('data:image/jpeg;base64,mockResinaPhotoData');
  });

  it('debe persistir y recuperar imagen_url en Insumos (pescadores, tornillos, imanes)', () => {
    const mockInsumo: Insumo = {
      id: 'ins-test-pescador',
      codigo: 99,
      nombre: 'Pescador Bisuteria Acero Inox',
      marca: 'WJ Accesorios',
      categoria: 'Bisutería',
      presentacion: 100,
      costo_total: 25000,
      costo_unitario: 250,
      imagen_url: 'https://example.com/pescador-bisuteria.jpg'
    };

    StorageService.saveInsumos([mockInsumo]);
    const loaded = StorageService.getInsumos();

    const found = loaded.find(i => i.id === 'ins-test-pescador');
    expect(found).toBeDefined();
    expect(found?.imagen_url).toBe('https://example.com/pescador-bisuteria.jpg');
    expect(found?.nombre).toBe('Pescador Bisuteria Acero Inox');
  });

  it('debe persistir y recuperar imagen_url en Maquinaria', () => {
    const mockMaquina: Maquina = {
      id: 'maq-test-saturn',
      nombre: 'Elegoo Saturn 4 Ultra',
      tipo: 'Impresora 3D Resina 12K',
      consumo_kwh: 0.12,
      costo_minuto: 1.8,
      estado: 'Disponible',
      imagen_url: 'data:image/jpeg;base64,mockPrinterPhotoData'
    };

    StorageService.saveMaquinas([mockMaquina]);
    const loaded = StorageService.getMaquinas();

    const found = loaded.find(m => m.id === 'maq-test-saturn');
    expect(found).toBeDefined();
    expect(found?.imagen_url).toBe('data:image/jpeg;base64,mockPrinterPhotoData');
    expect(found?.estado).toBe('Disponible');
  });

  it('debe persistir y recuperar imagen_url en Productos de Stock Físico', () => {
    const mockStock: ProductoStock = {
      id: 'prod-stock-batman',
      codigo: 101,
      nombre: 'Figura Batman Arkham 18cm',
      categoria: 'Figuras & Miniaturas',
      precio_unitario: 85000,
      stock_actual: 3,
      descripcion: 'Pintado a mano con aerógrafo',
      material: 'Resina UV Alta Definición',
      imagen_url: 'data:image/png;base64,mockBatmanPhoto'
    };

    StorageService.saveProductosStock([mockStock]);
    const loaded = StorageService.getProductosStock();

    const found = loaded.find(p => p.id === 'prod-stock-batman');
    expect(found).toBeDefined();
    expect(found?.imagen_url).toBe('data:image/png;base64,mockBatmanPhoto');
    expect(found?.stock_actual).toBe(3);
  });
});
