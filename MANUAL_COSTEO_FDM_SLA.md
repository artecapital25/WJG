# Manual Técnico y Financiero de Costeo: SLA Resina vs FDM Filamento — WJGEEKS 3D PRO

Este documento detalla de forma exacta cómo operan los motores de cálculo de costos y precios de venta en **WJGEEKS 3D PRO** ([src/services/calculationEngine.ts](file:///d:/WJG/src/services/calculationEngine.ts) y [src/features/cotizador/utils/pricingCalculator.ts](file:///d:/WJG/src/features/cotizador/utils/pricingCalculator.ts)), cubriendo **Impresión 3D SLA (Resina)**, **Impresión 3D FDM (Filamento)**, descuentos por volumen, totales comerciales e impacto contable en Supabase (`abonos_pagos`).

---

## 1. Costeo Base por Minuto de Maquinaria (`resolverTarifasMaquina`)

Toda impresora 3D o estación auxiliar calcula su costo operativo por minuto sumando **Energía Eléctrica** + **Amortización de Repuestos Activos**:

```text
tarifa_kwh              = config.tarifa_kwh || 834.0  (COP / kWh)
consumo_kwh             = maquina.consumo_kwh > 0 ? maquina.consumo_kwh : 0.05  (kW)

costoMinutoEnergia      = (consumo_kwh * tarifa_kwh) / 60
costoMinutoRepuestos    = suma(repuesto_activo.costo_minuto || (costo_compra / (vida_util_horas * 60)))
costoMinutoTotal        = costoMinutoEnergia + costoMinutoRepuestos
```

> **Fallback sin desglose:** Si la máquina no tiene repuestos configurados (`repuestos` vacío y `costo_minuto_repuestos === 0`) pero sí tiene una tarifa plana previa `maquina.costo_minuto > 0`, el sistema conserva `maquina.costo_minuto` como `costoMinutoTotal`.

### Referencias Típicas de Repuestos (Catálogo Base)
- **SLA Resina (Anycubic Photon Mono 4 / 6Ks):**
  - Film FEP (`$75.000` / `300 h` = `$4.17/min` en Mono 4; `$85.000` / `300 h` = `$4.72/min` en 6Ks).
  - Pantalla LCD Mono (`$180.000` / `2000 h` = `$1.50/min` en Mono 4; `$220.000` / `2000 h` = `$1.83/min` en 6Ks).
- **FDM Filamento (Bambu Lab P1S / P2S y FDM General):**
  - Hotend / Boquilla (`$45.000` / `600 h` = `$1.25/min`) + Placa PEI (`$40.000` / `1000 h` = `$0.67/min`), o Boquilla estándar (`$25.000` / `500 h` = `$0.83/min`).

---

## 2. Motor SLA Resina (`calcularPieza3D`)

### 2.1 Geometría y Consumo de Material
- **Volumen geométrico (`volumen_cm3`):** `(alto_mm × ancho_mm × profundidad_mm) / 1000`.
- **Peso base (`peso_estimado_g`):**
  - **Modo Manual (Slicer / STL):** Toma exactamente los gramos ingresados (`pesoResinaManualG`).
  - **Modo Volumen:** `volumen_cm3 × resina.densidad_g_cm3 × ratioRelleno` (`1.0` si es **Sólido**, o `porcentajeRelleno / 100` —por defecto `0.35`— si es **Ahuecado**).
- **Merma de Resina (`factorMerma`):**
  1. Si se edita `% Merma Resina` en la pieza (`mermaPorcentajeResina`): `1 + (mermaPorcentajeResina / 100)`.
  2. Si no se especificó y está en modo **Manual Slicer**: `1.10` (+10% soportes/lavado).
  3. Si no se especificó y está en modo **Volumen**: `config.margen_merma_resina || 1.40`.
- **Costo de Resina (`costo_resina`):**
  ```text
  costoGramoResina = resina.costo_gramo || (resina.precio_compra / 1000) || 135
  costo_resina     = peso_estimado_g * costoGramoResina * factorMerma
  ```

### 2.2 Tiempo de Impresión SLA (Auto Z vs Manual en Minutos)
El cotizador permite ahora **editar directamente los minutos del slicer** igual que en FDM o dejar el cálculo automático por altura Z:
- **Modo Manual (`tiempoImpresionManualMin > 0`):** Usa exactamente los minutos ingresados por el operario o transferidos desde el visor **STL 3D**.
- **Modo Automático (`auto`):** Calcula `Math.round((alto_mm / velocidad_mm_h) * 60)` usando `resina.velocidad_impresion_mm_h` (fallback `20 mm/h`).
- **Costo de máquina en impresión:**
  - `costo_energia_impresion = tiempo_impresion_min × impresoraTarifas.costoMinutoEnergia`
  - `costo_repuestos_impresion = tiempo_impresion_min × impresoraTarifas.costoMinutoRepuestos`

### 2.3 Lavado, Curado UV y Máquinas Auxiliares
Cuando `requiereCurado !== false`:
- **Tiempo de curado (`tiempo_curado_min`):** Manual si se configura, o automático por peso:
  - `<= 50 g` → `5 min`
  - `51 g – 249 g` → `10 min`
  - `>= 250 g` → `15 min`
- **Energía y repuestos de estación UV:** según la máquina `estacionCurado` (fallback eléctrico `0.36 kW`).
- **Químico de lavado (Etanol):** `peso_estimado_g × insumoCurado.costo_unitario` (fallback `10.27 COP/g`).
- Adicionalmente suma **Compresor de Pintura** (si `requiereCompresorPintura`) y **Máquinas Adicionales** configuradas en la pieza.

### 2.4 Mano de Obra, Insumos y Precio Final SLA (**Markup sobre Costo**)
- **Mano de obra (`costo_mano_obra`):**
  - `tarifaDev`: rol `'desarrollador'` en catálogo `personal` (fallback `$166.67/min`).
  - `tarifaPintor`: rol `'pintor'` en catálogo `personal` (fallback `$166.67/min`).
  - `costo_mano_obra = (tiempoDesarrolloMin × tarifaDev) + ((tiempoArmadoMin + tiempoPinturaMin) × tarifaPintor)`.
- **Costo Base de Producción (`costo_base_produccion`):**
  ```text
  costo_energia_total + costo_repuestos_total + costo_resina + costo_quimico_curado + costo_insumos + costo_mano_obra + costoModeloComprado
  ```
- **Precio Unitario Base SLA (Markup):**
  ```text
  precio_unitario_raw  = costo_base_produccion * (1 + margenGanancia)
  precio_unitario_base = Math.round(precio_unitario_raw / 100) * 100
  ```
  *(Si `precioFijadoTarifa` está activo con `precioUnitarioManual > 0`, respeta ese precio fijado redondeado a `$100` y recalcula el margen efectivo resultante).*

---

## 3. Motor FDM Filamento (`calcularPiezaFDM`)

### 3.1 Filamento, Merma y Tiempo Slicer
- **Peso (`pesoGramos`):** `pesoFilamentoG || 50` gramos (ingresado desde Bambu Studio / OrcaSlicer o transferido desde el visor STL).
- **Merma FDM (`mermaPct`):** Editable por pieza (por defecto `config.margen_merma_fdm ?? 5`%). `factorMerma = 1 + (mermaPct / 100)`.
- **Costo de Filamento:** `Math.round(pesoGramos × factorMerma × costoGramo)` (`costoGramo` del carrete o `costoRolloKg / 1000`, fallback `$85.000/kg`).
- **Tiempo de Impresión (`tiempoMinutos`):** Minutos directos de slicer (`tiempoFDMMin || 180`).
- **Energía:** `Math.round(tiempoMinutos × desgloseMaquina.costoMinutoEnergia)`.
- **Desgaste y Repuestos (Boquilla / PEI):** Si la impresora FDM tiene repuestos activos usa `Math.round(tiempoMinutos × costoMinutoRepuestos)`; de lo contrario usa `desgasteBoquillaCosto` o fallback `Math.round(tiempoMinutos × 1.25)`.
- **Curado UV:** `$0` (no aplica).

### 3.2 Mano de Obra y Precio Final FDM (**Margen Bruto sobre Venta**)
- **Mano de Obra (`costoManoObra`):**
  - Toma el primer operador (`personal[0]?.costo_minuto || 130.21 COP/min`).
  - `tiempoOperario = tiempoDesarrolloMin + tiempoArmadoMin + (va_pintado ? tiempoPinturaMin : 0)`.
  - `costoManoObra = Math.round(tiempoOperario × costoMinutoOperario)`.
- **Costo Base de Producción (`costoBaseProduccion`):**
  ```text
  costoFilamento + costoEnergia + costoRepuestos + costoManoObra + costoEmpaques + costoAccesorios + costoPinturas + costoModeloComprado
  ```
- **Precio Unitario Base FDM (Margen Bruto):**
  ```text
  margen              = Number(input.margenGanancia) || 0.40
  precioUnitarioBase  = Math.ceil((costoBaseProduccion / (1 - margen)) / 100) * 100
  ```

---

## 4. Diferencia Clave de Rentabilidad: Markup (SLA) vs Margen Bruto (FDM)

> ⚠️ **Importante:** Las fórmulas actuales de SLA y FDM calculan el porcentaje de utilidad de forma distinta. Ambas fórmulas se conservan intactas por decisión operativa de WJGEEKS.

Supongamos una pieza con **Costo Base de Producción = `$40.000 COP`** y un **Margen configurado del `30%` (`0.30`)**:

| Concepto | SLA Resina (`calcularPieza3D`) | FDM Filamento (`calcularPiezaFDM`) |
| :--- | :--- | :--- |
| **Fórmula aplicada** | `Costo × (1 + margen)` **(Markup)** | `Costo / (1 - margen)` **(Margen Bruto)** |
| **Cálculo exacto** | `$40.000 × 1.30 = $52.000` | `$40.000 / 0.70 = $57.142,86` |
| **Redondeo a `$100 COP`** | `Math.round` → **`$52.000 COP`** | `Math.ceil` → **`$57.200 COP`** |
| **Utilidad neta unitaria** | `$12.000 COP` | `$17.200 COP` |
| **Margen real sobre precio venta** | `23.08%` del precio cobrado | `30.07%` del precio cobrado |

---

## 5. Descuentos por Volumen, Totales, IVA y Ledger Contable

### 5.1 Escala de Descuentos por Cantidad (Ambas Tecnologías)
Cuando `aplicaDescuentoVolumen !== false`:
- `1 – 5 unidades`: `0%`
- `6 – 11 unidades`: `10%`
- `12 – 23 unidades`: `15%`
- `24+ unidades`: `20%`
- *(También admite `%` manual con `descuentoVolumenPorcentaje > 0`).*
- El `precio_total` de línea se redondea con `Math.ceil((precio_unitario × cantidad) / 100) * 100`.

### 5.2 Totales de Cotización e IVA (`calcularTotalesCotizacion`)
1. `subtotal`: Suma de `precio_total` de todas las piezas.
2. `descuentoMonto`: `Math.round((subtotal × descuentoPorcentaje) / 100)` → `subtotalConDescuento = max(0, subtotal - descuentoMonto)`.
3. `ivaMonto`: `Math.round((subtotalConDescuento × ivaPorcentaje) / 100)` *(cuando es `0%`, se muestra la leyenda `Régimen Simple / No Responsable`)*.
4. `total`: `subtotalConDescuento + ivaMonto`.

### 5.3 Anticipo del 50% y Sincronización con Supabase (`abonos_pagos`)
- `validarRegla50Anticipo` evalúa si el `abonoEfectivo` cubre al menos `Math.ceil(total × 0.5)`.
- Toda modificación, incremento, reducción o reversión a `$0` en Cotizaciones, POS Express, Cuentas de Cobro u OTs ejecuta `CloudSyncService.reconciliarPagoEnLedger(...)` para mantener sincronizado el historial en `abonos_pagos`, los saldos de `cuentas_cobro`/`ordenes_trabajo` y las snapshots de persistencia sin que una recarga de ventana o evento Realtime revierta los cambios.

