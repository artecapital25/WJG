import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Cotizacion, CuentaCobro, ConfiguracionTaller } from '../types';
import { generateCotizacionWhatsAppUrl, generateCuentaCobroWhatsAppUrl } from './whatsappService';

let cachedLogoDataUrl: string | null = null;

/**
 * Obtiene el logotipo vectorial de WJGEEKS 3D rasterizado como Data URL PNG de alta resolución.
 * Se cachea en memoria para que la generación de PDFs sea ultrarrápida.
 */
export async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      const timer = setTimeout(() => {
        resolve(null);
      }, 1500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          const size = 512;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, size, size);
            cachedLogoDataUrl = canvas.toDataURL('image/png');
            resolve(cachedLogoDataUrl);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.warn('No se pudo rasterizar el logo para PDF:', e);
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };

      img.src = '/wjg_logo_vector.svg';
    } catch {
      resolve(null);
    }
  });
}

// Pre-cargar logo en memoria en cuanto se cargue el módulo en el navegador
if (typeof window !== 'undefined') {
  getLogoDataUrl().catch(() => {});
}

export function crearDocPDFCotizacion(
  cotizacion: Cotizacion, 
  config: ConfiguracionTaller,
  logoDataUrl?: string | null
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Bar (#0f172a)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  const logo = logoDataUrl || cachedLogoDataUrl;
  let brandTextX = 15;

  if (logo) {
    try {
      // Dibujar logo de la empresa (20mm x 20mm centrado verticalmente en la barra de 28mm)
      doc.addImage(logo, 'PNG', 15, 4, 20, 20);
      brandTextX = 39;
    } catch (e) {
      console.warn('Error al insertar logo en PDF:', e);
      brandTextX = 15;
    }
  }

  // Nombre de la marca
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('WJGEEKS 3D', brandTextX, 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248); // Cyan
  doc.text('Impresión 3D de Precisión & Resina Artística', brandTextX, 19);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Taller de Prototipado, Fabricación Digital & Acabados', brandTextX, 24);

  // Quote Badge (Lado derecho)
  const esParcial = cotizacion.estado === 'Parcial' || cotizacion.items.some(i => i.datos_pendientes);
  
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`COTIZACIÓN N° ${cotizacion.numero_cot}${esParcial ? ' (PRELIMINAR)' : ''}`, pageWidth - 15, 12, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha: ${cotizacion.fecha}`, pageWidth - 15, 17, { align: 'right' });

  doc.setFontSize(7.5);
  if (esParcial) {
    doc.setTextColor(234, 179, 8); // Yellow warning
    doc.text('Cotización Parcial / Preliminar', pageWidth - 15, 23, { align: 'right' });
  } else {
    doc.setTextColor(56, 189, 248); // Cyan
    doc.text('Documento Oficial de Cotización', pageWidth - 15, 23, { align: 'right' });
  }

  // 2. Client Info Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 34, pageWidth - 30, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 34, pageWidth - 30, 28, 3, 3, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 20, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Cliente: ${cotizacion.cliente.nombre}`, 20, 48);
  doc.text(`NIT / CC: ${cotizacion.cliente.nit_cc || 'No especificado'}`, 20, 54);

  doc.text(`Teléfono / WhatsApp: ${cotizacion.cliente.telefono}`, 110, 48);
  doc.text(`Correo: ${cotizacion.cliente.correo || 'No especificado'}`, 110, 54);

  // 3. Table of Items (Soporta columna de fotos si hay ítems con imagen o captura 3D)
  const hasImages = cotizacion.items.some(i => !!i.imagen_url);

  const tableData = cotizacion.items.map((item, index) => {
    const descMedidas = item.datos_pendientes 
      ? '[Medidas y resina por verificar en Slicer]' 
      : `${item.alto_mm}mm (Z: Alto) x ${item.ancho_mm}mm (X: Ancho) x ${item.profundidad_mm}mm (Y: Fondo)`;

    const vaPintado = item.va_pintado !== undefined
      ? item.va_pintado
      : (item.tiempo_pintura_min > 0 || Boolean(item.lista_pinturas && item.lista_pinturas.length > 0));

    const tieneEmpaque = item.tiene_empaque !== undefined
      ? item.tiene_empaque
      : Boolean(item.lista_empaques && item.lista_empaques.length > 0);

    const txtPintura = vaPintado ? 'Sí (Pintado)' : 'No (Color natural de resina)';
    const txtEmpaque = tieneEmpaque && item.lista_empaques && item.lista_empaques.length > 0
      ? `Sí (${item.lista_empaques.map(e => e.nombre).join(', ')})`
      : tieneEmpaque ? 'Sí' : 'No';

    // Unificado en una sola línea clara para material y dimensiones (evita doble espacio confuso)
    let specText = `${item.nombre_item}\n• Medidas: ${descMedidas} | Material: ${item.resina_nombre}\n• Pintura: ${txtPintura}  |  Empaque: ${txtEmpaque}`;

    if (item.precio_fijado_tarifa && item.tarifa_tamano_aplicada) {
      specText += `\n• Tarifa: Escala básica ${item.tarifa_tamano_aplicada.altura_cm} cm`;
    }
    if (item.lista_accesorios && item.lista_accesorios.length > 0) {
      specText += `\n• Herrajes: ${item.lista_accesorios.map(a => `${a.nombre} (x${a.cantidad})`).join(', ')}`;
    }
    // Procesos especiales / adicionales especificados con claridad para el cliente
    const procesosVisibles = (item.maquinas_involucradas || [])
      .filter(m => 
        Boolean(m.mostrar_en_cliente) && 
        m.proceso && 
        m.proceso.trim().toLowerCase() !== 'proceso adicional' &&
        m.proceso.trim().toLowerCase() !== 'impresión 3d' &&
        m.proceso.trim().toLowerCase() !== 'lavado y curado uv'
      )
      .map(m => m.proceso.trim());

    if (procesosVisibles.length > 0) {
      specText += `\n• Proceso Extra: ${procesosVisibles.join(' • ')}`;
    }

    if (hasImages) {
      return [
        (index + 1).toString(),
        '', // La celda de imagen se dibuja en didDrawCell
        specText,
        item.cantidad.toString(),
        `$${item.precio_unitario.toLocaleString('es-CO')}`,
        `$${item.precio_total.toLocaleString('es-CO')}`
      ];
    } else {
      return [
        (index + 1).toString(),
        specText,
        item.cantidad.toString(),
        `$${item.precio_unitario.toLocaleString('es-CO')}`,
        `$${item.precio_total.toLocaleString('es-CO')}`
      ];
    }
  });

  autoTable(doc, {
    startY: 68,
    head: hasImages 
      ? [['#', 'Foto / Ref.', 'Descripción y Especificaciones', 'Cant.', 'Valor Unidad', 'Total']]
      : [['#', 'Descripción y Especificaciones', 'Cant.', 'Valor Unidad', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [27, 98, 177], // Brand Blue #1b62b1
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
      minCellHeight: hasImages ? 24 : 8
    },
    columnStyles: hasImages ? {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 26 },
      2: { cellWidth: 78 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 30 }
    } : {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 95 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 34 }
    },
    didDrawCell: (data) => {
      if (hasImages && data.section === 'body' && data.column.index === 1) {
        const item = cotizacion.items[data.row.index];
        if (item && item.imagen_url) {
          try {
            const imgBoxSize = 20;
            const x = data.cell.x + (data.cell.width - imgBoxSize) / 2;
            const y = data.cell.y + (data.cell.height - imgBoxSize) / 2;

            // Marco decorativo y fondo suave para la imagen
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x - 0.5, y - 0.5, imgBoxSize + 1, imgBoxSize + 1, 1, 1, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x - 0.5, y - 0.5, imgBoxSize + 1, imgBoxSize + 1, 1, 1, 'S');

            // Determinar formato para jsPDF
            const isPng = item.imagen_url.startsWith('data:image/png');
            const format = isPng ? 'PNG' : 'JPEG';
            doc.addImage(item.imagen_url, format, x, y, imgBoxSize, imgBoxSize);
          } catch (e) {
            console.warn('Error al insertar imagen de item en PDF:', e);
          }
        } else {
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(7.5);
          doc.text('—', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Totals Block
  const totalsX = pageWidth - 80;
  doc.setFontSize(9);

  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', totalsX, finalY);
  doc.text(`$${cotizacion.subtotal.toLocaleString('es-CO')} COP`, pageWidth - 15, finalY, { align: 'right' });

  if (cotizacion.descuento_porcentaje > 0) {
    doc.text(`Descuento (${cotizacion.descuento_porcentaje}%):`, totalsX, finalY + 6);
    doc.text(`-$${((cotizacion.subtotal * cotizacion.descuento_porcentaje) / 100).toLocaleString('es-CO')} COP`, pageWidth - 15, finalY + 6, { align: 'right' });
  }

  // Total Bar
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(totalsX - 4, finalY + 11, 69, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL:', totalsX, finalY + 18);
  doc.text(`$${cotizacion.total.toLocaleString('es-CO')} COP`, pageWidth - 17, finalY + 18, { align: 'right' });

  // 5. Notes & Terms
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CONDICIONES Y OBSERVACIONES:', 15, finalY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`- Tiempo estimado de fabricación y entrega: ${cotizacion.tiempo_entrega_estimado}`, 15, finalY + 5.5);
  doc.text('- La orden entra en cola de impresión tras confirmar el 50% de anticipo.', 15, finalY + 10.5);
  doc.text('- Cotización válida por 15 días a partir de la fecha de emisión.', 15, finalY + 15.5);

  // Procesar notas personalizadas limpiando guiones repetidos ("- -") y saltos de línea
  const notasRaw = cotizacion.notas?.trim() || 'No incluye transporte fuera del perímetro urbano.';
  const lineasNotas = notasRaw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^[-•*–—\s]+/, '').trim())
    .filter(l => {
      const lower = l.toLowerCase();
      if (lower.includes('50%') && (lower.includes('anticipo') || lower.includes('contra entrega'))) {
        return false;
      }
      return l.length > 0;
    });

  let currentNotaY = finalY + 20.5;
  if (lineasNotas.length === 0) {
    doc.text('- No incluye transporte fuera del perímetro urbano.', 15, currentNotaY);
  } else {
    lineasNotas.forEach(linea => {
      if (currentNotaY < 255) {
        doc.text(`- ${linea}`, 15, currentNotaY);
        currentNotaY += 4.5;
      }
    });
  }

  // 6. Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 260, pageWidth, 20, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text(`Contacto: ${config.telefono_contacto} / ${config.telefono_contacto2} | Instagram: ${config.instagram}`, pageWidth / 2, 271, { align: 'center' });

  return doc;
}

export async function generarPDFCotizacion(cotizacion: Cotizacion, config: ConfiguracionTaller) {
  const logo = await getLogoDataUrl();
  const doc = crearDocPDFCotizacion(cotizacion, config, logo);
  const filename = `Cotizacion_${cotizacion.numero_cot}_${cotizacion.cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

export async function compartirPDFWhatsApp(cotizacion: Cotizacion, config: ConfiguracionTaller) {
  const logo = await getLogoDataUrl();
  const doc = crearDocPDFCotizacion(cotizacion, config, logo);
  const filename = `Cotizacion_${cotizacion.numero_cot}_${cotizacion.cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Cotización ${cotizacion.numero_cot} - WJGEEKS 3D`,
        text: `Hola ${cotizacion.cliente.nombre}, te adjuntamos la cotización oficial N° ${cotizacion.numero_cot} de WJGEEKS 3D.`
      });
      return;
    } catch (e) {
      console.log('Share dismissed or cancelled');
    }
  }

  // Fallback para navegadores de escritorio: descarga el PDF y abre WhatsApp con el texto
  doc.save(filename);
  const url = generateCotizacionWhatsAppUrl(cotizacion, config);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function crearDocPDFCuentaCobro(
  cuenta: CuentaCobro, 
  config: ConfiguracionTaller,
  logoDataUrl?: string | null
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  const logo = logoDataUrl || cachedLogoDataUrl;
  let brandTextX = 15;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 15, 4, 20, 20);
      brandTextX = 39;
    } catch (e) {
      console.warn('Error al insertar logo en cuenta de cobro:', e);
      brandTextX = 15;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('WJGEEKS 3D', brandTextX, 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248);
  doc.text('Cuentas de Cobro & Servicios de Fabricación Digital', brandTextX, 19);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Taller de Modelado, Fabricación Digital & Acabados', brandTextX, 24);

  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`CUENTA DE COBRO N° ${cuenta.numero_cc}`, pageWidth - 15, 12, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha: ${cuenta.fecha_emision}`, pageWidth - 15, 17, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(56, 189, 248);
  doc.text(`Ref. Cotización: ${cuenta.cotizacion_numero}`, pageWidth - 15, 23, { align: 'right' });

  // Client Info Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 34, pageWidth - 30, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 34, pageWidth - 30, 28, 3, 3, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DEBE A: WJGEEKS 3D', 20, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Cliente: ${cuenta.cliente.nombre}`, 20, 48);
  doc.text(`NIT / CC: ${cuenta.cliente.nit_cc || 'Consumidor Final'}`, 20, 54);

  doc.text(`Teléfono: ${cuenta.cliente.telefono}`, 110, 48);
  doc.text(`Cotización Referencia: ${cuenta.cotizacion_numero}`, 110, 54);

  // Concept Table
  const tableData = [
    [
      '1',
      `Servicios de Impresión 3D y Acabados de Taller:\n${cuenta.items_resumen}`,
      `$${cuenta.total.toLocaleString('es-CO')}`
    ]
  ];

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Concepto del Servicio', 'Valor Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 125 },
      2: { halign: 'right', cellWidth: 46 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

  // Payment Breakdown
  const boxX = pageWidth - 90;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, finalY, 75, 36, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(boxX, finalY, 75, 36, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Servicio:', boxX + 5, finalY + 8);
  doc.text(`$${cuenta.total.toLocaleString('es-CO')}`, pageWidth - 20, finalY + 8, { align: 'right' });

  doc.text('Abono Realizado:', boxX + 5, finalY + 16);
  doc.setTextColor(16, 185, 129); // Green
  doc.text(`-$${cuenta.abono.toLocaleString('es-CO')}`, pageWidth - 20, finalY + 16, { align: 'right' });

  doc.setFillColor(239, 68, 68); // Red banner for pending
  doc.rect(boxX + 3, finalY + 22, 69, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SALDO PENDIENTE:', boxX + 6, finalY + 28);
  doc.text(`$${cuenta.saldo_pendiente.toLocaleString('es-CO')}`, pageWidth - 22, finalY + 28, { align: 'right' });

  // Bank Info Card
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, finalY, pageWidth - 115, 36, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, finalY, pageWidth - 115, 36, 3, 3, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DATOS PARA TRANSFERENCIA BANCARIA:', 20, finalY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`- Nequi: ${config.nequi}`, 20, finalY + 15);
  doc.text(`- Daviplata: ${config.daviplata}`, 20, finalY + 21);
  doc.text(`- Bancolombia: ${config.bancolombia} (${config.titular_cuenta})`, 20, finalY + 27);

  // Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 260, pageWidth, 20, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text(`Contacto: ${config.telefono_contacto} | Instagram: ${config.instagram}`, pageWidth / 2, 271, { align: 'center' });

  return doc;
}

export async function generarPDFCuentaCobro(cuenta: CuentaCobro, config: ConfiguracionTaller) {
  const logo = await getLogoDataUrl();
  const doc = crearDocPDFCuentaCobro(cuenta, config, logo);
  const filename = `Cuenta_Cobro_${cuenta.numero_cc}_${cuenta.cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

export async function compartirPDFCuentaCobroWhatsApp(cuenta: CuentaCobro, config: ConfiguracionTaller) {
  const logo = await getLogoDataUrl();
  const doc = crearDocPDFCuentaCobro(cuenta, config, logo);
  const filename = `Cuenta_Cobro_${cuenta.numero_cc}_${cuenta.cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Cuenta de Cobro ${cuenta.numero_cc} - WJGEEKS 3D`,
        text: `Hola ${cuenta.cliente.nombre}, te adjuntamos la Cuenta de Cobro N° ${cuenta.numero_cc} correspondiente a tu orden en WJGEEKS 3D.`
      });
      return;
    } catch (e) {
      console.log('Share dismissed or cancelled');
    }
  }

  doc.save(filename);
  const url = generateCuentaCobroWhatsAppUrl(cuenta, config);
  window.open(url, '_blank', 'noopener,noreferrer');
}
