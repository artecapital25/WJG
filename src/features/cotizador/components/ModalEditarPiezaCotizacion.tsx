import React, { FormEvent } from 'react';
import { 
  X, 
  Edit, 
  Cpu, 
  Box, 
  Layers, 
  Trash2, 
  ShoppingCart, 
  ExternalLink, 
  Save 
} from 'lucide-react';
import { PiezaCotizada, Resina, Maquina, MaquinaInvolucrada, EnlaceReferenciaCompra } from '../../../types';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';

interface ModalEditarPiezaCotizacionProps {
  isOpen: boolean;
  onClose: () => void;
  piezaEditando: PiezaCotizada | null;
  resinas: Resina[];
  maquinas: Maquina[];
  editNombre: string;
  setEditNombre: (v: string) => void;
  editCantidad: number;
  setEditCantidad: (v: number) => void;
  editPrecioUnitario: number;
  setEditPrecioUnitario: (v: number) => void;
  editAltoMm: number;
  setEditAltoMm: (v: number) => void;
  editAnchoMm: number;
  setEditAnchoMm: (v: number) => void;
  editProfundidadMm: number;
  setEditProfundidadMm: (v: number) => void;
  editResinaId: string;
  setEditResinaId: (v: string) => void;
  editVaPintado: boolean;
  setEditVaPintado: (v: boolean) => void;
  editTieneEmpaque: boolean;
  setEditTieneEmpaque: (v: boolean) => void;
  editDatosPendientes: boolean;
  setEditDatosPendientes: (v: boolean) => void;
  editDescripcionTecnica: string;
  setEditDescripcionTecnica: (v: string) => void;
  editMaquinasAdicionales: MaquinaInvolucrada[];
  handleAddModalExtraProcess: () => void;
  handleUpdateModalExtraProcess: (index: number, field: keyof MaquinaInvolucrada, value: any) => void;
  handleRemoveModalExtraProcess: (index: number) => void;
  editEnlacesCompra: EnlaceReferenciaCompra[];
  handleAddModalEnlaceCompra: () => void;
  handleUpdateModalEnlaceCompra: (index: number, field: string, value: any) => void;
  handleRemoveModalEnlaceCompra: (index: number) => void;
  handleSaveEditPieceSubmit: (e: FormEvent) => void;
  onLoadPieceToCalculator?: (item: PiezaCotizada) => void;
}

export const ModalEditarPiezaCotizacion: React.FC<ModalEditarPiezaCotizacionProps> = React.memo(({
  isOpen,
  onClose,
  piezaEditando,
  resinas,
  maquinas,
  editNombre,
  setEditNombre,
  editCantidad,
  setEditCantidad,
  editPrecioUnitario,
  setEditPrecioUnitario,
  editAltoMm,
  setEditAltoMm,
  editAnchoMm,
  setEditAnchoMm,
  editProfundidadMm,
  setEditProfundidadMm,
  editResinaId,
  setEditResinaId,
  editVaPintado,
  setEditVaPintado,
  editTieneEmpaque,
  setEditTieneEmpaque,
  editDatosPendientes,
  setEditDatosPendientes,
  editDescripcionTecnica,
  setEditDescripcionTecnica,
  editMaquinasAdicionales,
  handleAddModalExtraProcess,
  handleUpdateModalExtraProcess,
  handleRemoveModalExtraProcess,
  editEnlacesCompra,
  handleAddModalEnlaceCompra,
  handleUpdateModalEnlaceCompra,
  handleRemoveModalEnlaceCompra,
  handleSaveEditPieceSubmit,
  onLoadPieceToCalculator
}) => {
  if (!isOpen || !piezaEditando) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', padding: '22px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#fff' }}>
              <Edit size={18} color="#fbbf24" />
              <span>Modificar Ítem del Pedido</span>
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Edita cada parámetro del producto: dimensiones, material, acabados, procesos y precios.
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Acceso Rápido a la Calculadora 3D */}
        {onLoadPieceToCalculator && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ¿Deseas recalcular con gramos de Slicer, ahuecado o tarifas?
            </div>
            <button
              type="button"
              className="btn btn-cyan btn-sm"
              style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                onLoadPieceToCalculator(piezaEditando);
                onClose();
              }}
              title="Cargar esta pieza en el calculador 3D superior"
            >
              <Cpu size={14} />
              <span>Abrir en Calculadora 3D</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSaveEditPieceSubmit}>
          {/* 1. Nombre o Título */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Nombre o Título de la Pieza *</label>
            <input 
              type="text" 
              className="form-input" 
              value={editNombre}
              onChange={e => setEditNombre(e.target.value)}
              placeholder="Ej: Busto Coleccionable 3D"
              required
            />
          </div>

          {/* 2. Cantidad y Precio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Cantidad</label>
              <input 
                type="number" 
                min="1"
                className="form-input" 
                value={editCantidad}
                onChange={e => setEditCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Precio Unitario (COP) *</label>
              <input 
                type="number" 
                min="0"
                step="500"
                className="form-input" 
                value={editPrecioUnitario}
                onChange={e => setEditPrecioUnitario(Math.max(0, parseFloat(e.target.value) || 0))}
                required
              />
            </div>
          </div>

          {/* Subtotal del producto */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-subtle)',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '14px',
            fontSize: '0.84rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Subtotal del producto:</span>
              <span>{editCantidad} unid. × ${editPrecioUnitario.toLocaleString('es-CO')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '4px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>
              <span>Total Ítem:</span>
              <span>${(Math.ceil((editPrecioUnitario * editCantidad) / 100) * 100).toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          {/* 3. Dimensiones 3D */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '14px'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Box size={14} />
              <span>Dimensiones Físicas (Estándar Slicer en mm)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  Z: Alto (↕️ mm)
                </label>
                <input 
                  type="number"
                  min="0"
                  className="form-input" 
                  style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                  value={editAltoMm}
                  onChange={e => setEditAltoMm(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Alto Z"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  X: Ancho (↔️ mm)
                </label>
                <input 
                  type="number"
                  min="0"
                  className="form-input" 
                  style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                  value={editAnchoMm}
                  onChange={e => setEditAnchoMm(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Ancho X"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  Y: Fondo (↗️ mm)
                </label>
                <input 
                  type="number"
                  min="0"
                  className="form-input" 
                  style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                  value={editProfundidadMm}
                  onChange={e => setEditProfundidadMm(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Fondo Y"
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#fde047', marginTop: '10px', cursor: 'pointer', margin: '10px 0 0 0' }}>
              <input 
                type="checkbox"
                checked={editDatosPendientes}
                onChange={e => setEditDatosPendientes(e.target.checked)}
                style={{ accentColor: '#eab308', cursor: 'pointer' }}
              />
              <span>🟡 Dejar medidas o resina pendientes por confirmar en Slicer (Cotización Parcial)</span>
            </label>
          </div>

          {/* 4. Resina */}
          {resinas && resinas.length > 0 && (
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Material / Resina</label>
              <select 
                className="form-select"
                value={editResinaId}
                onChange={e => setEditResinaId(e.target.value)}
              >
                {resinas.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.resumen || `${r.marca} ${r.tipo} ${r.color}`} — ${r.costo_gramo}/g
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Acabados */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox"
                checked={editVaPintado}
                onChange={e => setEditVaPintado(e.target.checked)}
                style={{ accentColor: 'var(--brand-cyan)', cursor: 'pointer' }}
              />
              <span>🎨 Pintura y Acabado Artístico</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox"
                checked={editTieneEmpaque}
                onChange={e => setEditTieneEmpaque(e.target.checked)}
                style={{ accentColor: 'var(--brand-cyan)', cursor: 'pointer' }}
              />
              <span>📦 Empaque de Taller</span>
            </label>
          </div>

          {/* 6. Maquinaria y Procesos Extras */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} />
                <span>Procesos & Maquinaria Extra ({editMaquinasAdicionales.length})</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '4px 8px', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)' }}
                onClick={handleAddModalExtraProcess}
              >
                + Agregar Proceso
              </button>
            </div>

            {editMaquinasAdicionales.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic', padding: '6px 0' }}>
                No tiene procesos extras asignados (utiliza el flujo estándar de impresión y curado).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editMaquinasAdicionales.map((mExtra, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto',
                      gap: '8px',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Máquina
                      </label>
                      <select 
                        className="form-select"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        value={mExtra.maquina_id}
                        onChange={e => handleUpdateModalExtraProcess(idx, 'maquina_id', e.target.value)}
                      >
                        {maquinas.map(maq => (
                          <option key={maq.id} value={maq.id}>
                            {maq.nombre} ({maq.tipo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Proceso
                      </label>
                      <input 
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        value={mExtra.proceso}
                        onChange={e => handleUpdateModalExtraProcess(idx, 'proceso', e.target.value)}
                        placeholder="Ej: Pulido / Láser"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Minutos
                      </label>
                      <input 
                        type="number"
                        min="0"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        value={mExtra.tiempo_min}
                        onChange={e => handleUpdateModalExtraProcess(idx, 'tiempo_min', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px', color: '#f87171' }}
                        onClick={() => handleRemoveModalExtraProcess(idx)}
                        title="Eliminar este proceso"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: mExtra.mostrar_en_cliente ? 'rgba(56, 189, 248, 0.08)' : 'rgba(0, 0, 0, 0.25)',
                      border: mExtra.mostrar_en_cliente ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      marginTop: '4px',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      <label style={{
                        fontSize: '0.74rem',
                        color: mExtra.mostrar_en_cliente ? '#38bdf8' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        margin: 0,
                        fontWeight: mExtra.mostrar_en_cliente ? 700 : 500
                      }}>
                        <input 
                          type="checkbox"
                          checked={Boolean(mExtra.mostrar_en_cliente)}
                          onChange={e => handleUpdateModalExtraProcess(idx, 'mostrar_en_cliente', e.target.checked)}
                          style={{ cursor: 'pointer', accentColor: 'var(--brand-cyan)' }}
                        />
                        <span>👁️ Mostrar este proceso en la factura / cotización al cliente</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7. Enlaces Web */}
          <div style={{
            background: 'rgba(236, 72, 153, 0.05)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingCart size={15} />
                <span>🌐 Enlaces de Compra / Modelo 3D ({editEnlacesCompra.length})</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '4px 8px', color: '#f472b6', borderColor: 'rgba(236, 72, 153, 0.4)' }}
                onClick={handleAddModalEnlaceCompra}
              >
                + Agregar Link
              </button>
            </div>

            {editEnlacesCompra.length === 0 ? (
              <div 
                style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-subtle)', 
                  padding: '10px', 
                  textAlign: 'center',
                  border: '1px dashed rgba(236, 72, 153, 0.25)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={handleAddModalEnlaceCompra}
              >
                Sin enlaces registrados. Clic aquí para agregar enlace web de compra o descarga.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editEnlacesCompra.map((enl, idx) => {
                  const plat = detect3DPlatform(enl.url);
                  return (
                    <div 
                      key={idx}
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${enl.url ? plat.borderColor : 'var(--border-subtle)'}`,
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(110px, 1fr) minmax(140px, 1.6fr) auto auto',
                        gap: '6px',
                        alignItems: 'center'
                      }}
                    >
                      <input 
                        type="text"
                        className="form-input"
                        style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                        placeholder="Nombre / Plataforma"
                        value={enl.titulo}
                        onChange={e => handleUpdateModalEnlaceCompra(idx, 'titulo', e.target.value)}
                      />

                      <input 
                        type="url"
                        className="form-input"
                        style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                        placeholder="https://..."
                        value={enl.url}
                        onChange={e => handleUpdateModalEnlaceCompra(idx, 'url', e.target.value)}
                      />

                      {enl.url ? (
                        <a
                          href={formatExternalUrl(enl.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 8px', color: plat.color }}
                          title="Abrir enlace"
                        >
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <div style={{ width: '26px' }} />
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px', color: '#f87171' }}
                        onClick={() => handleRemoveModalEnlaceCompra(idx)}
                        title="Eliminar enlace"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. Observaciones Técnicas */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Descripción / Observaciones Técnicas</label>
            <textarea 
              className="form-textarea"
              rows={2}
              value={editDescripcionTecnica}
              onChange={e => setEditDescripcionTecnica(e.target.value)}
              placeholder="Detalles sobre relleno, soportes o acabado especial..."
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, fontWeight: 700 }}
            >
              <Save size={16} />
              <span>Guardar Cambios en este Ítem</span>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
ModalEditarPiezaCotizacion.displayName = 'ModalEditarPiezaCotizacion';
