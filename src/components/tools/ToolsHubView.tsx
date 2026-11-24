import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Sparkles, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Edit3, 
  Star, 
  Search, 
  Check, 
  Copy, 
  Cpu, 
  Palette, 
  FolderGit2, 
  Globe, 
  X,
  Calculator,
  FileCode2
} from 'lucide-react';
import { HerramientaLink, CategoriaHerramienta, Resina, Filamento, Maquina, ConfiguracionTaller } from '../../types';
import { StorageService } from '../../services/storageService';
import { WjgButton, WjgConfirmModal, WjgModal, WjgSearchInput, WjgSelect, toast } from '../ui';
import { Suite3DProView } from './Suite3DProView';
import { SlicerInspectorView, SlicerAppliedPieceData } from './SlicerInspectorView';

interface ToolsHubViewProps {
  resinas?: Resina[];
  filamentos?: Filamento[];
  maquinas?: Maquina[];
  config?: ConfiguracionTaller;
  onApplyToCotizador?: (data: SlicerAppliedPieceData) => void;
}

const CATEGORIAS_CONFIG: Record<CategoriaHerramienta, { label: string; icon: any; color: string; bg: string }> = {
  ia_3d: {
    label: 'IAs Generativas 3D',
    icon: Sparkles,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)'
  },
  stl_repos: {
    label: 'Repositorios STL',
    icon: FolderGit2,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)'
  },
  slicers: {
    label: 'Slicers & Taller',
    icon: Cpu,
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.15)'
  },
  pintura: {
    label: 'Pintura & Acabados',
    icon: Palette,
    color: '#f472b6',
    bg: 'rgba(244, 114, 182, 0.15)'
  },
  utilidades: {
    label: 'Utilidades & Redes',
    icon: Globe,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.15)'
  }
};

export const ToolsHubView: React.FC<ToolsHubViewProps> = ({
  resinas = [],
  filamentos = [],
  maquinas = [],
  config,
  onApplyToCotizador
}) => {
  const [activeSuiteTab, setActiveSuiteTab] = useState<'calculadoras' | 'slicer' | 'apps'>('calculadoras');
  const [deleteToolTarget, setDeleteToolTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [herramientas, setHerramientas] = useState<HerramientaLink[]>(() => StorageService.getHerramientas());
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal para agregar o editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<HerramientaLink | null>(null);

  // Campos del formulario modal
  const [nombre, setNombre] = useState('');
  const [url, setUrl] = useState('');
  const [categoria, setCategoria] = useState<CategoriaHerramienta>('ia_3d');
  const [descripcion, setDescripcion] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [esFrecuente, setEsFrecuente] = useState(false);

  // Sincronizar persistencia cada vez que cambien las herramientas
  useEffect(() => {
    StorageService.saveHerramientas(herramientas);
  }, [herramientas]);

  // Abrir modal para crear
  const handleOpenCrearModal = () => {
    setEditingTool(null);
    setNombre('');
    setUrl('');
    setCategoria('ia_3d');
    setDescripcion('');
    setEtiqueta('');
    setEsFrecuente(false);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditarModal = (tool: HerramientaLink) => {
    setEditingTool(tool);
    setNombre(tool.nombre);
    setUrl(tool.url);
    setCategoria(tool.categoria);
    setDescripcion(tool.descripcion || '');
    setEtiqueta(tool.etiqueta || '');
    setEsFrecuente(!!tool.esFrecuente);
    setIsModalOpen(true);
  };

  // Guardar herramienta (crear o actualizar)
  const handleGuardarTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !url.trim()) {
      toast.warning('Por favor ingresa el nombre y el enlace de la herramienta.');
      return;
    }

    let urlFinal = url.trim();
    if (!urlFinal.startsWith('http://') && !urlFinal.startsWith('https://')) {
      urlFinal = `https://${urlFinal}`;
    }

    if (editingTool) {
      // Editar existente
      const updated = herramientas.map(t => {
        if (t.id === editingTool.id) {
          return {
            ...t,
            nombre: nombre.trim(),
            url: urlFinal,
            categoria,
            descripcion: descripcion.trim() || undefined,
            etiqueta: etiqueta.trim() || undefined,
            esFrecuente
          };
        }
        return t;
      });
      setHerramientas(updated);
    } else {
      // Crear nueva
      const nueva: HerramientaLink = {
        id: `tool-${Date.now()}`,
        nombre: nombre.trim(),
        url: urlFinal,
        categoria,
        descripcion: descripcion.trim() || undefined,
        etiqueta: etiqueta.trim() || undefined,
        esFrecuente,
        creado_el: new Date().toISOString().slice(0, 10)
      };
      setHerramientas([nueva, ...herramientas]);
    }

    setIsModalOpen(false);
  };

  // Eliminar herramienta (Design System WjgConfirmModal)
  const handleEliminarTool = (id: string, nombreTool: string) => {
    setDeleteToolTarget({ id, nombre: nombreTool });
  };

  const confirmEliminarTool = () => {
    if (!deleteToolTarget) return;
    setHerramientas(herramientas.filter(t => t.id !== deleteToolTarget.id));
    toast.success(`"${deleteToolTarget.nombre}" eliminada de Herramientas.`);
    setDeleteToolTarget(null);
  };

  // Alternar favorito / frecuente
  const handleToggleFrecuente = (id: string) => {
    setHerramientas(herramientas.map(t => {
      if (t.id === id) {
        return { ...t, esFrecuente: !t.esFrecuente };
      }
      return t;
    }));
  };

  // Copiar link al portapapeles
  const handleCopiarLink = (tool: HerramientaLink) => {
    navigator.clipboard.writeText(tool.url);
    setCopiadoId(tool.id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // Filtrado de herramientas
  const herramientasFiltradas = herramientas.filter(t => {
    // Filtro por categoría
    if (categoriaFiltro === 'frecuentes') {
      if (!t.esFrecuente) return false;
    } else if (categoriaFiltro !== 'todas') {
      if (t.categoria !== categoriaFiltro) return false;
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchNombre = t.nombre.toLowerCase().includes(q);
      const matchDesc = (t.descripcion || '').toLowerCase().includes(q);
      const matchUrl = t.url.toLowerCase().includes(q);
      const matchTag = (t.etiqueta || '').toLowerCase().includes(q);
      return matchNombre || matchDesc || matchUrl || matchTag;
    }

    return true;
  });

  const totalFrecuentes = herramientas.filter(t => t.esFrecuente).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Encabezado Principal */}
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="section-title">
            <Wrench size={24} color="var(--brand-cyan)" />
            Herramientas & Suite 3D PRO
          </h2>
          <p className="section-subtitle">
            Calculadoras técnicas 3D conectadas a tu catálogo, Inspector Universal de Slicer e IAs generativas/STL.
          </p>
        </div>

        {activeSuiteTab === 'apps' && (
          <WjgButton
            variant="save"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={handleOpenCrearModal}
          >
            Agregar Nueva App / Link
          </WjgButton>
        )}
      </div>

      {/* Selector Principal: Suite 3D PRO vs Inspector de Slicer vs Enlaces & Apps */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <WjgButton
          variant={activeSuiteTab === 'calculadoras' ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={<Calculator size={16} />}
          onClick={() => setActiveSuiteTab('calculadoras')}
          style={{ minHeight: '42px', padding: '0 16px' }}
        >
          Suite 3D PRO (5 Calculadoras)
        </WjgButton>
        <WjgButton
          variant={activeSuiteTab === 'slicer' ? 'cyan' : 'secondary'}
          size="sm"
          leftIcon={<FileCode2 size={16} />}
          onClick={() => setActiveSuiteTab('slicer')}
          style={{ minHeight: '42px', padding: '0 16px' }}
        >
          Inspector de Slicer (.3mf / .gcode / .ctb / .goo / .pwmb)
        </WjgButton>
        <WjgButton
          variant={activeSuiteTab === 'apps' ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={<Globe size={16} />}
          onClick={() => setActiveSuiteTab('apps')}
          style={{ minHeight: '42px', padding: '0 16px' }}
        >
          Enlaces & Apps 3D ({herramientas.length})
        </WjgButton>
      </div>

      {activeSuiteTab === 'calculadoras' && (
        <Suite3DProView
          resinas={resinas}
          filamentos={filamentos}
          maquinas={maquinas}
          config={config}
        />
      )}

      {activeSuiteTab === 'slicer' && (
        <SlicerInspectorView
          resinas={resinas}
          filamentos={filamentos}
          config={config}
          onApplyToCotizador={onApplyToCotizador}
        />
      )}

      {activeSuiteTab === 'apps' && (
      <>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Buscador */}
          <WjgSearchInput
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por nombre, palabra clave o enlace (ej: Hunyuan, Tripo, Cults3D, Chitubox)..."
          />

          {/* Filtros por Categoría en Cuadrícula Simétrica */}
          <div className="subtabs-grid-mobile" style={{ gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${categoriaFiltro === 'todas' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFiltro('todas')}
              style={{ fontWeight: 700 }}
            >
              🌐 Todas ({herramientas.length})
            </button>

            <button
              type="button"
              className={`btn btn-sm ${categoriaFiltro === 'frecuentes' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFiltro('frecuentes')}
              style={{ fontWeight: 700, color: categoriaFiltro === 'frecuentes' ? '#fff' : '#fbbf24' }}
            >
              ⭐ Frecuentes ({totalFrecuentes})
            </button>

            <button
              type="button"
              className={`btn btn-sm ${categoriaFiltro === 'ia_3d' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFiltro('ia_3d')}
              style={{ fontWeight: 700 }}
            >
              🤖 IAs Generativas 3D
            </button>

            <button
              type="button"
              className={`btn btn-sm ${categoriaFiltro === 'stl_repos' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFiltro('stl_repos')}
              style={{ fontWeight: 700 }}
            >
              📦 Repositorios STL
            </button>

            <button
              type="button"
              className={`btn btn-sm ${categoriaFiltro === 'slicers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFiltro('slicers')}
              style={{ fontWeight: 700 }}
            >
              ⚙️ Slicers & Taller
            </button>

            <button
              type="button"
              className={`btn btn-sm ${categoriaFiltro === 'pintura' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFiltro('pintura')}
              style={{ fontWeight: 700 }}
            >
              🎨 Pintura & Acabados
            </button>

            <button
              type="button"
              className={`btn btn-sm ${categoriaFiltro === 'utilidades' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFiltro('utilidades')}
              style={{ fontWeight: 700 }}
            >
              🛠️ Utilidades
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Herramientas */}
      {herramientasFiltradas.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          <Wrench size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
            No se encontraron herramientas con este criterio
          </h3>
          <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Puedes probar con otra palabra o agregar una nueva aplicación al lanzador del taller.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenCrearModal}
          >
            + Agregar enlace ahora
          </button>
        </div>
      ) : (
        <div className="cards-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {herramientasFiltradas.map(tool => {
            const catConfig = CATEGORIAS_CONFIG[tool.categoria] || CATEGORIAS_CONFIG.utilidades;
            const IconoCat = catConfig.icon;
            const isCopied = copiadoId === tool.id;

            return (
              <div 
                key={tool.id} 
                className="glass-card hover-card"
                style={{ 
                  margin: 0, 
                  padding: '18px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  border: tool.esFrecuente ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid var(--border-subtle)',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Fila superior: Categoría, Favorito y Acciones */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        background: catConfig.bg, 
                        color: catConfig.color, 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <IconoCat size={12} />
                        <span>{catConfig.label}</span>
                      </span>

                      {tool.etiqueta && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          {tool.etiqueta}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleFrecuente(tool.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: tool.esFrecuente ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                          transition: 'color 0.2s ease'
                        }}
                        title={tool.esFrecuente ? 'Quitar de frecuentes' : 'Marcar como frecuente'}
                      >
                        <Star size={16} fill={tool.esFrecuente ? '#fbbf24' : 'none'} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditarModal(tool)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--text-muted)'
                        }}
                        title="Editar herramienta"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEliminarTool(tool.id, tool.nombre)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'rgba(239, 68, 68, 0.6)'
                        }}
                        title="Eliminar herramienta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Título de la Herramienta */}
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                    {tool.nombre}
                  </h3>

                  {/* Descripción o Notas */}
                  {tool.descripcion && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                      {tool.descripcion}
                    </p>
                  )}
                </div>

                {/* Acciones: Abrir Enlace y Copiar */}
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="btn-group-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ 
                        fontWeight: 700, 
                        justifyContent: 'center', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <span>Abrir Herramienta</span>
                      <ExternalLink size={14} />
                    </a>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopiarLink(tool)}
                      style={{ padding: '6px 10px', color: isCopied ? '#34d399' : 'var(--text-muted)' }}
                      title="Copiar URL al portapapeles"
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA AGREGAR / EDITAR HERRAMIENTA */}
      <WjgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTool ? 'Editar Herramienta / App' : 'Agregar Nueva Herramienta / App'}
        subtitle="Añade enlaces directos a IAs generativas 3D, repositorios STL o plataformas web de uso diario."
        icon={<Wrench size={18} />}
        maxWidth="520px"
      >
        <form onSubmit={handleGuardarTool}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">NOMBRE DE LA APLICACIÓN / PLATAFORMA *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Tripo 3D / Tencent Hunyuan 3D / Cults3D"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">ENLACE WEB (URL) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <div>
                <label className="form-label">CATEGORÍA</label>
                <WjgSelect
                  value={categoria}
                  onChange={(val) => setCategoria(val as CategoriaHerramienta)}
                  options={[
                    { value: 'ia_3d', label: '🤖 IAs Generativas 3D' },
                    { value: 'stl_repos', label: '📦 Repositorios STL' },
                    { value: 'slicers', label: '⚙️ Slicers & Taller' },
                    { value: 'pintura', label: '🎨 Pintura & Acabados' },
                    { value: 'utilidades', label: '🛠️ Utilidades' },
                  ]}
                />
              </div>

              <div>
                <label className="form-label">ETIQUETA RÁPIDA (OPCIONAL)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: IA Oficial, Slicer, etc."
                  value={etiqueta}
                  onChange={e => setEtiqueta(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">DESCRIPCIÓN / RECOMENDACIÓN DE USO</label>
              <textarea
                className="form-textarea"
                placeholder="¿Para qué sirve? ¿Cuándo la usamos? (Ej: Generador 3D desde imagen para cotizaciones rápidas)"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={2}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', color: '#fff', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={esFrecuente}
                onChange={e => setEsFrecuente(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#fbbf24', cursor: 'pointer' }}
              />
              <span>⭐ Marcar como aplicación de uso frecuente (Destacada)</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <WjgButton variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </WjgButton>
              <WjgButton type="submit" variant="save">
                {editingTool ? 'Guardar Cambios' : 'Añadir al Lanzador'}
              </WjgButton>
            </div>
          </div>
        </form>
      </WjgModal>
      </>
      )}

      <WjgConfirmModal
        isOpen={Boolean(deleteToolTarget)}
        onClose={() => setDeleteToolTarget(null)}
        onConfirm={confirmEliminarTool}
        title="Eliminar Herramienta / App"
        message={
          deleteToolTarget
            ? `¿Deseas eliminar "${deleteToolTarget.nombre}" de tu lista de herramientas?`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};
