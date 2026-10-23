import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Maquina, PiezaCotizada } from '../../../types';
import { ItemMaquinaExtraForm } from '../types/cotizador.types';

interface CotizadorProcessesCardProps {
  requiereCurado: boolean;
  setRequiereCurado: (val: boolean) => void;
  curadoId: string;
  setCuradoId: (val: string) => void;
  tiempoCuradoPersonalizado: boolean;
  setTiempoCuradoPersonalizado: (val: boolean) => void;
  tiempoCuradoMin: number;
  setTiempoCuradoMin: (val: number) => void;
  vaPintado: boolean;
  setVaPintado: (val: boolean) => void;
  tiempoPinturaMin: number;
  setTiempoPinturaMin: (val: number) => void;
  requiereCompresorPintura: boolean;
  setRequiereCompresorPintura: (val: boolean) => void;
  compresorId: string;
  setCompresorId: (val: string) => void;
  tiempoCompresorMin: number;
  setTiempoCompresorMin: (val: number) => void;
  tiempoCompresorSincronizado: boolean;
  setTiempoCompresorSincronizado: (val: boolean) => void;
  maquinaCompresor?: Maquina;
  maquinas: Maquina[];
  maquinasAdicionales: ItemMaquinaExtraForm[];
  handleAddMaquinaAdicional: () => void;
  handleRemoveMaquinaAdicional: (tempId: string) => void;
  handleUpdateMaquinaAdicional: (tempId: string, field: keyof ItemMaquinaExtraForm, val: any) => void;
  calculoEnVivo: PiezaCotizada | null;
  tiempoDesarrolloMin: number;
  setTiempoDesarrolloMin: (val: number) => void;
  tiempoArmadoMin: number;
  setTiempoArmadoMin: (val: number) => void;
}

export const CotizadorProcessesCard: React.FC<CotizadorProcessesCardProps> = ({
  requiereCurado,
  setRequiereCurado,
  curadoId,
  setCuradoId,
  tiempoCuradoPersonalizado,
  setTiempoCuradoPersonalizado,
  tiempoCuradoMin,
  setTiempoCuradoMin,
  vaPintado,
  setVaPintado,
  tiempoPinturaMin,
  setTiempoPinturaMin,
  requiereCompresorPintura,
  setRequiereCompresorPintura,
  compresorId,
  setCompresorId,
  tiempoCompresorMin,
  setTiempoCompresorMin,
  tiempoCompresorSincronizado,
  setTiempoCompresorSincronizado,
  maquinaCompresor,
  maquinas,
  maquinasAdicionales,
  handleAddMaquinaAdicional,
  handleRemoveMaquinaAdicional,
  handleUpdateMaquinaAdicional,
  calculoEnVivo,
  tiempoDesarrolloMin,
  setTiempoDesarrolloMin,
  tiempoArmadoMin,
  setTiempoArmadoMin
}) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(17, 24, 39, 0.85) 100%)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#fff' }}>
            ☀️ Post-Procesamiento, Lavado y Pintura
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Configura los equipos de acabado UV, aerógrafo y procesos extras
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleAddMaquinaAdicional}
          style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'rgba(56, 189, 248, 0.4)' }}
          title="Agregar otra máquina o proceso adicional"
        >
          <Plus size={13} color="var(--brand-cyan)" />
          <span>+ Proceso / Máquina Extra</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Proceso 2: Lavado y Curado UV */}
        <div style={{
          background: requiereCurado ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.1)',
          border: `1px solid ${requiereCurado ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
          borderRadius: '10px',
          padding: '12px 14px',
          opacity: requiereCurado ? 1 : 0.65
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <input 
                type="checkbox"
                checked={requiereCurado}
                onChange={e => setRequiereCurado(e.target.checked)}
                style={{ accentColor: 'var(--brand-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: requiereCurado ? '#38bdf8' : 'var(--text-muted)' }}>
                ☀️ Proceso 2: Lavado Químico & Curado UV (Wash & Cure)
              </span>
            </label>

            {requiereCurado && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.68rem', padding: '2px 7px', minHeight: 'auto' }}
                onClick={() => setTiempoCuradoPersonalizado(!tiempoCuradoPersonalizado)}
              >
                {tiempoCuradoPersonalizado ? '✓ Tiempo Manual' : '⚡ Auto (según peso)'}
              </button>
            )}
          </div>

          {requiereCurado && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: tiempoCuradoPersonalizado ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'center' }}>
                <div>
                  <select 
                    className="form-select"
                    value={curadoId}
                    onChange={e => setCuradoId(e.target.value)}
                  >
                    {maquinas.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.tipo}) — Consumo: {m.consumo_kwh} kW/h (${m.costo_minuto.toFixed(2)}/min)
                      </option>
                    ))}
                  </select>
                </div>

                {tiempoCuradoPersonalizado && (
                  <div className="input-with-unit">
                    <input 
                      type="number" 
                      className="form-input" 
                      value={tiempoCuradoMin}
                      onChange={e => setTiempoCuradoMin(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="Minutos"
                    />
                    <span className="input-unit-badge">min</span>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <span>
                  {tiempoCuradoPersonalizado 
                    ? `${tiempoCuradoMin} minutos de exposición UV`
                    : `Tiempo auto: ${calculoEnVivo && calculoEnVivo.peso_estimado_g >= 250 ? 15 : calculoEnVivo && calculoEnVivo.peso_estimado_g <= 50 ? 5 : 10} min (según ${calculoEnVivo?.peso_estimado_g || 0}g resina)`}
                </span>
                <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                  Curado eléctrico + insumos solventes incluidos
                </span>
              </div>
            </>
          )}
        </div>

        {/* Proceso 3: Pintura y Acabado / Aerógrafo */}
        <div style={{
          background: requiereCompresorPintura ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.1)',
          border: `1px solid ${requiereCompresorPintura ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
          borderRadius: '10px',
          padding: '12px 14px',
          opacity: requiereCompresorPintura ? 1 : 0.7
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <input 
                type="checkbox"
                checked={requiereCompresorPintura}
                onChange={e => setRequiereCompresorPintura(e.target.checked)}
                style={{ accentColor: 'var(--brand-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: requiereCompresorPintura ? '#38bdf8' : 'var(--text-muted)' }}>
                🎨 Proceso 3: Equipo de Pintura / Compresor de Aerografía
              </span>
            </label>

            {requiereCompresorPintura && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.68rem', padding: '2px 7px', minHeight: 'auto' }}
                onClick={() => setTiempoCompresorSincronizado(!tiempoCompresorSincronizado)}
              >
                {tiempoCompresorSincronizado ? '🔗 Sincronizado con Pintura' : '✏️ Minutos Manuales'}
              </button>
            )}
          </div>

          {requiereCompresorPintura && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: !tiempoCompresorSincronizado ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'center' }}>
                <div>
                  <select 
                    className="form-select"
                    value={compresorId}
                    onChange={e => setCompresorId(e.target.value)}
                  >
                    {maquinas.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.tipo}) — Consumo: {m.consumo_kwh} kW/h (${m.costo_minuto.toFixed(2)}/min)
                      </option>
                    ))}
                  </select>
                </div>

                {!tiempoCompresorSincronizado && (
                  <div className="input-with-unit">
                    <input 
                      type="number" 
                      className="form-input" 
                      value={tiempoCompresorMin}
                      onChange={e => setTiempoCompresorMin(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="Minutos"
                    />
                    <span className="input-unit-badge">min</span>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <span>
                  {tiempoCompresorSincronizado 
                    ? `Tiempo sincronizado con mano de obra de pintura: ${tiempoPinturaMin} min` 
                    : `Tiempo compresor independiente: ${tiempoCompresorMin} min`}
                </span>
                <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                  Energía Compresor: ${Math.round((tiempoCompresorSincronizado ? tiempoPinturaMin : tiempoCompresorMin) * (maquinaCompresor?.costo_minuto || 5.004)).toLocaleString('es-CO')} COP
                </span>
              </div>
            </>
          )}
        </div>

        {/* Proceso 4: Máquinas adicionales dinámicas */}
        {maquinasAdicionales.length > 0 && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '10px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc', marginBottom: '8px' }}>
              ⚙️ Procesos & Maquinaria Extra ({maquinasAdicionales.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {maquinasAdicionales.map((extra, idx) => {
                const extraMaq = maquinas.find(m => m.id === extra.maquinaId) || maquinas[0];
                const costoEnergiaExtra = Math.round((extra.tiempoMin || 0) * (extraMaq?.costo_minuto || 0));

                return (
                  <div 
                    key={extra.tempId}
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
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Máquina #{idx + 1}</label>
                      <select
                        className="form-select"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        value={extra.maquinaId}
                        onChange={e => handleUpdateMaquinaAdicional(extra.tempId, 'maquinaId', e.target.value)}
                      >
                        {maquinas.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.tipo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Proceso o Función</label>
                      <input 
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        value={extra.proceso}
                        onChange={e => handleUpdateMaquinaAdicional(extra.tempId, 'proceso', e.target.value)}
                        placeholder="Ej: Base FDM / Pulido"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Minutos</label>
                      <div className="input-with-unit">
                        <input 
                          type="number"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                          value={extra.tiempoMin}
                          onChange={e => handleUpdateMaquinaAdicional(extra.tempId, 'tiempoMin', Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="Min"
                        />
                        <span className="input-unit-badge" style={{ fontSize: '0.65rem' }}>m</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '70px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Energía</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc' }}>
                        ${costoEnergiaExtra.toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px', color: '#f87171' }}
                        onClick={() => handleRemoveMaquinaAdicional(extra.tempId)}
                        title="Eliminar máquina adicional"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tiempos de Mano de Obra: Diseño, Armado y Pintura */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '6px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>🎨 Acabado Pintado</label>
            <button
              type="button"
              className={`btn ${vaPintado ? 'btn-cyan' : 'btn-secondary'}`}
              style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}
              onClick={() => setVaPintado(!vaPintado)}
            >
              {vaPintado ? '✓ Va Pintado' : 'Sin Pintura'}
            </button>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Pintura (Minutos)</label>
            <input 
              type="number"
              className="form-input"
              disabled={!vaPintado}
              value={tiempoPinturaMin}
              onChange={e => setTiempoPinturaMin(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Armado (Minutos)</label>
            <input 
              type="number"
              className="form-input"
              value={tiempoArmadoMin}
              onChange={e => setTiempoArmadoMin(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Diseño 3D (Minutos)</label>
            <input 
              type="number"
              className="form-input"
              value={tiempoDesarrolloMin}
              onChange={e => setTiempoDesarrolloMin(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
