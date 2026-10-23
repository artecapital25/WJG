import React from 'react';
import { OrdenTrabajo, EstadoOT, ConfiguracionTaller, Cotizacion } from '../../../types';
import { OTCardItem } from './OTCardItem';

interface OTKanbanColumnProps {
  titulo: string;
  estado: EstadoOT | 'todos' | 'con_saldo';
  ordenes: OrdenTrabajo[];
  config: ConfiguracionTaller;
  cotizaciones?: Cotizacion[];
  copiedOtId: string | null;
  copiedLinkId: string | null;
  colorBorder?: string;
  badgeBg?: string;
  onUpdateEstado: (otId: string, nuevoEstado: EstadoOT) => void;
  onGenerarCuentaCobro?: (ot: OrdenTrabajo) => void;
  onOpenCotizacionModal: (ot: OrdenTrabajo) => void;
  onOpenLinksModal: (ot: OrdenTrabajo) => void;
  onOpenModalSTL: (ot: OrdenTrabajo) => void;
  onHandoffPorRol: (ot: OrdenTrabajo) => void;
  onNotificarCliente: (ot: OrdenTrabajo) => void;
  onCopyTrackingLink: (ot: OrdenTrabajo) => void;
  onCopyLink: (url: string, id: string) => void;
  onSetOtParaPago: (ot: OrdenTrabajo) => void;
  onSetOtParaEliminar: (ot: OrdenTrabajo) => void;
}

export const OTKanbanColumn: React.FC<OTKanbanColumnProps> = React.memo(({
  titulo,
  estado,
  ordenes,
  config,
  cotizaciones = [],
  copiedOtId,
  copiedLinkId,
  colorBorder = 'rgba(56, 189, 248, 0.3)',
  badgeBg = 'rgba(56, 189, 248, 0.15)',
  onUpdateEstado,
  onGenerarCuentaCobro,
  onOpenCotizacionModal,
  onOpenLinksModal,
  onOpenModalSTL,
  onHandoffPorRol,
  onNotificarCliente,
  onCopyTrackingLink,
  onCopyLink,
  onSetOtParaPago,
  onSetOtParaEliminar
}) => {
  return (
    <div 
      className="kanban-column"
      style={{
        background: 'rgba(15, 23, 42, 0.4)',
        border: `1px solid ${colorBorder}`,
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minWidth: '280px',
        flex: 1
      }}
    >
      {/* Column Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '8px',
        borderBottom: `1px solid ${colorBorder}`
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
          {titulo}
        </span>
        <span style={{
          background: badgeBg,
          color: '#fff',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          {ordenes.length}
        </span>
      </div>

      {/* Cards List */}
      {ordenes.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.76rem',
          fontStyle: 'italic'
        }}>
          Sin órdenes en esta etapa
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ordenes.map(ot => (
            <OTCardItem
              key={ot.id}
              ot={ot}
              config={config}
              cotizaciones={cotizaciones}
              copiedOtId={copiedOtId}
              copiedLinkId={copiedLinkId}
              onUpdateEstado={onUpdateEstado}
              onGenerarCuentaCobro={onGenerarCuentaCobro}
              onOpenCotizacionModal={onOpenCotizacionModal}
              onOpenLinksModal={onOpenLinksModal}
              onOpenModalSTL={onOpenModalSTL}
              onHandoffPorRol={onHandoffPorRol}
              onNotificarCliente={onNotificarCliente}
              onCopyTrackingLink={onCopyTrackingLink}
              onCopyLink={onCopyLink}
              onSetOtParaPago={onSetOtParaPago}
              onSetOtParaEliminar={onSetOtParaEliminar}
            />
          ))}
        </div>
      )}
    </div>
  );
});
OTKanbanColumn.displayName = 'OTKanbanColumn';
