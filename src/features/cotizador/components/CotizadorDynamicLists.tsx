import React from 'react';
import { 
  Palette, 
  Layers, 
  Package, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  ExternalLink,
  Link2
} from 'lucide-react';
import { Insumo } from '../../../types';
import { 
  ItemPinturaForm, 
  ItemAccesorioForm, 
  ItemEmpaqueForm, 
  ItemEnlaceCompraForm 
} from '../types/cotizador.types';
import { calcularCostoInsumoItem } from '../utils/pricingCalculator';
import { detect3DPlatform } from '../../../services/platformUtils';

interface CotizadorDynamicListsProps {
  vaPintado: boolean;
  setVaPintado: (val: boolean) => void;
  pinturasSeleccionadas: ItemPinturaForm[];
  handleAddPintura: () => void;
  handleRemovePintura: (tempId: string) => void;
  handleUpdatePintura: (tempId: string, field: 'insumoId' | 'cantidadMl', val: any) => void;
  insumosPinturas: Insumo[];

  herrajesSeleccionados: ItemAccesorioForm[];
  handleAddHerraje: () => void;
  handleRemoveHerraje: (tempId: string) => void;
  handleUpdateHerraje: (tempId: string, field: 'insumoId' | 'cantidad' | 'modoConsumo' | 'valorEntrada', val: any) => void;
  insumosHerrajes: Insumo[];

  empaquesSeleccionados: ItemEmpaqueForm[];
  handleAddEmpaque: () => void;
  handleRemoveEmpaque: (tempId: string) => void;
  handleUpdateEmpaque: (tempId: string, field: 'insumoId' | 'cantidad', val: any) => void;
  insumosEmpaques: Insumo[];

  enlacesCompra: ItemEnlaceCompraForm[];
  handleAddEnlaceCompra: () => void;
  handleRemoveEnlaceCompra: (tempId: string) => void;
  handleUpdateEnlaceCompra: (tempId: string, field: keyof ItemEnlaceCompraForm, val: any) => void;
}

export const CotizadorDynamicLists: React.FC<CotizadorDynamicListsProps> = ({
  vaPintado,
  setVaPintado,
  pinturasSeleccionadas,
  handleAddPintura,
  handleRemovePintura,
  handleUpdatePintura,
  insumosPinturas,

  herrajesSeleccionados,
  handleAddHerraje,
  handleRemoveHerraje,
  handleUpdateHerraje,
  insumosHerrajes,

  empaquesSeleccionados,
  handleAddEmpaque,
  handleRemoveEmpaque,
  handleUpdateEmpaque,
  insumosEmpaques,

  enlacesCompra,
  handleAddEnlaceCompra,
  handleRemoveEnlaceCompra,
  handleUpdateEnlaceCompra
}) => {
  return (
    <>
      {/* 1. Pinturas y Acabados */}
      {vaPintado && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '14px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid rgba(168, 85, 247, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={16} color="#c084fc" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                Pinturas, Primers y Barnices ({pinturasSeleccionadas.length})
              </span>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleAddPintura}
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              <Plus size={12} />
              <span>+ Agregar Pintura</span>
            </button>
          </div>

          {pinturasSeleccionadas.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Sin pinturas seleccionadas. Clic en "+ Agregar Pintura" para asignar colores de taller.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pinturasSeleccionadas.map(p => (
                <div key={p.tempId} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select 
                    className="form-select"
                    value={p.insumoId}
                    onChange={e => handleUpdatePintura(p.tempId, 'insumoId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Selecciona pintura / primer...</option>
                    {insumosPinturas.map(ins => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nombre} (${ins.costo_unitario}/ml)
                      </option>
                    ))}
                  </select>

                  <div className="input-with-unit" style={{ width: '100px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={p.cantidadMl}
                      onChange={e => handleUpdatePintura(p.tempId, 'cantidadMl', parseFloat(e.target.value) || 0)}
                      placeholder="ml"
                    />
                    <span className="input-unit-badge">ml</span>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemovePintura(p.tempId)}
                    title="Eliminar pintura"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Herrajes, Cintas, Insumos Porcionados & Ensamble (Uso Interno Taller) */}
      <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
          <div>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--brand-cyan)" />
              Herrajes, Cintas, Insumos Porcionados & Ensamble ({herrajesSeleccionados.length})
              <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.14)', color: 'var(--brand-cyan)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                Uso Interno Taller
              </span>
            </label>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Puedes ingresar por <strong>Porcentaje (% del rollo/total, ej: 5%)</strong> o por <strong>Fracción / Unidad decimal (ej: 0.2 o 1)</strong>.
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleAddHerraje}
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
          >
            <Plus size={12} />
            <span>+ Agregar Insumo / Cinta / Herraje</span>
          </button>
        </div>

        {herrajesSeleccionados.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Sin cintas, pegantes ni herrajes adicionales en esta pieza.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {herrajesSeleccionados.map(h => {
              const insSeleccionado = insumosHerrajes.find(i => i.id === h.insumoId);
              const modo = h.modoConsumo || 'unidad';
              const valActual = h.valorEntrada !== undefined ? h.valorEntrada : h.cantidad;
              const calculo = insSeleccionado
                ? calcularCostoInsumoItem(insSeleccionado, h.cantidad, modo, valActual)
                : { costo: 0, cantidadEquivalente: 0, modo, valor: valActual };

              return (
                <div 
                  key={h.tempId} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select 
                      className="form-select"
                      value={h.insumoId}
                      onChange={e => handleUpdateHerraje(h.tempId, 'insumoId', e.target.value)}
                      style={{ flex: 1, minWidth: '180px' }}
                    >
                      <option value="">Selecciona cinta, insumo o herraje...</option>
                      {insumosHerrajes.map(ins => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre} (Total: ${(ins.costo_total || ins.costo_unitario).toLocaleString('es-CO')} | Und: ${Math.round(ins.costo_unitario).toLocaleString('es-CO')})
                        </option>
                      ))}
                    </select>

                    {/* Toggle Modo Dual: Fracción/Und vs Porcentaje (%) */}
                    <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.35)', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateHerraje(h.tempId, 'modoConsumo', 'unidad')}
                        style={{
                          padding: '5px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: modo === 'unidad' ? 'var(--brand-cyan)' : 'rgba(15, 23, 42, 0.8)',
                          color: modo === 'unidad' ? '#000' : 'var(--text-muted)'
                        }}
                        title="Ingresar por unidad o fracción decimal (ej: 0.2 de cinta o 2 argollas)"
                      >
                        Und / Fracc
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateHerraje(h.tempId, 'modoConsumo', 'porcentaje')}
                        style={{
                          padding: '5px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: modo === 'porcentaje' ? '#f59e0b' : 'rgba(15, 23, 42, 0.8)',
                          color: modo === 'porcentaje' ? '#000' : 'var(--text-muted)'
                        }}
                        title="Ingresar por porcentaje del producto total (ej: 5% del rollo de cinta)"
                      >
                        % Total
                      </button>
                    </div>

                    <div className="input-with-unit" style={{ width: '105px' }}>
                      <input 
                        type="number" 
                        step="any"
                        min="0"
                        className="form-input" 
                        value={valActual}
                        onChange={e => handleUpdateHerraje(h.tempId, 'valorEntrada', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        placeholder={modo === 'porcentaje' ? 'Ej: 5' : 'Ej: 0.2'}
                      />
                      <span className="input-unit-badge" style={{ color: modo === 'porcentaje' ? '#fbbf24' : 'var(--brand-cyan)', fontWeight: 700 }}>
                        {modo === 'porcentaje' ? '%' : 'und'}
                      </span>
                    </div>

                    {/* Costo en tiempo real de lo que se va a consumir */}
                    <div 
                      style={{ 
                        minWidth: '90px', 
                        textAlign: 'right', 
                        background: 'rgba(34, 197, 94, 0.12)', 
                        border: '1px solid rgba(34, 197, 94, 0.3)', 
                        padding: '4px 8px', 
                        borderRadius: '6px',
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: '#4ade80' 
                      }}
                      title="Costo calculado del consumo para uso interno del taller"
                    >
                      +${calculo.costo.toLocaleString('es-CO')}
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveHerraje(h.tempId)}
                      title="Eliminar insumo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Atajos rápidos para porcionado (5%, 10%, 20%, 0.2, 0.5, 1) y equivalencia en bodega */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Atajos rápidos:</span>
                      {[
                        { label: '5%', modo: 'porcentaje' as const, val: 5 },
                        { label: '10%', modo: 'porcentaje' as const, val: 10 },
                        { label: '20% (0.2)', modo: 'unidad' as const, val: 0.2 },
                        { label: '50% (0.5)', modo: 'unidad' as const, val: 0.5 },
                        { label: '1 und', modo: 'unidad' as const, val: 1 }
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            handleUpdateHerraje(h.tempId, 'modoConsumo', preset.modo);
                            handleUpdateHerraje(h.tempId, 'valorEntrada', preset.val);
                          }}
                          style={{
                            background: (modo === preset.modo && Number(valActual) === preset.val) ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#e2e8f0',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '0.68rem',
                            cursor: 'pointer'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {insSeleccionado && (
                      <span>
                        Descuento bodega: <strong>{calculo.cantidadEquivalente} und</strong> • Costo consumo: <strong style={{ color: '#4ade80' }}>${calculo.costo.toLocaleString('es-CO')} COP</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Empaque y Presentación */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '14px',
        borderRadius: '12px',
        marginBottom: '16px',
        border: empaquesSeleccionados.length > 0 ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              padding: '4px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              <Package size={14} />
              <span>Empaque y Presentación ({empaquesSeleccionados.length})</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: empaquesSeleccionados.length > 0 ? '#4ade80' : 'var(--text-muted)', fontWeight: 600 }}>
              {empaquesSeleccionados.length > 0 ? '✓ Con empaque especial' : 'Sin empaque especial'}
            </span>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleAddEmpaque}
            style={{ fontSize: '0.74rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={12} />
            <span>+ Agregar Empaque</span>
          </button>
        </div>

        {empaquesSeleccionados.length === 0 ? (
          <div 
            style={{ 
              border: '1px dashed rgba(255, 255, 255, 0.12)', 
              borderRadius: '8px', 
              padding: '12px', 
              textAlign: 'center', 
              color: 'var(--text-subtle)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              background: 'rgba(0, 0, 0, 0.15)'
            }}
            onClick={handleAddEmpaque}
          >
            <Package size={18} style={{ margin: '0 auto 4px auto', opacity: 0.6 }} />
            <div>Sin empaque especial asignado. Clic aquí para agregar caja o empaque de presentación.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {empaquesSeleccionados.map(emp => {
              const insumoEmp = insumosEmpaques.find(i => i.id === emp.insumoId);
              const subtotalEmp = (insumoEmp?.costo_unitario || 0) * (emp.cantidad || 1);

              return (
                <div key={emp.tempId} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select 
                    className="form-select"
                    value={emp.insumoId}
                    onChange={e => handleUpdateEmpaque(emp.tempId, 'insumoId', e.target.value)}
                    style={{ flex: 1, minWidth: '170px' }}
                  >
                    <option value="">Selecciona tipo de empaque...</option>
                    {insumosEmpaques.map(ins => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nombre} (${ins.costo_unitario.toLocaleString('es-CO')}/und)
                      </option>
                    ))}
                  </select>

                  <div className="input-with-unit" style={{ width: '90px' }}>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      value={emp.cantidad}
                      onChange={e => handleUpdateEmpaque(emp.tempId, 'cantidad', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      placeholder="Cant"
                      min="0.01"
                    />
                    <span className="input-unit-badge">und</span>
                  </div>

                  <div style={{ minWidth: '70px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: '#4ade80' }}>
                    ${Math.round(subtotalEmp).toLocaleString('es-CO')}
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveEmpaque(emp.tempId)}
                    title="Eliminar empaque"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Enlaces de Referencia / Compra de Modelos STL */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(56, 189, 248, 0.05))', 
          border: '1px solid rgba(236, 72, 153, 0.35)', 
          borderRadius: '10px', 
          padding: '12px 14px', 
          marginBottom: '16px' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={15} color="#ec4899" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
              Enlaces de Compra / Modelo STL (Uso Interno de Taller)
            </span>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleAddEnlaceCompra}
            style={{ fontSize: '0.72rem', padding: '3px 8px', borderColor: 'rgba(236, 72, 153, 0.4)' }}
          >
            <Plus size={12} color="#ec4899" />
            <span>+ Agregar Link</span>
          </button>
        </div>

        {enlacesCompra.length === 0 ? (
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
            No hay enlaces añadidos. Si compraste el modelo STL en Cults3D, CGTrader o Patreon, puedes guardar el enlace aquí.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {enlacesCompra.map(enl => {
              const platform = detect3DPlatform(enl.url);
              return (
                <div 
                  key={enl.tempId}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1.2fr 2fr 100px auto auto', 
                    gap: '6px', 
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '6px 8px',
                    borderRadius: '8px'
                  }}
                >
                  <input 
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    value={enl.titulo}
                    onChange={e => handleUpdateEnlaceCompra(enl.tempId, 'titulo', e.target.value)}
                    placeholder={platform.name !== 'Enlace Web' ? platform.name : 'Ej: Patreon STL'}
                  />

                  <div style={{ position: 'relative' }}>
                    <input 
                      type="url"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', paddingRight: '24px' }}
                      value={enl.url}
                      onChange={e => handleUpdateEnlaceCompra(enl.tempId, 'url', e.target.value)}
                      placeholder="https://..."
                    />
                    <Link2 size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  </div>

                  <input 
                    type="number"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    value={enl.costoEstimado || ''}
                    onChange={e => handleUpdateEnlaceCompra(enl.tempId, 'costoEstimado', parseFloat(e.target.value) || 0)}
                    placeholder="$ Costo"
                  />

                  {enl.url && (
                    <a 
                      href={enl.url.startsWith('http') ? enl.url : `https://${enl.url}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 6px' }}
                      title="Abrir enlace en nueva pestaña"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 6px', color: '#f87171' }}
                    onClick={() => handleRemoveEnlaceCompra(enl.tempId)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
