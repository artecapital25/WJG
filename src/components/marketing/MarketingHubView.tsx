import React, { useState } from 'react';
import { 
  Megaphone, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  MessageCircle, 
  ShoppingBag, 
  Sparkles, 
  ExternalLink, 
  FileSpreadsheet, 
  Tag, 
  Layers,
  HelpCircle,
  Eye,
  CheckCircle2,
  ArrowRight,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProductoStock, TarifaTamano, ConfiguracionTaller } from '../../types';
import { openWhatsApp } from '../../services/whatsappService';

interface MarketingHubViewProps {
  productosStock: ProductoStock[];
  tarifasTamanos: TarifaTamano[];
  config: ConfiguracionTaller;
}

type MarketingTab = 'copys' | 'meta-catalog' | 'difusiones';

interface CopyTemplate {
  id: string;
  categoria: 'lanzamiento' | 'tarifario' | 'stock' | 'artesanal' | 'gamer';
  titulo: string;
  descripcion: string;
  generarCopy: (item: { nombre: string; precio: number; tamano?: string; imagen?: string }, telefono: string) => string;
}

const TEMPLATES: CopyTemplate[] = [
  {
    id: 'lanzamiento',
    categoria: 'lanzamiento',
    titulo: '🔥 Lanzamiento / Nueva Figura Coleccionable',
    descripcion: 'Ideal para posts de Instagram, TikTok y estados anunciando un nuevo modelo.',
    generarCopy: (item, tel) => 
`🔥 ¡NUEVA FIGURA COLECCIONABLE EN RESINA 8K! 🔥

Acabamos de terminar esta pieza de "${item.nombre}" con un nivel de micro-detalle alucinante 🎨✨.

📏 Tamaño: ${item.tamano || 'A tu medida (desde 5 cm hasta 12 cm)'}
💎 Calidad: Impresión 3D en resina de ultra-alta definición + acabado artesanal.
💰 Inversión: $${item.precio > 0 ? item.precio.toLocaleString('es-CO') : 'Consulta según tamaño'} COP.

¿Quieres la tuya o tienes en mente otro personaje de anime, cine o videojuegos?
👇 Escríbenos por mensaje directo o toca el enlace en la bio para cotizar en segundos:
📲 WhatsApp oficial: https://wa.me/${tel}?text=${encodeURIComponent(`¡Hola WJGEEKS! Vi la figura de ${item.nombre} y me gustaría cotizarla.`)}

🚀 Envíos a toda Colombia 🇨🇴 | Hecho con pasión geek.
#WJGeeks3D #Impresion3D #Resina8K #Coleccionables #AnimeColombia #GamerColombia #FigurasDeAccion`
  },
  {
    id: 'tarifario',
    categoria: 'tarifario',
    titulo: '📏 Tarifario Oficial por Centímetros (Sin Vueltas)',
    descripcion: 'Comunica precios transparentes y claros para que los clientes coticen al instante.',
    generarCopy: (item, tel) =>
`📏 ¿CUÁNTO CUESTA TU FIGURA FAVORITA EN RESINA 3D? 📏
En WJGEEKS 3D te lo ponemos fácil y transparente. Precios claros por altura:

✨ 5 cm  ➡️  $50.000 COP
✨ 6 cm  ➡️  $60.000 COP
✨ 7 cm  ➡️  $70.000 COP
✨ 8 cm  ➡️  $80.000 COP
✨ 9 cm  ➡️  $90.000 COP
✨ 10 cm ➡️  $100.000 COP
✨ 11 cm ➡️  $110.000 COP
✨ 12 cm ➡️  $120.000 COP

👉 Solo necesitas enviarnos la foto o imagen de la figura que quieres, nosotros nos encargamos del modelado, impresión en resina 8K y acabados profesionales.

📲 Cotiza la tuya de inmediato aquí:
https://wa.me/${tel}?text=${encodeURIComponent('¡Hola WJGEEKS! Quiero cotizar una figura con el tarifario por centímetros.')}

🇨🇴 Taller en Colombia | Envíos seguros a nivel nacional
#Tarifario3D #WJGeeks #ImpresionEnResina #FigurasPersonalizadas #ColeccionistasColombia`
  },
  {
    id: 'stock',
    categoria: 'stock',
    titulo: '⚡ Entrega Inmediata (Figuras en Stock)',
    descripcion: 'Diseñado para impulsar ventas de piezas ya terminadas y listas para despacho.',
    generarCopy: (item, tel) =>
`⚡ ¡LISTO PARA ENTREGA INMEDIATA! ⚡
Sin tiempos de espera: esta figura está terminada, inspeccionada y lista para salir a tu repisa hoy mismo 📦🚀.

👑 Figura: ${item.nombre}
💰 Precio Especial: $${item.precio.toLocaleString('es-CO')} COP
📍 Disponibilidad: 1 unidad disponible en taller (edición única)

Si te la quieres quedar antes de que alguien más la aparte, escríbenos ya:
📲 Apartar por WhatsApp: https://wa.me/${tel}?text=${encodeURIComponent(`¡Hola WJGEEKS! Quiero apartar la figura en stock: ${item.nombre} por $${item.precio.toLocaleString('es-CO')}.`)}

💳 Recibimos Nequi, Daviplata, Bancolombia y transferencias.
#FigurasEnStock #EntregaInmediata #WJGeeksColombia #Coleccionables`
  },
  {
    id: 'artesanal',
    categoria: 'artesanal',
    titulo: '🎨 Detrás de Cámaras: Del STL a la Obra de Arte',
    descripcion: 'Enfocado en storytelling, el proceso artesanal de curado y pintura minuciosa.',
    generarCopy: (item, tel) =>
`🎨 DEL ARCHIVO DIGITAL AL COLECCIONABLE REAL 🖌️

Cada una de nuestras figuras pasa por un proceso riguroso en nuestro taller:
1️⃣ Modelado y optimización de soportes micrónicos.
2️⃣ Impresión en resina UV de 8K para capturar hasta la textura de la piel o armadura.
3️⃣ Lavado ultrasónico y curado de alta densidad.
4️⃣ Post-procesado y pintura detallada a mano.

Pieza destacada: ${item.nombre} ✨
¿Tienes una idea en la cabeza que sueñas tener en físico?
Nosotros la materializamos.

📲 Habla directamente con nosotros:
https://wa.me/${tel}?text=${encodeURIComponent(`¡Hola WJGEEKS! Vi el proceso de ${item.nombre} y me interesa hacer un proyecto similar.`)}

#BehindTheScenes #ArtesaniaDigital #Modelado3D #EsculturaDigital #PinturaDeMiniaturas`
  },
  {
    id: 'gamer',
    categoria: 'gamer',
    titulo: '🎮 El Regalo Geek Definitivo (Gamer & Anime)',
    descripcion: 'Copy emocional enfocado en regalos de cumpleaños, aniversarios y coleccionismo.',
    generarCopy: (item, tel) =>
`🎮 SORPRENDE CON UN REGALO QUE NUNCA OLVIDARÁ 🎁

Olvídate de regalos comunes. Regala una figura personalizada de su videojuego, anime o personaje favorito:
👉 Calidad coleccionista en resina 3D premium.
👉 Personalización de pose, tamaño y acabados.
👉 Modelo: ${item.nombre} ($${item.precio > 0 ? item.precio.toLocaleString('es-CO') : 'Cotización express'})

¡Hacemos realidad lo que imagines!
Haz tu encargo con anticipación y recíbelo en la puerta de tu casa 🚪📦.

📲 Escríbenos al WhatsApp:
https://wa.me/${tel}?text=${encodeURIComponent(`¡Hola WJGEEKS! Quiero cotizar un regalo personalizado de ${item.nombre}.`)}

#RegalosOriginales #RegalosGamer #AnimeColombia #GeekLife #WJGeeks3D`
  }
];

export const MarketingHubView: React.FC<MarketingHubViewProps> = ({
  productosStock,
  tarifasTamanos,
  config
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MarketingTab>('copys');

  // Estados del Generador de Copys
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('lanzamiento');
  const [itemType, setItemType] = useState<'stock' | 'tarifario' | 'personalizado'>('stock');
  const [selectedStockId, setSelectedStockId] = useState<string>(productosStock[0]?.id || '');
  const [selectedTamanoCm, setSelectedTamanoCm] = useState<number>(8);
  const [customNombre, setCustomNombre] = useState<string>('Goku Ultra Instinto 10cm');
  const [customPrecio, setCustomPrecio] = useState<number>(100000);
  const [copyGenerado, setCopyGenerado] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Estados del Exportador Meta Commerce
  const [incluirStockEnFeed, setIncluirStockEnFeed] = useState<boolean>(true);
  const [incluirTarifarioEnFeed, setIncluirTarifarioEnFeed] = useState<boolean>(true);
  const [feedUrlCopied, setFeedUrlCopied] = useState<boolean>(false);

  const telefonoOficial = config.telefono_contacto?.replace(/[^0-9]/g, '') || '573202796115';

  // Obtener item seleccionado para el copy
  const getItemData = () => {
    if (itemType === 'stock') {
      const prod = productosStock.find(p => p.id === selectedStockId);
      if (prod) {
        return {
          nombre: prod.nombre,
          precio: prod.precio_unitario,
          tamano: prod.dimensiones || 'Escala estándar',
          imagen: prod.imagen_url
        };
      }
    } else if (itemType === 'tarifario') {
      const tarifa = tarifasTamanos.find(t => (t.altura_cm || t.cm) === selectedTamanoCm);
      const precio = tarifa ? (tarifa.precio_sugerido || tarifa.precio_cop || (selectedTamanoCm * 10000)) : selectedTamanoCm * 10000;
      return {
        nombre: `Figura Personalizada (${selectedTamanoCm} cm)`,
        precio: precio,
        tamano: `${selectedTamanoCm} cm de altura`,
        imagen: ''
      };
    }
    return {
      nombre: customNombre,
      precio: customPrecio,
      tamano: 'Medida personalizada',
      imagen: ''
    };
  };

  // Actualizar copy cuando cambian los inputs
  React.useEffect(() => {
    const template = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];
    const data = getItemData();
    const texto = template.generarCopy(data, telefonoOficial);
    setCopyGenerado(texto);
  }, [selectedTemplateId, itemType, selectedStockId, selectedTamanoCm, customNombre, customPrecio, telefonoOficial, productosStock, tarifasTamanos]);

  // Copiar al portapapeles
  const handleCopyClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.85 }
    });
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Generar y descargar archivo CSV para Meta Commerce Manager
  const handleDownloadMetaCSV = () => {
    const rows: string[][] = [
      // Encabezados estándar de Meta Commerce Manager / Google Product Feed
      [
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
        'fb_product_category'
      ]
    ];

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wjgeeks3d.com';

    // 1. Productos de Stock
    if (incluirStockEnFeed) {
      productosStock.forEach(p => {
        const id = `WJG-STOCK-${p.codigo || p.id}`;
        const title = p.nombre;
        const description = (p.descripcion || `Figura coleccionable en resina 3D ultra-detallada. Categoría: ${p.categoria}. Dimensiones: ${p.dimensiones || 'N/A'}. Disponible para entrega inmediata en Colombia.`)
          .replace(/"/g, '""');
        const availability = (p.stock_actual && p.stock_actual > 0) ? 'in stock' : 'out of stock';
        const condition = 'new';
        const price = `${p.precio_unitario} COP`;
        const link = `${baseUrl}/?tab=stock&id=${p.id}`;
        const imageLink = p.imagen_url || `${baseUrl}/wjg_logo_vector.svg`;
        const brand = 'WJGEEKS 3D';
        const googleCat = 'Arts & Entertainment > Hobbies & Creative Arts > Model Making';
        const fbCat = 'toys & games > action figures & figurines';

        rows.push([
          `"${id}"`,
          `"${title.replace(/"/g, '""')}"`,
          `"${description}"`,
          `"${availability}"`,
          `"${condition}"`,
          `"${price}"`,
          `"${link}"`,
          `"${imageLink}"`,
          `"${brand}"`,
          `"${googleCat}"`,
          `"${fbCat}"`
        ]);
      });
    }

    // 2. Opciones de Tarifario Estándar por cm
    if (incluirTarifarioEnFeed) {
      const tarifasOrdenadas = [...tarifasTamanos].sort((a, b) => (a.altura_cm || a.cm || 0) - (b.altura_cm || b.cm || 0));
      tarifasOrdenadas.forEach(t => {
        const altura = t.altura_cm || t.cm || 5;
        const precioVal = t.precio_sugerido || t.precio_cop || (altura * 10000);
        const id = `WJG-TARIFA-${altura}CM`;
        const title = `Figura 3D en Resina (${altura} cm de altura) - WJGEEKS`;
        const description = `Impresión 3D personalizada en resina UV de alta resolución (8K) para figuras de anime, videojuegos o cine de ${altura} cm de altura. Fabricado en Colombia por WJGEEKS 3D PRO.`;
        const availability = 'order';
        const condition = 'new';
        const price = `${precioVal} COP`;
        const link = `${baseUrl}/?tab=cotizador&cm=${altura}`;
        const imageLink = `${baseUrl}/wjg_logo_vector.svg`;
        const brand = 'WJGEEKS 3D';
        const googleCat = 'Arts & Entertainment > Hobbies & Creative Arts > Model Making';
        const fbCat = 'toys & games > action figures & figurines';

        rows.push([
          `"${id}"`,
          `"${title.replace(/"/g, '""')}"`,
          `"${description.replace(/"/g, '""')}"`,
          `"${availability}"`,
          `"${condition}"`,
          `"${price}"`,
          `"${link}"`,
          `"${imageLink}"`,
          `"${brand}"`,
          `"${googleCat}"`,
          `"${fbCat}"`
        ]);
      });
    }

    // Convertir a texto CSV con delimitador de coma y BOM UTF-8 para compatibilidad con Excel y Meta
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wjg_meta_commerce_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const totalProductosEnFeed = (incluirStockEnFeed ? productosStock.length : 0) + (incluirTarifarioEnFeed ? tarifasTamanos.length : 0);
  const valorTotalInventarioStock = productosStock.reduce((acc, p) => acc + (p.precio_unitario * (p.stock_actual || 1)), 0);

  return (
    <div style={{ padding: '16px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Superior del Marketing Hub */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(56, 189, 248, 0.08))',
        borderRadius: '16px',
        border: '1px solid rgba(168, 85, 247, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #a855f7, #38bdf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
          }}>
            <Megaphone size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Marketing & Meta Commerce Hub
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'rgba(56, 189, 248, 0.2)',
                color: 'var(--brand-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                Instagram & WhatsApp
              </span>
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Genera copys de alta conversión para redes y exporta tu catálogo a Instagram Shopping y WhatsApp Business Catalog.
            </p>
          </div>
        </div>

        {/* Línea Comercial WhatsApp */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '10px'
        }}>
          <MessageCircle size={18} color="#34d399" />
          <div>
            <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>Línea Oficial WhatsApp</div>
            <div style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 700 }}>+{telefonoOficial}</div>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo en Cuadrícula Ordenada */}
      <div className="subtabs-grid-mobile" style={{
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setActiveSubTab('copys')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: activeSubTab === 'copys' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
            background: activeSubTab === 'copys' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            color: activeSubTab === 'copys' ? '#c084fc' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={16} />
          <span>Generador de Copys Redes</span>
        </button>

        <button
          onClick={() => setActiveSubTab('meta-catalog')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: activeSubTab === 'meta-catalog' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            background: activeSubTab === 'meta-catalog' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeSubTab === 'meta-catalog' ? 'var(--brand-cyan)' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Catálogo Meta / Instagram CSV</span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.25)',
            color: '#fff'
          }}>
            {totalProductosEnFeed}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('difusiones')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: activeSubTab === 'difusiones' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
            background: activeSubTab === 'difusiones' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeSubTab === 'difusiones' ? '#34d399' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Share2 size={16} />
          <span>Campañas & Difusión WhatsApp</span>
        </button>
      </div>

      {/* CONTENIDO 1: GENERADOR DE COPYS REDES */}
      {activeSubTab === 'copys' && (
        <div className="marketing-layout-grid vertical-stack-mobile">
          {/* Panel Izquierdo: Configuración del Copy */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} color="var(--brand-cyan)" />
              1. Selecciona la Plantilla de Campaña
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TEMPLATES.map(tpl => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? '#c084fc' : '#f8fafc' }}>
                      {tpl.titulo}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                      {tpl.descripcion}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="#f59e0b" />
              2. Datos del Producto o Figura
            </h2>

            {/* Selector de Tipo de Producto */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setItemType('stock')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: itemType === 'stock' ? '1px solid #34d399' : '1px solid var(--border-subtle)',
                  background: itemType === 'stock' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: itemType === 'stock' ? '#34d399' : '#94a3b8'
                }}
              >
                📦 De Stock ({productosStock.length})
              </button>
              <button
                type="button"
                onClick={() => setItemType('tarifario')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: itemType === 'tarifario' ? '1px solid var(--brand-cyan)' : '1px solid var(--border-subtle)',
                  background: itemType === 'tarifario' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: itemType === 'tarifario' ? 'var(--brand-cyan)' : '#94a3b8'
                }}
              >
                📏 Por cm (Tarifario)
              </button>
              <button
                type="button"
                onClick={() => setItemType('personalizado')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: itemType === 'personalizado' ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
                  background: itemType === 'personalizado' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: itemType === 'personalizado' ? '#c084fc' : '#94a3b8'
                }}
              >
                ✏️ Libre
              </button>
            </div>

            {/* Sub-formulario dinámico según tipo */}
            {itemType === 'stock' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Selecciona la figura en stock:
                </label>
                <select
                  value={selectedStockId}
                  onChange={e => setSelectedStockId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#0a0f18',
                    border: '1px solid var(--border-subtle)',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                >
                  {productosStock.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - ${p.precio_unitario.toLocaleString('es-CO')} COP (Stock: {p.stock_actual || 1})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {itemType === 'tarifario' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Altura oficial en centímetros:
                </label>
                <div className="mobile-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {tarifasTamanos.map(t => {
                    const altura = t.altura_cm || t.cm || 5;
                    const precioVal = t.precio_sugerido || t.precio_cop || (altura * 10000);
                    const isSel = selectedTamanoCm === altura;
                    return (
                      <button
                        key={t.id || altura}
                        type="button"
                        onClick={() => setSelectedTamanoCm(altura)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '8px',
                          border: isSel ? '1px solid var(--brand-cyan)' : '1px solid var(--border-subtle)',
                          background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                          color: isSel ? 'var(--brand-cyan)' : '#f8fafc',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {altura} cm
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>
                          ${(precioVal / 1000).toFixed(0)}k
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {itemType === 'personalizado' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Nombre del Personaje / Modelo:
                  </label>
                  <input
                    type="text"
                    value={customNombre}
                    onChange={e => setCustomNombre(e.target.value)}
                    placeholder="Ej. Batman Que Ríe 12cm"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#0a0f18',
                      border: '1px solid var(--border-subtle)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Precio estimado en COP:
                  </label>
                  <input
                    type="number"
                    value={customPrecio}
                    onChange={e => setCustomPrecio(Number(e.target.value))}
                    step="5000"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#0a0f18',
                      border: '1px solid var(--border-subtle)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Panel Derecho: Vista Previa y Acciones del Copy */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#c084fc" />
                Copy Optimizado con Enlace Directo
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {copyGenerado.length} caracteres
              </span>
            </div>

            <textarea
              value={copyGenerado}
              onChange={e => setCopyGenerado(e.target.value)}
              rows={16}
              style={{
                width: '100%',
                background: '#080c14',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '12px',
                padding: '14px',
                color: '#e2e8f0',
                fontSize: '0.84rem',
                lineHeight: '1.5',
                fontFamily: 'var(--font-body)',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleCopyClipboard(copyGenerado)}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  minWidth: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  background: copiedSuccess ? 'linear-gradient(135deg, #10b981, #059669)' : undefined
                }}
              >
                {copiedSuccess ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedSuccess ? '¡Copiado al Portapapeles!' : 'Copiar Texto Completo'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = `https://wa.me/${telefonoOficial}?text=${encodeURIComponent(copyGenerado)}`;
                  window.open(url, '_blank');
                }}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  color: '#34d399'
                }}
                title="Abrir WhatsApp para compartir o auto-enviarse el copy"
              >
                <Send size={15} />
                <span>Enviar a WhatsApp</span>
              </button>
            </div>

            <div style={{
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#94a3b8',
              lineHeight: '1.4'
            }}>
              💡 <strong style={{ color: '#f8fafc' }}>Consejo WJGEEKS:</strong> Puedes publicar este texto en el pie de foto de tus Reels o posts de Instagram. El enlace de WhatsApp abre una conversación directa con tu línea <strong style={{ color: 'var(--brand-cyan)' }}>+{telefonoOficial}</strong> con el mensaje ya pre-escrito.
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 2: EXPORTADOR CATÁLOGO META / INSTAGRAM */}
      {activeSubTab === 'meta-catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tarjetas de Métricas de Catálogo */}
          <div className="vertical-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBag size={22} color="var(--brand-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Items para Meta Catalog</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>{totalProductosEnFeed} productos</div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Tag size={22} color="#34d399" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Valor Comercial en Stock</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>
                  ${valorTotalInventarioStock.toLocaleString('es-CO')} COP
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={22} color="#c084fc" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tarifas Estándar por cm</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#c084fc' }}>
                  {tarifasTamanos.length} tamaños (5 - 12 cm)
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Descarga del Feed CSV */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Exportador de Catálogo para Meta Commerce Manager
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Genera el archivo CSV con la especificación requerida por Meta para sincronizar la tienda de Instagram Shopping y WhatsApp Catalog.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadMetaCSV}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                <Download size={18} />
                <span>Descargar Catálogo CSV</span>
              </button>
            </div>

            {/* Opciones de Inclusión */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              padding: '14px 18px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={incluirStockEnFeed}
                  onChange={e => setIncluirStockEnFeed(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--brand-cyan)' }}
                />
                <span>Incluir productos en stock físico ({productosStock.length} items)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={incluirTarifarioEnFeed}
                  onChange={e => setIncluirTarifarioEnFeed(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--brand-cyan)' }}
                />
                <span>Incluir opciones del tarifario oficial por centímetros ({tarifasTamanos.length} tamaños)</span>
              </label>
            </div>

            {/* Pasos para importar en Meta Business Suite */}
            <div style={{
              background: '#0a0f1a',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '18px 20px'
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-cyan)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={16} />
                ¿Cómo subir este catálogo a Instagram & WhatsApp Business?
              </h4>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Descarga el archivo <code>wjg_meta_commerce_catalog.csv</code> haciendo clic en el botón superior.</li>
                <li>Ingresa a tu <strong style={{ color: '#fff' }}>Meta Business Suite</strong> (business.facebook.com) con la cuenta vinculada a Instagram.</li>
                <li>En el menú lateral, dirígete a <strong style={{ color: 'var(--brand-cyan)' }}>Administrador de Comercio (Commerce Manager) &gt; Catálogos</strong>.</li>
                <li>Selecciona <strong style={{ color: '#fff' }}>Orígenes de datos &gt; Subir productos</strong> y escoge la opción <strong>Hoja de cálculo o archivo CSV</strong>.</li>
                <li>Sube el archivo descargado. ¡Tus figuras quedarán publicadas automáticamente con precios en COP y botón para chatear por WhatsApp!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 3: DIFUSIONES Y WHATSAPP MARKETING */}
      {activeSubTab === 'difusiones' && (
        <div className="marketing-layout-grid vertical-stack-mobile">
          {/* Mensaje 1: Novedades del Mes */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)' }}>
                  Difusión 1
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Clientes Frecuentes</span>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 10px 0' }}>
                📣 Novedades & Figuras del Mes
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-line', background: '#090d16', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
{`¡Hola! 👋 Te saludamos desde el taller de WJGEEKS 3D PRO.

Tenemos nuevas figuras listas y cupos abiertos para impresión personalizada en resina 8K para esta semana 🚀.

Si tienes en mente algún personaje de anime, Marvel, DC, videojuegos o tu propio avatar, solo envíanos una foto y te enviamos la cotización de inmediato 🎨✨.

👇 Escríbenos aquí para apartar tu pedido:
https://wa.me/${telefonoOficial}?text=${encodeURIComponent('¡Hola WJGEEKS! Quiero cotizar una figura para esta semana.')}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyClipboard(
`¡Hola! 👋 Te saludamos desde el taller de WJGEEKS 3D PRO.

Tenemos nuevas figuras listas y cupos abiertos para impresión personalizada en resina 8K para esta semana 🚀.

Si tienes en mente algún personaje de anime, Marvel, DC, videojuegos o tu propio avatar, solo envíanos una foto y te enviamos la cotización de inmediato 🎨✨.

👇 Escríbenos aquí para apartar tu pedido:
https://wa.me/${telefonoOficial}?text=${encodeURIComponent('¡Hola WJGEEKS! Quiero cotizar una figura para esta semana.')}`
              )}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
            >
              <Copy size={15} />
              <span>Copiar Plantilla de Difusión</span>
            </button>
          </div>

          {/* Mensaje 2: Promoción Fin de Semana */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  Difusión 2
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Fin de Semana</span>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 10px 0' }}>
                ⚡ Fin de Semana Geek (Stock Express)
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-line', background: '#090d16', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
{`⚡ ¡PROMO FIN DE SEMANA EN WJGEEKS 3D! ⚡

Este fin de semana tenemos figuras seleccionadas en stock listas para despacho inmediato en Colombia 🇨🇴📦.

Sin esperas de producción: pides hoy y despachamos de inmediato.

👑 Consulta el catálogo disponible en WhatsApp tocando aquí:
https://wa.me/${telefonoOficial}?text=${encodeURIComponent('¡Hola WJGEEKS! Me gustaría ver las figuras disponibles en stock de este fin de semana.')}

¡Cupos limitados por modelo!`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyClipboard(
`⚡ ¡PROMO FIN DE SEMANA EN WJGEEKS 3D! ⚡

Este fin de semana tenemos figuras seleccionadas en stock listas para despacho inmediato en Colombia 🇨🇴📦.

Sin esperas de producción: pides hoy y despachamos de inmediato.

👑 Consulta el catálogo disponible en WhatsApp tocando aquí:
https://wa.me/${telefonoOficial}?text=${encodeURIComponent('¡Hola WJGEEKS! Me gustaría ver las figuras disponibles en stock de este fin de semana.')}

¡Cupos limitados por modelo!`
              )}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
            >
              <Copy size={15} />
              <span>Copiar Plantilla de Fin de Semana</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
