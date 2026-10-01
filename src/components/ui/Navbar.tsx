import React from 'react';
import { Sparkles, Download, Package, Rocket } from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface NavbarProps {
  onNewQuoteClick?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNewQuoteClick, activeTab, onSelectTab }) => {
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
