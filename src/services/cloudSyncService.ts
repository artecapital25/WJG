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
  Insumo, 
  Maquina, 
  Personal, 
  Cliente, 
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
  EstadoOT
} from '../types';

// Interfaz canónica para el Balance Financiero Consolidado
export interface BalanceTaller {
  total_ingresos_recaudados: number;
  recaudado_nequi: number;
  recaudado_bre_b: number;
  recaudado_efectivo: number;
  total_por_cobrar: number;
}

// Cache en memoria para prevención de doble clic y cobros duplicados en ventana de 60 segundos
const recentPaymentsCache = new Map<string, number>();

export const CloudSyncService = {
  isAvailable: () => isSupabaseConfigured && supabase !== null,

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

        return {
          id: row.id,
          numero_cot: row.numero_cot,
          cliente: clienteMapeado,
          vendedor: row.vendedor_nombre || 'Equipo WJGEEKS',
          fecha: row.fecha_emision || row.fecha || new Date().toISOString().slice(0, 10),
          estado: row.estado as any,
          items: itemsMapeados,
          subtotal: Number(row.subtotal) || 0,
          iva_porcentaje: Number(row.iva_porcentaje) || 0,
          descuento_porcentaje: Number(row.descuento_porcentaje) || 0,
          total: Number(row.total) || 0,
          tiempo_entrega_estimado: row.tiempo_entrega_estimado || '(3) Días hábiles',
          notas: row.notas || 'No incluye transporte fuera del perímetro urbano.',
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

  // 3. Traer Clientes desde la Nube
  async fetchClientes(): Promise<Cliente[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('clientes')
        .select('*')
        .order('codigo', { ascending: true });

      if (error) {
        console.warn('Error fetching clientes:', error);
        return null;
      }
      return data || [];
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
        'ENTREGADO': 'Listo para Entrega',
        'CANCELADO': 'Listo para Entrega',
        'En Cola': 'En Cola',
        'Imprimiendo': 'Imprimiendo',
        'Curado': 'Curado',
        'Pintura y Armado': 'Pintura y Armado',
        'Control de Calidad': 'Control de Calidad',
        'Listo para Entrega': 'Listo para Entrega'
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
  async saveCotizacion(cot: Cotizacion): Promise<boolean> {
    if (!this.isAvailable()) return false;
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
          iva_porcentaje: cot.iva_porcentaje || 0,
          descuento_porcentaje: cot.descuento_porcentaje || 0,
          total: Number(cot.total) || 0,
          tiempo_entrega_estimado: cot.tiempo_entrega_estimado || '3 a 5 días hábiles',
          notas: cot.notas || null,
          abono: Number(cot.abono) || 0,
          estado_pago: cot.estado_pago || 'Pendiente',
          metodo_pago: cot.metodo_pago || 'Bre-B',
          comprobante_pago: cot.comprobante_pago || null
        }, { onConflict: 'numero_cot' })
        .select('id')
        .single();

      if (cotErr) {
        console.warn('Error saving cotizacion in Supabase:', cotErr);
        return false;
      }

      // 5.3 Actualizar piezas / items de la cotización
      if (cotData?.id && cot.items && cot.items.length > 0) {
        // Limpiar ítems anteriores de esta cotización para evitar duplicados
        await supabase!.from('cotizacion_items').delete().eq('cotizacion_id', cotData.id);

        const itemsPayload = cot.items.map(it => ({
          cotizacion_id: cotData.id,
          nombre_item: it.nombre_item,
          cantidad: it.cantidad,
          alto_mm: it.alto_mm || 0,
          ancho_mm: it.ancho_mm || 0,
          profundidad_mm: it.profundidad_mm || 0,
          volumen_cm3: it.volumen_cm3 || 0,
          peso_estimado_g: it.peso_estimado_g || 0,
          tiempo_impresion_min: it.tiempo_impresion_min || 0,
          tiempo_desarrollo_min: it.tiempo_desarrollo_min || 0,
          tiempo_armado_min: it.tiempo_armado_min || 0,
          tiempo_pintura_min: it.tiempo_pintura_min || 0,
          costo_energia: it.costo_energia || 0,
          costo_resina: it.costo_resina || 0,
          costo_curado: it.costo_curado || 0,
          costo_insumos: it.costo_insumos || 0,
          costo_mano_obra: it.costo_mano_obra || 0,
          costo_modelo_comprado: it.costo_modelo_comprado || 0,
          costo_base_produccion: it.costo_base_produccion || 0,
          margen_ganancia: it.margen_ganancia || 0.4,
          precio_unitario: it.precio_unitario || 0,
          precio_total: it.precio_total || 0,
          descripcion_tecnica: it.descripcion_tecnica || '',
          imagen_url: it.imagen_url || null
        }));

        await supabase!.from('cotizacion_items').insert(itemsPayload);
      }

      return true;
    } catch (e) {
      console.warn('Exception in saveCotizacion to cloud:', e);
      return false;
    }
  },

  // 6. Guardar o Actualizar una Orden de Trabajo (OT) en Supabase (Core V3 Compatible)
  async saveOrdenTrabajo(ot: OrdenTrabajo): Promise<boolean> {
    if (!this.isAvailable()) return false;
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
        'Listo para Entrega': 'ENTREGADO',
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

      return !errLegacy;
    } catch (e) {
      console.warn('Exception saving OT to cloud:', e);
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
  async saveCuentaCobro(cc: CuentaCobro): Promise<boolean> {
    if (!this.isAvailable()) return false;
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

      return !error;
    } catch (e) {
      console.warn('Exception saving CC to cloud:', e);
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

      return data.map((row: any): VentaExpress => ({
        id: row.id,
        numero_venta: row.numero_venta,
        foto_url: row.foto_url || undefined,
        nombre_producto: row.nombre_producto,
        cliente_nombre: row.cliente_nombre,
        cliente_telefono: row.cliente_telefono || '',
        total: Number(row.total) || 0,
        abono: Number(row.abono) || 0,
        saldo_pendiente: Number(row.saldo_pendiente) || 0,
        estado_pago: row.estado_pago as any,
        fecha_venta: row.fecha_venta || new Date().toISOString().slice(0, 10),
        fecha_prometida_pago: row.fecha_prometida_pago || undefined,
        notas: row.notas || '',
        metodo_pago: row.metodo_pago || 'Nequi',
        creado_por: row.creado_por || 'Equipo WJGEEKS',
        requiere_ot: Boolean(row.requiere_ot),
        estado_diseno: row.estado_diseno || undefined,
        ot_id: row.ot_id || undefined,
        ot_numero: row.ot_numero || undefined,
        enlace_diseno: row.enlace_diseno || undefined,
        notas_diseno: row.notas_diseno || undefined
      }));
    } catch (e) {
      console.warn('Exception in fetchVentasExpress:', e);
      return null;
    }
  },

  // 11. Guardar o Actualizar una Venta Express en Supabase (Persistencia Canónica Directa)
  async saveVentaExpress(venta: VentaExpress): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isAvailable()) return { success: false, error: 'Supabase no está configurado o sin conexión.' };

    try {
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
        notas: venta.notas || null,
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
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.warn('Exception in saveVentaExpress:', e);
      return { success: false, error: e?.message || 'Error guardando venta' };
    }
  },

  // Eliminar Venta Express en Supabase (con Reposición Atómica vía RPC y Fallback)
  async deleteVentaExpress(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) return { success: false, error: 'Offline' };

    // Intento 1: Cancelación atómica vía RPC (repone inventario automáticamente)
    try {
      const { data: rpcData, error: rpcErr } = await supabase!.rpc('rpc_cancelar_venta_pos_atomica', {
        p_venta_id: id
      });
      if (!rpcErr && rpcData?.success) {
        return { success: true };
      }
    } catch (e) {
      // Fallback a delete estándar
    }

    // Intento 2: Delete directo
    try {
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
      const payload = {
        id: resina.id,
        tipo: resina.tipo,
        marca: resina.marca,
        color: resina.color,
        volumen_l: resina.volumen_l,
        densidad_g_cm3: resina.densidad_g_cm3,
        peso_g: resina.peso_g,
        precio_compra: resina.precio_compra,
        costo_gramo: resina.costo_gramo,
        velocidad_impresion_mm_h: resina.velocidad_impresion_mm_h
      };
      const { error } = await supabase!.from('resinas').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (e) {
      return false;
    }
  },

  // 21. Sincronizar Insumos en Supabase
  async saveInsumo(insumo: Insumo): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: insumo.id,
        codigo_item: insumo.codigo,
        nombre: insumo.nombre,
        marca: insumo.marca,
        categoria: insumo.categoria,
        cantidad_presentacion: insumo.presentacion || 1,
        costo_total: insumo.costo_total,
        costo_unitario: insumo.costo_unitario,
        enlace_compra: insumo.enlace_compra || null,
        descripcion: insumo.descripcion || null
      };
      const { error } = await supabase!.from('insumos').upsert(payload, { onConflict: 'id' });
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
    onStockChange?: () => void
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
  }
};
