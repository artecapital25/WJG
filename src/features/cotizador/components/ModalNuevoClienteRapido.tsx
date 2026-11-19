import React, { useState, useMemo, FormEvent } from 'react';
import { User, X, Link2, AlertTriangle } from 'lucide-react';
import { Cliente } from '../../../types';
import {
  buscarCoincidenciasCliente,
  normalizarNitCc,
  normalizarCorreo
} from '../../../utils/customerClassification';

interface ModalNuevoClienteRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCliente: (cliente: Cliente) => void;
  clientesCount: number;
  clientes?: Cliente[];
}

export const ModalNuevoClienteRapido: React.FC<ModalNuevoClienteRapidoProps> = React.memo(({
  isOpen,
  onClose,
  onAddCliente,
  clientesCount,
  clientes = []
}) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nit, setNit] = useState('');
  const [correo, setCorreo] = useState('');

  const coincidencia = useMemo(() => {
    return buscarCoincidenciasCliente(
      { nombre, telefono, nit_cc: nit, correo },
      clientes
    );
  }, [nombre, telefono, nit, correo, clientes]);

  if (!isOpen) return null;

  const limpiarYEnviar = (cli: Cliente) => {
    onAddCliente(cli);
    setNombre('');
    setTelefono('');
    setNit('');
    setCorreo('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) return;

    if (coincidencia.exactMatch) {
      limpiarYEnviar({
        ...coincidencia.exactMatch,
        nombre: nombre.trim() || coincidencia.exactMatch.nombre,
        telefono: telefono.trim() || coincidencia.exactMatch.telefono,
        nit_cc: normalizarNitCc(nit) || coincidencia.exactMatch.nit_cc,
        correo: normalizarCorreo(correo) || coincidencia.exactMatch.correo
      });
      return;
    }

    const nuevo: Cliente = {
      id: `cli-${Date.now()}`,
      codigo: clientesCount + 1,
      nombre: nombre.trim(),
      nit_cc: normalizarNitCc(nit),
      telefono: telefono.trim(),
      correo: normalizarCorreo(correo)
    };

    limpiarYEnviar(nuevo);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--brand-cyan)" />
            <span>Agregar Nuevo Cliente</span>
          </h3>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre Completo *</label>
            <input 
              type="text" 
              className="form-input" 
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Laura Martínez"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Teléfono / WhatsApp *</label>
            <input 
              type="tel" 
              className="form-input" 
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="Ej: 3201234567"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">NIT / CC</label>
            <input 
              type="text" 
              className="form-input" 
              value={nit}
              onChange={e => setNit(e.target.value)}
              placeholder="1018..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input 
              type="email" 
              className="form-input" 
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              placeholder="cliente@ejemplo.com"
            />
          </div>

          {coincidencia.exactMatch && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              borderRadius: '8px',
              padding: '10px',
              marginTop: '10px',
              fontSize: '0.78rem',
              color: '#86efac'
            }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Link2 size={14} />
                <span>¡Cliente ya registrado en el directorio: {coincidencia.exactMatch.nombre}!</span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginBottom: '6px' }}>
                Coincide por {coincidencia.matchReason === 'nit_cc' ? 'Cédula/NIT' : coincidencia.matchReason === 'telefono' ? 'Teléfono' : 'Correo'}. Al guardar se actualizarán y vincularán sus datos sin crear duplicados.
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => limpiarYEnviar({
                  ...coincidencia.exactMatch!,
                  nombre: nombre.trim() || coincidencia.exactMatch!.nombre,
                  telefono: telefono.trim() || coincidencia.exactMatch!.telefono,
                  nit_cc: normalizarNitCc(nit) || coincidencia.exactMatch!.nit_cc,
                  correo: normalizarCorreo(correo) || coincidencia.exactMatch!.correo
                })}
                style={{ fontSize: '0.72rem', borderColor: '#34d399', color: '#34d399' }}
              >
                Vincular y Actualizar Ficha Existente
              </button>
            </div>
          )}

          {!coincidencia.exactMatch && coincidencia.nameMatches.length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '8px',
              padding: '10px',
              marginTop: '10px',
              fontSize: '0.76rem'
            }}>
              <div style={{ fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <AlertTriangle size={14} />
                <span>Coincidencia por nombre en el directorio ({coincidencia.nameMatches.length}):</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {coincidencia.nameMatches.slice(0, 3).map(cand => (
                  <div key={cand.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                    <span style={{ color: '#e2e8f0', fontSize: '0.72rem' }}>
                      <strong>{cand.nombre}</strong> • 📱 {cand.telefono || 'Sin tel'} {cand.nit_cc ? `• 🆔 ${cand.nit_cc}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => limpiarYEnviar({
                        ...cand,
                        telefono: telefono.trim() || cand.telefono,
                        nit_cc: normalizarNitCc(nit) || cand.nit_cc,
                        correo: normalizarCorreo(correo) || cand.correo
                      })}
                      style={{
                        background: 'rgba(56, 189, 248, 0.2)',
                        border: '1px solid rgba(56, 189, 248, 0.45)',
                        color: '#7dd3fc',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Usar existente
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {coincidencia.exactMatch ? 'Vincular y Actualizar Cliente' : 'Guardar Cliente'}
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
ModalNuevoClienteRapido.displayName = 'ModalNuevoClienteRapido';
