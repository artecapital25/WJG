import { Cotizacion, CuentaCobro, ConfiguracionTaller } from '../types';

export function formatWhatsAppPhone(phone: string): string {
  // Strip non-digits
  const clean = phone.replace(/\D/g, '');
  // If Colombia without country code, prepend 57
  if (clean.length === 10 && clean.startsWith('3')) {
    return `57${clean}`;
  }
  return clean;
}

export function generateCotizacionWhatsAppUrl(
  cotizacion: Cotizacion,
  config: ConfiguracionTaller
): string {
  const esParcial = cotizacion.estado === 'Parcial' || cotizacion.items.some(i => i.datos_pendientes);

  const itemsText = cotizacion.items
    .map((item) => {
      const descMedidas = item.datos_pendientes 
        ? `_[Medidas y resina pendientes de confirmar en Slicer]_`
        : `_${item.alto_mm}x${item.ancho_mm}x${item.profundidad_mm}mm en ${item.resina_nombre}_`;
      return `• *${item.nombre_item}* (Cant: ${item.cantidad}) - $${item.precio_total.toLocaleString('es-CO')} COP\n  ${descMedidas}`;
    })
    .join('\n');

  const mensaje = 
`👋 ¡Hola *${cotizacion.cliente.nombre}*!

Te compartimos la ${esParcial ? '*cotización preliminar/parcial*' : '*cotización oficial*'} de *WJGEEKS 3D* 🚀:

📄 *Cotización N°:* ${cotizacion.numero_cot}${esParcial ? ' _(🟡 Parcial / Pendiente Slicer)_' : ''}
📅 *Fecha:* ${cotizacion.fecha}
⏱️ *Tiempo estimado de entrega:* ${cotizacion.tiempo_entrega_estimado}

🛠️ *Detalle de piezas:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💰 *Subtotal:* $${cotizacion.subtotal.toLocaleString('es-CO')} COP
${cotizacion.descuento_porcentaje > 0 ? `🏷️ *Descuento:* ${cotizacion.descuento_porcentaje}%\n` : ''}💵 *TOTAL ESTIMADO:* $${cotizacion.total.toLocaleString('es-CO')} COP
━━━━━━━━━━━━━━━━━━━━
${esParcial ? '\n⚠️ *AVISO:* Cotización preliminar. Los gramos de resina y dimensiones finales se confirmarán al abrir y laminar los modelos 3D en el programa de corte.\n' : ''}
📝 *Notas:*
${cotizacion.notas || '- No incluye costo de envío fuera de la cobertura.\n- Fabricación inicia tras confirmación del 50% de anticipo.'}

📲 *Contacto:* ${config.telefono_contacto} | Instagram: ${config.instagram}
¡Quedamos atentos a tus comentarios! ✨🖨️`;

  const phone = formatWhatsAppPhone(cotizacion.cliente.telefono);
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
}

export function generateCuentaCobroWhatsAppUrl(
  cuenta: CuentaCobro,
  config: ConfiguracionTaller
): string {
  const phone = formatWhatsAppPhone(cuenta.cliente.telefono);
  
  const mensaje = 
`👋 Estimado/a *${cuenta.cliente.nombre}*,

Te enviamos la cuenta de cobro correspondiente a tu pedido en *WJGEEKS 3D* 🎨📦:

📋 *Cuenta de Cobro N°:* ${cuenta.numero_cc}
🔖 *Ref. Cotización:* ${cuenta.cotizacion_numero}
📅 *Fecha:* ${cuenta.fecha_emision}
🛠️ *Concepto:* ${cuenta.items_resumen}

━━━━━━━━━━━━━━━━━━━━
💵 *Total del Pedido:* $${cuenta.total.toLocaleString('es-CO')} COP
✅ *Abono Realizado:* $${cuenta.abono.toLocaleString('es-CO')} COP
⏳ *SALDO PENDIENTE:* $${cuenta.saldo_pendiente.toLocaleString('es-CO')} COP
━━━━━━━━━━━━━━━━━━━━

📲 *Medios de Pago Oficiales:*
• *Nequi:* ${config.nequi}
• *Daviplata:* ${config.daviplata}
• *Bancolombia:* ${config.bancolombia} (${config.titular_cuenta})

Por favor envíanos tu comprobante para coordinar el despacho inmediato. ¡Muchas gracias por tu compra! ✨🚀`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
}

export function openWhatsApp(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
