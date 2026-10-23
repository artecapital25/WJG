import React from 'react';
import { Box, Sparkles } from 'lucide-react';
import { PiezaCotizada } from '../../../types';

interface CotizadorFormHeaderProps {
  piezaEnEdicion?: PiezaCotizada | null;
  onCancelarEdicionPieza?: () => void;
  nombreItem: string;
  setNombreItem: (val: string) => void;
  cantidad: number;
  setCantidad: (val: number) => void;
  esParcial: boolean;
  setEsParcial: (val: boolean) => void;
  notasPendientes: string;
  setNotasPendientes: (val: string) => void;
  onOpenTarifario: () => void;
}

export const CotizadorFormHeader: React.FC<CotizadorFormHeaderProps> = ({
  piezaEnEdicion,
  onCancelarEdicionPieza,
  nombreItem,
  setNombreItem,
  cantidad,
  setCantidad,
  esParcial,
  setEsParcial,
  notasPendientes,
  setNotasPendientes,
  onOpenTarifario
}) => {
  return (
    <>
      {/* Banner de Edición de Ítem si viene de CotizacionBuilder */}
      {piezaEnEdicion && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.12))',
          border: '1px solid rgba(245, 158, 11, 0.65)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>✏️</span>
            <div>
              <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.94rem' }}>
                Modo Edición en Calculadora: {piezaEnEdicion.nombre_item}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Modifica medidas, resina o procesos en el calculador. Al presionar <strong>"Guardar Cambios en este Ítem"</strong>, se actualizará en la cotización.
              </div>
            </div>
          </div>
          {onCancelarEdicionPieza && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onCancelarEdicionPieza}
              style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}
            >
              Cancelar Edición
            </button>
          )}
        </div>
      )}

      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Box size={22} color="var(--brand-cyan)" />
            Calculador 3D & Resina Avanzado
          </h2>
          <p className="section-subtitle">Ajuste de resina exacta (slicer), pinturas múltiples y herrajes dinámicos</p>
        </div>

        <button
          type="button"
          className="btn btn-cyan btn-sm"
          onClick={onOpenTarifario}
          style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)' }}
          title="Ver escala de precios por tamaño y copiar textos rápidos para WhatsApp"
        >
          <Sparkles size={15} />
          <span>Tarifario Rápido (Valores Básicos)</span>
        </button>
      </div>

      {/* Nombre y Cantidad */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Nombre de la Pieza</label>
          <input 
            type="text" 
            className="form-input" 
            value={nombreItem}
            onChange={e => setNombreItem(e.target.value)}
            placeholder="Ej: Miniatura Dragon 7cm"
            required
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Cantidad</label>
          <input 
            type="number" 
            className="form-input" 
            min="1" 
            value={cantidad}
            onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
            required
          />
        </div>
      </div>

      {/* Selector de Modo Parcial / Pendiente de Slicer */}
      <div style={{
        background: esParcial ? 'rgba(234, 179, 8, 0.12)' : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${esParcial ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: esParcial ? '#fde047' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{esParcial ? '🟡 Cotización Parcial (Medidas / Resina Pendientes)' : '📐 Cotización Estándar (Medidas Definidas)'}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {esParcial 
              ? 'Las dimensiones y resina se definirán más adelante al abrir Chitubox, Lychee o Photon Workshop.'
              : 'Calcula con las dimensiones exactas o gramos de resina del Slicer.'}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: esParcial ? '#fde047' : 'var(--brand-cyan)' }}>
          <input 
            type="checkbox"
            checked={esParcial}
            onChange={e => setEsParcial(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#eab308', cursor: 'pointer' }}
          />
          <span>Dejar pendiente de Slicer</span>
        </label>
      </div>

      {esParcial && (
        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label className="form-label" style={{ color: '#fde047' }}>Detalle de lo que queda pendiente</label>
          <input 
            type="text"
            className="form-input"
            value={notasPendientes}
            onChange={e => setNotasPendientes(e.target.value)}
            placeholder="Ej: Confirmar volumen y soportes al abrir STL en Chitubox"
          />
        </div>
      )}
    </>
  );
};
