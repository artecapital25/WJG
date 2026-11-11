import React from 'react';
import { TabType } from '../../types';
import { HubType } from './BottomNavBar';

interface SubTabConfig {
  id: TabType;
  label: string;
}

const HUB_SUBTABS: Record<HubType, SubTabConfig[]> = {
  ventas: [
    { id: 'cotizador', label: 'Cotizador 3D' },
    { id: 'cotizaciones', label: 'Cotizaciones' },
    { id: 'pos', label: 'POS Express' },
  ],
  taller: [
    { id: 'workflow', label: 'Kanban OTs' },
    { id: 'tareas', label: 'Tareas Taller' },
    { id: 'stock', label: 'Stock' },
    { id: 'materiales', label: '🧵 Materiales & Filamentos' },
    { id: 'stl', label: 'Visor STL' },
    { id: 'calendario', label: 'Calendario' },
    { id: 'seguimiento', label: 'Rastreo' },
  ],
  finanzas: [
    { id: 'cuentas', label: 'Cobranzas' },
    { id: 'finanzas', label: 'Balance' },
    { id: 'plan', label: 'Plan WJG' },
  ],
  gestion: [
    { id: 'tareas', label: 'Equipo & S.O.S' },
    { id: 'usuarios', label: 'Personal' },
    { id: 'directorio', label: '👥 Directorio (Clientes & Prov.)' },
    { id: 'marketing', label: 'Marketing IA' },
    { id: 'catalogos', label: '⚙️ Ajustes Taller' },
  ],
};

interface HubNavigationControllerProps {
  activeHub: HubType;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const HubNavigationController: React.FC<HubNavigationControllerProps> = ({
  activeHub,
  activeTab,
  onSelectTab,
}) => {
  const subtabs = HUB_SUBTABS[activeHub] || [];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        backgroundColor: 'rgba(13, 19, 31, 0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        scrollbarWidth: 'none',
      }}
    >
      {subtabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            style={{
              minHeight: '38px',
              padding: '7px 15px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: isActive ? 800 : 600,
              fontFamily: isActive ? 'var(--font-display)' : 'var(--font-body)',
              border: isActive
                ? '1px solid rgba(56, 189, 248, 0.55)'
                : '1px solid rgba(255, 255, 255, 0.09)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(27, 98, 177, 0.85) 0%, rgba(37, 119, 208, 0.75) 100%)'
                : 'rgba(41, 42, 47, 0.65)',
              color: isActive ? '#ffffff' : 'rgba(248, 250, 252, 0.75)',
              boxShadow: isActive ? '0 4px 12px rgba(27, 98, 177, 0.35)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
