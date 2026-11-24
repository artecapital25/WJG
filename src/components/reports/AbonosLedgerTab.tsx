import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import type { PaymentRecord } from '../../types';
import { CloudSyncService } from '../../services/cloudSyncService';
import { detectarDuplicadosAbonos } from '../../services/inventoryDeductionHelper';
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

interface AbonosLedgerTabProps {
  abonos: PaymentRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const METODO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los medios de pago' },
  { value: 'Bre-B', label: 'Bre-B (Llave Única)' },
  { value: 'Nequi', label: 'Nequi' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Transferencia', label: 'Transferencia / Otro' },
];

const METODO_EDIT_OPTIONS = METODO_OPTIONS.filter(o => o.value !== 'TODOS');

const TIPO_MOVIMIENTO_OPTIONS = [
  { value: 'INGRESO', label: 'Ingreso normal (Recaudo)' },
  { value: 'RETENIDO_CANCELACION', label: 'Retenido por cancelación de OT' },
  { value: 'AJUSTE', label: 'Ajuste contable manual' },
];

const ORIGEN_BADGE_MAP: Record<string, { label: string; variant: 'info' | 'cyan' | 'purple' | 'success' }> = {
  pos: { label: 'POS Express', variant: 'cyan' },
  cotizacion: { label: 'Cotización', variant: 'info' },
  taller: { label: 'Orden Trabajo', variant: 'purple' },
  cuenta_cobro: { label: 'Cuenta Cobro', variant: 'success' },
};

export const AbonosLedgerTab: React.FC<AbonosLedgerTabProps> = ({
  abonos,
  loading,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS');
  const [soloDuplicados, setSoloDuplicados] = useState(false);

  const [editingAbono, setEditingAbono] = useState<PaymentRecord | null>(null);
  const [editMonto, setEditMonto] = useState(0);
  const [editMetodo, setEditMetodo] = useState('Bre-B');
  const [editCliente, setEditCliente] = useState('');
  const [editReferencia, setEditReferencia] = useState('');
  const [editTipoMov, setEditTipoMov] = useState<'INGRESO' | 'RETENIDO_CANCELACION' | 'AJUSTE'>('INGRESO');
  const [editNota, setEditNota] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);

  const { duplicateIds, groups: duplicateGroups } = useMemo(
    () => detectarDuplicadosAbonos(abonos),
    [abonos]
  );

  const filteredAbonos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return abonos.filter(ab => {
      if (soloDuplicados && !duplicateIds.has(ab.id)) return false;
      if (filtroMetodo !== 'TODOS') {
        const m = (ab.metodo_pago || '').toLowerCase();
        if (!m.includes(filtroMetodo.toLowerCase())) return false;
      }
      if (!q) return true;
      return (
        (ab.cliente_nombre || '').toLowerCase().includes(q) ||
        (ab.referencia_pago || '').toLowerCase().includes(q) ||
        (ab.nota || '').toLowerCase().includes(q) ||
        (ab.registrado_por || '').toLowerCase().includes(q) ||
        (ab.metodo_pago || '').toLowerCase().includes(q)
      );
    });
  }, [abonos, search, filtroMetodo, soloDuplicados, duplicateIds]);

  const totalMostrado = useMemo(
    () => filteredAbonos.reduce((acc, a) => acc + (Number(a.monto) || 0), 0),
    [filteredAbonos]
  );

  const openEdit = (ab: PaymentRecord) => {
    setEditingAbono(ab);
    setEditMonto(Number(ab.monto) || 0);
    setEditMetodo(ab.metodo_pago || 'Bre-B');
    setEditCliente(ab.cliente_nombre || '');
    setEditReferencia(ab.referencia_pago || '');
    setEditTipoMov(ab.tipo_movimiento || 'INGRESO');
    setEditNota(ab.nota || '');
  };

  const handleSaveEdit = async () => {
    if (!editingAbono) return;
    if (editMonto <= 0) {
      toast.warning('El monto del abono debe ser mayor a $0.');
      return;
    }
    setSavingEdit(true);
    try {
      const ok = await CloudSyncService.updateAbono(editingAbono.id, {
        monto: editMonto,
        metodo_pago: editMetodo,
        cliente_nombre: editCliente.trim() || undefined,
        referencia_pago: editReferencia.trim() || undefined,
        tipo_movimiento: editTipoMov,
        nota: editNota.trim() || undefined,
      });
      if (ok) {
        toast.success('Recaudo actualizado en el libro contable.');
        setEditingAbono(null);
        await onRefresh();
      } else {
        toast.error('No se pudo actualizar el recaudo en Supabase.');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await CloudSyncService.deleteAbono(deleteTarget.id);
      if (ok) {
        toast.success('Registro de abono eliminado del libro contable.');
        await onRefresh();
      } else {
        toast.error('No se pudo eliminar el registro en Supabase.');
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {duplicateGroups.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px' }}>
            <ShieldAlert size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: '#fde68a', fontSize: '0.9rem' }}>
                Auditoría de Duplicados: {duplicateGroups.length} coincidencia(s) detectada(s)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#fcd34d' }}>
                {duplicateGroups
                  .map(g => `${g.referencia} (${formatCOP(g.monto)} × ${g.count})`)
                  .join(' · ')}
                . Revisa si corresponden a abonos distintos o registros repetidos antes de depurar.
              </div>
            </div>
          </div>
          <WjgButton
            size="sm"
            variant={soloDuplicados ? 'warning' : 'secondary'}
            onClick={() => setSoloDuplicados(prev => !prev)}
          >
            {soloDuplicados ? 'Ver todos los recaudos' : 'Filtrar posibles duplicados'}
          </WjgButton>
        </div>
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
                placeholder="Buscar por cliente, POS/OT, operador o nota..."
                compact
              />
            </div>
            <div style={{ minWidth: '210px', flex: '0 1 240px' }}>
              <WjgSelect
                value={filtroMetodo}
                onChange={setFiltroMetodo}
                options={METODO_OPTIONS}
                compact
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <WjgBadge variant="success">
              {filteredAbonos.length} mov. · {formatCOP(totalMostrado)}
            </WjgBadge>
            <WjgButton
              size="sm"
              variant="secondary"
              leftIcon={<RefreshCw size={14} />}
              loading={loading}
              onClick={onRefresh}
            >
              Actualizar
            </WjgButton>
          </div>
        </div>

        {filteredAbonos.length === 0 ? (
          <WjgEmptyState
            icon={<CheckCircle2 size={32} />}
            title="Sin movimientos de recaudo"
            description="No hay abonos que coincidan con los filtros actuales en el libro contable."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Origen / Referencia</th>
                  <th>Cliente</th>
                  <th>Medio</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th>Registrado por</th>
                  <th>Tipo / Nota</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbonos.map(ab => {
                  const isDup = duplicateIds.has(ab.id);
                  const origenCfg = ORIGEN_BADGE_MAP[ab.origen_modulo] || {
                    label: ab.origen_modulo || 'General',
                    variant: 'neutral' as const,
                  };
                  const fechaTxt = ab.fecha_pago || ab.created_at;
                  const fechaFmt = fechaTxt
                    ? new Date(fechaTxt).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '—';

                  return (
                    <tr
                      key={ab.id}
                      style={
                        isDup
                          ? { background: 'rgba(245, 158, 11, 0.08)' }
                          : undefined
                      }
                    >
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {fechaFmt}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <WjgBadge variant={origenCfg.variant}>{origenCfg.label}</WjgBadge>
                          <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                            {ab.referencia_pago || '—'}
                          </span>
                          {isDup && (
                            <WjgBadge variant="warning" icon={<AlertTriangle size={11} />}>
                              Posible duplicado
                            </WjgBadge>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{ab.cliente_nombre || 'Cliente / Mostrador'}</td>
                      <td>
                        <WjgBadge variant="neutral">{ab.metodo_pago || 'Efectivo'}</WjgBadge>
                      </td>
                      <td
                        className="tabular-nums"
                        style={{ textAlign: 'right', fontWeight: 800, color: '#34d399' }}
                      >
                        {formatCOP(Number(ab.monto) || 0)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ab.registrado_por || 'Taller'}
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {ab.tipo_movimiento === 'RETENIDO_CANCELACION' && (
                          <div style={{ marginBottom: '2px' }}>
                            <WjgBadge variant="warning">Retenido cancelación</WjgBadge>
                          </div>
                        )}
                        {ab.tipo_movimiento === 'AJUSTE' && (
                          <div style={{ marginBottom: '2px' }}>
                            <WjgBadge variant="purple">Ajuste manual</WjgBadge>
                          </div>
                        )}
                        <span style={{ display: 'block', wordBreak: 'break-word' }}>
                          {ab.nota || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <WjgButton
                            size="sm"
                            variant="secondary"
                            aria-label="Editar abono"
                            onClick={() => openEdit(ab)}
                            leftIcon={<Edit3 size={13} />}
                          >
                            Editar
                          </WjgButton>
                          <WjgButton
                            size="sm"
                            variant="danger"
                            aria-label="Eliminar abono"
                            onClick={() => setDeleteTarget(ab)}
                            leftIcon={<Trash2 size={13} />}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </WjgCard>

      <WjgModal
        isOpen={!!editingAbono}
        onClose={() => setEditingAbono(null)}
        title="Editar Registro en Libro de Recaudos"
        subtitle="Corrige método, cliente, monto o clasificación contable directamente en Supabase"
        maxWidth="520px"
        footer={
          <>
            <WjgButton variant="secondary" size="sm" onClick={() => setEditingAbono(null)} disabled={savingEdit}>
              Cancelar
            </WjgButton>
            <WjgButton variant="save" size="sm" loading={savingEdit} onClick={handleSaveEdit}>
              Guardar Cambios
            </WjgButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <WjgNumberInput
              label="Monto recaudado ($)"
              value={editMonto}
              onChange={setEditMonto}
              min={1}
              unit="COP"
            />
            <div>
              <label className="form-label">Medio de pago</label>
              <WjgSelect
                value={editMetodo}
                onChange={setEditMetodo}
                options={METODO_EDIT_OPTIONS}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <WjgTextInput
              label="Cliente"
              value={editCliente}
              onChange={setEditCliente}
              placeholder="Nombre del cliente"
            />
            <WjgTextInput
              label="Referencia (POS / OT / COT)"
              value={editReferencia}
              onChange={setEditReferencia}
              placeholder="Ej: POS-010, OT-0042"
            />
          </div>

          <div>
            <label className="form-label">Clasificación del movimiento</label>
            <WjgSelect
              value={editTipoMov}
              onChange={val => setEditTipoMov(val as 'INGRESO' | 'RETENIDO_CANCELACION' | 'AJUSTE')}
              options={TIPO_MOVIMIENTO_OPTIONS}
            />
          </div>

          <WjgTextArea
            label="Nota contable / Observación"
            value={editNota}
            onChange={setEditNota}
            rows={3}
            placeholder="Motivo de edición o detalle del abono..."
          />
        </div>
      </WjgModal>

      <WjgConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        variant="danger"
        title="Eliminar Abono del Libro Contable"
        confirmText="Eliminar Registro"
        message={
          deleteTarget
            ? `¿Seguro deseas eliminar este abono por ${formatCOP(Number(deleteTarget.monto) || 0)} (${deleteTarget.referencia_pago || deleteTarget.cliente_nombre || 'Sin referencia'})?\nEsta acción actualiza inmediatamente el recaudo en Supabase.`
            : ''
        }
      />
    </div>
  );
};
