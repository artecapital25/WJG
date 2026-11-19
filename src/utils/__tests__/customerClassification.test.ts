import { describe, it, expect } from 'vitest';
import { 
  normalizarTelefono, 
  normalizarTexto, 
  normalizarNitCc,
  normalizarCorreo,
  esTelefonoValido,
  CatalogoClientesStats, 
  coincideBusquedaCliente,
  buscarCoincidenciasCliente,
  enriquecerClienteExistente,
  obtenerHistorialCliente
} from '../customerClassification';
import { Cliente, Cotizacion, OrdenTrabajo } from '../../types';
import { VentaExpress } from '../../types/pos';

describe('Motor Canónico de Clasificación de Clientes (Nuevo vs Recurrente) y Búsqueda Multicriterio', () => {
  it('1. normalizarTelefono extrae dígitos y normaliza a 10 dígitos', () => {
    expect(normalizarTelefono('+57 320 279 6115')).toBe('3202796115');
    expect(normalizarTelefono('573202796115')).toBe('3202796115');
    expect(normalizarTelefono('320-279-6115')).toBe('3202796115');
    expect(normalizarTelefono('3202796115')).toBe('3202796115');
    expect(normalizarTelefono('')).toBe('');
  });

  it('2. normalizarTexto limpia tildes, mayúsculas y espacios', () => {
    expect(normalizarTexto('  Germán Álvarez  ')).toBe('german alvarez');
    expect(normalizarTexto('ANDRÉS PEÑA')).toBe('andres pena');
    expect(normalizarTexto('Bogotá D.C.')).toBe('bogota d.c.');
  });

  it('3. CatalogoClientesStats clasifica cliente con 1 cotización como NUEVO', () => {
    const cotizaciones: Partial<Cotizacion>[] = [
      {
        id: 'cot-1',
        numero_cot: '25-001',
        cliente: { id: 'cli-1', codigo: 1, nombre: 'Ana Gómez', nit_cc: '102030', telefono: '3101112233', correo: '' }
      }
    ];

    const stats = new CatalogoClientesStats(cotizaciones as Cotizacion[], []);
    
    expect(stats.getTransaccionesCount({ id: 'cli-1', nombre: 'Ana Gómez', telefono: '3101112233' })).toBe(1);
    expect(stats.esClienteNuevo({ id: 'cli-1', nombre: 'Ana Gómez', telefono: '3101112233' })).toBe(true);
    expect(stats.esClienteRecurrente({ id: 'cli-1', nombre: 'Ana Gómez', telefono: '3101112233' })).toBe(false);
  });

  it('4. CatalogoClientesStats clasifica cliente con cotización + venta POS como RECURRENTE', () => {
    const cotizaciones: Partial<Cotizacion>[] = [
      {
        id: 'cot-1',
        numero_cot: '25-001',
        cliente: { id: 'cli-2', codigo: 2, nombre: 'Carlos Ruiz', nit_cc: '506070', telefono: '3209998877', correo: '' }
      }
    ];
    const ventas: Partial<VentaExpress>[] = [
      {
        id: 'pos-1',
        numero_venta: 'POS-001',
        cliente_nombre: 'Carlos Ruiz',
        cliente_telefono: '+57 320 999 8877'
      }
    ];

    const stats = new CatalogoClientesStats(cotizaciones as Cotizacion[], ventas as VentaExpress[]);

    // Detectado por teléfono o nombre
    expect(stats.getTransaccionesCount({ telefono: '3209998877' })).toBe(2);
    expect(stats.esClienteNuevo({ telefono: '3209998877' })).toBe(false);
    expect(stats.esClienteRecurrente({ telefono: '3209998877' })).toBe(true);
  });

  it('5. coincideBusquedaCliente filtra por nombre, teléfono o NIT de forma flexible', () => {
    const cliente = {
      id: 'cli-3',
      nombre: 'María Camila Rodríguez',
      telefono: '+57 315 444 3322',
      nit_cc: '1098765432'
    };

    // Búsqueda por parte del nombre sin tildes
    expect(coincideBusquedaCliente(cliente, 'camila')).toBe(true);
    expect(coincideBusquedaCliente(cliente, 'rodriguez')).toBe(true);
    expect(coincideBusquedaCliente(cliente, 'maria')).toBe(true);

    // Búsqueda por dígitos del teléfono
    expect(coincideBusquedaCliente(cliente, '315444')).toBe(true);
    expect(coincideBusquedaCliente(cliente, '3322')).toBe(true);

    // Búsqueda por cédula
    expect(coincideBusquedaCliente(cliente, '109876')).toBe(true);

    // Búsqueda no coincidente
    expect(coincideBusquedaCliente(cliente, 'Roberto')).toBe(false);
    expect(coincideBusquedaCliente(cliente, '300999')).toBe(false);
  });

  it('6. normalizarNitCc limpia notación científica de Excel y descarta placeholders', () => {
    expect(normalizarNitCc('1.018480904E9')).toBe('1018480904');
    expect(normalizarNitCc('5.2701382E7')).toBe('52701382');
    expect(normalizarNitCc('830.065.750-6')).toBe('8300657506');
    expect(normalizarNitCc('222222222222')).toBe('');
    expect(normalizarNitCc('N/A')).toBe('');
  });

  it('7. esTelefonoValido y normalizarCorreo descartan valores genéricos o inválidos', () => {
    expect(esTelefonoValido('+57 320 481 4702')).toBe(true);
    expect(esTelefonoValido('3000000000')).toBe(false);
    expect(esTelefonoValido('300000000')).toBe(false);
    expect(normalizarCorreo('  German.951026@GMAIL.com ')).toBe('german.951026@gmail.com');
    expect(normalizarCorreo('sin-arroba')).toBe('');
  });

  it('8. buscarCoincidenciasCliente detecta coincidencia exacta por Cédula, Teléfono o Correo y homónimos por Nombre', () => {
    const directorio: Cliente[] = [
      { id: 'u1', codigo: 1, nombre: 'German Eduardo Reyes Vasquez', nit_cc: '1018480904', telefono: '3503443140', correo: 'german.951026@gmail.com' },
      { id: 'u2', codigo: 2, nombre: 'lizeth viviana castro salgado', nit_cc: '1033740166', telefono: '3042113751', correo: 'lizth1291@gmail.com' }
    ];

    const matchTel = buscarCoincidenciasCliente({ nombre: 'german reyes', telefono: '+57 350 344 3140' }, directorio);
    expect(matchTel.exactMatch?.id).toBe('u1');
    expect(matchTel.matchReason).toBe('telefono');

    const matchNit = buscarCoincidenciasCliente({ nombre: 'Otro', nit_cc: '1.033740166E9' }, directorio);
    expect(matchNit.exactMatch?.id).toBe('u2');
    expect(matchNit.matchReason).toBe('nit_cc');

    const matchMail = buscarCoincidenciasCliente({ nombre: 'German', correo: 'GERMAN.951026@gmail.com' }, directorio);
    expect(matchMail.exactMatch?.id).toBe('u1');
    expect(matchMail.matchReason).toBe('correo');

    // Solo dio el nombre sin teléfono válido -> debe sugerir homónimo para cotejar
    const matchNombre = buscarCoincidenciasCliente({ nombre: 'Lizeth castro', telefono: '3000000000' }, directorio);
    expect(matchNombre.exactMatch).toBeNull();
    expect(matchNombre.nameMatches.map(c => c.id)).toContain('u2');
  });

  it('9. enriquecerClienteExistente actualiza campos faltantes sin degradar nombres completos', () => {
    const existente: Cliente = {
      id: 'u2',
      codigo: 2,
      nombre: 'lizeth viviana castro salgado',
      nit_cc: '',
      telefono: '3042113751',
      correo: ''
    };

    const { clienteActualizado, huboCambios } = enriquecerClienteExistente(existente, {
      nombre: 'Lizeth castro',
      telefono: '+57 304 211 3751',
      nit_cc: '1033740166',
      correo: 'lizth1291@gmail.com'
    });

    expect(huboCambios).toBe(true);
    expect(clienteActualizado.nombre).toBe('lizeth viviana castro salgado');
    expect(clienteActualizado.nit_cc).toBe('1033740166');
    expect(clienteActualizado.correo).toBe('lizth1291@gmail.com');
  });

  it('10. obtenerHistorialCliente consolida cotizaciones, ventas POS y OTs en un solo expediente', () => {
    const cliente: Cliente = {
      id: 'u1',
      codigo: 1,
      nombre: 'German Eduardo Reyes Vasquez',
      nit_cc: '1018480904',
      telefono: '3503443140',
      correo: 'german.951026@gmail.com'
    };

    const cots: Partial<Cotizacion>[] = [
      { id: 'c1', numero_cot: '26-001', cliente, total: 100000, abono: 50000, saldo_pendiente: 50000 }
    ];
    const ventas: Partial<VentaExpress>[] = [
      { id: 'pos-1', numero_venta: 'POS-018', cliente_id: 'u1', cliente_nombre: 'German', cliente_telefono: '3503443140', total: 80000, abono: 80000, saldo_pendiente: 0 }
    ];
    const ordenes: Partial<OrdenTrabajo>[] = [
      { id: 'ot-1', numero_ot: 'OT-001', cotizacion_id: 'c1', cotizacion_numero: '26-001', cliente_nombre: 'German', cliente_telefono: '3503443140', item_nombre: 'Figura', cantidad: 1 }
    ];

    const hist = obtenerHistorialCliente(cliente, cots as Cotizacion[], ventas as VentaExpress[], ordenes as OrdenTrabajo[]);
    expect(hist.cotizaciones).toHaveLength(1);
    expect(hist.ventas).toHaveLength(1);
    expect(hist.ordenes).toHaveLength(1);
    expect(hist.resumen.totalOperado).toBe(180000);
    expect(hist.resumen.saldoPendiente).toBe(50000);
  });
});

