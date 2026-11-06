import React from 'react';
import { Save, Send, FileDown, X } from 'lucide-react';
import { CotizadorTotalsSummaryProps } from '../types/cotizador.types';

export const CotizadorTotalsSummary: React.FC<CotizadorTotalsSummaryProps> = React.memo(({
  subtotal,
  descuentoPorcentaje,
  setDescuentoPorcentaje,
  descuentoMonto,
  subtotalConDescuento,
  ivaPorcentaje,
  setIvaPorcentaje,
  ivaMonto,
  ahorroVolumenTotal,
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

      {/* Apartado de Descuentos Comerciales e IVA */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '14px',
        margin: '16px 0'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Descuento Comercial */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Descuento Comercial Global</span>
              <strong style={{ color: descuentoPorcentaje > 0 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                {descuentoPorcentaje}% (-${descuentoMonto.toLocaleString('es-CO')})
              </strong>
            </label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {[0, 5, 10, 15, 20].map(pct => (
                <button
                  key={pct}
                  type="button"
                  className={`btn btn-sm ${descuentoPorcentaje === pct ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px 0', fontSize: '0.78rem' }}
                  onClick={() => setDescuentoPorcentaje(pct)}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number" 
                className="form-input" 
                min="0" 
                max="100" 
                step="1"
                placeholder="Otro %"
                value={descuentoPorcentaje === 0 ? '' : descuentoPorcentaje}
                onChange={e => setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                style={{ fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>% manual</span>
            </div>
          </div>

          {/* IVA */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Impuesto al Valor Agregado (IVA)</span>
              <strong style={{ color: ivaPorcentaje > 0 ? 'var(--brand-cyan)' : 'var(--text-muted)' }}>
                {ivaPorcentaje}% (+${ivaMonto.toLocaleString('es-CO')})
              </strong>
            </label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${ivaPorcentaje === 0 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 0', fontSize: '0.78rem' }}
                onClick={() => setIvaPorcentaje(0)}
              >
                0% (Sin IVA)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${ivaPorcentaje === 19 ? 'btn-cyan' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 0', fontSize: '0.78rem' }}
                onClick={() => setIvaPorcentaje(19)}
              >
                19% (General)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${ivaPorcentaje === 5 ? 'btn-cyan' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 0', fontSize: '0.78rem' }}
                onClick={() => setIvaPorcentaje(5)}
              >
                5%
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number" 
                className="form-input" 
                min="0" 
                max="100" 
                step="1"
                placeholder="Otro % IVA"
                value={ivaPorcentaje === 0 ? '' : ivaPorcentaje}
                onChange={e => setIvaPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                style={{ fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>% manual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vendedor / Asesor */}
      <div className="form-group" style={{ marginBottom: '14px' }}>
        <label className="form-label">Vendedor / Asesor Comercial</label>
        <input 
          type="text" 
          className="form-input" 
          value={vendedorNombre}
          onChange={e => setVendedorNombre(e.target.value)}
          placeholder="Nombre del asesor"
        />
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

      {/* Desglose de Totales Financieros */}
      <div style={{ 
        background: 'rgba(0, 0, 0, 0.45)', 
        border: '1px solid rgba(56, 189, 248, 0.2)', 
        padding: '16px 18px', 
        borderRadius: '12px', 
        margin: '16px 0' 
      }}>
        {/* Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          <span>Subtotal ítems:</span>
          <span style={{ fontWeight: 600 }}>${subtotal.toLocaleString('es-CO')} COP</span>
        </div>

        {/* Ahorro por Volumen */}
        {ahorroVolumenTotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', color: '#34d399' }}>
            <span>🎉 Ahorro por volumen ya aplicado:</span>
            <span>-${ahorroVolumenTotal.toLocaleString('es-CO')} COP</span>
          </div>
        )}

        {/* Descuento Comercial */}
        {descuentoPorcentaje > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--accent-warning)' }}>
            <span>Descuento Comercial ({descuentoPorcentaje}%):</span>
            <span>-${descuentoMonto.toLocaleString('es-CO')} COP</span>
          </div>
        )}

        {/* Base Imponible si hay IVA o descuento */}
        {(descuentoPorcentaje > 0 || ivaPorcentaje > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-subtle)', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
            <span>Subtotal neto (Base gravable):</span>
            <span>${subtotalConDescuento.toLocaleString('es-CO')} COP</span>
          </div>
        )}

        {/* IVA */}
        {ivaPorcentaje > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--brand-cyan)' }}>
            <span>IVA ({ivaPorcentaje}%):</span>
            <span>+${ivaMonto.toLocaleString('es-CO')} COP</span>
          </div>
        )}

        {/* Total Final */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingTop: '10px', 
          marginTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)', 
          fontWeight: 800, 
          fontSize: '1.3rem' 
        }}>
          <div>
            <div>TOTAL:</div>
            {ivaPorcentaje === 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                (Exento de IVA / Régimen no responsable)
              </div>
            )}
          </div>
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
