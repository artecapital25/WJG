import React from 'react';
import { ShoppingBag, Box, TrendingUp, Settings } from 'lucide-react';

export type HubType = 'ventas' | 'taller' | 'finanzas' | 'gestion';

interface BottomNavBarProps {
  activeHub: HubType;
  onSelectHub: (hub: HubType) => void;
  pendingQuotesCount?: number;
  activeOTsCount?: number;
  pendingDebtsCount?: number;
  allowedHubs?: HubType[];
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeHub,
  onSelectHub,
  pendingQuotesCount = 0,
  activeOTsCount = 0,
  pendingDebtsCount = 0,
  allowedHubs
}) => {
  const allHubs: {
    id: HubType;
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'ventas',
      label: 'Ventas',
      icon: ShoppingBag,
      badge: pendingQuotesCount,
    },
    {
      id: 'taller',
      label: 'Taller',
      icon: Box,
      badge: activeOTsCount,
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      icon: TrendingUp,
      badge: pendingDebtsCount,
    },
    {
      id: 'gestion',
      label: 'Gestión',
      icon: Settings,
    },
  ];

  const hubs = allowedHubs && allowedHubs.length > 0 
    ? allHubs.filter(h => allowedHubs.includes(h.id))
    : allHubs;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: 'rgba(10, 15, 29, 0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
      }}
    >
      {hubs.map((hub) => {
        const Icon = hub.icon;
        const isActive = activeHub === hub.id;

        return (
          <button
            key={hub.id}
            type="button"
            onClick={() => onSelectHub(hub.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '100%',
              background: 'none',
              border: 'none',
              color: isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              transition: 'color 0.15s ease, transform 0.1s ease',
              padding: '6px 0',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={22} color={isActive ? '#38bdf8' : 'currentColor'} />
              {hub.badge !== undefined && hub.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    backgroundColor: isActive ? '#38bdf8' : '#ef4444',
                    color: isActive ? '#000' : '#fff',
                    borderRadius: '9999px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {hub.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '-0.01em',
              }}
            >
              {hub.label}
            </span>
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '32px',
                  height: '3px',
                  backgroundColor: '#38bdf8',
                  borderRadius: '0 0 4px 4px',
                  boxShadow: '0 2px 8px rgba(56, 189, 248, 0.5)',
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
