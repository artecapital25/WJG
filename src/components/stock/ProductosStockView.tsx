import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Camera, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Share2, 
  Check, 
  X, 
  Eye, 
  PlusCircle, 
  MinusCircle, 
  ShoppingCart, 
  Tag, 
  Boxes,
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { ProductoStock, PiezaCotizada } from '../../types';
import { processAndOptimizeImage } from '../../services/imageService';

interface ProductosStockViewProps {
  productos: ProductoStock[];
  onUpdateProductos: (items: ProductoStock[]) => void;
  onAgregarACotizacion?: (pieza: PiezaCotizada) => void;
  onNavigateToCotizador?: () => void;
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
  onNavigateToCotizador
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todos');
  const [soloDisponibles, setSoloDisponibles] = useState<boolean>(false);

  // Estados de Modales
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Estados de retroalimentación
  const [copiedCatalog, setCopiedCatalog] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedPieceName, setAddedPieceName] = useState<string | null>(null);

  // Métricas de inventario
  const totalReferencias = productos.length;
  const totalUnidadesStock = productos.reduce((sum, p) => sum + (p.stock_actual || 0), 0);
  const valorTotalInventario = productos.reduce((sum, p) => sum + (p.precio_unitario * (p.stock_actual || 0)), 0);
  const productosAgotados = productos.filter(p => (p.stock_actual || 0) <= 0).length;

  // Filtrado de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.dimensiones && p.dimensiones.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategoria === 'Todos' || p.categoria === selectedCategoria;
      const matchStock = !soloDisponibles || (p.stock_actual || 0) > 0;

      return matchSearch && matchCat && matchStock;
    });
  }, [productos, searchTerm, selectedCategoria, soloDisponibles]);

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

  // Subir o cambiar foto de producto
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen (PNG, JPG o WebP).');
      return;
    }
    try {
      setIsOptimizingImage(true);
      const optimized = await processAndOptimizeImage(file, 800, 800, 0.85);
      setEditingItem((prev: any) => ({ ...prev, imagen_url: optimized }));
    } catch (e) {
      console.error('Error optimizando imagen del producto:', e);
    } finally {
      setIsOptimizingImage(false);
    }
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
      alert('Por favor escribe el nombre del producto.');
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

  // Eliminar Producto
  const handleDeleteProduct = (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar el producto "${nombre}" del stock?`)) {
      const updated = productos.filter(p => p.id !== id);
      onUpdateProductos(updated);
    }
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
      alert('No hay productos con stock mayor a 0 para generar el catálogo.');
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
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar figura por nombre, medida o detalle..."
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Toggle Solo Disponibles */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: soloDisponibles ? 'var(--brand-cyan)' : 'var(--text-muted)', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={e => setSoloDisponibles(e.target.checked)}
              style={{ accentColor: 'var(--brand-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Solo con stock disponible (&gt; 0)</span>
          </label>
        </div>

        {/* Chips de categorías */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
          {['Todos', ...CATEGORIAS_PREDEFINIDAS].map(cat => {
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
            const hasStock = (prod.stock_actual || 0) > 0;
            const isLowStock = prod.stock_actual === 1;
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
                  borderColor: hasStock ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.25)'
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

                    {/* Badge de Stock en la Foto */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      backdropFilter: 'blur(8px)',
                      background: !hasStock 
                        ? 'rgba(239, 68, 68, 0.85)' 
                        : isLowStock 
                          ? 'rgba(234, 179, 8, 0.85)' 
                          : 'rgba(16, 185, 129, 0.85)',
                      color: '#fff'
                    }}>
                      {!hasStock ? 'Agotado' : isLowStock ? 'Última Unidad' : `Stock: ${prod.stock_actual}`}
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
      {showEditModal && editingItem && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="var(--brand-cyan)" />
                <span>{editingItem.isEdit ? 'Editar Producto en Stock' : 'Nuevo Producto en Stock'}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowEditModal(false)}
                style={{ padding: '5px', borderRadius: '50%' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              {/* SUBIDA DE FOTO */}
              <div className="form-group">
                <label className="form-label">Foto de la Figura o Producto</label>
                {editingItem.imagen_url ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                  }}>
                    <img
                      src={editingItem.imagen_url}
                      alt="Previsualización"
                      style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, fontSize: '0.78rem', color: '#fff' }}>
                      Foto cargada exitosamente
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setEditingItem({ ...editingItem, imagen_url: '' })}
                      style={{ padding: '5px 8px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: 'rgba(0, 0, 0, 0.25)',
                    gap: '8px'
                  }}>
                    <Camera size={24} color="var(--brand-cyan)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                      Tomar Foto o Subir desde Galería / Archivo
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      PNG, JPG o WebP (se optimizará automáticamente)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
                {isOptimizingImage && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-cyan)', marginTop: '4px' }}>
                    Optimizando imagen...
                  </div>
                )}
              </div>

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
                  <select
                    className="form-select"
                    value={editingItem.categoria}
                    onChange={e => setEditingItem({ ...editingItem, categoria: e.target.value })}
                  >
                    {CATEGORIAS_PREDEFINIDAS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Precio y Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Precio de Venta ($ COP) *</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editingItem.precio_unitario}
                      onChange={e => setEditingItem({ ...editingItem, precio_unitario: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="500"
                      required
                    />
                    <span className="input-unit-badge">COP</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Unidades en Stock *</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editingItem.stock_actual}
                      onChange={e => setEditingItem({ ...editingItem, stock_actual: parseInt(e.target.value) || 0 })}
                      min="0"
                      required
                    />
                    <span className="input-unit-badge">unidades</span>
                  </div>
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
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Guardar Producto
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
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
    </div>
  );
};
