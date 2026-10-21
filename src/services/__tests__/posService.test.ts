import { describe, it, expect } from 'vitest';
import { calcularAlertaCobro, generarConsecutivoPOS, agruparDeudores, generarWhatsAppComprobantePOS } from '../posService';
import { VentaExpress } from '../../types/pos';
import { ConfiguracionTaller } from '../../types';

describe('posService - Business Logic & Traceability', () => {
  const mockConfig: ConfiguracionTaller = {
    tarifa_kwh: 900,
    margen_merma_resina: 1.40,
    telefono_contacto: '3001234567',
    telefono_contacto2: '3009876543',
    instagram: '@wjgeeks3d',
    nequi: '3001234567',
    daviplata: '3001234567',
    bancolombia: '123456789',
    titular_cuenta: 'Germán Gómez'
  };

  describe('calcularAlertaCobro', () => {
    it('returns "pagado" when saldoPendiente is 0 or negative', () => {
      const alerta = calcularAlertaCobro('2026-10-25', 0);
      expect(alerta.nivel).toBe('pagado');
      expect(alerta.texto).toContain('Pagado Total');
    });

    it('returns "al_dia" with 999 days when no promised date is provided', () => {
      const alerta = calcularAlertaCobro(undefined, 25000);
      expect(alerta.nivel).toBe('al_dia');
      expect(alerta.diasDiferencia).toBe(999);
      expect(alerta.texto).toBe('Sin fecha límite');
    });

    it('returns "vencido" when promised date is in the past', () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 3);
      const fechaStr = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;

      const alerta = calcularAlertaCobro(fechaStr, 40000);
      expect(alerta.nivel).toBe('vencido');
      expect(alerta.diasDiferencia).toBeLessThan(0);
      expect(alerta.texto).toContain('Vencido hace 3 días');
    });

    it('returns "hoy" when promised date is today', () => {
      const hoy = new Date();
      const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

      const alerta = calcularAlertaCobro(fechaStr, 15000);
      expect(alerta.nivel).toBe('hoy');
      expect(alerta.diasDiferencia).toBe(0);
      expect(alerta.texto).toBe('¡Paga Hoy!');
    });

    it('returns "proximo" when promised date is within 2 days', () => {
      const manana = new Date();
      manana.setDate(manana.getDate() + 2);
      const fechaStr = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;

      const alerta = calcularAlertaCobro(fechaStr, 50000);
      expect(alerta.nivel).toBe('proximo');
      expect(alerta.diasDiferencia).toBe(2);
      expect(alerta.texto).toContain('Próximo (en 2 días)');
    });

    it('returns "al_dia" when promised date is beyond 2 days', () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 10);
      const fechaStr = `${futuro.getFullYear()}-${String(futuro.getMonth() + 1).padStart(2, '0')}-${String(futuro.getDate()).padStart(2, '0')}`;

      const alerta = calcularAlertaCobro(fechaStr, 30000);
      expect(alerta.nivel).toBe('al_dia');
      expect(alerta.diasDiferencia).toBe(10);
    });
  });

  describe('generarConsecutivoPOS', () => {
    it('returns POS-001 when list is empty', () => {
      expect(generarConsecutivoPOS([])).toBe('POS-001');
    });

    it('increments max existing number consecutively', () => {
      const ventas: Partial<VentaExpress>[] = [
        { numero_venta: 'POS-001' },
        { numero_venta: 'POS-008' },
        { numero_venta: 'POS-003' }
      ];
      expect(generarConsecutivoPOS(ventas as VentaExpress[])).toBe('POS-009');
    });

    it('handles legacy or irregular formats safely', () => {
      const ventas: Partial<VentaExpress>[] = [
        { numero_venta: 'VENTA-OLD' },
        { numero_venta: 'pos-15' }
      ];
      expect(generarConsecutivoPOS(ventas as VentaExpress[])).toBe('POS-016');
    });
  });

  describe('agruparDeudores', () => {
    it('aggregates multiple debts for the same customer', () => {
      const ventas: VentaExpress[] = [
        {
          id: 'v1',
          numero_venta: 'POS-001',
          fecha_venta: '2026-10-01',
          cliente_nombre: 'Carlos Ruiz',
          cliente_telefono: '3110001122',
          nombre_producto: 'Goku Ultra',
          total: 80000,
          abono: 30000,
          saldo_pendiente: 50000,
          estado_pago: 'Abono Parcial',
          metodo_pago: 'nequi',
          requiere_ot: false
        },
        {
          id: 'v2',
          numero_venta: 'POS-002',
          fecha_venta: '2026-10-05',
          cliente_nombre: 'carlos ruiz ', // Case & whitespace insensitive
          cliente_telefono: '3110001122',
          nombre_producto: 'Vegeta SSJ',
          total: 60000,
          abono: 20000,
          saldo_pendiente: 40000,
          estado_pago: 'Abono Parcial',
          metodo_pago: 'daviplata',
          requiere_ot: false
        },
        {
          id: 'v3',
          numero_venta: 'POS-003',
          fecha_venta: '2026-10-06',
          cliente_nombre: 'María López',
          cliente_telefono: '3129998877',
          nombre_producto: 'Soporte Mandos',
          total: 35000,
          abono: 35000,
          saldo_pendiente: 0, // Pagado total
          estado_pago: 'Pagado Total',
          metodo_pago: 'efectivo',
          requiere_ot: false
        }
      ];

      const deudores = agruparDeudores(ventas);

      // Only Carlos Ruiz should be grouped (María is paid in full)
      expect(deudores.length).toBe(1);
      expect(deudores[0].cliente_nombre.trim()).toBe('Carlos Ruiz');
      expect(deudores[0].total_deuda).toBe(140000);
      expect(deudores[0].total_abonos).toBe(50000);
      expect(deudores[0].saldo_pendiente_total).toBe(90000);
      expect(deudores[0].ventas_pendientes.length).toBe(2);
    });
  });

  describe('generarWhatsAppComprobantePOS', () => {
    it('generates a valid WhatsApp URL with formatted message', () => {
      const venta: VentaExpress = {
        id: 'v-100',
        numero_venta: 'POS-042',
        fecha_venta: '2026-10-20',
        cliente_nombre: 'Andrés Morales',
        cliente_telefono: '3001112233',
        nombre_producto: 'Diorama Zelda Master Sword',
        total: 120000,
        abono: 60000,
        saldo_pendiente: 60000,
        estado_pago: 'Abono Parcial',
        metodo_pago: 'nequi',
        requiere_ot: true,
        ot_numero: 'OT-042',
        estado_diseno: 'ya_realizado'
      };

      const url = generarWhatsAppComprobantePOS(venta, mockConfig);
      expect(url).toContain('https://wa.me/573001112233');
      expect(url).toContain(encodeURIComponent('POS-042'));
      expect(url).toContain(encodeURIComponent('Diorama Zelda Master Sword'));
      expect(url).toContain(encodeURIComponent('OT-042'));
    });
  });
});
