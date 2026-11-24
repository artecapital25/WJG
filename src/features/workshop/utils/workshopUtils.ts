import { 
  OrdenTrabajo, 
  EstadoOT, 
  EstadoSTL, 
  ConfiguracionTaller, 
  Cotizacion,
  EnlaceReferenciaCompra
} from '../../../types';
import { formatWhatsAppPhone } from '../../../services/whatsappService';
import { findTeamContactByName } from '../../../services/messaging';
import { UsuarioTaller } from '../../../types/usuarios.types';
import { HandoffConfig } from '../types/workshop.types';

export const ETAPAS: EstadoOT[] = [
  'En Cola',
  'Imprimiendo',
  'Curado',
  'Pintura y Armado',
  'Control de Calidad',
  'Listo para Entrega'
];

export const TODAS_LAS_ETAPAS: EstadoOT[] = [
  ...ETAPAS,
  'Entregado'
];

export const ESTADOS_STL: EstadoSTL[] = [
  'Modelado Pendiente',
  'Diseñado por Germán',
  'Laminado por Juan',
  'En Impresora',
  'Impreso'
];

export function normalizarEstadoOT(estado: any): EstadoOT {
  if (!estado) return 'En Cola';
  const s = String(estado).toUpperCase().trim();
  if (s === 'ENTREGADO') return 'Entregado';
  if (s === 'EN_COLA_OT' || s === 'EN COLA' || s === 'COTIZACION') return 'En Cola';
  if (s === 'IMPRESION' || s === 'IMPRIMIENDO') return 'Imprimiendo';
  if (s === 'CURADO' || s === 'LAVADO_CURADO') return 'Curado';
  if (s === 'PINTADO_ARMADO' || s === 'PINTURA Y ARMADO' || s === 'PINTURA') return 'Pintura y Armado';
  if (s === 'CONTROL_CALIDAD' || s === 'CONTROL DE CALIDAD') return 'Control de Calidad';
  if (s === 'LISTO PARA ENTREGA' || s === 'TERMINADO') return 'Listo para Entrega';
  return 'En Cola';
}

export function getSiguienteEstado(actual: any): EstadoOT | null {
  const norm = normalizarEstadoOT(actual);
  if (norm === 'Listo para Entrega') return 'Entregado';
  if (norm === 'Entregado') return null;
  const idx = ETAPAS.indexOf(norm);
  if (idx >= 0 && idx < ETAPAS.length - 1) {
    return ETAPAS[idx + 1];
  }
  return null;
}

export function getHandoffConfig(
  ot: OrdenTrabajo,
  config: ConfiguracionTaller,
  usuarios?: UsuarioTaller[]
): HandoffConfig {
  const juan = findTeamContactByName('Juan', usuarios);
  const wendy = findTeamContactByName('Wendy', usuarios);
  const german = findTeamContactByName('Germán', usuarios);
  const telJuan = juan?.telefonoE164 || '573217273025';
  const telWendy = wendy?.telefonoE164 || '573204814702';
  const telGerman = german?.telefonoE164 || '573503443140';

  const estadoNorm = normalizarEstadoOT(ot.estado || (ot as any).estado_actual);
  switch (estadoNorm) {
    case 'En Cola':
      return {
        label: 'Pasar a Juan (Impresión)',
        nombre: juan?.nombreCorto || 'Juan',
        telefono: telJuan,
        correo: juan?.correo,
        icono: '🖨️',
        title: `Notificar a ${juan?.nombreCorto || 'Juan'} (+${telJuan}) para preparar archivo e iniciar impresión 3D`,
        mensaje: 
`👋 ¡Hola Juan! 🖨️
Te paso la orden *${ot.numero_ot}* para preparación en slicer e impresión en *WJGEEKS 3D*:

📦 *Orden:* ${ot.numero_ot}
🛠️ *Pieza:* ${ot.item_nombre} (Cant: ${ot.cantidad})
🧪 *Resina:* ${ot.resina_nombre || 'Standard'}
🖨️ *Máquina sugerida:* ${ot.maquina_nombre || 'Anycubic'}
${ot.stl_url ? `🔗 *Enlace STL:* ${ot.stl_url}\n` : ''}💰 *Abono registrado:* $${(ot.abono || 0).toLocaleString('es-CO')} COP

¡Por favor confirmar montaje en máquina! 🚀`
      };

    case 'Imprimiendo':
      return {
        label: 'Avisar Curado (Juan)',
        nombre: juan?.nombreCorto || 'Juan',
        telefono: telJuan,
        correo: juan?.correo,
        icono: '☀️',
        title: `Notificar a ${juan?.nombreCorto || 'Juan'} (+${telJuan}) para desmonte de máquina, lavado y curado UV`,
        mensaje: 
`👋 ¡Hola Juan! ☀️🧪
La pieza de la orden *${ot.numero_ot}* (${ot.item_nombre}) finaliza o avanza en impresión.
Por favor realizar lavado con IPA y curado en la cámara UV:

📦 *Orden:* ${ot.numero_ot}
🛠️ *Pieza:* ${ot.item_nombre}
🧪 *Resina:* ${ot.resina_nombre || 'Standard'}
🖨️ *Máquina:* ${ot.maquina_nombre || 'Anycubic'}

¡Confirmar cuando esté lista para acabados y pintura! 🚀`
      };

    case 'Curado':
      return {
        label: 'Pasar a Wendy (Pintura)',
        nombre: wendy?.nombreCorto || 'Wendy',
        telefono: telWendy,
        correo: wendy?.correo,
        icono: '🎨',
        title: `Notificar a ${wendy?.nombreCorto || 'Wendy'} (+${telWendy}) para lijado, acabados y pintura`,
        mensaje: 
`👋 ¡Hola Wendy! 🎨✨
La pieza de la orden *${ot.numero_ot}* completó impresión y curado UV. Pasa a tu área de acabados y pintura en *WJGEEKS 3D*:

📦 *Orden:* ${ot.numero_ot}
🛠️ *Pieza:* ${ot.item_nombre} (Cant: ${ot.cantidad})
🎨 *Va pintado:* ${ot.va_pintado ? 'Sí' : 'No'}
📦 *Empaque:* ${ot.tiene_empaque ? 'Sí' : 'Sin empaque especial'}
${ot.detalles_tecnicos ? `📝 *Detalles:* ${ot.detalles_tecnicos}\n` : ''}
¡Quedamos atentos a los acabados! ✨`
      };

    case 'Pintura y Armado':
      return {
        label: 'Pasar a Calidad (Equipo)',
        nombre: 'Equipo Tripartito (Grupo Taller)',
        telefono: telGerman,
        correo: german?.correo,
        isGrupoEquipo: true,
        icono: '🔍',
        title: 'Notificar al Grupo Taller / Equipo (Juan, Wendy, Germán) para control de calidad',
        mensaje: 
`🚨 [CONTROL DE CALIDAD WJG] 🔍
La orden *${ot.numero_ot}* (${ot.item_nombre}) ha terminado el proceso de pintura y armado.
Se requiere inspección de calidad antes de entrega:

📦 *Orden:* ${ot.numero_ot}
👤 *Cliente:* ${ot.cliente_nombre}
💰 *Saldo Pendiente:* $${(ot.saldo_pendiente || 0).toLocaleString('es-CO')} COP

Equipo (Juan, Wendy, Germán): Por favor verificar tolerancias, curado y acabados. 🚀`
      };

    case 'Control de Calidad':
      return {
        label: 'Pasar a Germán (Cobranzas)',
        nombre: german?.nombreCorto || 'Germán',
        telefono: telGerman,
        correo: german?.correo,
        icono: '💰',
        title: `Notificar a ${german?.nombreCorto || 'Germán'} (+${telGerman}) para cobro y despacho`,
        mensaje: 
`👋 ¡Hola Germán! 💼📦
La orden *${ot.numero_ot}* (${ot.item_nombre}) superó exitosamente el control de calidad.

👤 *Cliente:* ${ot.cliente_nombre} (${ot.cliente_telefono || 'Sin teléfono'})
💰 *Saldo Pendiente:* $${(ot.saldo_pendiente || 0).toLocaleString('es-CO')} COP
📲 *Medios oficiales:* Bre-B ${config.bre_b || '0090778625'} / Nequi ${config.nequi || '3217273025'}

Lista para cobrar saldo y autorizar despacho. ✨`
      };

    default: // 'Listo para Entrega'
      return {
        label: 'Avisar a Cliente',
        nombre: ot.cliente_nombre || 'Cliente',
        telefono: formatWhatsAppPhone(ot.cliente_telefono || ''),
        isCliente: true,
        icono: '📦',
        title: 'Enviar aviso de entrega y cobro final al cliente por WhatsApp y Correo',
        mensaje: 
`👋 ¡Hola *${ot.cliente_nombre || 'Cliente'}*! Un cordial saludo desde *WJGEEKS 3D* 🚀

Te informamos que tu pedido está *LISTO PARA ENTREGA*:
📋 *Orden:* ${ot.numero_ot}
🛠️ *Pieza:* ${ot.item_nombre}
💰 *Saldo pendiente:* $${(ot.saldo_pendiente || 0).toLocaleString('es-CO')} COP

📲 *Cuentas Oficiales para Transferencia:*
• *Bre-B (Llave única):* ${config.bre_b || '0090778625'}
• *Nequi:* ${config.nequi || '3217273025'}

Por favor envíanos tu soporte de pago para coordinar la entrega o envío inmediato. ¡Muchas gracias! ✨📦`
      };
  }
}

export function buildClienteNotificationMessage(ot: OrdenTrabajo, trackingUrl: string): string {
  return `👋 ¡Hola *${ot.cliente_nombre}*! 
Desde el taller de *WJGEEKS 3D* te informamos sobre el avance de tu orden:

📦 *Orden de Trabajo:* ${ot.numero_ot} (${ot.cotizacion_numero})
🛠️ *Pieza:* ${ot.item_nombre} (Cant: ${ot.cantidad})
🚦 *Estado Actual:* *${ot.estado}* ✨

${ot.estado === 'Imprimiendo' ? '⏳ La pieza se encuentra en la Anycubic MONO 4 en proceso de impresión.' : ''}
${ot.estado === 'Curado' ? '☀️ La pieza pasó a lavado y curado UV para máxima resistencia mecánica.' : ''}
${ot.estado === 'Pintura y Armado' ? '🎨 Nuestros artistas están aplicando los acabados y pintura de detalle.' : ''}
${ot.estado === 'Listo para Entrega' ? '🎉 ¡Tu pedido ha superado el control de calidad y está listo para despacho!' : ''}

🔍 Sigue el avance de tu pieza en vivo aquí:
${trackingUrl}

¡Te mantendremos al tanto! 🚀`;
}

export function resolveLinksDeOT(ot: OrdenTrabajo, cotizaciones: Cotizacion[] = []): EnlaceReferenciaCompra[] {
  if (ot.enlaces_compra && ot.enlaces_compra.length > 0) {
    return ot.enlaces_compra;
  }
  if (ot.cotizacion_numero || ot.cotizacion_id) {
    const parentCot = cotizaciones.find(c => 
      (ot.cotizacion_id && c.id === ot.cotizacion_id) || 
      (ot.cotizacion_numero && c.numero_cot === ot.cotizacion_numero)
    );
    if (parentCot && parentCot.items) {
      const matchingItem = parentCot.items.find(it => 
        it.nombre_item?.toLowerCase().trim() === ot.item_nombre?.toLowerCase().trim()
      );
      if (matchingItem?.enlaces_compra && matchingItem.enlaces_compra.length > 0) {
        return matchingItem.enlaces_compra;
      }
    }
  }
  return [];
}
