import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  MessageSquare, 
  Download, 
  Copy, 
  Check, 
  Send, 
  ExternalLink,
  Printer
} from 'lucide-react';
import { toast } from '../ui/ToastProvider';

export interface ModalVisualizadorDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  pdfBlobUrl: string | null;
  nombreArchivoPDF: string;
  textoDescriptivo: string;
  onEnviarWhatsApp?: () => void;
  clienteTelefono?: string;
  selectorFormatoPOS?: {
    formatoActual: 'ticket80mm' | 'reciboCarta';
    onChangeFormato: (formato: 'ticket80mm' | 'reciboCarta') => void;
  };
}

export const ModalVisualizadorDocumento: React.FC<ModalVisualizadorDocumentoProps> = ({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  pdfBlobUrl,
  nombreArchivoPDF,
  textoDescriptivo,
  onEnviarWhatsApp,
  clienteTelefono,
  selectorFormatoPOS
}) => {
  const [tabActiva, setTabActiva] = useState<'pdf' | 'texto'>('pdf');
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const handleCopiarTexto = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textoDescriptivo);
      } else {
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = textoDescriptivo;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiado(true);
      toast.success('¡Texto descriptivo copiado al portapapeles!');
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      console.error('Error al copiar texto:', err);
      toast.error('No se pudo copiar automáticamente. Por favor selecciónalo manualmente.');
    }
  };

  const handleDescargar = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = nombreArchivoPDF.endsWith('.pdf') ? nombreArchivoPDF : `${nombreArchivoPDF}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Descargando archivo PDF...');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '850px', 
          width: '94vw', 
          height: '90vh', 
          maxHeight: '850px',
          display: 'flex', 
          flexDirection: 'column', 
          padding: '20px',
          background: '#0d131f',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px'
        }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--brand-cyan)" />
              <span>{titulo}</span>
            </h3>
            {subtitulo && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {subtitulo}
              </div>
            )}
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '5px 8px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Pestañas de Navegación y Selector de Formato */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${tabActiva === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTabActiva('pdf')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <FileText size={15} />
              <span>Vista Previa PDF</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tabActiva === 'texto' ? 'btn-cyan' : 'btn-secondary'}`}
              onClick={() => setTabActiva('texto')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <MessageSquare size={15} />
              <span>Texto Descriptivo (WhatsApp)</span>
            </button>
          </div>

          {/* Selector de formato POS si aplica */}
          {selectorFormatoPOS && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Formato POS:</span>
              <button
                type="button"
                className={`btn btn-sm ${selectorFormatoPOS.formatoActual === 'ticket80mm' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                onClick={() => selectorFormatoPOS.onChangeFormato('ticket80mm')}
              >
                <Printer size={12} style={{ display: 'inline', marginRight: '3px' }} />
                Ticket 80mm
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectorFormatoPOS.formatoActual === 'reciboCarta' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                onClick={() => selectorFormatoPOS.onChangeFormato('reciboCarta')}
              >
                Recibo Formal
              </button>
            </div>
          )}
        </div>

        {/* Cuerpo Principal */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', borderRadius: '10px', background: '#070a10', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {tabActiva === 'pdf' ? (
            pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title={titulo}
                style={{ width: '100%', height: '100%', border: 'none', background: '#525659' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Generando documento PDF...
              </div>
            )
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Plantilla estructurada lista para enviar o adjuntar en mensajería:
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: copiado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                    color: copiado ? '#34d399' : 'var(--brand-cyan)',
                    border: `1px solid ${copiado ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    padding: '4px 10px'
                  }}
                  onClick={handleCopiarTexto}
                >
                  {copiado ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiado ? '¡Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>

              <textarea
                readOnly
                value={textoDescriptivo}
                style={{
                  flex: 1,
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  padding: '12px',
                  fontSize: '0.85rem',
                  lineHeight: '1.45',
                  fontFamily: 'monospace',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDescargar}
              disabled={!pdfBlobUrl}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopiarTexto}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copiado ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
              <span>{copiado ? 'Texto Copiado' : 'Copiar Texto'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onEnviarWhatsApp && (
              <button
                type="button"
                className="btn btn-whatsapp btn-sm"
                onClick={onEnviarWhatsApp}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={15} />
                <span>Enviar por WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
