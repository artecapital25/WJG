import React from 'react';
import { Sparkles, Download, Package, Rocket, TrendingUp, Smartphone } from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface NavbarProps {
  onNewQuoteClick?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  onInstallPwa?: () => void;
  isInstallable?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onNewQuoteClick, 
  activeTab, 
  onSelectTab, 
  cloudStatus = 'connected',
  onInstallPwa,
  isInstallable
}) => {
  return (
    <header className="top-header">
      <div 
        className="brand-wrapper" 
        style={{ cursor: onSelectTab ? 'pointer' : 'default' }} 
        onClick={() => onSelectTab && onSelectTab('cotizador')}
        title="Ir al Cotizador 3D"
      >
        <img 
          src="/wjg_logo_vector.svg" 
          alt="WJGEEKS Logo" 
          className="brand-logo-img" 
        />
        <div>
          <div className="brand-title">
            WJGEEKS
            <span className="brand-badge">3D PRO</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Indicador de Nube Supabase */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '9999px',
            background: cloudStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : cloudStatus === 'syncing' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.12)',
            color: cloudStatus === 'connected' ? '#34d399' : cloudStatus === 'syncing' ? '#38bdf8' : '#fbbf24',
            border: `1px solid ${cloudStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : cloudStatus === 'syncing' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(245, 158, 11, 0.3)'}`
          }}
          title={cloudStatus === 'connected' ? 'Base de datos Supabase conectada en vivo' : cloudStatus === 'syncing' ? 'Sincronizando con Supabase...' : 'Modo local activo'}
        >
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: 'currentColor',
            boxShadow: '0 0 6px currentColor'
          }} />
          <span className="desktop-header-btn">
            {cloudStatus === 'connected' ? 'Supabase Online' : cloudStatus === 'syncing' ? 'Sincronizando...' : 'Local'}
          </span>
        </div>
        {/* Atajos secundarios: visibles solo en pantallas medianas/grandes para que en celular el header sea limpio y espacioso */}
        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'} desktop-header-btn`}
            onClick={() => onSelectTab('stock')}
            title="Ver catálogo de productos y figuras en stock"
          >
            <Package size={14} />
            <span>Stock</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'plan' ? 'btn-primary' : 'btn-secondary'} desktop-header-btn`}
            onClick={() => onSelectTab('plan')}
            title="Ver Roadmap y Plan de Proyecto"
          >
            <Rocket size={14} />
            <span>Plan WJG</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'finanzas' ? 'btn-primary' : 'btn-secondary'} desktop-header-btn`}
            onClick={() => onSelectTab('finanzas')}
            title="Ver Balance Contable & Exportar Excel"
          >
            <TrendingUp size={14} color="#4ade80" />
            <span>Finanzas</span>
          </button>
        )}

        {isInstallable && onInstallPwa && (
          <button 
            className="btn btn-sm"
            onClick={onInstallPwa}
            style={{ 
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid var(--brand-cyan)',
              color: '#38bdf8',
              fontWeight: 600,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Instalar WJGEEKS 3D como App en este equipo"
          >
            <Smartphone size={14} />
            <span>Instalar App</span>
          </button>
        )}

        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => StorageService.exportBackup()}
          title="Descargar copia de seguridad en JSON"
          style={{ padding: '6px 10px' }}
        >
          <Download size={14} />
          <span className="desktop-header-btn">Respaldo</span>
        </button>

        {onNewQuoteClick && (
          <button 
            className="btn btn-cyan btn-sm"
            onClick={onNewQuoteClick}
            style={{ fontWeight: 700, padding: '6px 12px' }}
          >
            <Sparkles size={14} />
            <span>Cotizar</span>
          </button>
        )}
      </div>
    </header>
  );
};
