import React from 'react';
import { Save, Send, FileDown, X } from 'lucide-react';
import { CotizadorTotalsSummaryProps } from '../types/cotizador.types';

export const CotizadorTotalsSummary: React.FC<CotizadorTotalsSummaryProps> = React.memo(({
  subtotal,
  descuentoPorcentaje,
  setDescuentoPorcentaje,
  descuentoMonto,
  total,
  tipoEstado,
  setTipoEstado,
  vendedorNombre,
  setVendedorNombre,
  notas,
  setNotas,
  tieneItemsPendientes,
  esEdicion,
  numeroCotFinal,
  onSave,
  onSendWhatsApp,
  onSharePDFWhatsApp,
  onDownloadPDF,
  onCancelarEdicion
}) => {
  return (
    <>
      {/* Selector de Tipo de Cotización */}
      <div className="form-group" style={{ marginBottom: '14px' }}>
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Tipo / Estado de la Cotización</span>
          {tieneItemsPendientes && (
            <span style={{ color: '#fde047', fontSize: '0.75rem', fontWeight: 600 }}>
              ⚠️ Contiene piezas con medidas pendientes
            </span>
          )}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${tipoEstado === 'Enviada' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTipoEstado('Enviada')}
          >
            Oficial (Enviada)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tipoEstado === 'Parcial' ? 'btn-cyan' : 'btn-secondary'}`}
            style={tipoEstado === 'Parcial' ? { background: '#ca8a04', color: '#fff', borderColor: '#eab308' } : {}}
            onClick={() => setTipoEstado('Parcial')}
          >
            🟡 Parcial (Pendiente)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tipoEstado === 'Borrador' ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setTipoEstado('Borrador')}
          >
            Borrador
          </button>
        </div>
      </div>

      {/* Descuento y Vendedor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', margin: '16px 0' }}>
        <div className="form-group">
          <label className="form-label">Descuento (%)</label>
          <input 
            type="number" 
            className="form-input" 
            min="0" 
            max="50" 
            value={descuentoPorcentaje}
            onChange={e => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Vendedor / Asesor</label>
          <input 
            type="text" 
            className="form-input" 
            value={vendedorNombre}
            onChange={e => setVendedorNombre(e.target.value)}
          />
        </div>
      </div>

      {/* Condiciones y Observaciones */}
      <div className="form-group">
        <label className="form-label">Condiciones & Observaciones</label>
        <textarea 
          className="form-textarea" 
          rows={2}
          value={notas}
          onChange={e => setNotas(e.target.value)}
        />
      </div>

      {/* Desglose de Totales */}
      <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          <span>Subtotal:</span>
          <span>${subtotal.toLocaleString('es-CO')} COP</span>
        </div>
        {descuentoPorcentaje > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--accent-warning)' }}>
            <span>Descuento ({descuentoPorcentaje}%):</span>
            <span>-${descuentoMonto.toLocaleString('es-CO')} COP</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontWeight: 800, fontSize: '1.25rem' }}>
          <span>TOTAL:</span>
          <span style={{ color: 'var(--brand-cyan)' }}>${total.toLocaleString('es-CO')} COP</span>
        </div>
      </div>

      {/* Botones de Acción */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        <button 
          type="button" 
          className="btn btn-primary"
          style={esEdicion ? { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#f59e0b', color: '#000', fontWeight: 700 } : {}}
          onClick={onSave}
        >
          <Save size={16} />
          <span>{esEdicion ? `Guardar Cambios N° ${numeroCotFinal}` : 'Guardar Cotización Oficial'}</span>
        </button>

        <button 
          type="button" 
          className="btn btn-whatsapp" 
          onClick={onSendWhatsApp}
        >
          <Send size={16} />
          <span>Enviar Texto WhatsApp</span>
        </button>

        <button 
          type="button" 
          className="btn btn-cyan" 
          onClick={onSharePDFWhatsApp}
        >
          <FileDown size={16} />
          <span>Enviar PDF por WhatsApp</span>
        </button>

        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onDownloadPDF}
        >
          <FileDown size={16} />
          <span>Descargar PDF</span>
        </button>

        {esEdicion && onCancelarEdicion && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onCancelarEdicion}
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
          >
            <X size={16} />
            <span>Cancelar Edición</span>
          </button>
        )}
      </div>
    </>
  );
});
CotizadorTotalsSummary.displayName = 'CotizadorTotalsSummary';
