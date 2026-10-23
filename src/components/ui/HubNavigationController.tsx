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
    { id: 'stl', label: 'Visor STL' },
    { id: 'stock', label: 'Stock' },
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
    { id: 'marketing', label: 'Marketing IA' },
    { id: 'catalogos', label: 'Ajustes' },
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
        gap: '6px',
        padding: '8px 12px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: isActive ? 700 : 500,
              border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
