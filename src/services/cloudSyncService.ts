import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  RESINAS_INICIALES, 
  INSUMOS_INICIALES, 
  MAQUINAS_INICIALES, 
  PERSONAL_INICIAL, 
  CLIENTES_INICIALES,
  CONFIGURACION_INICIAL
} from '../data/initialData';
import { 
  Resina, 
  Filamento,
  RegistroProduccionInterna,
  Insumo, 
  Maquina,
  RepuestoMaquina, 
  Personal, 
  Cliente,
  Proveedor, 
  ConfiguracionTaller, 
  Cotizacion, 
  OrdenTrabajo, 
  CuentaCobro,
  PiezaCotizada,
  VentaExpress,
  TarifaTamano,
  TareaEquipo,
  SolicitudInsumo,
  ProductoStock,
  PaymentRecord,
  EstadoOT,
  EstadoCotizacion,
  ItemBacklogEmpresa,
  ConsumoRealProduccion,
  PromedioConsumoReal,
  ModoMargen,
  EgresoTaller,
  CategoriaEgresoTaller
} from '../types';
import {
  normalizarNitCc,
  normalizarCorreo,
  buscarCoincidenciasCliente,
  enriquecerClienteExistente
} from '../utils/customerClassification';

// Interfaz canónica para el Balance Financiero Consolidado
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureValidUuid(id?: string): string {
  if (id && UUID_REGEX.test(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface BalanceTaller {
  total_ingresos_recaudados: number;
  recaudado_nequi: number;
  recaudado_bre_b: number;
  recaudado_efectivo: number;
  total_por_cobrar: number;
  total_egresos?: number;
  egresos_nequi?: number;
  egresos_bre_b?: number;
  egresos_efectivo?: number;
  flujo_caja_neto?: number;
}

// Cache en memoria para prevención de doble clic y cobros duplicados en ventana de 60 segundos
const recentPaymentsCache = new Map<string, number>();

export interface OutboxSyncTask {
  id: string;
  type: 'cotizacion' | 'venta_express' | 'orden' | 'cuenta';
  payload: any;
  created_at: number;
  retries: number;
}

const OUTBOX_STORAGE_KEY = 'wjg_sync_outbox';
const CLIENT_INSTANCE_ID = `wjg-${Math.random().toString(36).slice(2, 8)}`;
let activeRealtimeChannel: any = null;

export const CloudSyncService = {
  isAvailable: () => isSupabaseConfigured && supabase !== null,

  broadcastChange(entity: string, action: string = 'upsert'): void {
    try {
      if (!activeRealtimeChannel) return;
      activeRealtimeChannel.send({
        type: 'broadcast',
        event: 'wjg_entity_changed',
        payload: {
          entity,
          action,
          senderId: CLIENT_INSTANCE_ID,
          ts: Date.now()
        }
      });
    } catch (_) {}
  },

  // --- GESTIÓN DE COLA OUTBOX Y RESILIENCIA OFFLINE ---
  getOutboxQueue(): OutboxSyncTask[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Error reading outbox queue:', e);
      return [];
    }
  },

  enqueueOutboxTask(task: Omit<OutboxSyncTask, 'id' | 'created_at' | 'retries'>): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const queue = this.getOutboxQueue();
      // Prevenir duplicados de la misma entidad
      const filtered = queue.filter(item => {
        if (item.type !== task.type) return true;
        if (task.type === 'cotizacion') return item.payload?.numero_cot !== task.payload?.numero_cot;
        if (task.type === 'venta_express') return item.payload?.id !== task.payload?.id;
        if (task.type === 'orden') return item.payload?.numero_ot !== task.payload?.numero_ot;
        if (task.type === 'cuenta') return item.payload?.id !== task.payload?.id;
        return true;
      });

      const newTask: OutboxSyncTask = {
        ...task,
        id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        created_at: Date.now(),
        retries: 0
      };

      filtered.push(newTask);
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Error enqueuing outbox task:', e);
    }
  },

  dequeueOutboxTask(id: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const queue = this.getOutboxQueue();
      const updated = queue.filter(item => item.id !== id);
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error dequeuing outbox task:', e);
    }
  },

  async flushOutboxQueue(): Promise<{ synced: number; remaining: number }> {
    if (!this.isAvailable()) return { synced: 0, remaining: this.getOutboxQueue().length };
    const queue = this.getOutboxQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    let synced = 0;
    for (const task of queue) {
      try {
        let success = false;
        if (task.type === 'cotizacion') {
          success = await this.saveCotizacion(task.payload, true);
        } else if (task.type === 'venta_express') {
          const res = await this.saveVentaExpress(task.payload, true);
          success = Boolean(res.success);
        } else if (task.type === 'orden') {
          success = await this.saveOrdenTrabajo(task.payload, true);
        } else if (task.type === 'cuenta') {
          success = await this.saveCuentaCobro(task.payload, true);
        }

        if (success) {
          this.dequeueOutboxTask(task.id);
          synced++;
        }
      } catch (e) {
        console.warn(`Error flushing outbox task ${task.id}:`, e);
      }
    }

    if (synced > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wjg:outbox-flushed', { detail: { synced } }));
    }

    return { synced, remaining: this.getOutboxQueue().length };
  },

  initReconnectionListener(onSyncedCallback?: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = async () => {
      console.log('🌐 Conexión detectada. Vaciando cola outbox hacia Supabase...');
      const conn = await this.checkConnection();
      if (conn.ok) {
        const result = await this.flushOutboxQueue();
        if (result.synced > 0) {
          if (onSyncedCallback) onSyncedCallback();
          window.dispatchEvent(new CustomEvent('wjg:cloud-sync-online', { detail: result }));
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  },

  // 1. Probar conexión en vivo
  async checkConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { ok: false, message: 'Faltan las credenciales VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno' };
    }
    try {
      const { error } = await supabase!.from('configuracion_taller').select('id').limit(1);
      if (error) throw error;
      return { ok: true, message: 'Conexión activa con la base de datos Supabase en la nube.' };
    } catch (e: any) {
      return { ok: false, message: `Error de conexión: ${e.message || e}` };
    }
  },

  // 2. Traer Cotizaciones desde la Nube (con clientes e ítems anidados)
  async fetchCotizaciones(): Promise<Cotizacion[] | null> {
    if (!this.isAvailable()) return null;
    try {
      // 1. Intento primario con relación explícita única canónica
      let { data, error } = await supabase!
        .from('cotizaciones')
        .select('*, cliente:clientes!fk_cotizaciones_cliente_unica(*), items:cotizacion_items(*)')
        .order('numero_cot', { ascending: false });

      // Fallback 1: Si la relación por nombre fk aún no recargó en cache, usar relación por columna cliente_id
      if (error && (error.code === 'PGRST200' || error.message?.includes('relationship') || error.message?.includes('fk_cotizaciones_cliente_unica'))) {
        const fallbackRel = await supabase!
          .from('cotizaciones')
          .select('*, cliente:clientes!cliente_id(*), items:cotizacion_items(*)')
          .order('numero_cot', { ascending: false });
        data = fallbackRel.data;
        error = fallbackRel.error;
      }

      // Fallback 2: si cotizacion_items no existe como tabla relacional
      if (error && (error.code === 'PGRST200' || error.message?.includes('cotizacion_items'))) {
        const fallback = await supabase!
          .from('cotizaciones')
          .select('*, cliente:clientes!cliente_id(*)')
          .order('numero_cot', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      // Fallback 3 (Desacoplado Ultra-Resiliente): Si PostgREST tiene ambigüedad de relaciones en cache,
      // consultar cotizaciones directamente y ensamblar en memoria con clientes e items
      if (error && (error.code === 'PGRST200' || error.message?.includes('relationship') || error.message?.includes('embed'))) {
        try {
          const { data: rawCot, error: errCot } = await supabase!
            .from('cotizaciones')
            .select('*')
            .order('numero_cot', { ascending: false });

          if (!errCot && rawCot) {
            const { data: rawClientes } = await supabase!.from('clientes').select('*');
            const { data: rawItems } = await supabase!.from('cotizacion_items').select('*');

            const clientMap = new Map((rawClientes || []).map((c: any) => [c.id, c]));
            const itemsMap = new Map<string, any[]>();
            (rawItems || []).forEach((it: any) => {
              const list = itemsMap.get(it.cotizacion_id) || [];
              list.push(it);
              itemsMap.set(it.cotizacion_id, list);
            });

            data = rawCot.map((c: any) => ({
              ...c,
              cliente: clientMap.get(c.cliente_id) || null,
              items: itemsMap.get(c.id) || []
            }));
            error = null;
          }
        } catch (_) {}
      }

      if (error) {
        console.warn('Error fetching cotizaciones from Supabase:', error.message);
        return null;
      }

      if (!data || data.length === 0) return [];

      return data.map((row: any): Cotizacion => {
        const clienteMapeado: Cliente = row.cliente ? {
          id: row.cliente.id,
          codigo: row.cliente.codigo || 1,
          nombre: row.cliente.nombre || 'Cliente General',
          nit_cc: row.cliente.nit_cc || '',
          telefono: row.cliente.telefono || '',
          correo: row.cliente.correo || ''
        } : {
          id: row.cliente_id || `cli-${Date.now()}`,
          codigo: 1,
          nombre: 'Cliente General',
          nit_cc: '',
          telefono: '',
          correo: ''
        };

        const itemsMapeados: PiezaCotizada[] = (row.items || []).map((it: any): PiezaCotizada => ({
          id: it.id,
          nombre_item: it.nombre_item || it.nombre_pieza || 'Pieza 3D',
          cantidad: Number(it.cantidad) || 1,
          alto_mm: Number(it.alto_mm) || 0,
          ancho_mm: Number(it.ancho_mm) || 0,
          profundidad_mm: Number(it.profundidad_mm) || 0,
          volumen_cm3: Number(it.volumen_cm3) || 0,
          peso_estimado_g: Number(it.peso_estimado_g ?? it.peso_gramos) || 0,
          resina_id: it.resina_id || 'res-1',
          resina_nombre: it.resina_nombre || 'Resina Standard',
          maquina_id: it.maquina_id || 'maq-1',
          maquina_nombre: it.maquina_nombre || 'Anycubic MONO 4',
          tiempo_impresion_min: Number(it.tiempo_impresion_min) || Math.round((Number(it.tiempo_horas) || 0) * 60),
          tiempo_desarrollo_min: Number(it.tiempo_desarrollo_min) || 0,
          tiempo_armado_min: Number(it.tiempo_armado_min) || 0,
          tiempo_pintura_min: Number(it.tiempo_pintura_min) || 0,
          costo_energia: Number(it.costo_energia) || 0,
          costo_resina: Number(it.costo_resina) || 0,
          costo_curado: Number(it.costo_curado) || 0,
          costo_insumos: Number(it.costo_insumos) || 0,
          costo_mano_obra: Number(it.costo_mano_obra) || 0,
          costo_modelo_comprado: Number(it.costo_modelo_comprado) || 0,
          costo_base_produccion: Number(it.costo_base_produccion) || 0,
          margen_ganancia: Number(it.margen_ganancia) || 0.4,
          precio_unitario: Number(it.precio_unitario) || 0,
          precio_total: Number(it.precio_total ?? it.subtotal) || 0,
          tiempo_entrega: row.tiempo_entrega_estimado || '(3) Días hábiles',
          descripcion_tecnica: it.descripcion_tecnica || '',
          imagen_url: it.imagen_url || undefined
        }));

        let notasLimpia = row.notas || 'No incluye transporte fuera del perímetro urbano.';
        let itemsRestaurados: PiezaCotizada[] | null = null;
        let metaFinanciera: {
          iva_porcentaje?: number;
          iva_monto?: number;
          descuento_porcentaje?: number;
          descuento_monto?: number;
          ahorro_volumen_total?: number;
          subtotal?: number;
          total?: number;
          estado_ui?: EstadoCotizacion;
          vendedor?: string;
          fecha?: string;
          tiempo_entrega_estimado?: string;
          estado_pago?: any;
          abono?: number;
          saldo_pendiente?: number;
          metodo_pago?: string;
          comprobante_pago?: string;
          modo_margen?: ModoMargen;
          costo_total_taller?: number;
          utilidad_neta_estimada?: number;
        } = {};
        if (row.notas && row.notas.includes('<!-- WJ_ITEMS_SNAPSHOT:')) {
          try {
            const start = row.notas.indexOf('<!-- WJ_ITEMS_SNAPSHOT:') + '<!-- WJ_ITEMS_SNAPSHOT:'.length;
            const end = row.notas.indexOf(':WJ_ITEMS_SNAPSHOT -->');
            if (end > start) {
              const encoded = row.notas.substring(start, end);
              const parsed = JSON.parse(decodeURIComponent(encoded));
              if (Array.isArray(parsed)) {
                itemsRestaurados = parsed;
              } else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.items)) {
                  itemsRestaurados = parsed.items;
                }
                metaFinanciera = {
                  iva_porcentaje: parsed.iva_porcentaje,
                  iva_monto: parsed.iva_monto,
                  descuento_porcentaje: parsed.descuento_porcentaje,
                  descuento_monto: parsed.descuento_monto,
                  ahorro_volumen_total: parsed.ahorro_volumen_total,
                  subtotal: parsed.subtotal,
                  total: parsed.total,
                  estado_ui: parsed.estado_ui,
                  vendedor: parsed.vendedor,
                  fecha: parsed.fecha,
                  tiempo_entrega_estimado: parsed.tiempo_entrega_estimado,
                  estado_pago: parsed.estado_pago,
                  abono: parsed.abono,
                  saldo_pendiente: parsed.saldo_pendiente,
                  metodo_pago: parsed.metodo_pago,
                  comprobante_pago: parsed.comprobante_pago,
                  modo_margen: parsed.modo_margen,
                  costo_total_taller: parsed.costo_total_taller,
                  utilidad_neta_estimada: parsed.utilidad_neta_estimada
                };
              }
              notasLimpia = row.notas.replace(/<!-- WJ_ITEMS_SNAPSHOT:[\s\S]*?:WJ_ITEMS_SNAPSHOT -->/g, '').trim();
            }
          } catch (e) {
            console.warn('Error parseando items_snapshot de notas:', e);
          }
        }

        const normalizarEstadoDbParaUI = (dbEstado?: string): EstadoCotizacion => {
          if (!dbEstado) return 'Borrador';
          const e = dbEstado.toUpperCase().trim();
          if (e === 'FACTURADA' || e.includes('FACTUR')) return 'Facturada';
          if (e === 'APROBADA' || e === 'ACEPTADA' || e.includes('APROB') || e.includes('ACEPT')) return 'Aceptada';
          if (e === 'PARCIAL' || e.includes('PARCIAL')) return 'Parcial';
          if (e === 'ENVIADA' || e.includes('ENVIAD')) return 'Enviada';
          if (e === 'CANCELADA' || e === 'RECHAZADA' || e.includes('RECHAZ')) return 'Rechazada';
          return 'Borrador';
        };

        const totalFinal = metaFinanciera.total !== undefined ? Number(metaFinanciera.total) : (Number(row.total) || 0);
        const abonoFinal = metaFinanciera.abono !== undefined ? Number(metaFinanciera.abono) : (row.abono !== undefined ? Number(row.abono) : 0);
        const saldoFinal = metaFinanciera.saldo_pendiente !== undefined
          ? Number(metaFinanciera.saldo_pendiente)
          : (row.saldo_pendiente !== undefined ? Number(row.saldo_pendiente) : Math.max(0, totalFinal - abonoFinal));
        const estadoPagoFinal = metaFinanciera.estado_pago || row.estado_pago || (abonoFinal > 0 ? (abonoFinal >= totalFinal && totalFinal > 0 ? 'Pagado Total' : 'Abono Parcial') : 'Pendiente');

        return {
          id: row.id,
          numero_cot: row.numero_cot,
          cliente: clienteMapeado,
          vendedor: metaFinanciera.vendedor || row.vendedor_nombre || 'Equipo WJGEEKS',
          fecha: metaFinanciera.fecha || row.fecha_emision || row.fecha || new Date().toISOString().slice(0, 10),
          estado: metaFinanciera.estado_ui || normalizarEstadoDbParaUI(row.estado),
          items: (itemsRestaurados && itemsRestaurados.length > 0) ? itemsRestaurados : itemsMapeados,
          subtotal: metaFinanciera.subtotal !== undefined ? Number(metaFinanciera.subtotal) : (Number(row.subtotal) || 0),
          iva_porcentaje: metaFinanciera.iva_porcentaje !== undefined ? metaFinanciera.iva_porcentaje : (Number(row.iva_porcentaje) || 0),
          iva_monto: metaFinanciera.iva_monto,
          descuento_porcentaje: metaFinanciera.descuento_porcentaje !== undefined ? Number(metaFinanciera.descuento_porcentaje) : (Number(row.descuento_porcentaje) || 0),
          descuento_monto: metaFinanciera.descuento_monto,
          ahorro_volumen_total: metaFinanciera.ahorro_volumen_total,
          total: totalFinal,
          tiempo_entrega_estimado: metaFinanciera.tiempo_entrega_estimado || row.tiempo_entrega_estimado || '(3) Días hábiles',
          notas: notasLimpia,
          // Sincronización Financiera Unificada
          abono: abonoFinal,
          saldo_pendiente: saldoFinal,
          estado_pago: estadoPagoFinal,
          metodo_pago: metaFinanciera.metodo_pago || row.metodo_pago || 'Bre-B',
          comprobante_pago: metaFinanciera.comprobante_pago || row.comprobante_pago || undefined,
          modo_margen: (metaFinanciera as any).modo_margen || row.modo_margen || 'margen_bruto',
          costo_total_taller: (metaFinanciera as any).costo_total_taller ?? (row.costo_total_taller !== undefined ? Number(row.costo_total_taller) : undefined),
          utilidad_neta_estimada: (metaFinanciera as any).utilidad_neta_estimada ?? (row.utilidad_neta_estimada !== undefined ? Number(row.utilidad_neta_estimada) : undefined)
        };
      });
    } catch (e) {
      console.warn('Exception in fetchCotizaciones:', e);
      return null;
    }
  },

  // 3. Traer Clientes desde la Nube (Ordenados Alfabéticamente, Normalizados y Sin Duplicados Fusionados)
  async fetchClientes(): Promise<Cliente[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error fetching clientes:', error);
        return null;
      }

      const DUPLICADOS_FUSIONADOS_IDS = new Set([
        '3de944ee-5ea2-407d-bb8b-dc1770c3817a',
        'a0051b46-0a99-443b-ba2d-e53741f0bea5',
        'c947e6da-cc42-4363-b7c9-da457216565f',
        '0240f537-b629-42a3-9d64-789a3ad7f599',
        '0a445b4b-a065-4c87-8f5d-ae8f7d607c98',
        '2ad30c73-c78e-4148-b9ff-d82b27880e9c'
      ]);

      const rows = data || [];
      const duplicadosPresentes = rows
        .map((r: any) => r.id)
        .filter((id: string) => DUPLICADOS_FUSIONADOS_IDS.has(id));

      if (duplicadosPresentes.length > 0) {
        supabase!
          .from('clientes')
          .delete()
          .in('id', duplicadosPresentes)
          .then(({ error: delErr }) => {
            if (delErr) console.debug('Limpieza diferida de duplicados:', delErr.message);
          });
      }

      return rows
        .filter((row: any) => !DUPLICADOS_FUSIONADOS_IDS.has(row.id))
        .map((row: any): Cliente => ({
          id: row.id,
          codigo: Number(row.codigo) || 1,
          nombre: (row.nombre || 'Cliente General').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(),
          nit_cc: normalizarNitCc(row.nit_cc),
          telefono: (row.telefono || '').replace(/[\u00a0\u202c\s]/g, '').trim(),
          correo: row.correo || ''
        }))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    } catch (e) {
      console.warn('Exception in fetchClientes:', e);
      return null;
    }
  },

  // 4. Traer Órdenes de Trabajo desde la Nube
  async fetchOrdenes(): Promise<OrdenTrabajo[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('ordenes_trabajo')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching ordenes_trabajo:', error);
        return null;
      }

      if (!data || data.length === 0) return [];

      const dbToUiEstadoMap: Record<string, EstadoOT> = {
        'COTIZACION': 'En Cola',
        'EN_COLA_OT': 'En Cola',
        'IMPRESION': 'Imprimiendo',
        'CURADO': 'Curado',
        'PINTADO_ARMADO': 'Pintura y Armado',
        'CONTROL_CALIDAD': 'Control de Calidad',
        'ENTREGADO': 'Entregado',
        'CANCELADO': 'Listo para Entrega',
        'En Cola': 'En Cola',
        'Imprimiendo': 'Imprimiendo',
        'Curado': 'Curado',
        'Pintura y Armado': 'Pintura y Armado',
        'Control de Calidad': 'Control de Calidad',
        'Listo para Entrega': 'Listo para Entrega',
        'Entregado': 'Entregado'
      };

      const parseOtMeta = (rawText?: string | null): { clean: string; meta: Record<string, any> } => {
        if (!rawText || typeof rawText !== 'string') return { clean: '', meta: {} };
        const prefix = '<!-- WJ_OT_META:';
        const suffix = ':WJ_OT_META -->';
        const start = rawText.indexOf(prefix);
        const end = rawText.indexOf(suffix);
        if (start !== -1 && end > start) {
          try {
            const parsed = JSON.parse(decodeURIComponent(rawText.substring(start + prefix.length, end)));
            const clean = rawText.replace(/<!-- WJ_OT_META:[\s\S]*?:WJ_OT_META -->/g, '').trim();
            return { clean, meta: parsed || {} };
          } catch (_) {}
        }
        return { clean: rawText, meta: {} };
      };

      return data.map((row: any): OrdenTrabajo => {
        const descParsed = parseOtMeta(row.item_descripcion);
        const obsParsed = parseOtMeta(row.observaciones);
        const meta = { ...obsParsed.meta, ...descParsed.meta };

        const rawEstado = meta.estado_ui || row.estado_actual || row.estado || 'EN_COLA_OT';
        const estadoFinal: EstadoOT = dbToUiEstadoMap[rawEstado] || (meta.estado_ui as EstadoOT) || 'En Cola';

        const rawTotal = meta.total !== undefined
          ? Number(meta.total)
          : (row.total_ot !== null && row.total_ot !== undefined ? Number(row.total_ot) : (Number(row.precio_cobrado) || 0));
        // Resolución estricta de abono preservando exactamente el 0 tras reversiones (nunca usar `||`)
        const rawAbono = meta.abono !== undefined
          ? Number(meta.abono)
          : (row.total_abonado !== null && row.total_abonado !== undefined
            ? Number(row.total_abonado)
            : (row.abono !== null && row.abono !== undefined ? Number(row.abono) : 0));
        const total = isNaN(rawTotal) ? 0 : rawTotal;
        const abono = isNaN(rawAbono) ? 0 : Math.max(0, rawAbono);
        const saldo = meta.saldo_pendiente !== undefined
          ? Math.max(0, Number(meta.saldo_pendiente))
          : (row.saldo_pendiente !== null && row.saldo_pendiente !== undefined ? Math.max(0, Number(row.saldo_pendiente)) : Math.max(0, total - abono));

        const estadoPagoFinal: any = meta.estado_pago || row.estado_pago || (saldo <= 0 && total > 0 ? 'Pagado Total' : (abono > 0 ? 'Abono Parcial' : 'Pendiente'));

        return {
          id: row.id,
          numero_ot: row.numero_ot,
          cotizacion_id: meta.cotizacion_id || row.cotizacion_id || '',
          cotizacion_numero: meta.cotizacion_numero || row.cotizacion_numero || '',
          cliente_id: row.cliente_id || undefined,
          cliente_nombre: row.cliente_nombre || 'Cliente General',
          cliente_telefono: row.cliente_telefono || '',
          item_nombre: row.item_nombre || descParsed.clean || 'Pieza 3D',
          cantidad: Number(row.cantidad) || 1,
          estado: estadoFinal,
          operador_asignado: row.operador_asignado || 'Operador 3D',
          tracking_token: row.tracking_token || undefined,
          stl_url: row.stl_url || undefined,
          fecha_creacion: row.created_at || new Date().toISOString(),
          tiempo_impresion_min: meta.tiempo_impresion_min !== undefined ? Number(meta.tiempo_impresion_min) : 0,
          tiempo_armado_min: meta.tiempo_armado_min !== undefined ? Number(meta.tiempo_armado_min) : 0,
          tiempo_pintura_min: meta.tiempo_pintura_min !== undefined ? Number(meta.tiempo_pintura_min) : 0,
          peso_estimado_g: meta.peso_estimado_g !== undefined ? Number(meta.peso_estimado_g) : 0,
          tecnologia: meta.tecnologia || undefined,
          resina_id: meta.resina_id || undefined,
          resina_nombre: meta.resina_nombre || 'Resina Standard',
          filamento_id: meta.filamento_id || undefined,
          filamento_nombre: meta.filamento_nombre || undefined,
          maquina_nombre: meta.maquina_nombre || 'Anycubic MONO 4',
          va_pintado: Boolean(meta.va_pintado),
          tiene_empaque: Boolean(meta.tiene_empaque),
          detalles_tecnicos: descParsed.clean || obsParsed.clean || '',
          pos_venta_id: meta.pos_venta_id || row.pos_venta_id || undefined,
          precio_cobrado: total,
          abono,
          saldo_pendiente: saldo,
          estado_pago: estadoPagoFinal,
          metodo_pago: meta.metodo_pago || row.metodo_pago || 'Bre-B',
          comprobante_pago: row.comprobante_pago || undefined,
          inventario_descontado: meta.inventario_descontado !== undefined ? Boolean(meta.inventario_descontado) : Boolean(row.inventario_descontado),
          costo_real_acumulado: meta.costo_real_acumulado !== undefined ? Number(meta.costo_real_acumulado) : (row.costo_real_acumulado !== undefined ? Number(row.costo_real_acumulado) : 0)
        };
      });
    } catch (e) {
      console.warn('Exception in fetchOrdenes:', e);
      return null;
    }
  },

  // 5. Traer Cuentas de Cobro desde la Nube (Ledger Unificado con ordenes_trabajo sin falsos cruces)
  async fetchCuentas(): Promise<CuentaCobro[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data: otData, error: otErr } = await supabase!
        .from('ordenes_trabajo')
        .select('*')
        .order('created_at', { ascending: false });

      if (!otErr && otData) {
        return otData.map((row: any): CuentaCobro => {
          let meta: Record<string, any> = {};
          const rawText = row.item_descripcion || row.observaciones || '';
          const prefix = '<!-- WJ_OT_META:';
          const suffix = ':WJ_OT_META -->';
          const s = rawText.indexOf(prefix);
          const eIdx = rawText.indexOf(suffix);
          if (s !== -1 && eIdx > s) {
            try {
              meta = JSON.parse(decodeURIComponent(rawText.substring(s + prefix.length, eIdx))) || {};
            } catch (_) {}
          }
          const cleanDesc = rawText.replace(/<!-- WJ_OT_META:[\s\S]*?:WJ_OT_META -->/g, '').trim();

          const rawTotal = meta.total !== undefined
            ? Number(meta.total)
            : (row.total_ot !== null && row.total_ot !== undefined ? Number(row.total_ot) : (Number(row.precio_cobrado) || 0));
          const rawAbono = meta.abono !== undefined
            ? Number(meta.abono)
            : (row.total_abonado !== null && row.total_abonado !== undefined
              ? Number(row.total_abonado)
              : (row.abono !== null && row.abono !== undefined ? Number(row.abono) : 0));
          const total = isNaN(rawTotal) ? 0 : rawTotal;
          const abono = isNaN(rawAbono) ? 0 : Math.max(0, rawAbono);
          const saldo = meta.saldo_pendiente !== undefined
            ? Math.max(0, Number(meta.saldo_pendiente))
            : (row.saldo_pendiente !== null && row.saldo_pendiente !== undefined ? Math.max(0, Number(row.saldo_pendiente)) : Math.max(0, total - abono));
          const numOT = row.numero_ot || 'OT-000';
          const numCC = numOT.startsWith('CC-') ? numOT : `CC-${numOT.replace(/^OT-/, '')}`;

          return {
            id: row.id,
            numero_cc: numCC,
            cotizacion_id: meta.cotizacion_id || row.cotizacion_id || '',
            cotizacion_numero: meta.cotizacion_numero || row.cotizacion_numero || '',
            cliente: {
              id: row.cliente_id || `cli-${row.id}`,
              codigo: 1,
              nombre: row.cliente_nombre || 'Cliente General',
              nit_cc: '',
              telefono: row.cliente_telefono || '',
              correo: ''
            },
            fecha_emision: (row.created_at || new Date().toISOString()).slice(0, 10),
            items_resumen: row.item_nombre || cleanDesc || 'Servicios de Impresión 3D y Manufactura',
            total,
            abono,
            saldo_pendiente: saldo,
            estado_pago: (meta.estado_pago as any) || (row.estado_pago as any) || (saldo <= 0 && total > 0 ? 'Pagado Total' : (abono > 0 ? 'Abono Parcial' : 'Pendiente')),
            metodo_pago: meta.metodo_pago || row.metodo_pago || 'Bre-B',
            comprobante_url: row.comprobante_pago || undefined
          };
        });
      }

      return [];
    } catch (e) {
      console.warn('Exception in fetchCuentas:', e);
      return [];
    }
  },

  // 5. Guardar o Actualizar una Cotización en Supabase
  async saveCotizacion(cot: Cotizacion, isFlushingQueue: boolean = false): Promise<boolean> {
    if (!this.isAvailable()) {
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cotizacion', payload: cot });
      return false;
    }
    try {
      // 5.1 Asegurar que el cliente exista en la tabla clientes mediante Upsert Inteligente (anti-duplicados)
      let clienteId: string | null = null;
      if (cot.cliente) {
        clienteId = await this.saveCliente(cot.cliente);
      }

      const normalizarEstadoCotizacion = (estado?: string): string => {
        if (!estado) return 'BORRADOR';
        const e = estado.toUpperCase().trim();
        if (e.includes('APROB') || e.includes('FACTUR') || e.includes('ACEPT')) return 'APROBADA';
        if (e.includes('CANCEL') || e.includes('RECHAZ')) return 'CANCELADA';
        if (e.includes('EXPIR')) return 'EXPIRADA';
        if (e.includes('ENVIAD')) return 'ENVIADA';
        return 'BORRADOR';
      };

      // Serializar snapshot completo de items y metadatos financieros/estado dentro de notas para garantizar permanencia 100%
      const snapshotPrefix = '<!-- WJ_ITEMS_SNAPSHOT:';
      const snapshotSuffix = ':WJ_ITEMS_SNAPSHOT -->';
      const rawNotas = (cot.notas || '').replace(/<!-- WJ_ITEMS_SNAPSHOT:[\s\S]*?:WJ_ITEMS_SNAPSHOT -->/g, '').trim();
      const totalCot = Number(cot.total) || 0;
      const abonoCot = Number(cot.abono) || 0;
      const saldoCot = cot.saldo_pendiente !== undefined ? Number(cot.saldo_pendiente) : Math.max(0, totalCot - abonoCot);
      // Light-weight safety check para ítems con imágenes inline extremadamente grandes en redes móviles
      const itemsParaSnapshot = (cot.items || []).map(it => {
        if (it.imagen_url && it.imagen_url.startsWith('data:image/') && it.imagen_url.length > 400000) {
          return { ...it, imagen_url: undefined };
        }
        return it;
      });
      const payloadSnapshot = {
        items: itemsParaSnapshot,
        iva_porcentaje: cot.iva_porcentaje || 0,
        iva_monto: cot.iva_monto || 0,
        descuento_porcentaje: cot.descuento_porcentaje || 0,
        descuento_monto: cot.descuento_monto || 0,
        ahorro_volumen_total: cot.ahorro_volumen_total || 0,
        subtotal: Number(cot.subtotal) || 0,
        total: totalCot,
        estado_ui: cot.estado,
        vendedor: cot.vendedor || 'Equipo WJGEEKS',
        fecha: cot.fecha || new Date().toISOString().slice(0, 10),
        tiempo_entrega_estimado: cot.tiempo_entrega_estimado || '(3) Días hábiles',
        estado_pago: cot.estado_pago || (saldoCot <= 0 && totalCot > 0 ? 'Pagado Total' : abonoCot > 0 ? 'Abono Parcial' : 'Pendiente'),
        abono: abonoCot,
        saldo_pendiente: saldoCot,
        metodo_pago: cot.metodo_pago || 'Bre-B',
        comprobante_pago: cot.comprobante_pago || undefined,
        modo_margen: cot.modo_margen || 'margen_bruto',
        costo_total_taller: Number(cot.costo_total_taller) || 0,
        utilidad_neta_estimada: Number(cot.utilidad_neta_estimada) || 0
      };
      const encodedSnapshot = encodeURIComponent(JSON.stringify(payloadSnapshot));
      const notasConSnapshot = `${rawNotas}\n${snapshotPrefix}${encodedSnapshot}${snapshotSuffix}`;

      // 5.2 Upsert directo con columnas canónicas compatibles (y campos extendidos con fallback defensivo)
      const clienteNombreSafe = (cot.cliente?.nombre || '').trim() || 'Cliente General';
      const clienteTelSafe = (cot.cliente?.telefono || '').trim() || '0000000000';

      const canonicalPayload: any = {
        numero_cot: cot.numero_cot,
        cliente_id: clienteId,
        cliente_nombre: clienteNombreSafe,
        cliente_telefono: clienteTelSafe,
        fecha_emision: cot.fecha || new Date().toISOString().slice(0, 10),
        estado: normalizarEstadoCotizacion(cot.estado),
        subtotal: Number(cot.subtotal) || 0,
        descuento_porcentaje: cot.descuento_porcentaje || 0,
        total: totalCot,
        tiempo_entrega_estimado: cot.tiempo_entrega_estimado || '3 a 5 días hábiles',
        notas: notasConSnapshot
      };

      const extendedPayload = {
        ...canonicalPayload,
        vendedor_nombre: cot.vendedor || 'Equipo WJGEEKS',
        iva_porcentaje: Number(cot.iva_porcentaje) || 0,
        iva_monto: Number(cot.iva_monto) || 0,
        descuento_monto: Number(cot.descuento_monto) || 0,
        abono: abonoCot,
        saldo_pendiente: saldoCot,
        estado_pago: payloadSnapshot.estado_pago,
        metodo_pago: payloadSnapshot.metodo_pago,
        comprobante_pago: cot.comprobante_pago || null,
        costo_total_taller: Number(cot.costo_total_taller) || 0,
        utilidad_neta_estimada: Number(cot.utilidad_neta_estimada) || 0,
        modo_margen: cot.modo_margen || 'margen_bruto'
      };

      let { data: cotData, error: cotErr } = await supabase!
        .from('cotizaciones')
        .upsert(extendedPayload, { onConflict: 'numero_cot' })
        .select('id')
        .single();

      if (cotErr && (cotErr.code === 'PGRST204' || cotErr.code === '42703' || /column/i.test(cotErr.message || ''))) {
        const retryCot = await supabase!
          .from('cotizaciones')
          .upsert(canonicalPayload, { onConflict: 'numero_cot' })
          .select('id')
          .single();
        cotData = retryCot.data;
        cotErr = retryCot.error;
      }

      if (cotErr) {
        console.warn('Error saving cotizacion in Supabase:', cotErr);
        if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cotizacion', payload: cot });
        return false;
      }

      // 5.3 Actualizar piezas / items de la cotización
      if (cotData?.id) {
        // Limpiar ítems anteriores de esta cotización para evitar duplicados o piezas borradas
        await supabase!.from('cotizacion_items').delete().eq('cotizacion_id', cotData.id);

        if (cot.items && cot.items.length > 0) {
          const itemsPayload = cot.items.map(it => ({
            cotizacion_id: cotData.id,
            nombre_pieza: it.nombre_item || 'Pieza 3D',
            cantidad: Number(it.cantidad) || 1,
            precio_unitario: Number(it.precio_unitario) || 0,
            subtotal: Number(it.precio_total) || 0,
            tiempo_horas: Number(((it.tiempo_impresion_min || 0) / 60).toFixed(2)),
            peso_gramos: Number((it.peso_estimado_g || 0).toFixed(2)),
            tecnologia: it.tecnologia === 'FDM_FILAMENTO'
              ? 'FDM'
              : (it.tecnologia === 'CORTE_LASER' || it.tecnologia === 'GRABADO_LASER')
              ? 'LASER'
              : it.tecnologia === 'CNC_ROUTER'
              ? 'CNC'
              : 'SLA'
          }));

          await supabase!.from('cotizacion_items').insert(itemsPayload);
        }
      }

      this.broadcastChange('cotizacion', 'upsert');
      return true;
    } catch (e) {
      console.warn('Exception in saveCotizacion to cloud:', e);
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cotizacion', payload: cot });
      return false;
    }
  },

  // 6. Guardar o Actualizar una Orden de Trabajo (OT) en Supabase (Core V3 Compatible + Metadatos anti-cruce)
  async saveOrdenTrabajo(ot: OrdenTrabajo, isFlushingQueue: boolean = false): Promise<boolean> {
    if (!this.isAvailable()) {
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'orden', payload: ot });
      return false;
    }
    try {
      const totalOtCalc = Number(ot.precio_cobrado || (ot.abono || 0) + (ot.saldo_pendiente || 0) || 0);
      const totalAbonadoCalc = Math.max(0, Number(ot.abono ?? 0));
      const saldoCalc = ot.saldo_pendiente !== undefined ? Math.max(0, Number(ot.saldo_pendiente)) : Math.max(0, totalOtCalc - totalAbonadoCalc);

      const estadoMap: Record<string, string> = {
        'En Cola': 'EN_COLA_OT',
        'Imprimiendo': 'IMPRESION',
        'Curado': 'CURADO',
        'Pintura y Armado': 'PINTADO_ARMADO',
        'Control de Calidad': 'CONTROL_CALIDAD',
        'Listo para Entrega': 'CONTROL_CALIDAD',
        'Entregado': 'ENTREGADO',
        'Cancelado': 'CANCELADO'
      };

      let estadoDb = estadoMap[ot.estado] || 'EN_COLA_OT';
      // Regla de integridad DB: solo pasar a ENTREGADO si el saldo pendiente está liquidado
      if (estadoDb === 'ENTREGADO' && saldoCalc > 0) {
        estadoDb = 'CONTROL_CALIDAD';
      }

      const rawDesc = (ot.detalles_tecnicos || ot.item_nombre || 'Pieza 3D').replace(/<!-- WJ_OT_META:[\s\S]*?:WJ_OT_META -->/g, '').trim();
      const otMeta = {
        cotizacion_id: ot.cotizacion_id || '',
        cotizacion_numero: ot.cotizacion_numero || '',
        pos_venta_id: ot.pos_venta_id || '',
        total: totalOtCalc,
        abono: totalAbonadoCalc,
        saldo_pendiente: saldoCalc,
        estado_ui: ot.estado,
        estado_pago: ot.estado_pago || (saldoCalc <= 0 && totalOtCalc > 0 ? 'Pagado Total' : (totalAbonadoCalc > 0 ? 'Abono Parcial' : 'Pendiente')),
        metodo_pago: ot.metodo_pago || 'Bre-B',
        tiempo_impresion_min: ot.tiempo_impresion_min || 0,
        tiempo_armado_min: ot.tiempo_armado_min || 0,
        tiempo_pintura_min: ot.tiempo_pintura_min || 0,
        peso_estimado_g: ot.peso_estimado_g || 0,
        tecnologia: ot.tecnologia || undefined,
        resina_id: ot.resina_id || undefined,
        resina_nombre: ot.resina_nombre || undefined,
        filamento_id: ot.filamento_id || undefined,
        filamento_nombre: ot.filamento_nombre || undefined,
        maquina_nombre: ot.maquina_nombre || undefined,
        va_pintado: Boolean(ot.va_pintado),
        tiene_empaque: Boolean(ot.tiene_empaque),
        inventario_descontado: Boolean(ot.inventario_descontado),
        costo_real_acumulado: Number(ot.costo_real_acumulado) || 0
      };
      const metaTag = `<!-- WJ_OT_META:${encodeURIComponent(JSON.stringify(otMeta))}:WJ_OT_META -->`;
      const descConMeta = `${rawDesc}\n${metaTag}`.trim();

      const payloadV3: any = {
        numero_ot: ot.numero_ot,
        cliente_id: (ot.cliente_id && UUID_REGEX.test(ot.cliente_id)) ? ot.cliente_id : null,
        cliente_nombre: ot.cliente_nombre || 'Cliente',
        cliente_telefono: ot.cliente_telefono || 'Sin teléfono',
        item_nombre: ot.item_nombre || null,
        item_descripcion: descConMeta,
        cantidad: Number(ot.cantidad) || 1,
        total_ot: totalOtCalc,
        total_abonado: totalAbonadoCalc,
        estado_actual: estadoDb,
        estado_pago: otMeta.estado_pago,
        pos_venta_id: ot.pos_venta_id || null,
        stl_url: ot.stl_url || null,
        cotizacion_id: (ot.cotizacion_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot.cotizacion_id)) ? ot.cotizacion_id : null
      };

      if (ot.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot.id)) {
        payloadV3.id = ot.id;
      }

      const payloadV3Extended = {
        ...payloadV3,
        inventario_descontado: Boolean(ot.inventario_descontado),
        costo_real_acumulado: Number(ot.costo_real_acumulado) || 0
      };

      // Intento en Core V3 (con columnas extendidas y fallback limpio)
      let { error: errV3 } = await supabase!
        .from('ordenes_trabajo')
        .upsert(payloadV3Extended, { onConflict: 'numero_ot' });

      if (errV3 && (errV3.code === 'PGRST204' || errV3.code === '42703' || /column/i.test(errV3.message || ''))) {
        const retryV3 = await supabase!
          .from('ordenes_trabajo')
          .upsert(payloadV3, { onConflict: 'numero_ot' });
        errV3 = retryV3.error;
      }

      if (!errV3) {
        this.broadcastChange('orden', 'upsert');
        return true;
      }

      // Fallback para esquema legado (sin saldo_pendiente generado)
      const payloadLegacy: any = {
        numero_ot: ot.numero_ot,
        cliente_nombre: ot.cliente_nombre,
        cliente_telefono: ot.cliente_telefono || null,
        item_nombre: ot.item_nombre,
        cantidad: ot.cantidad,
        estado: ot.estado,
        operador_asignado: ot.operador_asignado || 'Operador 3D',
        observaciones: descConMeta,
        cotizacion_id: (ot.cotizacion_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot.cotizacion_id)) ? ot.cotizacion_id : null,
        pos_venta_id: ot.pos_venta_id || null,
        precio_cobrado: ot.precio_cobrado || null,
        abono: totalAbonadoCalc,
        estado_pago: otMeta.estado_pago,
        metodo_pago: ot.metodo_pago || 'Bre-B',
        comprobante_pago: ot.comprobante_pago || null
      };

      const { error: errLegacy } = await supabase!
        .from('ordenes_trabajo')
        .upsert(payloadLegacy, { onConflict: 'numero_ot' });

      if (errLegacy && !isFlushingQueue) {
        this.enqueueOutboxTask({ type: 'orden', payload: ot });
      }
      if (!errLegacy) this.broadcastChange('orden', 'upsert');
      return !errLegacy;
    } catch (e) {
      console.warn('Exception saving OT to cloud:', e);
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'orden', payload: ot });
      return false;
    }
  },

  // 6.1 Eliminar una Orden de Trabajo (OT) de Supabase
  async deleteOrdenTrabajo(id: string, numero_ot?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const isUuid = Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      let query = supabase!.from('ordenes_trabajo').delete();
      if (numero_ot && isUuid) {
        query = query.or(`id.eq.${id},numero_ot.eq.${numero_ot}`);
      } else if (numero_ot) {
        query = query.eq('numero_ot', numero_ot);
      } else if (isUuid) {
        query = query.eq('id', id);
      } else {
        return false;
      }
      const { error } = await query;
      if (error) {
        console.warn('Error deleting OT from cloud:', error);
        return false;
      }
      this.broadcastChange('orden', 'delete');
      return true;
    } catch (e) {
      console.warn('Exception deleting OT from cloud:', e);
      return false;
    }
  },

  // 7. Guardar o Actualizar una Cuenta de Cobro en Supabase (vinculación exacta sin inventar códigos OT)
  async saveCuentaCobro(cc: CuentaCobro, isFlushingQueue: boolean = false): Promise<boolean> {
    if (!this.isAvailable()) {
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cuenta', payload: cc });
      return false;
    }
    try {
      const updatePayload: any = {
        total_abonado: Math.max(0, Number(cc.abono) || 0),
        estado_pago: cc.estado_pago,
        updated_at: new Date().toISOString()
      };

      const isUuidId = Boolean(cc.id && UUID_REGEX.test(cc.id));
      const explicitOtInResumen = cc.items_resumen?.match(/\b(OT-\d+)\b/i)?.[1];
      const explicitNumeroOt = cc.numero_cc?.startsWith('OT-') ? cc.numero_cc : explicitOtInResumen;

      if (isUuidId) {
        const { error } = await supabase!
          .from('ordenes_trabajo')
          .update(updatePayload)
          .eq('id', cc.id);
        if (error && !isFlushingQueue) {
          this.enqueueOutboxTask({ type: 'cuenta', payload: cc });
        }
        return !error;
      }

      if (explicitNumeroOt) {
        const { error } = await supabase!
          .from('ordenes_trabajo')
          .update(updatePayload)
          .eq('numero_ot', explicitNumeroOt);
        if (error && !isFlushingQueue) {
          this.enqueueOutboxTask({ type: 'cuenta', payload: cc });
        }
        return !error;
      }

      // Cuenta de cobro independiente sin OT específica: no sobrescribir órdenes ajenas
      return true;
    } catch (e) {
      console.warn('Exception saving CC to cloud:', e);
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cuenta', payload: cc });
      return false;
    }
  },

  // 8. Guardar o Actualizar un Cliente en Supabase (Upsert Inteligente Anti-Duplicados)
  async saveCliente(cliente: Cliente, opciones?: { allowShorterName?: boolean }): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data: rows } = await supabase!
        .from('clientes')
        .select('id, codigo, nombre, nit_cc, telefono, correo');

      const existingRows: Cliente[] = (rows || []).map((r: any) => ({
        id: r.id,
        codigo: Number(r.codigo) || 1,
        nombre: (r.nombre || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(),
        nit_cc: normalizarNitCc(r.nit_cc),
        telefono: (r.telefono || '').replace(/[\u00a0\u202c\s]/g, '').trim(),
        correo: r.correo || ''
      }));

      const { exactMatch } = buscarCoincidenciasCliente(cliente, existingRows);

      if (exactMatch) {
        const { clienteActualizado, huboCambios } = enriquecerClienteExistente(exactMatch, cliente, opciones);
        if (huboCambios) {
          const { error: updErr } = await supabase!
            .from('clientes')
            .update({
              nombre: clienteActualizado.nombre,
              telefono: clienteActualizado.telefono || '',
              nit_cc: normalizarNitCc(clienteActualizado.nit_cc) || null,
              correo: normalizarCorreo(clienteActualizado.correo) || null
            })
            .eq('id', exactMatch.id);

          if (updErr) {
            console.warn('Error updating existing cliente in Supabase:', updErr);
          }
        }
        return exactMatch.id;
      }

      const { data, error } = await supabase!
        .from('clientes')
        .insert([{
          nombre: (cliente.nombre || 'Cliente General').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(),
          telefono: (cliente.telefono || '').trim(),
          nit_cc: normalizarNitCc(cliente.nit_cc) || null,
          correo: normalizarCorreo(cliente.correo) || null
        }])
        .select('id')
        .single();

      if (error) {
        console.warn('Error saving cliente in Supabase:', error);
        return null;
      }
      return data?.id || null;
    } catch (e) {
      console.warn('Exception saving cliente in Supabase:', e);
      return null;
    }
  },

  // 8.1 Eliminar Cliente en Supabase (Desvinculando FKs en cotizaciones, OTs, abonos y ventas POS)
  async deleteCliente(id: string, nombre?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const idsToDelete: string[] = [];
      if (UUID_REGEX.test(id)) {
        idsToDelete.push(id);
      } else if (nombre && nombre.trim()) {
        const { data: matched } = await supabase!
          .from('clientes')
          .select('id')
          .ilike('nombre', nombre.trim());
        (matched || []).forEach((r: any) => {
          if (r?.id && UUID_REGEX.test(r.id)) idsToDelete.push(r.id);
        });
      }

      if (idsToDelete.length === 0) return false;

      // Desvincular cliente_id antes de borrar para garantizar integridad y 0 errores FK
      await Promise.all([
        supabase!.from('cotizaciones').update({ cliente_id: null }).in('cliente_id', idsToDelete),
        supabase!.from('ordenes_trabajo').update({ cliente_id: null }).in('cliente_id', idsToDelete),
        supabase!.from('abonos_pagos').update({ cliente_id: null }).in('cliente_id', idsToDelete),
        supabase!.from('ventas_express').update({ cliente_id: null }).in('cliente_id', idsToDelete)
      ]);

      const { error } = await supabase!.from('clientes').delete().in('id', idsToDelete);
      if (error) {
        console.warn('Error deleting cliente in Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Exception deleting cliente in Supabase:', e);
      return false;
    }
  },

  // 9. Sembrar datos iniciales del Excel a Supabase
  async seedInitialData(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { success: false, message: 'Supabase no está configurado.' };
    }

    try {
      // Configuración de taller
      const { data: existingCfg } = await supabase!.from('configuracion_taller').select('id').limit(1);
      if (!existingCfg || existingCfg.length === 0) {
        await supabase!.from('configuracion_taller').insert([CONFIGURACION_INICIAL]);
      }

      // Resinas
      const { data: existingRes } = await supabase!.from('resinas').select('id').limit(1);
      if (!existingRes || existingRes.length === 0) {
        const payloadRes = RESINAS_INICIALES.map(r => ({
          tipo: r.tipo,
          marca: r.marca,
          color: r.color,
          volumen_l: r.volumen_l,
          densidad_g_cm3: r.densidad_g_cm3,
          peso_g: r.peso_g,
          precio_compra: r.precio_compra,
          costo_gramo: r.costo_gramo,
          velocidad_impresion_mm_h: r.velocidad_impresion_mm_h
        }));
        await supabase!.from('resinas').insert(payloadRes);
      }

      // Maquinaria
      const { data: existingMaq } = await supabase!.from('maquinas').select('id').limit(1);
      if (!existingMaq || existingMaq.length === 0) {
        const payloadMaq = MAQUINAS_INICIALES.map(m => ({
          nombre: m.nombre,
          tipo: m.tipo,
          consumo_kwh: m.consumo_kwh,
          costo_minuto: m.costo_minuto,
          estado: m.estado
        }));
        await supabase!.from('maquinas').insert(payloadMaq);
      }

      // Insumos
      const { data: existingIns } = await supabase!.from('insumos').select('id').limit(1);
      if (!existingIns || existingIns.length === 0) {
        const payloadIns = INSUMOS_INICIALES.map(i => ({
          codigo_item: i.codigo,
          nombre: i.nombre,
          marca: i.marca,
          categoria: i.categoria,
          cantidad_presentacion: i.presentacion,
          costo_total: i.costo_total,
          costo_unitario: i.costo_unitario,
          enlace_compra: i.enlace_compra
        }));
        await supabase!.from('insumos').insert(payloadIns);
      }

      // Personal
      const { data: existingPer } = await supabase!.from('tarifas_personal').select('id').limit(1);
      if (!existingPer || existingPer.length === 0) {
        const payloadPer = PERSONAL_INICIAL.map(p => ({
          rol: p.rol,
          costo_hora: p.costo_hora,
          costo_minuto: p.costo_minuto
        }));
        await supabase!.from('tarifas_personal').insert(payloadPer);
      }

      // Clientes
      const { data: existingCli } = await supabase!.from('clientes').select('id').limit(1);
      if (!existingCli || existingCli.length === 0) {
        const payloadCli = CLIENTES_INICIALES.map(c => ({
          nombre: c.nombre,
          nit_cc: c.nit_cc,
          telefono: c.telefono,
          correo: c.correo
        }));
        await supabase!.from('clientes').insert(payloadCli);
      }

      return { success: true, message: 'Todos los datos maestros fueron verificados/sincronizados en Supabase.' };
    } catch (e: any) {
      console.error('Error seeding data:', e);
      return { success: false, message: `Error sembrando datos: ${e.message || e}` };
    }
  },

  // 10. Traer Ventas Express (POS) desde Supabase
  async fetchVentasExpress(): Promise<VentaExpress[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('ventas_express')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Si la tabla aún no existe en Supabase, retorna null sin romper
        console.warn('Tabla ventas_express pendiente de migración en Supabase:', error.message);
        return null;
      }

      if (!data || data.length === 0) return [];

      return data.map((row: any): VentaExpress => {
        let subtotalVal = Number(row.subtotal) || Number(row.total) || 0;
        let ivaPorcentajeVal = Number(row.iva_porcentaje) || 0;
        let ivaMontoVal = Number(row.iva_monto) || 0;
        let notasLimpia = row.notas || '';
        let snapshotMeta: Record<string, any> = {};

        if (row.notas && row.notas.includes('<!-- WJ_POS_FISCAL:')) {
          try {
            const start = row.notas.indexOf('<!-- WJ_POS_FISCAL:') + '<!-- WJ_POS_FISCAL:'.length;
            const end = row.notas.indexOf(':WJ_POS_FISCAL -->');
            if (end > start) {
              const parsed = JSON.parse(decodeURIComponent(row.notas.substring(start, end)));
              snapshotMeta = parsed || {};
              subtotalVal = parsed.subtotal ?? subtotalVal;
              ivaPorcentajeVal = parsed.iva_porcentaje ?? ivaPorcentajeVal;
              ivaMontoVal = parsed.iva_monto ?? ivaMontoVal;
              notasLimpia = row.notas.replace(/<!-- WJ_POS_FISCAL:[\s\S]*?:WJ_POS_FISCAL -->/g, '').trim();
            }
          } catch (_) {}
        }

        const totalFinal = snapshotMeta.total !== undefined ? Number(snapshotMeta.total) : (Number(row.total) || 0);
        const abonoFinal = snapshotMeta.abono !== undefined ? Number(snapshotMeta.abono) : (Number(row.abono) || 0);
        const saldoFinal = snapshotMeta.saldo_pendiente !== undefined
          ? Number(snapshotMeta.saldo_pendiente)
          : (row.saldo_pendiente !== undefined ? Number(row.saldo_pendiente) : Math.max(0, totalFinal - abonoFinal));
        const estadoPagoFinal = snapshotMeta.estado_pago || row.estado_pago || (saldoFinal <= 0 && totalFinal > 0 ? 'Pagado Total' : abonoFinal > 0 ? 'Abono Parcial' : 'Pendiente');

        return {
          id: row.id,
          numero_venta: row.numero_venta,
          foto_url: row.foto_url || undefined,
          nombre_producto: snapshotMeta.nombre_producto || row.nombre_producto,
          cliente_id: snapshotMeta.cliente_id || row.cliente_id || undefined,
          cliente_nombre: snapshotMeta.cliente_nombre || row.cliente_nombre,
          cliente_telefono: snapshotMeta.cliente_telefono ?? row.cliente_telefono ?? '',
          cliente_nit_cc: snapshotMeta.cliente_nit_cc || row.cliente_nit_cc || undefined,
          cliente_correo: snapshotMeta.cliente_correo || row.cliente_correo || undefined,
          subtotal: subtotalVal,
          iva_porcentaje: ivaPorcentajeVal,
          iva_monto: ivaMontoVal,
          iva_regimen_nota: ivaPorcentajeVal === 0 ? 'Régimen Simple / No Responsable' : undefined,
          total: totalFinal,
          abono: abonoFinal,
          saldo_pendiente: saldoFinal,
          estado_pago: estadoPagoFinal as any,
          fecha_venta: snapshotMeta.fecha_venta || row.fecha_venta || new Date().toISOString().slice(0, 10),
          fecha_prometida_pago: snapshotMeta.fecha_prometida_pago !== undefined ? (snapshotMeta.fecha_prometida_pago || undefined) : (row.fecha_prometida_pago || undefined),
          notas: notasLimpia,
          metodo_pago: snapshotMeta.metodo_pago || row.metodo_pago || 'Bre-B',
          creado_por: row.creado_por || 'Equipo WJGEEKS',
          requiere_ot: snapshotMeta.requiere_ot !== undefined ? Boolean(snapshotMeta.requiere_ot) : Boolean(row.requiere_ot),
          estado_diseno: snapshotMeta.estado_diseno !== undefined ? (snapshotMeta.estado_diseno || undefined) : (row.estado_diseno || undefined),
          ot_id: snapshotMeta.ot_id !== undefined ? (snapshotMeta.ot_id || undefined) : (row.ot_id || undefined),
          ot_numero: snapshotMeta.ot_numero !== undefined ? (snapshotMeta.ot_numero || undefined) : (row.ot_numero || undefined),
          enlace_diseno: row.enlace_diseno || undefined,
          notas_diseno: row.notas_diseno || undefined,
          producto_stock_id: row.producto_stock_id || undefined,
          descontar_stock: row.descontar_stock !== undefined ? Boolean(row.descontar_stock) : undefined,
          cantidad_vendida: row.cantidad_vendida !== undefined ? Number(row.cantidad_vendida) : undefined
        };
      });
    } catch (e) {
      console.warn('Exception in fetchVentasExpress:', e);
      return null;
    }
  },

  // 11. Guardar o Actualizar una Venta Express en Supabase (Persistencia Canónica Directa)
  async saveVentaExpress(venta: VentaExpress, isFlushingQueue: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isAvailable()) {
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'venta_express', payload: venta });
      return { success: false, error: 'Supabase no está configurado o sin conexión.' };
    }

    try {
      const snapshotPrefix = '<!-- WJ_POS_FISCAL:';
      const snapshotSuffix = ':WJ_POS_FISCAL -->';
      const rawNotas = (venta.notas || '').replace(/<!-- WJ_POS_FISCAL:[\s\S]*?:WJ_POS_FISCAL -->/g, '').trim();
      const fiscalData = {
        subtotal: venta.subtotal || venta.total,
        iva_porcentaje: venta.iva_porcentaje || 0,
        iva_monto: venta.iva_monto || 0,
        iva_regimen_nota: venta.iva_regimen_nota || 'Régimen Simple / No Responsable',
        total: Number(venta.total) || 0,
        abono: Number(venta.abono) || 0,
        saldo_pendiente: Number(venta.saldo_pendiente) || 0,
        estado_pago: venta.estado_pago,
        metodo_pago: venta.metodo_pago || 'Bre-B',
        fecha_venta: venta.fecha_venta,
        fecha_prometida_pago: venta.fecha_prometida_pago || null,
        nombre_producto: venta.nombre_producto,
        cliente_id: venta.cliente_id || null,
        cliente_nombre: venta.cliente_nombre,
        cliente_telefono: venta.cliente_telefono || '',
        cliente_nit_cc: normalizarNitCc(venta.cliente_nit_cc) || null,
        cliente_correo: normalizarCorreo(venta.cliente_correo) || null,
        requiere_ot: Boolean(venta.requiere_ot),
        estado_diseno: venta.estado_diseno || null,
        ot_id: venta.ot_id || null,
        ot_numero: venta.ot_numero || null
      };
      const notasConFiscal = `${rawNotas}\n${snapshotPrefix}${encodeURIComponent(JSON.stringify(fiscalData))}${snapshotSuffix}`;

      const corePayload = {
        id: venta.id,
        numero_venta: venta.numero_venta,
        foto_url: venta.foto_url || null,
        nombre_producto: venta.nombre_producto,
        cliente_nombre: venta.cliente_nombre,
        cliente_telefono: venta.cliente_telefono || null,
        total: Number(venta.total) || 0,
        abono: Number(venta.abono) || 0,
        saldo_pendiente: Number(venta.saldo_pendiente) || 0,
        estado_pago: venta.estado_pago,
        fecha_venta: venta.fecha_venta,
        fecha_prometida_pago: venta.fecha_prometida_pago || null,
        notas: notasConFiscal,
        metodo_pago: venta.metodo_pago || 'Bre-B',
        creado_por: venta.creado_por || 'Equipo WJGEEKS',
        requiere_ot: Boolean(venta.requiere_ot),
        estado_diseno: venta.estado_diseno || null,
        ot_id: venta.ot_id || null,
        ot_numero: venta.ot_numero || null
      };

      const fullPayload = {
        ...corePayload,
        cliente_id: (venta.cliente_id && UUID_REGEX.test(venta.cliente_id)) ? venta.cliente_id : null,
        cliente_nit_cc: normalizarNitCc(venta.cliente_nit_cc) || null,
        cliente_correo: normalizarCorreo(venta.cliente_correo) || null,
        enlace_diseno: venta.enlace_diseno || null,
        notas_diseno: venta.notas_diseno || null,
        producto_stock_id: venta.producto_stock_id || null,
        descontar_stock: Boolean(venta.descontar_stock),
        cantidad_vendida: venta.cantidad_vendida || 1,
        updated_at: new Date().toISOString()
      };

      let { error } = await supabase!
        .from('ventas_express')
        .upsert(fullPayload, { onConflict: 'id' });

      if (error) {
        console.warn('Primary upsert venta_express falló, intentando corePayload:', error.message);
        const fallbackRes = await supabase!
          .from('ventas_express')
          .upsert(corePayload, { onConflict: 'id' });
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('Error saving venta_express in Supabase:', error.message);
        if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'venta_express', payload: venta });
        return { success: false, error: error.message };
      }
      this.broadcastChange('venta_express', 'upsert');
      return { success: true };
    } catch (e: any) {
      console.warn('Exception in saveVentaExpress:', e);
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'venta_express', payload: venta });
      return { success: false, error: e?.message || 'Error guardando venta' };
    }
  },

  // Eliminar Venta Express en Supabase (con purga estricta de abonos contables y OTs asociadas)
  async deleteVentaExpress(id: string, numero_venta?: string, ot_id?: string, ot_numero?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) return { success: false, error: 'Offline' };

    try {
      // 1. Purgar abonos del Ledger Contable Inmutable (abonos_pagos) asociados a esta venta o su OT
      try {
        let abonosQuery = supabase!.from('abonos_pagos').delete();
        const conds: string[] = [`pos_venta_id.eq.${id}`];
        if (numero_venta) conds.push(`pos_venta_id.eq.${numero_venta}`);
        if (ot_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot_id)) {
          conds.push(`orden_trabajo_id.eq.${ot_id}`);
        }
        await abonosQuery.or(conds.join(','));

        if (numero_venta) {
          await supabase!.from('abonos_pagos').delete().ilike('nota', `%${numero_venta}%`);
        }
      } catch (eLedger) {
        console.warn('[deleteVentaExpress] Advertencia limpiando abonos contables:', eLedger);
      }

      // 2. Purgar u Orden de Trabajo asociada para que no quede huérfana en el taller ni en cobranzas
      try {
        let otQuery = supabase!.from('ordenes_trabajo').delete();
        const otConds: string[] = [`pos_venta_id.eq.${id}`];
        if (ot_numero) otConds.push(`numero_ot.eq.${ot_numero}`);
        if (ot_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot_id)) {
          otConds.push(`id.eq.${ot_id}`);
        }
        await otQuery.or(otConds.join(','));
      } catch (eOT) {
        console.warn('[deleteVentaExpress] Advertencia limpiando OT asociada:', eOT);
      }

      // 3. Eliminar la venta de la tabla ventas_express
      const { error } = await supabase!
        .from('ventas_express')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Error deleting venta_express in Supabase:', error.message);
        return { success: false, error: error.message };
      }
      this.broadcastChange('venta_express', 'delete');
      return { success: true };
    } catch (e: any) {
      console.warn('Exception in deleteVentaExpress:', e);
      return { success: false, error: e?.message || 'Error eliminando venta' };
    }
  },

  // Eliminar Cotización en Supabase (con purga estricta de abonos en Ledger, ítems y OTs vinculadas)
  async deleteCotizacion(id: string, numero_cot?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) return { success: false, error: 'Offline' };

    try {
      const isUuid = Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

      // 1. Purgar abonos contables en abonos_pagos asociados a esta cotización
      try {
        let abonoQuery = supabase!.from('abonos_pagos').delete();
        if (isUuid) {
          abonoQuery = abonoQuery.eq('cotizacion_id', id);
        } else if (numero_cot) {
          abonoQuery = abonoQuery.ilike('nota', `%${numero_cot}%`);
        }
        await abonoQuery;

        if (numero_cot) {
          await supabase!.from('abonos_pagos').delete().ilike('nota', `%${numero_cot}%`);
        }
      } catch (eAbono) {
        console.warn('[deleteCotizacion] Advertencia purgando abonos de cotización:', eAbono);
      }

      // 2. Eliminar OTs asociadas en ordenes_trabajo
      try {
        let otQuery = supabase!.from('ordenes_trabajo').delete();
        if (isUuid && numero_cot) {
          otQuery = otQuery.or(`cotizacion_id.eq.${id},cotizacion_numero.eq.${numero_cot}`);
        } else if (isUuid) {
          otQuery = otQuery.eq('cotizacion_id', id);
        } else if (numero_cot) {
          otQuery = otQuery.eq('cotizacion_numero', numero_cot);
        }
        await otQuery;
      } catch (eOT) {
        console.warn('[deleteCotizacion] Advertencia eliminando OTs vinculadas:', eOT);
      }

      // 3. Eliminar piezas / ítems de la cotización
      try {
        if (isUuid) {
          await supabase!.from('cotizacion_items').delete().eq('cotizacion_id', id);
        }
      } catch (eItems) {
        console.warn('[deleteCotizacion] Advertencia eliminando ítems:', eItems);
      }

      // 4. Eliminar el registro en la tabla cotizaciones
      let deleteQuery = supabase!.from('cotizaciones').delete();
      if (isUuid) {
        deleteQuery = deleteQuery.eq('id', id);
      } else if (numero_cot) {
        deleteQuery = deleteQuery.eq('numero_cot', numero_cot);
      } else {
        return { success: false, error: 'ID o número de cotización no válido' };
      }

      const { error } = await deleteQuery;
      if (error) {
        console.warn('Error deleting cotizacion in Supabase:', error.message);
        return { success: false, error: error.message };
      }

      this.broadcastChange('cotizacion', 'delete');
      return { success: true };
    } catch (e: any) {
      console.warn('Exception in deleteCotizacion:', e);
      return { success: false, error: e?.message || 'Error eliminando cotización' };
    }
  },

  // Eliminar Cuenta de Cobro en Supabase (sincronizado con ordenes_trabajo / abonos_pagos)
  async deleteCuentaCobro(_id: string, numero_cc?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const numeroOT = numero_cc?.replace(/^CC-/, 'OT-') || numero_cc;
      if (numeroOT) {
        // En el esquema canónico v3, las cuentas de cobro se derivan de ordenes_trabajo y abonos_pagos.
        // Si se elimina una cuenta, limpiamos los abonos registrados con esa referencia
        await supabase!
          .from('abonos_pagos')
          .delete()
          .eq('referencia_transaccion', numero_cc);
      }
      this.broadcastChange('cuenta', 'delete');
      return true;
    } catch (e) {
      console.warn('Exception in deleteCuentaCobro:', e);
      return false;
    }
  },

  // 12. Traer Tarifario de Tamaños en la Nube
  async fetchTarifasTamanos(): Promise<TarifaTamano[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('tarifas_tamanos')
        .select('*')
        .order('altura_cm', { ascending: true });

      if (error) {
        console.warn('Tabla tarifas_tamanos pendiente en Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];
      return data;
    } catch (e) {
      console.warn('Exception in fetchTarifasTamanos:', e);
      return null;
    }
  },

  // 13. Traer Tareas de Equipo desde Supabase
  async fetchTareasEquipo(): Promise<TareaEquipo[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('tareas_equipo')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Tabla tareas_equipo en Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];

      return data.map((row: any): TareaEquipo => ({
        id: row.id,
        titulo: row.titulo,
        descripcion: row.descripcion || '',
        asignado_a: row.asignado_a as any,
        tipo: (row.tipo_tarea || 'puntual') as any,
        frecuencia: row.frecuencia as any,
        prioridad: (row.prioridad || 'media') as any,
        completada: row.estado === 'completada',
        fecha_limite: row.fecha_limite || undefined,
        fecha_creacion: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        porcentaje_completado: typeof row.porcentaje_completado === 'number' ? row.porcentaje_completado : 0,
        ultimo_avance_at: row.ultimo_avance_at || undefined
      }));
    } catch (e) {
      console.warn('Exception in fetchTareasEquipo:', e);
      return null;
    }
  },

  // 14. Guardar o Actualizar una Tarea de Equipo en Supabase
  async saveTareaEquipo(tarea: TareaEquipo): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload: Record<string, any> = {
        id: tarea.id,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion || null,
        asignado_a: tarea.asignado_a,
        tipo_tarea: tarea.tipo,
        frecuencia: tarea.frecuencia || null,
        prioridad: tarea.prioridad,
        estado: tarea.completada ? 'completada' : 'pendiente',
        fecha_limite: tarea.fecha_limite || null,
        porcentaje_completado: typeof tarea.porcentaje_completado === 'number' ? tarea.porcentaje_completado : 0,
        ultimo_avance_at: tarea.ultimo_avance_at || null,
        creado_por: 'Equipo WJGEEKS',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase!
        .from('tareas_equipo')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Error saving tarea_equipo in Supabase:', error.message);
        return false;
      }
      this.broadcastChange('tarea', 'upsert');
      return true;
    } catch (e) {
      console.warn('Exception in saveTareaEquipo:', e);
      return false;
    }
  },

  // 15. Eliminar una Tarea de Equipo en Supabase
  async deleteTareaEquipo(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!
        .from('tareas_equipo')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Error deleting tarea_equipo in Supabase:', error.message);
        return false;
      }
      this.broadcastChange('tarea', 'delete');
      return true;
    } catch (e) {
      console.warn('Exception in deleteTareaEquipo:', e);
      return false;
    }
  },

  // 16. Traer Solicitudes de Insumos (S.O.S) desde Supabase
  async fetchSolicitudesInsumos(): Promise<SolicitudInsumo[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('solicitudes_insumos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Tabla solicitudes_insumos en Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];

      return data.map((row: any): SolicitudInsumo => ({
        id: row.id,
        insumo_nombre: row.insumo_nombre,
        categoria: row.categoria || undefined,
        cantidad: Number(row.cantidad) || 1,
        unidad: row.unidad || 'und',
        urgencia: (row.urgencia || 'normal') as any,
        solicitado_por: row.solicitado_por as any,
        encargado_compra: (row.encargado_compra || 'Wendy') as any,
        estado: (row.estado || 'pendiente') as any,
        enlace_compra: row.enlace_compra || undefined,
        proveedor_sugerido: row.proveedor_sugerido || undefined,
        notas: row.notas || undefined,
        fecha_solicitud: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        fecha_atendida: row.fecha_atendida || undefined,
        tipo_compra: (row.tipo_compra || undefined) as any,
        plataforma_tienda: row.plataforma_tienda || undefined,
        numero_pedido: row.numero_pedido || undefined,
        transportadora: row.transportadora || undefined,
        numero_guia: row.numero_guia || undefined,
        enlace_rastreo: row.enlace_rastreo || undefined,
        fecha_estimada_llegada: row.fecha_estimada_llegada || undefined,
        costo_estimado: row.costo_estimado !== undefined && row.costo_estimado !== null ? Number(row.costo_estimado) : undefined,
        costo_real: row.costo_real !== undefined && row.costo_real !== null ? Number(row.costo_real) : undefined,
        origen_tipo: (row.origen_tipo || 'manual') as any,
        catalogo_tipo: (row.catalogo_tipo || undefined) as any,
        catalogo_item_id: row.catalogo_item_id || undefined,
        stock_reabastecido: Boolean(row.stock_reabastecido)
      }));
    } catch (e) {
      console.warn('Exception in fetchSolicitudesInsumos:', e);
      return null;
    }
  },

  // 17. Guardar o Actualizar Solicitud de Insumo en Supabase (con fallback defensivo ante columnas pendientes)
  async saveSolicitudInsumo(solicitud: SolicitudInsumo): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const basePayload = {
        id: solicitud.id,
        insumo_nombre: solicitud.insumo_nombre,
        cantidad: solicitud.cantidad,
        unidad: solicitud.unidad,
        urgencia: solicitud.urgencia,
        solicitado_por: solicitud.solicitado_por,
        estado: solicitud.estado,
        enlace_compra: solicitud.enlace_compra || null,
        proveedor_sugerido: solicitud.proveedor_sugerido || null,
        notas: solicitud.notas || null,
        updated_at: new Date().toISOString()
      };

      const extendedPayload = {
        ...basePayload,
        encargado_compra: solicitud.encargado_compra || 'Wendy',
        categoria: solicitud.categoria || null,
        tipo_compra: solicitud.tipo_compra || 'internet',
        plataforma_tienda: solicitud.plataforma_tienda || null,
        numero_pedido: solicitud.numero_pedido || null,
        transportadora: solicitud.transportadora || null,
        numero_guia: solicitud.numero_guia || null,
        enlace_rastreo: solicitud.enlace_rastreo || null,
        fecha_estimada_llegada: solicitud.fecha_estimada_llegada || null,
        costo_estimado: Number(solicitud.costo_estimado) || 0,
        costo_real: Number(solicitud.costo_real) || 0,
        fecha_atendida: solicitud.fecha_atendida || null,
        origen_tipo: solicitud.origen_tipo || 'manual',
        catalogo_tipo: solicitud.catalogo_tipo || null,
        catalogo_item_id: solicitud.catalogo_item_id || null,
        stock_reabastecido: Boolean(solicitud.stock_reabastecido)
      };

      let { error } = await supabase!
        .from('solicitudes_insumos')
        .upsert(extendedPayload, { onConflict: 'id' });

      if (error && (error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message || ''))) {
        const retry = await supabase!
          .from('solicitudes_insumos')
          .upsert(basePayload, { onConflict: 'id' });
        error = retry.error;
      }

      if (error) {
        console.warn('Error saving solicitud_insumo in Supabase:', error.message);
        return false;
      }
      this.broadcastChange('solicitud', 'upsert');
      return true;
    } catch (e) {
      console.warn('Exception in saveSolicitudInsumo:', e);
      return false;
    }
  },

  // 17.1 Eliminar Solicitud de Insumo en Supabase
  async deleteSolicitudInsumo(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!
        .from('solicitudes_insumos')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Error deleting solicitud_insumo in Supabase:', error.message);
        return false;
      }
      this.broadcastChange('solicitud', 'delete');
      return true;
    } catch (e) {
      console.warn('Exception in deleteSolicitudInsumo:', e);
      return false;
    }
  },

  // 18. Traer Productos en Stock desde Supabase
  async fetchProductosStock(): Promise<ProductoStock[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('productos_stock')
        .select('*')
        .or('activo.eq.true,activo.is.null')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error fetching productos_stock:', error.message);
        return null;
      }
      return (data || []).map((row: any): ProductoStock => ({
        id: row.id,
        codigo: row.codigo || undefined,
        nombre: row.nombre,
        categoria: row.categoria || 'Figuras & Miniaturas',
        precio_unitario: Number(row.precio_unitario ?? row.precio_venta) || 0,
        stock_actual: Number(row.stock_actual) || 0,
        descripcion: row.descripcion || '',
        dimensiones: row.dimensiones || '',
        material: row.material || 'Resina UV Alta Definición',
        imagen_url: row.imagen_url || '',
        fecha_actualizacion: row.fecha_actualizacion || row.updated_at || new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Exception in fetchProductosStock:', e);
      return null;
    }
  },

  // 19. Guardar o Actualizar Producto en Stock
  async saveProductoStock(prod: ProductoStock): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: prod.id,
        codigo: String(prod.codigo || ''),
        nombre: prod.nombre,
        categoria: prod.categoria,
        precio_unitario: prod.precio_unitario,
        stock_actual: prod.stock_actual,
        descripcion: prod.descripcion || null,
        dimensiones: prod.dimensiones || null,
        material: prod.material || null,
        imagen_url: prod.imagen_url || null,
        fecha_actualizacion: new Date().toISOString()
      };

      const { error } = await supabase!
        .from('productos_stock')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Error saving producto_stock in Supabase:', error.message);
        return false;
      }
      this.broadcastChange('stock', 'upsert');
      return true;
    } catch (e) {
      console.warn('Exception in saveProductoStock:', e);
      return false;
    }
  },

  // 20. Sincronizar Resinas en Supabase
  async saveResina(resina: Resina): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(resina.id);
      resina.id = validId;
      const payload = {
        id: validId,
        tipo: resina.tipo,
        marca: resina.marca,
        color: resina.color,
        volumen_l: Number(resina.volumen_l) || 1.0,
        densidad_g_cm3: Number(resina.densidad_g_cm3) || 1.13,
        peso_g: Number(resina.peso_g) || 1130,
        precio_compra: Number(resina.precio_compra) || 89000,
        costo_gramo: Number(resina.costo_gramo) || 78.76,
        velocidad_impresion_mm_h: Number(resina.velocidad_impresion_mm_h) || 20,
        imagen_url: resina.imagen_url || null
      };
      const { error } = await supabase!.from('resinas').upsert(payload, { onConflict: 'id' });
      if (!error) this.broadcastChange('resina', 'upsert');
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 20.01 Sincronizar Filamento en Supabase (mapeado exacto a columnas temperatura_extrusor_c / temperatura_cama_c)
  async saveFilamento(filamento: Filamento): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(filamento.id);
      filamento.id = validId;
      const payload = {
        id: validId,
        marca: filamento.marca,
        tipo: filamento.tipo,
        color: filamento.color,
        peso_bobina_g: Number(filamento.peso_bobina_g) || 1000,
        precio_compra: Number(filamento.precio_compra) || 85000,
        costo_gramo: Number(filamento.costo_gramo) || 85,
        stock_actual_g: Number(filamento.stock_actual_g ?? 1000),
        temperatura_extrusor_c: filamento.temperatura_nozzle ? Number(filamento.temperatura_nozzle) : 215,
        temperatura_cama_c: filamento.temperatura_bed ? Number(filamento.temperatura_bed) : 60,
        enlace_compra: filamento.enlace_compra || null,
        activo: filamento.activo !== false
      };
      const { error } = await supabase!.from('filamentos').upsert(payload, { onConflict: 'id' });
      if (!error) this.broadcastChange('filamento', 'upsert');
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 20.02 Traer Filamentos desde Supabase
  async fetchFilamentos(): Promise<Filamento[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('filamentos')
        .select('*')
        .order('tipo', { ascending: true });

      if (error) {
        console.warn('Info/Warning fetching filamentos from Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];
      return data
        .map((row: any): Filamento => ({
          id: row.id,
          marca: row.marca || 'Genérico',
          tipo: row.tipo || 'PLA',
          color: row.color || 'Negro',
          peso_bobina_g: Number(row.peso_bobina_g) || 1000,
          precio_compra: Number(row.precio_compra) || 85000,
          costo_gramo: Number(row.costo_gramo) || 85,
          stock_actual_g: row.stock_actual_g !== undefined && row.stock_actual_g !== null ? Number(row.stock_actual_g) : 1000,
          temperatura_nozzle: Number(row.temperatura_extrusor_c ?? row.temperatura_nozzle) || 215,
          temperatura_bed: Number(row.temperatura_cama_c ?? row.temperatura_bed) || 60,
          densidad_g_cm3: Number(row.densidad_g_cm3) || 1.24,
          enlace_compra: row.enlace_compra || '',
          imagen_url: row.imagen_url || '',
          activo: row.activo !== false
        }))
        .sort((a, b) => `${a.marca} ${a.tipo} ${a.color}`.trim().localeCompare(`${b.marca} ${b.tipo} ${b.color}`.trim()));
    } catch (e) {
      console.warn('Exception in fetchFilamentos:', e);
      return null;
    }
  },

  // 20.03 Eliminar Filamento en Supabase
  async deleteFilamento(id: string, marcaTipo?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('filamentos').delete().eq('id', id);
      if (!error) {
        this.broadcastChange('filamento', 'delete');
        return true;
      }
      if (marcaTipo) {
        const { error: err2 } = await supabase!.from('filamentos').delete().ilike('tipo', `%${marcaTipo}%`);
        if (!err2) this.broadcastChange('filamento', 'delete');
        return !err2;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  // 20.04 Guardar Registro de Producción Interna en Supabase
  async saveProduccionInterna(reg: RegistroProduccionInterna): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(reg.id);
      reg.id = validId;
      const payload = {
        id: validId,
        nombre_pieza: reg.nombre_pieza,
        motivo: reg.motivo,
        tecnologia: reg.tecnologia,
        material_id: reg.material_id,
        material_nombre: reg.material_nombre,
        peso_consumido_g: Number(reg.peso_consumido_g) || 0,
        tiempo_minutos: Number(reg.tiempo_minutos) || 0,
        costo_total_estimado: Number(reg.costo_total_estimado) || 0,
        maquina_id: reg.maquina_id || null,
        maquina_nombre: reg.maquina_nombre || null,
        fecha: reg.fecha || new Date().toISOString(),
        responsable: reg.responsable || 'Germán',
        notas: reg.notas || null
      };
      const { error } = await supabase!.from('produccion_interna').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 20.05 Traer Registros de Producción Interna desde Supabase
  async fetchProduccionInterna(): Promise<RegistroProduccionInterna[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('produccion_interna')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.warn('Info fetching produccion_interna from Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];
      return data.map((row: any): RegistroProduccionInterna => ({
        id: row.id,
        nombre_pieza: row.nombre_pieza || 'Pieza Interna',
        motivo: row.motivo || 'EXHIBICION',
        tecnologia: row.tecnologia || 'FDM_FILAMENTO',
        material_id: row.material_id || '',
        material_nombre: row.material_nombre || '',
        peso_consumido_g: Number(row.peso_consumido_g) || 0,
        tiempo_minutos: Number(row.tiempo_minutos) || 0,
        costo_total_estimado: Number(row.costo_total_estimado) || 0,
        maquina_id: row.maquina_id || undefined,
        maquina_nombre: row.maquina_nombre || undefined,
        fecha: row.fecha || new Date().toISOString(),
        responsable: row.responsable || 'Taller',
        notas: row.notas || ''
      }));
    } catch (e) {
      return null;
    }
  },

  async deleteProduccionInterna(id: string): Promise<boolean> {
    if (!this.isAvailable() || !id) return false;
    try {
      const { error } = await supabase!.from('produccion_interna').delete().eq('id', id);
      if (error) {
        console.warn('Error deleting produccion_interna:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // 21. Sincronizar Insumos en Supabase (incluye stock_actual y unidad_medida)
  async saveInsumo(insumo: Insumo): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(insumo.id);
      insumo.id = validId;
      const payload = {
        id: validId,
        codigo_item: Number(insumo.codigo) || 1,
        nombre: insumo.nombre,
        marca: insumo.marca,
        categoria: insumo.categoria,
        cantidad_presentacion: Number(insumo.presentacion) || 1,
        unidad_medida: insumo.unidad_medida || 'und',
        stock_actual: insumo.stock_actual !== undefined ? Number(insumo.stock_actual) : (Number(insumo.presentacion) || 0),
        costo_total: Number(insumo.costo_total) || 0,
        costo_unitario: Number(insumo.costo_unitario) || 0,
        enlace_compra: insumo.enlace_compra || null,
        descripcion: insumo.descripcion || null,
        imagen_url: insumo.imagen_url || null
      };
      const { error } = await supabase!.from('insumos').upsert(payload, { onConflict: 'id' });
      if (!error) this.broadcastChange('insumo', 'upsert');
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 21.04 Traer Maquinaria desde Supabase (con Repuestos y Desglose por Modelo)
  async fetchMaquinas(): Promise<Maquina[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('maquinas')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error fetching maquinas from Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];
      return data.map((row: any): Maquina => {
        let repuestosParsed: RepuestoMaquina[] = [];
        if (row.repuestos) {
          try {
            repuestosParsed = typeof row.repuestos === 'string' ? JSON.parse(row.repuestos) : row.repuestos;
          } catch (_) {
            repuestosParsed = [];
          }
        }

        // Si la máquina no tiene repuestos en Supabase, asignar el tarifario de fábrica según modelo
        if (!Array.isArray(repuestosParsed) || repuestosParsed.length === 0) {
          const nom = (row.nombre || '').toLowerCase();
          if (nom.includes('mono 4') || nom.includes('mono 2') || (nom.includes('resina') && !nom.includes('6k'))) {
            repuestosParsed = [
              { id: `rep-${row.id}-fep`, nombre: 'Film FEP / Release Film', costo_compra: 75000, vida_util_horas: 300, costo_hora: 250, costo_minuto: 4.167, activo: true },
              { id: `rep-${row.id}-lcd`, nombre: 'Pantalla LCD 4K Monocromática', costo_compra: 180000, vida_util_horas: 2000, costo_hora: 90, costo_minuto: 1.5, activo: true }
            ];
          } else if (nom.includes('6k') || nom.includes('mono x')) {
            repuestosParsed = [
              { id: `rep-${row.id}-fep6k`, nombre: 'Film FEP Gran Formato', costo_compra: 85000, vida_util_horas: 300, costo_hora: 283.33, costo_minuto: 4.722, activo: true },
              { id: `rep-${row.id}-lcd6k`, nombre: 'Pantalla LCD 6Ks 9.1 pulgadas', costo_compra: 220000, vida_util_horas: 2000, costo_hora: 110, costo_minuto: 1.833, activo: true }
            ];
          } else if (nom.includes('bambu') || nom.includes('p1s') || nom.includes('p2s') || nom.includes('x1')) {
            repuestosParsed = [
              { id: `rep-${row.id}-nozzle`, nombre: 'Hotend & Boquilla Endurecida', costo_compra: 45000, vida_util_horas: 600, costo_hora: 75, costo_minuto: 1.25, activo: true },
              { id: `rep-${row.id}-bed`, nombre: 'Placa Texturada PEI & Lubricación', costo_compra: 40000, vida_util_horas: 1000, costo_hora: 40, costo_minuto: 0.667, activo: true }
            ];
          } else if (nom.includes('kobra') || nom.includes('ender') || nom.includes('fdm') || nom.includes('filamento')) {
            repuestosParsed = [
              { id: `rep-${row.id}-nozzle`, nombre: 'Boquilla Latón 0.4mm', costo_compra: 25000, vida_util_horas: 500, costo_hora: 50, costo_minuto: 0.833, activo: true }
            ];
          }
        }

        const consumo = Number(row.consumo_kwh) || 0.05;
        const costo_minuto_energia = (consumo * 834.0) / 60;
        const costo_minuto_repuestos = repuestosParsed
          .filter(r => r.activo !== false)
          .reduce((sum, r) => sum + (Number(r.costo_minuto) || 0), 0);
        const costo_total_min = costo_minuto_energia + costo_minuto_repuestos;

        let tecnologia = row.tecnologia;
        if (!tecnologia) {
          const nom = (row.nombre || '').toLowerCase() + ' ' + (row.tipo || '').toLowerCase();
          if (nom.includes('fdm') || nom.includes('filamento') || nom.includes('bambu') || nom.includes('kobra') || nom.includes('ender')) {
            tecnologia = 'FDM_FILAMENTO';
          } else if (nom.includes('laser') || nom.includes('láser')) {
            tecnologia = 'CORTE_LASER';
          } else if (nom.includes('cnc') || nom.includes('router')) {
            tecnologia = 'CNC_ROUTER';
          } else {
            tecnologia = 'SLA_RESINA';
          }
        }

        return {
          id: row.id,
          nombre: row.nombre,
          tipo: row.tipo || 'Impresora 3D',
          tecnologia,
          consumo_kwh: consumo,
          costo_minuto: Number(row.costo_minuto) > 0 ? Number(row.costo_minuto) : Number(costo_total_min.toFixed(4)),
          costo_minuto_energia: Number(costo_minuto_energia.toFixed(4)),
          costo_minuto_repuestos: Number(costo_minuto_repuestos.toFixed(4)),
          estado: row.estado || 'Disponible',
          imagen_url: row.imagen_url || undefined,
          repuestos: repuestosParsed,
          precio_compra: row.precio_compra !== undefined ? Number(row.precio_compra) : 0,
          vida_util_horas: row.vida_util_horas !== undefined && Number(row.vida_util_horas) > 0 ? Number(row.vida_util_horas) : 4000,
          mantenimiento_mensual: row.mantenimiento_mensual !== undefined ? Number(row.mantenimiento_mensual) : 0
        };
      }).sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (e) {
      console.warn('Exception in fetchMaquinas:', e);
      return null;
    }
  },

  // 21.05 Sincronizar Maquinaria en Supabase (con repuestos y amortización + fallback defensivo)
  async saveMaquina(maquina: Maquina): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(maquina.id);
      maquina.id = validId;

      const basePayload: any = {
        id: validId,
        nombre: maquina.nombre,
        tipo: maquina.tipo || 'Impresora 3D',
        tecnologia: maquina.tecnologia || (maquina.tipo?.toLowerCase().includes('filamento') || maquina.tipo?.toLowerCase().includes('fdm') ? 'FDM_FILAMENTO' : 'SLA_RESINA'),
        consumo_kwh: Number(maquina.consumo_kwh) || 0.05,
        costo_minuto: Number(maquina.costo_minuto) || 0,
        estado: maquina.estado || 'Disponible',
        imagen_url: maquina.imagen_url || null
      };

      const extendedPayload: any = {
        ...basePayload,
        repuestos: Array.isArray(maquina.repuestos) ? maquina.repuestos : [],
        precio_compra: Number(maquina.precio_compra) || 0,
        vida_util_horas: Number(maquina.vida_util_horas) || 4000,
        mantenimiento_mensual: Number(maquina.mantenimiento_mensual) || 0
      };

      let { error } = await supabase!.from('maquinas').upsert(extendedPayload, { onConflict: 'id' });
      if (error && (error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message || ''))) {
        const retry = await supabase!.from('maquinas').upsert(basePayload, { onConflict: 'id' });
        error = retry.error;
      }
      if (error) {
        console.warn('Error saving maquina in Supabase:', error.message);
        return false;
      }
      this.broadcastChange('maquina', 'upsert');
      return true;
    } catch (e) {
      return false;
    }
  },

  // 21.06 Eliminar Maquinaria en Supabase
  async deleteMaquina(id: string, nombre?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      if (UUID_REGEX.test(id)) {
        const { error } = await supabase!.from('maquinas').delete().eq('id', id);
        if (!error) {
          this.broadcastChange('maquina', 'delete');
          return true;
        }
      }
      if (nombre) {
        const { error } = await supabase!.from('maquinas').delete().ilike('nombre', `%${nombre}%`);
        if (!error) this.broadcastChange('maquina', 'delete');
        return !error;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  // 21.07 Traer Insumos desde Supabase
  async fetchInsumos(): Promise<Insumo[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('insumos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error fetching insumos from Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];
      return data.map((row: any): Insumo => ({
        id: row.id,
        codigo: Number(row.codigo_item || row.codigo) || 1,
        nombre: row.nombre,
        marca: row.marca || 'Genérico',
        categoria: row.categoria || 'General',
        presentacion: Number(row.cantidad_presentacion || row.presentacion) || 1,
        costo_total: Number(row.costo_total) || 0,
        costo_unitario: Number(row.costo_unitario) || 0,
        stock_actual: row.stock_actual !== undefined && row.stock_actual !== null ? Number(row.stock_actual) : undefined,
        permite_fraccion: row.permite_fraccion !== undefined && row.permite_fraccion !== null ? Boolean(row.permite_fraccion) : undefined,
        unidad_medida: row.unidad_medida || undefined,
        enlace_compra: row.enlace_compra || '',
        descripcion: row.descripcion || '',
        imagen_url: row.imagen_url || ''
      }));
    } catch (e) {
      console.warn('Exception in fetchInsumos:', e);
      return null;
    }
  },

  // 21.08 Eliminar Insumo en Supabase
  async deleteInsumo(id: string, nombre?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      if (UUID_REGEX.test(id)) {
        const { error } = await supabase!.from('insumos').delete().eq('id', id);
        if (!error) {
          this.broadcastChange('insumo', 'delete');
          return true;
        }
      }
      if (nombre) {
        const { error } = await supabase!.from('insumos').delete().ilike('nombre', `%${nombre}%`);
        if (!error) this.broadcastChange('insumo', 'delete');
        return !error;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  // 21.09 Traer Resinas desde Supabase
  async fetchResinas(): Promise<Resina[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('resinas')
        .select('*')
        .order('tipo', { ascending: true });

      if (error) {
        console.warn('Error fetching resinas from Supabase:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];
      return data
        .map((row: any): Resina => ({
          id: row.id,
          tipo: row.tipo,
          marca: row.marca || 'Anycubic',
          color: row.color || 'Gris',
          volumen_l: Number(row.volumen_l) || 1.0,
          densidad_g_cm3: Number(row.densidad_g_cm3) || 1.13,
          peso_g: Number(row.peso_g) || 1130,
          precio_compra: Number(row.precio_compra) || 89000,
          costo_gramo: Number(row.costo_gramo) || 78.76,
          velocidad_impresion_mm_h: Number(row.velocidad_impresion_mm_h) || 20,
          resumen: row.resumen || `${row.tipo} Color ${row.color}`,
          imagen_url: row.imagen_url || ''
        }))
        .sort((a, b) => `${a.tipo} ${a.color}`.trim().localeCompare(`${b.tipo} ${b.color}`.trim()));
    } catch (e) {
      console.warn('Exception in fetchResinas:', e);
      return null;
    }
  },

  // 21.10 Eliminar Resina en Supabase
  async deleteResina(id: string, resumen?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      if (UUID_REGEX.test(id)) {
        const { error } = await supabase!.from('resinas').delete().eq('id', id);
        if (!error) {
          this.broadcastChange('resina', 'delete');
          return true;
        }
      }
      if (resumen) {
        const { error } = await supabase!.from('resinas').delete().ilike('tipo', `%${resumen}%`);
        if (!error) this.broadcastChange('resina', 'delete');
        return !error;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  // 21.11 Traer Configuración del Taller (Tarifa de Luz, Bancos) desde Supabase
  async fetchConfiguracion(): Promise<ConfiguracionTaller | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('configuracion_taller')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching configuracion_taller:', error.message);
        return null;
      }
      if (!data) return null;
      return {
        tarifa_kwh: Number(data.tarifa_kwh) || 834,
        margen_merma_resina: Number(data.margen_merma_resina) || 1.4,
        margen_merma_fdm: Number(data.margen_merma_fdm) || 5.0,
        telefono_contacto: data.telefono_contacto || '+57 320 2796115',
        telefono_contacto2: data.telefono_contacto2 || '+57 321 7273025',
        correo: data.correo || 'wjgeeks3d@gmail.com',
        instagram: data.instagram || '@wjgeeks3d',
        nequi: data.nequi || '3202796115',
        bre_b: data.bre_b || '0090778625',
        titular_cuenta: data.titular_cuenta || 'WJGEEKS 3D PRO',
        tasa_fallo_sla_pct: data.tasa_fallo_sla_pct !== undefined ? Number(data.tasa_fallo_sla_pct) : 10,
        tasa_fallo_fdm_pct: data.tasa_fallo_fdm_pct !== undefined ? Number(data.tasa_fallo_fdm_pct) : 5,
        gastos_fijos_mensuales: data.gastos_fijos_mensuales !== undefined ? Number(data.gastos_fijos_mensuales) : 0,
        horas_facturables_mes: data.horas_facturables_mes !== undefined && Number(data.horas_facturables_mes) > 0 ? Number(data.horas_facturables_mes) : 160,
        consumibles_sla_por_impresion: data.consumibles_sla_por_impresion !== undefined ? Number(data.consumibles_sla_por_impresion) : 1500,
        precio_minimo_trabajo: data.precio_minimo_trabajo !== undefined ? Number(data.precio_minimo_trabajo) : 15000,
        comision_pasarela_default_pct: data.comision_pasarela_default_pct !== undefined ? Number(data.comision_pasarela_default_pct) : 0,
        modo_margen_default: (data.modo_margen_default === 'markup' ? 'markup' : 'margen_bruto'),
        piso_margen_alerta_pct: data.piso_margen_alerta_pct !== undefined ? Number(data.piso_margen_alerta_pct) : 20,
        whatsapp_gateway_url: data.whatsapp_gateway_url || 'https://wjg.onrender.com',
        whatsapp_auto_send: data.whatsapp_auto_send !== undefined ? Boolean(data.whatsapp_auto_send) : true,
        whatsapp_internal_group_jid: data.whatsapp_internal_group_jid || undefined,
        whatsapp_internal_group_name: data.whatsapp_internal_group_name || undefined,
        whatsapp_grupos_config: (data.whatsapp_grupos_config && typeof data.whatsapp_grupos_config === 'object') ? data.whatsapp_grupos_config : {},
        email_apps_script_url: data.email_apps_script_url || undefined,
        email_auto_send: data.email_auto_send !== undefined ? Boolean(data.email_auto_send) : true
      };
    } catch (e) {
      console.warn('Exception in fetchConfiguracion:', e);
      return null;
    }
  },

  // 21.12 Guardar Configuración del Taller en Supabase (Con columnas Cotizador 2.0 y fallback defensivo)
  async saveConfiguracion(cfg: ConfiguracionTaller): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const basePayload: any = {
        tarifa_kwh: Number(cfg.tarifa_kwh) || 834,
        margen_merma_resina: Number(cfg.margen_merma_resina) || 1.4,
        margen_merma_fdm: Number(cfg.margen_merma_fdm) || 5.0,
        nequi: cfg.nequi || '',
        bre_b: cfg.bre_b || '',
        instagram: cfg.instagram || '',
        correo: cfg.correo || 'wjgeeks3d@gmail.com',
        telefono_contacto: cfg.telefono_contacto || '',
        telefono_contacto2: cfg.telefono_contacto2 || '',
        titular_cuenta: cfg.titular_cuenta || '',
        updated_at: new Date().toISOString()
      };

      const extendedPayload: any = {
        ...basePayload,
        tasa_fallo_sla_pct: cfg.tasa_fallo_sla_pct !== undefined ? Number(cfg.tasa_fallo_sla_pct) : 10,
        tasa_fallo_fdm_pct: cfg.tasa_fallo_fdm_pct !== undefined ? Number(cfg.tasa_fallo_fdm_pct) : 5,
        gastos_fijos_mensuales: Number(cfg.gastos_fijos_mensuales) || 0,
        horas_facturables_mes: Number(cfg.horas_facturables_mes) > 0 ? Number(cfg.horas_facturables_mes) : 160,
        consumibles_sla_por_impresion: cfg.consumibles_sla_por_impresion !== undefined ? Number(cfg.consumibles_sla_por_impresion) : 1500,
        precio_minimo_trabajo: cfg.precio_minimo_trabajo !== undefined ? Number(cfg.precio_minimo_trabajo) : 15000,
        comision_pasarela_default_pct: Number(cfg.comision_pasarela_default_pct) || 0,
        modo_margen_default: cfg.modo_margen_default || 'margen_bruto',
        piso_margen_alerta_pct: cfg.piso_margen_alerta_pct !== undefined ? Number(cfg.piso_margen_alerta_pct) : 20,
        whatsapp_gateway_url: cfg.whatsapp_gateway_url || 'https://wjg.onrender.com',
        whatsapp_auto_send: cfg.whatsapp_auto_send !== undefined ? Boolean(cfg.whatsapp_auto_send) : true,
        whatsapp_internal_group_jid: cfg.whatsapp_internal_group_jid || null,
        whatsapp_internal_group_name: cfg.whatsapp_internal_group_name || null,
        whatsapp_grupos_config: cfg.whatsapp_grupos_config || {},
        email_apps_script_url: cfg.email_apps_script_url || null,
        email_auto_send: cfg.email_auto_send !== undefined ? Boolean(cfg.email_auto_send) : true
      };

      const { data: existing } = await supabase!.from('configuracion_taller').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        let { error } = await supabase!.from('configuracion_taller').update({ ...extendedPayload, id: existing.id }).eq('id', existing.id);
        if (error && (error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message || ''))) {
          const retry = await supabase!.from('configuracion_taller').update({ ...basePayload, id: existing.id }).eq('id', existing.id);
          error = retry.error;
        }
        if (!error) this.broadcastChange('configuracion', 'upsert');
        return !error;
      } else {
        let { error } = await supabase!.from('configuracion_taller').insert([extendedPayload]);
        if (error && (error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message || ''))) {
          const retry = await supabase!.from('configuracion_taller').insert([basePayload]);
          error = retry.error;
        }
        if (!error) this.broadcastChange('configuracion', 'upsert');
        return !error;
      }
    } catch (e) {
      console.warn('Exception saving configuracion_taller:', e);
      return false;
    }
  },

  // 21.13 Traer Tarifas de Personal desde Supabase (Unificado canónicamente con usuarios_taller)
  async fetchTarifasPersonal(): Promise<Personal[] | null> {
    if (!this.isAvailable()) return null;
    try {
      let { data, error } = await supabase!
        .from('usuarios_taller')
        .select('id, nombre, rol, area_responsabilidad, costo_hora, costo_minuto, aplica_mano_obra, activo')
        .order('nombre', { ascending: true });

      if (error && (error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message || ''))) {
        const retry = await supabase!
          .from('usuarios_taller')
          .select('id, nombre, rol, costo_hora, costo_minuto, activo')
          .order('nombre', { ascending: true });
        data = retry.data as any;
        error = retry.error;
      }

      if (error) {
        console.warn('Error fetching personal unificado desde usuarios_taller:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];

      const inferArea = (nom?: string, area?: string | null) => {
        if (area && area.trim()) return area.trim();
        const n = (nom || '').toLowerCase();
        if (n.includes('germ')) return 'Aplicación, Backoffice, Ventas y Redes';
        if (n.includes('juan')) return 'Encargado del Taller (Impresión 3D y Mantenimiento)';
        if (n.includes('wendy')) return 'Pintura, Acabados y Redes';
        return 'Operador Multifunción';
      };

      return (data as any[])
        .filter(row => row.activo !== false)
        .map((row: any): Personal => {
          const costoHora = Number(row.costo_hora) > 0 ? Number(row.costo_hora) : 10000;
          const costoMin = Number(row.costo_minuto) > 0 ? Number(row.costo_minuto) : Number((costoHora / 60).toFixed(2));
          return {
            id: row.id,
            nombre: row.nombre || 'Operador',
            rol: row.rol || row.nombre || 'ADMIN_COBRANZAS',
            area_responsabilidad: inferArea(row.nombre, row.area_responsabilidad),
            aplica_mano_obra: row.aplica_mano_obra !== undefined ? Boolean(row.aplica_mano_obra) : true,
            costo_hora: costoHora,
            costo_minuto: costoMin
          };
        });
    } catch (e) {
      return null;
    }
  },

  // 21.14 Guardar Tarifa de Personal en Supabase (Actualiza costo_hora y costo_minuto en usuarios_taller)
  async saveTarifaPersonal(p: Personal): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
      const baseUpdate = {
        costo_hora: p.costo_hora,
        costo_minuto: p.costo_minuto
      };
      const extendedUpdate = {
        ...baseUpdate,
        ...(p.area_responsabilidad ? { area_responsabilidad: p.area_responsabilidad } : {}),
        ...(p.aplica_mano_obra !== undefined ? { aplica_mano_obra: p.aplica_mano_obra } : {})
      };

      const applyFilter = (q: any) => (isUuid ? q.eq('id', p.id) : q.ilike('rol', `%${p.rol}%`));
      let { error } = await applyFilter(supabase!.from('usuarios_taller').update(extendedUpdate));
      if (error && (error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message || ''))) {
        const retry = await applyFilter(supabase!.from('usuarios_taller').update(baseUpdate));
        error = retry.error;
      }
      if (!error) this.broadcastChange('personal', 'upsert');
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 21.15 Eliminar Tarifa de Personal en Supabase (Mantiene integridad de usuarios_taller)
  async deleteTarifaPersonal(_id: string): Promise<boolean> {
    return true;
  },

  // 21.16 Traer Proveedores desde Supabase
  async fetchProveedores(): Promise<Proveedor[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!.from('proveedores').select('*').order('nombre', { ascending: true });
      if (error) return null;
      if (!data || data.length === 0) return [];
      return data.map((row: any): Proveedor => ({
        id: row.id,
        nombre: row.nombre,
        contacto: row.contacto || '',
        telefono: row.telefono || '',
        rubro: row.rubro || 'Insumos 3D',
        enlace_web: row.enlace_web || ''
      })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    } catch (e) {
      return null;
    }
  },

  // 21.17 Guardar Proveedor en Supabase
  async saveProveedor(pr: Proveedor): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: pr.id,
        nombre: pr.nombre,
        contacto: pr.contacto || null,
        telefono: pr.telefono || null,
        rubro: pr.rubro || 'Insumos 3D',
        enlace_web: pr.enlace_web || null
      };
      const { error } = await supabase!.from('proveedores').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 21.18 Eliminar Proveedor en Supabase
  async deleteProveedor(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('proveedores').delete().eq('id', id);
      return !error;
    } catch (e) {
      return false;
    }
  },


  // 21.20 Guardar Tarifa por Tamaño en Supabase
  async saveTarifaTamano(tarifa: TarifaTamano): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: tarifa.id,
        altura_cm: tarifa.altura_cm,
        precio_sugerido: tarifa.precio_sugerido,
        descripcion: tarifa.descripcion || null,
        tiempo_estimado: tarifa.tiempo_estimado || null
      };
      const { error } = await supabase!.from('tarifas_tamanos').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 21.21 Eliminar Tarifa por Tamaño en Supabase
  async deleteTarifaTamano(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('tarifas_tamanos').delete().eq('id', id);
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 21.1 Guardar transacción centralizada en Ledger Inmutable (abonos_pagos Core V3) con Anti-Double-Click 5s
  async savePayment(payment: PaymentRecord, skipDedup: boolean = false): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const montoNum = Number(payment.monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        console.warn(`[savePayment] Monto inválido ($${payment.monto}). Debe ser mayor a 0 para el ledger.`);
        return false;
      }

      // Prevención de doble clic y cobros duplicados en intervalo menor a 5 segundos (excepto en reconciliación manual)
      if (!skipDedup) {
        const dedupKey = `${payment.orden_trabajo_id || payment.cotizacion_id || payment.cuenta_cobro_id || payment.pos_venta_id || 'ot'}_${montoNum}_${(payment.referencia_pago || '').trim().toLowerCase()}`;
        const lastSaved = recentPaymentsCache.get(dedupKey);
        const now = Date.now();
        if (lastSaved && (now - lastSaved) < 5000) {
          const segRestantes = Math.round((5000 - (now - lastSaved)) / 1000);
          console.warn(`[Anti-Double-Click] Cobro idéntico prevenido: ${dedupKey} (${segRestantes}s restantes antes de reintento).`);
          return false;
        }
        recentPaymentsCache.set(dedupKey, now);

        // Limpieza periódica de llaves antiguas en caché
        if (recentPaymentsCache.size > 200) {
          for (const [key, ts] of recentPaymentsCache.entries()) {
            if (now - ts > 10000) recentPaymentsCache.delete(key);
          }
        }
      }

      // Normalización estricta al ENUM tipo_metodo_pago de PostgreSQL
      const normalizarMetodoPago = (metodo?: string): 'NEQUI' | 'BRE_B' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' => {
        if (!metodo) return 'BRE_B';
        const m = metodo.toUpperCase().trim();
        if (m.includes('NEQUI')) return 'NEQUI';
        if (m.includes('EFECTIVO') || m.includes('CASH')) return 'EFECTIVO';
        if (m.includes('TRANSF') || m.includes('BANCO') || m.includes('DAVIPLATA')) return 'TRANSFERENCIA';
        if (m.includes('TARJETA') || m.includes('DATAFONO') || m.includes('DATÁFONO') || m.includes('CARD') || m.includes('CREDITO') || m.includes('DEBITO')) return 'TARJETA';
        return 'BRE_B';
      };

      const metodoFinal = normalizarMetodoPago(payment.metodo_pago);
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Validación estricta de UUID para cotizacion_id
      const cotUuid = (payment.cotizacion_id && UUID_REGEX.test(payment.cotizacion_id)) ? payment.cotizacion_id : null;

      // Validación estricta de UUID para orden_trabajo_id
      let otUuid: string | null = null;
      let posVentaId = payment.pos_venta_id || null;

      if (payment.orden_trabajo_id) {
        if (UUID_REGEX.test(payment.orden_trabajo_id)) {
          otUuid = payment.orden_trabajo_id;
        } else {
          // Búsqueda segura por numero_ot
          try {
            const { data: otRow } = await supabase!
              .from('ordenes_trabajo')
              .select('id')
              .eq('numero_ot', payment.orden_trabajo_id)
              .maybeSingle();
            if (otRow?.id && UUID_REGEX.test(otRow.id)) {
              otUuid = otRow.id;
            } else {
              // Si no es UUID ni se encuentra como OT, almacenar como referencia en pos_venta_id
              if (!posVentaId) posVentaId = payment.orden_trabajo_id;
            }
          } catch (_) {}
        }
      }

      // Si aún no tenemos otUuid pero sí posVentaId, intentar resolver la OT por pos_venta_id
      if (!otUuid && posVentaId) {
        try {
          const { data: otRow } = await supabase!
            .from('ordenes_trabajo')
            .select('id')
            .eq('pos_venta_id', posVentaId)
            .maybeSingle();
          if (otRow?.id && UUID_REGEX.test(otRow.id)) {
            otUuid = otRow.id;
          }
        } catch (_) {}
      }

      const cuentaReceptora = metodoFinal === 'NEQUI' 
        ? 'Nequi 3217273025 (Juan)' 
        : metodoFinal === 'EFECTIVO'
        ? 'Caja Efectivo Taller'
        : 'Bre-B 0090778625 (Germán)';

      // Ventana anti-duplicados en Supabase (120s): evita registrar dos pagos idénticos sobre la misma entidad
      if (!skipDedup && (posVentaId || payment.cuenta_cobro_id || otUuid || cotUuid)) {
        try {
          const twoMinsAgo = new Date(Date.now() - 120000).toISOString();
          const dedupFilters: string[] = [];
          if (posVentaId) dedupFilters.push(`pos_venta_id.eq.${posVentaId}`);
          if (payment.cuenta_cobro_id) dedupFilters.push(`cuenta_cobro_id.eq.${payment.cuenta_cobro_id}`);
          if (otUuid) dedupFilters.push(`orden_trabajo_id.eq.${otUuid}`);
          if (cotUuid) dedupFilters.push(`cotizacion_id.eq.${cotUuid}`);

          if (dedupFilters.length > 0) {
            const { data: recentDups } = await supabase!
              .from('abonos_pagos')
              .select('id, monto, created_at')
              .or(dedupFilters.join(','))
              .gte('created_at', twoMinsAgo)
              .eq('monto', montoNum)
              .limit(1);

            if (recentDups && recentDups.length > 0) {
              console.warn(`[Anti-Duplicado BD] Se omitió inserción repetida de $${montoNum} sobre entidad vinculada.`);
              return true;
            }
          }
        } catch (_) {}
      }

      const payload = {
        orden_trabajo_id: otUuid,
        cotizacion_id: cotUuid,
        pos_venta_id: posVentaId,
        cuenta_cobro_id: payment.cuenta_cobro_id || null,
        cliente_id: payment.cliente_id && UUID_REGEX.test(payment.cliente_id) ? payment.cliente_id : null,
        cliente_nombre: payment.cliente_nombre || null,
        origen_modulo: payment.origen_modulo || (posVentaId ? 'pos' : payment.cuenta_cobro_id ? 'cuenta_cobro' : cotUuid ? 'cotizacion' : 'taller'),
        tipo_movimiento: payment.tipo_movimiento || 'INGRESO',
        monto: montoNum,
        metodo_pago: metodoFinal,
        referencia_transaccion: payment.referencia_pago || 'Registro Sistema',
        comprobante_url: payment.comprobante_url || null,
        cuenta_receptora: cuentaReceptora,
        nota: payment.nota || null
      };

      let { error: insertError } = await supabase!
        .from('abonos_pagos')
        .insert(payload);

      // Fallback compatible si pos_venta_id o cuenta_cobro_id aún no existen en el esquema
      if (insertError && (insertError.code === 'PGRST204' || insertError.code === '42703' || /column/i.test(insertError.message || ''))) {
        const corePayPayload = {
          orden_trabajo_id: otUuid,
          cotizacion_id: cotUuid,
          monto: montoNum,
          metodo_pago: metodoFinal,
          referencia_transaccion: payment.referencia_pago || 'Registro Sistema',
          comprobante_url: payment.comprobante_url || null,
          cuenta_receptora: cuentaReceptora,
          nota: payment.nota || null
        };
        const retryRes = await supabase!.from('abonos_pagos').insert(corePayPayload);
        insertError = retryRes.error;
      }

      if (insertError) {
        console.warn('Error asentando en abonos_pagos ledger:', insertError.message);
        return false;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wjg:ledger-updated'));
      }
      return true;
    } catch (e: any) {
      console.warn('Exception saving payment in ledger:', e?.message || e);
      return false;
    }
  },

  // 21.1b Reconciliación Exacta de Abonos en abonos_pagos (Permite incrementar, corregir a la baja o reversar a $0)
  async reconciliarPagoEnLedger(params: {
    pos_venta_id?: string;
    numero_venta?: string;
    cotizacion_id?: string;
    numero_cot?: string;
    orden_trabajo_id?: string;
    numero_ot?: string;
    cuenta_cobro_id?: string;
    nuevoAbonoTotal: number;
    metodo_pago?: string;
    comprobante_url?: string;
    nota?: string;
  }): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const nuevoAbono = Math.max(0, Math.round(Number(params.nuevoAbonoTotal) || 0));

      // Resolver UUID real de OT si llegó numero_ot
      let otUuid: string | undefined = (params.orden_trabajo_id && UUID_REGEX.test(params.orden_trabajo_id))
        ? params.orden_trabajo_id
        : undefined;
      if (!otUuid && (params.numero_ot || (params.orden_trabajo_id && !UUID_REGEX.test(params.orden_trabajo_id)))) {
        const numBuscar = params.numero_ot || params.orden_trabajo_id!;
        try {
          const { data: otRow } = await supabase!
            .from('ordenes_trabajo')
            .select('id')
            .eq('numero_ot', numBuscar)
            .maybeSingle();
          if (otRow?.id && UUID_REGEX.test(otRow.id)) {
            otUuid = otRow.id;
          }
        } catch (_) {}
      }

      // Resolver UUID real de Cotización si llegó numero_cot
      let cotUuid: string | undefined = (params.cotizacion_id && UUID_REGEX.test(params.cotizacion_id))
        ? params.cotizacion_id
        : undefined;
      if (!cotUuid && params.numero_cot) {
        try {
          const { data: cotRow } = await supabase!
            .from('cotizaciones')
            .select('id')
            .eq('numero_cot', params.numero_cot)
            .maybeSingle();
          if (cotRow?.id && UUID_REGEX.test(cotRow.id)) {
            cotUuid = cotRow.id;
          }
        } catch (_) {}
      }

      // Recolectar todos los asientos coincidentes en abonos_pagos sin duplicar por ID
      const matchedMap = new Map<string, any>();
      const conds: string[] = [];
      if (params.pos_venta_id) conds.push(`pos_venta_id.eq.${params.pos_venta_id}`);
      if (params.numero_venta) conds.push(`pos_venta_id.eq.${params.numero_venta}`);
      if (otUuid) conds.push(`orden_trabajo_id.eq.${otUuid}`);
      if (cotUuid) conds.push(`cotizacion_id.eq.${cotUuid}`);
      if (params.cuenta_cobro_id && UUID_REGEX.test(params.cuenta_cobro_id)) {
        conds.push(`cuenta_cobro_id.eq.${params.cuenta_cobro_id}`);
      }

      if (conds.length > 0) {
        const { data: directRows, error: directErr } = await supabase!
          .from('abonos_pagos')
          .select('*')
          .or(conds.join(','));
        if (!directErr && directRows) {
          directRows.forEach((r: any) => {
            if (r?.id) matchedMap.set(r.id, r);
          });
        } else if (directErr) {
          // Fallback compatible si pos_venta_id o cuenta_cobro_id no existen en la tabla
          const safeConds: string[] = [];
          if (otUuid) safeConds.push(`orden_trabajo_id.eq.${otUuid}`);
          if (cotUuid) safeConds.push(`cotizacion_id.eq.${cotUuid}`);
          if (safeConds.length > 0) {
            const { data: fallbackRows } = await supabase!
              .from('abonos_pagos')
              .select('*')
              .or(safeConds.join(','));
            (fallbackRows || []).forEach((r: any) => {
              if (r?.id) matchedMap.set(r.id, r);
            });
          }
        }
      }

      const refsTexto = [params.numero_venta, params.numero_ot, params.numero_cot].filter(Boolean) as string[];
      for (const ref of refsTexto) {
        try {
          const { data: noteRows } = await supabase!
            .from('abonos_pagos')
            .select('*')
            .ilike('nota', `%${ref}%`);
          (noteRows || []).forEach((r: any) => {
            if (r?.id) matchedMap.set(r.id, r);
          });
        } catch (_) {}
      }

      const matchingRows = Array.from(matchedMap.values());
      const sumaActual = Math.round(matchingRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0));

      if (nuevoAbono === sumaActual) {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wjg:ledger-updated'));
        return true;
      }

      // Caso A: Reverso total a $0 o Caso B: Corrección a la baja (< sumaActual)
      if (nuevoAbono <= 0 || nuevoAbono < sumaActual) {
        const idsToDelete = matchingRows.map(r => r.id).filter(Boolean);
        if (idsToDelete.length > 0) {
          await supabase!.from('abonos_pagos').delete().in('id', idsToDelete);
        }
        if (nuevoAbono <= 0) {
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wjg:ledger-updated'));
          return true;
        }
        return await this.savePayment({
          id: `pay-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          monto: nuevoAbono,
          metodo_pago: params.metodo_pago || 'Bre-B',
          referencia_pago: 'Corrección / Ajuste de Abono',
          comprobante_url: params.comprobante_url,
          cotizacion_id: cotUuid || params.cotizacion_id,
          orden_trabajo_id: otUuid || params.orden_trabajo_id,
          pos_venta_id: params.pos_venta_id || params.numero_venta,
          cuenta_cobro_id: params.cuenta_cobro_id,
          origen_modulo: params.pos_venta_id ? 'pos' : (params.cuenta_cobro_id ? 'cuenta_cobro' : 'taller'),
          nota: params.nota || `Ajuste de abono a $${nuevoAbono.toLocaleString('es-CO')} (${params.numero_venta || params.numero_ot || params.numero_cot || 'Registro'})`
        }, true);
      }

      // Caso C: Incremento real (> sumaActual)
      const delta = nuevoAbono - sumaActual;
      return await this.savePayment({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monto: delta,
        metodo_pago: params.metodo_pago || 'Bre-B',
        comprobante_url: params.comprobante_url,
        cotizacion_id: cotUuid || params.cotizacion_id,
        orden_trabajo_id: otUuid || params.orden_trabajo_id,
        pos_venta_id: params.pos_venta_id || params.numero_venta,
        cuenta_cobro_id: params.cuenta_cobro_id,
        origen_modulo: params.pos_venta_id ? 'pos' : (params.cuenta_cobro_id ? 'cuenta_cobro' : 'taller'),
        nota: params.nota || `Abono de $${delta.toLocaleString('es-CO')} (${params.numero_venta || params.numero_ot || params.numero_cot || 'Registro'})`
      }, true);
    } catch (e: any) {
      console.warn('Exception in reconciliarPagoEnLedger:', e?.message || e);
      return false;
    }
  },

  // 21.2 Consultar Balance Canónico del Taller desde Vista Central
  async fetchBalanceTaller(): Promise<BalanceTaller | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('vista_balance_taller')
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('Error fetching vista_balance_taller:', error.message);
        return null;
      }
      if (!data) return null;
      return {
        total_ingresos_recaudados: Number(data.total_ingresos_recaudados) || 0,
        recaudado_nequi: Number(data.recaudado_nequi) || 0,
        recaudado_bre_b: Number(data.recaudado_bre_b) || 0,
        recaudado_efectivo: Number(data.recaudado_efectivo) || 0,
        total_por_cobrar: Number(data.total_por_cobrar) || 0,
        total_egresos: Number(data.total_egresos) || 0,
        egresos_nequi: Number(data.egresos_nequi) || 0,
        egresos_bre_b: Number(data.egresos_bre_b) || 0,
        egresos_efectivo: Number(data.egresos_efectivo) || 0,
        flujo_caja_neto:
          data.flujo_caja_neto !== undefined
            ? Number(data.flujo_caja_neto)
            : (Number(data.total_ingresos_recaudados) || 0) - (Number(data.total_egresos) || 0)
      };
    } catch (e) {
      console.warn('Exception in fetchBalanceTaller:', e);
      return null;
    }
  },

  // 21.2 Eliminar Cobro o Abono Duplicado Atómicamente
  async eliminarCobroDuplicado(
    cobroId: string, 
    otId?: string, 
    monto?: number
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { success: false, message: 'Supabase no está conectado' };
    }
    try {
      const isUuid = Boolean(cobroId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cobroId));

      // 1. Invocar función RPC atómica en Supabase si está disponible
      if (isUuid) {
        const { data: rpcRes, error: rpcErr } = await supabase!.rpc('fn_eliminar_cobro_duplicado', {
          p_cobro_id: cobroId
        });
        if (!rpcErr && rpcRes && rpcRes.success) {
          return { success: true, message: rpcRes.message || 'Cobro duplicado eliminado' };
        }
      }

      // 2. Eliminación directa en ledger único abonos_pagos
      if (isUuid) {
        await supabase!
          .from('abonos_pagos')
          .delete()
          .eq('id', cobroId);
      }

      // 3. Recálculo defensivo en ordenes_trabajo si no se activó el trigger
      if (otId && monto && monto > 0) {
        const isOtUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(otId);
        let otQuery = supabase!.from('ordenes_trabajo').select('id, total_ot, total_abonado, precio_cobrado, abono');
        if (isOtUuid) {
          otQuery = otQuery.eq('id', otId);
        } else {
          otQuery = otQuery.eq('numero_ot', otId);
        }
        const { data: otData } = await otQuery.maybeSingle();

        if (otData) {
          const totalOT = Number(otData.total_ot) || Number(otData.precio_cobrado) || 0;
          const abonoActual = Number(otData.total_abonado) || Number(otData.abono) || 0;
          const nuevoAbono = Math.max(0, abonoActual - monto);
          const nuevoSaldo = Math.max(0, totalOT - nuevoAbono);
          const nuevoEstado = nuevoSaldo <= 0 ? 'Pagado Total' : (nuevoAbono > 0 ? 'Abono Parcial' : 'Pendiente');

          await supabase!
            .from('ordenes_trabajo')
            .update({
              total_abonado: nuevoAbono,
              abono: nuevoAbono,
              saldo_pendiente: nuevoSaldo,
              estado_pago: nuevoEstado,
              updated_at: new Date().toISOString()
            })
            .eq('id', otData.id);
        }
      }

      return {
        success: true,
        message: 'Cobro duplicado eliminado y saldos recalculados correctamente'
      };
    } catch (e: any) {
      console.error('Error al eliminar cobro duplicado:', e);
      return { success: false, message: e?.message || 'Error en la eliminación del cobro' };
    }
  },

  // 21.3 Consultar historial de abonos y pagos centralizados en abonos_pagos
  async fetchAbonos(filtro?: { orden_trabajo_id?: string; cotizacion_id?: string }): Promise<Array<{
    id: string;
    orden_trabajo_id: string;
    cotizacion_id?: string;
    monto: number;
    metodo_pago: string;
    referencia_transaccion?: string;
    fecha_pago?: string;
    created_at?: string;
    nota?: string;
  }>> {
    if (!this.isAvailable()) return [];
    try {
      let query = supabase!.from('abonos_pagos').select('*').order('created_at', { ascending: false });
      if (filtro?.orden_trabajo_id) query = query.eq('orden_trabajo_id', filtro.orden_trabajo_id);
      if (filtro?.cotizacion_id) query = query.eq('cotizacion_id', filtro.cotizacion_id);
      const { data, error } = await query;
      if (!error && data) return data;
      return [];
    } catch (e) {
      return [];
    }
  },

  // 21.4 Consultar historial financiero unificado (mapeado desde el ledger canónico abonos_pagos)
  async fetchPayments(filtro?: { cotizacion_id?: string; pos_venta_id?: string; cliente_id?: string; orden_trabajo_id?: string }): Promise<PaymentRecord[]> {
    if (!this.isAvailable()) return [];
    try {
      let query = supabase!.from('abonos_pagos').select('*').order('created_at', { ascending: false });
      if (filtro?.cotizacion_id) query = query.eq('cotizacion_id', filtro.cotizacion_id);
      if (filtro?.orden_trabajo_id) query = query.eq('orden_trabajo_id', filtro.orden_trabajo_id);
      if (filtro?.pos_venta_id) query = query.eq('pos_venta_id', filtro.pos_venta_id);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        monto: Number(row.monto) || 0,
        metodo_pago: row.metodo_pago || 'Bre-B',
        referencia_pago: row.referencia_transaccion || '',
        comprobante_url: row.comprobante_url || undefined,
        nota: row.nota || row.notas || undefined,
        cliente_id: row.cliente_id || undefined,
        cliente_nombre: row.cliente_nombre || undefined,
        cotizacion_id: row.cotizacion_id || undefined,
        orden_trabajo_id: row.orden_trabajo_id || undefined,
        pos_venta_id: row.pos_venta_id || undefined,
        cuenta_cobro_id: row.cuenta_cobro_id || undefined,
        origen_modulo: row.origen_modulo || (row.pos_venta_id ? 'pos' : (row.cuenta_cobro_id ? 'cuenta_cobro' : row.cotizacion_id ? 'cotizacion' : 'taller')),
        tipo_movimiento: row.tipo_movimiento || 'INGRESO',
        registrado_por: row.registrado_por_nombre || 'Equipo WJGEEKS',
        fecha_pago: row.fecha_pago || row.created_at,
        created_at: row.created_at,
        updated_at: row.updated_at || undefined
      }));
    } catch (e) {
      console.warn('Exception in fetchPayments:', e);
      return [];
    }
  },

  async fetchAbonosDetallado(limit: number = 250): Promise<PaymentRecord[]> {
    if (!this.isAvailable()) return [];
    try {
      const { data, error } = await supabase!
        .from('abonos_pagos')
        .select('*')
        .order('fecha_pago', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        monto: Number(row.monto) || 0,
        metodo_pago: row.metodo_pago || 'BRE_B',
        referencia_pago: row.referencia_transaccion || '',
        comprobante_url: row.comprobante_url || undefined,
        nota: row.nota || undefined,
        cliente_id: row.cliente_id || undefined,
        cliente_nombre: row.cliente_nombre || undefined,
        cotizacion_id: row.cotizacion_id || undefined,
        orden_trabajo_id: row.orden_trabajo_id || undefined,
        pos_venta_id: row.pos_venta_id || undefined,
        cuenta_cobro_id: row.cuenta_cobro_id || undefined,
        origen_modulo: row.origen_modulo || (row.pos_venta_id ? 'pos' : (row.cuenta_cobro_id ? 'cuenta_cobro' : row.cotizacion_id ? 'cotizacion' : 'taller')),
        tipo_movimiento: row.tipo_movimiento || 'INGRESO',
        registrado_por: row.registrado_por || 'Equipo WJGEEKS',
        fecha_pago: row.fecha_pago || row.created_at,
        created_at: row.created_at,
        updated_at: row.updated_at || undefined
      }));
    } catch (e) {
      console.warn('Exception in fetchAbonosDetallado:', e);
      return [];
    }
  },

  async updateAbono(id: string, patch: Partial<PaymentRecord>): Promise<boolean> {
    if (!this.isAvailable() || !id) return false;
    try {
      const updateBody: Record<string, any> = { updated_at: new Date().toISOString() };
      if (patch.monto !== undefined) updateBody.monto = Math.max(0.01, Number(patch.monto));
      if (patch.metodo_pago !== undefined) {
        const m = String(patch.metodo_pago).toUpperCase().trim();
        updateBody.metodo_pago = m.includes('NEQUI')
          ? 'NEQUI'
          : m.includes('EFECTIVO')
          ? 'EFECTIVO'
          : m.includes('TRANSF')
          ? 'TRANSFERENCIA'
          : m.includes('TARJETA')
          ? 'TARJETA'
          : 'BRE_B';
        updateBody.cuenta_receptora =
          updateBody.metodo_pago === 'NEQUI'
            ? 'Nequi 3217273025 (Juan)'
            : updateBody.metodo_pago === 'EFECTIVO'
            ? 'Caja Efectivo Taller'
            : 'Bre-B 0090778625 (Germán)';
      }
      if (patch.nota !== undefined) updateBody.nota = patch.nota;
      if (patch.cliente_nombre !== undefined) updateBody.cliente_nombre = patch.cliente_nombre;
      if (patch.referencia_pago !== undefined) updateBody.referencia_transaccion = patch.referencia_pago;
      if (patch.tipo_movimiento !== undefined) updateBody.tipo_movimiento = patch.tipo_movimiento;
      if (patch.fecha_pago !== undefined) updateBody.fecha_pago = patch.fecha_pago;

      const { error } = await supabase!.from('abonos_pagos').update(updateBody).eq('id', id);
      if (error) {
        console.warn('Error updating abono:', error.message);
        return false;
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wjg:ledger-updated'));
      return true;
    } catch {
      return false;
    }
  },

  async deleteAbono(id: string): Promise<boolean> {
    if (!this.isAvailable() || !id) return false;
    try {
      const { error } = await supabase!.from('abonos_pagos').delete().eq('id', id);
      if (error) {
        console.warn('Error deleting abono:', error.message);
        return false;
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wjg:ledger-updated'));
      return true;
    } catch {
      return false;
    }
  },

  async fetchEgresos(): Promise<EgresoTaller[]> {
    if (!this.isAvailable()) return [];
    try {
      const { data, error } = await supabase!
        .from('egresos_taller')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Info fetching egresos_taller:', error.message);
        return [];
      }
      return (data || []).map((row: any): EgresoTaller => ({
        id: row.id,
        fecha: row.fecha ? String(row.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10),
        categoria: (row.categoria || 'OTROS') as CategoriaEgresoTaller,
        concepto: row.concepto || 'Gasto operativo',
        monto: Number(row.monto) || 0,
        metodo_pago: row.metodo_pago || 'BRE_B',
        proveedor_o_beneficiario: row.proveedor_o_beneficiario || undefined,
        orden_trabajo_id: row.orden_trabajo_id || undefined,
        solicitud_insumo_id: row.solicitud_insumo_id || undefined,
        comprobante_url: row.comprobante_url || undefined,
        registrado_por: row.registrado_por || undefined,
        notas: row.notas || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch {
      return [];
    }
  },

  async saveEgreso(egreso: EgresoTaller): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(egreso.id);
      egreso.id = validId;
      const otUuid = egreso.orden_trabajo_id && UUID_REGEX.test(egreso.orden_trabajo_id)
        ? egreso.orden_trabajo_id
        : null;
      const payload = {
        id: validId,
        fecha: (egreso.fecha || new Date().toISOString()).slice(0, 10),
        categoria: egreso.categoria || 'OTROS',
        concepto: egreso.concepto,
        monto: Math.max(1, Number(egreso.monto) || 0),
        metodo_pago: egreso.metodo_pago || 'BRE_B',
        proveedor_o_beneficiario: egreso.proveedor_o_beneficiario || null,
        orden_trabajo_id: otUuid,
        solicitud_insumo_id: egreso.solicitud_insumo_id || null,
        comprobante_url: egreso.comprobante_url || null,
        registrado_por: egreso.registrado_por || null,
        notas: egreso.notas || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase!.from('egresos_taller').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Error saving egreso:', error.message);
        return false;
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wjg:ledger-updated'));
      return true;
    } catch {
      return false;
    }
  },

  async deleteEgreso(id: string): Promise<boolean> {
    if (!this.isAvailable() || !id) return false;
    try {
      const { error } = await supabase!.from('egresos_taller').delete().eq('id', id);
      if (error) return false;
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wjg:ledger-updated'));
      return true;
    } catch {
      return false;
    }
  },

  // 22. Escucha en tiempo real para sincronización entre dispositivos móviles y PCs (Postgres Changes + Broadcast + Auto-Reconexión)
  subscribeRealtime(
    onCotizacionChange: () => void, 
    onOTChange: () => void, 
    onCuentaChange: () => void,
    onVentaExpressChange?: () => void,
    onTareaChange?: () => void,
    onSolicitudChange?: () => void,
    onPaymentChange?: () => void,
    onStockChange?: () => void,
    onMaquinaChange?: () => void,
    onCatalogChange?: () => void,
    onClientesChange?: () => void,
    onBacklogChange?: () => void,
    onConsumosRealesChange?: () => void
  ) {
    if (!this.isAvailable()) return null;

    // Remover canal previo si existe para evitar advertencias de canal duplicado
    try {
      const existing = supabase!.getChannels().find(c => c.topic === 'realtime:wjgeeks_live_sync');
      if (existing) {
        supabase!.removeChannel(existing);
      }
    } catch {}

    // Debounce por entidad (300ms) para evitar tormentas de refetch al guardar lotes o ítems
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const triggerDebounced = (key: string, fn?: () => void) => {
      if (!fn) return;
      const prevTimer = timers.get(key);
      if (prevTimer) clearTimeout(prevTimer);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          fn();
        }, 300)
      );
    };

    const channel = supabase!.channel('wjgeeks_live_sync', {
      config: { broadcast: { self: false } }
    })
      .on('broadcast', { event: 'wjg_entity_changed' }, (msg: any) => {
        const payload = msg?.payload;
        if (!payload || payload.senderId === CLIENT_INSTANCE_ID) return;
        const entity = String(payload.entity || '');
        if (entity === 'cotizacion') triggerDebounced('cotizacion', onCotizacionChange);
        else if (entity === 'orden') {
          triggerDebounced('orden', onOTChange);
          triggerDebounced('cuenta', onCuentaChange);
        } else if (entity === 'cuenta') triggerDebounced('cuenta', onCuentaChange);
        else if (entity === 'venta_express') triggerDebounced('venta_express', onVentaExpressChange);
        else if (entity === 'stock') triggerDebounced('stock', onStockChange);
        else if (entity === 'cliente') {
          triggerDebounced('cliente', onClientesChange);
          triggerDebounced('catalogo', onCatalogChange);
        } else if (entity === 'consumo_real') triggerDebounced('consumo_real', onConsumosRealesChange);
        else if (entity === 'tarea') triggerDebounced('tarea', onTareaChange);
        else if (entity === 'solicitud') triggerDebounced('solicitud', onSolicitudChange);
        else if (entity === 'personal' || entity === 'catalogo' || entity === 'maquina' || entity === 'insumo' || entity === 'resina' || entity === 'filamento' || entity === 'configuracion') {
          if (entity === 'maquina') triggerDebounced('maquina', onMaquinaChange);
          triggerDebounced('catalogo', onCatalogChange);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => {
        triggerDebounced('cotizacion', onCotizacionChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_trabajo' }, () => {
        triggerDebounced('orden', onOTChange);
        triggerDebounced('cuenta', onCuentaChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_cobro' }, () => {
        triggerDebounced('cuenta', onCuentaChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'abonos_pagos' }, () => {
        triggerDebounced('orden', onOTChange);
        triggerDebounced('cuenta', onCuentaChange);
        triggerDebounced('payment', onPaymentChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_express' }, () => {
        triggerDebounced('venta_express', onVentaExpressChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_equipo' }, () => {
        triggerDebounced('tarea', onTareaChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_insumos' }, () => {
        triggerDebounced('solicitud', onSolicitudChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos_stock' }, () => {
        triggerDebounced('stock', onStockChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maquinas' }, () => {
        triggerDebounced('maquina', onMaquinaChange);
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resinas' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'filamentos' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produccion_interna' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion_taller' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios_taller' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarifas_tamanos' }, () => {
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
        triggerDebounced('cliente', onClientesChange);
        triggerDebounced('catalogo', onCatalogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'backlog_mejoras_empresa' }, () => {
        triggerDebounced('backlog', onBacklogChange);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consumos_reales_produccion' }, () => {
        triggerDebounced('consumo_real', onConsumosRealesChange);
      });

    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isManuallyUnsubscribed = false;

    const attachSubscription = (targetChannel: any) => {
      targetChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttempt = 0;
          activeRealtimeChannel = targetChannel;
        } else if (
          !isManuallyUnsubscribed &&
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')
        ) {
          if (reconnectTimer) return;
          const delay = Math.min(30000, 2000 * Math.pow(2, reconnectAttempt));
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (isManuallyUnsubscribed) return;
            try {
              targetChannel.subscribe();
            } catch (_) {}
          }, delay);
        }
      });
    };

    attachSubscription(channel);
    activeRealtimeChannel = channel;

    const origUnsubscribe = channel.unsubscribe.bind(channel);
    channel.unsubscribe = async () => {
      isManuallyUnsubscribed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      timers.forEach(t => clearTimeout(t));
      timers.clear();
      if (activeRealtimeChannel === channel) {
        activeRealtimeChannel = null;
      }
      return origUnsubscribe();
    };

    return channel;
  },

  // 23. Encolar Notificación Oficial en la DB para Despacho Asíncrono desde la Línea Central (+57 320 2796115)
  async enqueueNotification(notif: {
    orden_trabajo_id?: string;
    destinatario_nombre: string;
    destinatario_telefono: string;
    rol_destinatario: 'CLIENTE' | 'JUAN_TALLER' | 'WENDY_PINTURA' | 'GERMAN_ADMIN' | 'TRIPARTITO';
    mensaje_plano: string;
    plantilla_hsm?: string;
    variables_plantilla?: Record<string, string>;
  }): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const idempotency = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const isOtUuid = Boolean(notif.orden_trabajo_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notif.orden_trabajo_id));

      const { error } = await supabase!.from('registro_notificaciones').insert({
        idempotency_key: idempotency,
        orden_trabajo_id: isOtUuid ? notif.orden_trabajo_id : null,
        destinatario_nombre: notif.destinatario_nombre,
        destinatario_telefono: notif.destinatario_telefono,
        rol_destinatario: notif.rol_destinatario,
        mensaje_plano: notif.mensaje_plano,
        plantilla_hsm: notif.plantilla_hsm || null,
        variables_plantilla: notif.variables_plantilla || null,
        estado: 'PENDIENTE'
      });

      return !error;
    } catch (e) {
      console.warn('Exception queuing notification:', e);
      return false;
    }
  },

  // 24. Subir Fotografía a Supabase Storage (Bucket 'archivos-taller' con fallback WebP)
  async uploadFotoTaller(
    input: File | string, 
    carpeta: 'piezas' | 'materiales' | 'insumos' | 'maquinas' = 'piezas'
  ): Promise<string> {
    if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
      return input;
    }

    try {
      const { processAndOptimizeImage, dataUrlToBlob } = await import('./imageService');
      
      const dataUrl = typeof input === 'string' && input.startsWith('data:image/')
        ? input
        : await processAndOptimizeImage(input, 640, 640, 0.75);

      if (!this.isAvailable()) {
        return dataUrl;
      }

      const blob = dataUrlToBlob(dataUrl);
      const filename = `${carpeta}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;

      const { error } = await supabase!.storage
        .from('archivos-taller')
        .upload(filename, blob, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true
        });

      if (error) {
        console.warn('Supabase storage upload error, fallback a dataUrl:', error.message);
        return dataUrl;
      }

      const { data: pubData } = supabase!.storage
        .from('archivos-taller')
        .getPublicUrl(filename);

      if (pubData?.publicUrl) {
        return pubData.publicUrl;
      }

      return dataUrl;
    } catch (err) {
      console.warn('Error en uploadFotoTaller, fallback a dataUrl:', err);
      if (typeof input === 'string') return input;
      const { processAndOptimizeImage } = await import('./imageService');
      return await processAndOptimizeImage(input, 640, 640, 0.75);
    }
  },

  // 25. Bitácora / Futuras Validaciones de la Empresa (Backlog en Supabase)
  async fetchBacklogMejoras(): Promise<ItemBacklogEmpresa[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('backlog_mejoras_empresa')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching backlog_mejoras_empresa:', error.message);
        return null;
      }
      return (data || []).map((row: any): ItemBacklogEmpresa => ({
        id: row.id,
        titulo: row.titulo,
        modulo: row.modulo || 'General',
        prioridad: (row.prioridad as any) || 'media',
        estado: (row.estado as any) || 'pendiente',
        descripcion: row.descripcion || '',
        autor: row.autor || 'Equipo WJGEEKS',
        fecha_creacion: row.fecha_creacion || (row.created_at ? String(row.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10))
      }));
    } catch (e) {
      console.warn('Exception in fetchBacklogMejoras:', e);
      return null;
    }
  },

  async saveBacklogMejora(item: ItemBacklogEmpresa): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!
        .from('backlog_mejoras_empresa')
        .upsert({
          id: item.id,
          titulo: item.titulo,
          modulo: item.modulo || 'General',
          prioridad: item.prioridad || 'media',
          estado: item.estado || 'pendiente',
          descripcion: item.descripcion || '',
          autor: item.autor || 'Equipo WJGEEKS',
          fecha_creacion: item.fecha_creacion || new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      return !error;
    } catch (e) {
      console.warn('Exception in saveBacklogMejora:', e);
      return false;
    }
  },

  async deleteBacklogMejora(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('backlog_mejoras_empresa').delete().eq('id', id);
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 26. Consumos Reales de Producción (Taller + Pintor) & Promedios para el Cotizador
  async fetchConsumosReales(): Promise<ConsumoRealProduccion[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('consumos_reales_produccion')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Info fetching consumos_reales_produccion:', error.message);
        return null;
      }
      return (data || []).map((row: any): ConsumoRealProduccion => ({
        id: row.id,
        orden_trabajo_id: row.orden_trabajo_id || '',
        cotizacion_id: row.cotizacion_id || undefined,
        numero_referencia: row.numero_referencia || '',
        etapa: row.etapa || 'TALLER_IMPRESION',
        tecnologia: row.tecnologia || 'SLA_RESINA',
        altura_referencia_mm: Number(row.altura_referencia_mm) || 0,
        cantidad_piezas: Number(row.cantidad_piezas) || 1,
        registrado_por_id: row.registrado_por_id || undefined,
        registrado_por_nombre: row.registrado_por_nombre || 'Equipo WJGEEKS',
        material_id: row.material_id || undefined,
        material_nombre: row.material_nombre || undefined,
        material_estimado_g: Number(row.material_estimado_g) || 0,
        material_real_g: Number(row.material_real_g) || 0,
        tiempo_real_impresion_min: Number(row.tiempo_real_impresion_min) || 0,
        tiempo_real_mano_obra_min: Number(row.tiempo_real_mano_obra_min) || 0,
        hubo_fallo: Boolean(row.hubo_fallo),
        piezas_fallidas: Number(row.piezas_fallidas) || 0,
        insumos_consumidos: Array.isArray(row.insumos_consumidos) ? row.insumos_consumidos : [],
        costo_material_real: Number(row.costo_material_real) || 0,
        costo_insumos_reales: Number(row.costo_insumos_reales) || 0,
        costo_mano_obra_real: Number(row.costo_mano_obra_real) || 0,
        costo_total_real: Number(row.costo_total_real) || 0,
        descontado_de_inventario: Boolean(row.descontado_de_inventario),
        notas: row.notas || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (e) {
      console.warn('Exception in fetchConsumosReales:', e);
      return null;
    }
  },

  async saveConsumoReal(consumo: ConsumoRealProduccion): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(consumo.id);
      consumo.id = validId;
      const payload = {
        id: validId,
        orden_trabajo_id: (consumo.orden_trabajo_id && UUID_REGEX.test(consumo.orden_trabajo_id)) ? consumo.orden_trabajo_id : null,
        cotizacion_id: (consumo.cotizacion_id && UUID_REGEX.test(consumo.cotizacion_id)) ? consumo.cotizacion_id : null,
        numero_referencia: consumo.numero_referencia,
        etapa: consumo.etapa,
        tecnologia: consumo.tecnologia || 'SLA_RESINA',
        altura_referencia_mm: Number(consumo.altura_referencia_mm) || 0,
        cantidad_piezas: Math.max(1, Number(consumo.cantidad_piezas) || 1),
        registrado_por_id: (consumo.registrado_por_id && UUID_REGEX.test(consumo.registrado_por_id)) ? consumo.registrado_por_id : null,
        registrado_por_nombre: consumo.registrado_por_nombre || 'Equipo WJGEEKS',
        material_id: consumo.material_id || null,
        material_nombre: consumo.material_nombre || null,
        material_estimado_g: Number(consumo.material_estimado_g) || 0,
        material_real_g: Number(consumo.material_real_g) || 0,
        tiempo_real_impresion_min: Math.round(Number(consumo.tiempo_real_impresion_min) || 0),
        tiempo_real_mano_obra_min: Math.round(Number(consumo.tiempo_real_mano_obra_min) || 0),
        hubo_fallo: Boolean(consumo.hubo_fallo),
        piezas_fallidas: Math.round(Number(consumo.piezas_fallidas) || 0),
        insumos_consumidos: Array.isArray(consumo.insumos_consumidos) ? consumo.insumos_consumidos : [],
        costo_material_real: Number(consumo.costo_material_real) || 0,
        costo_insumos_reales: Number(consumo.costo_insumos_reales) || 0,
        costo_mano_obra_real: Number(consumo.costo_mano_obra_real) || 0,
        costo_total_real: Number(consumo.costo_total_real) || 0,
        descontado_de_inventario: Boolean(consumo.descontado_de_inventario),
        notas: consumo.notas || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase!
        .from('consumos_reales_produccion')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Error saving consumo_real in Supabase:', error.message);
        return false;
      }
      this.broadcastChange('consumo_real', 'upsert');
      return true;
    } catch (e) {
      console.warn('Exception in saveConsumoReal:', e);
      return false;
    }
  },

  async deleteConsumoReal(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!
        .from('consumos_reales_produccion')
        .delete()
        .eq('id', id);
      if (!error) this.broadcastChange('consumo_real', 'delete');
      return !error;
    } catch (e) {
      console.warn('Exception in deleteConsumoReal:', e);
      return false;
    }
  },

  async fetchPromediosConsumoReal(): Promise<PromedioConsumoReal[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('vista_promedios_consumo_real')
        .select('*');
      if (error || !data) return null;
      return data.map((row: any): PromedioConsumoReal => ({
        tecnologia: row.tecnologia || 'SLA_RESINA',
        etapa: row.etapa || 'TALLER_IMPRESION',
        rango_altura: row.rango_altura || 'GENERAL',
        total_registros: Number(row.total_registros) || 0,
        desviacion_material_pct: Number(row.desviacion_material_pct) || 0,
        promedio_material_real_g: Number(row.promedio_material_real_g) || 0,
        promedio_insumos_extras_por_pieza: Number(row.promedio_insumos_extras_por_pieza) || 0,
        promedio_mano_obra_min_por_pieza: Number(row.promedio_mano_obra_min_por_pieza) || 0,
        tasa_fallo_real_pct: Number(row.tasa_fallo_real_pct) || 0
      }));
    } catch (e) {
      return null;
    }
  }
};
