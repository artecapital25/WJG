import React from 'react';
import { ETAPAS } from '../utils/workshopUtils';
import { OrdenTrabajo } from '../../../types';

interface OTQuickFiltersProps {
  ordenes: OrdenTrabajo[];
  filtroEstado: string;
  setFiltroEstado: (estado: string) => void;
  conSaldoCount: number;
}

export const OTQuickFilters: React.FC<OTQuickFiltersProps> = React.memo(({
  ordenes,
  filtroEstado,
  setFiltroEstado,
  conSaldoCount
}) => {
  return (
    <div className="etapas-grid-mobile" style={{ marginBottom: '16px' }}>
      <button 
        className={`btn btn-sm ${filtroEstado === 'todos' ? 'btn-cyan' : 'btn-secondary'}`}
        onClick={() => setFiltroEstado('todos')}
      >
        Todas ({ordenes.length})
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
    </div>
  );
});

OTQuickFilters.displayName = 'OTQuickFilters';
