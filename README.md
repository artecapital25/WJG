# 🪐 WJGEEKS 3D PRO — Plataforma Integral de Manufactura, POS & Taller 3D

<div align="center">
  <img src="public/wjg_logo_vector.svg" alt="WJGEEKS 3D Logo" width="260" />
  <p><strong>Sistema Empresarial de Cotización Paramétrica, Punto de Venta Express (POS), Gestión de Cartera y Deudores, Pipeline de Producción, Trazabilidad STL, Marketing Meta/Instagram y Sincronización en Tiempo Real en la Nube.</strong></p>
  <p>
    <code>Versión 2.0.0 Pro</code> • <code>Local-First & Supabase Cloud</code> • <code>Hecho para Taller en Colombia 🇨🇴</code>
  </p>
</div>

---

## 📑 Tabla de Contenidos

1. [Visión General del Sistema](#-visión-general-del-sistema)
2. [Ecosistema de Módulos & Funcionalidades](#-ecosistema-de-módulos--funcionalidades)
   - [1. POS Express (Punto de Venta Rápido con Cámara)](#1-pos-express-punto-de-venta-rápido-con-cámara)
   - [2. Central de Deudores & Cuentas por Cobrar](#2-central-de-deudores--cuentas-por-cobrar)
   - [3. Tarifario Oficial por Centímetros ($10.000 / cm)](#3-tarifario-oficial-por-centímetros-10000--cm)
   - [4. Trazabilidad STL & Handoff de Taller (Germán ➔ Juan)](#4-trazabilidad-stl--handoff-de-taller-germán--juan)
   - [5. Cotizador Paramétrico 3D de Alta Precisión](#5-cotizador-paramétrico-3d-de-alta-precisión)
   - [6. Pipeline de Producción & Taller (Órdenes de Trabajo OT)](#6-pipeline-de-producción--taller-órdenes-de-trabajo-ot)
   - [7. Escudo de Privacidad de Seguimiento para Clientes](#7-escudo-de-privacidad-de-seguimiento-para-clientes)
   - [8. Equipo, Tareas & Rutinas de Mantenimiento](#8-equipo-tareas--rutinas-de-mantenimiento)
   - [9. S.O.S Insumos de Taller (Despacho de Compras Express)](#9-sos-insumos-de-taller-despacho-de-compras-express)
   - [10. Marketing Hub & Catálogo Meta Commerce (Instagram / WhatsApp)](#10-marketing-hub--catálogo-meta-commerce-instagram--whatsapp)
   - [11. Catálogo de Figuras en Stock Inmediato](#11-catálogo-de-figuras-en-stock-inmediato)
   - [12. Balance Contable, Costos & Reportes Financieros](#12-balance-contable-costos--reportes-financieros)
3. [Manual Operativo por Roles](#-manual-operativo-por-roles)
   - [Germán (Modelado 3D, Ventas & Dirección Técnica)](#-rol-germán-modelador-3d--director)
   - [Wendy (Administración, Cartera & Suministros)](#-rol-wendy-administración-cartera--compras)
   - [Juan (Operador de Impresoras, Curado & Mantenimiento)](#-rol-juan-operador-de-impresión-post-procesado--taller)
4. [Arquitectura Tecnológica & Base de Datos](#-arquitectura-tecnológica--base-de-datos)
5. [Instalación Local & PWA](#-instalación-local--pwa)
6. [Respaldo, Exportación y Recuperación de Datos](#-respaldo-exportación-y-recuperación-de-datos)

---

## 🎯 Visión General del Sistema

**WJGEEKS 3D PRO** es una solución desarrollada a la medida para talleres de manufactura aditiva y figuras de colección en resina de alta resolución (8K). 

El sistema resuelve la complejidad operativa real del taller:
- Permite vender figuras unicas o fuera de catálogo en **10 segundos** tomando una foto.
- Controla al 100% quién debe dinero, cuánto debe y cuándo prometió pagar.
- Permite presupuestar proyectos en 3 segundos según su altura ($10.000 / cm) o con el motor paramétrico de 20 variables.
- Coordina el paso de archivos 3D de modelado a impresión sin pérdidas de archivos ni versiones equivocadas.
- Envía enlaces de seguimiento a los clientes **totalmente protegidos y aislados** para no exponer costos ni cotizaciones de otros clientes.
- Genera el feed oficial de productos para sincronizar con **Instagram Shopping** y el **Catálogo de WhatsApp Business**.

---

## 🧩 Ecosistema de Módulos & Funcionalidades

### 1. POS Express (Punto de Venta Rápido con Cámara)
Diseñado para ferias, eventos o ventas directas de figuras que no están en inventario ni requieren pasar por una cotización larga:
- **Disparo Fotográfico Directo:** Activa la cámara del teléfono o permite arrastrar imágenes. Cuenta con compresión automática a formato moderno **WebP** en el navegador para ahorrar espacio y cargar a ultra-velocidad.
- **Botones de Monto Rápido:** Chips de un clic para montos habituales ($50k, $70k, $80k, $100k, $120k).
- **Control de Abonos y Saldo:** Registra cuánto dio el cliente de anticipo (Nequi, Daviplata, Bancolombia, Efectivo) y calcula automáticamente el saldo pendiente.
- **Fecha Prometida de Pago:** Selección rápida con botones inteligentes (*Hoy, Mañana, En 3 días, Fin de semana, 15 días* o fecha exacta en calendario).
- **Recibo Digital para WhatsApp:** Genera instantáneamente el comprobante formateado con emojis, saldo y enlace directo para enviárselo al cliente en 1 clic.
- **Gestión de Pagos Posteriores:** Modal emergente para registrar abonos sucesivos hasta liquidar el saldo total.

### 2. Central de Deudores & Cuentas por Cobrar
Unifica en una sola vista toda la cartera del negocio, cruzando tanto las ventas de **POS Express** como las **Cuentas de Cobro de Cotizaciones Formales**:
- **Vista de Deudores Consolidados:** Agrupa todas las deudas por persona (si un cliente tiene 2 ventas POS y 1 cotización pendiente, se presenta en una sola tarjeta con el total acumulado).
- **Semáforo Inteligente de Alertas de Pago:**
  - 🔴 **Vencido:** La fecha prometida de pago ya pasó (muestra los días de mora).
  - 🟡 **Paga Hoy:** Clientes con compromiso de pago para el día en curso.
  - 🔵 **Próximo al Pago:** Vence en los próximos 1 a 3 días.
  - 🟢 **Al Día / Pagado Total:** Compromisos cubiertos o dentro del plazo normal.
- **Cobro Amigable con 1 Clic por WhatsApp:** Genera un mensaje cordial y profesional con el saludo personalizado, el detalle de la figura, el saldo pendiente y los datos de pago del taller.

### 3. Tarifario Oficial por Centímetros ($10.000 / cm)
Tabla oficial estandarizada para figuras coleccionables en resina UV de 8K con acabado artesanal:

| Altura de Pieza | Precio Oficial (COP) | Tiempo Estimado de Taller |
| :---: | :---: | :---: |
| **5 cm** | **$50.000** | 3 Días hábiles |
| **6 cm** | **$60.000** | 3 Días hábiles |
| **7 cm** | **$70.000** | 3 Días hábiles |
| **8 cm** | **$80.000** | 3 Días hábiles |
| **9 cm** | **$90.000** | 5 Días hábiles |
| **10 cm** | **$100.000** | 5 Días hábiles |
| **11 cm** | **$110.000** | 7 Días hábiles |
| **12 cm** | **$120.000** | 7 Días hábiles |

> *Nota:* Cualquier figura que supere los 12 cm o requiera ensamble complejo multiparte se cotiza mediante el motor paramétrico.

### 4. Trazabilidad STL & Handoff de Taller (Germán ➔ Juan)
Garantiza que el archivo que entra a la impresora sea exactamente el modelado y aprobado:
- **Estados del Modelo 3D:**
  1. *Modelado Pendiente*
  2. *Diseñado por Germán*
  3. *Laminado por Juan*
  4. *En Impresora*
  5. *Impreso*
- **Control de Versiones:** Registro de versión (`v1.0`, `v1.1`, `v2.0-ahuecado`).
- **Enlace de Descarga Digital:** Guarda el link a Google Drive, WeTransfer, OneDrive o nube con el archivo STL o Chitubox listo.
- **Despacho Directo a Juan por WhatsApp:** Botón en la tarjeta de la OT para notificar al operador que el archivo ya está listo para mandar a impresión.

### 5. Cotizador Paramétrico 3D de Alta Precisión
Motor matemático de 20 variables de costos industriales:
- **Modo Dimensiones vs Gramos Slicer:** Introduce las medidas $X \times Y \times Z$ o los gramos exactos calculados por el laminador (Chitubox, Lychee, Bambu Studio).
- **Costos Reales Computados:**
  - Consumo de resina con factor de merma y soportes (40% de fábrica).
  - Gasto eléctrico según potencia de la máquina y tarifa por kWh ($1.050 COP/kWh).
  - Lavado químico y curado UV (alcohol isopropílico de 99%).
  - Mano de obra especializada de diseño, ensamble y pintura de detalle.
  - Empaques, cajas, imanes de neodimio, argollas y tornillería.
- **Modo Cotización Parcial / Pendiente:** Guarda borradores con medidas tentativas para no frenar la atención comercial mientras el cliente envía el archivo definitivo.

### 6. Pipeline de Producción & Taller (Órdenes de Trabajo OT)
Tablero Kanban interactivo que refleja el estado de la línea de fabricación:
- **Etapas de Producción:**
  `En Cola ➔ Imprimiendo ➔ Curado ➔ Pintura y Armado ➔ Control de Calidad ➔ Listo para Entrega`
- **Proyecto Rápido (Tarifario Express):** Botón `➕ Proyecto Rápido` para crear una OT en 5 segundos subiendo una foto y seleccionando los centímetros (5 a 12 cm), con opción de generar automáticamente el cobro en el POS.
- **Descuento de Inventario Automático:** Al avanzar la OT a impresión, descuenta los gramos de resina y mililitros de alcohol del inventario local.
- **Generador de Cuenta de Cobro:** Cuando la pieza está terminada, genera con un solo toque la cuenta de cobro digital para enviar al cliente.

### 7. Escudo de Privacidad de Seguimiento para Clientes
Protege los secretos comerciales y la información de otros clientes cuando se comparte el estado de una figura:
- **URL Aislada:** Al generar el link desde la OT (`/?portal=cliente&ot=OT-XXXX`), el sistema entra en modo público estricto.
- **Ocultamiento Total de Navegación:** Desaparecen la barra superior ([Navbar.tsx](src/components/ui/Navbar.tsx)), el menú inferior ([BottomNav.tsx](src/components/ui/BottomNav.tsx)) y los buscadores globales.
- **Vista Exclusiva del Pedido:** El cliente solo ve la foto de su figura, la etapa actual de fabricación, los tiempos estimados y botones para contactar al taller.
- **Candado Administrativo:** Si el equipo de WJGEEKS abre el enlace en su móvil, un botón discreto de candado permite desbloquear la administración ingresando el PIN maestro (`wjg3d` o `3202796115`).

### 8. Equipo, Tareas & Rutinas de Mantenimiento
Organizador de prioridades y mantenimiento preventivo para prolongar la vida útil de las pantallas LCD y tanques de resina:
- **Vistas Especializadas:** Pestañas separadas para **Germán**, **Wendy**, **Juan** y **Tareas Generales**.
- **Rutinas Recurrentes Pre-cargadas:**
  - Cambio y calibración de tensión del film FEP de la tina.
  - Lubricación con grasa de litio del tornillo sinfín (eje Z).
  - Filtrado de resina UV con embudo de 190 micras para retirar microfragmentos curados.
  - Conciliación bancaria de Nequi, Daviplata y Bancolombia.
- **Buzón Rápido de Ideas WhatsApp:** Permite pegar un mensaje recibido de un cliente o apunte mental y convertirlo en tarea asignada con un solo clic.

### 9. S.O.S Insumos de Taller (Despacho de Compras Express)
Botón de auxilio en el taller para cuando se agotan los materiales esenciales:
- **Disparador Inmediato:** Permite solicitar Resina (Standard, HD, Lavable en agua), Alcohol Isopropílico, Pinceles triple cero, Pinturas, FEP o Cajas de Envío.
- **Semáforo de Emergencia:** *Normal*, *Urgente* o *Taller Detenido* (bloqueo crítico).
- **Orden de Compra por WhatsApp:** Genera automáticamente el mensaje estructurado con la cantidad solicitada, enlace del proveedor y grado de urgencia para enviárselo directamente a Wendy o Germán.

### 10. Marketing Hub & Catálogo Meta Commerce (Instagram / WhatsApp)
Suite de captación y ventas para potenciar la presencia digital de WJGEEKS 3D PRO:
- **Exportador Oficial de Catálogo Meta CSV:** Genera el archivo `wjg_meta_commerce_catalog.csv` con todas las especificaciones de Meta (Google Product Category, FB Product Category, títulos, precios en COP y disponibilidad) para subir a **Meta Commerce Manager** y habilitar el etiquetado de productos en **Instagram Shopping** y el **Catálogo de WhatsApp Business**.
- **Generador de Copys de Alta Conversión para Redes:**
  - Plantillas especializadas: *Lanzamiento de Figura*, *Tarifario por Altura*, *Entrega Inmediata (Stock)*, *Detrás de Cámaras Artesanal* y *Regalo Geek/Gamer*.
  - Inserta automáticamente los precios, dimensiones y un enlace directo a la línea corporativa: `https://wa.me/573202796115?text=...`
- **Difusiones Masivas:** Textos listos para listas de difusión de WhatsApp para promociones relámpago de fin de semana y novedades de colecciones.

### 11. Catálogo de Figuras en Stock Inmediato
- Control de inventario físico de piezas terminadas listas para entrega sin tiempo de espera.
- Alertas de existencias agotadas o bajo inventario.
- Botón para enviar una figura de stock directo al cotizador o al POS Express.

### 12. Balance Contable, Costos & Reportes Financieros
- Métricas en vivo de facturación total, anticipos cobrados, saldo pendiente en calle y costos de producción.
- Cálculo de rentabilidad neta del taller.
- Exportación del libro de balances a formato compatible con Microsoft Excel y hojas de cálculo.

---

## 👥 Manual Operativo por Roles

```
                      ┌──────────────────────────────┐
                      │    GERMÁN (Director / 3D)    │
                      │  • Modelado STL y Escultura   │
                      │  • Cotizaciones Paramétricas  │
                      │  • Campañas & Redes Sociales │
                      └──────────────┬───────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────┐            ┌──────────────────────────────┐
│   WENDY (Administración)     │            │    JUAN (Línea de Taller)    │
│  • Cuentas de Cobro & Abonos │            │  • Laminado & Soportes       │
│  • Control de Deudores POS   │            │  • Impresión 8K & Curado     │
│  • Compras de Insumos (S.O.S)│            │  • Mantenimiento Eje Z y FEP │
└──────────────────────────────┘            └──────────────────────────────┘
```

### 🎨 Rol: Germán (Modelador 3D / Director)
1. **Atención de Cotizaciones Especiales:** Abre la pestaña **Cotizador 3D**, ingresa dimensiones o carga el modelo en el **Visor STL 3D** para estimar el peso en resina.
2. **Generación del Archivo de Impresión:** Tras modelar la figura en Blender/ZBrush, guarda el archivo en la nube (Drive/WeTransfer), entra a la OT en **Taller**, cambia el estado a `Diseñado por Germán`, pega el enlace y presiona **Enviar STL a Juan**.
3. **Campañas de Redes:** En el **Marketing Hub**, elige la figura destacada de la semana, copia el copy pre-formateado con emojis y publícalo en Instagram Reels o Estados con el enlace a WhatsApp.

### 💼 Rol: Wendy (Administración, Cartera & Compras)
1. **Cobro y Registro POS:** En ferias o ventas de mostrador, ingresa a **POS Express**, toma la foto de la pieza, ingresa el nombre del comprador, selecciona el abono y fija la fecha prometida de pago.
2. **Revisión de Cartera Diaria:** En **Cuentas de Cobro**, revisa la sub-pestaña **Deudores Consolidados**. Todos los clientes con etiqueta 🔴 *Vencido* o 🟡 *Paga Hoy* deben recibir el recordatorio con el botón verde de WhatsApp.
3. **Gestión de Compras (S.O.S Insumos):** En **Equipo & Tareas ➔ S.O.S Insumos**, recibe las solicitudes de Juan (resina, alcohol, pinturas), adquiere el material con los proveedores habituales y marca la solicitud como `Comprado` o `En Camino`.

### 🖨️ Rol: Juan (Operador de Impresión, Post-procesado & Taller)
1. **Recepción de STL:** Al recibir la notificación de WhatsApp de Germán, abre la OT en el pipeline, descarga el archivo desde el enlace y procede con la preparación de soportes y laminado.
2. **Flujo de Producción:** Mueve la tarjeta en el tablero Kanban conforme avanza la pieza: `En Cola ➔ Imprimiendo ➔ Curado ➔ Pintura y Armado ➔ Listo para Entrega`.
3. **Mantenimiento Preventivo:** En **Equipo & Tareas**, marca diariamente el filtrado de resina y semanalmente la lubricación del eje Z y revisión del film FEP.
4. **Alerta de Materiales:** Si la resina baja de 200 ml o queda poco alcohol isopropílico, presiona `🚨 Pedir Insumo S.O.S` para que Wendy gestione el pedido antes de que se detenga la producción.

---

## 🏗️ Arquitectura Tecnológica & Base de Datos

El sistema implementa una arquitectura **Local-First con Sincronización Cloud**:
- **Funcionamiento Autónomo Offline:** Toda la aplicación funciona inmediatamente desde el almacenamiento local del dispositivo (`localStorage`), garantizando que el taller nunca se detenga si se cae el internet.
- **Sincronización Bidireccional:** Cuando hay conexión, se sincroniza en segundo plano con **Supabase (PostgreSQL 15+)**.
- **Multi-dispositivo en Tiempo Real:** Las tablas utilizan `supabase_realtime` para que una venta registrada en un celular actualice automáticamente la pantalla de la computadora central del taller.

### Modelo de Tablas en Supabase
1. `ventas_express`: Registros de POS con fotografía, montos, abonos y fecha prometida de pago.
2. `tarifas_tamanos`: Tarifario oficial de 5 cm a 12 cm ($10k/cm).
3. `tareas_equipo`: Tareas puntuales y rutinas periódicas asignadas a Germán, Wendy o Juan.
4. `solicitudes_insumos`: Pedidos de auxilio y compras internas del taller.
5. `archivos_stl`: Trazabilidad de archivos digitales, versiones y enlaces de descarga.
6. `cotizaciones`: Historial de presupuestos paramétricos formales.
7. `ordenes_trabajo`: Órdenes en línea de producción Kanban.
8. `cuentas_cobro`: Cuentas formales con control de anticipos del 50%.
9. `clientes` y `proveedores`: Directorios de contactos comerciales.

---

## 💻 Instalación Local & PWA

### Requisitos Previos
- **Node.js** v18.0.0 o superior
- **npm** v9.0.0 o superior

### Pasos de Despliegue
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/wjgeeks-3d.git
   cd wjgeeks-3d
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno (opcional si ya están en `src/services/supabaseClient.ts`):
   Crear un archivo `.env` en la raíz:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```
4. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación quedará disponible en `http://localhost:5173/`.

5. Compilar para producción:
   ```bash
   npm run build
   ```

### 📱 Instalación como Aplicación Móvil / Escritorio (PWA)
La aplicación cuenta con manifiesto web y service worker:
- **En Google Chrome / Edge (PC):** Haz clic en el botón **Instalar App** en la barra superior o en el ícono de instalación en la barra de direcciones.
- **En Android / iOS:** Abre la URL en el navegador y selecciona **"Agregar a la pantalla principal"** para usarla como una app nativa a pantalla completa.

---

## 💾 Respaldo, Google Sheets & Sincronización en Google Drive

El sistema cuenta con un centro de sincronización dual para garantizar que jamás se pierda información y que los datos sean fácilmente consultables y auditables:

### 📊 1. Base de Datos Tabular en Google Drive (Google Sheets & Apps Script)
Diseñado para que cualquier miembro del equipo (o contabilidad) pueda abrir **Google Drive**, consultar una **Hoja de Cálculo** con formato profesional y validar los números desde su celular o PC:
- **8 Pestañas Automáticas y Estilizadas:**
  1. `📊 00_RESUMEN_EJECUTIVO`: KPIs de ingresos, órdenes activas, clientes registrados y totales en tiempo real.
  2. `💼 01_COTIZACIONES`: Historial completo con valores, descuentos, clientes y modelos.
  3. `⚙️ 02_ORDENES_TRABAJO`: Pipeline de taller, saldo pendiente, abonos, fechas de entrega y máquinas.
  4. `⚡ 03_VENTAS_POS`: Ventas rápidas de mostrador, medios de pago y estado de cartera.
  5. `👥 04_CLIENTES`: Directorio telefónico y datos de contacto de clientes.
  6. `📦 05_STOCK_PRODUCTOS`: Inventario de figuras con alerta de stock bajo.
  7. `🧪 06_RESINAS_E_INSUMOS`: Costos por kg/gramo y consumibles del taller.
  8. `🛠️ 07_APPS_3D_HERRAMIENTAS`: Lanzador de herramientas e Inteligencias Artificiales 3D.
- **Sincronización con 1 Clic o Automática:** Pulsa el botón `⚡ Sincronizar a Drive` en la aplicación o activa la casilla de *Auto-sincronización* para que cada nueva cotización o venta se envíe al instante.
- **Instalación de Google Apps Script (2 Minutos):**
  1. Crea una Hoja de Cálculo en blanco en tu Google Drive.
  2. Ve a `Extensiones > Apps Script`, pega el código que se encuentra en [scripts/google_apps_script.js](scripts/google_apps_script.js) y guarda.
  3. Haz clic en `Implementar > Nueva implementación`, tipo `Aplicación web`, Ejecutar como `Yo`, acceso `Cualquiera`.
  4. Copia la URL resultante (`https://script.google.com/macros/s/.../exec`) y pégala en la ventana de **Drive & Sheets** dentro de WJGEEKS 3D.

### 📁 2. Copia de Seguridad JSON & Compartir
- **Guardar en Google Drive (Celular):** Mediante la Web Share API, puedes enviar el respaldo directamente a tu app de Google Drive en Android/iOS en 1 toque.
- **Descargar JSON (PC):** Genera un archivo `WJGEEKS_Backup_YYYY-MM-DD.json` con todos los catálogos e historiales.
- **Restauración:** Permite cargar un archivo JSON previo para migrar o restaurar todo el taller en cualquier momento.

---

<div align="center">
  <p><strong>WJGEEKS 3D PRO — Excelencia en Manufactura Aditiva & Coleccionables</strong></p>
  <p>Línea Oficial de Atención y Ventas: <code>+57 320 279 6115</code></p>
</div>
