import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  Sparkles, 
  Sliders, 
  ArrowRight, 
  Send, 
  Layers, 
  DollarSign, 
  Settings,
  Clock
} from 'lucide-react';
import { TarifaTamano } from '../../types';

interface TarifarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarifas: TarifaTamano[];
  onSelectTarifa: (tarifa: TarifaTamano) => void;
  onNavigateToCatalogos?: () => void;
}

export const TarifarioModal: React.FC<TarifarioModalProps> = ({
  isOpen,
  onClose,
  tarifas,
  onSelectTarifa,
  onNavigateToCatalogos
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [customCm, setCustomCm] = useState<number>(8);

  if (!isOpen) return null;

  // Ordenar tarifas de menor a mayor altura
  const sortedTarifas = [...tarifas].sort((a, b) => a.altura_cm - b.altura_cm);

  // Estimador lineal dinámico basado en la progresión ($45k base en 5cm + $10k por cm adicional)
  const calcularPrecioEstimado = (cm: number): number => {
    if (cm <= 0) return 0;
    // Si coincide con alguna tarifa exacta existente, usarla
    const encontrada = sortedTarifas.find(t => t.altura_cm === cm);
    if (encontrada) return encontrada.precio_sugerido;

    // Si no, interpolación/extrapolación: 45000 + (cm - 5) * 10000
    const precio = 45000 + Math.round((cm - 5) * 10000);
    return Math.max(25000, precio);
  };

  const precioEstimadoCustom = calcularPrecioEstimado(customCm);

  // Copiar lista completa en formato WhatsApp
  const handleCopyFullList = async () => {
    const listText = sortedTarifas
      .map(t => `• *${t.altura_cm} cm* (${t.altura_cm * 10} mm) ➔ *$${t.precio_sugerido.toLocaleString('es-CO')} COP*`)
      .join('\n');

    const mensaje = `✨ *LISTA DE VALORES BÁSICOS — WJGEEKS 3D* ✨
_Figuras y Miniaturas en Resina de Alta Definición UV_

${listText}

⏱️ *Tiempo de entrega:* 3 a 5 días hábiles promedio.
💡 *Nota:* Precios de referencia para figuras estándar en resina. Si requieres ahuecado especial, pintura artística o medidas intermedias, ¡envíanos tu modelo y te lo cotizamos al detalle!

📲 *WJGEEKS 3D* — Calidad y detalle para tus colecciones.`;

    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (e) {
      console.error('Error al copiar al portapapeles:', e);
    }
  };

  // Copiar respuesta rápida para un tamaño específico
  const handleCopySingleItem = async (tarifa: TarifaTamano) => {
    const mensaje = `¡Hola! 👋 En *WJGEEKS 3D*, una figura de *${tarifa.altura_cm} cm* (${tarifa.altura_cm * 10} mm) en resina de alta definición tiene un valor estándar de *$${tarifa.precio_sugerido.toLocaleString('es-CO')} COP*.

⏱️ *Tiempo estimado de entrega:* ${tarifa.tiempo_estimado || '3 a 5 días hábiles'}.
🎨 *Material:* Resina UV de máxima resolución (sin líneas de capa visibles).

¿Deseas que preparemos tu pedido o tienes alguna referencia o diseño que quieras mostrarnos? 🚀`;

    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiedId(tarifa.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.error('Error al copiar al portapapeles:', e);
    }
  };

  const handleApplyCustom = () => {
    const customTarifa: TarifaTamano = {
      id: `custom-${customCm}`,
      altura_cm: customCm,
      precio_sugerido: precioEstimadoCustom,
      descripcion: `Figura estimada (${customCm} cm)`,
      tiempo_estimado: customCm > 10 ? '(7) Días hábiles' : '(3) Días hábiles'
    };
    onSelectTarifa(customTarifa);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '750px', 
          width: '98%', 
          maxHeight: 'calc(100vh - 85px)', 
          overflowY: 'auto',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)',
          padding: '16px'
        }}
      >
        {/* ENCABEZADO STICKY EN LA PARTE SUPERIOR */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid var(--border-subtle)', 
          paddingBottom: '12px', 
          marginBottom: '14px',
          position: 'sticky',
          top: '-16px',
          background: 'rgba(17, 24, 39, 0.98)',
          backdropFilter: 'blur(12px)',
          zIndex: 30,
          marginTop: '-4px',
          paddingTop: '6px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} color="var(--brand-cyan)" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Tarifario Rápido (Valores Básicos)
              </h2>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Escala estándar de precios por altura para figuras en resina UV
            </p>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Cerrar modal"
          >
            <X size={15} />
            <span style={{ fontSize: '0.75rem' }}>Cerrar</span>
          </button>
        </div>

        {/* ACCIÓN RÁPIDA: COPIAR LISTA PARA WHATSAPP */}
        <div style={{ 
          background: 'rgba(56, 189, 248, 0.08)', 
          border: '1px solid rgba(56, 189, 248, 0.25)', 
          borderRadius: '10px', 
          padding: '12px 16px', 
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
              📲 ¿Cliente preguntando precios por WhatsApp o Instagram?
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Copia la lista completa estructurada o selecciona una respuesta individual por tamaño.
            </div>
          </div>

          <button
            type="button"
            className={`btn ${copiedAll ? 'btn-primary' : 'btn-cyan'} btn-sm`}
            onClick={handleCopyFullList}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copiedAll ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedAll ? '¡Lista Copiada! 🎉' : 'Copiar Lista Completa'}</span>
          </button>
        </div>

        {/* CALCULADORA / INTERPOLADOR DE TAMAÑO PERSONALIZADO */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="var(--brand-cyan)" />
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                Estimador de Tamaño Personalizado
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Regla base: $45.000 (5 cm) + $10.000 / cm adicional
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Altura deseada:</span>
                <span style={{ fontWeight: 700, color: 'var(--brand-cyan)' }}>{customCm} cm ({customCm * 10} mm)</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="25" 
                step="0.5"
                value={customCm}
                onChange={e => setCustomCm(parseFloat(e.target.value) || 5)}
                style={{ width: '100%', accentColor: 'var(--brand-cyan)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Precio Estimado:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  ${precioEstimadoCustom.toLocaleString('es-CO')} COP
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleApplyCustom}
                style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                title="Cargar esta medida y precio al Cotizador"
              >
                <span>Usar en Cotizador</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* TABLA DE TAMAÑOS Y PRECIOS ESTÁNDAR */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              Escala Estándar (Valores Básicos)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {sortedTarifas.length} tamaños configurados
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
            {sortedTarifas.map(t => {
              const isCopied = copiedId === t.id;

              return (
                <div 
                  key={t.id} 
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--brand-cyan)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {t.altura_cm} cm
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({t.altura_cm * 10} mm)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {t.descripcion || 'Figura coleccionable estándar'}
                      </div>
                      {t.tiempo_estimado && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Clock size={11} />
                          <span>Entrega: {t.tiempo_estimado}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
                        ${t.precio_sugerido.toLocaleString('es-CO')}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        COP
                      </div>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN POR ITEM */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: '0.74rem', padding: '5px 8px', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      onClick={() => handleCopySingleItem(t)}
                      title="Copiar texto de respuesta para WhatsApp"
                    >
                      {isCopied ? <Check size={12} color="#4ade80" /> : <Send size={12} />}
                      <span>{isCopied ? '¡Copiado!' : 'Mensaje WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-cyan btn-sm"
                      style={{ flex: 1, fontSize: '0.74rem', padding: '5px 8px', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      onClick={() => {
                        onSelectTarifa(t);
                        onClose();
                      }}
                      title="Cargar esta medida y precio al formulario de cotización"
                    >
                      <span>Cargar al Cotizador</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PIE DEL MODAL: ENLACE A CATÁLOGOS */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderTop: '1px solid var(--border-subtle)', 
          paddingTop: '14px', 
          marginTop: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {onNavigateToCatalogos ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onClose();
                onNavigateToCatalogos();
              }}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Settings size={14} />
              <span>Editar o Añadir Tamaños en Catálogos</span>
            </button>
          ) : <div />}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onClose}
            style={{ minWidth: '100px' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
