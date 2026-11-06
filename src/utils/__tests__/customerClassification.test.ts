import { describe, it, expect } from 'vitest';
import { 
  normalizarTelefono, 
  normalizarTexto, 
  CatalogoClientesStats, 
  clasificarCliente, 
  coincideBusquedaCliente 
} from '../customerClassification';
import { Cotizacion } from '../../types';
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
});

