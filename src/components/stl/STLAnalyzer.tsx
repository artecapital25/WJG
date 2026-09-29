import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Box, 
  UploadCloud, 
  Scale, 
  RotateCw, 
  Maximize2, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Compass, 
  Layers, 
  DollarSign, 
  Clock, 
  Info, 
  ExternalLink,
  Sliders,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { analyzeSTLFile, STLAnalysisResult } from '../../services/stlService';
import { Resina } from '../../types';

interface STLAnalyzerProps {
  resinas: Resina[];
  onApplyToCotizador?: (data: {
    altoMm: number;
    anchoMm: number;
    profundidadMm: number;
    pesoResinaG: number;
    nombrePieza: string;
  }) => void;
}

export const STLAnalyzer: React.FC<STLAnalyzerProps> = ({ resinas, onApplyToCotizador }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<STLAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Escala
  const [escalaPorcentaje, setEscalaPorcentaje] = useState<number>(100);
  const [alturaDeseadaZ, setAlturaDeseadaZ] = useState<string>('');

  // Configuración de impresión de resina
  const [resinaSeleccionadaId, setResinaSeleccionadaId] = useState<string>(resinas[0]?.id || '');
  const [modoAhuecado, setModoAhuecado] = useState<'solido' | 'ahuecado'>('solido');
  const [porcentajeAhuecado, setPorcentajeAhuecado] = useState<number>(35); // 35% de resina si es ahuecado (65% ahorro)
  const [factorSoportes, setFactorSoportes] = useState<number>(1.25); // 25% extra en soportes y merma

  // Vista 3D
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const reqAnimRef = useRef<number | null>(null);

  // Color de previsualización
  const [colorModelo, setColorModelo] = useState<string>('#38bdf8'); // Cyan

  const resinaActual = resinas.find(r => r.id === resinaSeleccionadaId) || resinas[0] || {
    densidad_g_cm3: 1.13,
    costo_gramo: 78.76,
    tipo: 'Resina Standar',
    color: 'Negro'
  };

  // Manejo de archivo subido
  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setError('Por favor selecciona un archivo con extensión .stl');
      return;
    }

    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const result = analyzeSTLFile(buffer, file.name);
        setAnalysis(result);
        setEscalaPorcentaje(100);
        setAlturaDeseadaZ(result.originalDimensions.z.toString());
        setLoading(false);
      } catch (err: any) {
        console.error('Error parseando STL:', err);
        setError(`No se pudo leer el archivo STL: ${err.message || err}`);
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo desde el dispositivo');
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Métricas calculadas con la escala actual
  const factorEscala = escalaPorcentaje / 100;

  const dimensionesEscaladas = useMemo(() => {
    if (!analysis) return { x: 0, y: 0, z: 0 };
    return {
      x: Number((analysis.originalDimensions.x * factorEscala).toFixed(2)),
      y: Number((analysis.originalDimensions.y * factorEscala).toFixed(2)),
      z: Number((analysis.originalDimensions.z * factorEscala).toFixed(2))
    };
  }, [analysis, factorEscala]);

  // El volumen escala al cubo del factor de escala (V = V0 * s^3)
  const volumenEscaladoCm3 = useMemo(() => {
    if (!analysis) return 0;
    const factorCubico = Math.pow(factorEscala, 3);
    return Number((analysis.originalVolumeCm3 * factorCubico).toFixed(2));
  }, [analysis, factorEscala]);

  // Gramos de resina calculados
  const estimacionResina = useMemo(() => {
    const densidad = resinaActual.densidad_g_cm3 || 1.13;
    const costoGramo = resinaActual.costo_gramo || 78.76;

    // Si es ahuecado, multiplicar por el porcentaje de pared efectiva
    const ratioRelleno = modoAhuecado === 'ahuecado' ? (porcentajeAhuecado / 100) : 1.0;
    
    // Gramos netos de la figura
    const gramosNetos = volumenEscaladoCm3 * densidad * ratioRelleno;
    
    // Gramos brutos con soportes y merma
    const gramosTotalesConSoportes = gramosNetos * factorSoportes;
    
    // Costo estimado de la resina
    const costoAproxCOP = Math.round(gramosTotalesConSoportes * costoGramo);

    return {
      gramosNetos: Number(gramosNetos.toFixed(1)),
      gramosTotales: Number(gramosTotalesConSoportes.toFixed(1)),
      costoAproxCOP
    };
  }, [volumenEscaladoCm3, resinaActual, modoAhuecado, porcentajeAhuecado, factorSoportes]);

  // Ajustar escala cuando el usuario escribe la altura deseada en Z
  const handleCambioAlturaZ = (valStr: string) => {
    setAlturaDeseadaZ(valStr);
    const zNum = parseFloat(valStr);
    if (!isNaN(zNum) && zNum > 0 && analysis && analysis.originalDimensions.z > 0) {
      const nuevaEscala = (zNum / analysis.originalDimensions.z) * 100;
      setEscalaPorcentaje(Number(nuevaEscala.toFixed(1)));
    }
  };

  // Inicializar Three.js y actualizar la malla 3D
  useEffect(() => {
    if (!containerRef.current) return;

    // Limpiar canvas anterior si existe
    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth || 400;
    const height = 340;

    // 1. Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d15);
    sceneRef.current = scene;

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(120, 100, 140);

    // 3. Renderizador
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controles orbitales
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // No bajar demasiado bajo la cama
    controlsRef.current = controls;

    // 5. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(100, 200, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-100, -50, -100);
    scene.add(dirLight2);

    // 6. Plataforma / Cama de Impresión 3D (Grid)
    const gridSize = 160;
    const gridDivisions = 16;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x1b62b1, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Marco de placa de construcción (Anycubic Photon Buildplate style)
    const plateGeo = new THREE.BoxGeometry(gridSize, 2, gridSize);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -1;
    scene.add(plate);

    // 7. Bucle de animación
    const animate = () => {
      reqAnimRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Redimensionamiento
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      renderer.dispose();
    };
  }, []);

  // Actualizar el modelo cuando cambia el análisis, la escala o el color
  useEffect(() => {
    if (!sceneRef.current || !analysis) return;

    // Eliminar malla anterior si existe
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
      meshRef.current = null;
    }

    // Material de resina fotopolímera con brillo metálico/plástico
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorModelo),
      roughness: 0.25,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(analysis.geometry.clone(), material);

    // Aplicar escala
    mesh.scale.set(factorEscala, factorEscala, factorEscala);

    // Colocar la base de la figura sobre la cama (y >= 0)
    const currentBox = new THREE.Box3().setFromObject(mesh);
    const minY = currentBox.min.y;
    mesh.position.y = -minY;

    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    // Ajustar cámara para encuadrar la figura
    if (controlsRef.current) {
      const center = new THREE.Vector3();
      currentBox.getCenter(center);
      controlsRef.current.target.set(0, center.y, 0);
    }
  }, [analysis, factorEscala, colorModelo]);

  const handleEnviarAlCotizador = () => {
    if (!analysis || !onApplyToCotizador) return;

    onApplyToCotizador({
      altoMm: dimensionesEscaladas.z,
      anchoMm: dimensionesEscaladas.x,
      profundidadMm: dimensionesEscaladas.y,
      pesoResinaG: estimacionResina.gramosTotales,
      nombrePieza: analysis.fileName.replace(/\.stl$/i, '')
    });
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Box size={22} color="var(--brand-cyan)" />
            Previsualizador & Estimador de STL 3D
          </h2>
          <p className="section-subtitle">
            Carga modelos 3D, inspecciona medidas X, Y, Z, escala en tiempo real y calcula gramos de resina
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* COLUMNA IZQUIERDA: VISOR 3D & CARGA */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Zona de Drop / Carga de Archivo */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.02)',
              marginBottom: '14px',
              transition: 'border-color 0.2s ease'
            }}
            onClick={() => document.getElementById('stl-file-input')?.click()}
          >
            <input 
              id="stl-file-input" 
              type="file" 
              accept=".stl" 
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <UploadCloud size={28} color="var(--brand-cyan)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
              {loading ? 'Analizando malla 3D...' : 'Arrastra tu archivo .STL aquí o haz clic'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Soporta archivos binarios y ASCII de Chitubox, Lychee, Thingiverse o Cults3D
            </div>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-danger)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Lienzo WebGL Three.js */}
          <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <div ref={containerRef} style={{ width: '100%', height: '340px' }} />
            
            {/* Controles sobre el visor */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px' }}>
                🖱️ Rotar: Clic izq | Mover: Clic der | Zoom: Rueda
              </span>

              {/* Selector de color de resina en visor */}
              <div style={{ display: 'flex', gap: '4px', pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '6px' }}>
                {[
                  { color: '#38bdf8', label: 'Cyan' },
                  { color: '#94a3b8', label: 'Gris' },
                  { color: '#1e293b', label: 'Negro' },
                  { color: '#ca8a04', label: 'Ámbar' }
                ].map(c => (
                  <button
                    key={c.color}
                    onClick={() => setColorModelo(c.color)}
                    style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.color, border: colorModelo === c.color ? '2px solid #fff' : 'none', cursor: 'pointer' }}
                    title={`Color ${c.label}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {analysis && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>📁 {analysis.fileName}</span>
              <span>🔺 {analysis.trianglesCount.toLocaleString()} triángulos</span>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: MEDICIÓN, ESCALADO & CONSUMO DE RESINA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Panel de Dimensiones y Escalado */}
          <div className="glass-card" style={{ margin: 0, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Maximize2 size={16} color="var(--brand-cyan)" />
                <span>Dimensiones y Escala del Modelo</span>
              </div>

              {analysis && (
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  onClick={() => {
                    setEscalaPorcentaje(100);
                    setAlturaDeseadaZ(analysis.originalDimensions.z.toString());
                  }}
                  title="Restablecer a tamaño original 100%"
                >
                  <RefreshCw size={11} />
                  <span>100%</span>
                </button>
              )}
            </div>

            {/* Tarjetas de Medidas X, Y, Z */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {/* Eje Z - Altura */}
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase' }}>
                  Z — Altura (↕️)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  {dimensionesEscaladas.z} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>mm</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {analysis ? `Orig: ${analysis.originalDimensions.z}mm` : 'Vertical'}
                </div>
              </div>

              {/* Eje X - Ancho */}
              <div style={{ background: 'rgba(27, 98, 177, 0.1)', border: '1px solid rgba(27, 98, 177, 0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-blue)', textTransform: 'uppercase' }}>
                  X — Ancho (↔️)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  {dimensionesEscaladas.x} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>mm</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {analysis ? `Orig: ${analysis.originalDimensions.x}mm` : 'Horizontal'}
                </div>
              </div>

              {/* Eje Y - Fondo */}
              <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-purple)', textTransform: 'uppercase' }}>
                  Y — Fondo (↗️)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  {dimensionesEscaladas.y} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>mm</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {analysis ? `Orig: ${analysis.originalDimensions.y}mm` : 'Profundidad'}
                </div>
              </div>
            </div>

            {/* Controles de Escala Proporcional */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Ajustar Altura Deseada (Z en mm)
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Ej: 100"
                  value={alturaDeseadaZ}
                  onChange={(e) => handleCambioAlturaZ(e.target.value)}
                  disabled={!analysis}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Porcentaje de Escala ({escalaPorcentaje}%)
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="400" 
                  step="1"
                  value={escalaPorcentaje}
                  onChange={(e) => {
                    const esc = parseFloat(e.target.value);
                    setEscalaPorcentaje(esc);
                    if (analysis) {
                      setAlturaDeseadaZ((analysis.originalDimensions.z * (esc / 100)).toFixed(1));
                    }
                  }}
                  disabled={!analysis}
                  style={{ width: '100%', marginTop: '10px', accentColor: 'var(--brand-cyan)' }}
                />
              </div>
            </div>
          </div>

          {/* Panel de Cálculo de Resina y Costos */}
          <div className="glass-card highlight" style={{ margin: 0, padding: '16px' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scale size={16} color="var(--brand-cyan)" />
              <span>Consumo Estimado de Resina</span>
            </div>

            {/* Selector de Resina y Tipo de Relleno */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Resina de Impresión</label>
                <select 
                  className="form-select"
                  style={{ minHeight: '38px', fontSize: '0.85rem' }}
                  value={resinaSeleccionadaId}
                  onChange={(e) => setResinaSeleccionadaId(e.target.value)}
                >
                  {resinas.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.tipo} {r.color} (${r.costo_gramo?.toFixed(1) || 78.8}/g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Estructura Interna</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    type="button"
                    className={`btn btn-sm ${modoAhuecado === 'solido' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem' }}
                    onClick={() => setModoAhuecado('solido')}
                  >
                    Sólido (100%)
                  </button>
                  <button 
                    type="button"
                    className={`btn btn-sm ${modoAhuecado === 'ahuecado' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem' }}
                    onClick={() => setModoAhuecado('ahuecado')}
                    title="Ahuecado en Slicer con agujeros de drenaje"
                  >
                    Ahuecado
                  </button>
                </div>
              </div>
            </div>

            {modoAhuecado === 'ahuecado' && (
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: '#fde047', marginBottom: '12px' }}>
                ℹ️ Modo Ahuecado: Asume pared de 2mm con drenaje (~35% de resina del volumen sólido). Ahorra hasta un 65% de material.
              </div>
            )}

            {/* Métricas de Peso y Volumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Volumen 3D:</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  {volumenEscaladoCm3} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>cm³</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gramos Figura:</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
                  {estimacionResina.gramosNetos} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>g</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Con Soportes (+25%):</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fde047' }}>
                  {estimacionResina.gramosTotales} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>g</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Costo estimado de resina:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                ${estimacionResina.costoAproxCOP.toLocaleString('es-CO')} COP
              </span>
            </div>

            {/* Botón de Acción Directa al Cotizador */}
            {onApplyToCotizador && (
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                onClick={handleEnviarAlCotizador}
                disabled={!analysis}
              >
                <Sparkles size={16} />
                <span>Aplicar Medidas y Resina al Cotizador</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Enlaces a Herramientas Externas Recomendadas */}
          <div className="glass-card" style={{ margin: 0, padding: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ExternalLink size={14} color="var(--brand-blue)" />
              Otras Herramientas Web Complementarias:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
              <li>
                <a href="https://formlabs.com/blog/resin-3d-printing-cost-calculator/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-cyan)' }}>
                  Formlabs 3D Resin Estimator
                </a> — Calculador paramétrico de resinas industriales.
              </li>
              <li>
                <a href="https://www.viewstl.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-cyan)' }}>
                  ViewSTL.com
                </a> — Visor STL web ligero para inspección rápida de polígonos.
              </li>
              <li>
                <a href="https://chitubox.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-cyan)' }}>
                  Chitubox / Lychee Slicer
                </a> — Recomendados para ahuecado con agujeros de succión exactos.
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
