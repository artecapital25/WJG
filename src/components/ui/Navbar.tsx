import React from 'react';
import { Sparkles, Download } from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface NavbarProps {
  onNewQuoteClick?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNewQuoteClick, activeTab, onSelectTab }) => {
  return (
    <header className="top-header">
      <div className="brand-wrapper" style={{ cursor: onSelectTab ? 'pointer' : 'default' }} onClick={() => onSelectTab && onSelectTab('cotizador')}>
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
        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'plan' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onSelectTab('plan')}
            title="Ver Roadmap y Plan de Proyecto"
          >
            <span>🚀 Plan WJG</span>
          </button>
        )}

        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => StorageService.exportBackup()}
          title="Descargar copia de seguridad en JSON"
        >
          <Download size={14} />
          <span style={{ display: 'none' }} className="sm-inline">Respaldo</span>
        </button>

        {onNewQuoteClick && (
          <button 
            className="btn btn-cyan btn-sm"
            onClick={onNewQuoteClick}
          >
            <Sparkles size={14} />
            <span>Cotizar</span>
          </button>
        )}
      </div>
    </header>
  );
};
