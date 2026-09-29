import React from 'react';
import { Calculator, Kanban, FileText, Receipt, Settings } from 'lucide-react';
import { TabType } from '../../types';

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
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'cotizador' ? 'active' : ''}`}
        onClick={() => setActiveTab('cotizador')}
      >
        <div className="nav-icon-badge-container">
          <Calculator size={20} />
          {draftItemsCount > 0 && (
            <span className="nav-badge-pill">{draftItemsCount}</span>
          )}
        </div>
        <span>Cotizador</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'workflow' ? 'active' : ''}`}
        onClick={() => setActiveTab('workflow')}
      >
        <div className="nav-icon-badge-container">
          <Kanban size={20} />
          {pendingOTsCount > 0 && (
            <span className="nav-badge-pill">{pendingOTsCount}</span>
          )}
        </div>
        <span>Taller (OT)</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'cotizaciones' ? 'active' : ''}`}
        onClick={() => setActiveTab('cotizaciones')}
      >
        <FileText size={20} />
        <span>Cotizaciones</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'cuentas' ? 'active' : ''}`}
        onClick={() => setActiveTab('cuentas')}
      >
        <Receipt size={20} />
        <span>Cobros</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'catalogos' ? 'active' : ''}`}
        onClick={() => setActiveTab('catalogos')}
      >
        <Settings size={20} />
        <span>Ajustes</span>
      </button>
    </nav>
  );
};
