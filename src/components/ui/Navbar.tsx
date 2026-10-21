import { Sparkles, Download, Package, Rocket, TrendingUp, Smartphone, Camera, Users, Megaphone, Wrench, FileSpreadsheet, ShieldCheck, Calendar, Sun } from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface NavbarProps {
  onNewQuoteClick?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  whatsappStatus?: 'operativo' | 'alerta_critica' | 'desconocido';
  onOpenDailyBriefing?: () => void;
  onInstallPwa?: () => void;
  isInstallable?: boolean;
  onOpenBackupModal?: () => void;
  onOpenStaffLogin?: () => void;
  isStaffAuthenticated?: boolean;
  staffUser?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onNewQuoteClick, 
  activeTab, 
  onSelectTab, 
  cloudStatus = 'connected',
  whatsappStatus = 'operativo',
  onOpenDailyBriefing,
  onInstallPwa,
  isInstallable,
  onOpenBackupModal,
  onOpenStaffLogin,
  isStaffAuthenticated,
  staffUser
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
        {/* Indicador de Nube Supabase: Visible solo en pantallas medianas/grandes */}
        <div 
          className="header-desktop-only"
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
          <span>
            {cloudStatus === 'connected' ? 'Supabase Online' : cloudStatus === 'syncing' ? 'Sincronizando...' : 'Local'}
          </span>
        </div>

        {/* Indicador de Salud de WhatsApp (+57 320 2796115) */}
        <div 
          className="header-desktop-only"
          onClick={onOpenDailyBriefing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '9999px',
            cursor: onOpenDailyBriefing ? 'pointer' : 'default',
            background: whatsappStatus === 'alerta_critica' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            color: whatsappStatus === 'alerta_critica' ? '#f87171' : '#34d399',
            border: `1px solid ${whatsappStatus === 'alerta_critica' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`
          }}
          title={whatsappStatus === 'alerta_critica' ? 'ALERTA: Fallos o retrasos en cola de WhatsApp. Clic para auditar.' : 'WhatsApp Engine 100% Operativo (+57 320 2796115). Clic para ver Daily Briefing.'}
        >
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: 'currentColor',
            boxShadow: whatsappStatus === 'alerta_critica' ? '0 0 8px #ef4444' : '0 0 6px currentColor'
          }} />
          <span>
            {whatsappStatus === 'alerta_critica' ? 'WhatsApp Alerta' : 'WhatsApp OK'}
          </span>
        </div>

        {/* Botón Acceso Rápido Daily Briefing 7:00 AM */}
        {onOpenDailyBriefing && (
          <button 
            className="btn btn-sm btn-secondary header-desktop-only"
            onClick={onOpenDailyBriefing}
            title="Abrir Daily Briefing y Monitor de WhatsApp (7:00 AM)"
            style={{ fontWeight: 700, borderColor: 'rgba(245, 158, 11, 0.4)' }}
          >
            <Sun size={14} color="#f59e0b" />
            <span>Daily 7AM</span>
          </button>
        )}

        {/* Atajos secundarios: Visibles únicamente en escritorio */}
        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('pos')}
            title="Punto de Venta Express: Registrar venta con foto y alertas"
            style={{ fontWeight: 700 }}
          >
            <Camera size={14} color={activeTab === 'pos' ? '#000' : 'var(--brand-cyan)'} />
            <span>POS Express</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('stock')}
            title="Ver catálogo de productos y figuras en stock"
          >
            <Package size={14} />
            <span>Stock</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'tareas' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('tareas')}
            title="Tareas de equipo (Germán, Wendy, Juan) y S.O.S Insumos"
          >
            <Users size={14} color={activeTab === 'tareas' ? '#000' : '#c084fc'} />
            <span>Equipo</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'marketing' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('marketing')}
            title="Marketing Hub: Catálogo Meta / Instagram y generador de copys"
          >
            <Megaphone size={14} color={activeTab === 'marketing' ? '#000' : '#f472b6'} />
            <span>Marketing</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'herramientas' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('herramientas')}
            title="Herramientas & IAs 3D: Hunyuan 3D, Tripo, Cults3D y accesos directos"
          >
            <Wrench size={14} color={activeTab === 'herramientas' ? '#000' : 'var(--brand-cyan)'} />
            <span>Apps 3D</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'finanzas' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('finanzas')}
            title="Ver Balance Contable & Exportar Excel"
          >
            <TrendingUp size={14} color="#4ade80" />
            <span>Finanzas</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'calendario' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('calendario')}
            title="Ver Calendario Operativo & Cronograma"
            style={{ fontWeight: 700 }}
          >
            <Calendar size={14} color={activeTab === 'calendario' ? '#000' : 'var(--brand-cyan)'} />
            <span>Calendario</span>
          </button>
        )}

        {onSelectTab && (
          <button 
            className={`btn btn-sm ${activeTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'} header-desktop-only`}
            onClick={() => onSelectTab('usuarios')}
            title="Gestión de Personal, Roles y Accesos"
            style={{ fontWeight: 700 }}
          >
            <Users size={14} color={activeTab === 'usuarios' ? '#000' : '#38bdf8'} />
            <span>Personal</span>
          </button>
        )}

        <button 
          className="btn btn-secondary btn-sm header-desktop-only"
          onClick={() => onOpenBackupModal ? onOpenBackupModal() : StorageService.exportBackup()}
          title="Abrir sincronización con Google Sheets, Apps Script y Google Drive"
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileSpreadsheet size={14} color="#34d399" />
          <span>Drive & Sheets</span>
        </button>

        {/* Botón / Indicador de Acceso Staff */}
        {onOpenStaffLogin && (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onOpenStaffLogin}
            title={isStaffAuthenticated ? `Personal conectado: ${staffUser || 'Staff'}` : "Acceso Personal Staff"}
            style={{ 
              padding: '6px 10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderColor: isStaffAuthenticated ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.1)',
              background: isStaffAuthenticated ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.04)',
              color: isStaffAuthenticated ? '#34d399' : '#cbd5e1'
            }}
          >
            <ShieldCheck size={14} color={isStaffAuthenticated ? '#34d399' : '#94a3b8'} />
            <span className="btn-label-desktop">
              {isStaffAuthenticated ? (staffUser || 'Staff') : 'Staff'}
            </span>
          </button>
        )}

        {/* 1. Botón Instalar App: En celular SOLO ícono sin texto, en PC con texto */}
        {onInstallPwa && (
          <button 
            className="btn btn-sm header-install-btn"
            onClick={onInstallPwa}
            style={{ 
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid var(--brand-cyan)',
              color: '#38bdf8',
              fontWeight: 600,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            title="Instalar WJGEEKS 3D como App"
          >
            <Smartphone size={16} />
            <span className="btn-label-desktop">Instalar App</span>
          </button>
        )}

        {/* 2. Botón Cotizar: En celular SOLO ícono sin texto, en PC con texto */}
        {onNewQuoteClick && (
          <button 
            className="btn btn-cyan btn-sm header-quote-btn"
            onClick={onNewQuoteClick}
            style={{ 
              fontWeight: 700, 
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            title="Nueva Cotización 3D"
          >
            <Sparkles size={16} />
            <span className="btn-label-desktop">Cotizar</span>
          </button>
        )}
      </div>
    </header>
  );
};
