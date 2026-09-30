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
  ArrowRight, 
  Info, 
  ExternalLink,
  RefreshCw,
  Compass,
  Camera,
  Download,
  Trash2,
  Check
} from 'lucide-react';
import { analyzeSTLFile, STLAnalysisResult } from '../../services/stlService';
import { processAndOptimizeImage, downloadDataUrl } from '../../services/imageService';
import { Resina } from '../../types';

interface STLAnalyzerProps {
  resinas: Resina[];
  onApplyToCotizador?: (data: {
    altoMm: number;
    anchoMm: number;
    profundidadMm: number;
    pesoResinaG: number;
    nombrePieza: string;
    imagenUrl?: string;
  }) => void;
}

export const STLAnalyzer: React.FC<STLAnalyzerProps> = ({ resinas, onApplyToCotizador }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<STLAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Escala y Dimensiones deseadas
  const [escalaPorcentaje, setEscalaPorcentaje] = useState<number>(100);
  const [alturaDeseadaZ, setAlturaDeseadaZ] = useState<string>('');
  const [anchoDeseadoX, setAnchoDeseadoX] = useState<string>('');
  const [fondoDeseadoY, setFondoDeseadoY] = useState<string>('');

  // Rotación del modelo 3D (en grados)
  const [rotacionX, setRotacionX] = useState<number>(0);
  const [rotacionY, setRotacionY] = useState<number>(0);
  const [rotacionZ, setRotacionZ] = useState<number>(0);

  // Configuración de impresión de resina
  const [resinaSeleccionadaId, setResinaSeleccionadaId] = useState<string>(resinas[0]?.id || '');
  const [modoAhuecado, setModoAhuecado] = useState<'solido' | 'ahuecado'>('solido');
  const [porcentajeAhuecado, setPorcentajeAhuecado] = useState<number>(35); // 35% de resina si es ahuecado (65% ahorro)
  const [factorSoportes, setFactorSoportes] = useState<number>(1.25); // 25% extra en soportes y merma

  // Vista 3D
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const reqAnimRef = useRef<number | null>(null);

  // Captura de imagen 3D
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Color de previsualización
  const [colorModelo, setColorModelo] = useState<string>('#38bdf8'); // Cyan

  // Sincronizar selección de resina cuando resinas se carguen desde StorageService
  useEffect(() => {
    if ((!resinaSeleccionadaId || !resinas.some(r => r.id === resinaSeleccionadaId)) && resinas.length > 0) {
      setResinaSeleccionadaId(resinas[0].id);
    }
  }, [resinas, resinaSeleccionadaId]);

  const resinaActual = resinas.find(r => r.id === resinaSeleccionadaId) || resinas[0] || {
    id: 'res-default',
    tipo: 'Resina Standard',
    color: 'Negro',
    densidad_g_cm3: 1.13,
    costo_gramo: 78.76
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
        setSnapshotUrl(null);
        setEscalaPorcentaje(100);
        setRotacionX(0);
        setRotacionY(0);
        setRotacionZ(0);
        setAlturaDeseadaZ(result.originalDimensions.z.toString());
        setAnchoDeseadoX(result.originalDimensions.x.toString());
        setFondoDeseadoY(result.originalDimensions.y.toString());
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

  // Orientación del modelo rotado en 3D
  const orientacionModel = useMemo(() => {
    if (!analysis) return null;

    const geom = analysis.geometry.clone();
    const radX = (rotacionX * Math.PI) / 180;
    const radY = (rotacionY * Math.PI) / 180;
    const radZ = (rotacionZ * Math.PI) / 180;

    if (radX !== 0) geom.rotateX(radX);
    if (radY !== 0) geom.rotateY(radY);
    if (radZ !== 0) geom.rotateZ(radZ);

    geom.computeBoundingBox();
    const bbox = geom.boundingBox || new THREE.Box3();
    const size = new THREE.Vector3();
    bbox.getSize(size);

    return {
      geometry: geom,
      size: {
        x: Number(size.x.toFixed(2)),
        y: Number(size.y.toFixed(2)),
        z: Number(size.z.toFixed(2))
      },
      minY: bbox.min.y
    };
  }, [analysis, rotacionX, rotacionY, rotacionZ]);

  // Dimensiones orientadas y escaladas
  const dimensionesEscaladas = useMemo(() => {
    if (!orientacionModel) return { x: 0, y: 0, z: 0 };
    return {
      x: Number((orientacionModel.size.x * factorEscala).toFixed(2)),
      y: Number((orientacionModel.size.y * factorEscala).toFixed(2)),
      z: Number((orientacionModel.size.z * factorEscala).toFixed(2))
    };
  }, [orientacionModel, factorEscala]);

  // Mantener las 3 dimensiones deseadas sincronizadas al rotar o escalar
  useEffect(() => {
    if (orientacionModel) {
      setAlturaDeseadaZ((orientacionModel.size.z * factorEscala).toFixed(1));
      setAnchoDeseadoX((orientacionModel.size.x * factorEscala).toFixed(1));
      setFondoDeseadoY((orientacionModel.size.y * factorEscala).toFixed(1));
    }
  }, [orientacionModel, factorEscala]);

  // El volumen escala al cubo del factor de escala (V = V0 * s^3)
  const volumenEscaladoCm3 = useMemo(() => {
    if (!analysis) return 0;
    const factorCubico = Math.pow(factorEscala, 3);
    const volBase = (analysis.originalVolumeCm3 && analysis.originalVolumeCm3 > 0)
      ? analysis.originalVolumeCm3 
      : ((analysis.bboxVolumeCm3 && analysis.bboxVolumeCm3 > 0) ? analysis.bboxVolumeCm3 * 0.35 : 0.01);
    return Number((volBase * factorCubico).toFixed(2));
  }, [analysis, factorEscala]);

  // Gramos de resina calculados
  const estimacionResina = useMemo(() => {
    const densidad = resinaActual.densidad_g_cm3 || 1.13;
    const costoGramo = resinaActual.costo_gramo || 78.76;

    // Si es sólido: 100% macizo (1.0). Si es ahuecado: 35% por defecto (65% ahorro)
    const ratioRelleno = modoAhuecado === 'solido' ? 1.0 : (porcentajeAhuecado / 100);
    
    // Gramos netos de la figura (mínimo 0.1g si hay volumen)
    const gramosNetos = volumenEscaladoCm3 > 0 
      ? Number((volumenEscaladoCm3 * densidad * ratioRelleno).toFixed(1))
      : 0;
    
    // Gramos brutos con soportes y merma
    const gramosTotalesConSoportes = Number((gramosNetos * factorSoportes).toFixed(1));
    
    // Costo estimado de la resina en COP
    const costoAproxCOP = Math.round(gramosTotalesConSoportes * costoGramo);

    return {
      gramosNetos,
      gramosTotales: gramosTotalesConSoportes,
      costoAproxCOP
    };
  }, [volumenEscaladoCm3, resinaActual, modoAhuecado, porcentajeAhuecado, factorSoportes]);

  // Ajustar escala proporcional al escribir en cualquiera de los ejes
  const handleCambioAlturaZ = (valStr: string) => {
    setAlturaDeseadaZ(valStr);
    const zNum = parseFloat(valStr);
    if (!isNaN(zNum) && zNum > 0 && orientacionModel && orientacionModel.size.z > 0) {
      const nuevaEscala = (zNum / orientacionModel.size.z) * 100;
      setEscalaPorcentaje(Number(nuevaEscala.toFixed(1)));
    }
  };

  const handleCambioAnchoX = (valStr: string) => {
    setAnchoDeseadoX(valStr);
    const xNum = parseFloat(valStr);
    if (!isNaN(xNum) && xNum > 0 && orientacionModel && orientacionModel.size.x > 0) {
      const nuevaEscala = (xNum / orientacionModel.size.x) * 100;
      setEscalaPorcentaje(Number(nuevaEscala.toFixed(1)));
    }
  };

  const handleCambioFondoY = (valStr: string) => {
    setFondoDeseadoY(valStr);
    const yNum = parseFloat(valStr);
    if (!isNaN(yNum) && yNum > 0 && orientacionModel && orientacionModel.size.y > 0) {
      const nuevaEscala = (yNum / orientacionModel.size.y) * 100;
      setEscalaPorcentaje(Number(nuevaEscala.toFixed(1)));
    }
  };

  // Handlers para rotación en 90° de ejes
  const handleRotarX = (delta: number) => {
    setRotacionX(prev => (prev + delta + 360) % 360);
  };
  const handleRotarY = (delta: number) => {
    setRotacionY(prev => (prev + delta + 360) % 360);
  };
  const handleRotarZ = (delta: number) => {
    setRotacionZ(prev => (prev + delta + 360) % 360);
  };
  const handleResetRotacion = () => {
    setRotacionX(0);
    setRotacionY(0);
    setRotacionZ(0);
  };

  // Inicializar Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth || 400;
    const height = 340;

    // 1. Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d15);
    sceneRef.current = scene;

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(130, 110, 150);
    cameraRef.current = camera;

    // 3. Renderizador
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controles orbitales
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
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

    // 6. Plataforma / Cama de Impresión 3D
    const gridSize = 160;
    const gridDivisions = 16;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x1b62b1, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

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

  // Actualizar el modelo cuando cambia la orientación, escala o color
  useEffect(() => {
    if (!sceneRef.current || !orientacionModel) return;

    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
      meshRef.current = null;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorModelo),
      roughness: 0.25,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(orientacionModel.geometry.clone(), material);
    mesh.scale.set(factorEscala, factorEscala, factorEscala);

    // Apoyar exactamente la base de la figura sobre la cama (y >= 0)
    mesh.position.y = -orientacionModel.minY * factorEscala;

    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    if (controlsRef.current) {
      const currentBox = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      currentBox.getCenter(center);
      controlsRef.current.target.set(0, center.y, 0);
    }
  }, [orientacionModel, factorEscala, colorModelo]);

  const handleTomarCaptura = async (): Promise<string | null> => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;

    setIsCapturing(true);

    try {
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const rawData = rendererRef.current.domElement.toDataURL('image/png');
      const optimized = await processAndOptimizeImage(rawData, 750, 750, 0.9);
      setSnapshotUrl(optimized);
      setTimeout(() => setIsCapturing(false), 250);
      return optimized;
    } catch (e) {
      console.error('Error al capturar 3D:', e);
      setIsCapturing(false);
      return null;
    }
  };

  const handleEnviarAlCotizador = async () => {
    if (!analysis || !orientacionModel || !onApplyToCotizador) return;

    let finalImg = snapshotUrl;
    if (!finalImg) {
      finalImg = await handleTomarCaptura();
    }

    onApplyToCotizador({
      altoMm: dimensionesEscaladas.z,
      anchoMm: dimensionesEscaladas.x,
      profundidadMm: dimensionesEscaladas.y,
      pesoResinaG: estimacionResina.gramosTotales,
      nombrePieza: analysis.fileName.replace(/\.stl$/i, ''),
      imagenUrl: finalImg || undefined
    });
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Box size={22} color="var(--brand-cyan)" />
            Previsualizador 3D STL & Estimador de Resina
          </h2>
          <p className="section-subtitle">
            Carga modelos 3D, rótalos (vertical/horizontal), inspecciona medidas exactas y calcula gramos de resina
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* COLUMNA IZQUIERDA: VISOR 3D & CONTROLES DE ROTACIÓN */}
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
            
            {/* Efecto Flash al Tomar Captura */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: '#ffffff',
                opacity: isCapturing ? 0.75 : 0,
                pointerEvents: 'none',
                transition: 'opacity 0.25s ease-out',
                zIndex: 10
              }} 
            />

            {/* Botón flotante para Tomar Captura 3D */}
            {analysis && (
              <button
                type="button"
                className="btn btn-cyan btn-sm"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  zIndex: 5,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                  fontSize: '0.78rem',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={handleTomarCaptura}
                title="Tomar captura de este ángulo 3D para la cotización"
              >
                <Camera size={14} />
                <span>{snapshotUrl ? 'Recapturar 3D' : '📸 Tomar Captura 3D'}</span>
              </button>
            )}

            {/* Controles flotantes sobre el visor */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px' }}>
                🖱️ Rotar cámara: Clic izq | Paneo: Clic der | Zoom: Rueda
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

          {/* Tarjeta de Previsualización de Captura 3D */}
          {snapshotUrl && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={snapshotUrl} 
                  alt="Captura 3D" 
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(56, 189, 248, 0.4)' }}
                />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color="var(--brand-cyan)" />
                    <span style={{ color: 'var(--brand-cyan)' }}>Captura 3D lista</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Se incluirá automáticamente en la cotización y el PDF oficial
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                  onClick={() => downloadDataUrl(snapshotUrl, `${analysis?.fileName.replace(/\.stl$/i, '') || 'modelo_3d'}_render.png`)}
                  title="Descargar imagen PNG al dispositivo"
                >
                  <Download size={13} />
                  <span>Descargar PNG</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                  onClick={() => setSnapshotUrl(null)}
                  title="Eliminar captura actual"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}

          {/* PANEL DE ROTACIÓN Y ORIENTACIÓN 3D */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCw size={14} color="var(--brand-cyan)" />
                <span>Orientación de la Pieza (Rotar Ejes 3D)</span>
              </div>
              {(rotacionX !== 0 || rotacionY !== 0 || rotacionZ !== 0) && (
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  onClick={handleResetRotacion}
                  title="Restablecer rotación nativa"
                >
                  <RefreshCw size={11} />
                  <span>Reset (0°)</span>
                </button>
              )}
            </div>

            {/* Botones directos de Parar / Acostar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.76rem', padding: '7px 8px', color: rotacionX === 90 ? 'var(--brand-cyan)' : undefined }}
                onClick={() => handleRotarX(90)}
                disabled={!analysis}
                title="Rotar 90° en X: Poner de pie verticalmente"
              >
                <span>↕️ Parar Vertical (+90° X)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.76rem', padding: '7px 8px', color: rotacionX === 270 ? 'var(--brand-cyan)' : undefined }}
                onClick={() => handleRotarX(-90)}
                disabled={!analysis}
                title="Rotar -90° en X: Acostar horizontalmente sobre la cama"
              >
                <span>↔️ Acostar Horizontal (-90° X)</span>
              </button>
            </div>

            {/* Botones complementarios de giro */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '5px' }}
                onClick={() => handleRotarY(90)}
                disabled={!analysis}
                title="Girar 90° lateralmente (frente a perfil)"
              >
                <span>🔄 Girar Y (+90°)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '5px' }}
                onClick={() => handleRotarZ(90)}
                disabled={!analysis}
                title="Rotar 90° en plano Z"
              >
                <span>↪️ Rotar Z (+90°)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '5px' }}
                onClick={() => handleRotarX(180)}
                disabled={!analysis}
                title="Invertir pieza de cabeza (180°)"
              >
                <span>🔃 Invertir (180°)</span>
              </button>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '8px', textAlign: 'center' }}>
              🧭 Ángulos actuales: X: {rotacionX % 360}° | Y: {rotacionY % 360}° | Z: {rotacionZ % 360}°
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
                    if (orientacionModel) {
                      setAlturaDeseadaZ(orientacionModel.size.z.toString());
                    }
                  }}
                  title="Restablecer a tamaño original 100%"
                >
                  <RefreshCw size={11} />
                  <span>100%</span>
                </button>
              )}
            </div>

            {/* Tarjetas de Medidas X, Y, Z Orientadas */}
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
                  {orientacionModel ? `Orientada: ${orientacionModel.size.z}mm` : 'Vertical'}
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
                  {orientacionModel ? `Orientada: ${orientacionModel.size.x}mm` : 'Horizontal'}
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
                  {orientacionModel ? `Orientada: ${orientacionModel.size.y}mm` : 'Profundidad'}
                </div>
              </div>
            </div>

            {/* Notificación de auto-conversión de metros */}
            {analysis?.wasConvertedFromMeters && (
              <div style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.75rem',
                color: 'var(--brand-cyan)',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={16} />
                <span><strong>Unidades normalizadas:</strong> El archivo estaba modelado en metros y fue adaptado a milímetros (mm).</span>
              </div>
            )}

            {/* Controles de Escala Proporcional en X, Y, Z */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--brand-cyan)', fontWeight: 800 }}>Z</span> (Alto mm)
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Alto Z"
                  value={alturaDeseadaZ}
                  onChange={(e) => handleCambioAlturaZ(e.target.value)}
                  disabled={!analysis}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--brand-blue)', fontWeight: 800 }}>X</span> (Ancho mm)
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Ancho X"
                  value={anchoDeseadoX}
                  onChange={(e) => handleCambioAnchoX(e.target.value)}
                  disabled={!analysis}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--brand-purple)', fontWeight: 800 }}>Y</span> (Fondo mm)
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Fondo Y"
                  value={fondoDeseadoY}
                  onChange={(e) => handleCambioFondoY(e.target.value)}
                  disabled={!analysis}
                />
              </div>
            </div>

            {/* Slider de porcentaje y atajos de escala */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Factor de Escala: <strong>{escalaPorcentaje}%</strong>
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    onClick={() => setEscalaPorcentaje(prev => Number((prev * 10).toFixed(1)))}
                    disabled={!analysis}
                    title="Multiplicar escala por 10 si el modelo estaba en centímetros"
                  >
                    ×10 (cm→mm)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    onClick={() => setEscalaPorcentaje(prev => Number(Math.max(1, prev / 10).toFixed(1)))}
                    disabled={!analysis}
                    title="Dividir escala por 10"
                  >
                    ÷10
                  </button>
                </div>
              </div>
              <input 
                type="range" 
                min="5" 
                max="400" 
                step="1"
                value={Math.min(400, Math.max(5, escalaPorcentaje))}
                onChange={(e) => setEscalaPorcentaje(parseFloat(e.target.value))}
                disabled={!analysis}
                style={{ width: '100%', accentColor: 'var(--brand-cyan)' }}
              />
            </div>
          </div>

          {/* Panel de Cálculo de Resina y Costos */}
          <div className="glass-card highlight" style={{ margin: 0, padding: '16px' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scale size={16} color="var(--brand-cyan)" />
              <span>Consumo Estimado de Resina</span>
            </div>

            {/* Selector de Resina y Estructura */}
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
                    style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 700 }}
                    onClick={() => setModoAhuecado('solido')}
                  >
                    🧱 Sólido (100%)
                  </button>
                  <button 
                    type="button"
                    className={`btn btn-sm ${modoAhuecado === 'ahuecado' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 700 }}
                    onClick={() => setModoAhuecado('ahuecado')}
                    title="Ahuecado en Slicer con agujeros de drenaje"
                  >
                    🏺 Ahuecado
                  </button>
                </div>
              </div>
            </div>

            {/* Mensajes informativos de modo */}
            {modoAhuecado === 'solido' && (
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--brand-cyan)', marginBottom: '12px' }}>
                🧱 <strong>Modo Sólido:</strong> La pieza se imprimirá 100% maciza de resina.
              </div>
            )}

            {modoAhuecado === 'ahuecado' && (
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: '#fde047', marginBottom: '12px' }}>
                🏺 <strong>Modo Ahuecado:</strong> Asume pared de ~2mm con drenaje (~35% de resina). Ahorra hasta 65% de material frente al sólido.
              </div>
            )}

            {analysis?.isVolumeEstimated && (
              <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.35)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.74rem', color: '#fde047', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} />
                <span>Malla con caras abiertas o no herméticas: Volumen acotado al 35% de la caja envolvente para proteger el cálculo.</span>
              </div>
            )}

            {/* Métricas de Peso y Volumen Calculadas */}
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
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.92rem' }}
                onClick={handleEnviarAlCotizador}
                disabled={!analysis}
              >
                <Sparkles size={16} />
                <span>{snapshotUrl ? '✓ Aplicar Medidas y Captura 3D al Cotizador' : 'Aplicar Medidas y Captura 3D al Cotizador'}</span>
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
