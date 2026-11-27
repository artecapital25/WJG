import {
  UMBRAL_STOCK_BAJO_RESINA_G,
  UMBRAL_STOCK_BAJO_FILAMENTO_G,
  UMBRAL_STOCK_BAJO_INSUMO_DEFAULT,
} from '../../services/inventoryReplenishmentService';
import type { WjgBadgeVariant } from './primitives/WjgBadge';

export type WjgAlertTone =
  | 'danger'
  | 'warning'
  | 'success'
  | 'success-soft'
  | 'info'
  | 'purple'
  | 'neutral'
  | 'muted';

export interface WjgAlertTokens {
  tone: WjgAlertTone;
  label: string;
  accentColor: string;
  textColor: string;
  surfaceBg: string;
  borderColor: string;
  glowShadow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  opacity?: number;
}

export interface AlertThresholdsConfig {
  resinaBajoG: number;
  filamentoBajoG: number;
  insumoBajoDefault: number;
  productoBajoDefault: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholdsConfig = {
  resinaBajoG: UMBRAL_STOCK_BAJO_RESINA_G,
  filamentoBajoG: UMBRAL_STOCK_BAJO_FILAMENTO_G,
  insumoBajoDefault: UMBRAL_STOCK_BAJO_INSUMO_DEFAULT,
  productoBajoDefault: 2,
};

export interface ProgressScaleStyle {
  percent: number;
  color: string;
  gradient: string;
  glow: string;
  tone: WjgAlertTone;
  textColor: string;
}

export interface ResolvedAlertState {
  tone: WjgAlertTone;
  label: string;
  shortLabel?: string;
  percent?: number;
  tokens: WjgAlertTokens;
  badgeVariant: WjgBadgeVariant;
}

export const ALERT_TONE_TOKENS: Record<WjgAlertTone, WjgAlertTokens> = {
  danger: {
    tone: 'danger',
    label: 'Crítico',
    accentColor: '#ef4444',
    textColor: '#fca5a5',
    surfaceBg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.14) 0%, rgba(15, 22, 36, 0.94) 70%)',
    borderColor: 'rgba(239, 68, 68, 0.36)',
    glowShadow: '0 8px 24px -10px rgba(239, 68, 68, 0.30)',
    badgeBg: 'rgba(239, 68, 68, 0.16)',
    badgeBorder: 'rgba(239, 68, 68, 0.38)',
    badgeText: '#fca5a5',
  },
  warning: {
    tone: 'warning',
    label: 'Atención',
    accentColor: '#f59e0b',
    textColor: '#fcd34d',
    surfaceBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.13) 0%, rgba(15, 22, 36, 0.94) 70%)',
    borderColor: 'rgba(245, 158, 11, 0.36)',
    glowShadow: '0 8px 24px -10px rgba(245, 158, 11, 0.25)',
    badgeBg: 'rgba(245, 158, 11, 0.16)',
    badgeBorder: 'rgba(245, 158, 11, 0.38)',
    badgeText: '#fcd34d',
  },
  success: {
    tone: 'success',
    label: 'Óptimo',
    accentColor: '#10b981',
    textColor: '#34d399',
    surfaceBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.11) 0%, rgba(15, 22, 36, 0.94) 70%)',
    borderColor: 'rgba(16, 185, 129, 0.32)',
    glowShadow: '0 8px 22px -10px rgba(16, 185, 129, 0.20)',
    badgeBg: 'rgba(16, 185, 129, 0.16)',
    badgeBorder: 'rgba(16, 185, 129, 0.35)',
    badgeText: '#34d399',
  },
  'success-soft': {
    tone: 'success-soft',
    label: 'Completado',
    accentColor: '#10b981',
    textColor: '#6ee7b7',
    surfaceBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 19, 31, 0.92) 65%)',
    borderColor: 'rgba(16, 185, 129, 0.22)',
    glowShadow: 'none',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeBorder: 'rgba(16, 185, 129, 0.28)',
    badgeText: '#6ee7b7',
    opacity: 0.86,
  },
  info: {
    tone: 'info',
    label: 'En Curso',
    accentColor: '#38bdf8',
    textColor: '#7dd3fc',
    surfaceBg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.11) 0%, rgba(15, 22, 36, 0.94) 70%)',
    borderColor: 'rgba(56, 189, 248, 0.30)',
    glowShadow: '0 8px 22px -10px rgba(56, 189, 248, 0.18)',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    badgeText: '#7dd3fc',
  },
  purple: {
    tone: 'purple',
    label: 'Proceso Especial',
    accentColor: '#8b5cf6',
    textColor: '#c4b5fd',
    surfaceBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(15, 22, 36, 0.94) 70%)',
    borderColor: 'rgba(139, 92, 246, 0.32)',
    glowShadow: '0 8px 22px -10px rgba(139, 92, 246, 0.18)',
    badgeBg: 'rgba(139, 92, 246, 0.16)',
    badgeBorder: 'rgba(139, 92, 246, 0.35)',
    badgeText: '#c4b5fd',
  },
  neutral: {
    tone: 'neutral',
    label: 'Normal',
    accentColor: 'rgba(148, 163, 184, 0.35)',
    textColor: '#cbd5e1',
    surfaceBg: 'linear-gradient(180deg, rgba(19, 28, 46, 0.92) 0%, rgba(13, 19, 31, 0.96) 100%)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    glowShadow: 'var(--shadow-card)',
    badgeBg: 'rgba(255, 255, 255, 0.06)',
    badgeBorder: 'rgba(255, 255, 255, 0.12)',
    badgeText: '#cbd5e1',
  },
  muted: {
    tone: 'muted',
    label: 'Cancelado',
    accentColor: '#64748b',
    textColor: '#94a3b8',
    surfaceBg: 'rgba(15, 23, 42, 0.62)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    glowShadow: 'none',
    badgeBg: 'rgba(148, 163, 184, 0.12)',
    badgeBorder: 'rgba(148, 163, 184, 0.25)',
    badgeText: '#94a3b8',
    opacity: 0.68,
  },
};

const TONE_TO_BADGE_VARIANT: Record<WjgAlertTone, WjgBadgeVariant> = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
  'success-soft': 'success',
  info: 'cyan',
  purple: 'purple',
  neutral: 'neutral',
  muted: 'neutral',
};

export function getAlertSurfaceClassName(tone: WjgAlertTone, extraClass?: string): string {
  const base = `wjg-alert-surface wjg-alert-tone-${tone}`;
  return extraClass ? `${extraClass} ${base}`.trim() : base;
}

function buildResolvedState(
  tone: WjgAlertTone,
  label: string,
  options?: { shortLabel?: string; percent?: number }
): ResolvedAlertState {
  return {
    tone,
    label,
    shortLabel: options?.shortLabel,
    percent: options?.percent,
    tokens: ALERT_TONE_TOKENS[tone],
    badgeVariant: TONE_TO_BADGE_VARIANT[tone],
  };
}

function toHexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

function interpolateHex(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = c1[0] + (c2[0] - c1[0]) * clamped;
  const g = c1[1] + (c2[1] - c1[1]) * clamped;
  const b = c1[2] + (c2[2] - c1[2]) * clamped;
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

const RGB_DANGER: [number, number, number] = [239, 68, 68]; // #ef4444
const RGB_WARNING: [number, number, number] = [245, 158, 11]; // #f59e0b
const RGB_SUCCESS: [number, number, number] = [16, 185, 129]; // #10b981

/**
 * Escala continua 0% -> 100% (Rojo -> Ámbar -> Verde) para barras de progreso y sombreados graduales.
 */
export function resolveProgressScale(rawPercent: number): ProgressScaleStyle {
  const safeNum = Number.isFinite(rawPercent) ? rawPercent : 0;
  const percent = Math.max(0, Math.min(100, Math.round(safeNum)));

  let color: string;
  let startColor: string;
  if (percent <= 50) {
    const t = percent / 50;
    color = interpolateHex(RGB_DANGER, RGB_WARNING, t);
    startColor = '#ef4444';
  } else {
    const t = (percent - 50) / 50;
    color = interpolateHex(RGB_WARNING, RGB_SUCCESS, t);
    startColor = interpolateHex(RGB_DANGER, RGB_WARNING, 0.55 + t * 0.45);
  }

  const tone: WjgAlertTone = percent <= 20 ? 'danger' : percent < 90 ? 'warning' : 'success';
  const textColor = percent <= 20 ? '#fca5a5' : percent < 90 ? '#fcd34d' : '#34d399';

  return {
    percent,
    color,
    gradient: `linear-gradient(90deg, ${startColor} 0%, ${color} 100%)`,
    glow: `0 0 10px ${color}55`,
    tone,
    textColor,
  };
}

/**
 * Resuelve el estado visual para ítems de inventario y bodega (Resinas, Filamentos, Insumos, Stock).
 */
export function resolveStockAlert(params: {
  actual: number;
  minimo?: number;
  capacidadMaxima?: number;
  tipo?: 'resina' | 'filamento' | 'insumo' | 'producto';
  cancelado?: boolean;
  thresholds?: Partial<AlertThresholdsConfig>;
}): ResolvedAlertState {
  if (params.cancelado) {
    return buildResolvedState('muted', 'Inactivo', { shortLabel: 'Inactivo', percent: 0 });
  }

  const cfg: AlertThresholdsConfig = {
    ...DEFAULT_ALERT_THRESHOLDS,
    ...params.thresholds,
  };

  const tipo = params.tipo || 'insumo';
  const defaultMin =
    tipo === 'resina'
      ? cfg.resinaBajoG
      : tipo === 'filamento'
        ? cfg.filamentoBajoG
        : tipo === 'producto'
          ? cfg.productoBajoDefault
          : cfg.insumoBajoDefault;

  const actual = Math.max(0, Number(params.actual) || 0);
  const minimo = params.minimo !== undefined ? Math.max(0, Number(params.minimo) || 0) : defaultMin;
  const capacidadDefault =
    tipo === 'resina' || tipo === 'filamento' ? 1000 : Math.max(minimo * 3, actual, 4);
  const capacidadMaxima = Math.max(
    1,
    params.capacidadMaxima !== undefined ? Number(params.capacidadMaxima) || capacidadDefault : capacidadDefault
  );

  if (actual <= 0) {
    return buildResolvedState('danger', 'Agotado', { shortLabel: 'Agotado', percent: 0 });
  }

  if (actual <= minimo) {
    const percent = Math.max(5, Math.min(100, Math.round((actual / capacidadMaxima) * 100)));
    return buildResolvedState('warning', 'Agotándose', { shortLabel: 'Bajo', percent });
  }

  const percent = Math.min(100, Math.round((actual / capacidadMaxima) * 100));
  return buildResolvedState('success', 'Disponible', { shortLabel: 'Óptimo', percent });
}

/**
 * Resuelve el estado visual para pagos en Cotizaciones, POS, OTs y Cuentas de Cobro.
 */
export function resolvePaymentAlert(params: {
  total: number;
  abono: number;
  saldoPendiente?: number;
  estadoPago?: string;
  vencido?: boolean;
  porVencer?: boolean;
  cancelado?: boolean;
}): ResolvedAlertState {
  if (params.cancelado) {
    return buildResolvedState('muted', 'Cancelado', { shortLabel: 'Cancelado' });
  }

  const totalVal = Math.max(0, Number(params.total) || 0);
  const abonoVal = Math.max(0, Number(params.abono) || 0);
  const saldoVal =
    params.saldoPendiente !== undefined
      ? Math.max(0, Number(params.saldoPendiente) || 0)
      : Math.max(0, totalVal - abonoVal);

  const percent =
    totalVal > 0
      ? Math.min(100, Math.max(0, Math.round((abonoVal / totalVal) * 100)))
      : saldoVal <= 0
        ? 100
        : 0;

  if (saldoVal <= 0 || params.estadoPago === 'Pagado Total') {
    return buildResolvedState('success', 'Pagado 100%', { shortLabel: 'Pagado', percent: 100 });
  }

  if (params.vencido) {
    return buildResolvedState(
      'danger',
      abonoVal > 0 ? 'Vencido (Parcial)' : 'Vencido ($0)',
      { shortLabel: 'Vencido', percent }
    );
  }

  if (abonoVal <= 0) {
    return buildResolvedState('danger', 'Sin Pago ($0)', { shortLabel: 'Sin Pago', percent: 0 });
  }

  return buildResolvedState(
    'warning',
    params.porVencer ? 'Abono Parcial (Por Vencer)' : 'Abono Parcial',
    { shortLabel: 'Parcial', percent }
  );
}

/**
 * Resuelve el estado visual para Tareas del Equipo e ítems del Plan / Backlog.
 */
export function resolveTaskAlert(params: {
  completada?: boolean;
  prioridad?: string;
  fechaLimite?: string;
  porcentaje?: number;
  cancelada?: boolean;
  hoyStr?: string;
}): ResolvedAlertState {
  if (params.cancelada) {
    return buildResolvedState('muted', 'Cancelada', { shortLabel: 'Cancelada' });
  }

  if (params.completada) {
    return buildResolvedState('success-soft', 'Completada', { shortLabel: 'Completada', percent: 100 });
  }

  const hoy = params.hoyStr || new Date().toISOString().slice(0, 10);
  const fechaLim = params.fechaLimite ? params.fechaLimite.slice(0, 10) : '';
  const vencida = Boolean(fechaLim && fechaLim < hoy);
  const venceHoy = Boolean(fechaLim && fechaLim === hoy);
  const porcentaje = Math.max(0, Math.min(100, Number(params.porcentaje) || 0));

  if (vencida || params.prioridad === 'urgente') {
    return buildResolvedState('danger', vencida ? 'Vencida' : 'Urgente', {
      shortLabel: vencida ? 'Vencida' : 'Urgente',
      percent: porcentaje,
    });
  }

  if (params.prioridad === 'alta' || venceHoy) {
    return buildResolvedState('warning', venceHoy ? 'Vence Hoy' : 'Prioridad Alta', {
      shortLabel: venceHoy ? 'Hoy' : 'Alta',
      percent: porcentaje,
    });
  }

  if (porcentaje > 0 && porcentaje < 100) {
    return buildResolvedState('info', 'En Progreso', { shortLabel: 'En Curso', percent: porcentaje });
  }

  return buildResolvedState('warning', 'Pendiente', { shortLabel: 'Pendiente', percent: porcentaje });
}

const SUPPLY_PROGRESS_MAP: Record<string, number> = {
  pendiente: 15,
  en_gestion: 35,
  orden_enviada: 55,
  comprado: 70,
  en_camino: 85,
  recibido: 100,
  cancelado: 0,
};

/**
 * Resuelve el estado visual para Solicitudes S.O.S de Insumos.
 */
export function resolveSupplyRequestAlert(params: {
  estado: string;
  urgencia?: string;
}): ResolvedAlertState {
  const percent = SUPPLY_PROGRESS_MAP[params.estado] ?? 15;

  if (params.estado === 'cancelado') {
    return buildResolvedState('muted', 'Cancelado', { shortLabel: 'Cancelado', percent: 0 });
  }

  if (params.estado === 'recibido') {
    return buildResolvedState('success-soft', 'Recibido en Bodega', { shortLabel: 'Recibido', percent: 100 });
  }

  if (params.urgencia === 'taller_detenido') {
    return buildResolvedState('danger', 'Taller Detenido', { shortLabel: 'Detenido', percent });
  }

  if (params.estado === 'pendiente' || params.urgencia === 'urgente') {
    return buildResolvedState(
      'warning',
      params.urgencia === 'urgente' ? 'Compra Urgente' : 'Pendiente',
      { shortLabel: 'Pendiente', percent }
    );
  }

  if (params.estado === 'en_gestion') {
    return buildResolvedState('purple', 'En Gestión', { shortLabel: 'Gestión', percent });
  }

  return buildResolvedState('info', 'En Tránsito / Comprado', { shortLabel: 'En Curso', percent });
}

const OT_STAGE_PROGRESS_MAP: Record<string, number> = {
  'En Cola': 15,
  Imprimiendo: 40,
  Curado: 60,
  'Post-Proceso': 78,
  'Control de Calidad': 90,
  'Listo para Entrega': 100,
  Entregado: 100,
  Cancelado: 0,
};

/**
 * Resuelve el estado visual combinado (etapa de producción + estado financiero) para Órdenes de Trabajo.
 */
export function resolveWorkOrderAlert(params: {
  estado: string;
  estadoPago?: string;
  total?: number;
  abono?: number;
  saldoPendiente?: number;
}): ResolvedAlertState {
  const estado = params.estado || 'En Cola';
  const percent = OT_STAGE_PROGRESS_MAP[estado] ?? 20;

  if (/cancel/i.test(estado)) {
    return buildResolvedState('muted', 'Cancelado', { shortLabel: 'Cancelado', percent: 0 });
  }

  const payment = resolvePaymentAlert({
    total: params.total ?? 0,
    abono: params.abono ?? 0,
    saldoPendiente: params.saldoPendiente,
    estadoPago: params.estadoPago,
  });

  if (estado === 'Entregado' && payment.tone === 'success') {
    return buildResolvedState('success-soft', 'Entregado y Pagado', { shortLabel: 'Entregado', percent: 100 });
  }

  if (estado === 'Listo para Entrega') {
    if (payment.tone === 'success') {
      return buildResolvedState('success', 'Listo para Entrega', { shortLabel: 'Listo', percent: 100 });
    }
    return buildResolvedState('warning', 'Listo • Falta Cobro', { shortLabel: 'Por Cobrar', percent: 100 });
  }

  if (payment.tone === 'danger' && (params.total ?? 0) > 0) {
    return buildResolvedState('danger', `${estado} • Sin Pago`, { shortLabel: 'Sin Pago', percent });
  }

  if (payment.tone === 'warning') {
    return buildResolvedState('warning', `${estado} • Abono Parcial`, { shortLabel: 'Parcial', percent });
  }

  if (estado === 'Curado' || estado === 'Post-Proceso') {
    return buildResolvedState('purple', estado, { shortLabel: estado, percent });
  }

  return buildResolvedState('info', estado, { shortLabel: estado, percent });
}

/**
 * Resuelve el estado visual para eventos del Calendario Operativo.
 */
export function resolveCalendarEventAlert(params: {
  tipo_evento: string;
  estado?: string;
  fecha_inicio: string;
  hoyStr?: string;
}): ResolvedAlertState {
  if (params.estado === 'cancelado') {
    return buildResolvedState('muted', 'Cancelado', { shortLabel: 'Cancelado' });
  }

  if (params.estado === 'completado') {
    return buildResolvedState('success-soft', 'Completado', { shortLabel: 'Completado', percent: 100 });
  }

  const hoy = params.hoyStr || new Date().toISOString().slice(0, 10);
  const fecha = (params.fecha_inicio || '').slice(0, 10);
  const vencido = Boolean(fecha && fecha < hoy);
  const esHoy = Boolean(fecha && fecha === hoy);

  if (params.tipo_evento === 'vencimiento_cobro' || vencido) {
    return buildResolvedState('danger', vencido ? 'Vencido' : 'Cobro Pendiente', {
      shortLabel: vencido ? 'Vencido' : 'Cobro',
    });
  }

  if (esHoy || params.tipo_evento === 'tarea_individual') {
    return buildResolvedState('warning', esHoy ? 'Para Hoy' : 'Tarea Personal', {
      shortLabel: esHoy ? 'Hoy' : 'Pendiente',
    });
  }

  if (params.tipo_evento === 'tarea_grupal') {
    return buildResolvedState('purple', 'Tarea Grupal', { shortLabel: 'Grupal' });
  }

  if (params.tipo_evento === 'rutina_diaria') {
    return buildResolvedState('success', 'Rutina Periódica', { shortLabel: 'Rutina' });
  }

  return buildResolvedState('info', 'Programado', { shortLabel: 'En Curso' });
}
