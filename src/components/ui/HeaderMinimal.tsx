import React, { useState, useEffect, useRef } from 'react';
import { Sun, ShieldCheck, KeyRound, LogOut, Database, MessageSquare, ChevronDown, QrCode } from 'lucide-react';
import { WhatsAppGatewayService } from '../../services/whatsappGatewayService';

interface HeaderMinimalProps {
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  activeOperator?: string;
  onSelectOperator?: (operator: string) => void;
  onOpenDailyBriefing?: () => void;
  onOpenBackup?: () => void;
  onOpenWhatsAppConnect?: () => void;
  onOpenChangePin?: () => void;
  onLogout?: () => void;
  dailyAlertsCount?: number;
}

export const HeaderMinimal: React.FC<HeaderMinimalProps> = ({
  cloudStatus = 'connected',
  activeOperator = 'Juan',
  onOpenDailyBriefing,
  onOpenBackup,
  onOpenWhatsAppConnect,
  onOpenChangePin,
  onLogout,
  dailyAlertsCount = 0,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const pollWa = async () => {
      try {
        const res = await WhatsAppGatewayService.checkStatus();
        if (mounted) setWaConnected(Boolean(res.connected));
      } catch {
        if (mounted) setWaConnected(false);
      }
    };
    pollWa();
    const intervalId = setInterval(pollWa, 30000);
    const handleWaEvent = (ev: Event) => {
      const custom = ev as CustomEvent<{ connected?: boolean }>;
      if (mounted && typeof custom.detail?.connected === 'boolean') {
        setWaConnected(custom.detail.connected);
      } else {
        pollWa();
      }
    };
    window.addEventListener('wjg:wa-status-updated', handleWaEvent);
    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener('wjg:wa-status-updated', handleWaEvent);
    };
  }, []);

  const displayName = React.useMemo(() => {
    if (!activeOperator) return 'Operador';
    const clean = activeOperator.trim();
    if (clean === 'ADMIN_COBRANZAS') return 'Admin';
    if (clean === 'IMPRESION_MANTENIMIENTO') return 'Impresión';
    if (clean === 'PINTURA_ACABADOS') return 'Acabados';
    if (clean === 'VENTAS_POS') return 'Ventas';
    return clean;
  }, [activeOperator]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const handleAction = (cb?: () => void) => {
    setMenuOpen(false);
    if (cb) cb();
  };

  return (
    <header className="header-minimal">
      {/* Identidad de Marca Limpia */}
      <div className="header-brand">
        <img 
          src="/wjg_logo_vector.svg" 
          alt="WJGEEKS Logo" 
          className="header-brand-logo"
        />
        <div style={{ lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="header-brand-title">
            WJGEEKS
          </span>
          <span className="header-brand-badge">
            3D PRO
          </span>
          <span
            className="header-status-dot"
            title={cloudStatus === 'connected' ? 'Supabase Online en vivo' : 'Modo Local'}
            style={{
              color: cloudStatus === 'connected' ? '#34d399' : '#fbbf24'
            }}
          />
        </div>
      </div>

      {/* Píldora en vivo de WhatsApp + Menú Unificado de Operador */}
      <div className="header-right-actions" ref={menuRef} style={{ position: 'relative' }}>
        {onOpenWhatsAppConnect && waConnected !== null && (
          <button
            type="button"
            onClick={onOpenWhatsAppConnect}
            title={waConnected ? 'Línea WhatsApp +57 320 2796115 conectada en vivo' : 'WhatsApp Gateway desconectado — Clic para escanear QR y reconectar'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              minHeight: '34px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: waConnected
                ? '1px solid rgba(34, 197, 94, 0.35)'
                : '1px solid rgba(245, 158, 11, 0.55)',
              backgroundColor: waConnected
                ? 'rgba(34, 197, 94, 0.12)'
                : 'rgba(245, 158, 11, 0.16)',
              color: waConnected ? '#4ade80' : '#fbbf24',
              whiteSpace: 'nowrap'
            }}
          >
            {waConnected ? (
              <MessageSquare size={13} color="#4ade80" style={{ flexShrink: 0 }} />
            ) : (
              <QrCode size={13} color="#fbbf24" style={{ flexShrink: 0 }} />
            )}
            <span>{waConnected ? 'WA Activo' : 'Reconectar WA'}</span>
          </button>
        )}

        <button
          type="button"
          className="header-user-badge"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title={`Menú de ${activeOperator}`}
          style={{ cursor: 'pointer', maxWidth: 'none', padding: '6px 12px', minHeight: '36px' }}
        >
          <ShieldCheck size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
          <span className="header-user-name">{displayName}</span>
          {dailyAlertsCount > 0 && (
            <span
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                borderRadius: '9999px',
                padding: '0 5px',
                fontSize: '0.64rem',
                fontWeight: 800,
                lineHeight: '15px',
                height: '15px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {dailyAlertsCount}
            </span>
          )}
          <ChevronDown
            size={14}
            color="#94a3b8"
            style={{
              flexShrink: 0,
              transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease'
            }}
          />
        </button>

        {menuOpen && (
          <div className="header-operator-menu" role="menu">
            <div className="header-operator-menu-status">
              <span
                className="header-status-dot"
                style={{ color: cloudStatus === 'connected' ? '#34d399' : '#fbbf24' }}
              />
              <span>
                {cloudStatus === 'connected' ? 'Supabase Online en vivo' : 'Modo Local (Offline)'}
              </span>
            </div>

            {onOpenDailyBriefing && (
              <button
                type="button"
                role="menuitem"
                className="header-operator-menu-item"
                onClick={() => handleAction(onOpenDailyBriefing)}
              >
                <Sun size={15} color="#f59e0b" />
                <span>Resumen Diario 7AM</span>
                {dailyAlertsCount > 0 && (
                  <span className="header-menu-pill-alert">{dailyAlertsCount}</span>
                )}
              </button>
            )}

            {onOpenWhatsAppConnect && (
              <button
                type="button"
                role="menuitem"
                className="header-operator-menu-item"
                onClick={() => handleAction(onOpenWhatsAppConnect)}
              >
                <MessageSquare size={15} color={waConnected ? '#4ade80' : '#fbbf24'} />
                <span>WhatsApp y Correo</span>
                {waConnected !== null && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '9999px',
                    backgroundColor: waConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                    color: waConnected ? '#4ade80' : '#fbbf24'
                  }}>
                    {waConnected ? 'QR OK' : 'Vincular QR'}
                  </span>
                )}
              </button>
            )}

            {onOpenBackup && (
              <button
                type="button"
                role="menuitem"
                className="header-operator-menu-item"
                onClick={() => handleAction(onOpenBackup)}
              >
                <Database size={15} color="#38bdf8" />
                <span>Respaldos & Drive</span>
              </button>
            )}

            {onOpenChangePin && (
              <button
                type="button"
                role="menuitem"
                className="header-operator-menu-item"
                onClick={() => handleAction(onOpenChangePin)}
              >
                <KeyRound size={15} color="#94a3b8" />
                <span>Cambiar PIN / Clave</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                role="menuitem"
                className="header-operator-menu-item danger"
                onClick={() => handleAction(onLogout)}
              >
                <LogOut size={15} color="#f87171" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
