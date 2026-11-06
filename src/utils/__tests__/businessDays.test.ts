import { describe, it, expect } from 'vitest';
import { 
  calcularFechaEstimada, 
  calcularDiasHabilesEntre, 
  formatearTiempoEntrega, 
  toggleNotaRapida,
  NOTAS_RAPIDAS_SUGERIDAS 
} from '../businessDays';

describe('Utilidades de Tiempo de Entrega y Notas Rápidas (3 a 30 días hábiles)', () => {
  it('1. calcularFechaEstimada proyecta fecha sumando días hábiles saltando domingos', () => {
    // Miércoles 4 de Noviembre de 2026
    const fechaBase = new Date(2026, 10, 4); // 4 de Noviembre 2026 (Miércoles)
    
    // 3 días hábiles: Jueves 5, Viernes 6, Sábado 7
    const fecha3Dias = calcularFechaEstimada(3, fechaBase);
    expect(fecha3Dias).toBe('2026-11-07');

    // 5 días hábiles: Jueves 5, Viernes 6, Sábado 7, Lunes 9, Martes 10 (omite Domingo 8)
    const fecha5Dias = calcularFechaEstimada(5, fechaBase);
    expect(fecha5Dias).toBe('2026-11-10');
  });

  it('2. calcularDiasHabilesEntre calcula la cantidad de días hábiles desde hoy hasta la fecha seleccionada', () => {
    const fechaBase = new Date(2026, 10, 4); // Miércoles 4 Noviembre
    // Sábado 7 de Noviembre son 3 días hábiles
    const dias = calcularDiasHabilesEntre('2026-11-07', fechaBase);
    expect(dias).toBe(3);

    // Martes 10 de Noviembre son 5 días hábiles (salta Domingo 8)
    const dias5 = calcularDiasHabilesEntre('2026-11-10', fechaBase);
    expect(dias5).toBe(5);
  });

  it('3. calcularDiasHabilesEntre acota entre 3 y 30 días', () => {
    const fechaBase = new Date(2026, 10, 4);
    // Fecha en el pasado o hoy retorna mínimo 3
    expect(calcularDiasHabilesEntre('2026-11-02', fechaBase)).toBe(3);
    // Fecha muy lejana acota a 30
    expect(calcularDiasHabilesEntre('2027-11-02', fechaBase)).toBe(30);
  });

  it('4. formatearTiempoEntrega genera texto comercial estándar', () => {
    expect(formatearTiempoEntrega(5, '2026-11-10')).toBe('(5) Días hábiles (Aprox. 10/11/2026)');
    expect(formatearTiempoEntrega(3)).toBe('(3) Días hábiles');
  });

  it('5. toggleNotaRapida inserta y remueve notas adecuadamente', () => {
    const inicial = '• No incluye transporte fuera del perímetro urbano.';
    const nuevaNota = NOTAS_RAPIDAS_SUGERIDAS[0].texto; // Anticipo 50%

    // Agregar nota
    const agregado = toggleNotaRapida(inicial, nuevaNota);
    expect(agregado).toContain(nuevaNota);
    expect(agregado).toContain(inicial);

    // Alternar y remover nota
    const removido = toggleNotaRapida(agregado, nuevaNota);
    expect(removido).not.toContain(nuevaNota);
    expect(removido).toContain(inicial);
  });
});

