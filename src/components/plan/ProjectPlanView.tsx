import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  Database, 
  Layers, 
  ExternalLink, 
  ShieldCheck, 
  Cpu, 
  FileSpreadsheet, 
  Rocket, 
  Boxes, 
  Workflow, 
  Share2, 
  Calendar,
  Eye,
  Check,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Zap,
  Package,
  Users,
  Smartphone,
  DollarSign,
  Activity,
  Flame,
  Award,
  HelpCircle,
  Truck,
  CreditCard,
  Shield,
  Lightbulb,
  CheckCircle
} from 'lucide-react';

interface FasePlan {
  id: number;
  nombre: string;
  tagline: string;
  estado: 'completada' | 'en_curso' | 'proxima';
  progreso: number;
  descripcion: string;
  entregables: { titulo: string; completado: boolean; detalle: string }[];
  puntosClave: string[];
}

export const ProjectPlanView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roadmap' | 'diagnostico' | 'optimizaciones' | 'proximos'>('roadmap');
  const [faseExpandida, setFaseExpandida] = useState<number | null>(7); // Fase 7 u 8 para ver lo más reciente

  const fases: FasePlan[] = [
    {
      id: 1,
      nombre: "Fase 1: Extracción & Migración de Datos del Excel",
      tagline: "Digitalización de la base contable y catálogos de WJGEEKS.xlsx",
      estado: "completada",
      progreso: 100,
      descripcion: "Se migró toda la información acumulada en el libro Excel a código TypeScript estructurado y sentencias SQL listas para producción.",
      entregables: [
        { titulo: "31 Clientes Históricos", completado: true, detalle: "Nombres completos, NIT/CC, teléfonos y correos vinculados." },
        { titulo: "Catálogo de Resinas (10 Tipos)", completado: true, detalle: "Anycubic Standard, High Speed, ABS-like, densidades (1.13 g/cm³), costos por gramo y velocidades." },
        { titulo: "Parque de Maquinaria (6 Máquinas)", completado: true, detalle: "Photon Mono 4, Mono X, M5s, Wash & Cure 2.0 y consumo eléctrico (kWh)." },
        { titulo: "Insumos de Taller (31 Ítems)", completado: true, detalle: "Alcoholes, pinturas acrílicas, primers, empaques, argollas y herrajes." },
        { titulo: "Historial de 72 Cotizaciones Oficiales", completado: true, detalle: "Desde la 25-001 hasta la 25-073 con 149 piezas cotizadas individuales." },
        { titulo: "Script SQL Maestro (supabase_schema.sql)", completado: true, detalle: "124 KB con DDL, DML, índices y Realtime preparado para 1 clic." }
      ],
      puntosClave: [
        "Eliminación definitiva de la dependencia del archivo Excel para cotizaciones diarias.",
        "Los datos ahora persisten en localStorage y en Supabase PostgreSQL en tiempo real."
      ]
    },
    {
      id: 2,
      nombre: "Fase 2: Motor de Cálculo 3D & Producción en Taller",
      tagline: "Cálculos matemáticos exactos y gestión física de manufactura",
      estado: "completada",
      progreso: 100,
      descripcion: "Desarrollo del motor de cálculo que emula las fórmulas exactas del taller e integración con el flujo de producción.",
      entregables: [
        { titulo: "Motor de Cálculo Paramétrico 3D", completado: true, detalle: "Volumen cm³, 40% de merma de resina, curado UV/etanol y costos por minuto de máquina." },
        { titulo: "Cálculo por Gramos Exactos (Slicer)", completado: true, detalle: "Opción de ingresar el peso reportado por Chitubox/Lychee directamente." },
        { titulo: "Estandarización de Ejes (Z, X, Y)", completado: true, detalle: "Z = Vertical/Altura (tiempo de resina), X = Horizontal/Ancho, Y = Fondo/Profundidad." },
        { titulo: "Pipeline Kanban de Taller (Órdenes de Trabajo)", completado: true, detalle: "6 estados de producción: En Cola, Imprimiendo, Curado, Post-Proceso, Calidad y Listo." },
        { titulo: "Módulo de Cuentas de Cobro", completado: true, detalle: "Control de anticipos (50%), saldos pendientes y estado de pago." }
      ],
      puntosClave: [
        "Precisión en márgenes de utilidad garantizados (40%+ por pieza).",
        "Trazabilidad desde presupuesto hasta entrega final con número de OT."
      ]
    },
    {
      id: 3,
      nombre: "Fase 3: Cotizaciones Parciales, Filtros & Documentos",
      tagline: "Flexibilidad comercial para cotizar sin programas abiertos y búsqueda rápida",
      estado: "completada",
      progreso: 100,
      descripcion: "Mejoras solicitadas para agilizar la atención a clientes por WhatsApp sin exigir de inmediato la apertura del laminador 3D.",
      entregables: [
        { titulo: "Cotizaciones Parciales / Preliminares", completado: true, detalle: "Posibilidad de dejar medidas y gramos de resina pendientes de confirmar en Slicer." },
        { titulo: "Consecutivo Automático", completado: true, detalle: "Generación inteligente del correlativo siguiente (ej: 25-074, 25-075) sin duplicados." },
        { titulo: "Buscador y Filtros en Tiempo Real", completado: true, detalle: "Búsqueda por número, cliente o pieza, filtro desplegable por cliente y pestañas de estado." },
        { titulo: "Ordenamiento Multicriterio", completado: true, detalle: "Más reciente primero, más antigua, alfabético A-Z/Z-A y por mayor/menor valor." },
        { titulo: "Generación de PDF Oficiales (jsPDF)", completado: true, detalle: "Documentos con logotipo, datos bancarios (Bancolombia, Nequi, Daviplata) y marcas de agua de estado." },
        { titulo: "Integración Directa con WhatsApp", completado: true, detalle: "Mensajes redactados listos para enviar en un clic vía web o móvil." }
      ],
      puntosClave: [
        "Aprobación rápida a taller con confeti visual y generación instantánea de OTs.",
        "Advertencias claras en PDF y WhatsApp cuando una cotización es preliminar."
      ]
    },
    {
      id: 4,
      nombre: "Fase 4: Repositorio GitHub, Seguridad & Optimización",
      tagline: "Limpieza profunda del código, control de versiones y preparación para despliegue",
      estado: "completada",
      progreso: 100,
      descripcion: "Estructuración del proyecto bajo estándares modernos de software, protegiendo credenciales y garantizando tiempos de carga ultrarrápidos.",
      entregables: [
        { titulo: "Repositorio GitHub: artecapital25/WJG", completado: true, detalle: "Ramas sincronizadas con commit inicial y documentación oficial." },
        { titulo: "Protección de Secretos (.gitignore)", completado: true, detalle: "Archivo .env protegido para no exponer credenciales de Supabase." },
        { titulo: "Limpieza de Archivos Temporales", completado: true, detalle: "Eliminación de scripts de inspección Python, imágenes duplicadas y borradores." },
        { titulo: "Configuración Dual de Variables de Entorno", completado: true, detalle: "Soporte nativo para prefijos VITE_ y NEXT_PUBLIC_ para compatibilidad universal." },
        { titulo: "Enrutamiento SPA con vercel.json", completado: true, detalle: "Evita errores 404 al recargar páginas en producción." },
        { titulo: "Compilación de Producción Verificada", completado: true, detalle: "npm run build pasa en ~8 segundos con 0 errores TypeScript." }
      ],
      puntosClave: [
        "Estructura liviana y profesional lista para producción.",
        "README.md completo con guía arquitectónica y manual de uso."
      ]
    },
    {
      id: 5,
      nombre: "Fase 5: Base de Datos Supabase en Vivo & Persistencia Cloud",
      tagline: "Sincronización bidireccional entre taller, PC y celular",
      estado: "completada",
      progreso: 100,
      descripcion: "Ejecución de los scripts de esquema SQL en Supabase, configuración de Row Level Security (RLS) y conexión activa en tiempo real.",
      entregables: [
        { titulo: "Tablas Maestras en Supabase (PostgreSQL)", completado: true, detalle: "11 tablas creadas: clientes, cotizaciones, resinas, máquinas, insumos, etc." },
        { titulo: "Tablas Operativas v2 (supabase_update_v2.sql)", completado: true, detalle: "ventas_express, tareas_equipo, solicitudes_insumos y tarifas_tamanos creadas con RLS." },
        { titulo: "Estrategia Offline-First con Respaldo en la Nube", completado: true, detalle: "Los datos se guardan inmediatamente en local y se replican en segundo plano a Supabase." },
        { titulo: "Control de Conexión en Tiempo Real", completado: true, detalle: "Pill indicador de estado (Supabase Online, Sincronizando, Local) en la plataforma." }
      ],
      puntosClave: [
        "Control total de datos en la nube sin riesgo de pérdida por borrado de caché.",
        "Manejo fluido para trabajar sin conexión en el taller si la red falla."
      ]
    },
    {
      id: 6,
      nombre: "Fase 6: Tarifario Estándar ($10k/cm), Balance & Visor STL",
      tagline: "Lista de precios oficial por altura, visor 3D en navegador y contabilidad",
      estado: "completada",
      progreso: 100,
      descripcion: "Implementación de la nueva política de precios rápidos, balance mensual de finanzas y visor STL sin necesidad de Chitubox.",
      entregables: [
        { titulo: "Nuevo Tarifario Oficial ($10.000 / cm)", completado: true, detalle: "5cm ($50k), 6cm ($60k), 7cm ($70k), 8cm ($80k), 9cm ($90k), 10cm ($100k), 11cm ($110k), 12cm ($120k)." },
        { titulo: "Visor STL 3D Integrado con Three.js", completado: true, detalle: "Arrastrar el archivo .stl y visualizar la malla calculando dimensiones en milímetros." },
        { titulo: "Módulo de Finanzas & Balance Contable", completado: true, detalle: "Ingresos totales, costos de producción, margen bruto y exportación a Excel nativo (.xls)." },
        { titulo: "PWA Instalable con Service Worker", completado: true, detalle: "Instalación en Android, iOS y PC como aplicación independiente." }
      ],
      puntosClave: [
        "Cotizaciones express en segundos para clientes de Instagram/WhatsApp.",
        "Finanzas transparentes para saber con exactitud cuánto gana el taller cada mes."
      ]
    },
    {
      id: 7,
      nombre: "Fase 7: Ecosistema Operativo de Taller & Escudo de Privacidad",
      tagline: "POS Express, Central de Deudores, Equipo S.O.S, Marketing Hub y Enlace Privado",
      estado: "completada",
      progreso: 100,
      descripcion: "Desarrollo completo de los 5 requerimientos de choque: ventas con foto, seguimiento de quién debe dinero, asignación de tareas a Germán, Wendy y Juan, marketing para Meta y portal de cliente aislado.",
      entregables: [
        { titulo: "POS Express con Foto y Recordatorio", completado: true, detalle: "Captura de foto de figura, registro de comprador, abono inicial y fecha prometida de pago." },
        { titulo: "Central de Cartera & Base de Deudores", completado: true, detalle: "Cruce consolidado de ventas express y cuentas de cobro, badges de morosidad y cobro por WhatsApp con 1 clic." },
        { titulo: "Módulo de Equipo & S.O.S Insumos", completado: true, detalle: "Pestañas para Germán, Wendy y Juan, rutinas de calibración y botón de pánico para compras de insumos." },
        { titulo: "Marketing Hub & Catálogo Meta CSV", completado: true, detalle: "Exportador para Instagram Shopping y Facebook Catalog + generador de copys persuasivos." },
        { titulo: "Escudo de Privacidad para Clientes", completado: true, detalle: "Portal confidencial /?portal=cliente&ot=OT-XXXX que muestra solo la etapa de impresión sin costos ni barra de navegación." }
      ],
      puntosClave: [
        "Control total de deudas en la calle en tiempo real.",
        "El cliente puede ver el avance de su figura sin acceder a la administración interna de la empresa."
      ]
    },
    {
      id: 8,
      nombre: "Fase 8: Experiencia Móvil Vertical & Cuadrícula Ultra-Ergonómica",
      tagline: "Header minimalista, eliminación total de scroll horizontal y cuadrículas táctiles",
      estado: "completada",
      progreso: 100,
      descripcion: "Optimización integral de la interfaz de usuario en celulares: barra superior limpia con solo 2 botones táctiles sin texto, flujo 100% vertical y botones alineados en cuadrícula simétrica.",
      entregables: [
        { titulo: "Banner Superior Móvil Minimalista", completado: true, detalle: "Muestra solo logo WJGEEKS y 2 botones de ícono (Instalar App y Cotizar) sin texto, ocultando botones secundarios." },
        { titulo: "Flujo 100% Vertical sin Desplazamiento Lateral", completado: true, detalle: "Bloqueo total de scroll horizontal (overflow-x: hidden), apilando los paneles a una sola columna en pantallas pequeñas." },
        { titulo: "Botones en Cuadrícula Simétrica", completado: true, detalle: "Precios rápidos, fechas prometidas, filtros y sub-pestañas organizados en CSS Grid sin desalineaciones." },
        { titulo: "Botón de Instalación PWA Asistido", completado: true, detalle: "Instrucciones automáticas para agregar a pantalla de inicio en Android y iPhone/Safari." }
      ],
      puntosClave: [
        "Experiencia en celular sumamente ágil, limpia y sin saturación visual.",
        "Facilidad para operar el sistema con una sola mano en el taller."
      ]
    },
    {
      id: 9,
      nombre: "Fase 9: Escalamiento Industrial, Pagos Online & Envíos",
      tagline: "Pasarelas automáticas (Wompi/PSE), guías de mensajería y trazabilidad de lotes",
      estado: "proxima",
      progreso: 25,
      descripcion: "Próximos pasos recomendados para consolidar a WJGEEKS como referente nacional: automatización de cobros sin validar comprobantes, cálculo de envíos y control de vida útil de máquinas.",
      entregables: [
        { titulo: "Integración de Pasarela de Pagos (Wompi / Bold)", completado: false, detalle: "Generación de links de pago PSE / Tarjeta en WhatsApp y portal de cliente con conciliación automática." },
        { titulo: "Módulo de Envíos y Despachos Nacionales", completado: false, detalle: "Generación de rótulos de empaque y seguimiento de guías de Interrapidísimo, Envía o Servientrega." },
        { titulo: "Trazabilidad de Lotes de Resina & Vida Útil FEP/LCD", completado: false, detalle: "Contador de horas de exposición UV y capas impresas por máquina para alertas de cambio preventivo de pantallas y láminas FEP." },
        { titulo: "Facturación Electrónica DIAN", completado: false, detalle: "Módulo de emisión de facturación electrónica para clientes corporativos y agencias." }
      ],
      puntosClave: [
        "Cero tiempo perdido validando transferencias bancarias de forma manual.",
        "Máxima protección de maquinaria de resina previniendo fugas o roturas de pantalla."
      ]
    }
  ];

  const fasesCompletadas = fases.filter(f => f.estado === 'completada').length;
  const porcentajeGlobal = Math.round((fasesCompletadas / fases.length) * 100);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Encabezado Principal */}
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2 className="section-title">
            <Rocket size={24} color="var(--brand-cyan)" />
            Plan Estratégico & Estado de la Empresa WJGEEKS 3D
          </h2>
          <p className="section-subtitle">
            Validación de hitos alcanzados, diagnóstico en vivo de dónde estamos, qué nos falta y manual de optimizaciones operativas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'rgba(56, 189, 248, 0.15)', 
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: 'var(--brand-cyan)', 
            padding: '6px 14px', 
            borderRadius: 'var(--radius-full)',
            fontSize: '0.88rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <TrendingUp size={16} />
            {fasesCompletadas} de {fases.length} Fases Completadas ({porcentajeGlobal}%)
          </span>
        </div>
      </div>

      {/* Selector de Pestañas Principales en Cuadrícula Simétrica */}
      <div className="subtabs-grid-mobile" style={{ marginBottom: '22px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'roadmap' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('roadmap')}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Rocket size={16} />
          <span>🗺️ Hoja de Ruta & Fases</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'diagnostico' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('diagnostico')}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Activity size={16} />
          <span>🔍 ¿Dónde Estamos & Qué Falta?</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'optimizaciones' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('optimizaciones')}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Zap size={16} />
          <span>⚡ Manual de Optimizaciones 3D</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'proximos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('proximos')}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Sparkles size={16} />
          <span>🚀 Próximos Módulos Estratégicos</span>
        </button>
      </div>

      {/* ==============================================================
          PESTAÑA 1: HOJA DE RUTA & FASES
          ============================================================== */}
      {activeTab === 'roadmap' && (
        <div>
          {/* Tarjeta de Posición Actual (Checkpoint) */}
          <div className="glass-card highlight" style={{ 
            background: 'linear-gradient(135deg, rgba(27, 98, 177, 0.25), rgba(15, 23, 42, 0.95))', 
            borderColor: 'rgba(56, 189, 248, 0.5)',
            padding: '22px',
            marginBottom: '22px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ 
                    background: '#22c55e', 
                    color: '#000', 
                    fontWeight: 800, 
                    fontSize: '0.74rem', 
                    padding: '3px 9px', 
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📍 CHECKPOINT ACTUAL
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Estado de Desarrollo: 8 Fases Implementadas con Éxito
                  </h3>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '850px', lineHeight: 1.5, margin: 0 }}>
                  WJGEEKS 3D PRO cuenta actualmente con su ecosistema central 100% operativo en la nube y móvil: calculador 3D con tarifario por altura ($10k/cm), sistema POS Express con fotografía y control de abonos, central consolidada de deudores, tablero de tareas para Germán, Wendy y Juan con compras S.O.S, exportador de catálogo Meta/Instagram, escudo de seguimiento confidencial para clientes y una interfaz móvil vertical ultra-limpia.
                </p>
              </div>

              <a 
                href="https://github.com/artecapital25/WJG" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Ver Repo en GitHub</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Resumen de Capacidad Actual */}
            <div style={{ 
              marginTop: '18px', 
              padding: '14px', 
              background: 'rgba(0, 0, 0, 0.4)', 
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--brand-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#34d399" />
                LOGROS CONSOLIDADOS DEL SISTEMA:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #34d399' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fff' }}>⚡ Base de Datos Supabase</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>11 tablas relacionales con RLS y sincronización bidireccional en vivo.</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fff' }}>📸 POS Express & Deudores</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Ventas rápidas con foto WebP, alertas inteligentes de morosidad y cobro WhatsApp.</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #c084fc' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fff' }}>👥 Taller & Equipo WJG</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Gestión por integrante (Germán, Wendy, Juan), rutinas periódicas y S.O.S Insumos.</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #f472b6' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fff' }}>🛡️ Escudo & Meta Hub</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Portal cliente privado sin costos internos y catálogo CSV para Instagram Shopping.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista Desplegable de Fases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {fases.map(fase => {
              const isExpanded = faseExpandida === fase.id;

              const badgeStyles = {
                completada: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#4ade80', label: '✅ Completada' },
                en_curso: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)', text: '#fde047', label: '📍 En Curso' },
                proxima: { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', text: '#38bdf8', label: '🚀 Próximo Nivel' }
              }[fase.estado];

              return (
                <div 
                  key={fase.id} 
                  className={`glass-card ${fase.estado === 'proxima' ? 'highlight' : ''}`}
                  style={{ margin: 0, padding: '18px', transition: 'all 0.2s ease' }}
                >
                  {/* Encabezado de la Fase */}
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '10px', flexWrap: 'wrap' }}
                    onClick={() => setFaseExpandida(isExpanded ? null : fase.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: fase.estado === 'completada' ? 'rgba(34, 197, 94, 0.2)' : fase.estado === 'en_curso' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: badgeStyles.text,
                        fontWeight: 800,
                        fontSize: '1.05rem'
                      }}>
                        {fase.id}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                          {fase.nombre}
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                          {fase.tagline}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ 
                        background: badgeStyles.bg, 
                        border: `1px solid ${badgeStyles.border}`,
                        color: badgeStyles.text,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        {badgeStyles.label}
                      </span>

                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso de la Fase */}
                  <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${fase.progreso}%`, 
                      background: fase.estado === 'completada' ? 'var(--accent-success, #22c55e)' : fase.estado === 'en_curso' ? '#eab308' : '#38bdf8',
                      borderRadius: '6px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  {/* Detalle Desplegado */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                        {fase.descripcion}
                      </p>

                      {/* Entregables */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                        {fase.entregables.map((ent, idx) => (
                          <div 
                            key={idx}
                            style={{ 
                              background: 'rgba(0, 0, 0, 0.25)', 
                              padding: '10px 12px', 
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.04)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px'
                            }}
                          >
                            {ent.completado ? (
                              <CheckCircle2 size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
                            ) : (
                              <Clock size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                            )}
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: ent.completado ? '#fff' : '#38bdf8' }}>
                                {ent.titulo}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {ent.detalle}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Puntos Clave */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Impacto Clave para WJGEEKS:</strong>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {fase.puntosClave.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==============================================================
          PESTAÑA 2: DIAGNÓSTICO (¿DÓNDE ESTAMOS & QUÉ FALTA?)
          ============================================================== */}
      {activeTab === 'diagnostico' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--brand-cyan)" />
              Matriz Operativa de Diagnóstico: Dónde Estamos vs. Qué Nos Falta
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Evaluación módulo por módulo del estado técnico, nivel de automatización alcanzado y hoja de ruta para la expansión de la empresa.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.3)' }}>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>Módulo / Área</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>Estado Actual</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>Validación en Vivo</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>¿Qué Falta para Escalar?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>📐 Calculador 3D & Slicer</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Tarifario oficial ($10k/cm), cálculo de merma 40%, horas de máquina e insumos.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Laminador web ligero para importar STL y auto-orientar soportes.</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>📸 POS Express</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Registro con foto WebP ultra-rápida, abonos, fecha de cobro y guardado instantáneo.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Generador de código QR impreso para pegar en la base o caja de la figura.</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>👥 Base de Deudores</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Cruce total de cartera (POS + Cotizaciones), cálculo de saldos y WhatsApp directo.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Link de pago en línea (Wompi/PSE) que marque como pagado al recibir la transferencia.</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>🏭 Taller Kanban & OTs</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>6 estados de producción, creación de Proyectos Rápidos y envío de STL a Juan.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Asignación de impresoras específicas con cronómetro de término de impresión.</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>👤 Equipo & S.O.S Insumos</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Pestañas asignadas (Germán, Wendy, Juan), rutinas y solicitud de compra con link.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Notificaciones push nativas al móvil cuando se asigna una tarea urgente.</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>📣 Marketing Hub Meta</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Exportador CSV para Instagram Shopping / Facebook Catalog y generador de copys.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Publicación automática en Instagram Reels/Stories mediante Meta Graph API.</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>🛡️ Escudo de Privacidad</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Portal de seguimiento para el cliente (/portal=cliente) sin costos ni barra admin.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Galería de fotos de control de calidad para que el cliente apruebe antes del despacho.</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>📱 Experiencia Móvil</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Header limpio con solo 2 botones táctiles sin texto, flujo 100% vertical y cuadrícula.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Empaquetado PWA a Google Play Store con Trusted Web Activity (TWA).</td>
                  </tr>

                  <tr>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>☁️ Supabase Cloud</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#34d399', fontWeight: 700 }}>100% Operativo</span></td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>PostgreSQL con RLS, sincronización bidireccional y persistencia Offline-First.</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>Automatización de backups diarios en un bucket S3 / Supabase Storage.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          PESTAÑA 3: MANUAL DE OPTIMIZACIONES PARA EMPRESA 3D
          ============================================================== */}
      {activeTab === 'optimizaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Banner introductorio */}
          <div className="glass-card highlight" style={{ 
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(15, 23, 42, 0.95))', 
            borderColor: 'rgba(234, 179, 8, 0.4)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Flame size={22} color="#fbbf24" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Guía de Buenas Prácticas & Optimizaciones para WJGEEKS 3D PRO
              </h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Recomendaciones operativas, financieras, técnicas y comerciales diseñadas específicamente para un taller de impresión 3D en resina, orientadas a maximizar margen neto, evitar fallos de impresión y blindar la tesorería.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {/* PILAR 1: TALLER & MANUFACTURA LEAN */}
            <div className="glass-card" style={{ margin: 0, padding: '20px', borderLeft: '4px solid var(--brand-cyan)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Cpu size={20} color="var(--brand-cyan)" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  1. Taller & Manufactura Lean (Cero Merma)
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Agrupación por Altura Z (Nesting Inteligente):</strong>
                  El tiempo en resina depende 100% de la altura Z. Si imprimes una figura de 12cm sola, el plato sobrante es costo desaprovechado. Agrupa siempre 3 a 5 figuras de la misma altura en la misma tanda.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Sistema de Lavado IPA en 2 Etapas:</strong>
                  Usa un "Tanque 1" con alcohol reutilizado para remover el 85% de la resina suelta y un "Tanque 2" con IPA puro 99.8% para el acabado final. El alcohol limpio durará hasta 4 veces más.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Calentamiento Previo de Resina (24°C - 28°C):</strong>
                  En temporadas frías, la resina espesa provoca fallos de succión y delaminación. Agitar bien y calentar el recipiente con faja térmica reduce los fallos de soporte en un 90%.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Filtrado Obligatorio tras Cada Fallo:</strong>
                  Si una impresión falla o se despega, es obligatorio colar la resina de la cuba con filtro de 190 micras. Un fragmento sólido flotando romperá la pantalla LCD en la siguiente bajada de la plataforma.
                </div>
              </div>
            </div>

            {/* PILAR 2: FINANZAS & FLUJO DE CAJA */}
            <div className="glass-card" style={{ margin: 0, padding: '20px', borderLeft: '4px solid #4ade80' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <DollarSign size={20} color="#4ade80" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  2. Finanzas, Anticipos & Flujo de Caja
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Regla de Oro del 50% de Anticipo:</strong>
                  Bajo ninguna circunstancia se enciende una impresora 3D sin el 50% del dinero transferido. La resina y el tiempo de máquina son costos irreversibles.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Cruce Matutino de Cartera:</strong>
                  Dedicar 5 minutos cada mañana en el módulo <em>Central de Deudores</em> para revisar fechas prometidas de pago cumplidas y pulsar el botón verde de WhatsApp.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Política de Almacenamiento & Abandono (30 días):</strong>
                  Incluir en la nota de entrega: las figuras terminadas no reclamadas tras 30 días de notificación entrarán a subasta o catálogo de entrega inmediata para recuperar costos.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Separación de Cuentas (Costo vs. Margen):</strong>
                  El 40% del dinero que entra de cada figura pertenece a insumos, luz, FEP y depreciación de máquinas. Solo el excedente es utilidad líquida repartible.
                </div>
              </div>
            </div>

            {/* PILAR 3: COMERCIAL & MARKETING DIGITAL */}
            <div className="glass-card" style={{ margin: 0, padding: '20px', borderLeft: '4px solid #f472b6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Share2 size={20} color="#f472b6" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  3. Comercial, Redes & Fidelización
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Sincronizar el Catálogo Meta en Instagram:</strong>
                  Cargar semanalmente el archivo CSV descargado de <em>Marketing Hub</em> a Meta Commerce Manager. Permite etiquetar figuras coleccionables con su precio directo en Instagram Reels y fotos.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Uso del Escudo de Privacidad de Seguimiento:</strong>
                  Al compartir el link de la orden de trabajo (`/?portal=cliente&ot=OT-XXXX`), el cliente se siente en una multinacional de tecnología viendo el progreso en vivo, sin ver costos ni márgenes del taller.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Fotos de Calidad para Catálogo:</strong>
                  Tomar siempre la foto de la figura en el módulo POS Express antes de entregarla. Eso nutre automáticamente el catálogo de stock y los copys de marketing.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Respuesta Inmediata con Tarifario Oficial:</strong>
                  Al cliente no le gusta esperar a que abran un programa para saber cuánto cuesta. Para figuras estándar, responder de inmediato con la tabla de 5cm ($50k) a 12cm ($120k).
                </div>
              </div>
            </div>

            {/* PILAR 4: TECNOLOGÍA & MANTENIMIENTO */}
            <div className="glass-card" style={{ margin: 0, padding: '20px', borderLeft: '4px solid #c084fc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={20} color="#c084fc" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  4. Tecnología, Seguridad & Mantenimiento
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Respaldo JSON Semanal:</strong>
                  Aunque Supabase guarda todo en PostgreSQL, descargar un backup físico en JSON mediante el botón "Respaldo" asegura una copia de contingencia total en disco duro.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Control Preventivo de Películas FEP/NFEP:</strong>
                  Monitorear la tensión y marcas en la lámina. Un film perforado por un soporte afilado daña irremediablemente la pantalla monocromática UV ($300k - $600k COP de daño).
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Modo PWA en Celular:</strong>
                  Instalar la aplicación en la pantalla de inicio del celular de Germán, Wendy y Juan para operarla como una app nativa con apertura en 1 toque.
                </div>

                <div>
                  <strong style={{ color: '#fff', display: 'block' }}>• Registro Inmediato en S.O.S Insumos:</strong>
                  No esperar a que se acabe el alcohol o la resina. Apenas una botella llegue al 20%, pulsar el botón <em>🚨 S.O.S Insumos</em> para que compras lo despache a tiempo.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          PESTAÑA 4: PRÓXIMOS MÓDULOS ESTRATÉGICOS
          ============================================================== */}
      {activeTab === 'proximos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--brand-cyan)" />
              Módulos Sugeridos para la Fase 9: Escalamiento Industrial
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Funcionalidades de alto impacto que transformarán a WJGEEKS en una fábrica 3D de alta capacidad automatizada.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Módulo 1: Pagos Automáticos */}
              <div className="glass-card" style={{ margin: 0, padding: '16px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CreditCard size={18} color="var(--brand-cyan)" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    1. Pasarela de Pagos PSE / Wompi / Bold
                  </h4>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 10px 0' }}>
                  Generar un botón de pago con link seguro al enviar la cotización por WhatsApp o en el portal de cliente. Al pagar el cliente, el pedido pasa automáticamente a "Abono Pagado" sin verificar manualmente la cuenta bancaria.
                </p>
                <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Impacto: Cero fricción en cobros
                </span>
              </div>

              {/* Módulo 2: Despachos y Guías de Envío */}
              <div className="glass-card" style={{ margin: 0, padding: '16px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Truck size={18} color="#4ade80" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    2. Módulo de Envíos & Guías Nacionales
                  </h4>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 10px 0' }}>
                  Registro de empresa de transporte (Interrapidísimo, Envía, Servientrega), número de guía, estado del paquete (En tránsito, Entregado) e impresión directa del rótulo con aviso de "Frágil / Figura Coleccionable".
                </p>
                <span style={{ fontSize: '0.72rem', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Impacto: Cero reclamos por extravío
                </span>
              </div>

              {/* Módulo 3: Contador de Horas FEP & LCD */}
              <div className="glass-card" style={{ margin: 0, padding: '16px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={18} color="#c084fc" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    3. Horómetro de Máquinas & Desgaste FEP
                  </h4>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 10px 0' }}>
                  Acumula automáticamente las horas de luz UV de cada orden de trabajo sobre las impresoras Photon Mono. Muestra una barra de vida útil y envía alerta a Juan cuando falten 50 horas para cambiar el film FEP.
                </p>
                <span style={{ fontSize: '0.72rem', background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Impacto: Previene roturas de pantalla
                </span>
              </div>

              {/* Módulo 4: Trazabilidad de Botellas y Lotes */}
              <div className="glass-card" style={{ margin: 0, padding: '16px', border: '1px solid rgba(244, 114, 182, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package size={18} color="#f472b6" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    4. Lotes de Resina & Parámetros Slicer
                  </h4>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 10px 0' }}>
                  Vincular la marca de resina exacta y el tiempo de exposición por capa (ej: 2.3 seg en Anycubic Grey) a cada figura. Si una pieza sale perfecta, sus parámetros quedan guardados para reimpresiones futuras idénticas.
                </p>
                <span style={{ fontSize: '0.72rem', background: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Impacto: Calidad 100% estandarizada
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
