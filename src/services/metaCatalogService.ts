/**
 * Servicio de Generación de Catálogo y Feed Oficial para Meta Business & Instagram Shopping (@WJGEEKS3D).
 * Cumple con las especificaciones canónicas de Meta Commerce Manager para feeds de productos (CSV / JSON).
 */

import { ProductoStock, Filamento, Resina } from '../types';

export interface MetaCatalogItem {
  id: string;
  title: string;
  description: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new';
  price: string; // ej: "75000.00 COP"
  link: string;
  image_link: string;
  brand: string;
  google_product_category?: string;
  fb_product_category?: string;
  material?: string;
}

export const MetaCatalogService = {
  /**
   * Genera la lista unificada de productos para el catálogo de Meta Business
   */
  buildCatalogItems: (
    productosStock: ProductoStock[] = [],
    filamentos: Filamento[] = [],
    resinas: Resina[] = []
  ): MetaCatalogItem[] => {
    const items: MetaCatalogItem[] = [];
    const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wjg-pro.vercel.app';
    const defaultPlaceholderImg = 'https://images.unsplash.com/photo-1633493106115-0558b97587ef?auto=format&fit=crop&w=600&q=80';

    // 1. Productos Físicos en Stock (Figuras 3D terminadas, dioramas, etc.)
    productosStock.forEach(p => {
      const precioNum = Number(p.precio_unitario || 0);
      const stockNum = Number(p.stock_actual || 0);
      items.push({
        id: `WJG-STOCK-${p.codigo || p.id}`,
        title: `${p.nombre} — Figura 3D`,
        description: `${p.descripcion || 'Impresión y acabado 3D artesanal de alta fidelidad por WJGEEKS 3D PRO.'} Dimensiones: ${p.dimensiones || 'Personalizadas'}.`,
        availability: stockNum > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        price: `${precioNum.toFixed(2)} COP`,
        link: `${appBaseUrl}?producto=${encodeURIComponent(p.id)}`,
        image_link: p.imagen_url || defaultPlaceholderImg,
        brand: 'WJGEEKS 3D',
        google_product_category: 'Arts & Entertainment > Hobbies & Creative Arts > Crafts & Hobbies',
        fb_product_category: 'Decoración y Figuras 3D',
        material: p.material || p.categoria || 'Impresión 3D'
      });
    });

    // 2. Filamentos Premium (Arrow PLA / PETG)
    filamentos.forEach(f => {
      const precioRollo = Number(f.precio_compra || 85000);
      const stockGramos = Number(f.stock_actual_g || 0);
      items.push({
        id: `WJG-FIL-${f.id}`,
        title: `Filamento ${f.marca} ${f.tipo} ${f.color} (1 kg) — Impresión FDM`,
        description: `Bobina de filamento técnico ${f.marca} ${f.tipo} de 1.75mm. Color: ${f.color}. Temperatura recomendada: ${f.temperatura_nozzle || 215}°C. Especial para impresión 3D de alta velocidad.`,
        availability: stockGramos >= 500 ? 'in stock' : 'out of stock',
        condition: 'new',
        price: `${precioRollo.toFixed(2)} COP`,
        link: f.enlace_compra || `${appBaseUrl}?material=${encodeURIComponent(f.id)}`,
        image_link: f.imagen_url || defaultPlaceholderImg,
        brand: f.marca || 'Arrow 3D',
        google_product_category: 'Hardware > Tools > 3D Printer Accessories > 3D Printing Filament',
        fb_product_category: 'Filamentos 3D',
        material: `${f.tipo} ${f.color}`
      });
    });

    // 3. Resinas Técnicas (Anycubic / Elegoo)
    resinas.forEach(r => {
      const precioBotella = (r.precio_compra || 95000);
      items.push({
        id: `WJG-RES-${r.id}`,
        title: `Resina 3D ${r.marca} ${r.tipo} ${r.color} (1 Litro)`,
        description: `Fotopolímero líquido ${r.marca} ${r.tipo} para impresoras MSLA/LCD. Color: ${r.color}. Alta resolución para miniaturas y prototipos industriales.`,
        availability: 'in stock',
        condition: 'new',
        price: `${precioBotella.toFixed(2)} COP`,
        link: `${appBaseUrl}?resina=${encodeURIComponent(r.id)}`,
        image_link: r.imagen_url || defaultPlaceholderImg,
        brand: r.marca || 'Anycubic',
        google_product_category: 'Hardware > Tools > 3D Printer Accessories',
        fb_product_category: 'Resinas 3D',
        material: `${r.tipo} ${r.color}`
      });
    });

    return items;
  },

  /**
   * Convierte los productos a un archivo CSV estándar para Meta Commerce Manager
   */
  generateCSV: (items: MetaCatalogItem[]): string => {
    const headers = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
      'google_product_category',
      'fb_product_category',
      'material'
    ];

    const escapeCSV = (str: string = '') => {
      const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = items.map(item => [
      escapeCSV(item.id),
      escapeCSV(item.title),
      escapeCSV(item.description),
      escapeCSV(item.availability),
      escapeCSV(item.condition),
      escapeCSV(item.price),
      escapeCSV(item.link),
      escapeCSV(item.image_link),
      escapeCSV(item.brand),
      escapeCSV(item.google_product_category || ''),
      escapeCSV(item.fb_product_category || ''),
      escapeCSV(item.material || '')
    ].join(','));

    return [headers.join(','), ...rows].join('\r\n');
  },

  /**
   * Descarga directamente el feed CSV en el dispositivo del usuario
   */
  downloadMetaCSV: (items: MetaCatalogItem[], filename = 'catalogo_meta_instagram_wjgeeks.csv'): void => {
    const csvContent = MetaCatalogService.generateCSV(items);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
