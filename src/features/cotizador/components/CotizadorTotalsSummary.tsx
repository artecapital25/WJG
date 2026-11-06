import React from 'react';
import { Save, Send, FileDown, X, Clock, Calendar, Check, Plus } from 'lucide-react';
import { CotizadorTotalsSummaryProps } from '../types/cotizador.types';
import { NOTAS_RAPIDAS_SUGERIDAS, toggleNotaRapida } from '../../../utils/businessDays';

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
  diasEntrega = 3,
  fechaEntrega,
  handleCambiarDiasEntrega,
  handleCambiarFechaEntrega,
  tiempoEntregaTexto,
  tieneItemsPendientes,
  esEdicion,
  numeroCotFinal,
  onSave,
  onSendWhatsApp,
  onSharePDFWhatsApp,
  onDownloadPDF,
  onVisualizarDocumento,
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

      {/* Tiempo Estimado de Fabricación y Entrega (Slider 3 a 30 días hábiles + Calendario) */}
      <div className="form-group" style={{ 
        marginBottom: '16px', 
        background: 'rgba(255, 255, 255, 0.03)', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} color="var(--brand-cyan)" />
            <span>Tiempo de Fabricación & Entrega</span>
          </label>
          <span style={{ 
            fontSize: '0.82rem', 
            fontWeight: 800, 
            color: 'var(--brand-cyan)', 
            background: 'rgba(56, 189, 248, 0.12)', 
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '2px 8px',
            borderRadius: '6px'
          }}>
            {tiempoEntregaTexto || `(${diasEntrega}) Días hábiles`}
          </span>
        </div>

        {/* Barra Deslizadora (Slider de 3 a 30 días) */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>⚡ 3 días mín.</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>{diasEntrega} días hábiles</span>
            <span>🏭 30 días máx.</span>
          </div>
          <input 
            type="range"
            min={3}
            max={30}
            step={1}
            value={diasEntrega}
            onChange={(e) => handleCambiarDiasEntrega && handleCambiarDiasEntrega(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--brand-cyan)', cursor: 'pointer' }}
          />
        </div>

        {/* Presets Rápidos */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {[3, 5, 8, 15, 20, 30].map((dias) => (
            <button
              key={dias}
              type="button"
              className={`btn btn-sm ${diasEntrega === dias ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, minWidth: '45px', padding: '3px 0', fontSize: '0.75rem' }}
              onClick={() => handleCambiarDiasEntrega && handleCambiarDiasEntrega(dias)}
            >
              {dias}d
            </button>
          ))}
        </div>

        {/* Selector de Fecha en Calendario */}
        <div>
          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} color="var(--brand-purple)" />
            FECHA ESTIMADA DE ENTREGA (CALENDARIO)
          </label>
          <input 
            type="date"
            className="form-input"
            value={fechaEntrega || ''}
            onChange={(e) => handleCambiarFechaEntrega && handleCambiarFechaEntrega(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
            💡 Al mover la barra deslizadora o cambiar la fecha, se sincronizan automáticamente omitiendo domingos.
          </span>
        </div>
      </div>

      {/* Condiciones y Observaciones con Chips de Notas Rápidas */}
      <div className="form-group" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label className="form-label" style={{ margin: 0 }}>Condiciones & Observaciones</label>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Toca un chip para agregar/quitar</span>
        </div>

        {/* Chips de Notas Rápidas */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {NOTAS_RAPIDAS_SUGERIDAS.map((item) => {
            const estaActiva = (notas || '').toLowerCase().includes(item.texto.replace(/^[•\s]+/, '').trim().toLowerCase());
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setNotas(toggleNotaRapida(notas || '', item.texto))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: estaActiva ? '1px solid var(--brand-cyan)' : '1px solid rgba(255,255,255,0.1)',
                  background: estaActiva ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: estaActiva ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {estaActiva ? <Check size={11} color="var(--brand-cyan)" /> : <Plus size={11} />}
                <span>{item.etiqueta}</span>
              </button>
            );
          })}
        </div>

        <textarea 
          className="form-textarea" 
          rows={3}
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Condiciones comerciales, especificaciones de entrega, etc."
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

        {/* IVA Obligatorio */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: ivaPorcentaje > 0 ? 'var(--brand-cyan)' : 'var(--text-muted)' }}>
          <span>
            IVA ({ivaPorcentaje}%):
            {ivaPorcentaje === 0 && (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', marginLeft: '6px' }}>
                (Régimen Simple / No Responsable)
              </span>
            )}
          </span>
          <span style={{ fontWeight: 600 }}>
            {ivaPorcentaje > 0 ? `+$${ivaMonto.toLocaleString('es-CO')} COP` : '$0 COP'}
          </span>
        </div>

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

        {onVisualizarDocumento && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onVisualizarDocumento}
            style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--brand-cyan)', fontWeight: 600 }}
            title="Ver PDF en pantalla y copiar texto formateado para WhatsApp"
          >
            <FileDown size={16} />
            <span>Ver Documento PDF / Texto</span>
          </button>
        )}

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
