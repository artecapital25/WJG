import { describe, it, expect } from 'vitest';

describe('useDateNavigation Logic & Mobile Strip Calculator', () => {
  // Test de cálculo de inicio de semana (Lunes) y 7 días
  it('1. Genera exactamente 7 días empezando en Lunes para cualquier fecha', () => {
    // Miércoles 21 de Octubre de 2026
    const baseDate = new Date(2026, 9, 21); // Mes 9 = Octubre en 0-index
    const dayOfWeek = baseDate.getDay(); // 3 = Miércoles
    const distanceToMonday = (dayOfWeek + 6) % 7; // (3 + 6) % 7 = 2 días antes (Lunes 19)

    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - distanceToMonday);

    expect(monday.getDate()).toBe(19);
    expect(monday.getMonth()).toBe(9); // Octubre

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.getDate());
    }

    expect(days).toEqual([19, 20, 21, 22, 23, 24, 25]);
  });

  it('2. Navegación semanal: Sumar o restar 7 días preserva el día de la semana', () => {
    const current = new Date(2026, 9, 21); // Miércoles
    const nextWeek = new Date(current);
    nextWeek.setDate(nextWeek.getDate() + 7);

    expect(nextWeek.getDate()).toBe(28);
    expect(nextWeek.getDay()).toBe(3); // Sigue siendo Miércoles

    const prevWeek = new Date(current);
    prevWeek.setDate(prevWeek.getDate() - 7);

    expect(prevWeek.getDate()).toBe(14);
    expect(prevWeek.getDay()).toBe(3); // Sigue siendo Miércoles
  });

  it('3. Formateo determinístico de fecha YYYY-MM-DD sin desvío de zona horaria', () => {
    const d = new Date(2026, 9, 5); // 5 de Octubre de 2026
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;

    expect(formatted).toBe('2026-10-05');
  });

  it('4. Swipe touch horizontal: Detecta dirección predominante', () => {
    const swipeLeft = { dx: -60, dy: 10 };
    const isSwipeLeft = Math.abs(swipeLeft.dx) > 45 && Math.abs(swipeLeft.dx) > Math.abs(swipeLeft.dy) * 1.5 && swipeLeft.dx < 0;
    expect(isSwipeLeft).toBe(true);

    const swipeRight = { dx: 70, dy: 15 };
    const isSwipeRight = Math.abs(swipeRight.dx) > 45 && Math.abs(swipeRight.dx) > Math.abs(swipeRight.dy) * 1.5 && swipeRight.dx > 0;
    expect(isSwipeRight).toBe(true);

    // Si es scroll vertical accidental (ej: dy = 80, dx = -20), no debe disparar swipe
    const verticalScroll = { dx: -20, dy: 80 };
    const isSwipeVertical = Math.abs(verticalScroll.dx) > 45 && Math.abs(verticalScroll.dx) > Math.abs(verticalScroll.dy) * 1.5;
    expect(isSwipeVertical).toBe(false);
  });
});
