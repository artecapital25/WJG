import React from 'react';
import { Sun, ShieldCheck, KeyRound, LogOut } from 'lucide-react';

interface HeaderMinimalProps {
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  activeOperator?: string;
  onSelectOperator?: (operator: string) => void;
  onOpenDailyBriefing?: () => void;
  onOpenChangePin?: () => void;
  onLogout?: () => void;
  dailyAlertsCount?: number;
}

export const HeaderMinimal: React.FC<HeaderMinimalProps> = ({
  cloudStatus = 'connected',
  activeOperator = 'Juan',
  onSelectOperator,
  onOpenDailyBriefing,
  onOpenChangePin,
  onLogout,
  dailyAlertsCount = 0,
}) => {
  return (
    <header 
      style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'rgba(10, 15, 29, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img 
          src="/wjg_logo_vector.svg" 
          alt="WJGEEKS Logo" 
          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
        />
        <div style={{ lineHeight: 1.1 }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            WJGEEKS
          </span>
          <span 
            style={{ 
              marginLeft: '5px',
              fontSize: '0.65rem', 
              fontWeight: 800, 
              padding: '2px 5px', 
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}
          >
            3D PRO
          </span>
        </div>
      </div>

      {/* Discretos Indicadores de Estado (Cero Botones de Navegación) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Supabase Health Indicator */}
        <div
          title={cloudStatus === 'connected' ? 'Base de datos Supabase Online en vivo' : 'Modo Local'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '9999px',
            backgroundColor: cloudStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: cloudStatus === 'connected' ? '#34d399' : '#fbbf24',
            border: `1px solid ${cloudStatus === 'connected' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
          }}
        >
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: 'currentColor',
              boxShadow: '0 0 6px currentColor'
            }} 
          />
          <span className="header-status-text">
            {cloudStatus === 'connected' ? 'Online' : 'Local'}
          </span>
        </div>

        {/* Chip Daily 7am */}
        {onOpenDailyBriefing && (
          <button
            onClick={onOpenDailyBriefing}
            type="button"
            title="Ver resumen diario y alertas operativas"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            <Sun size={12} color="#f59e0b" />
            <span>7AM</span>
            {dailyAlertsCount > 0 && (
              <span 
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  borderRadius: '9999px',
                  padding: '0 5px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  marginLeft: '2px'
                }}
              >
                {dailyAlertsCount}
              </span>
            )}
          </button>
        )}

        {/* Active Operator Avatar & Gestión de Sesión */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Badge del Operador Autenticado (Informativo, requiere credenciales para cambiar) */}
          <div
            title={`Sesión activa: ${activeOperator}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(99, 102, 241, 0.18)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#a5b4fc',
              fontSize: '0.75rem',
              fontWeight: 700,
              userSelect: 'none',
            }}
          >
            <ShieldCheck size={13} color="#818cf8" />
            <span>{activeOperator}</span>
          </div>

          {/* Botón para cambiar PIN / Contraseña */}
          {onOpenChangePin && (
            <button
              type="button"
              onClick={onOpenChangePin}
              title={`Cambiar clave o PIN de ${activeOperator}`}
              aria-label="Cambiar clave o PIN"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <KeyRound size={12} />
            </button>
          )}

          {/* Botón para cerrar sesión o cambiar de usuario (solicita credenciales al ingresar) */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title={`Cerrar sesión de ${activeOperator} / Cambiar usuario`}
              aria-label="Cerrar sesión"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
