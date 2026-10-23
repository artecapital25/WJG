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
  isIsolatedMode?: boolean;
}

export interface EtapaProduccion {
  codigo: string;
  aliases: string[];
  label: string;
  icon: any;
  desc: string;
  porcentaje: number;
}

export const ETAPAS: EtapaProduccion[] = [
  { 
    codigo: 'EN_COLA_OT',
    aliases: ['en cola', 'en_cola_ot', 'aprobada / en cola ot', 'en cola de taller'],
    label: 'En Cola de Taller', 
    icon: Clock, 
    desc: 'Tu archivo 3D ha sido verificado y está programado en la fila de producción.',
    porcentaje: 15
  },
  { 
    codigo: 'IMPRESION',
    aliases: ['imprimiendo', 'impresion', 'impresión 3d', 'imprimiendo en 3d'],
    label: 'Imprimiendo en 3D', 
    icon: Printer, 
    desc: 'La figura se encuentra en la impresora Anycubic MONO 4 fotopolimerizando resina líquida capa por capa.',
    porcentaje: 35
  },
  { 
    codigo: 'CURADO',
    aliases: ['curado', 'lavado y curado uv', 'lavado & curado uv', 'lavado y curado'],
    label: 'Lavado & Curado UV', 
    icon: Sun, 
    desc: 'Lavado químico para remover residuos y curado en cámara ultravioleta para máxima dureza mecánica.',
    porcentaje: 55
  },
  { 
    codigo: 'PINTADO_ARMADO',
    aliases: ['pintura y armado', 'pintado_armado', 'acabados y detallado', 'pintado', 'armado'],
    label: 'Pintura & Acabados', 
    icon: Palette, 
    desc: 'Retiro de soportes, lijado fino, imprimación bicapa y mesa de pintura/armado artesanal.',
    porcentaje: 75
  },
  { 
    codigo: 'CONTROL_CALIDAD',
    aliases: ['control de calidad', 'control_calidad', 'inspección'],
    label: 'Control de Calidad', 
    icon: ShieldCheck, 
    desc: 'Inspección minuciosa de tolerancias dimensionales, empaque protector y preparación de despacho.',
    porcentaje: 90
  },
  { 
    codigo: 'ENTREGADO',
    aliases: ['listo para entrega', 'entregado', 'enviado / entregado', 'completado', 'finalizado'],
    label: '¡Listo para Entrega!', 
    icon: PackageCheck, 
    desc: '¡Tu pedido está completamente terminado, inspeccionado y disponible para entrega inmediata o envío!',
    porcentaje: 100
  }
];

export function normalizeEstadoOT(estado: string): string {
  const s = (estado || '').trim().toLowerCase();
  if (s.includes('entrega') || s === 'entregado' || s === 'listo para entrega' || s === 'completado' || s === 'finalizado') {
    return 'ENTREGADO';
  }
  if (s.includes('calidad') || s.includes('control')) {
    return 'CONTROL_CALIDAD';
  }
  if (s.includes('pint') || s.includes('armad') || s.includes('acabado')) {
    return 'PINTADO_ARMADO';
  }
  if (s.includes('curad') || s.includes('lavad')) {
    return 'CURADO';
  }
  if (s.includes('imp') || s.includes('slic')) {
    return 'IMPRESION';
  }
  return 'EN_COLA_OT';
}

export const CustomerTrackingView: React.FC<CustomerTrackingViewProps> = ({
  ordenes,
  cotizaciones,
  config,
  initialQuery = '',
  isIsolatedMode = false
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [copiedLink, setCopiedLink] = useState(false);

  // Leer parámetros de URL al montar (?token=uuid o ?ot=OT-0001 o ?cot=25-074)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const otParam = params.get('token') || params.get('ot') || params.get('cot') || params.get('search');
    if (otParam) {
      setSearchTerm(otParam);
    }
  }, []);

  // Buscar orden o cotización (por token criptográfico o identificador oficial)
  const cleanTerm = searchTerm.trim().toLowerCase();
  const matchedOT = ordenes.find(o => 
    (o.tracking_token && o.tracking_token.toLowerCase() === cleanTerm) ||
    o.numero_ot.toLowerCase() === cleanTerm ||
    o.cotizacion_numero.toLowerCase() === cleanTerm ||
    (!isIsolatedMode && cleanTerm.length >= 4 && o.cliente_nombre.toLowerCase().includes(cleanTerm))
  );

  const matchedCot = cotizaciones.find(c => 
    (c.tracking_token && c.tracking_token.toLowerCase() === cleanTerm) ||
    c.numero_cot.toLowerCase() === cleanTerm ||
    (matchedOT && c.id === matchedOT.cotizacion_id)
  );

  // Cálculo seguro del avance: garantía absoluta de 100% si está terminada o pagada y en despacho
  const normCode = matchedOT ? normalizeEstadoOT(matchedOT.estado) : '';
  const isFinished = normCode === 'ENTREGADO' || matchedOT?.estado === 'Listo para Entrega' || (matchedOT?.estado as string) === 'Entregado';
  const isFullyPaid = matchedOT ? ((matchedOT.saldo_pendiente ?? 0) <= 0 && (matchedOT.abono || 0) > 0) || matchedOT.estado_pago === 'Pagado Total' : false;

  let activeEtapaIndex = -1;
  if (matchedOT) {
    if (isFinished || (isFullyPaid && (normCode === 'CONTROL_CALIDAD' || normCode === 'ENTREGADO'))) {
      activeEtapaIndex = 5; // 100% ¡Listo para Entrega!
    } else {
      const foundIdx = ETAPAS.findIndex(e => 
        e.codigo === normCode || 
        e.aliases.includes((matchedOT.estado || '').toLowerCase().trim())
      );
      activeEtapaIndex = foundIdx >= 0 ? foundIdx : 0;
    }
  }

  const currentEtapa = activeEtapaIndex >= 0 ? ETAPAS[activeEtapaIndex] : ETAPAS[0];

  const handleCopyShareLink = () => {
    if (!matchedOT) return;
    const tokenParam = matchedOT.tracking_token ? `token=${encodeURIComponent(matchedOT.tracking_token)}` : `ot=${encodeURIComponent(matchedOT.numero_ot)}`;
    const url = `${window.location.origin}/?portal=cliente&${tokenParam}`;
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
        background: 'linear-gradient(180deg, rgba(27, 98, 177, 0.2) 0%, rgba(11, 15, 23, 0) 100%)',
        borderRadius: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(56, 189, 248, 0.2)'
      }}>
        {isIsolatedMode && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <img 
              src="/wjg_logo_vector.svg" 
              alt="WJGEEKS 3D" 
              style={{ width: '40px', height: '40px' }} 
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
                WJGEEKS <span style={{ color: 'var(--brand-cyan)' }}>3D</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Taller de Impresión 3D & Acabados de Colección
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(56, 189, 248, 0.12)', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '12px' }}>
          <Sparkles size={14} color="var(--brand-cyan)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Portal Seguro de Seguimiento de Piezas
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                borderRadius: '9999px',
                background: currentEtapa.porcentaje === 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(27, 98, 177, 0.25)',
                border: currentEtapa.porcentaje === 100 ? '1px solid #10b981' : '1px solid var(--brand-cyan)',
                color: currentEtapa.porcentaje === 100 ? '#34d399' : '#38bdf8',
                fontWeight: 800,
                fontSize: '0.95rem'
              }}>
                <currentEtapa.icon size={18} />
                <span>{currentEtapa.label}</span>
              </div>
              {isFullyPaid && (
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  padding: '6px 12px', 
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontWeight: 700,
                  fontSize: '0.82rem'
                }}>
                  <CheckCircle2 size={14} />
                  <span>100% Pagado</span>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Progreso Visual */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span>Avance de Manufactura:</span>
              <span style={{ fontWeight: 800, color: currentEtapa.porcentaje === 100 ? '#34d399' : 'var(--brand-cyan)' }}>
                {currentEtapa.porcentaje}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${currentEtapa.porcentaje}%`, 
                height: '100%', 
                background: currentEtapa.porcentaje === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #1b62b1, #38bdf8)',
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
                  key={etapa.codigo}
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

          {!isIsolatedMode && ordenes.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '8px' }}>
                Órdenes recientes en taller (Vista Admin):
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

      {/* Pie de página seguro para clientes */}
      {isIsolatedMode && (
        <div style={{ 
          marginTop: '36px', 
          paddingTop: '20px', 
          borderTop: '1px solid var(--border-subtle)', 
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            🔒 <strong>Enlace confidencial:</strong> Este portal muestra exclusivamente el progreso técnico de tu pieza sin exponer datos de otros clientes ni costos internos.
          </p>
          <p style={{ margin: '0 0 4px 0' }}>
            WJGEEKS 3D • Manufactura de Alta Definición UV • Bogotá, Colombia • WhatsApp: +57 320 279 6115
          </p>
        </div>
      )}
    </div>
  );
};
