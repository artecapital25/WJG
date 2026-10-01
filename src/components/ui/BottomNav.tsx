import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Kanban, 
  FileText, 
  Receipt, 
  Settings, 
  Rocket, 
  Box, 
  Menu, 
  X, 
  Download, 
  ChevronRight, 
  Check 
} from 'lucide-react';
import { TabType } from '../../types';
import { StorageService } from '../../services/storageService';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingOTsCount: number;
  draftItemsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingOTsCount,
  draftItemsCount
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Cerrar menú con tecla Escape y bloquear el scroll del fondo mientras esté abierto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMenuOpen]);

  // Lista maestra de las 7 secciones del sistema con metadatos para móvil
  const ALL_TABS: {
    id: TabType;
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    iconBg: string;
    iconColor: string;
    badge?: number;
  }[] = [
    {
      id: 'cotizador',
      label: 'Cotizador 3D',
      shortLabel: 'Cotizador',
      description: 'Cálculo de piezas, resina, pinturas y precios',
      icon: Calculator,
      iconBg: 'rgba(56, 189, 248, 0.15)',
      iconColor: 'var(--brand-cyan)',
      badge: draftItemsCount
    },
    {
      id: 'stl',
      label: 'Visor STL 3D',
      shortLabel: 'Visor STL',
      description: 'Lienzo WebGL 3D, rotación y captura fotográfica',
      icon: Box,
      iconBg: 'rgba(168, 85, 247, 0.15)',
      iconColor: '#c084fc'
    },
    {
      id: 'workflow',
      label: 'Taller & Órdenes (OT)',
      shortLabel: 'Taller (OT)',
      description: 'Pipeline Kanban, tiempos de curado e impresión',
      icon: Kanban,
      iconBg: 'rgba(234, 179, 8, 0.15)',
      iconColor: '#fde047',
      badge: pendingOTsCount
    },
    {
      id: 'cotizaciones',
      label: 'Historial Cotizaciones',
      shortLabel: 'Cotizaciones',
      description: 'Listado, estados, descarga PDF y envío WhatsApp',
      icon: FileText,
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#60a5fa'
    },
    {
      id: 'cuentas',
      label: 'Cuentas de Cobro',
      shortLabel: 'Cobros',
      description: 'Gestión de anticipos, saldos pendientes y pagos',
      icon: Receipt,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34d399'
    },
    {
      id: 'catalogos',
      label: 'Ajustes & Catálogos',
      shortLabel: 'Ajustes',
      description: 'Resinas, insumos, maquinaria y tarifario',
      icon: Settings,
      iconBg: 'rgba(148, 163, 184, 0.15)',
      iconColor: '#cbd5e1'
    },
    {
      id: 'plan',
      label: 'Plan WJG & Roadmap',
      shortLabel: 'Plan WJG',
      description: 'Hoja de ruta del sistema y próximos módulos',
      icon: Rocket,
      iconBg: 'rgba(236, 72, 153, 0.15)',
      iconColor: '#f472b6'
    }
  ];

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  // Determinar la 3ra pestaña visible en la barra móvil:
  // Si estamos en una pestaña diferente a 'cotizador' o 'workflow', mostramos la pestaña actual para feedback inmediato.
  // Si estamos en 'cotizador' o 'workflow', mostramos 'stl' como 3er atajo.
  const thirdMobileTabId: TabType = (activeTab !== 'cotizador' && activeTab !== 'workflow')
    ? activeTab
    : 'stl';

  const thirdMobileTab = ALL_TABS.find(t => t.id === thirdMobileTabId) || ALL_TABS[1];
  const totalBadges = (pendingOTsCount || 0) + (draftItemsCount || 0);

  return (
    <>
      <nav className="bottom-nav">
        {/* VISTA ESCRITORIO (Todas las 7 pestañas horizontales) */}
        <div className="bottom-nav-desktop">
          {ALL_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectTab(tab.id)}
                title={tab.description}
              >
                <div className="nav-icon-badge-container">
                  <Icon size={20} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="nav-badge-pill">{tab.badge}</span>
                  )}
                </div>
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* VISTA MÓVIL (Barra limpia de 4 botones con Menú Hamburguesa desplegable) */}
        <div className="bottom-nav-mobile">
          {/* 1. Cotizador */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'cotizador' ? 'active' : ''}`}
            onClick={() => handleSelectTab('cotizador')}
          >
            <div className="nav-icon-badge-container">
              <Calculator size={20} />
              {draftItemsCount > 0 && (
                <span className="nav-badge-pill">{draftItemsCount}</span>
              )}
            </div>
            <span>Cotizador</span>
          </button>

          {/* 2. Taller (OT) */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => handleSelectTab('workflow')}
          >
            <div className="nav-icon-badge-container">
              <Kanban size={20} />
              {pendingOTsCount > 0 && (
                <span className="nav-badge-pill">{pendingOTsCount}</span>
              )}
            </div>
            <span>Taller (OT)</span>
          </button>

          {/* 3. Tercera pestaña contextual */}
          <button
            type="button"
            className={`nav-item ${activeTab === thirdMobileTab.id ? 'active' : ''}`}
            onClick={() => handleSelectTab(thirdMobileTab.id)}
          >
            <div className="nav-icon-badge-container">
              <thirdMobileTab.icon size={20} />
              {thirdMobileTab.badge !== undefined && thirdMobileTab.badge > 0 && (
                <span className="nav-badge-pill">{thirdMobileTab.badge}</span>
              )}
            </div>
            <span>{thirdMobileTab.shortLabel}</span>
          </button>

          {/* 4. BOTÓN HAMBURGUESA DESPLEGABLE */}
          <button
            type="button"
            className={`nav-item nav-item-hamburger ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú desplegable'}
            title="Abrir menú completo de navegación"
          >
            <div className="nav-icon-badge-container">
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              {!isMenuOpen && totalBadges > 0 && (
                <span className="nav-badge-pill" style={{ background: 'var(--brand-cyan)' }}>
                  {totalBadges}
                </span>
              )}
            </div>
            <span>{isMenuOpen ? 'Cerrar' : 'Menú'}</span>
          </button>
        </div>
      </nav>

      {/* MENÚ DESPLEGABLE TIPO BOTTOM SHEET (DRAWER MÓVIL) */}
      {isMenuOpen && (
        <div 
          className="mobile-nav-backdrop"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="mobile-nav-sheet"
            onClick={e => e.stopPropagation()}
          >
            {/* Grabber pill */}
            <div className="mobile-nav-grabber" />

            {/* Encabezado del menú */}
            <div className="mobile-nav-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src="/wjg_logo_vector.svg" 
                  alt="WJGEEKS" 
                  style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>WJGEEKS 3D</span>
                    <span className="brand-badge">PRO</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Menú de navegación y módulos
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsMenuOpen(false)}
                style={{ padding: '6px', borderRadius: '50%', minHeight: 'auto' }}
                title="Cerrar menú"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista completa de las 7 secciones */}
            <div className="mobile-nav-sheet-list">
              {ALL_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`mobile-nav-sheet-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectTab(tab.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div 
                        className="mobile-nav-sheet-icon" 
                        style={{ background: tab.iconBg, color: tab.iconColor }}
                      >
                        <Icon size={20} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isActive ? 'var(--brand-cyan)' : '#fff' }}>
                            {tab.label}
                          </span>
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="nav-badge-pill" style={{ position: 'static' }}>
                              {tab.badge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {tab.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isActive && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          color: 'var(--brand-cyan)', 
                          background: 'rgba(56, 189, 248, 0.15)', 
                          padding: '2px 8px', 
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Check size={11} />
                          Activa
                        </span>
                      )}
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pie de acciones rápidas */}
            <div style={{ 
              marginTop: '14px', 
              paddingTop: '12px', 
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px'
            }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  StorageService.exportBackup();
                  setIsMenuOpen(false);
                }}
                style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Descargar copia de seguridad en JSON"
              >
                <Download size={14} />
                <span>Descargar Respaldo JSON</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsMenuOpen(false)}
                style={{ fontSize: '0.78rem', padding: '6px 16px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
