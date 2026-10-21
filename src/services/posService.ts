import { VentaExpress, AlertaCobroInfo, NivelAlertaPago, DeudorConsolidado } from '../types/pos';
import { ConfiguracionTaller } from '../types';
import { formatWhatsAppPhone } from './whatsappService';

export function calcularAlertaCobro(
  fechaPrometida?: string,
  saldoPendiente: number = 0
): AlertaCobroInfo {
  if (saldoPendiente <= 0) {
    return {
      nivel: 'pagado',
      diasDiferencia: 0,
      texto: 'Pagado Total ✓',
      color: '#34d399',
      badgeBg: 'rgba(16, 185, 129, 0.15)'
    };
  }

  if (!fechaPrometida) {
    return {
      nivel: 'al_dia',
      diasDiferencia: 999,
      texto: 'Sin fecha límite',
      color: '#94a3b8',
      badgeBg: 'rgba(148, 163, 184, 0.12)'
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [year, month, day] = fechaPrometida.split('-').map(Number);
  const fechaObj = new Date(year, (month || 1) - 1, day || 1);
  fechaObj.setHours(0, 0, 0, 0);

  const diffMs = fechaObj.getTime() - hoy.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    const diasVencido = Math.abs(diffDias);
    return {
      nivel: 'vencido',
      diasDiferencia: diffDias,
      texto: `Vencido hace ${diasVencido} día${diasVencido > 1 ? 's' : ''}`,
      color: '#f87171',
      badgeBg: 'rgba(239, 68, 68, 0.2)'
    };
  }

  if (diffDias === 0) {
    return {
      nivel: 'hoy',
      diasDiferencia: 0,
      texto: '¡Paga Hoy!',
      color: '#fbbf24',
      badgeBg: 'rgba(245, 158, 11, 0.25)'
    };
  }

  if (diffDias <= 2) {
    return {
      nivel: 'proximo',
      diasDiferencia: diffDias,
      texto: `Próximo (en ${diffDias} día${diffDias > 1 ? 's' : ''})`,
      color: '#38bdf8',
      badgeBg: 'rgba(56, 189, 248, 0.2)'
    };
  }

  return {
    nivel: 'al_dia',
    diasDiferencia: diffDias,
    texto: `Al día (en ${diffDias} días)`,
    color: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.15)'
  };
}

export function generarConsecutivoPOS(ventasExistentes: VentaExpress[]): string {
  if (ventasExistentes.length === 0) return 'POS-001';

  const numeros = ventasExistentes.map(v => {
    const match = v.numero_venta.match(/POS-(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  });

  const max = Math.max(0, ...numeros);
  const siguiente = max + 1;
  return `POS-${String(siguiente).padStart(3, '0')}`;
}

export function generarWhatsAppComprobantePOS(
  venta: VentaExpress,
  config: ConfiguracionTaller
): string {
  const phone = formatWhatsAppPhone(venta.cliente_telefono);
  const esPagado = venta.saldo_pendiente <= 0;

  const alerta = calcularAlertaCobro(venta.fecha_prometida_pago, venta.saldo_pendiente);

  const bloqueOT = venta.requiere_ot ? `
🛠️ *Orden de Trabajo:* ${venta.ot_numero || 'En Proceso'}
🎨 *Estado de Diseño:* ${venta.estado_diseno === 'requiere_nuevo' ? '⏳ Requiere Modelado Nuevo (Germán)' : '🟢 Diseño Listo (Para Producción)'}` : '';

  const mensaje = 
`👋 ¡Hola *${venta.cliente_nombre}*! 🎨📦
Te compartimos el comprobante de tu compra en *WJGEEKS 3D*:

🏷️ *Recibo N°:* ${venta.numero_venta}
🛠️ *Figura / Producto:* ${venta.nombre_producto}
📅 *Fecha:* ${venta.fecha_venta}${bloqueOT}

━━━━━━━━━━━━━━━━━━━━
💵 *Total:* $${venta.total.toLocaleString('es-CO')} COP
✅ *Abonado:* $${venta.abono.toLocaleString('es-CO')} COP
${esPagado ? '🎉 *ESTADO:* ¡PAGADO TOTAL!' : `⏳ *SALDO PENDIENTE:* $${venta.saldo_pendiente.toLocaleString('es-CO')} COP`}
━━━━━━━━━━━━━━━━━━━━
${!esPagado && venta.fecha_prometida_pago ? `\n📌 *Fecha límite acordada:* ${venta.fecha_prometida_pago} (${alerta.texto})\n` : ''}
${!esPagado ? `💳 *Medios de Pago Oficiales:*
• *Bre-B (Llave única):* ${config.bre_b || '0090778625'}
• *Nequi:* ${config.nequi} (${config.titular_cuenta})

Por favor envíanos tu soporte una vez realizado el pago. ¡Gracias por apoyar nuestro taller! ✨🚀` : '¡Muchísimas gracias por tu compra! Esperamos que disfrutes tu figura. ✨'}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
}

export function generarWhatsAppRecordatorioCobro(
  venta: VentaExpress,
  config: ConfiguracionTaller
): string {
  const phone = formatWhatsAppPhone(venta.cliente_telefono);
  const alerta = calcularAlertaCobro(venta.fecha_prometida_pago, venta.saldo_pendiente);

  const mensaje = 
`👋 Hola *${venta.cliente_nombre}*, ¿cómo estás?
Te escribimos desde el taller de *WJGEEKS 3D* con respecto a tu figura *${venta.nombre_producto}* (Recibo *${venta.numero_venta}*).

Te recordamos cordialmente que tienes un saldo pendiente por valor de *$${venta.saldo_pendiente.toLocaleString('es-CO')} COP* ${venta.fecha_prometida_pago ? `(Fecha acordada: ${venta.fecha_prometida_pago} — ${alerta.texto})` : ''}.

📲 *Puedes realizar tu pago a través de:*
• *Bre-B (Llave de transferencia):* ${config.bre_b || '0090778625'}
• *Nequi:* ${config.nequi} (${config.titular_cuenta})

Agradecemos nos compartas el comprobante para mantener tu cuenta al día. ¡Cualquier duda quedamos muy atentos! ✨`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
}

export function agruparDeudores(ventas: VentaExpress[]): DeudorConsolidado[] {
  const agrupado: Record<string, DeudorConsolidado> = {};

  ventas.forEach(v => {
    if (v.saldo_pendiente <= 0) return;

    const key = v.cliente_nombre.trim().toLowerCase();
    const alerta = calcularAlertaCobro(v.fecha_prometida_pago, v.saldo_pendiente);

    if (!agrupado[key]) {
      agrupado[key] = {
        cliente_nombre: v.cliente_nombre,
        cliente_telefono: v.cliente_telefono,
        total_deuda: 0,
        total_abonos: 0,
        saldo_pendiente_total: 0,
        ventas_pendientes: [],
        cuentas_pendientes_ids: [],
        peor_alerta: alerta.nivel,
        fecha_proximo_pago: v.fecha_prometida_pago
      };
    }

    agrupado[key].total_deuda += v.total;
    agrupado[key].total_abonos += v.abono;
    agrupado[key].saldo_pendiente_total += v.saldo_pendiente;
    agrupado[key].ventas_pendientes.push(v);

    // Prioridad de peor alerta: vencido > hoy > proximo > al_dia
    const prioridades: Record<NivelAlertaPago, number> = {
      vencido: 4,
      hoy: 3,
      proximo: 2,
      al_dia: 1,
      pagado: 0
    };

    if (prioridades[alerta.nivel] > prioridades[agrupado[key].peor_alerta]) {
      agrupado[key].peor_alerta = alerta.nivel;
    }
  });

  return Object.values(agrupado).sort((a, b) => b.saldo_pendiente_total - a.saldo_pendiente_total);
}
