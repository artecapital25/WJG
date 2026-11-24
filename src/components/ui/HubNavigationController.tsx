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
  herramientas: [
    { id: 'herramientas', label: '🧮 Suite 3D & Apps' },
    { id: 'stl', label: '📦 Visor STL' },
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
    <div className="hub-subtabs-bar" role="tablist" aria-label="Subpestañas de sección">
      {subtabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            style={{
              minHeight: '42px',
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: isActive ? 800 : 600,
              fontFamily: isActive ? 'var(--font-display)' : 'var(--font-body)',
              border: isActive
                ? '1px solid rgba(56, 189, 248, 0.65)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(27, 98, 177, 0.95) 0%, rgba(37, 119, 208, 0.85) 100%)'
                : 'rgba(41, 42, 47, 0.65)',
              color: isActive ? '#ffffff' : 'rgba(248, 250, 252, 0.78)',
              boxShadow: isActive ? '0 4px 14px rgba(27, 98, 177, 0.45)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
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
