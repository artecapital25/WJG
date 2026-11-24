import { SolicitudInsumo, TareaEquipo } from '../../types';
import { EmailTipo } from './messagingTypes';

export interface BuiltUnifiedMessage {
  whatsappText: string;
  emailSubject: string;
  emailType: EmailTipo;
  emailData: Record<string, any>;
  trackingUrl: string;
}

function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://wjg-lyart.vercel.app';
}

export function buildTareaMessage(
  tarea: TareaEquipo,
  evento: 'asignada' | 'actualizada' | 'completada' = 'asignada',
  opts?: { destinatarioSaludo?: string }
): BuiltUnifiedMessage {
  const prioridadTexto =
    tarea.prioridad === 'urgente'
      ? '🔥 URGENTE'
      : tarea.prioridad === 'alta'
      ? '⚠️ ALTA'
      : tarea.prioridad === 'baja'
      ? '🟢 Baja'
      : '📌 Normal';

  const tipoTexto =
    tarea.tipo === 'periodica'
      ? `🔄 Rutina ${tarea.frecuencia || 'periódica'}`
      : '🎯 Tarea Puntual';

  const encabezado =
    evento === 'completada'
      ? '✅ *TAREA COMPLETADA*'
      : evento === 'actualizada'
      ? '✏️ *TAREA ACTUALIZADA*'
      : tarea.asignado_a === 'Todos'
      ? '👥 *NUEVA TAREA GRUPAL (EQUIPO)*'
      : '📋 *NUEVA TAREA ASIGNADA*';

  const saludo = opts?.destinatarioSaludo
    ? `👋 ¡Hola *${opts.destinatarioSaludo}*!`
    : tarea.asignado_a === 'Todos'
    ? '👋 ¡Hola *Equipo WJGEEKS 3D*!'
    : `👋 ¡Hola *${tarea.asignado_a}*!`;

  const trackingUrl = `${getAppOrigin()}/?tab=tareas`;

  const lines = [
    saludo,
    `${encabezado} en *WJGEEKS 3D*:`,
    ``,
    `📌 *Título:* ${tarea.titulo}`,
    `👤 *Responsable:* ${tarea.asignado_a}`,
    `🚦 *Prioridad:* ${prioridadTexto}`,
    `🏷️ *Tipo:* ${tipoTexto}`,
    ...(tarea.fecha_limite ? [`📅 *Fecha límite:* ${tarea.fecha_limite}`] : []),
    ...(tarea.descripcion ? [`📝 *Detalles:* ${tarea.descripcion}`] : []),
    ``,
    `📲 Gestionar en el panel: ${trackingUrl}`
  ];

  const emailSubject =
    evento === 'completada'
      ? `✅ Tarea Completada: ${tarea.titulo}`
      : evento === 'actualizada'
      ? `✏️ Tarea Actualizada (${tarea.asignado_a}): ${tarea.titulo}`
      : tarea.asignado_a === 'Todos'
      ? `👥 Nueva Tarea Grupal: ${tarea.titulo}`
      : `📋 Nueva Tarea para ${tarea.asignado_a}: ${tarea.titulo}`;

  const emailType: EmailTipo =
    evento === 'completada'
      ? 'tarea_completada'
      : evento === 'actualizada'
      ? 'tarea_actualizada'
      : 'tarea_asignada';

  return {
    whatsappText: lines.join('\n'),
    emailSubject,
    emailType,
    trackingUrl,
    emailData: {
      numero_doc: tarea.id,
      titulo: tarea.titulo,
      descripcion: tarea.descripcion || '',
      asignado_a: tarea.asignado_a,
      prioridad: tarea.prioridad,
      tipo_tarea: tipoTexto,
      fecha_limite: tarea.fecha_limite || '',
      fecha: tarea.fecha_creacion,
      mensaje_personalizado: tarea.descripcion || `Tarea ${tipoTexto} asignada a ${tarea.asignado_a}.`
    }
  };
}

export function buildTareaAvanceMessage(
  tarea: TareaEquipo,
  avance: { nota: string; porcentaje: number; autor: string }
): BuiltUnifiedMessage {
  const trackingUrl = `${getAppOrigin()}/?tab=tareas`;
  const lines = [
    `📈 *NUEVO AVANCE EN TAREA — WJGEEKS 3D*`,
    `📌 *Tarea:* ${tarea.titulo}`,
    `👤 *Responsable:* ${tarea.asignado_a}`,
    `✍️ *Reportó:* ${avance.autor}`,
    `📊 *Progreso:* *${avance.porcentaje}%*`,
    `📝 *Nota:* ${avance.nota}`,
    ``,
    `📲 Ver bitácora: ${trackingUrl}`
  ];

  return {
    whatsappText: lines.join('\n'),
    emailSubject: `📈 Avance ${avance.porcentaje}% en "${tarea.titulo}" (${avance.autor})`,
    emailType: 'tarea_avance',
    trackingUrl,
    emailData: {
      numero_doc: tarea.id,
      titulo: tarea.titulo,
      asignado_a: tarea.asignado_a,
      progreso: avance.porcentaje,
      autor_avance: avance.autor,
      mensaje_personalizado: avance.nota,
      fecha: new Date().toLocaleString('es-CO')
    }
  };
}

export function buildSOSInsumoMessage(
  solicitud: SolicitudInsumo,
  evento: 'creada' | 'seguimiento' = 'creada'
): BuiltUnifiedMessage {
  const urgenciaTexto =
    solicitud.urgencia === 'taller_detenido'
      ? '🚨 ¡TALLER DETENIDO!'
      : solicitud.urgencia === 'urgente'
      ? '⚠️ URGENTE'
      : '📦 Normal';

  const trackingUrl = `${getAppOrigin()}/?tab=tareas`;
  const tituloHeader =
    evento === 'seguimiento'
      ? '🔎 *SEGUIMIENTO DE ORDEN DE INSUMO*'
      : '🚨 *S.O.S INSUMOS — NUEVA ORDEN DE COMPRA*';

  const lines = [
    tituloHeader,
    `🛒 *Insumo:* ${solicitud.insumo_nombre}`,
    `🔢 *Cantidad:* ${solicitud.cantidad} ${solicitud.unidad}`,
    `🚦 *Urgencia:* ${urgenciaTexto}`,
    `👤 *Solicita:* ${solicitud.solicitado_por}`,
    `💼 *Encargado compra:* ${solicitud.encargado_compra}`,
    ...(solicitud.numero_guia ? [`📦 *Guía:* ${solicitud.numero_guia}`] : []),
    ...(solicitud.enlace_compra ? [`🔗 *Enlace compra:* ${solicitud.enlace_compra}`] : []),
    ...(solicitud.notas ? [`📝 *Notas:* ${solicitud.notas}`] : []),
    ``,
    `📲 Gestionar orden: ${trackingUrl}`
  ];

  return {
    whatsappText: lines.join('\n'),
    emailSubject:
      evento === 'seguimiento'
        ? `🔎 Seguimiento Insumo: ${solicitud.insumo_nombre}`
        : `🚨 S.O.S Insumo (${(solicitud.urgencia || 'urgente').toUpperCase()}): ${solicitud.insumo_nombre}`,
    emailType: 'sos_insumo',
    trackingUrl,
    emailData: {
      numero_doc: solicitud.id,
      item_nombre: solicitud.insumo_nombre,
      cantidad: solicitud.cantidad,
      unidad: solicitud.unidad,
      urgencia: solicitud.urgencia,
      asignado_a: solicitud.encargado_compra,
      enlace_compra: solicitud.enlace_compra || '',
      mensaje_personalizado:
        solicitud.notas ||
        `Solicitado por ${solicitud.solicitado_por}. Cantidad: ${solicitud.cantidad} ${solicitud.unidad}.`,
      fecha: solicitud.fecha_solicitud
    }
  };
}

export function buildStockBajoBatchMessage(solicitudes: SolicitudInsumo[]): BuiltUnifiedMessage {
  const trackingUrl = `${getAppOrigin()}/?tab=tareas`;
  const itemsLines = solicitudes.map(
    s =>
      `• *${s.insumo_nombre}* (${s.cantidad} ${s.unidad}) — ${
        s.urgencia === 'taller_detenido' ? '🚨 AGOTADO' : '⚠️ Stock bajo'
      }`
  );

  const lines = [
    `⚠️ *ALERTA AUTOMÁTICA DE BODEGA — WJGEEKS 3D*`,
    `Se generaron *${solicitudes.length}* orden(es) de reposición S.O.S por stock mínimo:`,
    ``,
    ...itemsLines,
    ``,
    `💼 *Encargado sugerido:* ${solicitudes[0]?.encargado_compra || 'Wendy'}`,
    `📲 Revisar en S.O.S Insumos: ${trackingUrl}`
  ];

  return {
    whatsappText: lines.join('\n'),
    emailSubject: `⚠️ Alerta Stock Bajo (${solicitudes.length} ítem${solicitudes.length > 1 ? 's' : ''}) — WJGEEKS 3D`,
    emailType: 'stock_bajo',
    trackingUrl,
    emailData: {
      numero_doc: solicitudes.map(s => s.insumo_nombre).join(', ').slice(0, 60),
      titulo: `Reposición automática requerida (${solicitudes.length} ítem(s))`,
      asignado_a: solicitudes[0]?.encargado_compra || 'Wendy',
      urgencia: solicitudes.some(s => s.urgencia === 'taller_detenido') ? 'taller_detenido' : 'urgente',
      mensaje_personalizado: itemsLines.join('\n'),
      fecha: new Date().toLocaleString('es-CO')
    }
  };
}

export function buildTestConnectionMessage(destinatarioNombre: string = 'Equipo WJGEEKS'): BuiltUnifiedMessage {
  const trackingUrl = getAppOrigin();
  const hora = new Date().toLocaleTimeString('es-CO');
  const lines = [
    `🧪 *WJGEEKS 3D PRO — Prueba de Canal Oficial*`,
    ``,
    `¡Hola *${destinatarioNombre}*! Esta es una verificación en vivo del motor centralizado de mensajería (+57 320 2796115).`,
    `🕒 Hora: ${hora}`,
    ``,
    `_Enviado automáticamente desde WJGEEKS 3D PRO._`
  ];

  return {
    whatsappText: lines.join('\n'),
    emailSubject: `🧪 Verificación de Correo WJGEEKS 3D (wjgeeks3d@gmail.com)`,
    emailType: 'prueba_conexion',
    trackingUrl,
    emailData: {
      numero_doc: `TEST-${Date.now().toString().slice(-4)}`,
      mensaje_personalizado:
        'Este correo certifica la entrega real y verificada desde WJGEEKS 3D PRO sin falsos positivos.',
      fecha: new Date().toLocaleString('es-CO')
    }
  };
}
