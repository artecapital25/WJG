import React from 'react';
import { ETAPAS } from '../utils/workshopUtils';
import { OrdenTrabajo } from '../../../types';

interface OTQuickFiltersProps {
  ordenes: OrdenTrabajo[];
  filtroEstado: string;
  setFiltroEstado: (estado: string) => void;
  conSaldoCount: number;
  entregadasCount?: number;
  activasCount?: number;
}

export const OTQuickFilters: React.FC<OTQuickFiltersProps> = React.memo(({
  ordenes,
  filtroEstado,
  setFiltroEstado,
  conSaldoCount,
  entregadasCount = 0,
  activasCount = 0
}) => {
  const activas = activasCount || ordenes.filter(o => o.estado !== 'Entregado').length;
  const entregadas = entregadasCount || ordenes.filter(o => o.estado === 'Entregado').length;

  return (
    <div className="etapas-grid-mobile" style={{ marginBottom: '16px' }}>
      <button 
        className={`btn btn-sm ${filtroEstado === 'todos' ? 'btn-cyan' : 'btn-secondary'}`}
        onClick={() => setFiltroEstado('todos')}
      >
        Activas en Taller ({activas})
      </button>
      <button 
        className={`btn btn-sm ${filtroEstado === 'con_saldo' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setFiltroEstado('con_saldo')}
        style={{
          background: filtroEstado === 'con_saldo' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.08)',
          borderColor: filtroEstado === 'con_saldo' ? '#f87171' : 'rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          fontWeight: 800,
          whiteSpace: 'nowrap'
        }}
      >
        🔴 Con Saldo ({conSaldoCount})
      </button>
      {ETAPAS.map(etapa => {
        const count = ordenes.filter(o => o.estado === etapa).length;
        return (
          <button 
            key={etapa}
            className={`btn btn-sm ${filtroEstado === etapa ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setFiltroEstado(etapa)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {etapa} ({count})
          </button>
        );
      })}
      <button 
        className={`btn btn-sm ${filtroEstado === 'entregadas' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setFiltroEstado('entregadas')}
        style={{
          background: filtroEstado === 'entregadas' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.08)',
          borderColor: filtroEstado === 'entregadas' ? '#10b981' : 'rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          fontWeight: 800,
          whiteSpace: 'nowrap'
        }}
      >
        📦 Entregadas ({entregadas})
      </button>
    </div>
  );
});

OTQuickFilters.displayName = 'OTQuickFilters';
