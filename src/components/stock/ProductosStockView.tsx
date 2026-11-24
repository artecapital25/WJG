import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Camera, 
  Trash2, 
  Edit3, 
  Share2, 
  Check, 
  X, 
  Eye, 
  PlusCircle, 
  MinusCircle, 
  ShoppingCart, 
  Boxes,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { ProductoStock, PiezaCotizada } from '../../types';
import { ImageUploadField } from '../common/ImageUploadField';
import {
  WjgButton,
  WjgConfirmModal,
  WjgModal,
  WjgNumberInput,
  WjgSearchInput,
  WjgSelect,
  toast,
} from '../ui';

interface ProductosStockViewProps {
  productos: ProductoStock[];
  onUpdateProductos: (items: ProductoStock[]) => void;
  onAgregarACotizacion?: (pieza: PiezaCotizada) => void;
  onNavigateToCotizador?: () => void;
  onRefreshStock?: () => Promise<ProductoStock[] | null>;
  onOpenProduccionInterna?: () => void;
}

const CATEGORIAS_PREDEFINIDAS = [
  'Figuras & Miniaturas',
  'Joyería & Accesorios',
  'Llaveros & Aretes',
  'Personalizados',
  'Otros'
];

export const ProductosStockView: React.FC<ProductosStockViewProps> = ({
  productos,
  onUpdateProductos,
  onAgregarACotizacion,
  onNavigateToCotizador,
  onRefreshStock,
  onOpenProduccionInterna
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todos');
  const [soloDisponibles, setSoloDisponibles] = useState<boolean>(false);
  const [soloAlertaStock, setSoloAlertaStock] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Estados de Modales
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; nombre: string } | null>(null);

  // Estados de retroalimentación
  const [copiedCatalog, setCopiedCatalog] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedPieceName, setAddedPieceName] = useState<string | null>(null);

  // Métricas de inventario
  const totalReferencias = productos.length;
  const totalUnidadesStock = productos.reduce((sum, p) => sum + (p.stock_actual || 0), 0);
  const valorTotalInventario = productos.reduce((sum, p) => sum + (p.precio_unitario * (p.stock_actual || 0)), 0);
  const productosAgotados = productos.filter(p => (p.stock_actual || 0) <= 0).length;
  const productosAlerta = productos.filter(p => (p.stock_actual || 0) <= (p.stock_minimo || 2)).length;

  // Normalizar categorías para matching flexible entre UI y Base de Datos (ej: "FIGURAS" <-> "Figuras & Miniaturas")
  const matchCategoriaHelper = (prodCat: string | undefined, selected: string): boolean => {
    if (selected === 'Todos') return true;
    if (!prodCat) return selected === 'Otros';

    const pCat = prodCat.trim().toUpperCase();
    const sCat = selected.trim().toUpperCase();

    if (pCat === sCat) return true;

    if (selected === 'Figuras & Miniaturas') {
      return pCat === 'FIGURAS' || pCat.includes('FIGURA') || pCat.includes('MINIATURA');
    }
    if (selected === 'Joyería & Accesorios') {
      return pCat === 'COLLARES' || pCat === 'ARETES' || pCat.includes('JOYER') || pCat.includes('ACCESORIO');
    }
    if (selected === 'Llaveros & Aretes') {
      return pCat === 'LLAVEROS' || pCat === 'ARETES' || pCat.includes('LLAVERO') || pCat.includes('ARETE');
    }
    if (selected === 'Personalizados') {
      return pCat === 'PERSONALIZADOS' || pCat.includes('PERSONALIZAD');
    }
    if (selected === 'Otros') {
      return !['FIGURAS', 'COLLARES', 'ARETES', 'LLAVEROS', 'PERSONALIZADOS'].includes(pCat);
    }
    return false;
  };

  // Filtrado de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.dimensiones && p.dimensiones.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = matchCategoriaHelper(p.categoria, selectedCategoria);
      const matchStock = !soloDisponibles || (p.stock_actual || 0) > 0;
      const matchAlerta = !soloAlertaStock || (p.stock_actual || 0) <= (p.stock_minimo || 2);

      return matchSearch && matchCat && matchStock && matchAlerta;
    });
  }, [productos, searchTerm, selectedCategoria, soloDisponibles, soloAlertaStock]);

  // Categorías mostradas en los chips (predefinidas + dinámicas de la base de datos)
  const categoriasChips = useMemo(() => {
    const list = ['Todos', ...CATEGORIAS_PREDEFINIDAS];
    const extras = new Set<string>();
    productos.forEach(p => {
      if (p.categoria) {
        const cat = p.categoria.trim();
        const upper = cat.toUpperCase();
        if (!['FIGURAS', 'COLLARES', 'ARETES', 'LLAVEROS', 'PERSONALIZADOS'].includes(upper) &&
            !CATEGORIAS_PREDEFINIDAS.includes(cat)) {
          extras.add(cat);
        }
      }
    });
    return [...list, ...Array.from(extras)];
  }, [productos]);

  // Refresco manual de stock desde Supabase
  const handleManualRefresh = async () => {
    if (!onRefreshStock) return;
    try {
      setIsRefreshing(true);
      const res = await onRefreshStock();
      if (res && res.length > 0) {
        toast.success(`✓ ${res.length} productos de stock sincronizados`);
      } else {
        toast.info('Inventario actualizado.');
      }
    } catch {
      toast.error('Error al sincronizar inventario de stock.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Manejo de Ajuste Rápido de Stock (+ / -)
  const handleAjustarStock = (id: string, delta: number) => {
    const updated = productos.map(p => {
      if (p.id === id) {
        const nuevoStock = Math.max(0, (p.stock_actual || 0) + delta);
        return { ...p, stock_actual: nuevoStock };
      }
      return p;
    });
    onUpdateProductos(updated);
  };

  // Abrir Modal para Crear o Editar
  const handleOpenModal = (prod?: ProductoStock) => {
    if (prod) {
      setEditingItem({ ...prod, isEdit: true });
    } else {
      setEditingItem({
        id: `prod-${Date.now()}`,
        codigo: productos.length + 1,
        nombre: '',
        categoria: 'Figuras & Miniaturas',
        precio_unitario: 45000,
        stock_actual: 1,
        descripcion: '',
        dimensiones: '',
        material: 'Resina UV Alta Definición',
        imagen_url: '',
        isEdit: false
      });
    }
    setShowEditModal(true);
  };

  // Guardar Producto
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.nombre.trim()) {
      toast.warning('Por favor escribe el nombre del producto.');
      return;
    }

    const itemGuardado: ProductoStock = {
      id: editingItem.id,
      codigo: editingItem.codigo || Date.now(),
      nombre: editingItem.nombre.trim(),
      categoria: editingItem.categoria || 'Figuras & Miniaturas',
      precio_unitario: Number(editingItem.precio_unitario) || 0,
      stock_actual: Math.max(0, Number(editingItem.stock_actual) || 0),
      descripcion: editingItem.descripcion || '',
      dimensiones: editingItem.dimensiones || '',
      material: editingItem.material || 'Resina UV Alta Definición',
      imagen_url: editingItem.imagen_url || '',
      fecha_actualizacion: new Date().toISOString()
    };

    let updated: ProductoStock[];
    if (editingItem.isEdit) {
      updated = productos.map(p => p.id === itemGuardado.id ? itemGuardado : p);
    } else {
      updated = [itemGuardado, ...productos];
    }

    onUpdateProductos(updated);
    setShowEditModal(false);
    setEditingItem(null);
  };

  // Eliminar Producto (con modal de confirmación del Design System)
  const handleDeleteProduct = (id: string, nombre: string) => {
    setDeleteConfirmTarget({ id, nombre });
  };

  const confirmDeleteProduct = () => {
    if (!deleteConfirmTarget) return;
    const updated = productos.filter(p => p.id !== deleteConfirmTarget.id);
    onUpdateProductos(updated);
    toast.success(`Producto "${deleteConfirmTarget.nombre}" eliminado del stock.`);
    setDeleteConfirmTarget(null);
  };

  // Enviar Producto Directamente a la Cotización en Borrador
  const handleCargarACotizacion = (prod: ProductoStock) => {
    if (!onAgregarACotizacion) return;

    // Convertir ProductoStock en PiezaCotizada
    const piezaCotizada: PiezaCotizada = {
      id: `pieza-stock-${Date.now()}`,
      nombre_item: `${prod.nombre} (Stock Físico)`,
      cantidad: 1,
      alto_mm: 70, // Referencia base
      ancho_mm: 70,
      profundidad_mm: 70,
      volumen_cm3: 20,
      peso_estimado_g: 25,
      resina_id: 'stock',
      resina_nombre: prod.material || 'Resina UV Alta Definición',
      maquina_id: 'stock',
      maquina_nombre: 'Stock Físico Taller',
      tiempo_impresion_min: 0,
      tiempo_desarrollo_min: 0,
      tiempo_armado_min: 0,
      tiempo_pintura_min: 0,
      costo_energia: 0,
      costo_resina: 0,
      costo_curado: 0,
      costo_insumos: 0,
      costo_mano_obra: 0,
      costo_modelo_comprado: 0,
      costo_base_produccion: Math.round(prod.precio_unitario * 0.6),
      margen_ganancia: 0.40,
      precio_unitario: prod.precio_unitario,
      precio_total: prod.precio_unitario,
      tiempo_entrega: 'Entrega Inmediata (En Stock)',
      descripcion_tecnica: `Producto físico disponible en taller. ${prod.dimensiones ? `Medidas: ${prod.dimensiones}.` : ''} ${prod.descripcion || ''}`.trim(),
      imagen_url: prod.imagen_url || ''
    };

    onAgregarACotizacion(piezaCotizada);
    setAddedPieceName(prod.nombre);
    setTimeout(() => setAddedPieceName(null), 3000);

    if (onNavigateToCotizador) {
      onNavigateToCotizador();
    }
  };

  // Copiar Ficha de Producto Individual para WhatsApp
  const handleCopySingleProduct = async (prod: ProductoStock) => {
    const mensaje = `¡Hola! 👋 En *WJGEEKS 3D* tenemos disponible para entrega inmediata:
✨ *${prod.nombre}*
🏷️ *Precio:* $${prod.precio_unitario.toLocaleString('es-CO')} COP
📦 *Disponibilidad:* ${prod.stock_actual > 0 ? `${prod.stock_actual} unidad(es) lista(s)` : 'Bajo pedido'}
${prod.dimensiones ? `📐 *Medidas:* ${prod.dimensiones}\n` : ''}🎨 *Material:* ${prod.material || 'Resina UV Alta Definición'}
${prod.descripcion ? `💡 *Detalles:* ${prod.descripcion}\n` : ''}
🚀 ¿Deseas que te lo separemos o enviemos hoy mismo?`;

    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiedId(prod.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.error('Error al copiar ficha de producto:', e);
    }
  };

  // Copiar Catálogo Completo en Stock para WhatsApp
  const handleCopyFullCatalog = async () => {
    const disponibles = productos.filter(p => (p.stock_actual || 0) > 0);
    if (disponibles.length === 0) {
      toast.warning('No hay productos con stock mayor a 0 para generar el catálogo.');
      return;
    }

    const itemsText = disponibles
      .map(p => `• *${p.nombre}* ${p.dimensiones ? `(${p.dimensiones})` : ''} ➔ *$${p.precio_unitario.toLocaleString('es-CO')} COP* [Disponibles: ${p.stock_actual}]`)
      .join('\n');

    const mensaje = `📦 *PRODUCTOS DISPONIBLES EN STOCK — WJGEEKS 3D* 🚀
_Figuras, Miniaturas y Accesorios listos para entrega inmediata_

${itemsText}

⚡ *Entrega Inmediata:* No tienes que esperar tiempo de impresión ni curado.
🎨 *Calidad:* Resina UV de máxima definición sin líneas visibles de capa.
📲 Escríbenos cuál deseas apartar antes de que se agoten.`;

    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiedCatalog(true);
      setTimeout(() => setCopiedCatalog(false), 2500);
    } catch (e) {
      console.error('Error copiando catálogo de stock:', e);
    }
  };

  return (
    <div>
      {/* ENCABEZADO DE SECCIÓN */}
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title">
            <Package size={22} color="var(--brand-cyan)" />
            <span>Productos en Stock & Entrega Inmediata</span>
          </h2>
          <p className="section-subtitle">
            Inventario físico de figuras, coleccionables y accesorios listos para venta y entrega directa
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${copiedCatalog ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={handleCopyFullCatalog}
            title="Copiar lista de productos disponibles para enviar por WhatsApp"
          >
            {copiedCatalog ? <Check size={14} /> : <Share2 size={14} />}
            <span>{copiedCatalog ? '¡Catálogo Copiado! 🎉' : 'Copiar Catálogo WhatsApp'}</span>
          </button>

          {onRefreshStock && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Sincronizar productos en stock directamente desde Supabase"
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
            </button>
          )}

          {onOpenProduccionInterna && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onOpenProduccionInterna}
              style={{ border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', fontWeight: 700 }}
              title="Registrar piezas de exhibición, vitrina, pruebas de calibración o fallas"
            >
              <span>🧪 Pruebas & Exhibición</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-cyan btn-sm"
            onClick={() => handleOpenModal()}
          >
            <Plus size={15} />
            <span>Agregar Producto a Stock</span>
          </button>
        </div>
      </div>

      {/* ALERTA DE PRODUCTO AGREGADO A COTIZACIÓN */}
      {addedPieceName && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 600, fontSize: '0.88rem' }}>
            <Check size={16} />
            <span>¡"{addedPieceName}" fue agregado exitosamente a tu cotización!</span>
          </div>
          {onNavigateToCotizador && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onNavigateToCotizador}
              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
            >
              <span>Ver Cotización</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* METRICAS / KPIS DEL INVENTARIO EN STOCK */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '18px'
      }}>
        <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Boxes size={14} color="var(--brand-cyan)" />
            <span>Referencias Activas</span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
            {totalReferencias}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={14} color="#34d399" />
            <span>Unidades en Taller</span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {totalUnidadesStock} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>und</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} color="#38bdf8" />
            <span>Valor del Inventario</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            ${valorTotalInventario.toLocaleString('es-CO')} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COP</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} color={productosAgotados > 0 ? '#fbbf24' : '#64748b'} />
            <span>Agotados / Por Producir</span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: productosAgotados > 0 ? '#fbbf24' : '#64748b', marginTop: '4px' }}>
            {productosAgotados}
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS & BUSCADOR */}
      <div className="glass-card" style={{ padding: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Input de búsqueda */}
          <div style={{ flex: '1 1 260px' }}>
            <WjgSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar figura por nombre, medida o detalle..."
            />
          </div>

          {/* Toggles Rápidos de Stock */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: soloDisponibles ? 'var(--brand-cyan)' : 'var(--text-muted)', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={soloDisponibles}
                onChange={e => setSoloDisponibles(e.target.checked)}
                style={{ accentColor: 'var(--brand-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Solo disponibles (&gt; 0)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: soloAlertaStock ? '#fbbf24' : 'var(--text-muted)', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={soloAlertaStock}
                onChange={e => setSoloAlertaStock(e.target.checked)}
                style={{ accentColor: '#f59e0b', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>⚠️ Stock Bajo / Agotado ({productosAlerta})</span>
            </label>
          </div>
        </div>

        {/* Chips de categorías */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
          {categoriasChips.map(cat => {
            const isSelected = selectedCategoria === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${isSelected ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => setSelectedCategoria(cat)}
                style={{ fontSize: '0.75rem', padding: '4px 12px', whiteSpace: 'nowrap' }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS EN STOCK */}
      {productosFiltrados.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1rem', color: '#fff', margin: '0 0 6px' }}>No se encontraron productos</h3>
          <p style={{ fontSize: '0.8rem', margin: 0 }}>
            {searchTerm || selectedCategoria !== 'Todos'
              ? 'Prueba ajustando el término de búsqueda o la categoría seleccionada.'
              : 'Aún no has agregado productos al stock. Haz clic en "Agregar Producto a Stock" arriba.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '14px'
        }}>
          {productosFiltrados.map(prod => {
            const stockActual = prod.stock_actual || 0;
            const stockMin = prod.stock_minimo || 2;
            const hasStock = stockActual > 0;
            const isLowStock = hasStock && stockActual <= stockMin;
            const isCopied = copiedId === prod.id;

            return (
              <div
                key={prod.id}
                className="glass-card"
                style={{
                  margin: 0,
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  borderColor: !hasStock ? 'rgba(239, 68, 68, 0.35)' : isLowStock ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)',
                  contentVisibility: 'auto',
                  containIntrinsicSize: '0 380px'
                }}
              >
                {/* CABECERA DE LA TARJETA: FOTO + DATOS BÁSICOS */}
                <div>
                  <div style={{
                    width: '100%',
                    height: '180px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: '#090d15',
                    position: 'relative',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px'
                  }}>
                    {prod.imagen_url ? (
                      <>
                        <img
                          src={prod.imagen_url}
                          alt={prod.nombre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setPreviewImage({ url: prod.imagen_url!, title: prod.nombre })}
                          title="Clic para ver en tamaño completo"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: prod.imagen_url!, title: prod.nombre })}
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            color: '#fff'
                          }}
                          title="Ver imagen completa"
                        >
                          <Eye size={13} />
                        </button>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Package size={36} style={{ opacity: 0.3, margin: '0 auto 6px' }} />
                        <div style={{ fontSize: '0.72rem' }}>Sin foto asignada</div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.68rem', padding: '3px 8px', marginTop: '6px' }}
                          onClick={() => handleOpenModal(prod)}
                        >
                          <Camera size={12} />
                          <span>+ Subir Foto</span>
                        </button>
                      </div>
                    )}

                    {/* Badge Semáforo de Stock en la Foto */}
                    <div
                      className={`wjg-stock-pill ${!hasStock ? 'stock-empty' : isLowStock ? 'stock-low' : 'stock-ok'}`}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backdropFilter: 'blur(8px)',
                        background: !hasStock
                          ? 'rgba(239, 68, 68, 0.9)'
                          : isLowStock
                            ? 'rgba(217, 119, 6, 0.92)'
                            : 'rgba(16, 185, 129, 0.9)',
                        color: '#fff'
                      }}
                    >
                      {!hasStock ? 'Agotado' : isLowStock ? `Stock Bajo (${stockActual})` : `Disponible: ${stockActual}`}
                    </div>

                    {/* Categoría chip */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backdropFilter: 'blur(8px)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: 'var(--brand-cyan)',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                      {prod.categoria}
                    </div>
                  </div>

                  {/* Nombre y Precio */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                      {prod.nombre}
                    </h3>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
                        ${prod.precio_unitario.toLocaleString('es-CO')}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>COP</div>
                    </div>
                  </div>

                  {/* Dimensiones y Material */}
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {prod.dimensiones && (
                      <div>📐 <strong>Medidas:</strong> {prod.dimensiones}</div>
                    )}
                    {prod.material && (
                      <div>🎨 <strong>Material:</strong> {prod.material}</div>
                    )}
                    {prod.descripcion && (
                      <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px' }}>
                        {prod.descripcion}
                      </div>
                    )}
                  </div>
                </div>

                {/* CONTROLES RÁPIDOS DE STOCK & ACCIONES */}
                <div>
                  {/* Stepper rápido de Stock físico */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Inventario Físico:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleAjustarStock(prod.id, -1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: prod.stock_actual > 0 ? '#ef4444' : 'var(--text-muted)',
                          cursor: prod.stock_actual > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          padding: '2px'
                        }}
                        disabled={prod.stock_actual <= 0}
                        title="Restar 1 unidad vendida"
                      >
                        <MinusCircle size={18} />
                      </button>

                      <span style={{ fontWeight: 800, fontSize: '0.95rem', minWidth: '24px', textAlign: 'center', color: hasStock ? '#fff' : '#ef4444' }}>
                        {prod.stock_actual}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAjustarStock(prod.id, 1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#34d399',
                          cursor: 'pointer',
                          display: 'flex',
                          padding: '2px'
                        }}
                        title="Sumar 1 unidad producida"
                      >
                        <PlusCircle size={18} />
                      </button>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN: AGREGAR A COTIZACIÓN, WHATSAPP, EDITAR, ELIMINAR */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {onAgregarACotizacion && (
                      <button
                        type="button"
                        className="btn btn-cyan btn-sm"
                        onClick={() => handleCargarACotizacion(prod)}
                        style={{ width: '100%', fontSize: '0.78rem', justifyContent: 'center' }}
                        title="Agregar esta figura directamente al borrador de cotización"
                      >
                        <ShoppingCart size={13} />
                        <span>Agregar a Cotización</span>
                      </button>
                    )}

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: '0.74rem', padding: '5px 8px', justifyContent: 'center' }}
                        onClick={() => handleCopySingleProduct(prod)}
                        title="Copiar texto de venta para WhatsApp"
                      >
                        {isCopied ? <Check size={12} color="#34d399" /> : <Share2 size={12} />}
                        <span>{isCopied ? '¡Copiado!' : 'WhatsApp'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px' }}
                        onClick={() => handleOpenModal(prod)}
                        title="Editar producto"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '5px 8px' }}
                        onClick={() => handleDeleteProduct(prod.id, prod.nombre)}
                        title="Eliminar del stock"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {editingItem && (
        <WjgModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={editingItem.isEdit ? 'Editar Producto en Stock' : 'Nuevo Producto en Stock'}
          icon={<Package size={18} />}
          maxWidth="580px"
        >
          <form onSubmit={handleSaveProduct}>
            {/* SUBIDA DE FOTO */}
            <ImageUploadField
              label="Foto de la Figura o Producto"
              helperText="Toma foto en el taller con la cámara del celular, sube un archivo o pega un enlace."
              value={editingItem.imagen_url || ''}
              onChange={(url) => setEditingItem({ ...editingItem, imagen_url: url })}
            />

            {/* Nombre y Categoría */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Nombre del Producto *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingItem.nombre}
                  onChange={e => setEditingItem({ ...editingItem, nombre: e.target.value })}
                  placeholder="Ej: Figura Tanjiro Chibi 7cm"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría *</label>
                <WjgSelect
                  value={editingItem.categoria}
                  onChange={(val) => setEditingItem({ ...editingItem, categoria: val })}
                  options={CATEGORIAS_PREDEFINIDAS.map(c => ({ value: c, label: c }))}
                />
              </div>
            </div>

            {/* Precio y Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <WjgNumberInput
                  label="Precio de Venta ($ COP) *"
                  unit="COP"
                  min={0}
                  step="any"
                  required
                  value={editingItem.precio_unitario}
                  onChange={val => setEditingItem({ ...editingItem, precio_unitario: val })}
                />
              </div>

              <div className="form-group">
                <WjgNumberInput
                  label="Unidades en Stock *"
                  unit="und"
                  min={0}
                  step="any"
                  required
                  allowZeroDisplay
                  value={editingItem.stock_actual}
                  onChange={val => setEditingItem({ ...editingItem, stock_actual: Math.round(val) })}
                />
              </div>
            </div>

            {/* Dimensiones y Material */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Dimensiones / Medidas</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingItem.dimensiones}
                  onChange={e => setEditingItem({ ...editingItem, dimensiones: e.target.value })}
                  placeholder="Ej: 7 cm de alto / 15x8 cm"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Material / Acabado</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingItem.material}
                  onChange={e => setEditingItem({ ...editingItem, material: e.target.value })}
                  placeholder="Ej: Resina UV Alta Definición"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="form-group">
              <label className="form-label">Descripción o Notas</label>
              <textarea
                className="form-input"
                rows={2}
                value={editingItem.descripcion}
                onChange={e => setEditingItem({ ...editingItem, descripcion: e.target.value })}
                placeholder="Detalles sobre pintura, base, piezas desmontables, etc."
              />
            </div>

            {/* Botones de Guardar */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <WjgButton type="submit" variant="save" style={{ flex: 1 }}>
                Guardar Producto
              </WjgButton>
              <WjgButton
                type="button"
                variant="secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </WjgButton>
            </div>
          </form>
        </WjgModal>
      )}

      {/* MODAL LIGHTBOX PARA VER FOTO EN TAMAÑO COMPLETO */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              background: 'var(--bg-card, #0f172a)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '16px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                {previewImage.title}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewImage(null)}
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: '10px', background: '#090d15', minHeight: '200px' }}>
              <img
                src={previewImage.url}
                alt={previewImage.title}
                style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      <WjgConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={confirmDeleteProduct}
        title="Eliminar Producto de Stock"
        message={
          deleteConfirmTarget
            ? `¿Estás seguro de eliminar el producto "${deleteConfirmTarget.nombre}" del stock? Esta acción actualizará la caché y Supabase.`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};
