import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Camera,
  Download,
  Trash2,
  Check,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  Eye,
  EyeOff,
  HelpCircle,
  Search,
  Layers,
  Flame,
  Link2,
  Printer
} from 'lucide-react';
import { 
  analyzeSTLFile, 
  STLAnalysisResult, 
  repairMeshGeometry, 
  exportGeometryToSTL,
  computeOrientedMetrics,
  buildOverhangColorAttribute
} from '../../services/stlService';
import { processAndOptimizeImage, downloadDataUrl } from '../../services/imageService';
import { getQuickSearchUrls, detect3DPlatform, formatExternalUrl } from '../../services/platformUtils';
import { Resina, Filamento, Maquina, TecnologiaFabricacion } from '../../types';

interface STLAnalyzerProps {
  resinas: Resina[];
  filamentos?: Filamento[];
  maquinas?: Maquina[];
  onApplyToCotizador?: (data: {
    altoMm: number;
    anchoMm: number;
    profundidadMm: number;
    pesoResinaG: number;
    pesoFilamentoG?: number;
    tecnologia?: TecnologiaFabricacion;
    resinaId?: string;
    filamentoId?: string;
    nombrePieza: string;
    imagenUrl?: string;
    tipoEstructura?: 'solido' | 'ahuecado';
    porcentajeRelleno?: number;
    enlacesCompra?: { titulo: string; url: string; costo_estimado?: number }[];
  }) => void;
}

interface PrinterBedPreset {
  id: string;
  nombre: string;
  tecnologia: TecnologiaFabricacion;
  widthX: number;  // mm
  depthY: number;  // mm
  heightZ: number; // mm
}

const DEFAULT_BED_PRESETS: PrinterBedPreset[] = [
  {
    id: 'bed-mono4',
    nombre: 'Anycubic Photon Mono 4 (SLA Resina)',
    tecnologia: 'SLA_RESINA',
    widthX: 153,
    depthY: 87,
    heightZ: 165
  },
  {
    id: 'bed-bambu-p2s',
    nombre: 'Bambu Lab P2S / P1S (FDM Filamento)',
    tecnologia: 'FDM_FILAMENTO',
    widthX: 256,
    depthY: 256,
    heightZ: 256
  },
  {
    id: 'bed-large-300',
    nombre: 'Volumen Gran Formato (300×300×300 mm)',
    tecnologia: 'FDM_FILAMENTO',
    widthX: 300,
    depthY: 300,
    heightZ: 300
  }
];

export const STLAnalyzer: React.FC<STLAnalyzerProps> = ({
  resinas,
  filamentos = [],
  onApplyToCotizador
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<STLAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Buscador Multi-Plataforma de Modelos 3D en Internet
  const [terminoBusqueda3D, setTerminoBusqueda3D] = useState<string>('');
  const [urlReferenciaModelo, setUrlReferenciaModelo] = useState<string>('');
  const [costoLicenciaSTL, setCostoLicenciaSTL] = useState<number>(0);

  // Escala y Dimensiones deseadas
  const [escalaPorcentaje, setEscalaPorcentaje] = useState<number>(100);
  const [alturaDeseadaZ, setAlturaDeseadaZ] = useState<string>('');
  const [anchoDeseadoX, setAnchoDeseadoX] = useState<string>('');
  const [fondoDeseadoY, setFondoDeseadoY] = useState<string>('');

  // Rotación del modelo 3D (en grados)
  const [rotacionX, setRotacionX] = useState<number>(0);
  const [rotacionY, setRotacionY] = useState<number>(0);
  const [rotacionZ, setRotacionZ] = useState<number>(0);

  // Tecnología y Cama de Impresión Simulada
  const [tecnologiaSeleccionada, setTecnologiaSeleccionada] = useState<TecnologiaFabricacion>('SLA_RESINA');
  const [bedPresetId, setBedPresetId] = useState<string>('bed-mono4');

  // Configuración de impresión SLA Resina
  const [resinaSeleccionadaId, setResinaSeleccionadaId] = useState<string>(resinas[0]?.id || '');
  const [modoAhuecado, setModoAhuecado] = useState<'solido' | 'ahuecado'>('solido');
  const [porcentajeAhuecado, setPorcentajeAhuecado] = useState<number>(35); // 35% de resina si es ahuecado (65% ahorro)
  const [factorSoportes, setFactorSoportes] = useState<number>(1.25); // 25% extra en soportes y merma

  // Configuración de impresión FDM Filamento
  const [filamentoSeleccionadoId, setFilamentoSeleccionadoId] = useState<string>(filamentos[0]?.id || '');
  const [infillFdmPorcentaje, setInfillFdmPorcentaje] = useState<number>(15); // 15% relleno estándar Gyroid/Grid
  const [grosorParedFdmMm, setGrosorParedFdmMm] = useState<number>(1.2); // 3 perímetros de 0.4mm = 1.2mm
  const [factorSoportesFdm, setFactorSoportesFdm] = useState<number>(1.10); // 10% extra en soportes FDM

  // Herramientas de Slicer en Vivo (Rayos X / Corte Z y Voladizos > 45°)
  const [corteCapasZPorcentaje, setCorteCapasZPorcentaje] = useState<number>(100);
  const [mostrarMapaVoladizos, setMostrarMapaVoladizos] = useState<boolean>(false);

  // Vista 3D WebGL (Renderizado bajo demanda / On-Demand Rendering)
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const bedGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const reqAnimRef = useRef<number | null>(null);
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 5000));

  // Captura de imagen 3D
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Salud de Malla y Reparación STL
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const [mostrarAristasAbiertas, setMostrarAristasAbiertas] = useState<boolean>(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairResult, setRepairResult] = useState<{
    weldedVertices: number;
    healedHoles: number;
    initialOpen: number;
    finalOpen: number;
  } | null>(null);
  const [mostrarGuiaReparacion, setMostrarGuiaReparacion] = useState<boolean>(false);

  // Color de previsualización
  const [colorModelo, setColorModelo] = useState<string>('#38bdf8'); // Cyan

  // Sincronizar selección de resina y filamento
  useEffect(() => {
    if ((!resinaSeleccionadaId || !resinas.some(r => r.id === resinaSeleccionadaId)) && resinas.length > 0) {
      setResinaSeleccionadaId(resinas[0].id);
    }
  }, [resinas, resinaSeleccionadaId]);

  useEffect(() => {
    if ((!filamentoSeleccionadoId || !filamentos.some(f => f.id === filamentoSeleccionadoId)) && filamentos.length > 0) {
      setFilamentoSeleccionadoId(filamentos[0].id);
    }
  }, [filamentos, filamentoSeleccionadoId]);

  const resinaActual = resinas.find(r => r.id === resinaSeleccionadaId) || resinas[0] || {
    id: 'res-default',
    tipo: 'Resina Standard',
    color: 'Gris',
    densidad_g_cm3: 1.13,
    costo_gramo: 78.76
  };

  const filamentoActual = filamentos.find(f => f.id === filamentoSeleccionadoId) || filamentos[0] || {
    id: 'fil-default',
    marca: 'Bambu Lab / eSUN',
    tipo: 'PLA+' as const,
    color: 'Gris',
    densidad_g_cm3: 1.24,
    peso_carrete_g: 1000,
    costo_carrete: 85000,
    costo_gramo: 85,
    stock_gramos_disponibles: 1000
  };

  const bedPresetActual = useMemo(() => {
    return DEFAULT_BED_PRESETS.find(b => b.id === bedPresetId) || DEFAULT_BED_PRESETS[0];
  }, [bedPresetId]);

  // Cambiar cama automáticamente al conmutar tecnología
  const handleCambiarTecnologia = (tec: TecnologiaFabricacion) => {
    setTecnologiaSeleccionada(tec);
    if (tec === 'FDM_FILAMENTO') {
      setBedPresetId('bed-bambu-p2s');
    } else {
      setBedPresetId('bed-mono4');
    }
  };

  // Función de renderizado bajo demanda (0% uso de GPU cuando la escena está quieta)
  const requestRender = useCallback(() => {
    if (reqAnimRef.current !== null) return;

    const step = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        reqAnimRef.current = null;
        return;
      }
      const needsAnotherFrame = controlsRef.current ? controlsRef.current.update() : false;
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      if (needsAnotherFrame) {
        reqAnimRef.current = requestAnimationFrame(step);
      } else {
        reqAnimRef.current = null;
      }
    };

    reqAnimRef.current = requestAnimationFrame(step);
  }, []);

  // Manejo de archivo subido
  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setError('Por favor selecciona un archivo con extensión .stl');
      return;
    }

    setError(null);
    setLoading(true);
    setRepairResult(null);
    setMostrarAristasAbiertas(false);
    setMostrarMapaVoladizos(false);
    setCorteCapasZPorcentaje(100);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const result = analyzeSTLFile(buffer, file.name);
        setAnalysis(result);
        setSnapshotUrl(null);
        setRepairResult(null);
        setMostrarAristasAbiertas(result.meshHealth.openEdgesCount > 0);
        setEscalaPorcentaje(100);
        setRotacionX(0);
        setRotacionY(0);
        setRotacionZ(0);
        setAlturaDeseadaZ(result.originalDimensions.z.toString());
        setAnchoDeseadoX(result.originalDimensions.x.toString());
        setFondoDeseadoY(result.originalDimensions.y.toString());
        if (!terminoBusqueda3D) {
          setTerminoBusqueda3D(file.name.replace(/\.stl$/i, '').replace(/[_-]+/g, ' '));
        }
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

  // Cálculo ligero de orientación (Caja envolvente + % Voladizos sin clonar BufferGeometry)
  const orientacionMetrics = useMemo(() => {
    if (!analysis) return null;
    return computeOrientedMetrics(analysis.geometry, rotacionX, rotacionY, rotacionZ);
  }, [analysis, rotacionX, rotacionY, rotacionZ]);

  // Dimensiones orientadas y escaladas
  const dimensionesEscaladas = useMemo(() => {
    if (!orientacionMetrics) return { x: 0, y: 0, z: 0 };
    return {
      x: Number((orientacionMetrics.size.x * factorEscala).toFixed(2)),
      y: Number((orientacionMetrics.size.y * factorEscala).toFixed(2)),
      z: Number((orientacionMetrics.size.z * factorEscala).toFixed(2))
    };
  }, [orientacionMetrics, factorEscala]);

  // Verificación en vivo de si la pieza cabe en la cama seleccionada
  const validacionCama = useMemo(() => {
    if (!analysis) {
      return { cabe: true, excedeX: false, excedeY: false, excedeZ: false };
    }
    // Comparamos huella horizontal (permite giro de 90° en cama si cabe en la otra orientación horizontal)
    const cabeHorizontalDirecto = dimensionesEscaladas.x <= bedPresetActual.widthX && dimensionesEscaladas.y <= bedPresetActual.depthY;
    const cabeHorizontalRotado = dimensionesEscaladas.y <= bedPresetActual.widthX && dimensionesEscaladas.x <= bedPresetActual.depthY;
    const cabeHorizontal = cabeHorizontalDirecto || cabeHorizontalRotado;
    const excedeX = !cabeHorizontal && dimensionesEscaladas.x > bedPresetActual.widthX;
    const excedeY = !cabeHorizontal && dimensionesEscaladas.y > bedPresetActual.depthY;
    const excedeZ = dimensionesEscaladas.z > bedPresetActual.heightZ;

    return {
      cabe: cabeHorizontal && !excedeZ,
      excedeX,
      excedeY,
      excedeZ
    };
  }, [analysis, dimensionesEscaladas, bedPresetActual]);

  // Mantener las 3 dimensiones deseadas sincronizadas al rotar o escalar
  useEffect(() => {
    if (orientacionMetrics) {
      setAlturaDeseadaZ((orientacionMetrics.size.z * factorEscala).toFixed(1));
      setAnchoDeseadoX((orientacionMetrics.size.x * factorEscala).toFixed(1));
      setFondoDeseadoY((orientacionMetrics.size.y * factorEscala).toFixed(1));
    }
  }, [orientacionMetrics, factorEscala]);

  // El volumen escala al cubo del factor de escala (V = V0 * s^3) y el área al cuadrado (A = A0 * s^2)
  const volumenEscaladoCm3 = useMemo(() => {
    if (!analysis) return 0;
    const factorCubico = Math.pow(factorEscala, 3);
    const volBase = (analysis.originalVolumeCm3 && analysis.originalVolumeCm3 > 0)
      ? analysis.originalVolumeCm3 
      : ((analysis.bboxVolumeCm3 && analysis.bboxVolumeCm3 > 0) ? analysis.bboxVolumeCm3 * 0.70 : 0.01);
    return Number((volBase * factorCubico).toFixed(2));
  }, [analysis, factorEscala]);

  const areaSuperficialEscaladaCm2 = useMemo(() => {
    if (!analysis) return 0;
    const factorCuadrado = Math.pow(factorEscala, 2);
    return Number(((analysis.surfaceAreaCm2 || 0) * factorCuadrado).toFixed(2));
  }, [analysis, factorEscala]);

  // Gramos de Resina SLA calculados
  const estimacionResina = useMemo(() => {
    const densidad = resinaActual.densidad_g_cm3 || 1.13;
    const costoGramo = resinaActual.costo_gramo || 78.76;

    const ratioRelleno = modoAhuecado === 'solido' ? 1.0 : (porcentajeAhuecado / 100);
    const gramosNetos = volumenEscaladoCm3 > 0 
      ? Number((volumenEscaladoCm3 * densidad * ratioRelleno).toFixed(1))
      : 0;
    const gramosTotalesConSoportes = Number((gramosNetos * factorSoportes).toFixed(1));
    const costoAproxCOP = Math.round(gramosTotalesConSoportes * costoGramo);

    return {
      gramosNetos,
      gramosTotales: gramosTotalesConSoportes,
      costoAproxCOP
    };
  }, [volumenEscaladoCm3, resinaActual, modoAhuecado, porcentajeAhuecado, factorSoportes]);

  // Gramos de Filamento FDM calculados (Perímetros/Paredes + Relleno Infill + Soportes)
  const estimacionFilamento = useMemo(() => {
    const densidad = filamentoActual.densidad_g_cm3 || 1.24;
    const costoGramo = filamentoActual.costo_gramo || 85;
    if (volumenEscaladoCm3 <= 0) {
      return { gramosNetos: 0, gramosTotales: 0, costoAproxCOP: 0 };
    }

    // Volumen de las paredes exteriores (área en cm² * grosor en cm), acotado a máximo el 85% del volumen total
    const grosorParedCm = grosorParedFdmMm / 10;
    const volParedesCm3 = Math.min(volumenEscaladoCm3 * 0.85, areaSuperficialEscaladaCm2 * grosorParedCm);
    const volInteriorRestanteCm3 = Math.max(0, volumenEscaladoCm3 - volParedesCm3);
    const volInfillCm3 = volInteriorRestanteCm3 * (infillFdmPorcentaje / 100);

    const volEfectivoFdmCm3 = volParedesCm3 + volInfillCm3;
    const gramosNetos = Number((volEfectivoFdmCm3 * densidad).toFixed(1));
    const gramosTotales = Number((gramosNetos * factorSoportesFdm).toFixed(1));
    const costoAproxCOP = Math.round(gramosTotales * costoGramo);

    return {
      gramosNetos,
      gramosTotales,
      costoAproxCOP
    };
  }, [volumenEscaladoCm3, areaSuperficialEscaladaCm2, filamentoActual, infillFdmPorcentaje, grosorParedFdmMm, factorSoportesFdm]);

  // Ajustar escala proporcional al escribir en cualquiera de los ejes
  const handleCambioAlturaZ = (valStr: string) => {
    setAlturaDeseadaZ(valStr);
    const zNum = parseFloat(valStr);
    if (!isNaN(zNum) && zNum > 0 && orientacionMetrics && orientacionMetrics.size.z > 0) {
      const nuevaEscala = (zNum / orientacionMetrics.size.z) * 100;
      setEscalaPorcentaje(Number(nuevaEscala.toFixed(1)));
    }
  };

  const handleCambioAnchoX = (valStr: string) => {
    setAnchoDeseadoX(valStr);
    const xNum = parseFloat(valStr);
    if (!isNaN(xNum) && xNum > 0 && orientacionMetrics && orientacionMetrics.size.x > 0) {
      const nuevaEscala = (xNum / orientacionMetrics.size.x) * 100;
      setEscalaPorcentaje(Number(nuevaEscala.toFixed(1)));
    }
  };

  const handleCambioFondoY = (valStr: string) => {
    setFondoDeseadoY(valStr);
    const yNum = parseFloat(valStr);
    if (!isNaN(yNum) && yNum > 0 && orientacionMetrics && orientacionMetrics.size.y > 0) {
      const nuevaEscala = (yNum / orientacionMetrics.size.y) * 100;
      setEscalaPorcentaje(Number(nuevaEscala.toFixed(1)));
    }
  };

  // Handlers para rotación en 90° de ejes
  const handleRotarX = (delta: number) => setRotacionX(prev => (prev + delta + 360) % 360);
  const handleRotarY = (delta: number) => setRotacionY(prev => (prev + delta + 360) % 360);
  const handleRotarZ = (delta: number) => setRotacionZ(prev => (prev + delta + 360) % 360);
  const handleResetRotacion = () => {
    setRotacionX(0);
    setRotacionY(0);
    setRotacionZ(0);
  };

  // Inicializar Three.js con Renderizado Bajo Demanda (On-Demand Rendering)
  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth || 400;
    const height = 360;

    // 1. Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d15);
    sceneRef.current = scene;

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
    camera.position.set(170, 140, 190);
    cameraRef.current = camera;

    // 3. Renderizador con soporte de Clipping Planes (Corte Z)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controles orbitales conectados a requestRender
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.addEventListener('change', requestRender);
    controlsRef.current = controls;

    // 5. Luces de Estudio
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(120, 220, 160);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.55);
    dirLight2.position.set(-120, -60, -120);
    scene.add(dirLight2);

    // 6. Grupo para la Cama y Volumen de Impresión
    const bedGroup = new THREE.Group();
    scene.add(bedGroup);
    bedGroupRef.current = bedGroup;

    requestRender();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, height);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', requestRender);
      if (reqAnimRef.current !== null) {
        cancelAnimationFrame(reqAnimRef.current);
        reqAnimRef.current = null;
      }
      controls.dispose();
      renderer.dispose();
    };
  }, [requestRender]);

  // Actualizar visualmente la Cama de Impresión y el Volumen Wireframe cuando cambia la máquina o el estado de encaje
  useEffect(() => {
    if (!bedGroupRef.current) return;
    const group = bedGroupRef.current;

    while (group.children.length > 0) {
      const child = group.children[0] as any;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m: THREE.Material) => m.dispose());
        else child.material.dispose();
      }
    }

    const { widthX, depthY, heightZ } = bedPresetActual;
    const maxGrid = Math.max(widthX, depthY);
    const divisions = Math.max(10, Math.round(maxGrid / 10));

    // Placa base con las dimensiones reales de la máquina (X = widthX, Z de Three.js = depthY)
    const plateGeo = new THREE.BoxGeometry(widthX, 2, depthY);
    const plateMat = new THREE.MeshStandardMaterial({
      color: validacionCama.cabe ? 0x0f172a : 0x3b0d15,
      roughness: 0.85,
      metalness: 0.1
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -1;
    group.add(plate);

    // Rejilla de referencia milimétrica
    const gridHelper = new THREE.GridHelper(
      maxGrid,
      divisions,
      validacionCama.cabe ? 0x1b62b1 : 0xef4444,
      0x1e293b
    );
    gridHelper.position.y = 0.05;
    group.add(gridHelper);

    // Caja envolvente Wireframe del Volumen Máximo de Impresión (X, Altura=heightZ, Fondo=depthY)
    const volumeBoxGeo = new THREE.BoxGeometry(widthX, heightZ, depthY);
    const edgesGeo = new THREE.EdgesGeometry(volumeBoxGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: validacionCama.cabe ? 0x38bdf8 : 0xef4444,
      transparent: true,
      opacity: validacionCama.cabe ? 0.35 : 0.85
    });
    const volumeWireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    volumeWireframe.position.y = heightZ / 2;
    group.add(volumeWireframe);
    volumeBoxGeo.dispose();

    requestRender();
  }, [bedPresetActual, validacionCama.cabe, requestRender]);

  // Actualizar el modelo 3D usando rotación en matriz GPU y plano de corte Z
  useEffect(() => {
    if (!sceneRef.current || !analysis || !orientacionMetrics) return;

    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      if (meshRef.current.geometry !== analysis.geometry) {
        meshRef.current.geometry.dispose();
      }
      (meshRef.current.material as THREE.Material).dispose();
      meshRef.current = null;
    }

    if (linesRef.current) {
      sceneRef.current.remove(linesRef.current);
      linesRef.current.geometry.dispose();
      (linesRef.current.material as THREE.Material).dispose();
      linesRef.current = null;
    }

    // Calcular altura de corte en eje Y de la escena (que representa la altura sobre la cama)
    const modelHeightInScene = Math.max(1, (orientacionMetrics.maxY - orientacionMetrics.minY) * factorEscala);
    const clipHeight = corteCapasZPorcentaje >= 100
      ? modelHeightInScene + 1000
      : (modelHeightInScene * (corteCapasZPorcentaje / 100));
    clippingPlaneRef.current.constant = clipHeight;

    // Si está activo el Mapa de Voladizos (> 45°), generar geometría coloreada por ángulo; de lo contrario usar la geometría original directo en GPU
    const activeGeometry = mostrarMapaVoladizos
      ? buildOverhangColorAttribute(analysis.geometry, rotacionX, rotacionY, rotacionZ, colorModelo)
      : analysis.geometry;

    const material = new THREE.MeshStandardMaterial({
      color: mostrarMapaVoladizos ? new THREE.Color(0xffffff) : new THREE.Color(colorModelo),
      vertexColors: mostrarMapaVoladizos,
      roughness: 0.28,
      metalness: 0.15,
      side: THREE.DoubleSide,
      clippingPlanes: corteCapasZPorcentaje < 100 ? [clippingPlaneRef.current] : []
    });

    const mesh = new THREE.Mesh(activeGeometry, material);
    const radX = (rotacionX * Math.PI) / 180;
    const radY = (rotacionY * Math.PI) / 180;
    const radZ = (rotacionZ * Math.PI) / 180;

    mesh.rotation.set(radX, radY, radZ, 'XYZ');
    mesh.scale.set(factorEscala, factorEscala, factorEscala);
    // Apoyar exactamente la base de la figura sobre la cama (y = 0)
    mesh.position.y = -orientacionMetrics.minY * factorEscala;

    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    // Si está activada la visualización de aristas/caras abiertas, dibujarlas en rojo fluorescente con rotación GPU
    if (mostrarAristasAbiertas && analysis.meshHealth?.openEdgePositions && analysis.meshHealth.openEdgePositions.length > 0) {
      const lineGeom = new THREE.BufferGeometry();
      const posArray = new Float32Array(analysis.meshHealth.openEdgePositions);
      lineGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      const lineMat = new THREE.LineBasicMaterial({
        color: 0xff0044,
        linewidth: 2,
        depthTest: false,
        clippingPlanes: corteCapasZPorcentaje < 100 ? [clippingPlaneRef.current] : []
      });

      const lines = new THREE.LineSegments(lineGeom, lineMat);
      lines.rotation.set(radX, radY, radZ, 'XYZ');
      lines.scale.set(factorEscala, factorEscala, factorEscala);
      lines.position.y = -orientacionMetrics.minY * factorEscala;
      lines.renderOrder = 999;
      sceneRef.current.add(lines);
      linesRef.current = lines;
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(0, modelHeightInScene * 0.45, 0);
    }

    requestRender();
  }, [
    analysis,
    orientacionMetrics,
    factorEscala,
    colorModelo,
    mostrarAristasAbiertas,
    mostrarMapaVoladizos,
    corteCapasZPorcentaje,
    rotacionX,
    rotacionY,
    rotacionZ,
    requestRender
  ]);

  // Handler de Reparación Automática de Malla
  const handleRepararMalla = () => {
    if (!analysis) return;
    setIsRepairing(true);

    setTimeout(() => {
      try {
        const initialOpen = analysis.meshHealth.openEdgesCount;
        const res = repairMeshGeometry(analysis.geometry);

        setAnalysis(prev => {
          if (!prev) return null;
          return {
            ...prev,
            geometry: res.repairedGeometry,
            trianglesCount: res.report.totalTriangles,
            meshHealth: res.report
          };
        });

        setRepairResult({
          weldedVertices: res.weldedVerticesCount,
          healedHoles: res.healedHolesCount,
          initialOpen,
          finalOpen: res.report.openEdgesCount
        });

        setMostrarAristasAbiertas(res.report.openEdgesCount > 0);
      } catch (err: any) {
        console.error('Error al reparar malla:', err);
      } finally {
        setIsRepairing(false);
      }
    }, 80);
  };

  const handleDescargarSTLReparado = () => {
    if (!analysis) return;
    exportGeometryToSTL(analysis.geometry, analysis.fileName);
  };

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
    if (!analysis || !orientacionMetrics || !onApplyToCotizador) return;

    let finalImg = snapshotUrl;
    if (!finalImg) {
      finalImg = await handleTomarCaptura();
    }

    const nombreBase = analysis.fileName.replace(/\.stl$/i, '');
    const enlacesAdjuntos = urlReferenciaModelo.trim()
      ? [{
          titulo: `${detect3DPlatform(urlReferenciaModelo).name} — ${nombreBase}`,
          url: formatExternalUrl(urlReferenciaModelo),
          costo_estimado: costoLicenciaSTL > 0 ? costoLicenciaSTL : 0
        }]
      : undefined;

    if (tecnologiaSeleccionada === 'FDM_FILAMENTO') {
      onApplyToCotizador({
        altoMm: dimensionesEscaladas.z,
        anchoMm: dimensionesEscaladas.x,
        profundidadMm: dimensionesEscaladas.y,
        pesoResinaG: 0,
        pesoFilamentoG: estimacionFilamento.gramosTotales,
        tecnologia: 'FDM_FILAMENTO',
        filamentoId: filamentoSeleccionadoId,
        nombrePieza: nombreBase,
        imagenUrl: finalImg || undefined,
        tipoEstructura: 'ahuecado',
        porcentajeRelleno: infillFdmPorcentaje,
        enlacesCompra: enlacesAdjuntos
      });
    } else {
      onApplyToCotizador({
        altoMm: dimensionesEscaladas.z,
        anchoMm: dimensionesEscaladas.x,
        profundidadMm: dimensionesEscaladas.y,
        pesoResinaG: estimacionResina.gramosTotales,
        tecnologia: 'SLA_RESINA',
        resinaId: resinaSeleccionadaId,
        nombrePieza: nombreBase,
        imagenUrl: finalImg || undefined,
        tipoEstructura: modoAhuecado,
        porcentajeRelleno: modoAhuecado === 'ahuecado' ? porcentajeAhuecado : 100,
        enlacesCompra: enlacesAdjuntos
      });
    }
  };

  const quickSearchPlatforms = useMemo(() => {
    return getQuickSearchUrls(terminoBusqueda3D || 'figura coleccionable 3d');
  }, [terminoBusqueda3D]);

  const infoPlataformaDetectada = useMemo(() => {
    return urlReferenciaModelo.trim() ? detect3DPlatform(urlReferenciaModelo) : null;
  }, [urlReferenciaModelo]);

  return (
    <div>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Box size={22} color="var(--brand-cyan)" />
            Estudio 3D STL Pro — Visor Slicer, Simulador de Cama & Buscador Mundial
          </h2>
          <p className="section-subtitle">
            Busca modelos en los repositorios 3D globales, inspecciona capas por Rayos X, mide voladizos y envía el cálculo exacto en Resina SLA o Filamento FDM al Cotizador
          </p>
        </div>
      </div>

      {/* HUB DE BÚSQUEDA MULTI-PLATAFORMA DE MODELOS 3D EN INTERNET */}
      <div className="glass-card" style={{ marginBottom: '16px', padding: '16px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>
            <Search size={17} color="var(--brand-cyan)" />
            <span>Buscador Directo en Repositorios 3D Mundiales</span>
          </div>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            Escribe el personaje o pieza y haz clic en cualquier plataforma para abrir los modelos listos para descargar
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Goku SSJ, Batman Bust, Soporte Celular, Llavero..."
              value={terminoBusqueda3D}
              onChange={(e) => setTerminoBusqueda3D(e.target.value)}
              style={{ paddingLeft: '12px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="url"
                className="form-input"
                placeholder="🔗 Pega aquí el link del modelo encontrado (opcional para adjuntar a la cotización)"
                value={urlReferenciaModelo}
                onChange={(e) => setUrlReferenciaModelo(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
            </div>
            {infoPlataformaDetectada && (
              <span style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                background: infoPlataformaDetectada.bg,
                color: infoPlataformaDetectada.color,
                border: `1px solid ${infoPlataformaDetectada.borderColor}`,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Link2 size={13} />
                {infoPlataformaDetectada.icon} {infoPlataformaDetectada.name}
              </span>
            )}
          </div>
        </div>

        {/* Botones de Plataformas 3D */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {quickSearchPlatforms.map((plat) => (
            <a
              key={plat.name}
              href={plat.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.76rem',
                padding: '6px 12px',
                borderColor: `${plat.color}55`,
                background: `${plat.color}15`,
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
              title={`Buscar "${terminoBusqueda3D || 'figura 3d'}" en ${plat.name}`}
            >
              <span>{plat.icon}</span>
              <span style={{ fontWeight: 700 }}>{plat.name}</span>
              <ExternalLink size={12} color={plat.color} />
            </a>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        
        {/* COLUMNA IZQUIERDA: VISOR 3D, SIMULADOR DE CAMA & HERRAMIENTAS DE SLICER */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Zona de Drop / Carga de Archivo */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.02)',
              marginBottom: '12px',
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
            <UploadCloud size={26} color="var(--brand-cyan)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>
              {loading ? 'Analizando malla 3D...' : 'Arrastra tu archivo .STL aquí o haz clic para cargarlo'}
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Soporta archivos binarios y ASCII de MakerWorld, Cults3D, Printables, Thingiverse, Chitubox o Bambu Studio
            </div>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-danger)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Barra Superior del Visor: Selector de Cama de Impresión Real del Taller */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '10px',
            padding: '8px 10px',
            background: 'rgba(0,0,0,0.28)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '210px' }}>
              <Printer size={15} color="var(--brand-cyan)" />
              <select
                className="form-select"
                style={{ minHeight: '32px', padding: '4px 8px', fontSize: '0.78rem' }}
                value={bedPresetId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setBedPresetId(newId);
                  const found = DEFAULT_BED_PRESETS.find(b => b.id === newId);
                  if (found) setTecnologiaSeleccionada(found.tecnologia);
                }}
              >
                {DEFAULT_BED_PRESETS.map(bed => (
                  <option key={bed.id} value={bed.id}>
                    {bed.nombre} — {bed.widthX}×{bed.depthY}×{bed.heightZ} mm
                  </option>
                ))}
              </select>
            </div>

            {analysis && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '9999px',
                background: validacionCama.cabe ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.22)',
                color: validacionCama.cabe ? '#34d399' : '#fca5a5',
                border: `1px solid ${validacionCama.cabe ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.5)'}`
              }}>
                {validacionCama.cabe
                  ? `✅ Cabe en ${bedPresetActual.nombre.split('(')[0].trim()}`
                  : `⚠️ Excede cama (${bedPresetActual.widthX}×${bedPresetActual.depthY}×${bedPresetActual.heightZ}mm)`}
              </span>
            )}
          </div>

          {/* Lienzo WebGL Three.js */}
          <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <div ref={containerRef} style={{ width: '100%', height: '360px' }} />
            
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

            {/* Botones flotantes superiores en el visor */}
            {analysis && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                right: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 5
              }}>
                <button
                  type="button"
                  className={`btn btn-sm ${mostrarMapaVoladizos ? 'btn-danger' : 'btn-secondary'}`}
                  style={{
                    pointerEvents: 'auto',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                    fontSize: '0.74rem',
                    padding: '5px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: mostrarMapaVoladizos ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.85)'
                  }}
                  onClick={() => setMostrarMapaVoladizos(prev => !prev)}
                  title="Colorea en rojo/naranja los ángulos mayores a 45° que requieren soportes"
                >
                  <Flame size={13} color={mostrarMapaVoladizos ? '#fff' : '#fb923c'} />
                  <span>{mostrarMapaVoladizos ? 'Ocultar Voladizos' : `Voladizos >45° (${orientacionMetrics?.overhangPercentage || 0}%)`}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-cyan btn-sm"
                  style={{
                    pointerEvents: 'auto',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                    fontSize: '0.76rem',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={handleTomarCaptura}
                  title="Tomar captura de este ángulo 3D para la cotización"
                >
                  <Camera size={14} />
                  <span>{snapshotUrl ? 'Recapturar 3D' : '📸 Capturar 3D'}</span>
                </button>
              </div>
            )}

            {/* Controles flotantes inferiores sobre el visor */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.65)', padding: '3px 8px', borderRadius: '4px' }}>
                🖱️ Rotar: Clic izq | Paneo: Clic der | Zoom: Rueda (GPU On-Demand)
              </span>

              {/* Selector de color del modelo en visor */}
              <div style={{ display: 'flex', gap: '5px', pointerEvents: 'auto', background: 'rgba(0,0,0,0.65)', padding: '4px 6px', borderRadius: '6px' }}>
                {[
                  { color: '#38bdf8', label: 'Cyan' },
                  { color: '#94a3b8', label: 'Gris Resina' },
                  { color: '#10b981', label: 'Verde Esmeralda' },
                  { color: '#f97316', label: 'Naranja PLA' },
                  { color: '#ca8a04', label: 'Ámbar' }
                ].map(c => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => {
                      setColorModelo(c.color);
                      setMostrarMapaVoladizos(false);
                    }}
                    style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.color, border: colorModelo === c.color && !mostrarMapaVoladizos ? '2px solid #fff' : 'none', cursor: 'pointer' }}
                    title={`Color ${c.label}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* HERRAMIENTA SLICER: CORTE TRANSVERSAL POR CAPAS Z (RAYOS X) & DIAGNÓSTICO DE VOLADIZOS */}
          {analysis && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--brand-cyan)" />
                  <span>Inspección de Capas Z (Rayos X / Corte Slicer): <strong>{corteCapasZPorcentaje}%</strong></span>
                </span>
                {corteCapasZPorcentaje < 100 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                    onClick={() => setCorteCapasZPorcentaje(100)}
                  >
                    Ver 100% Completo
                  </button>
                )}
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={corteCapasZPorcentaje}
                onChange={(e) => setCorteCapasZPorcentaje(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-cyan)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap', gap: '6px' }}>
                <span>
                  🔥 Superficie en voladizo (&gt;45°): <strong style={{ color: (orientacionMetrics?.overhangPercentage || 0) > 25 ? '#fb923c' : '#34d399' }}>{orientacionMetrics?.overhangPercentage || 0}%</strong>
                </span>
                {orientacionMetrics && orientacionMetrics.overhangPercentage > 20 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.68rem', padding: '2px 8px', borderColor: 'rgba(249, 115, 22, 0.4)', color: '#fdba74' }}
                    onClick={() => {
                      const recSoportes = orientacionMetrics.overhangPercentage > 35 ? 1.30 : 1.25;
                      setFactorSoportes(recSoportes);
                      setFactorSoportesFdm(orientacionMetrics.overhangPercentage > 35 ? 1.18 : 1.12);
                    }}
                  >
                    Aplicar factor de soporte sugerido ({orientacionMetrics.overhangPercentage > 35 ? '+30%' : '+25%'})
                  </button>
                )}
              </div>
            </div>
          )}

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

          {/* TARJETA DE SALUD DE MALLA & DETECCIÓN DE CARAS ABIERTAS */}
          {analysis && (
            <div style={{
              marginTop: '12px',
              padding: '14px',
              borderRadius: '10px',
              background: analysis.meshHealth.isWatertight 
                ? 'rgba(16, 185, 129, 0.08)' 
                : analysis.meshHealth.status === 'advertencia' 
                  ? 'rgba(234, 179, 8, 0.08)' 
                  : 'rgba(239, 68, 68, 0.09)',
              border: `1px solid ${
                analysis.meshHealth.isWatertight 
                  ? 'rgba(16, 185, 129, 0.35)' 
                  : analysis.meshHealth.status === 'advertencia' 
                    ? 'rgba(234, 179, 8, 0.35)' 
                    : 'rgba(239, 68, 68, 0.35)'
              }`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {analysis.meshHealth.isWatertight ? (
                    <ShieldCheck size={18} color="#34d399" />
                  ) : (
                    <AlertTriangle size={18} color={analysis.meshHealth.status === 'advertencia' ? '#fbbf24' : '#f87171'} />
                  )}
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#fff' }}>
                    {analysis.meshHealth.isWatertight 
                      ? 'Malla Hermética (Watertight / Manifold)' 
                      : `Atención: ${analysis.meshHealth.openEdgesCount} Aristas/Caras Abiertas`}
                  </span>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: analysis.meshHealth.isWatertight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: analysis.meshHealth.isWatertight ? '#34d399' : '#f87171'
                }}>
                  {analysis.meshHealth.isWatertight ? '100% CERRADA' : 'NO HERMÉTICA'}
                </span>
              </div>

              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                {analysis.meshHealth.diagnostico} {analysis.meshHealth.recomendacion}
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {analysis.meshHealth.openEdgesCount > 0 && (
                  <button
                    type="button"
                    className={`btn btn-sm ${mostrarAristasAbiertas ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ fontSize: '0.74rem', padding: '5px 10px' }}
                    onClick={() => setMostrarAristasAbiertas(!mostrarAristasAbiertas)}
                    title="Dibuja las aristas con fugas en rojo brillante sobre el modelo 3D"
                  >
                    {mostrarAristasAbiertas ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{mostrarAristasAbiertas ? 'Ocultar Líneas Rojas' : 'Ver Caras Abiertas en 3D'}</span>
                  </button>
                )}

                {analysis.meshHealth.openEdgesCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-cyan btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 12px', fontWeight: 700 }}
                    onClick={handleRepararMalla}
                    disabled={isRepairing}
                    title="Soldar vértices y sellar orificios simples"
                  >
                    <Wrench size={13} />
                    <span>{isRepairing ? 'Soldando Malla...' : '🛠️ Reparar Malla Automáticamente'}</span>
                  </button>
                )}

                {repairResult && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 10px' }}
                    onClick={handleDescargarSTLReparado}
                    title="Descargar archivo STL corregido a tu equipo"
                  >
                    <Download size={13} />
                    <span>📥 Descargar STL Reparado</span>
                  </button>
                )}
              </div>

              {repairResult && (
                <div style={{
                  marginTop: '10px',
                  padding: '8px 10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  color: '#34d399'
                }}>
                  ✅ <strong>Resultado:</strong> Se soldaron {repairResult.weldedVertices} vértices y se sellaron {repairResult.healedHoles} orificios. Aristas abiertas reducidas de {repairResult.initialOpen} a {repairResult.finalOpen}.
                </div>
              )}

              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => setMostrarGuiaReparacion(!mostrarGuiaReparacion)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--brand-cyan)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <HelpCircle size={13} />
                  <span>{mostrarGuiaReparacion ? 'Ocultar guía técnica' : '¿Por qué ocurren caras abiertas y cuándo usar Photon Workshop / Slicers?'}</span>
                </button>

                {mostrarGuiaReparacion && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.35)',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    color: 'var(--text-subtle)',
                    lineHeight: 1.5
                  }}>
                    <div style={{ marginBottom: '6px', color: '#e2e8f0', fontWeight: 700 }}>
                      📌 ¿Qué es una cara o arista abierta?
                    </div>
                    <div>
                      En impresión 3D (SLA y FDM), el laminador necesita que el modelo sea un <strong>sólido hermético</strong>. Si faltan caras o hay vértices desoldados, pueden generarse capas falsas o huecos inesperados.
                    </div>
                  </div>
                )}
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
                <span>Orientación de la Pieza (Rotar Ejes en GPU)</span>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.76rem', padding: '7px 8px', color: rotacionX === 90 ? 'var(--brand-cyan)' : undefined }}
                onClick={() => handleRotarX(90)}
                disabled={!analysis}
              >
                <span>↕️ Parar Vertical (+90° X)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.76rem', padding: '7px 8px', color: rotacionX === 270 ? 'var(--brand-cyan)' : undefined }}
                onClick={() => handleRotarX(-90)}
                disabled={!analysis}
              >
                <span>↔️ Acostar Horizontal (-90° X)</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '5px' }}
                onClick={() => handleRotarY(90)}
                disabled={!analysis}
              >
                <span>🔄 Girar Y (+90°)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '5px' }}
                onClick={() => handleRotarZ(90)}
                disabled={!analysis}
              >
                <span>↪️ Rotar Z (+90°)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '5px' }}
                onClick={() => handleRotarX(180)}
                disabled={!analysis}
              >
                <span>🔃 Invertir (180°)</span>
              </button>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '8px', textAlign: 'center' }}>
              🧭 Ángulos actuales: X: {rotacionX % 360}° | Y: {rotacionY % 360}° | Z: {rotacionZ % 360}°
            </div>
          </div>

          {analysis && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
              <span>📁 {analysis.fileName}</span>
              <span>🔺 {analysis.trianglesCount.toLocaleString()} triángulos • 📐 {areaSuperficialEscaladaCm2} cm²</span>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: MEDICIÓN, ESCALADO & ESTIMACIÓN DUAL (SLA RESINA + FDM FILAMENTO) */}
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
                    if (orientacionMetrics) {
                      setAlturaDeseadaZ(orientacionMetrics.size.z.toString());
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
              <div style={{ background: validacionCama.excedeZ ? 'rgba(239, 68, 68, 0.14)' : 'rgba(56, 189, 248, 0.08)', border: `1px solid ${validacionCama.excedeZ ? 'rgba(239, 68, 68, 0.5)' : 'rgba(56, 189, 248, 0.25)'}`, padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: validacionCama.excedeZ ? '#fca5a5' : 'var(--brand-cyan)', textTransform: 'uppercase' }}>
                  Z — Altura (↕️)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  {dimensionesEscaladas.z} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>mm</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  Máx cama: {bedPresetActual.heightZ}mm
                </div>
              </div>

              <div style={{ background: validacionCama.excedeX ? 'rgba(239, 68, 68, 0.14)' : 'rgba(27, 98, 177, 0.1)', border: `1px solid ${validacionCama.excedeX ? 'rgba(239, 68, 68, 0.5)' : 'rgba(27, 98, 177, 0.3)'}`, padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: validacionCama.excedeX ? '#fca5a5' : 'var(--brand-blue)', textTransform: 'uppercase' }}>
                  X — Ancho (↔️)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  {dimensionesEscaladas.x} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>mm</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  Máx cama: {bedPresetActual.widthX}mm
                </div>
              </div>

              <div style={{ background: validacionCama.excedeY ? 'rgba(239, 68, 68, 0.14)' : 'rgba(139, 92, 246, 0.08)', border: `1px solid ${validacionCama.excedeY ? 'rgba(239, 68, 68, 0.5)' : 'rgba(139, 92, 246, 0.25)'}`, padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: validacionCama.excedeY ? '#fca5a5' : 'var(--brand-purple)', textTransform: 'uppercase' }}>
                  Y — Fondo (↗️)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  {dimensionesEscaladas.y} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>mm</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  Máx cama: {bedPresetActual.depthY}mm
                </div>
              </div>
            </div>

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

            {analysis?.wasLikelyInCentimeters && escalaPorcentaje === 100 && (
              <div style={{
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.75rem',
                color: '#fde047',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={16} />
                  <span>
                    <strong>¿Modelo en centímetros?</strong> Mide {dimensionesEscaladas.z} mm ({Number((dimensionesEscaladas.z / 10).toFixed(1))} cm).
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-cyan"
                  style={{ padding: '3px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                  onClick={() => setEscalaPorcentaje(1000)}
                >
                  Escalar ×10 (cm → mm)
                </button>
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
                  >
                    ×10 (cm→mm)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    onClick={() => setEscalaPorcentaje(prev => Number(Math.max(1, prev / 10).toFixed(1)))}
                    disabled={!analysis}
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

          {/* Panel Dual de Cálculo de Material (SLA Resina + FDM Filamento) */}
          <div className="glass-card highlight" style={{ margin: 0, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={16} color="var(--brand-cyan)" />
                <span>Estimador de Material & Costo</span>
              </div>

              {/* Conmutador de Tecnología */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.35)', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${tecnologiaSeleccionada === 'SLA_RESINA' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '5px 10px', fontWeight: 700 }}
                  onClick={() => handleCambiarTecnologia('SLA_RESINA')}
                >
                  🧪 SLA Resina
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${tecnologiaSeleccionada === 'FDM_FILAMENTO' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '5px 10px', fontWeight: 700 }}
                  onClick={() => handleCambiarTecnologia('FDM_FILAMENTO')}
                >
                  🧵 FDM Filamento
                </button>
              </div>
            </div>

            {tecnologiaSeleccionada === 'SLA_RESINA' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Resina de Impresión</label>
                    <select 
                      className="form-select"
                      style={{ minHeight: '38px', fontSize: '0.84rem' }}
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
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Estructura Interna SLA</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button"
                        className={`btn btn-sm ${modoAhuecado === 'solido' ? 'btn-cyan' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '0.74rem', fontWeight: 700 }}
                        onClick={() => setModoAhuecado('solido')}
                      >
                        🧱 Sólido (100%)
                      </button>
                      <button 
                        type="button"
                        className={`btn btn-sm ${modoAhuecado === 'ahuecado' ? 'btn-cyan' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '0.74rem', fontWeight: 700 }}
                        onClick={() => setModoAhuecado('ahuecado')}
                      >
                        🏺 Ahuecado ({porcentajeAhuecado}%)
                      </button>
                    </div>
                  </div>
                </div>

                {modoAhuecado === 'ahuecado' && (
                  <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.74rem', color: '#fde047', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>🏺 <strong>Porcentaje de masa ahuecada:</strong> {porcentajeAhuecado}%</span>
                      <span>Ahorro: {100 - porcentajeAhuecado}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="80"
                      step="5"
                      value={porcentajeAhuecado}
                      onChange={(e) => setPorcentajeAhuecado(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#eab308' }}
                    />
                  </div>
                )}

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
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Con Soportes (+{Math.round((factorSoportes - 1) * 100)}%):</div>
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
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Carrete de Filamento (Catálogo)</label>
                    <select
                      className="form-select"
                      style={{ minHeight: '38px', fontSize: '0.84rem' }}
                      value={filamentoSeleccionadoId}
                      onChange={(e) => setFilamentoSeleccionadoId(e.target.value)}
                    >
                      {filamentos.length > 0 ? (
                        filamentos.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.marca} {f.tipo} {f.color} (${Math.round(f.costo_gramo || 85)}/g)
                          </option>
                        ))
                      ) : (
                        <option value="fil-default">PLA+ Estándar ($85/g)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Paredes Perimetrales (Shells)</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${grosorParedFdmMm === 1.2 ? 'btn-cyan' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '0.72rem', fontWeight: 700 }}
                        onClick={() => setGrosorParedFdmMm(1.2)}
                      >
                        3 Perím. (1.2mm)
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${grosorParedFdmMm === 2.0 ? 'btn-cyan' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '0.72rem', fontWeight: 700 }}
                        onClick={() => setGrosorParedFdmMm(2.0)}
                      >
                        5 Perím. (2.0mm)
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.28)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.74rem', color: '#fdba74', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>🧵 <strong>Densidad de Relleno Interno (Infill FDM):</strong> {infillFdmPorcentaje}%</span>
                    <span>{infillFdmPorcentaje <= 15 ? 'Estándar Decorativo' : infillFdmPorcentaje <= 35 ? 'Funcional Fuerte' : 'Alta Resistencia'}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={infillFdmPorcentaje}
                    onChange={(e) => setInfillFdmPorcentaje(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#f97316' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Volumen Total:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                      {volumenEscaladoCm3} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>cm³</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Filamento Neto:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fb923c' }}>
                      {estimacionFilamento.gramosNetos} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>g</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Con Soportes (+{Math.round((factorSoportesFdm - 1) * 100)}%):</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fde047' }}>
                      {estimacionFilamento.gramosTotales} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>g</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Costo estimado de filamento:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                    ${estimacionFilamento.costoAproxCOP.toLocaleString('es-CO')} COP
                  </span>
                </div>
              </>
            )}

            {analysis?.isVolumeEstimated && (
              <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.35)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.74rem', color: '#fde047', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} />
                <span>Malla con caras abiertas: Volumen estimado al 65% de la caja envolvente para proteger el cálculo.</span>
              </div>
            )}

            {/* Costo opcional de licencia si se adjuntó URL de Cults3D / CGTrader */}
            {urlReferenciaModelo.trim() && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '8px 10px', background: 'rgba(0,0,0,0.22)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  🔗 Costo de compra del archivo STL (COP, opcional):
                </span>
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '130px', minHeight: '32px', fontSize: '0.8rem' }}
                  placeholder="$0"
                  value={costoLicenciaSTL || ''}
                  onChange={(e) => setCostoLicenciaSTL(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            )}

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
                <span>
                  {tecnologiaSeleccionada === 'FDM_FILAMENTO'
                    ? `✓ Enviar al Cotizador en FDM Filamento (${estimacionFilamento.gramosTotales}g)`
                    : `✓ Enviar al Cotizador en SLA Resina (${estimacionResina.gramosTotales}g)`}
                </span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Enlaces a Herramientas Externas Recomendadas */}
          <div className="glass-card" style={{ margin: 0, padding: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ExternalLink size={14} color="var(--brand-blue)" />
              Slicers y Herramientas Complementarias de Taller:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
              <li>
                <a href="https://makerworld.com/es" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-cyan)' }}>
                  MakerWorld / Bambu Studio
                </a> — Perfiles optimizados para Bambu Lab P2S en filamento FDM.
              </li>
              <li>
                <a href="https://chitubox.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-cyan)' }}>
                  Chitubox / Anycubic Photon Workshop
                </a> — Recomendados para ahuecado con agujeros de drenaje en Anycubic Mono 4.
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
