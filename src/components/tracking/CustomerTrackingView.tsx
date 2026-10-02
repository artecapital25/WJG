import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  Printer, 
  Sun, 
  Palette, 
  CheckCircle2, 
  PackageCheck, 
  Send, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { OrdenTrabajo, Cotizacion, EstadoOT, ConfiguracionTaller } from '../../types';

interface CustomerTrackingViewProps {
  ordenes: OrdenTrabajo[];
  cotizaciones: Cotizacion[];
  config: ConfiguracionTaller;
  initialQuery?: string;
}

const ETAPAS: { estado: EstadoOT; label: string; icon: any; desc: string; porcentaje: number }[] = [
  { 
    estado: 'En Cola', 
    label: 'En Cola de Taller', 
    icon: Clock, 
    desc: 'Tu archivo 3D ha sido verificado y está programado en la fila de producción.',
    porcentaje: 15
  },
  { 
    estado: 'Imprimiendo', 
    label: 'Imprimiendo en 3D', 
    icon: Printer, 
    desc: 'La figura se encuentra en la impresora Anycubic MONO 4 fotopolimerizando resina líquida capa por capa.',
    porcentaje: 40
  },
  { 
    estado: 'Curado', 
    label: 'Lavado & Curado UV', 
    icon: Sun, 
    desc: 'Lavado químico para remover residuos y curado en cámara ultravioleta para máxima dureza mecánica.',
    porcentaje: 65
  },
  { 
    estado: 'Pintura y Armado', 
    label: 'Acabados y Detallado', 
    icon: Palette, 
    desc: 'Retiro de soportes, lijado fino, imprimación bicapa y mesa de pintura/armado artesanal.',
    porcentaje: 85
  },
  { 
    estado: 'Control de Calidad', 
    label: 'Control de Calidad', 
    icon: ShieldCheck, 
    desc: 'Inspección minuciosa de tolerancias dimensionales, empaque protector y preparación de despacho.',
    porcentaje: 95
  },
  { 
    estado: 'Listo para Entrega', 
    label: '¡Listo para Entrega!', 
    icon: PackageCheck, 
    desc: '¡Tu pedido está completamente terminado y disponible para entrega inmediata o envío!',
    porcentaje: 100
  }
];

export const CustomerTrackingView: React.FC<CustomerTrackingViewProps> = ({
  ordenes,
  cotizaciones,
  config,
  initialQuery = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [copiedLink, setCopiedLink] = useState(false);

  // Leer parámetros de URL al montar (?ot=OT-0001 o ?cot=25-074)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const otParam = params.get('ot') || params.get('cot') || params.get('search');
    if (otParam) {
      setSearchTerm(otParam);
    }
  }, []);

  // Buscar orden o cotización
  const cleanTerm = searchTerm.trim().toLowerCase();
  const matchedOT = ordenes.find(o => 
    o.numero_ot.toLowerCase().includes(cleanTerm) ||
    o.cotizacion_numero.toLowerCase().includes(cleanTerm) ||
    (cleanTerm.length >= 4 && o.cliente_nombre.toLowerCase().includes(cleanTerm))
  );

  const matchedCot = cotizaciones.find(c => 
    c.numero_cot.toLowerCase().includes(cleanTerm) ||
    (matchedOT && c.id === matchedOT.cotizacion_id)
  );

  const activeEtapaIndex = matchedOT 
    ? ETAPAS.findIndex(e => e.estado === matchedOT.estado)
    : -1;

  const currentEtapa = activeEtapaIndex >= 0 ? ETAPAS[activeEtapaIndex] : ETAPAS[0];

  const handleCopyShareLink = () => {
    if (!matchedOT) return;
    const url = `${window.location.origin}/?tab=seguimiento&ot=${matchedOT.numero_ot}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleWhatsAppContact = () => {
    if (!matchedOT) return;
    const msg = `Hola WJGEEKS 3D, estoy haciendo seguimiento a mi pedido *${matchedOT.numero_ot}* (${matchedOT.item_nombre}) cotización *${matchedOT.cotizacion_numero}*. ¿Podrían darme información adicional?`;
    window.open(`https://wa.me/57${config.telefono_contacto}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* Banner Encabezado */}
      <div style={{ 
        textAlign: 'center', 
        padding: '24px 16px',
        background: 'linear-gradient(180deg, rgba(27, 98, 177, 0.15) 0%, rgba(11, 15, 23, 0) 100%)',
        borderRadius: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(56, 189, 248, 0.12)', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '12px' }}>
          <Sparkles size={14} color="var(--brand-cyan)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Portal de Rastreo en Vivo
          </span>
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px 0', fontFamily: 'var(--font-display)' }}>
          Seguimiento de Producción 3D
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '520px', margin: '0 auto' }}>
          Consulta en tiempo real en qué estación técnica de manufactura se encuentra tu figura o modelo en nuestro taller.
        </p>
      </div>

      {/* Buscador */}
      <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
          INGRESA NÚMERO DE ORDEN (OT-0001) O COTIZACIÓN (25-074):
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', fontSize: '0.95rem' }}
              placeholder="Ej: OT-0001, 25-074 o nombre del cliente"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {matchedOT && (
            <button
              className="btn btn-secondary"
              onClick={handleCopyShareLink}
              title="Copiar link directo para compartir con el cliente por WhatsApp"
              style={{ whiteSpace: 'nowrap' }}
            >
              {copiedLink ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              <span>{copiedLink ? '¡Link Copiado!' : 'Copiar Link'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Resultado de Seguimiento */}
      {matchedOT ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          {/* Header de la Orden */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  {matchedOT.numero_ot}
                </h3>
                <span style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  Cotización Ref: {matchedOT.cotizacion_numero}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Pieza: <strong style={{ color: 'var(--text-main)' }}>{matchedOT.item_nombre}</strong> (x{matchedOT.cantidad} unidad/es)
              </div>
            </div>

            {/* Badge Estado Actual */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              borderRadius: '9999px',
              background: matchedOT.estado === 'Listo para Entrega' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(27, 98, 177, 0.25)',
              border: matchedOT.estado === 'Listo para Entrega' ? '1px solid #10b981' : '1px solid var(--brand-cyan)',
              color: matchedOT.estado === 'Listo para Entrega' ? '#34d399' : '#38bdf8',
              fontWeight: 800,
              fontSize: '0.95rem'
            }}>
              <currentEtapa.icon size={18} />
              <span>{matchedOT.estado}</span>
            </div>
          </div>

          {/* Barra de Progreso Visual */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span>Avance de Manufactura:</span>
              <span style={{ fontWeight: 800, color: 'var(--brand-cyan)' }}>{currentEtapa.porcentaje}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${currentEtapa.porcentaje}%`, 
                height: '100%', 
                background: matchedOT.estado === 'Listo para Entrega' ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #1b62b1, #38bdf8)',
                transition: 'width 0.6s ease'
              }} />
            </div>
          </div>

          {/* Timeline de Etapas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {ETAPAS.map((etapa, idx) => {
              const isPast = idx < activeEtapaIndex;
              const isCurrent = idx === activeEtapaIndex;
              const isFuture = idx > activeEtapaIndex;
              const IconComponent = etapa.icon;

              return (
                <div 
                  key={etapa.estado}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: isCurrent ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                    opacity: isFuture ? 0.45 : 1
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: isPast ? '#10b981' : isCurrent ? 'var(--brand-blue)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    marginTop: '2px'
                  }}>
                    {isPast ? <CheckCircle2 size={16} /> : <IconComponent size={16} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: isCurrent ? 800 : 600, fontSize: '0.9rem', color: isCurrent ? 'var(--brand-cyan)' : isPast ? '#e2e8f0' : 'var(--text-muted)' }}>
                        {etapa.label}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--brand-cyan)', color: '#000', fontWeight: 800 }}>
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                      {etapa.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Información Adicional y Contacto */}
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '16px', 
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cliente: <strong style={{ color: 'var(--text-main)' }}>{matchedOT.cliente_nombre}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tiempo estimado de entrega: <strong>{matchedCot?.tiempo_entrega_estimado || '(3) Días hábiles'}</strong>
              </div>
            </div>

            <button
              className="btn btn-whatsapp"
              onClick={handleWhatsAppContact}
              style={{ fontWeight: 700 }}
            >
              <Send size={15} />
              <span>Contactar al Taller por WhatsApp</span>
            </button>
          </div>
        </div>
      ) : (
        /* Estado vacío / Guía de búsqueda */
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
          <Clock size={40} style={{ color: 'var(--brand-cyan)', opacity: 0.6, marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0' }}>
            {searchTerm ? `No encontramos la orden "${searchTerm}"` : 'Busca tu orden de trabajo o cotización'}
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px auto' }}>
            Ingresa el código que te compartimos en tu comprobante de cotización (por ejemplo <strong>OT-0001</strong> o <strong>25-001</strong>) para ver el progreso en tiempo real.
          </p>

          {ordenes.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '8px' }}>
                Órdenes recientes en taller:
              </span>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {ordenes.slice(0, 5).map(o => (
                  <button 
                    key={o.id}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => setSearchTerm(o.numero_ot)}
                  >
                    {o.numero_ot} ({o.item_nombre})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
