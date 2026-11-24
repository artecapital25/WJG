import { describe, it, expect } from 'vitest';
import {
  calcularCamaMultiPieza,
  calcularEnvioVolumetricoColombia,
  calcularEscala3D,
  convertirVolumenPesoCosto,
  estimarTiempoPorAlturaCapa
} from '../suite3dCalculators';

describe('suite3dCalculators - Fase C Suite 3D PRO', () => {
  it('convierte volumen en cm³ a gramos netos, peso con merma, metros de filamento y costo COP', () => {
    const res = convertirVolumenPesoCosto({
      tecnologia: 'FDM_FILAMENTO',
      modoEntrada: 'volumen_cm3',
      valor: 100,
      densidadGCm3: 1.24,
      costoGramoCop: 85,
      diametroFilamentoMm: 1.75,
      mermaPct: 15
    });

    expect(res.volumenCm3).toBe(100);
    expect(res.pesoNetoG).toBeCloseTo(124, 1);
    expect(res.pesoConMermaG).toBeCloseTo(142.6, 1);
    expect(res.metrosFilamento).toBeGreaterThan(40);
    expect(res.costoMaterialCop).toBe(Math.round(142.6 * 85));
  });

  it('aplica ley cúbica k^3 al escalar una figura al doble de altura', () => {
    const res = calcularEscala3D({
      alturaActualMm: 80,
      alturaObjetivoMm: 160,
      pesoActualG: 50,
      tiempoActualMin: 120,
      costoGramoCop: 100
    });

    expect(res.factorLineal).toBe(2);
    expect(res.porcentajeSlicer).toBe(200);
    expect(res.factorVolumen).toBe(8);
    expect(res.pesoProyectadoG).toBe(400);
    expect(res.costoMaterialProyectadoCop).toBe(40000);
  });

  it('optimiza piezas por cama probando rotación 90° y calcula tandas del lote', () => {
    const res = calcularCamaMultiPieza({
      camaAnchoMm: 200,
      camaProfMm: 100,
      piezaAnchoMm: 95,
      piezaProfMm: 45,
      margenEntrePiezasMm: 4,
      cantidadPedido: 10,
      tiempoPorCamaMin: 90
    });

    expect(res.piezasPorCama).toBe(4);
    expect(res.cantidadCamas).toBe(3); // ceil(10/4) = 3 tandas
    expect(res.tiempoTotalMin).toBe(270);
  });

  it('estima tiempo y costo eléctrico al reducir la altura de capa SLA', () => {
    const res = estimarTiempoPorAlturaCapa({
      tecnologia: 'SLA_RESINA',
      alturaPiezaMm: 100,
      capaBaseMm: 0.05,
      tiempoBaseMin: 180,
      capaNuevaMm: 0.025,
      consumoKwh: 0.1,
      tarifaKwhCop: 834
    });

    expect(res.capasBase).toBe(2000);
    expect(res.capasNuevas).toBe(4000);
    expect(res.tiempoNuevoMin).toBe(360);
    expect(res.costoEnergiaNuevoCop).toBeGreaterThan(res.costoEnergiaBaseCop);
  });

  it('detecta cuándo aplica peso volumétrico en envíos Colombia', () => {
    const res = calcularEnvioVolumetricoColombia({
      largoCm: 30,
      anchoCm: 25,
      altoCm: 20,
      pesoRealKg: 0.6,
      divisorVolumetrico: 5000,
      destinoTipo: 'nacional_principal'
    });

    expect(res.pesoVolumetricoKg).toBe(3);
    expect(res.aplicaVolumetrico).toBe(true);
    expect(res.pesoFacturableKg).toBe(3);
    expect(res.fleteEstimadoCop).toBeGreaterThan(15500);
  });
});
