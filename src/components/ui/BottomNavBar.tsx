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
        height: '66px',
        backgroundColor: 'rgba(7, 10, 16, 0.96)',
        backdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.09)',
        boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.55)',
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
              gap: '3px',
              height: '100%',
              minHeight: '48px',
              background: isActive
                ? 'radial-gradient(circle at 50% 0%, rgba(27, 98, 177, 0.28) 0%, transparent 72%)'
                : 'none',
              border: 'none',
              color: isActive ? '#38bdf8' : 'rgba(248, 250, 252, 0.55)',
              cursor: 'pointer',
              transition: 'color 0.15s ease, transform 0.1s ease, background 0.2s ease',
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
                    right: '-11px',
                    background: isActive
                      ? 'linear-gradient(135deg, #1b62b1 0%, #38bdf8 100%)'
                      : '#ef4444',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '17px',
                    height: '17px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '1px solid rgba(7, 10, 16, 0.85)',
                  }}
                >
                  {hub.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '0.74rem',
                fontFamily: isActive ? 'var(--font-display)' : 'var(--font-body)',
                fontWeight: isActive ? 800 : 500,
                letterSpacing: '-0.01em',
                color: isActive ? '#ffffff' : 'rgba(248, 250, 252, 0.6)',
              }}
            >
              {hub.label}
            </span>
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '36px',
                  height: '3px',
                  background: 'linear-gradient(90deg, #1b62b1 0%, #38bdf8 100%)',
                  borderRadius: '0 0 6px 6px',
                  boxShadow: '0 2px 10px rgba(56, 189, 248, 0.65)',
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
