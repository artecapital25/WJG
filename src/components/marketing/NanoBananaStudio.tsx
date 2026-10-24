import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  MessageCircle, 
  RefreshCw, 
  Sliders, 
  Eye, 
  Share2, 
  Tag, 
  Layers, 
  Smartphone, 
  Monitor, 
  Image as ImageIcon,
  CheckCircle2,
  Wand2,
  Camera,
  Flame,
  ShoppingBag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProductoStock, TarifaTamano, ConfiguracionTaller } from '../../types';
import { 
  FORMATOS_PRESETS, 
  ESTILOS_VISUALES, 
  FormatoRedSocial, 
  EstiloVisualId, 
  FormatoPreset,
  EstiloVisual,
  construirPromptNanoBanana, 
  construirUrlNanoBanana, 
  renderizarCanvasConBranding,
  copiarImagenAlPortapapeles,
  BrandingOverlayConfig 
} from '../../services/imageGenerationService';
import { openWhatsApp, formatWhatsAppPhone } from '../../services/whatsappService';
import { toast } from '../ui/ToastProvider';

interface NanoBananaStudioProps {
  productosStock: ProductoStock[];
  tarifasTamanos: TarifaTamano[];
  config: ConfiguracionTaller;
  onUpdateProductoStock?: (prod: ProductoStock) => void;
  initialProducto?: ProductoStock | null;
}

export const NanoBananaStudio: React.FC<NanoBananaStudioProps> = ({
  productosStock,
  tarifasTamanos,
  config,
  onUpdateProductoStock,
  initialProducto
}) => {
  // Selección de Producto / Tarifario
  const [selectedProdId, setSelectedProdId] = useState<string>(initialProducto?.id || '');
  const [nombreFigura, setNombreFigura] = useState<string>(initialProducto?.nombre || '');
  const [precioCOP, setPrecioCOP] = useState<number>(initialProducto?.precio_unitario || 0);
  const [medidaCm, setMedidaCm] = useState<string>(initialProducto?.dimensiones || '10 cm');
  const [detallesAdicionales, setDetallesAdicionales] = useState<string>('');

  // Parámetros de Generación
  const [formatoId, setFormatoId] = useState<FormatoRedSocial>('instagram_portrait'); // 4:5 por defecto
  const [estiloId, setEstiloId] = useState<EstiloVisualId>('estudio_comercial');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 8999999) + 1000000);

  // Estados de Branding Overlay
  const [mostrarLogo, setMostrarLogo] = useState<boolean>(true);
  const [mostrarPrecio, setMostrarPrecio] = useState<boolean>(true);
  const [mostrarMedida, setMostrarMedida] = useState<boolean>(true);
  const [mostrarWhatsApp, setMostrarWhatsApp] = useState<boolean>(true);

  // Estado de Generación
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [rawImageUrl, setRawImageUrl] = useState<string>('');
  const [brandedImageUrl, setBrandedImageUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [geminiOptimizing, setGeminiOptimizing] = useState<boolean>(false);

  const formatoActual: FormatoPreset = useMemo(() => {
    return FORMATOS_PRESETS.find(f => f.id === formatoId) || FORMATOS_PRESETS[1];
  }, [formatoId]);

  const estiloActual: EstiloVisual = useMemo(() => {
    return ESTILOS_VISUALES.find(e => e.id === estiloId) || ESTILOS_VISUALES[0];
  }, [estiloId]);

  // Sincronizar selección de producto
  const handleSelectProducto = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedProdId(id);
    if (!id) return;

    if (id.startsWith('tarifa-')) {
      const altCm = Number(id.replace('tarifa-', ''));
      const tarifa = tarifasTamanos.find(t => t.altura_cm === altCm);
      if (tarifa) {
        setNombreFigura(`Figura Coleccionable Personalizada ${altCm}cm`);
        setPrecioCOP(tarifa.precio_sugerido);
        setMedidaCm(`${altCm} cm`);
      }
    } else {
      const prod = productosStock.find(p => p.id === id);
      if (prod) {
        setNombreFigura(prod.nombre);
        setPrecioCOP(prod.precio_unitario);
        setMedidaCm(prod.dimensiones || '10 cm');
      }
    }
  };

  // Optimizar prompt con descriptores automáticos
  const handleOptimizarPrompt = () => {
    setGeminiOptimizing(true);
    setTimeout(() => {
      const descriptorsGeek = [
        'ultra crisp 8k resolution, flawless layerless resin finish, painted by master modeler',
        'subtle acrylic wash shadows, high contrast edge highlighting, dramatic cinematic composition',
        'collectible anime exhibition piece, studio lighting reflections, hyper-detailed craftsmanship'
      ];
      const randomDescriptor = descriptorsGeek[Math.floor(Math.random() * descriptorsGeek.length)];
      setDetallesAdicionales(prev => prev ? `${prev}, ${randomDescriptor}` : randomDescriptor);
      setGeminiOptimizing(false);
      toast.success('Prompt enriquecido con descriptores fotográficos 8K');
    }, 450);
  };

  // Generar Imagen con Nano Banana
  const handleGenerarImagen = () => {
    if (!nombreFigura.trim()) {
      toast.warning('Ingresa el nombre o personaje de la figura a generar.');
      return;
    }

    setIsGenerating(true);
    const newSeed = Math.floor(Math.random() * 8999999) + 1000000;
    setSeed(newSeed);

    const promptFinal = construirPromptNanoBanana(nombreFigura, estiloId, detallesAdicionales);
    const url = construirUrlNanoBanana(promptFinal, formatoActual.width, formatoActual.height, newSeed);
    
    setRawImageUrl(url);

    // Precargar la imagen en memoria antes de aplicar overlay canvas
    const imgPreload = new Image();
    imgPreload.crossOrigin = 'Anonymous';
    imgPreload.onload = async () => {
      const overlayConfig: BrandingOverlayConfig = {
        mostrarLogo,
        mostrarPrecio,
        precioCOP,
        mostrarMedida,
        medidaCm,
        mostrarWhatsApp,
        telefonoWhatsApp: config.telefono_contacto || '320 279 6115'
      };

      const finalBranded = await renderizarCanvasConBranding(url, overlayConfig, formatoActual);
      setBrandedImageUrl(finalBranded);
      setIsGenerating(false);
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      } catch (_) {}
      toast.success('¡Imagen generada con éxito con Nano Banana!');
    };

    imgPreload.onerror = () => {
      // Fallback a URL directa si hay bloqueo CORS
      setBrandedImageUrl(url);
      setIsGenerating(false);
      toast.success('Imagen renderizada con éxito.');
    };

    imgPreload.src = url;
  };

  // Re-aplicar branding cuando cambian los toggles
  useEffect(() => {
    if (!rawImageUrl) return;

    const overlayConfig: BrandingOverlayConfig = {
      mostrarLogo,
      mostrarPrecio,
      precioCOP,
      mostrarMedida,
      medidaCm,
      mostrarWhatsApp,
      telefonoWhatsApp: config.telefono_contacto || '320 279 6115'
    };

    renderizarCanvasConBranding(rawImageUrl, overlayConfig, formatoActual).then(res => {
      setBrandedImageUrl(res);
    });
  }, [mostrarLogo, mostrarPrecio, precioCOP, mostrarMedida, medidaCm, mostrarWhatsApp, rawImageUrl, formatoActual]);

  // Copiar al portapapeles
  const handleCopiarPortapapeles = async () => {
    if (!brandedImageUrl) return;
    const ok = await copiarImagenAlPortapapeles(brandedImageUrl);
    if (ok) {
      setCopied(true);
      toast.success('¡Imagen copiada al portapapeles! Lista para pegar (Ctrl+V) en Instagram o WhatsApp Web');
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.warning('Tu navegador no soporta copiado directo de imagen. Descárgala con el botón HD.');
    }
  };

  // Descargar Imagen
  const handleDescargar = () => {
    if (!brandedImageUrl) return;
    const link = document.createElement('a');
    link.href = brandedImageUrl;
    const slug = nombreFigura.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `WJG-Post-${slug}-${formatoActual.aspectRatioLabel.replace(':', 'x')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Descarga de imagen HD iniciada.');
  };

  // Compartir en WhatsApp con el Copy Comercial
  const handleCompartirWhatsApp = () => {
    const tel = formatWhatsAppPhone(config.telefono_contacto || '320 279 6115');
    const mensaje = 
`🔥 ¡NUEVA FIGURA EN RESINA 8K LISTA EN TALLER! 🎨✨

👑 *${nombreFigura}*
📏 *Medida:* ${medidaCm}
💎 *Material:* Resina UV 8K Ultra-Definición + Acabado Artístico
💰 *Inversión:* $${precioCOP > 0 ? precioCOP.toLocaleString('es-CO') : 'Consultar'} COP

💳 *Medios de Pago Oficiales:*
• Bre-B (Llave única): ${config.bre_b || '0090778625'}
• Nequi: ${config.nequi || '321 727 3025'}

🚀 Envíos asegurados a toda Colombia 🇨🇴
👇 ¡Pide o cotiza la tuya de inmediato!`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    openWhatsApp(url);
    toast.info('Abriendo WhatsApp con el copy preparado. ¡Adjunta la imagen descargada!');
  };

  // Asignar como portada al producto en stock
  const handleAsignarAProducto = () => {
    if (!selectedProdId || selectedProdId.startsWith('tarifa-')) {
      toast.warning('Selecciona un producto específico de stock para asignarle esta imagen.');
      return;
    }
    const targetProd = productosStock.find(p => p.id === selectedProdId);
    if (targetProd && onUpdateProductoStock && brandedImageUrl) {
      onUpdateProductoStock({
        ...targetProd,
        imagen_url: brandedImageUrl
      });
      toast.success(`Foto de portada asignada exitosamente a "${targetProd.nombre}" en POS Express`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado del Estudio */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          borderColor: 'rgba(56, 189, 248, 0.25)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              color: '#000'
            }}>
              <Sparkles size={18} />
            </span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc' }}>
              Estudio Creativo IA — Gemini & Nano Banana
            </h3>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              v3.0 Visual Studio
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.86rem' }}>
            Genera imágenes fotográficas ultra-detalladas de figuras 3D con presets calibrados para <strong>Instagram</strong> y <strong>WhatsApp</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOptimizarPrompt}
            disabled={geminiOptimizing}
            style={{ fontSize: '0.8rem', gap: '6px' }}
          >
            <Wand2 size={14} color="#38bdf8" />
            <span>{geminiOptimizing ? 'Optimizando...' : 'Enriquecer Prompt'}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Parámetros (Izquierda) + Live Preview & Branding (Derecha) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        
        {/* Columna Izquierda: Parámetros Creativos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Tarjeta 1: Producto y Tarifario */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShoppingBag size={16} />
              1. Seleccionar Producto o Ingreso Libre
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Cargar desde Catálogo o Tarifario de Altura:
                </label>
                <select
                  value={selectedProdId}
                  onChange={handleSelectProducto}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">-- Ingreso Libre / Personalizado --</option>
                  <optgroup label="📦 Figuras en Stock (POS Express)">
                    {productosStock.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio_unitario.toLocaleString('es-CO')} COP ({p.stock_actual} disp.)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📏 Tarifario Estándar ($10.000/cm)">
                    {tarifasTamanos.map(t => (
                      <option key={`tarifa-${t.altura_cm}`} value={`tarifa-${t.altura_cm}`}>
                        Figura {t.altura_cm} cm — ${t.precio_sugerido.toLocaleString('es-CO')} COP ({t.tiempo_estimado})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Nombre de la Figura o Personaje:
                </label>
                <input
                  type="text"
                  value={nombreFigura}
                  onChange={e => setNombreFigura(e.target.value)}
                  placeholder="Ej: Busto Spider-Man 2099 con Iluminación LED"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Precio COP:
                  </label>
                  <input
                    type="number"
                    value={precioCOP || ''}
                    onChange={e => setPrecioCOP(Number(e.target.value))}
                    placeholder="Ej: 100000"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Altura / Medida:
                  </label>
                  <input
                    type="text"
                    value={medidaCm}
                    onChange={e => setMedidaCm(e.target.value)}
                    placeholder="Ej: 12 cm"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Detalles Adicionales del Render (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={detallesAdicionales}
                  onChange={e => setDetallesAdicionales(e.target.value)}
                  placeholder="Ej: base con rocas volcánicas, ojos brillantes, textura de tela realista en traje..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Formatos de Red Social */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={16} />
              2. Formato y Destino de Publicación
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {FORMATOS_PRESETS.map(fmt => {
                const isSelected = fmt.id === formatoId;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormatoId(fmt.id)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.18)' : '#1e293b',
                      border: isSelected ? '1.5px solid #38bdf8' : '1px solid #334155',
                      color: isSelected ? '#fff' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem' }}>{fmt.icono}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#38bdf8' : '#334155',
                        color: isSelected ? '#000' : '#cbd5e1'
                      }}>
                        {fmt.aspectRatioLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                      {fmt.nombre}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                      {fmt.width}x{fmt.height} px
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tarjeta 3: Estilos Visuales Nano Banana */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} />
              3. Estilo Visual de Manufactura 3D
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ESTILOS_VISUALES.map(est => {
                const isSelected = est.id === estiloId;
                return (
                  <div
                    key={est.id}
                    onClick={() => setEstiloId(est.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#1e293b',
                      border: isSelected ? `1.5px solid ${est.badgeColor}` : '1px solid #334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{est.icono}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                          {est.nombre}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {est.tagline}
                      </span>
                    </div>
                    {isSelected && <Check size={16} color={est.badgeColor} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón Principal de Generación */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerarImagen}
            disabled={isGenerating}
            style={{
              padding: '14px',
              fontWeight: 800,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
            }}
          >
            {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} />}
            <span>{isGenerating ? 'Renderizando en Nano Banana...' : '✨ Generar Imagen con Nano Banana'}</span>
          </button>
        </div>

        {/* Columna Derecha: Vista Previa en Vivo y Canvas Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} />
                Vista Previa ({formatoActual.aspectRatioLabel} • {formatoActual.width}x{formatoActual.height}px)
              </h4>
              {brandedImageUrl && (
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Render HD Listo
                </span>
              )}
            </div>

            {/* Contenedor con Aspect Ratio Dinámico */}
            <div
              style={{
                width: '100%',
                maxHeight: '520px',
                borderRadius: '12px',
                backgroundColor: '#0b1329',
                border: '1px solid #334155',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '320px'
              }}
            >
              {isGenerating ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={36} color="#38bdf8" className="animate-spin" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 800, color: '#f8fafc', margin: '0 0 4px' }}>Renderizando con Nano Banana...</p>
                  <p style={{ fontSize: '0.78rem', margin: 0 }}>Modelado 8K • Iluminación de estudio • Acabados UV</p>
                </div>
              ) : brandedImageUrl ? (
                <img 
                  src={brandedImageUrl} 
                  alt={nombreFigura}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    maxHeight: '520px',
                    display: 'block'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <Camera size={44} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 700, color: '#cbd5e1', margin: '0 0 6px' }}>Sin imagen generada aún</p>
                  <p style={{ fontSize: '0.76rem', maxWidth: '280px', margin: '0 auto' }}>
                    Selecciona un producto o ingresa un nombre y pulsa <strong>"Generar Imagen con Nano Banana"</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Controles de Superposición de Marca (Branding Studio) */}
            <div style={{
              marginTop: '14px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155'
            }}>
              <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '8px' }}>
                🎨 SELLOS Y BRANDING DE MARCA EN LA IMAGEN (CANVAS):
              </span>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#f1f5f9', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mostrarLogo}
                    onChange={e => setMostrarLogo(e.target.checked)}
                  />
                  <span>Logo WJGEEKS 3D</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#f1f5f9', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mostrarPrecio}
                    onChange={e => setMostrarPrecio(e.target.checked)}
                  />
                  <span>Badge de Precio COP</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#f1f5f9', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mostrarMedida}
                    onChange={e => setMostrarMedida(e.target.checked)}
                  />
                  <span>Tag Altura ({medidaCm})</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#f1f5f9', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mostrarWhatsApp}
                    onChange={e => setMostrarWhatsApp(e.target.checked)}
                  />
                  <span>WhatsApp de Pedidos</span>
                </label>
              </div>
            </div>

            {/* Botonera de Acciones de Exportación */}
            {brandedImageUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-cyan"
                    onClick={handleDescargar}
                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700, gap: '6px' }}
                  >
                    <Download size={15} />
                    <span>Descargar HD</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopiarPortapapeles}
                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700, gap: '6px' }}
                  >
                    {copied ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
                    <span>{copied ? '¡Copiada!' : 'Copiar Portapapeles'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleCompartirWhatsApp}
                    style={{ flex: 2, padding: '10px 14px', fontSize: '0.82rem', fontWeight: 800, gap: '6px', backgroundColor: '#16a34a' }}
                  >
                    <MessageCircle size={15} />
                    <span>Compartir en WhatsApp con Copy</span>
                  </button>

                  {selectedProdId && !selectedProdId.startsWith('tarifa-') && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAsignarAProducto}
                      title="Asignar como foto oficial del producto para POS Express"
                      style={{ flex: 1, padding: '10px 12px', fontSize: '0.78rem', gap: '4px' }}
                    >
                      <ImageIcon size={14} />
                      <span>Foto en Stock POS</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
