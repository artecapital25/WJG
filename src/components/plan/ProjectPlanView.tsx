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
  AlertTriangle
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
  const [faseExpandida, setFaseExpandida] = useState<number | null>(5); // Fase 5 abierta por ser el punto actual

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
        { titulo: "Catálogo de Resinas (10 Tipos)", completado: true, detalle: "Anycubic Standar, High Speed, ABS-like, densidades (1.13 g/cm³), costos por gramo y velocidades." },
        { titulo: "Parque de Maquinaria (6 Máquinas)", completado: true, detalle: "Photon Mono 4, Mono X, M5s, Wash & Cure 2.0 y consumo eléctrico (kWh)." },
        { titulo: "Insumos de Taller (31 Ítems)", completado: true, detalle: "Alcoholes, pinturas acrílicas, primers, empaques, argollas y herrajes." },
        { titulo: "Historial de 72 Cotizaciones Oficiales", completado: true, detalle: "Desde la 25-001 hasta la 25-073 con 149 piezas cotizadas individuales." },
        { titulo: "Script SQL Maestro (supabase_schema.sql)", completado: true, detalle: "124 KB con DDL, DML, índices y Realtime preparado para 1 clic." }
      ],
      puntosClave: [
        "Eliminación de la dependencia del archivo Excel para cotizaciones diarias.",
        "Los datos ahora persisten en localStorage y en Supabase PostgreSQL."
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
        "Precisión en márgenes de utilidad (40%+ por pieza).",
        "Trazabilidad desde presupuesto hasta entrega final."
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
        { titulo: "Repositorio Público GitHub: artecapital25/WJG", completado: true, detalle: "Ramas sincronizadas con commit inicial y documentación oficial." },
        { titulo: "Protección de Secretos (.gitignore)", completado: true, detalle: "Archivo .env protegido para no exponer credenciales de Supabase." },
        { titulo: "Limpieza de 24 Archivos Temporales", completado: true, detalle: "Eliminación de scripts de inspección Python, imágenes duplicadas y borradores." },
        { titulo: "Configuración Dual de Variables de Entorno", completado: true, detalle: "Soporte nativo para prefijos VITE_ y NEXT_PUBLIC_ para compatibilidad universal." },
        { titulo: "Enrutamiento SPA con vercel.json", completado: true, detalle: "Evita errores 404 al recargar páginas en producción." },
        { titulo: "Compilación de Producción Verificada", completado: true, detalle: "npm run build pasa en ~7.3 segundos con 0 errores TypeScript." }
      ],
      puntosClave: [
        "Estructura liviana y profesional lista para producción.",
        "README.md completo con guía arquitectónica y manual de uso."
      ]
    },
    {
      id: 5,
      nombre: "Fase 5: Edición Integral de Facturas, Procesos & Puesta en Vivo",
      tagline: "¡OBJETIVO CUMPLIDO AL 100%! 🚀",
      estado: "completada",
      progreso: 100,
      descripcion: "Perfeccionamiento de la edición de pedidos/facturas, claridad comercial de procesos adicionales, eliminación de inconsistencias en el PDF y despliegue a producción en Supabase y Vercel.",
      entregables: [
        { titulo: "Edición Completa de Ítems en Facturas/Cotizaciones", completado: true, detalle: "Modificación de nombre, cantidad, precio, medidas exactas X/Y/Z, tipo de resina, acabados y apertura directa en calculadora 3D." },
        { titulo: "Control de Visibilidad de Procesos Adicionales", completado: true, detalle: "Procesos genéricos ('Proceso Adicional') erradicados. Solo se muestran nombres claros especificados por el usuario." },
        { titulo: "Limpieza Tipográfica de Notas & Transporte", completado: true, detalle: "Eliminación absoluta de doble guión (-- o - -) y reemplazo por viñetas elegantes (•) en PDF y WhatsApp." },
        { titulo: "Ejecución de Script SQL en Supabase", completado: true, detalle: "¡VERIFICADO! 11 de 11 tablas creadas y pobladas con 72 cotizaciones, 31 clientes y configuración en PostgreSQL." },
        { titulo: "Conexión a Vercel con Variables de Entorno", completado: true, detalle: ".env.production desplegado automáticamente en Vercel vía GitHub (artecapital25/WJG)." }
      ],
      puntosClave: [
        "Las facturas y presupuestos son 100% editables y transparentes para el cliente.",
        "Base de datos Supabase validada exitosamente con todas las tablas en línea."
      ]
    },
    {
      id: 6,
      nombre: "Fase 6: Automatizaciones Futuras & Escalabilidad",
      tagline: "PUNTO ACTUAL DEL PROYECTO 📍",
      estado: "en_curso",
      progreso: 40,
      descripcion: "Integraciones avanzadas para máxima eficiencia operativa en el taller y experiencia del cliente.",
      entregables: [
        { titulo: "Sincronización Automática en la Nube (Supabase Live Sync)", completado: true, detalle: "Persistencia bidireccional y tiempo real entre PC y celular sin depender solo del caché local." },
        { titulo: "Visor STL 3D Integrado en el Navegador", completado: true, detalle: "Arrastrar el archivo .stl y ver la figura en 3D calculando automáticamente X, Y, Z." },
        { titulo: "Descuento Automático de Inventario", completado: false, detalle: "Restar gramos de resina y botes de alcohol del stock al completar cada OT." },
        { titulo: "Portal de Seguimiento para Clientes", completado: false, detalle: "Enlace público seguro donde el cliente ve en qué paso va su figura (Imprimiendo, Pintura, Listo)." },
        { titulo: "Exportación Contable Mensual a Excel", completado: false, detalle: "Botón para descargar balance de ingresos, resinas consumidas y margen neto del mes." }
      ],
      puntosClave: [
        "Sincronización en tiempo real activa entre múltiples dispositivos.",
        "Reducción continua del tiempo de atención por pedido."
      ]
    }
  ];

  const fasesCompletadas = fases.filter(f => f.estado === 'completada').length;
  const porcentajeGlobal = Math.round((fasesCompletadas / fases.length) * 100);

  return (
    <div>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Rocket size={22} color="var(--brand-cyan)" />
            WJG Project Plan & Hoja de Ruta
          </h2>
          <p className="section-subtitle">
            Seguimiento de hitos, estado actual de desarrollo y próximos pasos de la plataforma
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'rgba(56, 189, 248, 0.15)', 
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: 'var(--brand-cyan)', 
            padding: '6px 12px', 
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <TrendingUp size={15} />
            {porcentajeGlobal}% Completado
          </span>
        </div>
      </div>

      {/* Tarjeta de Posición Actual (Checkpoint) */}
      <div className="glass-card highlight" style={{ 
        background: 'linear-gradient(135deg, rgba(27, 98, 177, 0.25), rgba(15, 23, 42, 0.95))', 
        borderColor: 'rgba(56, 189, 248, 0.5)',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ 
                background: '#eab308', 
                color: '#000', 
                fontWeight: 800, 
                fontSize: '0.72rem', 
                padding: '2px 8px', 
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📍 PUNTO ACTUAL
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                ¿En qué parte del plan nos quedamos?
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '780px', lineHeight: 1.5, margin: 0 }}>
              Hemos completado exitosamente las <strong>Fases 1, 2, 3 y 4</strong>: todo el código fuente, la extracción de 72 cotizaciones, las cotizaciones parciales, el calculador 3D y el repositorio GitHub están 100% terminados y limpios. 
              Actualmente nos encontramos en la <strong>Fase 5 (Despliegue y Activación en la Nube)</strong>.
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

        {/* Acciones Inmediatas para Completar la Fase 5 */}
        <div style={{ 
          marginTop: '16px', 
          padding: '14px', 
          background: 'rgba(0, 0, 0, 0.35)', 
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} />
            PASOS SIGUIENTES INMEDIATOS (Para pasar al 100% de la Fase 5):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ background: 'var(--brand-blue)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                1
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Ejecutar SQL en Supabase</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Pega el archivo <code>supabase_schema.sql</code> en el SQL Editor de tu proyecto Supabase y dale a <strong>RUN</strong>.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ background: 'var(--brand-blue)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                2
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Crear Proyecto en Vercel</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Importa <code>artecapital25/WJG</code>, ingresa las 2 variables de entorno (URL y Key de Supabase) y dale a <strong>Deploy</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnóstico de Puntos Críticos y Puntos en que estábamos fallando */}
        <div style={{ 
          marginTop: '16px', 
          padding: '16px', 
          background: 'rgba(15, 23, 42, 0.75)', 
          borderRadius: '10px',
          border: '1px solid rgba(245, 158, 11, 0.35)'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>DIAGNÓSTICO DEL TALLER: ¿EN QUÉ ESTÁBAMOS FALLANDO Y QUÉ SE RESOLVIÓ HOY?</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#4ade80', marginBottom: '4px' }}>
                ✓ Edición Completa de Ítems en Facturas
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <strong>Antes:</strong> Solo se permitía cambiar nombre y precio; no se podían cambiar medidas, resina ni procesos.<br />
                <strong>Ahora:</strong> Se pueden editar dimensiones físicas Z/X/Y, tipo de resina, pintura, empaque y maquinaria de cada producto, o cargarlo en la calculadora 3D.
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#4ade80', marginBottom: '4px' }}>
                ✓ Claridad y Control en Procesos Adicionales
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <strong>Antes:</strong> Aparecía "Proceso Adicional" o pasos de taller en el PDF generando dudas al cliente.<br />
                <strong>Ahora:</strong> Por defecto quedan ocultos al cliente como costo interno. Si se decide mostrarlos, se exige especificar el nombre claro (ej: Grabado Láser).
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#4ade80', marginBottom: '4px' }}>
                ✓ Eliminación del Doble Guión en Transporte
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <strong>Antes:</strong> La nota comercial se imprimía con <code>- - No incluye transporte</code> por duplicación de guiones.<br />
                <strong>Ahora:</strong> Las notas se limpian automáticamente de viñetas previas y se formatea una sola viñeta limpia.
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#34d399', marginBottom: '4px' }}>
                ✓ Base de Datos Supabase Validada Exitosamente
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <strong>Estado:</strong> El script <code>supabase_schema.sql</code> se ejecutó de forma óptima. Las 11 tablas (clientes, cotizaciones, resinas, máquinas, etc.) están activas con los datos iniciales listos para sincronización.
              </div>
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
            en_curso: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)', text: '#fde047', label: '📍 En Curso (Actual)' },
            proxima: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)', text: '#cbd5e1', label: '⏳ Próximo Paso' }
          }[fase.estado];

          return (
            <div 
              key={fase.id} 
              className={`glass-card ${fase.estado === 'en_curso' ? 'highlight' : ''}`}
              style={{ margin: 0, padding: '18px', transition: 'all 0.2s ease' }}
            >
              {/* Encabezado de la Fase */}
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '10px', flexWrap: 'wrap' }}
                onClick={() => setFaseExpandida(isExpanded ? null : fase.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: fase.estado === 'completada' ? 'rgba(34, 197, 94, 0.2)' : fase.estado === 'en_curso' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: badgeStyles.text,
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}>
                    {fase.id}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      {fase.nombre}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
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
                  background: fase.estado === 'completada' ? 'var(--accent-success, #22c55e)' : fase.estado === 'en_curso' ? '#eab308' : 'var(--text-subtle)',
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
                          <Clock size={16} color="#eab308" style={{ flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: ent.completado ? '#fff' : '#fde047' }}>
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
                    <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Impacto Clave:</strong>
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
  );
};
