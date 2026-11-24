import React, { useMemo, useState } from 'react';
import { DownloadCloud, Edit3, Plus, Receipt, Trash2 } from 'lucide-react';
import type { CategoriaEgresoTaller, EgresoTaller, SolicitudInsumo } from '../../types';
import { CloudSyncService } from '../../services/cloudSyncService';
import {
  WjgBadge,
  WjgButton,
  WjgCard,
  WjgConfirmModal,
  WjgEmptyState,
  WjgModal,
  WjgNumberInput,
  WjgSearchInput,
  WjgSelect,
  WjgTextArea,
  WjgTextInput,
  toast,
} from '../ui';

interface EgresosCashflowTabProps {
  egresos: EgresoTaller[];
  solicitudesInsumos?: SolicitudInsumo[];
  activeOperator?: string;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const CATEGORIA_LABELS: Record<CategoriaEgresoTaller, string> = {
  INSUMOS_RESINA: 'Resinas e Insumos',
  FILAMENTO: 'Filamentos FDM',
  SERVICIOS_LUZ: 'Servicios / Energía / Internet',
  MANTENIMIENTO: 'Mantenimiento / Repuestos',
  ENVIOS: 'Envíos y Logística',
  MARKETING: 'Marketing y Pauta',
  DEVOLUCION_CLIENTE: 'Devolución a Cliente',
  NOMINA_MANO_OBRA: 'Nómina / Mano de Obra',
  OTROS: 'Otros Gastos',
};

const CATEGORIA_OPTIONS = Object.entries(CATEGORIA_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const METODO_OPTIONS = [
  { value: 'Bre-B', label: 'Bre-B (Llave Única)' },
  { value: 'Nequi', label: 'Nequi' },
  { value: 'Efectivo', label: 'Efectivo Caja Física' },
  { value: 'Transferencia', label: 'Transferencia / Otro' },
];

const inferCategoriaFromSolicitud = (sol: SolicitudInsumo): CategoriaEgresoTaller => {
  const txt = `${sol.categoria || ''} ${sol.insumo_nombre || ''}`.toLowerCase();
  if (txt.includes('filamento') || txt.includes('pla') || txt.includes('petg')) return 'FILAMENTO';
  if (txt.includes('envio') || txt.includes('envío') || txt.includes('flete')) return 'ENVIOS';
  if (txt.includes('repuesto') || txt.includes('fep') || txt.includes('pantalla') || txt.includes('boquilla')) {
    return 'MANTENIMIENTO';
  }
  return 'INSUMOS_RESINA';
};

export const EgresosCashflowTab: React.FC<EgresosCashflowTabProps> = ({
  egresos,
  solicitudesInsumos = [],
  activeOperator = 'Taller',
  loading,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState<CategoriaEgresoTaller>('INSUMOS_RESINA');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState(0);
  const [metodoPago, setMetodoPago] = useState('Bre-B');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [importingSos, setImportingSos] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EgresoTaller | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);

  const importedSosIds = useMemo(() => {
    const ids = new Set<string>();
    egresos.forEach(e => {
      if (e.solicitud_insumo_id) ids.add(e.solicitud_insumo_id);
    });
    return ids;
  }, [egresos]);

  const sosPendientesImportar = useMemo(
    () =>
      solicitudesInsumos.filter(sol => {
        if (importedSosIds.has(sol.id)) return false;
        if (sol.estado !== 'comprado' && sol.estado !== 'recibido') return false;
        const costo = Number(sol.costo_real || sol.costo_estimado || 0);
        return costo > 0;
      }),
    [solicitudesInsumos, importedSosIds]
  );

  const totalEgresos = useMemo(
    () => egresos.reduce((acc, e) => acc + (Number(e.monto) || 0), 0),
    [egresos]
  );

  const categoriasBreakdown = useMemo(() => {
    const map = new Map<CategoriaEgresoTaller, number>();
    egresos.forEach(e => {
      const prev = map.get(e.categoria) || 0;
      map.set(e.categoria, prev + (Number(e.monto) || 0));
    });
    return Array.from(map.entries())
      .map(([cat, val]) => ({
        categoria: cat,
        label: CATEGORIA_LABELS[cat] || cat,
        total: val,
        pct: totalEgresos > 0 ? Math.round((val / totalEgresos) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [egresos, totalEgresos]);

  const filteredEgresos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return egresos.filter(e => {
      if (filtroCategoria !== 'TODAS' && e.categoria !== filtroCategoria) return false;
      if (!q) return true;
      return (
        (e.concepto || '').toLowerCase().includes(q) ||
        (e.proveedor_o_beneficiario || '').toLowerCase().includes(q) ||
        (e.notas || '').toLowerCase().includes(q) ||
        (CATEGORIA_LABELS[e.categoria] || '').toLowerCase().includes(q)
      );
    });
  }, [egresos, search, filtroCategoria]);

  const openCreateModal = () => {
    setEditingId(null);
    setFecha(new Date().toISOString().slice(0, 10));
    setCategoria('INSUMOS_RESINA');
    setConcepto('');
    setMonto(0);
    setMetodoPago('Bre-B');
    setProveedor('');
    setNotas('');
    setModalOpen(true);
  };

  const openEditModal = (eg: EgresoTaller) => {
    setEditingId(eg.id);
    setFecha((eg.fecha || new Date().toISOString()).slice(0, 10));
    setCategoria(eg.categoria);
    setConcepto(eg.concepto || '');
    setMonto(Number(eg.monto) || 0);
    setMetodoPago(eg.metodo_pago || 'Bre-B');
    setProveedor(eg.proveedor_o_beneficiario || '');
    setNotas(eg.notas || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!concepto.trim()) {
      toast.warning('Ingresa el concepto o descripción del egreso.');
      return;
    }
    if (monto <= 0) {
      toast.warning('El monto del egreso debe ser mayor a $0.');
      return;
    }

    setSaving(true);
    try {
      const payload: EgresoTaller = {
        id:
          editingId ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `egr_${Date.now()}`),
        fecha: fecha || new Date().toISOString().slice(0, 10),
        categoria,
        concepto: concepto.trim(),
        monto: Math.round(monto),
        metodo_pago: metodoPago,
        proveedor_o_beneficiario: proveedor.trim() || undefined,
        registrado_por: activeOperator,
        notas: notas.trim() || undefined,
      };
      const ok = await CloudSyncService.saveEgreso(payload);
      if (ok) {
        toast.success(editingId ? 'Egreso actualizado.' : 'Egreso registrado en el flujo de caja.');
        setModalOpen(false);
        await onRefresh();
      } else {
        toast.error('No se pudo guardar el egreso en Supabase.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImportSosInsumos = async () => {
    if (sosPendientesImportar.length === 0) return;
    setImportingSos(true);
    let importedCount = 0;
    try {
      for (const sol of sosPendientesImportar) {
        const costo = Math.round(Number(sol.costo_real || sol.costo_estimado || 0));
        if (costo <= 0) continue;
        const nuevo: EgresoTaller = {
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `egr_sos_${Date.now()}_${importedCount}`,
          fecha: (sol.fecha_atendida || sol.fecha_solicitud || new Date().toISOString()).slice(0, 10),
          categoria: inferCategoriaFromSolicitud(sol),
          concepto: `Compra S.O.S Insumos: ${sol.insumo_nombre} (${sol.cantidad} ${sol.unidad})`,
          monto: costo,
          metodo_pago: 'Bre-B',
          proveedor_o_beneficiario: sol.proveedor_sugerido || sol.plataforma_tienda || 'Proveedor S.O.S',
          solicitud_insumo_id: sol.id,
          registrado_por: activeOperator,
          notas: sol.notas || 'Importado desde compras S.O.S Insumos',
        };
        const ok = await CloudSyncService.saveEgreso(nuevo);
        if (ok) importedCount++;
      }
      if (importedCount > 0) {
        toast.success(`Se importaron ${importedCount} compra(s) de S.O.S Insumos a Egresos.`);
        await onRefresh();
      } else {
        toast.warning('No se pudieron importar compras desde S.O.S Insumos.');
      }
    } finally {
      setImportingSos(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await CloudSyncService.deleteEgreso(deleteTarget.id);
      if (ok) {
        toast.success('Egreso eliminado del flujo de caja.');
        await onRefresh();
      } else {
        toast.error('No se pudo eliminar el egreso en Supabase.');
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sosPendientesImportar.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: '#bae6fd', fontSize: '0.9rem' }}>
              {sosPendientesImportar.length} compra(s) en S.O.S Insumos listas para descontar en Caja
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Importa en 1 clic las solicitudes marcadas como Comprado/Recibido con costo registrado.
            </div>
          </div>
          <WjgButton
            size="sm"
            variant="cyan"
            leftIcon={<DownloadCloud size={15} />}
            loading={importingSos}
            onClick={handleImportSosInsumos}
          >
            Importar compras de S.O.S Insumos
          </WjgButton>
        </div>
      )}

      {categoriasBreakdown.length > 0 && (
        <WjgCard>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
            Distribución de Gastos por Categoría
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categoriasBreakdown.map(cat => (
              <div key={cat.categoria} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700 }}>{cat.label}</span>
                  <span className="tabular-nums" style={{ fontWeight: 800, color: '#fb7185' }}>
                    {formatCOP(cat.total)} ({cat.pct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: '7px',
                    borderRadius: '999px',
                    background: 'rgba(148, 163, 184, 0.14)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(3, cat.pct)}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #f43f5e, #fb923c)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </WjgCard>
      )}

      <WjgCard>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', flex: '1 1 420px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px' }}>
              <WjgSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar gasto por concepto o proveedor..."
                compact
              />
            </div>
            <div style={{ minWidth: '220px', flex: '0 1 260px' }}>
              <WjgSelect
                value={filtroCategoria}
                onChange={setFiltroCategoria}
                options={[{ value: 'TODAS', label: 'Todas las categorías' }, ...CATEGORIA_OPTIONS]}
                compact
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <WjgBadge variant="danger">Total Egresos: {formatCOP(totalEgresos)}</WjgBadge>
            <WjgButton
              size="sm"
              variant="save"
              leftIcon={<Plus size={15} />}
              onClick={openCreateModal}
              disabled={loading}
            >
              Registrar Gasto / Egreso
            </WjgButton>
          </div>
        </div>

        {filteredEgresos.length === 0 ? (
          <WjgEmptyState
            icon={<Receipt size={32} />}
            title="Sin egresos registrados"
            description="Registra compras de resinas, filamentos, envíos, servicios públicos o devoluciones para medir el flujo de caja neto real."
            action={
              <WjgButton size="sm" variant="primary" leftIcon={<Plus size={15} />} onClick={openCreateModal}>
                Registrar Primer Egreso
              </WjgButton>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Concepto</th>
                  <th>Proveedor / Beneficiario</th>
                  <th>Medio</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEgresos.map(eg => (
                  <tr key={eg.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {(eg.fecha || '').slice(0, 10) || '—'}
                    </td>
                    <td>
                      <WjgBadge variant={eg.categoria === 'DEVOLUCION_CLIENTE' ? 'warning' : 'danger'}>
                        {CATEGORIA_LABELS[eg.categoria] || eg.categoria}
                      </WjgBadge>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{eg.concepto}</div>
                      {eg.notas && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{eg.notas}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.84rem' }}>{eg.proveedor_o_beneficiario || '—'}</td>
                    <td>
                      <WjgBadge variant="neutral">{eg.metodo_pago || 'Efectivo'}</WjgBadge>
                    </td>
                    <td
                      className="tabular-nums"
                      style={{ textAlign: 'right', fontWeight: 800, color: '#fb7185' }}
                    >
                      -{formatCOP(Number(eg.monto) || 0)}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <WjgButton
                          size="sm"
                          variant="secondary"
                          aria-label="Editar egreso"
                          onClick={() => openEditModal(eg)}
                          leftIcon={<Edit3 size={13} />}
                        >
                          Editar
                        </WjgButton>
                        <WjgButton
                          size="sm"
                          variant="danger"
                          aria-label="Eliminar egreso"
                          onClick={() => setDeleteTarget(eg)}
                          leftIcon={<Trash2 size={13} />}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WjgCard>

      <WjgModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Egreso del Taller' : 'Registrar Nuevo Gasto / Egreso'}
        subtitle="Cada salida registrada ajusta automáticamente el Flujo de Caja Neto por medio de pago"
        maxWidth="540px"
        footer={
          <>
            <WjgButton variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </WjgButton>
            <WjgButton variant="save" size="sm" loading={saving} onClick={handleSave}>
              {editingId ? 'Actualizar Egreso' : 'Guardar Egreso'}
            </WjgButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <WjgTextInput label="Fecha" type="date" value={fecha} onChange={setFecha} />
            <div>
              <label className="form-label">Categoría del gasto</label>
              <WjgSelect
                value={categoria}
                onChange={val => setCategoria(val as CategoriaEgresoTaller)}
                options={CATEGORIA_OPTIONS}
              />
            </div>
          </div>

          <WjgTextInput
            label="Concepto del gasto *"
            value={concepto}
            onChange={setConcepto}
            placeholder="Ej: Compra 2L Resina ABS-Like Gris, Recibo Energía Mes, Envío Interrapidísimo..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <WjgNumberInput
              label="Monto pagado ($) *"
              value={monto}
              onChange={setMonto}
              min={1}
              unit="COP"
            />
            <div>
              <label className="form-label">Sale de caja / medio</label>
              <WjgSelect value={metodoPago} onChange={setMetodoPago} options={METODO_OPTIONS} />
            </div>
          </div>

          <WjgTextInput
            label="Proveedor o beneficiario"
            value={proveedor}
            onChange={setProveedor}
            placeholder="Ej: 3DMarket Colombia, Enel, MercadoLibre, Cliente..."
          />

          <WjgTextArea
            label="Notas / Comprobante"
            value={notas}
            onChange={setNotas}
            rows={2}
            placeholder="Número de factura, guía o comentario..."
          />
        </div>
      </WjgModal>

      <WjgConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        variant="danger"
        title="Eliminar Egreso"
        confirmText="Eliminar Egreso"
        message={
          deleteTarget
            ? `¿Seguro deseas eliminar el egreso "${deleteTarget.concepto}" por ${formatCOP(Number(deleteTarget.monto) || 0)}?`
            : ''
        }
      />
    </div>
  );
};
