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
  CuentaCobro 
} from '../types';

export const CloudSyncService = {
  isAvailable: () => isSupabaseConfigured && supabase !== null,

  // Probar conexión
  async checkConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { ok: false, message: 'Faltan las credenciales VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env' };
    }
    try {
      const { data, error } = await supabase!.from('configuracion_taller').select('*').limit(1);
      if (error) throw error;
      return { ok: true, message: 'Conexión exitosa con la base de datos Supabase en la nube.' };
    } catch (e: any) {
      return { ok: false, message: `Error de conexión: ${e.message || e}` };
    }
  },

  // Sembrar datos iniciales del Excel a Supabase
  async seedInitialData(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { success: false, message: 'Supabase no está configurado.' };
    }

    try {
      // 1. Configuración de taller
      const { data: existingCfg } = await supabase!.from('configuracion_taller').select('id').limit(1);
      if (!existingCfg || existingCfg.length === 0) {
        await supabase!.from('configuracion_taller').insert([CONFIGURACION_INICIAL]);
      }

      // 2. Resinas
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

      // 3. Maquinaria
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

      // 4. Insumos
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

      // 5. Personal
      const { data: existingPer } = await supabase!.from('tarifas_personal').select('id').limit(1);
      if (!existingPer || existingPer.length === 0) {
        const payloadPer = PERSONAL_INICIAL.map(p => ({
          rol: p.rol,
          costo_hora: p.costo_hora,
          costo_minuto: p.costo_minuto
        }));
        await supabase!.from('tarifas_personal').insert(payloadPer);
      }

      // 6. Clientes
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

      return { success: true, message: 'Todos los datos maestros del Excel fueron subidos exitosamente a Supabase.' };
    } catch (e: any) {
      console.error('Error seeding data:', e);
      return { success: false, message: `Error sembrando datos: ${e.message || e}` };
    }
  },

  // Escucha en tiempo real para sincronización entre dispositivos móviles y PCs
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
