import React, { useState, FormEvent } from 'react';
import { User, X } from 'lucide-react';
import { Cliente } from '../../../types';

interface ModalNuevoClienteRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCliente: (cliente: Cliente) => void;
  clientesCount: number;
}

export const ModalNuevoClienteRapido: React.FC<ModalNuevoClienteRapidoProps> = React.memo(({
  isOpen,
  onClose,
  onAddCliente,
  clientesCount
}) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nit, setNit] = useState('');
  const [correo, setCorreo] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) return;

    const nuevo: Cliente = {
      id: `cli-${Date.now()}`,
      codigo: clientesCount + 1,
      nombre: nombre.trim(),
      nit_cc: nit.trim(),
      telefono: telefono.trim(),
      correo: correo.trim()
    };

    onAddCliente(nuevo);
    setNombre('');
    setTelefono('');
    setNit('');
    setCorreo('');
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Guardar Cliente
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
