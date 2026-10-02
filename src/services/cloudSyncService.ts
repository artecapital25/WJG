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
  PiezaCotizada
} from '../types';

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
      const { data, error } = await supabase!
        .from('cotizaciones')
        .select('*, cliente:clientes(*), items:cotizacion_items(*)')
        .order('numero_cot', { ascending: false });

      if (error) {
        console.warn('Error fetching cotizaciones from Supabase:', error);
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
          fecha: row.fecha || new Date().toISOString().slice(0, 10),
          estado: row.estado as any,
          items: itemsMapeados,
          subtotal: Number(row.subtotal) || 0,
          iva_porcentaje: Number(row.iva_porcentaje) || 0,
          descuento_porcentaje: Number(row.descuento_porcentaje) || 0,
          total: Number(row.total) || 0,
          tiempo_entrega_estimado: row.tiempo_entrega_estimado || '(3) Días hábiles',
          notas: row.notas || 'No incluye transporte fuera del perímetro urbano.'
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

      return data.map((row: any): OrdenTrabajo => ({
        id: row.id,
        numero_ot: row.numero_ot,
        cotizacion_id: row.cotizacion_id || '',
        cotizacion_numero: row.numero_ot.replace('OT-', 'COT-'),
        cliente_nombre: row.cliente_nombre,
        cliente_telefono: row.cliente_telefono || '',
        item_nombre: row.item_nombre,
        cantidad: Number(row.cantidad) || 1,
        estado: row.estado as any,
        operador_asignado: row.operador_asignado || 'Operador 3D',
        fecha_creacion: row.created_at || new Date().toISOString(),
        tiempo_impresion_min: 0,
        tiempo_armado_min: 0,
        tiempo_pintura_min: 0,
        resina_nombre: 'Resina Standard',
        maquina_nombre: 'Anycubic MONO 4',
        va_pintado: false,
        tiene_empaque: false,
        detalles_tecnicos: row.observaciones || ''
      }));
    } catch (e) {
      console.warn('Exception in fetchOrdenes:', e);
      return null;
    }
  },

  // 5. Traer Cuentas de Cobro desde la Nube
  async fetchCuentas(): Promise<CuentaCobro[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('cuentas_cobro')
        .select('*, cliente:clientes(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching cuentas_cobro:', error);
        return null;
      }

      if (!data || data.length === 0) return [];

      return data.map((row: any): CuentaCobro => {
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

        return {
          id: row.id,
          numero_cc: row.numero_cc,
          cotizacion_id: row.cotizacion_id || '',
          cotizacion_numero: row.numero_cc.replace('CC-', 'COT-'),
          cliente: clienteMapeado,
          fecha_emision: row.fecha_emision || new Date().toISOString().slice(0, 10),
          items_resumen: 'Servicios de Impresión 3D y Manufactura',
          total: Number(row.total) || 0,
          abono: Number(row.abono) || 0,
          saldo_pendiente: Number(row.saldo_pendiente) || 0,
          estado_pago: (row.estado_pago as any) || 'Pendiente',
          comprobante_url: row.comprobante_url || undefined
        };
      });
    } catch (e) {
      console.warn('Exception in fetchCuentas:', e);
      return null;
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

      // 5.2 Upsert de la cotización por numero_cot
      const { data: cotData, error: cotErr } = await supabase!
        .from('cotizaciones')
        .upsert({
          numero_cot: cot.numero_cot,
          cliente_id: clienteId,
          vendedor_nombre: cot.vendedor || 'Equipo WJGEEKS',
          fecha: cot.fecha || new Date().toISOString().slice(0, 10),
          estado: cot.estado,
          subtotal: cot.subtotal,
          iva_porcentaje: cot.iva_porcentaje || 0,
          descuento_porcentaje: cot.descuento_porcentaje || 0,
          total: cot.total,
          tiempo_entrega_estimado: cot.tiempo_entrega_estimado,
          notas: cot.notas
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

  // 6. Guardar o Actualizar una Orden de Trabajo (OT) en Supabase
  async saveOrdenTrabajo(ot: OrdenTrabajo): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!
        .from('ordenes_trabajo')
        .upsert({
          numero_ot: ot.numero_ot,
          cliente_nombre: ot.cliente_nombre,
          item_nombre: ot.item_nombre,
          cantidad: ot.cantidad,
          estado: ot.estado,
          operador_asignado: ot.operador_asignado || 'Operador 3D',
          observaciones: ot.detalles_tecnicos || null
        }, { onConflict: 'numero_ot' });

      if (error) {
        console.warn('Error saving OT to cloud:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Exception saving OT to cloud:', e);
      return false;
    }
  },

  // 7. Guardar o Actualizar una Cuenta de Cobro en Supabase
  async saveCuentaCobro(cc: CuentaCobro): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!
        .from('cuentas_cobro')
        .upsert({
          numero_cc: cc.numero_cc,
          fecha_emision: cc.fecha_emision || new Date().toISOString().slice(0, 10),
          total: cc.total,
          abono: cc.abono,
          saldo_pendiente: cc.saldo_pendiente,
          estado_pago: cc.estado_pago
        }, { onConflict: 'numero_cc' });

      if (error) {
        console.warn('Error saving CC to cloud:', error);
        return false;
      }
      return true;
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

  // 9. Escucha en tiempo real para sincronización entre dispositivos móviles y PCs
  subscribeRealtime(onCotizacionChange: () => void, onOTChange: () => void, onCuentaChange: () => void) {
    if (!this.isAvailable()) return null;

    const channel = supabase!.channel('wjgeeks_live_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => {
        onCotizacionChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_trabajo' }, () => {
        onOTChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_cobro' }, () => {
        onCuentaChange();
      })
      .subscribe();

    return channel;
  }
};
