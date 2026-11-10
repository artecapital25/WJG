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
  EstadoCotizacion
} from '../types';

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

export const CloudSyncService = {
  isAvailable: () => isSupabaseConfigured && supabase !== null,

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
          nombre_item: it.nombre_item,
          cantidad: Number(it.cantidad) || 1,
          alto_mm: Number(it.alto_mm) || 0,
          ancho_mm: Number(it.ancho_mm) || 0,
          profundidad_mm: Number(it.profundidad_mm) || 0,
          volumen_cm3: Number(it.volumen_cm3) || 0,
          peso_estimado_g: Number(it.peso_estimado_g) || 0,
          resina_id: 'res-1',
          resina_nombre: 'Resina Standard',
          maquina_id: 'maq-1',
          maquina_nombre: 'Anycubic MONO 4',
          tiempo_impresion_min: Number(it.tiempo_impresion_min) || 0,
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
          precio_total: Number(it.precio_total) || 0,
          tiempo_entrega: row.tiempo_entrega_estimado || '(3) Días hábiles',
          descripcion_tecnica: it.descripcion_tecnica || '',
          imagen_url: it.imagen_url || undefined
        }));

        let notasLimpia = row.notas || 'No incluye transporte fuera del perímetro urbano.';
        let itemsRestaurados: PiezaCotizada[] | null = null;
        let metaFinanciera: { iva_porcentaje?: number; iva_monto?: number; descuento_monto?: number; ahorro_volumen_total?: number } = {};
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
                  descuento_monto: parsed.descuento_monto,
                  ahorro_volumen_total: parsed.ahorro_volumen_total
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
          if (e === 'APROBADA' || e === 'ACEPTADA' || e.includes('APROB') || e.includes('ACEPT')) return 'Aceptada';
          if (e === 'FACTURADA' || e.includes('FACTUR')) return 'Facturada';
          if (e === 'ENVIADA' || e.includes('ENVIAD')) return 'Enviada';
          if (e === 'PARCIAL' || e.includes('PARCIAL')) return 'Parcial';
          if (e === 'CANCELADA' || e === 'RECHAZADA' || e.includes('RECHAZ')) return 'Rechazada';
          return 'Borrador';
        };

        return {
          id: row.id,
          numero_cot: row.numero_cot,
          cliente: clienteMapeado,
          vendedor: row.vendedor_nombre || 'Equipo WJGEEKS',
          fecha: row.fecha_emision || row.fecha || new Date().toISOString().slice(0, 10),
          estado: normalizarEstadoDbParaUI(row.estado),
          items: (itemsRestaurados && itemsRestaurados.length > 0) ? itemsRestaurados : itemsMapeados,
          subtotal: Number(row.subtotal) || 0,
          iva_porcentaje: metaFinanciera.iva_porcentaje !== undefined ? metaFinanciera.iva_porcentaje : (Number(row.iva_porcentaje) || 0),
          iva_monto: metaFinanciera.iva_monto,
          descuento_porcentaje: Number(row.descuento_porcentaje) || 0,
          descuento_monto: metaFinanciera.descuento_monto,
          ahorro_volumen_total: metaFinanciera.ahorro_volumen_total,
          total: Number(row.total) || 0,
          tiempo_entrega_estimado: row.tiempo_entrega_estimado || '(3) Días hábiles',
          notas: notasLimpia,
          // Sincronización Financiera Unificada
          abono: row.abono !== undefined ? Number(row.abono) : 0,
          saldo_pendiente: row.saldo_pendiente !== undefined ? Number(row.saldo_pendiente) : Number(row.total || 0),
          estado_pago: row.estado_pago || (row.abono > 0 ? (row.abono >= row.total ? 'Pagado Total' : 'Abono Parcial') : 'Pendiente'),
          metodo_pago: row.metodo_pago || 'Bre-B',
          comprobante_pago: row.comprobante_pago || undefined
        };
      });
    } catch (e) {
      console.warn('Exception in fetchCotizaciones:', e);
      return null;
    }
  },

  // 3. Traer Clientes desde la Nube (Ordenados Alfabéticamente)
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
      return (data || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
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

      return data.map((row: any): OrdenTrabajo => {
        const rawEstado = row.estado_actual || row.estado || 'EN_COLA_OT';
        const estadoFinal: EstadoOT = dbToUiEstadoMap[rawEstado] || 'En Cola';
        const total = Number(row.total_ot) || Number(row.precio_cobrado) || 0;
        const abono = Number(row.total_abonado) || Number(row.abono) || 0;
        const saldo = row.saldo_pendiente !== undefined ? Number(row.saldo_pendiente) : Math.max(0, total - abono);

        return {
          id: row.id,
          numero_ot: row.numero_ot,
          cotizacion_id: row.cotizacion_id || '',
          cotizacion_numero: (row.numero_ot || '').replace(/^OT-/, 'COT-'),
          cliente_nombre: row.cliente_nombre || 'Cliente General',
          cliente_telefono: row.cliente_telefono || '',
          item_nombre: row.item_nombre || row.item_descripcion || 'Pieza 3D',
          cantidad: Number(row.cantidad) || 1,
          estado: estadoFinal,
          operador_asignado: row.operador_asignado || 'Operador 3D',
          tracking_token: row.tracking_token || undefined,
          stl_url: row.stl_url || undefined,
          fecha_creacion: row.created_at || new Date().toISOString(),
          tiempo_impresion_min: 0,
          tiempo_armado_min: 0,
          tiempo_pintura_min: 0,
          resina_nombre: 'Resina Standard',
          maquina_nombre: 'Anycubic MONO 4',
          va_pintado: false,
          tiene_empaque: false,
          detalles_tecnicos: row.item_descripcion || row.observaciones || '',
          pos_venta_id: row.pos_venta_id || undefined,
          precio_cobrado: total,
          abono,
          saldo_pendiente: saldo,
          estado_pago: row.estado_pago || (saldo <= 0 ? 'Pagado Total' : (abono > 0 ? 'Abono Parcial' : 'Pendiente')),
          metodo_pago: row.metodo_pago || 'Bre-B',
          comprobante_pago: row.comprobante_pago || undefined
        };
      });
    } catch (e) {
      console.warn('Exception in fetchOrdenes:', e);
      return null;
    }
  },

  // 5. Traer Cuentas de Cobro desde la Nube (Ledger Unificado con ordenes_trabajo)
  async fetchCuentas(): Promise<CuentaCobro[] | null> {
    if (!this.isAvailable()) return null;
    try {
      // 1. Intento primario: Consultar directamente ordenes_trabajo (Fuente de verdad)
      const { data: otData, error: otErr } = await supabase!
        .from('ordenes_trabajo')
        .select('*')
        .order('created_at', { ascending: false });

      if (!otErr && otData) {
        return otData.map((row: any): CuentaCobro => {
          const total = Number(row.total_ot) || Number(row.precio_cobrado) || 0;
          const abono = Number(row.total_abonado) || Number(row.abono) || 0;
          const saldo = row.saldo_pendiente !== undefined ? Number(row.saldo_pendiente) : Math.max(0, total - abono);
          const numOT = row.numero_ot || 'OT-000';
          const numCC = numOT.startsWith('CC-') ? numOT : `CC-${numOT.replace(/^OT-/, '')}`;

          return {
            id: row.id,
            numero_cc: numCC,
            cotizacion_id: row.cotizacion_id || '',
            cotizacion_numero: numOT.replace(/^OT-/, 'COT-'),
            cliente: {
              id: row.cliente_id || `cli-${row.id}`,
              codigo: 1,
              nombre: row.cliente_nombre || 'Cliente General',
              nit_cc: '',
              telefono: row.cliente_telefono || '',
              correo: ''
            },
            fecha_emision: (row.created_at || new Date().toISOString()).slice(0, 10),
            items_resumen: row.item_nombre || row.item_descripcion || 'Servicios de Impresión 3D y Manufactura',
            total,
            abono,
            saldo_pendiente: saldo,
            estado_pago: (row.estado_pago as any) || (saldo <= 0 ? 'Pagado Total' : (abono > 0 ? 'Abono Parcial' : 'Pendiente')),
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
      // 5.1 Asegurar que el cliente exista en la tabla clientes
      let clienteId: string | null = null;
      if (cot.cliente) {
        const { data: existingCli } = await supabase!
          .from('clientes')
          .select('id')
          .eq('telefono', cot.cliente.telefono)
          .limit(1);

        if (existingCli && existingCli.length > 0) {
          clienteId = existingCli[0].id;
        } else {
          const { data: newCli } = await supabase!
            .from('clientes')
            .insert([{
              nombre: cot.cliente.nombre,
              telefono: cot.cliente.telefono,
              nit_cc: cot.cliente.nit_cc || null,
              correo: cot.cliente.correo || null
            }])
            .select('id')
            .single();

          if (newCli) {
            clienteId = newCli.id;
          }
        }
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

      // Serializar snapshot de items y metadatos financieros dentro de notas de forma segura para conservar el 100% de detalles técnicos
      const snapshotPrefix = '<!-- WJ_ITEMS_SNAPSHOT:';
      const snapshotSuffix = ':WJ_ITEMS_SNAPSHOT -->';
      const rawNotas = (cot.notas || '').replace(/<!-- WJ_ITEMS_SNAPSHOT:[\s\S]*?:WJ_ITEMS_SNAPSHOT -->/g, '').trim();
      const payloadSnapshot = {
        items: cot.items || [],
        iva_porcentaje: cot.iva_porcentaje || 0,
        iva_monto: cot.iva_monto || 0,
        descuento_monto: cot.descuento_monto || 0,
        ahorro_volumen_total: cot.ahorro_volumen_total || 0
      };
      const encodedSnapshot = encodeURIComponent(JSON.stringify(payloadSnapshot));
      const notasConSnapshot = `${rawNotas}\n${snapshotPrefix}${encodedSnapshot}${snapshotSuffix}`;

      // 5.2 Upsert de la cotización por numero_cot con columnas canónicas
      const { data: cotData, error: cotErr } = await supabase!
        .from('cotizaciones')
        .upsert({
          numero_cot: cot.numero_cot,
          cliente_id: clienteId,
          cliente_nombre: cot.cliente?.nombre || 'Cliente General',
          cliente_telefono: cot.cliente?.telefono || '3000000000',
          fecha_emision: cot.fecha || new Date().toISOString().slice(0, 10),
          estado: normalizarEstadoCotizacion(cot.estado),
          subtotal: Number(cot.subtotal) || 0,
          descuento_porcentaje: cot.descuento_porcentaje || 0,
          total: Number(cot.total) || 0,
          tiempo_entrega_estimado: cot.tiempo_entrega_estimado || '3 a 5 días hábiles',
          notas: notasConSnapshot,
          abono: Number(cot.abono) || 0,
          estado_pago: cot.estado_pago || 'Pendiente',
          metodo_pago: cot.metodo_pago || 'Bre-B',
          comprobante_pago: cot.comprobante_pago || null
        }, { onConflict: 'numero_cot' })
        .select('id')
        .single();

      if (cotErr) {
        console.warn('Error saving cotizacion in Supabase:', cotErr);
        if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cotizacion', payload: cot });
        return false;
      }

      // 5.3 Actualizar piezas / items de la cotización
      if (cotData?.id && cot.items && cot.items.length > 0) {
        // Limpiar ítems anteriores de esta cotización para evitar duplicados
        await supabase!.from('cotizacion_items').delete().eq('cotizacion_id', cotData.id);

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

      return true;
    } catch (e) {
      console.warn('Exception in saveCotizacion to cloud:', e);
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cotizacion', payload: cot });
      return false;
    }
  },

  // 6. Guardar o Actualizar una Orden de Trabajo (OT) en Supabase (Core V3 Compatible)
  async saveOrdenTrabajo(ot: OrdenTrabajo, isFlushingQueue: boolean = false): Promise<boolean> {
    if (!this.isAvailable()) {
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'orden', payload: ot });
      return false;
    }
    try {
      const totalOtCalc = Number(ot.precio_cobrado || (ot.abono || 0) + (ot.saldo_pendiente || 0) || 0);
      const totalAbonadoCalc = Number(ot.abono || 0);
      const saldoCalc = Math.max(0, totalOtCalc - totalAbonadoCalc);

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

      const payloadV3: any = {
        numero_ot: ot.numero_ot,
        cliente_nombre: ot.cliente_nombre || 'Cliente',
        cliente_telefono: ot.cliente_telefono || 'Sin teléfono',
        item_nombre: ot.item_nombre || null,
        item_descripcion: ot.item_nombre || 'Pieza 3D',
        cantidad: Number(ot.cantidad) || 1,
        total_ot: totalOtCalc,
        total_abonado: totalAbonadoCalc,
        estado_actual: estadoDb,
        estado_pago: ot.estado_pago || (saldoCalc <= 0 ? 'Pagado Total' : (totalAbonadoCalc > 0 ? 'Abono Parcial' : 'Pendiente')),
        pos_venta_id: ot.pos_venta_id || null,
        stl_url: ot.stl_url || null,
        cotizacion_id: (ot.cotizacion_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot.cotizacion_id)) ? ot.cotizacion_id : null
      };

      if (ot.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot.id)) {
        payloadV3.id = ot.id;
      }

      // Intento en Core V3 (tabla ordenes_trabajo)
      const { error: errV3 } = await supabase!
        .from('ordenes_trabajo')
        .upsert(payloadV3, { onConflict: 'numero_ot' });

      if (!errV3) return true;

      // Fallback para esquema legado (sin saldo_pendiente generado)
      const payloadLegacy: any = {
        numero_ot: ot.numero_ot,
        cliente_nombre: ot.cliente_nombre,
        cliente_telefono: ot.cliente_telefono || null,
        item_nombre: ot.item_nombre,
        cantidad: ot.cantidad,
        estado: ot.estado,
        operador_asignado: ot.operador_asignado || 'Operador 3D',
        observaciones: ot.detalles_tecnicos || null,
        cotizacion_id: (ot.cotizacion_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ot.cotizacion_id)) ? ot.cotizacion_id : null,
        pos_venta_id: ot.pos_venta_id || null,
        precio_cobrado: ot.precio_cobrado || null,
        abono: ot.abono ?? 0,
        estado_pago: ot.estado_pago || 'Pendiente',
        metodo_pago: ot.metodo_pago || 'Bre-B',
        comprobante_pago: ot.comprobante_pago || null
      };

      const { error: errLegacy } = await supabase!
        .from('ordenes_trabajo')
        .upsert(payloadLegacy, { onConflict: 'numero_ot' });

      if (errLegacy && !isFlushingQueue) {
        this.enqueueOutboxTask({ type: 'orden', payload: ot });
      }
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
      return true;
    } catch (e) {
      console.warn('Exception deleting OT from cloud:', e);
      return false;
    }
  },

  // 7. Guardar o Actualizar una Cuenta de Cobro en Supabase (sincronizada en ordenes_trabajo)
  async saveCuentaCobro(cc: CuentaCobro, isFlushingQueue: boolean = false): Promise<boolean> {
    if (!this.isAvailable()) {
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cuenta', payload: cc });
      return false;
    }
    try {
      const numOT = cc.numero_cc.replace(/^CC-/, 'OT-');
      const { error } = await supabase!
        .from('ordenes_trabajo')
        .update({
          total_abonado: cc.abono,
          estado_pago: cc.estado_pago,
          updated_at: new Date().toISOString()
        })
        .eq('numero_ot', numOT);

      if (error && !isFlushingQueue) {
        this.enqueueOutboxTask({ type: 'cuenta', payload: cc });
      }
      return !error;
    } catch (e) {
      console.warn('Exception saving CC to cloud:', e);
      if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'cuenta', payload: cc });
      return false;
    }
  },

  // 8. Guardar o Actualizar un Cliente en Supabase
  async saveCliente(cliente: Cliente): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('clientes')
        .insert([{
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          nit_cc: cliente.nit_cc || null,
          correo: cliente.correo || null
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

  // 8.1 Eliminar Cliente en Supabase
  async deleteCliente(id: string, nombre?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      if (UUID_REGEX.test(id)) {
        const { error } = await supabase!.from('clientes').delete().eq('id', id);
        if (!error) return true;
      }
      if (nombre) {
        const { error } = await supabase!.from('clientes').delete().ilike('nombre', `%${nombre}%`);
        return !error;
      }
      return false;
    } catch (e) {
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

        if (row.notas && row.notas.includes('<!-- WJ_POS_FISCAL:')) {
          try {
            const start = row.notas.indexOf('<!-- WJ_POS_FISCAL:') + '<!-- WJ_POS_FISCAL:'.length;
            const end = row.notas.indexOf(':WJ_POS_FISCAL -->');
            if (end > start) {
              const parsed = JSON.parse(decodeURIComponent(row.notas.substring(start, end)));
              subtotalVal = parsed.subtotal ?? subtotalVal;
              ivaPorcentajeVal = parsed.iva_porcentaje ?? ivaPorcentajeVal;
              ivaMontoVal = parsed.iva_monto ?? ivaMontoVal;
              notasLimpia = row.notas.replace(/<!-- WJ_POS_FISCAL:[\s\S]*?:WJ_POS_FISCAL -->/g, '').trim();
            }
          } catch (_) {}
        }

        return {
          id: row.id,
          numero_venta: row.numero_venta,
          foto_url: row.foto_url || undefined,
          nombre_producto: row.nombre_producto,
          cliente_nombre: row.cliente_nombre,
          cliente_telefono: row.cliente_telefono || '',
          subtotal: subtotalVal,
          iva_porcentaje: ivaPorcentajeVal,
          iva_monto: ivaMontoVal,
          iva_regimen_nota: ivaPorcentajeVal === 0 ? 'Régimen Simple / No Responsable' : undefined,
          total: Number(row.total) || 0,
          abono: Number(row.abono) || 0,
          saldo_pendiente: Number(row.saldo_pendiente) || 0,
          estado_pago: row.estado_pago as any,
          fecha_venta: row.fecha_venta || new Date().toISOString().slice(0, 10),
          fecha_prometida_pago: row.fecha_prometida_pago || undefined,
          notas: notasLimpia,
          metodo_pago: row.metodo_pago || 'Nequi',
          creado_por: row.creado_por || 'Equipo WJGEEKS',
          requiere_ot: Boolean(row.requiere_ot),
          estado_diseno: row.estado_diseno || undefined,
          ot_id: row.ot_id || undefined,
          ot_numero: row.ot_numero || undefined,
          enlace_diseno: row.enlace_diseno || undefined,
          notas_diseno: row.notas_diseno || undefined
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
        iva_regimen_nota: venta.iva_regimen_nota || 'Régimen Simple / No Responsable'
      };
      const notasConFiscal = `${rawNotas}\n${snapshotPrefix}${encodeURIComponent(JSON.stringify(fiscalData))}${snapshotSuffix}`;

      const payload = {
        id: venta.id,
        numero_venta: venta.numero_venta,
        foto_url: venta.foto_url || null,
        nombre_producto: venta.nombre_producto,
        cliente_nombre: venta.cliente_nombre,
        cliente_telefono: venta.cliente_telefono || null,
        total: venta.total,
        abono: venta.abono,
        saldo_pendiente: venta.saldo_pendiente,
        estado_pago: venta.estado_pago,
        fecha_venta: venta.fecha_venta,
        fecha_prometida_pago: venta.fecha_prometida_pago || null,
        notas: notasConFiscal,
        metodo_pago: venta.metodo_pago || 'Nequi',
        creado_por: venta.creado_por || 'Equipo WJGEEKS',
        requiere_ot: Boolean(venta.requiere_ot),
        estado_diseno: venta.estado_diseno || null,
        ot_id: venta.ot_id || null,
        ot_numero: venta.ot_numero || null,
        enlace_diseno: venta.enlace_diseno || null,
        notas_diseno: venta.notas_diseno || null,
        producto_stock_id: venta.producto_stock_id || null,
        descontar_stock: Boolean(venta.descontar_stock),
        cantidad_vendida: venta.cantidad_vendida || 1,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase!
        .from('ventas_express')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Error saving venta_express in Supabase:', error.message);
        if (!isFlushingQueue) this.enqueueOutboxTask({ type: 'venta_express', payload: venta });
        return { success: false, error: error.message };
      }
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

      return { success: true };
    } catch (e: any) {
      console.warn('Exception in deleteCotizacion:', e);
      return { success: false, error: e?.message || 'Error eliminando cotización' };
    }
  },

  // Eliminar Cuenta de Cobro en Supabase (sincronizado con ordenes_trabajo / abonos_pagos)
  async deleteCuentaCobro(id: string, numero_cc?: string): Promise<boolean> {
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
        cantidad: Number(row.cantidad) || 1,
        unidad: row.unidad || 'und',
        urgencia: (row.urgencia || 'normal') as any,
        solicitado_por: row.solicitado_por as any,
        encargado_compra: 'Wendy',
        estado: (row.estado || 'pendiente') as any,
        enlace_compra: row.enlace_compra || undefined,
        proveedor_sugerido: row.proveedor_sugerido || undefined,
        notas: row.notas || undefined,
        fecha_solicitud: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
      }));
    } catch (e) {
      console.warn('Exception in fetchSolicitudesInsumos:', e);
      return null;
    }
  },

  // 17. Guardar o Actualizar Solicitud de Insumo en Supabase
  async saveSolicitudInsumo(solicitud: SolicitudInsumo): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
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

      const { error } = await supabase!
        .from('solicitudes_insumos')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Error saving solicitud_insumo in Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Exception in saveSolicitudInsumo:', e);
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
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 20.01 Sincronizar Filamento en Supabase
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
        stock_actual_g: Number(filamento.stock_actual_g) || 1000,
        temperatura_nozzle: filamento.temperatura_nozzle ? Number(filamento.temperatura_nozzle) : 215,
        temperatura_bed: filamento.temperatura_bed ? Number(filamento.temperatura_bed) : 60,
        densidad_g_cm3: filamento.densidad_g_cm3 ? Number(filamento.densidad_g_cm3) : 1.24,
        enlace_compra: filamento.enlace_compra || null,
        imagen_url: filamento.imagen_url || null,
        activo: filamento.activo !== false
      };
      const { error } = await supabase!.from('filamentos').upsert(payload, { onConflict: 'id' });
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
          stock_actual_g: Number(row.stock_actual_g) || 1000,
          temperatura_nozzle: Number(row.temperatura_nozzle) || 215,
          temperatura_bed: Number(row.temperatura_bed) || 60,
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
      if (!error) return true;
      if (marcaTipo) {
        const { error: err2 } = await supabase!.from('filamentos').delete().ilike('tipo', `%${marcaTipo}%`);
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

  // 21. Sincronizar Insumos en Supabase
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
        costo_total: Number(insumo.costo_total) || 0,
        costo_unitario: Number(insumo.costo_unitario) || 0,
        enlace_compra: insumo.enlace_compra || null,
        descripcion: insumo.descripcion || null,
        imagen_url: insumo.imagen_url || null
      };
      const { error } = await supabase!.from('insumos').upsert(payload, { onConflict: 'id' });
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
          repuestos: repuestosParsed
        };
      }).sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (e) {
      console.warn('Exception in fetchMaquinas:', e);
      return null;
    }
  },

  // 21.05 Sincronizar Maquinaria en Supabase
  async saveMaquina(maquina: Maquina): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const validId = ensureValidUuid(maquina.id);
      maquina.id = validId;

      const payload: any = {
        id: validId,
        nombre: maquina.nombre,
        tipo: maquina.tipo || 'Impresora 3D',
        tecnologia: maquina.tecnologia || (maquina.tipo?.toLowerCase().includes('filamento') || maquina.tipo?.toLowerCase().includes('fdm') ? 'FDM_FILAMENTO' : 'SLA_RESINA'),
        consumo_kwh: Number(maquina.consumo_kwh) || 0.05,
        costo_minuto: Number(maquina.costo_minuto) || 0,
        estado: maquina.estado || 'Disponible',
        imagen_url: maquina.imagen_url || null
      };

      const { error } = await supabase!.from('maquinas').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Error saving maquina in Supabase:', error.message);
        return false;
      }
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
        if (!error) return true;
      }
      if (nombre) {
        const { error } = await supabase!.from('maquinas').delete().ilike('nombre', `%${nombre}%`);
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
        if (!error) return true;
      }
      if (nombre) {
        const { error } = await supabase!.from('insumos').delete().ilike('nombre', `%${nombre}%`);
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
        if (!error) return true;
      }
      if (resumen) {
        const { error } = await supabase!.from('resinas').delete().ilike('tipo', `%${resumen}%`);
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
        titular_cuenta: data.titular_cuenta || 'WJGEEKS 3D PRO'
      };
    } catch (e) {
      console.warn('Exception in fetchConfiguracion:', e);
      return null;
    }
  },

  // 21.12 Guardar Configuración del Taller en Supabase (Sin columnas inexistentes)
  async saveConfiguracion(cfg: ConfiguracionTaller): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload: any = {
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

      const { data: existing } = await supabase!.from('configuracion_taller').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        payload.id = existing.id;
        const { error } = await supabase!.from('configuracion_taller').update(payload).eq('id', existing.id);
        return !error;
      } else {
        const { error } = await supabase!.from('configuracion_taller').insert([payload]);
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
      const { data, error } = await supabase!
        .from('usuarios_taller')
        .select('id, nombre, rol, costo_hora, costo_minuto')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error fetching personal unificado desde usuarios_taller:', error.message);
        return null;
      }
      if (!data || data.length === 0) return [];

      return data.map((row: any): Personal => ({
        id: row.id,
        rol: row.rol || row.nombre || 'Operador',
        costo_hora: Number(row.costo_hora) > 0 ? Number(row.costo_hora) : 10000,
        costo_minuto: Number(row.costo_minuto) > 0 ? Number(row.costo_minuto) : 166.67
      }));
    } catch (e) {
      return null;
    }
  },

  // 21.14 Guardar Tarifa de Personal en Supabase (Actualiza costo_hora y costo_minuto en usuarios_taller)
  async saveTarifaPersonal(p: Personal): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
      let query = supabase!.from('usuarios_taller').update({
        costo_hora: p.costo_hora,
        costo_minuto: p.costo_minuto
      });

      if (isUuid) {
        query = query.eq('id', p.id);
      } else {
        query = query.ilike('rol', `%${p.rol}%`);
      }

      const { error } = await query;
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

  // 21.1 Guardar transacción centralizada en Ledger Inmutable (abonos_pagos Core V3) con Anti-Double-Click 60s
  async savePayment(payment: PaymentRecord): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const montoNum = Number(payment.monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        console.warn(`[savePayment] Monto inválido ($${payment.monto}). Debe ser mayor a 0 para el ledger.`);
        return false;
      }

      // Prevención de doble clic y cobros duplicados en intervalo menor a 5 segundos (antirrebote óptimo)
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
        : 'Bre-B 0090778625 (Germán)';

      const payload = {
        orden_trabajo_id: otUuid,
        cotizacion_id: cotUuid,
        pos_venta_id: posVentaId,
        cuenta_cobro_id: payment.cuenta_cobro_id || null,
        monto: montoNum,
        metodo_pago: metodoFinal,
        referencia_transaccion: payment.referencia_pago || 'Registro Sistema',
        comprobante_url: payment.comprobante_url || null,
        cuenta_receptora: cuentaReceptora,
        nota: payment.nota || null
      };

      const { error: insertError } = await supabase!
        .from('abonos_pagos')
        .insert(payload);

      if (insertError) {
        console.warn('Error asentando en abonos_pagos ledger:', insertError.message);
        return false;
      }

      return true;
    } catch (e: any) {
      console.warn('Exception saving payment in ledger:', e?.message || e);
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
      let deleted = false;
      if (isUuid) {
        const { error: errAbonos } = await supabase!
          .from('abonos_pagos')
          .delete()
          .eq('id', cobroId);
        if (!errAbonos) deleted = true;
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
        cotizacion_id: row.cotizacion_id || undefined,
        orden_trabajo_id: row.orden_trabajo_id || undefined,
        pos_venta_id: row.pos_venta_id || undefined,
        cuenta_cobro_id: row.cuenta_cobro_id || undefined,
        origen_modulo: row.pos_venta_id ? 'pos' : (row.cuenta_cobro_id ? 'cuenta_cobro' : 'taller'),
        registrado_por: row.registrado_por_nombre || 'Equipo WJGEEKS',
        fecha_pago: row.created_at,
        created_at: row.created_at
      }));
    } catch (e) {
      console.warn('Exception in fetchPayments:', e);
      return [];
    }
  },

  // 22. Escucha en tiempo real para sincronización entre dispositivos móviles y PCs
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
    onCatalogChange?: () => void
  ) {
    if (!this.isAvailable()) return null;

    // Remover canal previo si existe para evitar advertencias de canal duplicado
    try {
      const existing = supabase!.getChannels().find(c => c.topic === 'realtime:wjgeeks_live_sync');
      if (existing) {
        supabase!.removeChannel(existing);
      }
    } catch {}

    const channel = supabase!.channel('wjgeeks_live_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => {
        onCotizacionChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_trabajo' }, () => {
        onOTChange();
        onCuentaChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'abonos_pagos' }, () => {
        onOTChange();
        onCuentaChange();
        if (onPaymentChange) onPaymentChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_express' }, () => {
        if (onVentaExpressChange) onVentaExpressChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_equipo' }, () => {
        if (onTareaChange) onTareaChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_insumos' }, () => {
        if (onSolicitudChange) onSolicitudChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos_stock' }, () => {
        if (onStockChange) onStockChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maquinas' }, () => {
        if (onMaquinaChange) onMaquinaChange();
        if (onCatalogChange) onCatalogChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, () => {
        if (onCatalogChange) onCatalogChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resinas' }, () => {
        if (onCatalogChange) onCatalogChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion_taller' }, () => {
        if (onCatalogChange) onCatalogChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarifas_personal' }, () => {
        if (onCatalogChange) onCatalogChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => {
        if (onCatalogChange) onCatalogChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarifas_tamanos' }, () => {
        if (onCatalogChange) onCatalogChange();
      })
      .subscribe();

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
  }
};
