import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  MessageCircle, 
  Download, 
  Camera,
  Send, 
  X,
  Layers,
  ImageIcon
} from 'lucide-react';
import { ProductoStock } from '../../types';
import { openWhatsApp } from '../../services/whatsappService';

interface MarketingIAModalProps {
  isOpen: boolean;
  onClose: () => void;
  productosStock: ProductoStock[];
}

export const MarketingIAModal: React.FC<MarketingIAModalProps> = ({
  isOpen,
  onClose,
  productosStock,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customNombre, setCustomNombre] = useState('');
  const [customPrecio, setCustomPrecio] = useState<number>(0);
  const [redSocial, setRedSocial] = useState<'instagram' | 'whatsapp' | 'tiktok'>('instagram');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultado, setResultado] = useState<{
    titulo: string;
    copy: string;
    prompt_imagen_sugerido: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSelectProduct = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedProductId(id);
    const prod = productosStock.find((p) => p.id === id);
    if (prod) {
      setCustomNombre(prod.nombre);
      setCustomPrecio(prod.precio_unitario);
    }
  };

  const handleGenerarCampana = async () => {
    if (!customNombre) {
      alert('Ingresa el nombre de la figura o selecciona un producto del catálogo.');
      return;
    }

    setIsLoading(true);
    setCopied(false);

    try {
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/generate-marketing-campaign`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          productoNombre: customNombre,
          precio: customPrecio,
          dimensiones: '12 cm',
          redSocial,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setResultado(json.data);
      } else {
        throw new Error(json.error || 'Error al invocar Gemini');
      }
    } catch (err) {
      // Fallback local fail-safe si la Edge Function no tiene red o está en offline
      setResultado({
        titulo: `🔥 ${customNombre} - Edición Coleccionista 8K`,
        copy: `🔥 ¡NUEVA FIGURA COLECCIONABLE EN RESINA 8K! 🔥\n\nAcabamos de terminar esta pieza de "${customNombre}" con micro-detalle alucinante 🎨✨.\n\n📏 Tamaño: A tu medida (desde 8 cm hasta 15 cm)\n💎 Calidad: Resina 8K ultra-definición + curado UV\n💰 Inversión: $${customPrecio > 0 ? customPrecio.toLocaleString('es-CO') : 'Consultar'} COP\n\n📲 Medios de pago oficiales: Bre-B (0090778625) / Nequi (3217273025)\n🚀 Envíos a toda Colombia 🇨🇴\n\n👇 Cotiza o pide la tuya aquí:\nhttps://wa.me/573202796115?text=${encodeURIComponent(`Hola WJGEEKS, quiero pedir la figura de ${customNombre}`)}`,
        prompt_imagen_sugerido: `Commercial studio photo of a 3D printed resin collectible figure of ${customNombre}, 8k resolution, matte acrylic paint, macro shot, dramatic turntable lighting`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (resultado?.copy) {
      navigator.clipboard.writeText(resultado.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToWhatsApp = () => {
    if (resultado?.copy) {
      const url = `https://wa.me/?text=${encodeURIComponent(resultado.copy)}`;
      openWhatsApp(url);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Marketing Hub IA</h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Powered by Google Gemini 1.5 Flash</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {/* Seleccionar producto del catálogo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              Vincular Producto en Stock (Opcional):
            </label>
            <select
              value={selectedProductId}
              onChange={handleSelectProduct}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              <option value="">-- Ingreso Manual o Selecciona del Stock --</option>
              {productosStock.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.nombre} - ${prod.precio_unitario.toLocaleString('es-CO')} COP ({prod.stock_actual} en stock)
                </option>
              ))}
            </select>
          </div>

          {/* Nombre y Precio */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Nombre de la Figura:
              </label>
              <input
                type="text"
                value={customNombre}
                onChange={(e) => setCustomNombre(e.target.value)}
                placeholder="Ej: Diorama Goku SSJ 15cm"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Precio COP:
              </label>
              <input
                type="number"
                value={customPrecio || ''}
                onChange={(e) => setCustomPrecio(Number(e.target.value))}
                placeholder="Ej: 120000"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Selector de Canal / Red Social */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              Formato de Red Social:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['instagram', 'whatsapp', 'tiktok'] as const).map((canal) => (
                <button
                  key={canal}
                  type="button"
                  onClick={() => setRedSocial(canal)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: redSocial === canal ? 700 : 500,
                    backgroundColor: redSocial === canal ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                    border: redSocial === canal ? '1px solid #38bdf8' : '1px solid #334155',
                    color: redSocial === canal ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {canal === 'instagram' ? '📸 Instagram' : canal === 'whatsapp' ? '💬 WhatsApp' : '🎬 TikTok'}
                </button>
              ))}
            </div>
          </div>

          {/* Botón Generar */}
          <button
            type="button"
            disabled={isLoading || !customNombre}
            onClick={handleGenerarCampana}
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: '#38bdf8',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.85rem',
              border: 'none',
              cursor: isLoading || !customNombre ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            <Sparkles size={16} />
            <span>{isLoading ? 'Generando con Gemini...' : 'Generar Campaña & Copy IA'}</span>
          </button>
        </div>

        {/* Resultado Generado */}
        {resultado && (
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>
                {resultado.titulo}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  title="Copiar texto"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: copied ? '#10b981' : '#334155',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={shareToWhatsApp}
                  title="Compartir por WhatsApp"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#16a34a',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageCircle size={12} />
                  <span>Enviar</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows={8}
              value={resultado.copy}
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />

            {resultado.prompt_imagen_sugerido && (
              <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#94a3b8' }}>
                <strong>Prompt Visual (Imagen 3 / Nanobanana):</strong>
                <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: '#64748b' }}>
                  {resultado.prompt_imagen_sugerido}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
