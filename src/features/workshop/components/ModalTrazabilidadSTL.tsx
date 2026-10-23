import React from 'react';
import { FileCode, CreditCard } from 'lucide-react';
import { OrdenTrabajo, EstadoSTL } from '../../../types';
import { ESTADOS_STL } from '../utils/workshopUtils';

interface ModalTrazabilidadSTLProps {
  ot: OrdenTrabajo | null;
  onClose: () => void;
  inputStlEstado: EstadoSTL;
  setInputStlEstado: (val: EstadoSTL) => void;
  inputStlVersion: string;
  setInputStlVersion: (val: string) => void;
  inputStlUrl: string;
  setInputStlUrl: (val: string) => void;
  onGuardarSTL: (e: React.FormEvent) => void;
  onSwitchToPago: (ot: OrdenTrabajo) => void;
}

export const ModalTrazabilidadSTL: React.FC<ModalTrazabilidadSTLProps> = ({
  ot,
  onClose,
  inputStlEstado,
  setInputStlEstado,
  inputStlVersion,
  setInputStlVersion,
  inputStlUrl,
  setInputStlUrl,
  onGuardarSTL,
  onSwitchToPago
}) => {
  if (!ot) return null;

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card" 
        style={{ maxWidth: '440px', width: '100%', margin: 0, padding: '24px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} color="var(--brand-cyan)" />
            Trazabilidad STL • {ot.numero_ot}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Figura: <strong style={{ color: '#fff' }}>{ot.item_nombre}</strong><br />
          Responsable de Modelado: <strong>Germán</strong> ➔ Impresión: <strong>Juan</strong>
        </div>

        <form onSubmit={onGuardarSTL}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              ESTADO TÉCNICO DEL STL:
            </label>
            <select 
              className="form-select"
              value={inputStlEstado}
              onChange={e => setInputStlEstado(e.target.value as EstadoSTL)}
            >
              {ESTADOS_STL.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Recordatorio de Pago al Aprobar Diseño */}
          <div style={{
            background: ot.estado_pago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.12)' : ot.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${ot.estado_pago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.35)' : ot.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PAGO DEL CLIENTE (APROBACIÓN DISEÑO):</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: ot.estado_pago === 'Pagado Total' ? '#34d399' : ot.estado_pago === 'Abono Parcial' ? '#fbbf24' : '#f87171' }}>
                {ot.estado_pago === 'Pagado Total' && '🟢 Pagado Total (100%)'}
                {ot.estado_pago === 'Abono Parcial' && `🟡 Abonó: $${(ot.abono || 0).toLocaleString('es-CO')} (Debe: $${(ot.saldo_pendiente || 0).toLocaleString('es-CO')})`}
                {(!ot.estado_pago || ot.estado_pago === 'Pendiente') && '🔴 Sin Pago / Pendiente'}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => onSwitchToPago(ot)}
            >
              <CreditCard size={13} color="var(--brand-cyan)" />
              <span>Registrar Pago</span>
            </button>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              VERSIÓN DEL ARCHIVO 3D:
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej: v1.0, v1.2-hueco-con-drenaje" 
              value={inputStlVersion} 
              onChange={e => setInputStlVersion(e.target.value)} 
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              ENLACE AL ARCHIVO STL (DRIVE / SUPABASE / CLOUD):
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="https://drive.google.com/... o enlace local" 
              value={inputStlUrl} 
              onChange={e => setInputStlUrl(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
              Guardar Trazabilidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
