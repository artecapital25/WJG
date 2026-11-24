import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Maquina, Personal, PiezaCotizada, TecnologiaFabricacion, NivelComplejidad } from '../../../types';
import { ItemMaquinaExtraForm } from '../types/cotizador.types';
import { MULTIPLICADOR_COMPLEJIDAD } from '../utils/pricingCalculator';
import { WjgSelect } from '../../../components/ui/WjgSelect';

interface CotizadorProcessesCardProps {
  tecnologia?: TecnologiaFabricacion;
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
  operadorPinturaId?: string;
  setOperadorPinturaId?: (val: string) => void;
  operadorArmadoId?: string;
  setOperadorArmadoId?: (val: string) => void;
  operadorDisenoId?: string;
  setOperadorDisenoId?: (val: string) => void;
  personal?: Personal[];
  cantidad?: number;
  prorratearDiseno3D?: boolean;
  setProrratearDiseno3D?: (val: boolean) => void;
  nivelComplejidad?: NivelComplejidad;
  modoVista?: 'rapido' | 'avanzado';
}

export const CotizadorProcessesCard: React.FC<CotizadorProcessesCardProps> = ({
  tecnologia = 'SLA_RESINA',
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
  setTiempoArmadoMin,
  operadorPinturaId = '',
  setOperadorPinturaId,
  operadorArmadoId = '',
  setOperadorArmadoId,
  operadorDisenoId = '',
  setOperadorDisenoId,
  personal = [],
  cantidad = 1,
  prorratearDiseno3D = true,
  setProrratearDiseno3D
}) => {
  const apartadoCurado = calculoEnVivo?.desglose_apartados?.find(d => d.clave === 'curado');
  const apartadoMO = calculoEnVivo?.desglose_apartados?.find(d => d.clave === 'mano_obra');
  const costoSeccion = (apartadoCurado?.costoUnitario || 0) + (apartadoMO?.costoUnitario || 0);
  const cobroSeccion = (apartadoCurado?.cobroUnitario || 0) + (apartadoMO?.cobroUnitario || 0);

  const personalActivos = personal.filter(p => p.aplica_mano_obra !== false);
  const poolPersonal = personalActivos.length > 0 ? personalActivos : personal;

  const findPersona = (idPreferido: string, keywords: string[]) =>
    (idPreferido ? poolPersonal.find(p => p.id === idPreferido) : undefined) ||
    poolPersonal.find(p => keywords.some(k => `${p.nombre || ''} ${p.rol || ''} ${p.area_responsabilidad || ''}`.toLowerCase().includes(k))) ||
    poolPersonal[0];

  const personaDev = findPersona(operadorDisenoId, ['aplicaci', 'backoffice', 'desarroll', 'diseñ', 'germ']);
  const personaPintor = findPersona(operadorPinturaId, ['pint', 'acabad', 'wendy']);
  const personaArmado = findPersona(operadorArmadoId, ['taller', 'impresi', 'armad', 'juan']);

  const tarifaDev = personaDev?.costo_minuto || 166.67;
  const tarifaPintor = personaPintor?.costo_minuto || 166.67;
  const tarifaArmado = personaArmado?.costo_minuto || tarifaPintor || 166.67;
  const multComp = MULTIPLICADOR_COMPLEJIDAD[calculoEnVivo?.nivel_complejidad || 'simple'] || 1;
  const costoPinturaMO = calculoEnVivo?.costo_pintura_mo_unitario ?? (vaPintado ? Math.round(tiempoPinturaMin * tarifaPintor) : 0);
  const costoArmadoMO = calculoEnVivo?.costo_armado_unitario ?? Math.round(tiempoArmadoMin * tarifaArmado * multComp);
  const costoDisenoMO = calculoEnVivo?.costo_diseno_unitario ?? Math.round((tiempoDesarrolloMin * tarifaDev * multComp) / (prorratearDiseno3D ? Math.max(1, cantidad) : 1));

  const opcionesPersonal = poolPersonal.map(p => ({
    value: p.id,
    label: p.nombre || p.rol,
    subtitle: `$${(Number(p.costo_hora) || 10000).toLocaleString('es-CO')}/h • ${p.area_responsabilidad || p.rol}`
  }));

  return (
    <div className="cotizador-section-card">
      <div className="cotizador-section-header" style={{ marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
            ☀️ Post-Procesamiento, Lavado y Mano de Obra
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Equipos de acabado UV, aerógrafo, máquinas extras y tarifas reales por fase
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="section-subtotal-pill">
            <span className="costo-txt">Costo: ${costoSeccion.toLocaleString('es-CO')}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span className="cobro-txt">Cobro: ${cobroSeccion.toLocaleString('es-CO')}</span>
          </span>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddMaquinaAdicional}
            style={{ fontSize: '0.74rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'rgba(56, 189, 248, 0.4)' }}
            title="Agregar otra máquina o proceso adicional"
          >
            <Plus size={13} color="var(--brand-cyan)" />
            <span>+ Máquina Extra</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Proceso 2: Lavado y Curado UV (Solo requerido en Resina SLA) */}
        {tecnologia === 'SLA_RESINA' && (
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
                  <WjgSelect
                    value={curadoId}
                    onChange={setCuradoId}
                    placeholder="Seleccionar equipo de curado..."
                    options={maquinas.map(m => ({
                      value: m.id,
                      label: `${m.nombre} (${m.tipo})`,
                      subtitle: `Consumo: ${m.consumo_kwh} kW/h • $${m.costo_minuto.toFixed(2)}/min`,
                    }))}
                  />
                </div>

                {tiempoCuradoPersonalizado && (
                  <div className="input-with-unit">
                    <input 
                      type="number" 
                      step="any"
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
                <span style={{ color: 'var(--brand-cyan)', fontWeight: 700 }} className="tabular-nums">
                  Costo Lavado/Curado + PPE: ${(calculoEnVivo?.costo_curado || 0).toLocaleString('es-CO')} COP
                </span>
              </div>
            </>
          )}
        </div>
        )}

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
                  <WjgSelect
                    value={compresorId}
                    onChange={setCompresorId}
                    placeholder="Seleccionar compresor..."
                    options={maquinas.map(m => ({
                      value: m.id,
                      label: `${m.nombre} (${m.tipo})`,
                      subtitle: `Consumo: ${m.consumo_kwh} kW/h • $${m.costo_minuto.toFixed(2)}/min`,
                    }))}
                  />
                </div>

                {!tiempoCompresorSincronizado && (
                  <div className="input-with-unit">
                    <input 
                      type="number" 
                      step="any"
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
                      <WjgSelect
                        compact
                        value={extra.maquinaId}
                        onChange={val => handleUpdateMaquinaAdicional(extra.tempId, 'maquinaId', val)}
                        options={maquinas.map(m => ({
                          value: m.id,
                          label: `${m.nombre} (${m.tipo})`,
                        }))}
                      />
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
                          step="any"
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

        {/* Tiempos de Mano de Obra con Subtotal Visible por Fase */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '10px',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>
              👷 Mano de Obra por Fase
            </span>
            <span className="section-subtotal-pill" style={{ borderColor: 'rgba(16, 185, 129, 0.35)' }}>
              <span className="costo-txt">Costo MO: ${(apartadoMO?.costoUnitario ?? (costoPinturaMO + costoArmadoMO + costoDisenoMO)).toLocaleString('es-CO')}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span className="cobro-txt" style={{ color: '#34d399' }}>Cobro MO: ${(apartadoMO?.cobroUnitario ?? 0).toLocaleString('es-CO')}</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>🎨 Acabado Pintado</label>
              <button
                type="button"
                className={`btn ${vaPintado ? 'btn-cyan' : 'btn-secondary'}`}
                style={{ width: '100%', fontSize: '0.82rem', padding: '8px', minHeight: '44px' }}
                onClick={() => setVaPintado(!vaPintado)}
              >
                {vaPintado ? '✓ Va Pintado' : 'Sin Pintura'}
              </button>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Pintura</span>
                <span style={{ color: '#34d399' }}>${costoPinturaMO.toLocaleString('es-CO')}</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input"
                  disabled={!vaPintado}
                  value={tiempoPinturaMin === 0 ? '' : tiempoPinturaMin}
                  onChange={e => setTiempoPinturaMin(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                />
                <span className="input-unit-badge">min</span>
              </div>
              {setOperadorPinturaId && opcionesPersonal.length > 0 && vaPintado && (
                <div style={{ marginTop: '6px' }}>
                  <WjgSelect
                    compact
                    value={personaPintor?.id || operadorPinturaId}
                    onChange={setOperadorPinturaId}
                    placeholder="Responsable pintura..."
                    options={opcionesPersonal}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Armado/Soportes</span>
                <span style={{ color: '#34d399' }}>${costoArmadoMO.toLocaleString('es-CO')}</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input"
                  value={tiempoArmadoMin === 0 ? '' : tiempoArmadoMin}
                  onChange={e => setTiempoArmadoMin(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                />
                <span className="input-unit-badge">min</span>
              </div>
              {setOperadorArmadoId && opcionesPersonal.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <WjgSelect
                    compact
                    value={personaArmado?.id || operadorArmadoId}
                    onChange={setOperadorArmadoId}
                    placeholder="Responsable taller..."
                    options={opcionesPersonal}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Diseño 3D</span>
                <span style={{ color: '#34d399' }}>${costoDisenoMO.toLocaleString('es-CO')}</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input"
                  value={tiempoDesarrolloMin === 0 ? '' : tiempoDesarrolloMin}
                  onChange={e => setTiempoDesarrolloMin(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                />
                <span className="input-unit-badge">min</span>
              </div>
              {setOperadorDisenoId && opcionesPersonal.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <WjgSelect
                    compact
                    value={personaDev?.id || operadorDisenoId}
                    onChange={setOperadorDisenoId}
                    placeholder="Responsable diseño..."
                    options={opcionesPersonal}
                  />
                </div>
              )}
              {setProrratearDiseno3D && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', fontSize: '0.68rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prorratearDiseno3D}
                    onChange={e => setProrratearDiseno3D(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span>Prorratear Diseño ({cantidad}u)</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
