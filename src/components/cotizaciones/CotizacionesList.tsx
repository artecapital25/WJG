import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  FileDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Cotizacion, EstadoCotizacion, ConfiguracionTaller, OrdenTrabajo } from '../../types';
import { generarPDFCotizacion, compartirPDFWhatsApp } from '../../services/pdfService';
import { generateCotizacionWhatsAppUrl, openWhatsApp } from '../../services/whatsappService';

interface CotizacionesListProps {
  cotizaciones: Cotizacion[];
  config: ConfiguracionTaller;
  onUpdateEstado: (cotId: string, nuevoEstado: EstadoCotizacion) => void;
  onAprobarCotizacion: (cot: Cotizacion) => void;
  onNuevaCotizacion: () => void;
}

export const CotizacionesList: React.FC<CotizacionesListProps> = ({
  cotizaciones,
  config,
  onUpdateEstado,
  onAprobarCotizacion,
  onNuevaCotizacion
}) => {
  const [filtro, setFiltro] = useState<string>('todos');

  const cotizacionesFiltradas = filtro === 'todos' 
    ? cotizaciones 
    : cotizaciones.filter(c => c.estado === filtro);

  const handleAceptar = (cot: Cotizacion) => {
    onAprobarCotizacion(cot);
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <FileText size={22} color="var(--brand-cyan)" />
            Historial de Cotizaciones
          </h2>
          <p className="section-subtitle">Gestiona presupuestos, envíos por WhatsApp y aprobación a taller</p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={onNuevaCotizacion}>
          <Plus size={16} />
          <span>Nueva Cotización</span>
        </button>
      </div>

      {/* Filtros de Estado */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {['todos', 'Enviada', 'Aceptada', 'Borrador', 'Facturada'].map(f => (
          <button 
            key={f}
            className={`btn btn-sm ${filtro === f ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'todos' ? `Todas (${cotizaciones.length})` : f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cotizacionesFiltradas.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <FileText size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>No se encontraron cotizaciones en esta vista.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }} onClick={onNuevaCotizacion}>
            Crear Primera Cotización
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cotizacionesFiltradas.map(cot => (
            <div key={cot.id} className="glass-card" style={{ margin: 0, padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-cyan)' }}>
                      #{cot.numero_cot}
                    </span>
                    <span className="status-pill status-imprimiendo">
                      {cot.estado}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '4px' }}>
                    👤 {cot.cliente.nombre}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    📅 {cot.fecha} | Vendedor: {cot.vendedor} | 📱 {cot.cliente.telefono}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>
                    ${cot.total.toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {cot.items.length} pieza(s) cotizada(s)
                  </div>
                </div>
              </div>

              {/* Resumen de piezas */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                {cot.items.map((it, idx) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>• {it.nombre_item} (x{it.cantidad})</span>
                    <span>${it.precio_total.toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-whatsapp btn-sm"
                  onClick={() => openWhatsApp(generateCotizacionWhatsAppUrl(cot, config))}
                  title="Enviar resumen escrito por WhatsApp"
                >
                  <Send size={14} />
                  <span>Texto WhatsApp</span>
                </button>

                <button 
                  className="btn btn-cyan btn-sm"
                  onClick={() => compartirPDFWhatsApp(cot, config)}
                  title="Compartir PDF oficial por WhatsApp"
                >
                  <FileDown size={14} />
                  <span>PDF WhatsApp</span>
                </button>

                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => generarPDFCotizacion(cot, config)}
                  title="Descargar documento PDF"
                >
                  <FileDown size={14} />
                  <span>PDF</span>
                </button>

                {cot.estado !== 'Aceptada' && cot.estado !== 'Facturada' && (
                  <button 
                    className="btn btn-primary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => handleAceptar(cot)}
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprobar ➔ Enviar a Taller (Generar OTs)</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
