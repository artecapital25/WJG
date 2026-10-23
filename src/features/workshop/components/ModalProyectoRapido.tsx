import React from 'react';
import { Sparkles, Camera } from 'lucide-react';

interface ModalProyectoRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  fotoUrlRapida: string;
  setFotoUrlRapida: (val: string) => void;
  isProcessingImg: boolean;
  nombreItemRapido: string;
  setNombreItemRapido: (val: string) => void;
  clienteNombreRapido: string;
  setClienteNombreRapido: (val: string) => void;
  clienteTelefonoRapido: string;
  setClienteTelefonoRapido: (val: string) => void;
  alturaSeleccionada: number;
  setAlturaSeleccionada: (val: number) => void;
  crearCobroPOS: boolean;
  setCrearCobroPOS: (val: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGuardarProyectoRapido: (e: React.FormEvent) => void;
}

export const ModalProyectoRapido: React.FC<ModalProyectoRapidoProps> = ({
  isOpen,
  onClose,
  fotoUrlRapida,
  setFotoUrlRapida,
  isProcessingImg,
  nombreItemRapido,
  setNombreItemRapido,
  clienteNombreRapido,
  setClienteNombreRapido,
  clienteTelefonoRapido,
  setClienteTelefonoRapido,
  alturaSeleccionada,
  setAlturaSeleccionada,
  crearCobroPOS,
  setCrearCobroPOS,
  fileInputRef,
  handleImageUpload,
  handleGuardarProyectoRapido
}) => {
  if (!isOpen) return null;

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
        style={{ maxWidth: '480px', width: '100%', margin: 0, padding: '24px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--brand-cyan)" />
            Proyecto Rápido (Entrada por Tarifario)
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Ingresa la foto del cliente y el tamaño estándar. El sistema fija el precio oficial y genera la orden de trabajo directa para el taller.
        </p>

        <form onSubmit={handleGuardarProyectoRapido}>
          {/* Foto de Referencia */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              FOTO / IMAGEN DE REFERENCIA:
            </label>
            {fotoUrlRapida ? (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '120px' }}>
                <img src={fotoUrlRapida} alt="Referencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => setFotoUrlRapida('')}
                  style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed var(--border-subtle)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
              >
                <Camera size={24} color="var(--brand-cyan)" style={{ margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                  {isProcessingImg ? 'Comprimiendo imagen...' : 'Toma foto o selecciona imagen'}
                </div>
              </div>
            )}
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>

          {/* Nombre de la pieza */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              NOMBRE DE LA FIGURA / MODELO:
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej: Estatua Batman 10cm" 
              value={nombreItemRapido} 
              onChange={e => setNombreItemRapido(e.target.value)} 
              required 
            />
          </div>

          {/* Cliente & Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                CLIENTE:
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Nombre del cliente" 
                value={clienteNombreRapido} 
                onChange={e => setClienteNombreRapido(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                WHATSAPP:
              </label>
              <input 
                type="tel" 
                className="form-input" 
                placeholder="Ej: 3202796115" 
                value={clienteTelefonoRapido} 
                onChange={e => setClienteTelefonoRapido(e.target.value)} 
              />
            </div>
          </div>

          {/* Selector de Altura del Nuevo Tarifario */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                SELECCIONA TAMAÑO (TARIFARIO OFICIAL):
              </label>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399' }}>
                ${(alturaSeleccionada * 10000).toLocaleString('es-CO')} COP
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[5, 6, 7, 8, 9, 10, 11, 12].map(cm => (
                <button
                  key={cm}
                  type="button"
                  onClick={() => setAlturaSeleccionada(cm)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: '8px',
                    border: `1px solid ${alturaSeleccionada === cm ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                    background: alturaSeleccionada === cm ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: alturaSeleccionada === cm ? 'var(--brand-cyan)' : '#fff',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <div>{cm} cm</div>
                  <div style={{ fontSize: '0.68rem', color: alturaSeleccionada === cm ? '#fff' : 'var(--text-muted)' }}>
                    ${cm * 10}k
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Checkbox para crear cobro en POS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="checkbox" 
              id="chkCobroPOS"
              checked={crearCobroPOS} 
              onChange={e => setCrearCobroPOS(e.target.checked)} 
            />
            <label htmlFor="chkCobroPOS" style={{ fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              Registrar venta en el POS Express para controlar cobro y abono
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
              Crear Proyecto en Taller 🚀
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
