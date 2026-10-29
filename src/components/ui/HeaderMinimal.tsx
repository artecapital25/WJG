import React from 'react';
import { Sun, ShieldCheck, KeyRound, LogOut, Database } from 'lucide-react';

interface HeaderMinimalProps {
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  activeOperator?: string;
  onSelectOperator?: (operator: string) => void;
  onOpenDailyBriefing?: () => void;
  onOpenBackup?: () => void;
  onOpenChangePin?: () => void;
  onLogout?: () => void;
  dailyAlertsCount?: number;
}

export const HeaderMinimal: React.FC<HeaderMinimalProps> = ({
  cloudStatus = 'connected',
  activeOperator = 'Juan',
  onSelectOperator,
  onOpenDailyBriefing,
  onOpenBackup,
  onOpenChangePin,
  onLogout,
  dailyAlertsCount = 0,
}) => {
  const displayName = React.useMemo(() => {
    if (!activeOperator) return 'Operador';
    const clean = activeOperator.trim();
    if (clean === 'ADMIN_COBRANZAS') return 'Admin';
    if (clean === 'IMPRESION_MANTENIMIENTO') return 'Impresión';
    if (clean === 'PINTURA_ACABADOS') return 'Acabados';
    if (clean === 'VENTAS_POS') return 'Ventas';
    return clean;
  }, [activeOperator]);

  return (
    <header className="header-minimal">
      {/* Brand Identity */}
      <div className="header-brand">
        <img 
          src="/wjg_logo_vector.svg" 
          alt="WJGEEKS Logo" 
          className="header-brand-logo"
        />
        <div style={{ lineHeight: 1.1, display: 'flex', alignItems: 'center' }}>
          <span className="header-brand-title">
            WJGEEKS
          </span>
          <span className="header-brand-badge">
            3D PRO
          </span>
        </div>
      </div>

      {/* Discretos Indicadores y Controles de Sesión */}
      <div className="header-right-actions">
        {/* Supabase Health Indicator / Acceso a Respaldos */}
        <div
          className="header-status-pill"
          onClick={onOpenBackup}
          title={cloudStatus === 'connected' ? 'Base de datos Supabase Online en vivo (Clic para Respaldos y Drive)' : 'Modo Local (Clic para Respaldos y Drive)'}
          style={{
            backgroundColor: cloudStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: cloudStatus === 'connected' ? '#34d399' : '#fbbf24',
            border: `1px solid ${cloudStatus === 'connected' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            cursor: onOpenBackup ? 'pointer' : 'default'
          }}
        >
          <span className="header-status-dot" />
          <span className="header-status-text">
            {cloudStatus === 'connected' ? 'Online' : 'Local'}
          </span>
        </div>

        {/* Botón Respaldos & Google Drive */}
        {onOpenBackup && (
          <button
            onClick={onOpenBackup}
            type="button"
            className="header-daily-btn"
            title="Respaldos en Google Drive (3:00 AM) y Copia de Seguridad Local"
            aria-label="Respaldos y Google Drive"
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              cursor: 'pointer'
            }}
          >
            <Database size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
            <span className="header-daily-text" style={{ color: '#38bdf8', fontWeight: 700 }}>
              Backup
            </span>
          </button>
        )}

        {/* Chip Daily 7am */}
        {onOpenDailyBriefing && (
          <button
            onClick={onOpenDailyBriefing}
            type="button"
            className="header-daily-btn"
            title="Ver resumen diario y alertas operativas (7AM)"
            aria-label="Resumen diario 7AM"
          >
            <Sun size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span className="header-daily-text">7AM</span>
            {dailyAlertsCount > 0 && (
              <span 
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '0 5px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  marginLeft: '2px',
                  lineHeight: '14px',
                  height: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {dailyAlertsCount}
              </span>
            )}
          </button>
        )}

        {/* Active Operator Avatar & Gestión de Sesión */}
        <div className="header-user-cluster">
          {/* Badge del Operador Autenticado */}
          <div
            className="header-user-badge"
            title={`Sesión activa: ${activeOperator}`}
          >
            <ShieldCheck size={13} color="#818cf8" style={{ flexShrink: 0 }} />
            <span className="header-user-name">
              {displayName}
            </span>
          </div>

          {/* Botón para cambiar PIN / Contraseña */}
          {onOpenChangePin && (
            <button
              type="button"
              onClick={onOpenChangePin}
              className="header-action-btn header-action-btn-key"
              title={`Cambiar clave o PIN (${activeOperator})`}
              aria-label="Cambiar clave o PIN"
            >
              <KeyRound size={13} />
            </button>
          )}

          {/* Botón para cerrar sesión */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="header-action-btn header-action-btn-logout"
              title={`Cerrar sesión de ${activeOperator}`}
              aria-label="Cerrar sesión"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
