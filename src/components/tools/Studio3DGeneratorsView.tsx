import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Award,
  Cookie,
  Download,
  FileCode2,
  Image as ImageIcon,
  KeyRound,
  Lightbulb,
  Palette,
  QrCode,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Tag,
  Upload,
  X
} from 'lucide-react';
import { ConfiguracionTaller, Filamento, Resina, TecnologiaFabricacion } from '../../types';
import { SlicerAppliedPieceData } from './SlicerInspectorView';
import { processAndOptimizeImage } from '../../services/imageService';
import { thresholdImageDataToBinaryMask } from '../../services/imageToSvgService';
import {
  BaseShapeType,
  FontPresetId,
  GeneratedMeshResult,
  IconPresetId,
  buildCutterStampGeometry,
  buildEventPlaqueGeometry,
  buildKeychainGeometry,
  buildLithophaneGeometry,
  buildMedalGeometry,
  buildQr3DGeometry,
  buildSvgExtrusionGeometry,
  createSamplePortraitCanvas,
  exportGeneratedGeometryToSTL,
  renderGraphicCompositionToMask
} from '../../services/meshGeneratorsService';
import {
  WjgBadge,
  WjgButton,
  WjgCard,
  WjgNumberInput,
  WjgSelect,
  WjgStatCard,
  WjgSwitch,
  WjgTextInput,
  toast
} from '../ui';

type GeneratorToolId =
  | 'llavero'
  | 'litofania'
  | 'medalla'
  | 'placa'
  | 'svg'
  | 'qr'
  | 'cortador';

interface Studio3DGeneratorsViewProps {
  resinas?: Resina[];
  filamentos?: Filamento[];
  config?: ConfiguracionTaller;
  onApplyToCotizador?: (data: SlicerAppliedPieceData) => void;
}

const TOOL_OPTIONS: { id: GeneratorToolId; label: string; badge: string; icon: React.ComponentType<any>; color: string }[] = [
  { id: 'llavero', label: 'Llavero 3D', badge: 'Texto & Figuras', icon: KeyRound, color: '#38bdf8' },
  { id: 'litofania', label: 'Litofanía 3D', badge: 'Foto a Relieve', icon: ImageIcon, color: '#fbbf24' },
  { id: 'medalla', label: 'Medallas 3D', badge: 'Aros & Cinta', icon: Award, color: '#f59e0b' },
  { id: 'placa', label: 'Placas & Eventos', badge: 'Baby Shower / Nombres', icon: Tag, color: '#f472b6' },
  { id: 'svg', label: 'Imagen → SVG / STL', badge: 'Vectorizador', icon: FileCode2, color: '#a855f7' },
  { id: 'qr', label: 'Código QR 3D', badge: 'WA / IG / WiFi', icon: QrCode, color: '#34d399' },
  { id: 'cortador', label: 'Cortador & Sello', badge: 'Galletas / Fondant', icon: Cookie, color: '#fb7185' }
];

const SHAPE_OPTIONS: { value: BaseShapeType; label: string }[] = [
  { value: 'rect_redondeado', label: 'Rectángulo Redondeado' },
  { value: 'circulo', label: 'Círculo / Disco' },
  { value: 'corazon', label: 'Corazón' },
  { value: 'estrella', label: 'Estrella' },
  { value: 'escudo', label: 'Escudo' },
  { value: 'nube', label: 'Nube (Baby Shower)' },
  { value: 'hueso', label: 'Hueso (Mascota)' },
  { value: 'hexagono', label: 'Hexágono' },
  { value: 'arco', label: 'Arco Moderno' },
  { value: 'flor', label: 'Flor' }
];

const ICON_OPTIONS: { value: IconPresetId; label: string }[] = [
  { value: 'ninguno', label: 'Sin icono (Solo texto / imagen)' },
  { value: 'corazon', label: '❤️ Corazón' },
  { value: 'estrella', label: '⭐ Estrella' },
  { value: 'huella', label: '🐾 Huella Mascota' },
  { value: 'corona', label: '👑 Corona' },
  { value: 'pies_bebe', label: '👣 Pies de Bebé' },
  { value: 'mariposa', label: '🦋 Mariposa' },
  { value: 'trofeo', label: '🏆 Trofeo' },
  { value: 'rayo', label: '⚡ Rayo' },
  { value: 'flor', label: '🌸 Flor' },
  { value: 'globos', label: '🎈 Globos' },
  { value: 'diamante', label: '💎 Diamante' }
];

const FONT_OPTIONS: { value: FontPresetId; label: string }[] = [
  { value: 'rounded', label: 'Redondeada Moderna (Recomendada)' },
  { value: 'sans', label: 'Gruesa Industrial (Alta Legibilidad)' },
  { value: 'serif', label: 'Clásica Elegante (Medallas / Eventos)' },
  { value: 'script', label: 'Manuscrita / Script (Baby Shower)' }
];

const PREVIEW_COLORS = [
  { label: 'Blanco Litofanía', hex: '#f8fafc' },
  { label: 'Cyan WJG', hex: '#38bdf8' },
  { label: 'Dorado Medalla', hex: '#fbbf24' },
  { label: 'Rosa Pastel', hex: '#f472b6' },
  { label: 'Verde Menta', hex: '#34d399' },
  { label: 'Gris Resina 8K', hex: '#94a3b8' }
];

function extractGrayscaleGridFromCanvas(
  canvas: HTMLCanvasElement,
  gridW: number,
  gridH: number
): Float32Array {
  const tmp = document.createElement('canvas');
  tmp.width = gridW;
  tmp.height = gridH;
  const ctx = tmp.getContext('2d');
  if (!ctx) return new Float32Array(gridW * gridH).fill(0.5);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, gridW, gridH);
  ctx.drawImage(canvas, 0, 0, gridW, gridH);
  const data = ctx.getImageData(0, 0, gridW, gridH).data;
  const out = new Float32Array(gridW * gridH);

  for (let i = 0; i < gridW * gridH; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3] / 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    out[i] = lum * a + (1 - a); // Transparente -> blanco (delgado)
  }
  return out;
}

function loadFileToCanvas(file: File, maxDim: number = 320): Promise<{ canvas: HTMLCanvasElement; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(16, Math.round((img.width || maxDim) * scale));
        const h = Math.max(16, Math.round((img.height || maxDim) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear el lienzo 2D.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ canvas, previewUrl: dataUrl });
      };
      img.onerror = () => reject(new Error('Archivo de imagen inválido.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export const Studio3DGeneratorsView: React.FC<Studio3DGeneratorsViewProps> = ({
  resinas = [],
  filamentos = [],
  config,
  onApplyToCotizador
}) => {
  const [activeTool, setActiveTool] = useState<GeneratorToolId>('llavero');

  // Imagen cargada compartida para herramientas basadas en foto/logo
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedCanvas, setUploadedCanvas] = useState<HTMLCanvasElement | null>(() => createSamplePortraitCanvas(150, 150));
  const [uploadedFileName, setUploadedFileName] = useState<string>('muestra_paisaje');
  const [isCustomImage, setIsCustomImage] = useState<boolean>(false);

  // Estado Llavero 3D
  const [keyShape, setKeyShape] = useState<BaseShapeType>('rect_redondeado');
  const [keyW, setKeyW] = useState<number>(62);
  const [keyH, setKeyH] = useState<number>(28);
  const [keyBaseT, setKeyBaseT] = useState<number>(3.0);
  const [keyReliefH, setKeyReliefH] = useState<number>(1.6);
  const [keyReliefMode, setKeyReliefMode] = useState<'positivo' | 'negativo'>('positivo');
  const [keyHolePos, setKeyHolePos] = useState<'izquierda' | 'arriba' | 'ninguno'>('izquierda');
  const [keyHoleD, setKeyHoleD] = useState<number>(4.2);
  const [keyBorder, setKeyBorder] = useState<boolean>(true);
  const [keyLine1, setKeyLine1] = useState<string>('WJGEEKS');
  const [keyLine2, setKeyLine2] = useState<string>('3D PRO');
  const [keyFont, setKeyFont] = useState<FontPresetId>('rounded');
  const [keyIcon, setKeyIcon] = useState<IconPresetId>('estrella');
  const [keyIconPos, setKeyIconPos] = useState<'izquierda' | 'arriba' | 'solo_icono'>('izquierda');
  const [keyUseUploaded, setKeyUseUploaded] = useState<boolean>(false);

  // Estado Litofanía 3D
  const [lithoShape, setLithoShape] = useState<'plana' | 'curva' | 'llavero'>('curva');
  const [lithoW, setLithoW] = useState<number>(110);
  const [lithoH, setLithoH] = useState<number>(85);
  const [lithoMinT, setLithoMinT] = useState<number>(0.8);
  const [lithoMaxT, setLithoMaxT] = useState<number>(3.2);
  const [lithoFrame, setLithoFrame] = useState<number>(3.0);
  const [lithoInvert, setLithoInvert] = useState<boolean>(false);
  const [lithoLedPreview, setLithoLedPreview] = useState<boolean>(true);

  // Estado Medallas 3D
  const [medalShape, setMedalShape] = useState<'circulo' | 'escudo'>('circulo');
  const [medalD, setMedalD] = useState<number>(65);
  const [medalBaseT, setMedalBaseT] = useState<number>(3.2);
  const [medalReliefH, setMedalReliefH] = useState<number>(1.6);
  const [medalLoop, setMedalLoop] = useState<'ranura_cinta' | 'argolla' | 'ninguno'>('ranura_cinta');
  const [medalDoubleRim, setMedalDoubleRim] = useState<boolean>(true);
  const [medalLine1, setMedalLine1] = useState<string>('1° LUGAR');
  const [medalLine2, setMedalLine2] = useState<string>('CAMPEÓN');
  const [medalIcon, setMedalIcon] = useState<IconPresetId>('trofeo');

  // Estado Placas & Eventos
  const [plaqueShape, setPlaqueShape] = useState<'nube' | 'arco' | 'corazon' | 'estrella' | 'circulo' | 'rect_redondeado' | 'hexagono' | 'escudo'>('nube');
  const [plaqueW, setPlaqueW] = useState<number>(130);
  const [plaqueH, setPlaqueH] = useState<number>(85);
  const [plaqueBaseT, setPlaqueBaseT] = useState<number>(3.5);
  const [plaqueReliefH, setPlaqueReliefH] = useState<number>(2.0);
  const [plaqueMounting, setPlaqueMounting] = useState<'plana' | 'colgante' | 'topper' | 'base_mesa'>('topper');
  const [plaqueStakeMm, setPlaqueStakeMm] = useState<number>(50);
  const [plaqueBorder, setPlaqueBorder] = useState<boolean>(true);
  const [plaqueLine1, setPlaqueLine1] = useState<string>('Baby Shower');
  const [plaqueLine2, setPlaqueLine2] = useState<string>('Sofía');
  const [plaqueFont, setPlaqueFont] = useState<FontPresetId>('script');
  const [plaqueIcon, setPlaqueIcon] = useState<IconPresetId>('pies_bebe');

  // Estado Imagen -> SVG / STL
  const [svgThreshold, setSvgThreshold] = useState<number>(145);
  const [svgInvert, setSvgInvert] = useState<boolean>(false);
  const [svgWidthMm, setSvgWidthMm] = useState<number>(75);
  const [svgExtrudeH, setSvgExtrudeH] = useState<number>(3.0);
  const [svgIncludeBase, setSvgIncludeBase] = useState<boolean>(true);
  const [svgBaseT, setSvgBaseT] = useState<number>(2.2);
  const [svgKeyring, setSvgKeyring] = useState<boolean>(false);

  // Estado QR 3D
  const [qrText, setQrText] = useState<string>('https://wa.me/573202796115');
  const [qrSizeMm, setQrSizeMm] = useState<number>(70);
  const [qrBaseT, setQrBaseT] = useState<number>(2.4);
  const [qrReliefH, setQrReliefH] = useState<number>(1.4);
  const [qrBorder, setQrBorder] = useState<boolean>(true);
  const [qrMounting, setQrMounting] = useState<'plano' | 'llavero' | 'base_mesa'>('base_mesa');
  const [qrCaption, setQrCaption] = useState<string>('ESCANEA AQUÍ');

  // Estado Cortador & Sello
  const [cutterMode, setCutterMode] = useState<'cortador' | 'sello'>('cortador');
  const [cutterSizeMm, setCutterSizeMm] = useState<number>(75);
  const [cutterHeightMm, setCutterHeightMm] = useState<number>(15);
  const [cutterBladeMm, setCutterBladeMm] = useState<number>(1.2);
  const [cutterFlangeW, setCutterFlangeW] = useState<number>(4.0);
  const [cutterThreshold, setCutterThreshold] = useState<number>(145);
  const [cutterIcon, setCutterIcon] = useState<IconPresetId>('mariposa');
  const [cutterUseUploaded, setCutterUseUploaded] = useState<boolean>(false);
  const [cutterHandle, setCutterHandle] = useState<boolean>(true);

  // Estado Visor 3D + Cotización rápida
  const [previewColor, setPreviewColor] = useState<string>('#38bdf8');
  const [tecnologiaCalc, setTecnologiaCalc] = useState<TecnologiaFabricacion>('FDM_FILAMENTO');
  const [generatedResult, setGeneratedResult] = useState<GeneratedMeshResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Refs Three.js
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const bedGroupRef = useRef<THREE.Group | null>(null);
  const ledLightRef = useRef<THREE.PointLight | null>(null);
  const reqAnimRef = useRef<number | null>(null);

  const requestRender = useCallback(() => {
    if (reqAnimRef.current !== null) return;
    const step = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        reqAnimRef.current = null;
        return;
      }
      const needsMore = controlsRef.current ? controlsRef.current.update() : false;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      if (needsMore) {
        reqAnimRef.current = requestAnimationFrame(step);
      } else {
        reqAnimRef.current = null;
      }
    };
    reqAnimRef.current = requestAnimationFrame(step);
  }, []);

  // Inicializar escena Three.js (Z-up mapeado rotando el contenedor o ajustando cámara Z-up)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.innerHTML = '';

    const width = el.clientWidth || 440;
    const height = 340;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a10);
    sceneRef.current = scene;

    // Usamos cámara con up = (0, 0, 1) porque nuestras mallas son nativamente Z-up (minZ = 0)
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 2500);
    camera.up.set(0, 0, 1);
    camera.position.set(110, -130, 95);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.addEventListener('change', requestRender);
    controlsRef.current = controls;

    // Iluminación
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.15);
    dir1.position.set(140, -120, 200);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x38bdf8, 0.48);
    dir2.position.set(-140, 120, 80);
    scene.add(dir2);

    const ledLight = new THREE.PointLight(0xfffbeb, 0, 320);
    ledLight.position.set(0, 45, 45);
    scene.add(ledLight);
    ledLightRef.current = ledLight;

    // Rejilla de cama en plano XY (z = 0)
    const bedGroup = new THREE.Group();
    const grid = new THREE.GridHelper(220, 22, 0x1b62b1, 0x1e293b);
    grid.rotation.x = Math.PI / 2; // GridHelper es XZ por defecto; rotamos a XY
    bedGroup.add(grid);
    scene.add(bedGroup);
    bedGroupRef.current = bedGroup;

    requestRender();

    const onResize = () => {
      if (!viewportRef.current || !rendererRef.current || !cameraRef.current) return;
      const nw = viewportRef.current.clientWidth || 440;
      cameraRef.current.aspect = nw / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, height);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('change', requestRender);
      if (reqAnimRef.current !== null) {
        cancelAnimationFrame(reqAnimRef.current);
        reqAnimRef.current = null;
      }
      controls.dispose();
      renderer.dispose();
    };
  }, [requestRender]);

  // Generar malla 3D con debounce al cambiar parámetros
  useEffect(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => {
      try {
        let res: GeneratedMeshResult | null = null;

        if (activeTool === 'llavero') {
          const mask = renderGraphicCompositionToMask({
            textLine1: keyLine1,
            textLine2: keyLine2,
            font: keyFont,
            icon: keyIcon,
            iconPosition: keyIconPos,
            uploadedImageCanvas: keyUseUploaded ? uploadedCanvas : null,
            threshold: 145
          });
          res = buildKeychainGeometry({
            shape: keyShape,
            widthMm: keyW,
            heightMm: keyH,
            baseThicknessMm: keyBaseT,
            reliefHeightMm: keyReliefH,
            reliefMode: keyReliefMode,
            holePosition: keyHolePos,
            holeDiameterMm: keyHoleD,
            hasBorder: keyBorder,
            reliefMask: mask || undefined
          });
        } else if (activeTool === 'litofania') {
          const srcCanvas = uploadedCanvas || createSamplePortraitCanvas(140, 140);
          if (srcCanvas) {
            const cols = lithoShape === 'llavero' ? 75 : 110;
            const rows = Math.max(24, Math.round(cols * (Math.max(10, lithoH) / Math.max(10, lithoW))));
            const grid = extractGrayscaleGridFromCanvas(srcCanvas, cols, rows);
            res = buildLithophaneGeometry(grid, cols, rows, {
              shape: lithoShape,
              widthMm: lithoW,
              heightMm: lithoH,
              minThicknessMm: lithoMinT,
              maxThicknessMm: lithoMaxT,
              frameMm: lithoFrame,
              invert: lithoInvert
            });
          }
        } else if (activeTool === 'medalla') {
          const mask = renderGraphicCompositionToMask({
            textLine1: medalLine1,
            textLine2: medalLine2,
            font: 'serif',
            icon: medalIcon,
            iconPosition: 'arriba',
            canvasW: 220,
            canvasH: 220
          });
          res = buildMedalGeometry({
            shape: medalShape,
            diameterMm: medalD,
            baseThicknessMm: medalBaseT,
            reliefHeightMm: medalReliefH,
            loopType: medalLoop,
            doubleRim: medalDoubleRim,
            reliefMask: mask || undefined
          });
        } else if (activeTool === 'placa') {
          const mask = renderGraphicCompositionToMask({
            textLine1: plaqueLine1,
            textLine2: plaqueLine2,
            font: plaqueFont,
            icon: plaqueIcon,
            iconPosition: 'arriba',
            canvasW: 280,
            canvasH: 180
          });
          res = buildEventPlaqueGeometry({
            shape: plaqueShape,
            widthMm: plaqueW,
            heightMm: plaqueH,
            baseThicknessMm: plaqueBaseT,
            reliefHeightMm: plaqueReliefH,
            mounting: plaqueMounting,
            topperStakeMm: plaqueStakeMm,
            hasBorder: plaqueBorder,
            reliefMask: mask || undefined
          });
        } else if (activeTool === 'svg') {
          const srcCanvas = uploadedCanvas || createSamplePortraitCanvas(160, 160);
          if (srcCanvas) {
            const w = srcCanvas.width;
            const h = srcCanvas.height;
            const ctx = srcCanvas.getContext('2d');
            if (ctx) {
              const rgba = ctx.getImageData(0, 0, w, h).data;
              const mask = thresholdImageDataToBinaryMask(rgba, w, h, svgThreshold, svgInvert);
              const aspect = h > 0 ? w / h : 1;
              const targetH = Math.max(15, Math.round(svgWidthMm / Math.max(0.25, aspect)));
              res = buildSvgExtrusionGeometry(mask, w, h, {
                targetWidthMm: svgWidthMm,
                targetHeightMm: targetH,
                extrudeHeightMm: svgExtrudeH,
                includeBase: svgIncludeBase,
                baseThicknessMm: svgBaseT,
                includeKeyringHole: svgKeyring
              });
            }
          }
        } else if (activeTool === 'qr') {
          const captionMask = qrCaption.trim()
            ? renderGraphicCompositionToMask({
                textLine1: qrCaption,
                font: 'sans',
                icon: 'ninguno',
                canvasW: 260,
                canvasH: 64
              })
            : null;
          res = buildQr3DGeometry({
            text: qrText,
            sizeMm: qrSizeMm,
            baseThicknessMm: qrBaseT,
            reliefHeightMm: qrReliefH,
            hasBorder: qrBorder,
            mounting: qrMounting,
            captionMask: captionMask || undefined
          });
        } else if (activeTool === 'cortador') {
          let maskData =
            cutterUseUploaded && uploadedCanvas
              ? (() => {
                  const ctx = uploadedCanvas.getContext('2d');
                  if (!ctx) return null;
                  const rgba = ctx.getImageData(0, 0, uploadedCanvas.width, uploadedCanvas.height).data;
                  return {
                    mask: thresholdImageDataToBinaryMask(rgba, uploadedCanvas.width, uploadedCanvas.height, cutterThreshold, false),
                    width: uploadedCanvas.width,
                    height: uploadedCanvas.height
                  };
                })()
              : renderGraphicCompositionToMask({
                  icon: cutterIcon === 'ninguno' ? 'estrella' : cutterIcon,
                  iconPosition: 'solo_icono',
                  canvasW: 160,
                  canvasH: 160
                });

          if (maskData) {
            res = buildCutterStampGeometry(maskData.mask, maskData.width, maskData.height, {
              mode: cutterMode,
              sizeMm: cutterSizeMm,
              cutterHeightMm,
              bladeThicknessMm: cutterBladeMm,
              flangeWidthMm: cutterFlangeW,
              flangeThicknessMm: 2.2,
              baseThicknessMm: 3.0,
              reliefHeightMm: 2.8,
              includeHandle: cutterHandle
            });
          }
        }

        setGeneratedResult(prev => {
          if (prev?.geometry && prev.geometry !== res?.geometry) {
            prev.geometry.dispose();
          }
          return res;
        });
      } catch (err) {
        console.error('Error generando malla 3D:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 130);

    return () => clearTimeout(timer);
  }, [
    activeTool,
    uploadedCanvas,
    keyShape, keyW, keyH, keyBaseT, keyReliefH, keyReliefMode, keyHolePos, keyHoleD, keyBorder, keyLine1, keyLine2, keyFont, keyIcon, keyIconPos, keyUseUploaded,
    lithoShape, lithoW, lithoH, lithoMinT, lithoMaxT, lithoFrame, lithoInvert,
    medalShape, medalD, medalBaseT, medalReliefH, medalLoop, medalDoubleRim, medalLine1, medalLine2, medalIcon,
    plaqueShape, plaqueW, plaqueH, plaqueBaseT, plaqueReliefH, plaqueMounting, plaqueStakeMm, plaqueBorder, plaqueLine1, plaqueLine2, plaqueFont, plaqueIcon,
    svgThreshold, svgInvert, svgWidthMm, svgExtrudeH, svgIncludeBase, svgBaseT, svgKeyring,
    qrText, qrSizeMm, qrBaseT, qrReliefH, qrBorder, qrMounting, qrCaption,
    cutterMode, cutterSizeMm, cutterHeightMm, cutterBladeMm, cutterFlangeW, cutterThreshold, cutterIcon, cutterUseUploaded, cutterHandle
  ]);

  // Actualizar malla en escena Three.js
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      (meshRef.current.material as THREE.Material).dispose();
      meshRef.current = null;
    }

    if (!generatedResult) {
      requestRender();
      return;
    }

    const isLitho = activeTool === 'litofania';
    const effectiveColor = isLitho ? '#f8fafc' : previewColor;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(effectiveColor),
      roughness: isLitho ? 0.45 : 0.3,
      metalness: isLitho ? 0.05 : 0.12,
      emissive: isLitho && lithoLedPreview ? new THREE.Color(0xfef3c7) : new THREE.Color(0x000000),
      emissiveIntensity: isLitho && lithoLedPreview ? 0.14 : 0,
      side: THREE.DoubleSide
    });

    if (ledLightRef.current) {
      ledLightRef.current.intensity = isLitho && lithoLedPreview ? 2.4 : 0;
    }

    const mesh = new THREE.Mesh(generatedResult.geometry, mat);
    scene.add(mesh);
    meshRef.current = mesh;

    const maxDim = Math.max(
      45,
      generatedResult.dimensionsMm.x,
      generatedResult.dimensionsMm.y,
      generatedResult.dimensionsMm.z
    );
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.set(0, 0, generatedResult.dimensionsMm.z * 0.45);
      cameraRef.current.position.set(maxDim * 1.15, -maxDim * 1.35, maxDim * 1.05);
      controlsRef.current.update();
    }

    requestRender();
  }, [generatedResult, previewColor, activeTool, lithoLedPreview, requestRender]);

  // Limpiar geometría al desmontar
  useEffect(() => {
    return () => {
      if (generatedResult?.geometry) {
        generatedResult.geometry.dispose();
      }
    };
  }, []);

  // Cálculos estimados con catálogo real del taller
  const estimacionProduccion = useMemo(() => {
    if (!generatedResult) return null;
    const vol = Math.max(0.1, generatedResult.volumeCm3);
    const zMm = Math.max(1, generatedResult.dimensionsMm.z);

    if (tecnologiaCalc === 'SLA_RESINA') {
      const res = resinas[0];
      const densidad = res?.densidad_g_cm3 || 1.13;
      const costoG = res?.costo_gramo || 90;
      const merma = config?.margen_merma_resina ?? 0.2;
      const pesoG = Number((vol * densidad * (1 + merma)).toFixed(1));
      const velMmH = res?.velocidad_impresion_mm_h || 20;
      const tiempoMin = Math.max(15, Math.round((zMm / velMmH) * 60));
      return {
        materialNombre: res ? `${res.marca} ${res.tipo}` : 'Resina SLA',
        materialId: res?.id,
        pesoG,
        tiempoMin,
        costoCop: Math.round(pesoG * costoG)
      };
    }

    const fil = filamentos[0];
    const densidad = fil?.densidad_g_cm3 || 1.24;
    const costoG = fil?.costo_gramo || 85;
    const merma = config?.margen_merma_fdm ?? 0.15;
    // Piezas delgadas (llaveros/placas/litofanías) suelen imprimirse al 85%-100% sólido
    const pesoG = Number((vol * densidad * 0.9 * (1 + merma)).toFixed(1));
    const tiempoMin = Math.max(12, Math.round((pesoG / 10) * 60 + 8));
    return {
      materialNombre: fil ? `${fil.marca} ${fil.tipo}` : 'PLA+ FDM',
      materialId: fil?.id,
      pesoG,
      tiempoMin,
      costoCop: Math.round(pesoG * costoG)
    };
  }, [generatedResult, tecnologiaCalc, resinas, filamentos, config]);

  const handleUploadImage = async (file: File) => {
    try {
      const { canvas } = await loadFileToCanvas(file, 260);
      setUploadedCanvas(canvas);
      setUploadedFileName(file.name.replace(/\.[^.]+$/, ''));
      setIsCustomImage(true);
      if (activeTool === 'llavero') setKeyUseUploaded(true);
      if (activeTool === 'cortador') setCutterUseUploaded(true);
      toast.success(`Imagen "${file.name}" cargada en el Estudio 3D.`);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la imagen.');
    }
  };

  const getPieceTitle = (): string => {
    switch (activeTool) {
      case 'llavero':
        return `Llavero 3D ${keyLine1 || keyIcon}`.trim();
      case 'litofania':
        return `Litofanía ${lithoShape === 'curva' ? 'Curva' : lithoShape === 'llavero' ? 'Llavero' : 'Plana'} (${uploadedFileName})`;
      case 'medalla':
        return `Medalla 3D ${medalLine1 || medalD + 'mm'}`.trim();
      case 'placa':
        return `Placa ${plaqueLine1 || plaqueLine2 || plaqueShape}`.trim();
      case 'svg':
        return `Relieve SVG ${uploadedFileName}`.trim();
      case 'qr':
        return `Código QR 3D ${qrCaption || 'Personalizado'}`.trim();
      case 'cortador':
        return `${cutterMode === 'sello' ? 'Sello 3D' : 'Cortador Galleta'} ${cutterSizeMm}mm`;
    }
  };

  const handleDownloadStl = () => {
    if (!generatedResult) return;
    exportGeneratedGeometryToSTL(generatedResult.geometry, getPieceTitle());
    toast.success('Archivo .STL descargado y listo para tu slicer.');
  };

  const handleDownloadSvg = () => {
    if (!generatedResult?.svgContent) return;
    const blob = new Blob([generatedResult.svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${uploadedFileName || 'vector'}_WJG.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Archivo vectorial .SVG descargado.');
  };

  const handleEnviarCotizador = async () => {
    if (!generatedResult || !estimacionProduccion || !onApplyToCotizador) return;

    let snapshot: string | undefined;
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      try {
        controlsRef.current?.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const raw = rendererRef.current.domElement.toDataURL('image/png');
        snapshot = await processAndOptimizeImage(raw, 720, 720, 0.9);
      } catch {
        snapshot = undefined;
      }
    }

    onApplyToCotizador({
      altoMm: generatedResult.dimensionsMm.z,
      anchoMm: generatedResult.dimensionsMm.x,
      profundidadMm: generatedResult.dimensionsMm.y,
      pesoResinaG: tecnologiaCalc === 'SLA_RESINA' ? estimacionProduccion.pesoG : 0,
      pesoFilamentoG: tecnologiaCalc === 'FDM_FILAMENTO' ? estimacionProduccion.pesoG : undefined,
      tiempoImpresionMin: estimacionProduccion.tiempoMin,
      tecnologia: tecnologiaCalc,
      resinaId: tecnologiaCalc === 'SLA_RESINA' ? estimacionProduccion.materialId : undefined,
      filamentoId: tecnologiaCalc === 'FDM_FILAMENTO' ? estimacionProduccion.materialId : undefined,
      nombrePieza: getPieceTitle(),
      imagenUrl: snapshot
    });
    toast.success(`"${getPieceTitle()}" enviado al Cotizador 3D.`);
  };

  const showImageUploader =
    activeTool === 'litofania' ||
    activeTool === 'svg' ||
    activeTool === 'llavero' ||
    activeTool === 'cortador';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Selector de las 7 herramientas de creación 3D */}
      <div className="subtabs-grid-mobile" style={{ gap: '8px' }}>
        {TOOL_OPTIONS.map(t => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTool(t.id)}
              style={{
                justifyContent: 'flex-start',
                gap: '8px',
                fontWeight: 700,
                borderColor: isActive ? t.color : undefined,
                minHeight: '44px'
              }}
            >
              <Icon size={16} color={isActive ? '#fff' : t.color} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                <span>{t.label}</span>
                <span style={{ fontSize: '0.66rem', opacity: 0.78, fontWeight: 500 }}>{t.badge}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Layout principal: Parámetros a la izquierda + Visor STL 3D a la derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'start' }}>
        {/* COLUMNA IZQUIERDA: CONTROLES PARAMÉTRICOS */}
        <WjgCard style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                {TOOL_OPTIONS.find(x => x.id === activeTool)?.label}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Generación local instantánea en milímetros reales (Z-up) lista para imprimir.
              </p>
            </div>
            <WjgBadge variant="cyan" icon={<Sparkles size={12} />}>
              Salida .STL
            </WjgBadge>
          </div>

          {/* Cargador de Imagen Compartido cuando aplica */}
          {showImageUploader && (
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px dashed rgba(56, 189, 248, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadImage(f);
                  e.target.value = '';
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#e2e8f0' }}>
                  Imagen base: <strong style={{ color: '#38bdf8' }}>{isCustomImage ? uploadedFileName : 'Muestra integrada'}</strong>
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <WjgButton
                    variant="cyan"
                    size="sm"
                    leftIcon={<Upload size={14} />}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Subir Foto / Logo
                  </WjgButton>
                  {isCustomImage && (
                    <WjgButton
                      variant="secondary"
                      size="sm"
                      leftIcon={<X size={14} />}
                      onClick={() => {
                        setUploadedCanvas(createSamplePortraitCanvas(150, 150));
                        setUploadedFileName('muestra_paisaje');
                        setIsCustomImage(false);
                        setKeyUseUploaded(false);
                        setCutterUseUploaded(false);
                      }}
                    >
                      Restaurar Muestra
                    </WjgButton>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. CONTROLES LLAVERO 3D */}
          {activeTool === 'llavero' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                <WjgTextInput label="Texto Principal" value={keyLine1} onChange={setKeyLine1} placeholder="Ej: WJGEEKS" />
                <WjgTextInput label="Segunda Línea (Opcional)" value={keyLine2} onChange={setKeyLine2} placeholder="Ej: 3D PRO" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label">Forma Base</label>
                  <WjgSelect value={keyShape} onChange={v => setKeyShape(v as BaseShapeType)} options={SHAPE_OPTIONS} />
                </div>
                <div>
                  <label className="form-label">Figura / Icono Básico</label>
                  <WjgSelect value={keyIcon} onChange={v => setKeyIcon(v as IconPresetId)} options={ICON_OPTIONS} />
                </div>
                <div>
                  <label className="form-label">Tipografía</label>
                  <WjgSelect value={keyFont} onChange={v => setKeyFont(v as FontPresetId)} options={FONT_OPTIONS} />
                </div>
                <div>
                  <label className="form-label">Posición Figura</label>
                  <WjgSelect
                    value={keyIconPos}
                    onChange={v => setKeyIconPos(v as any)}
                    options={[
                      { value: 'izquierda', label: 'Icono a la Izquierda' },
                      { value: 'arriba', label: 'Icono Arriba del Texto' },
                      { value: 'solo_icono', label: 'Solo Figura (Sin Texto)' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px' }}>
                <WjgNumberInput label="Ancho" unit="mm" min={0} value={keyW} onChange={setKeyW} />
                <WjgNumberInput label="Alto" unit="mm" min={0} value={keyH} onChange={setKeyH} />
                <WjgNumberInput label="Base" unit="mm" min={0} value={keyBaseT} onChange={setKeyBaseT} />
                <WjgNumberInput label="Relieve" unit="mm" min={0} value={keyReliefH} onChange={setKeyReliefH} />
                <WjgNumberInput label="Agujero" unit="mm" min={0} value={keyHoleD} onChange={setKeyHoleD} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label">Tipo de Relieve</label>
                  <WjgSelect
                    value={keyReliefMode}
                    onChange={v => setKeyReliefMode(v as any)}
                    options={[
                      { value: 'positivo', label: 'Relieve Saliente (+)' },
                      { value: 'negativo', label: 'Grabado Hundido (-)' }
                    ]}
                  />
                </div>
                <div>
                  <label className="form-label">Argolla Llavero</label>
                  <WjgSelect
                    value={keyHolePos}
                    onChange={v => setKeyHolePos(v as any)}
                    options={[
                      { value: 'izquierda', label: 'Ojal a la Izquierda' },
                      { value: 'arriba', label: 'Ojal Arriba' },
                      { value: 'ninguno', label: 'Sin Argolla (Ficha)' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <WjgSwitch checked={keyBorder} onChange={setKeyBorder} label="Marco perimetral en relieve" />
                {isCustomImage && (
                  <WjgSwitch
                    checked={keyUseUploaded}
                    onChange={setKeyUseUploaded}
                    label="Combinar con la imagen / logo subido"
                  />
                )}
              </div>
            </>
          )}

          {/* 2. CONTROLES LITOFANÍA 3D */}
          {activeTool === 'litofania' && (
            <>
              <div>
                <label className="form-label">Formato de Litofanía</label>
                <WjgSelect
                  value={lithoShape}
                  onChange={v => setLithoShape(v as any)}
                  options={[
                    { value: 'curva', label: 'Curva Auto-Sostenible (120° Vertical)' },
                    { value: 'plana', label: 'Plana Rectangular (Marco / Lámpara)' },
                    { value: 'llavero', label: 'Mini Litofanía Llavero (Con Ojal)' }
                  ]}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px' }}>
                <WjgNumberInput label="Ancho" unit="mm" min={0} value={lithoW} onChange={setLithoW} />
                <WjgNumberInput label="Alto" unit="mm" min={0} value={lithoH} onChange={setLithoH} />
                <WjgNumberInput label="Mín. Luz" unit="mm" min={0} value={lithoMinT} onChange={setLithoMinT} />
                <WjgNumberInput label="Máx. Sombra" unit="mm" min={0} value={lithoMaxT} onChange={setLithoMaxT} />
                <WjgNumberInput label="Marco" unit="mm" min={0} value={lithoFrame} onChange={setLithoFrame} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <WjgSwitch
                  checked={lithoLedPreview}
                  onChange={setLithoLedPreview}
                  label="Simular luz LED trasera en vista previa"
                />
                <WjgSwitch
                  checked={lithoInvert}
                  onChange={setLithoInvert}
                  label="Invertir relieve (Positivo directo sin retroiluminación)"
                />
              </div>
            </>
          )}

          {/* 3. CONTROLES MEDALLAS 3D */}
          {activeTool === 'medalla' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                <WjgTextInput label="Título Medalla" value={medalLine1} onChange={setMedalLine1} placeholder="1° LUGAR" />
                <WjgTextInput label="Subtítulo / Evento" value={medalLine2} onChange={setMedalLine2} placeholder="COPA WJG 2026" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label">Silueta Medalla</label>
                  <WjgSelect
                    value={medalShape}
                    onChange={v => setMedalShape(v as any)}
                    options={[
                      { value: 'circulo', label: 'Circular Clásica' },
                      { value: 'escudo', label: 'Escudo Deportivo' }
                    ]}
                  />
                </div>
                <div>
                  <label className="form-label">Emblema Central</label>
                  <WjgSelect value={medalIcon} onChange={v => setMedalIcon(v as IconPresetId)} options={ICON_OPTIONS} />
                </div>
                <div>
                  <label className="form-label">Ojal para Cinta</label>
                  <WjgSelect
                    value={medalLoop}
                    onChange={v => setMedalLoop(v as any)}
                    options={[
                      { value: 'ranura_cinta', label: 'Ranura Ancha de Cinta' },
                      { value: 'argolla', label: 'Argolla Redonda' },
                      { value: 'ninguno', label: 'Sin Ojal (Moneda)' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px' }}>
                <WjgNumberInput label="Diámetro" unit="mm" min={0} value={medalD} onChange={setMedalD} />
                <WjgNumberInput label="Grosor Base" unit="mm" min={0} value={medalBaseT} onChange={setMedalBaseT} />
                <WjgNumberInput label="Altura Relieve" unit="mm" min={0} value={medalReliefH} onChange={setMedalReliefH} />
              </div>

              <WjgSwitch checked={medalDoubleRim} onChange={setMedalDoubleRim} label="Doble aro perimetral en relieve" />
            </>
          )}

          {/* 4. CONTROLES PLACAS & EVENTOS */}
          {activeTool === 'placa' && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <WjgButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPlaqueShape('nube');
                    setPlaqueMounting('topper');
                    setPlaqueLine1('Baby Shower');
                    setPlaqueLine2('Sofía');
                    setPlaqueIcon('pies_bebe');
                    setPlaqueFont('script');
                  }}
                >
                  👶 Baby Shower Nube
                </WjgButton>
                <WjgButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPlaqueShape('estrella');
                    setPlaqueMounting('topper');
                    setPlaqueLine1('Feliz Cumple');
                    setPlaqueLine2('Mateo');
                    setPlaqueIcon('globos');
                    setPlaqueFont('rounded');
                  }}
                >
                  🎂 Cake Topper Cumple
                </WjgButton>
                <WjgButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPlaqueShape('arco');
                    setPlaqueMounting('base_mesa');
                    setPlaqueLine1('BIENVENIDOS');
                    setPlaqueLine2('Mesa #1');
                    setPlaqueIcon('corazon');
                    setPlaqueFont('serif');
                  }}
                >
                  🎀 Centro de Mesa
                </WjgButton>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                <WjgTextInput label="Texto Línea 1" value={plaqueLine1} onChange={setPlaqueLine1} placeholder="Baby Shower" />
                <WjgTextInput label="Nombre / Línea 2" value={plaqueLine2} onChange={setPlaqueLine2} placeholder="Sofía" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label">Silueta de Placa</label>
                  <WjgSelect
                    value={plaqueShape}
                    onChange={v => setPlaqueShape(v as any)}
                    options={SHAPE_OPTIONS.filter(s => s.value !== 'hueso')}
                  />
                </div>
                <div>
                  <label className="form-label">Tipo de Montaje</label>
                  <WjgSelect
                    value={plaqueMounting}
                    onChange={v => setPlaqueMounting(v as any)}
                    options={[
                      { value: 'topper', label: 'Cake Topper (Con Estaca Torta)' },
                      { value: 'base_mesa', label: 'Centro de Mesa (Con Peana)' },
                      { value: 'colgante', label: 'Colgante (2 Agujeros Cinta)' },
                      { value: 'plana', label: 'Placa Plana Adhesiva' }
                    ]}
                  />
                </div>
                <div>
                  <label className="form-label">Figura Decorativa</label>
                  <WjgSelect value={plaqueIcon} onChange={v => setPlaqueIcon(v as IconPresetId)} options={ICON_OPTIONS} />
                </div>
                <div>
                  <label className="form-label">Estilo de Letra</label>
                  <WjgSelect value={plaqueFont} onChange={v => setPlaqueFont(v as FontPresetId)} options={FONT_OPTIONS} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px' }}>
                <WjgNumberInput label="Ancho" unit="mm" min={0} value={plaqueW} onChange={setPlaqueW} />
                <WjgNumberInput label="Alto" unit="mm" min={0} value={plaqueH} onChange={setPlaqueH} />
                <WjgNumberInput label="Base" unit="mm" min={0} value={plaqueBaseT} onChange={setPlaqueBaseT} />
                <WjgNumberInput label="Relieve" unit="mm" min={0} value={plaqueReliefH} onChange={setPlaqueReliefH} />
                {plaqueMounting === 'topper' && (
                  <WjgNumberInput label="Largo Estaca" unit="mm" min={0} value={plaqueStakeMm} onChange={setPlaqueStakeMm} />
                )}
              </div>

              <WjgSwitch checked={plaqueBorder} onChange={setPlaqueBorder} label="Borde decorativo en relieve" />
            </>
          )}

          {/* 5. CONTROLES IMAGEN -> SVG / STL */}
          {activeTool === 'svg' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                <WjgNumberInput label="Umbral Blanco/Negro" min={10} max={245} value={svgThreshold} onChange={setSvgThreshold} />
                <WjgNumberInput label="Ancho Final" unit="mm" min={0} value={svgWidthMm} onChange={setSvgWidthMm} />
                <WjgNumberInput label="Altura Extrusión" unit="mm" min={0} value={svgExtrudeH} onChange={setSvgExtrudeH} />
                {svgIncludeBase && (
                  <WjgNumberInput label="Grosor Base" unit="mm" min={0} value={svgBaseT} onChange={setSvgBaseT} />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <WjgSwitch checked={svgInvert} onChange={setSvgInvert} label="Invertir tonos (Vectorizar zonas claras)" />
                <WjgSwitch checked={svgIncludeBase} onChange={setSvgIncludeBase} label="Agregar placa base sólida debajo" />
                <WjgSwitch checked={svgKeyring} onChange={setSvgKeyring} label="Agregar ojal superior para llavero" />
              </div>

              {generatedResult?.svgContent && (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{ width: '78px', height: '78px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    dangerouslySetInnerHTML={{
                      __html: generatedResult.svgContent.replace(/<svg /, '<svg style="max-width:100%;max-height:100%;" ')
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.82rem' }}>
                      Vector .SVG generado en vivo
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.74rem', marginBottom: '6px' }}>
                      Listo para corte láser, plotter o edición en Illustrator/Inkscape.
                    </div>
                    <WjgButton variant="primary" size="sm" leftIcon={<Download size={14} />} onClick={handleDownloadSvg}>
                      Descargar .SVG
                    </WjgButton>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 6. CONTROLES CÓDIGO QR 3D */}
          {activeTool === 'qr' && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <WjgButton variant="secondary" size="sm" onClick={() => { setQrText('https://wa.me/573202796115'); setQrCaption('WHATSAPP WJG'); }}>
                  💬 WhatsApp
                </WjgButton>
                <WjgButton variant="secondary" size="sm" onClick={() => { setQrText('https://instagram.com/wjgeeks3d'); setQrCaption('@WJGEEKS3D'); }}>
                  📸 Instagram
                </WjgButton>
                <WjgButton variant="secondary" size="sm" onClick={() => { setQrText('WIFI:T:WPA;S:WJGEEKS_TALLER;P:ClaveWifi;;'); setQrCaption('WIFI INVITADOS'); }}>
                  📶 WiFi Local
                </WjgButton>
              </div>

              <WjgTextInput
                label="Enlace, Texto o WiFi para el QR *"
                value={qrText}
                onChange={setQrText}
                placeholder="https://..."
              />
              <WjgTextInput
                label="Texto Inferior (Opcional)"
                value={qrCaption}
                onChange={setQrCaption}
                placeholder="Ej: ESCANEA AQUÍ"
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px' }}>
                <WjgNumberInput label="Tamaño QR" unit="mm" min={0} value={qrSizeMm} onChange={setQrSizeMm} />
                <WjgNumberInput label="Base" unit="mm" min={0} value={qrBaseT} onChange={setQrBaseT} />
                <WjgNumberInput label="Relieve" unit="mm" min={0} value={qrReliefH} onChange={setQrReliefH} />
              </div>

              <div>
                <label className="form-label">Formato de Montaje</label>
                <WjgSelect
                  value={qrMounting}
                  onChange={v => setQrMounting(v as any)}
                  options={[
                    { value: 'base_mesa', label: 'Exhibidor con Peana de Mesa' },
                    { value: 'llavero', label: 'Llavero QR (Con Ojal)' },
                    { value: 'plano', label: 'Placa Plana' }
                  ]}
                />
              </div>

              <WjgSwitch checked={qrBorder} onChange={setQrBorder} label="Marco protector elevado" />
            </>
          )}

          {/* 7. CONTROLES CORTADOR & SELLO */}
          {activeTool === 'cortador' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label">Modo de Herramienta</label>
                  <WjgSelect
                    value={cutterMode}
                    onChange={v => setCutterMode(v as any)}
                    options={[
                      { value: 'cortador', label: '🍪 Cortador de Galletas / Fondant' },
                      { value: 'sello', label: '🏷️ Sello 3D (Con Espejo Auto)' }
                    ]}
                  />
                </div>
                {!cutterUseUploaded && (
                  <div>
                    <label className="form-label">Silueta Predefinida</label>
                    <WjgSelect value={cutterIcon} onChange={v => setCutterIcon(v as IconPresetId)} options={ICON_OPTIONS.filter(i => i.value !== 'ninguno')} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px' }}>
                <WjgNumberInput label="Tamaño" unit="mm" min={0} value={cutterSizeMm} onChange={setCutterSizeMm} />
                {cutterMode === 'cortador' ? (
                  <>
                    <WjgNumberInput label="Alto Pared" unit="mm" min={0} value={cutterHeightMm} onChange={setCutterHeightMm} />
                    <WjgNumberInput label="Grosor Filo" unit="mm" min={0} value={cutterBladeMm} onChange={setCutterBladeMm} />
                    <WjgNumberInput label="Pestaña" unit="mm" min={0} value={cutterFlangeW} onChange={setCutterFlangeW} />
                  </>
                ) : (
                  <WjgNumberInput label="Umbral Imagen" min={10} max={245} value={cutterThreshold} onChange={setCutterThreshold} />
                )}
              </div>

              {isCustomImage && (
                <WjgSwitch
                  checked={cutterUseUploaded}
                  onChange={setCutterUseUploaded}
                  label="Usar imagen/silueta subida en lugar de icono"
                />
              )}
              {cutterMode === 'sello' && (
                <WjgSwitch checked={cutterHandle} onChange={setCutterHandle} label="Agregar mango/agarre trasero" />
              )}
            </>
          )}
        </WjgCard>

        {/* COLUMNA DERECHA: VISOR 3D INTERACTIVO + MÉTRICAS + ACCIONES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <WjgCard padding="14px" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#e2e8f0' }}>
                <Palette size={15} color="#38bdf8" />
                <span>Vista Previa 3D en Vivo {isGenerating ? '• Generando...' : ''}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {PREVIEW_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setPreviewColor(c.hex)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: c.hex,
                      border: previewColor === c.hex ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                      cursor: 'pointer'
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', minHeight: '28px' }}
                  title="Centrar cámara 3D"
                  onClick={() => {
                    if (cameraRef.current && controlsRef.current && generatedResult) {
                      const d = Math.max(45, generatedResult.dimensionsMm.x, generatedResult.dimensionsMm.y);
                      cameraRef.current.position.set(d * 1.15, -d * 1.35, d * 1.05);
                      controlsRef.current.target.set(0, 0, generatedResult.dimensionsMm.z * 0.45);
                      controlsRef.current.update();
                      requestRender();
                    }
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Viewport WebGL */}
            <div
              ref={viewportRef}
              style={{
                width: '100%',
                height: '340px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                background: '#070a10',
                position: 'relative'
              }}
            />

            {activeTool === 'litofania' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#fde68a' }}>
                <Lightbulb size={15} color="#fbbf24" />
                <span>Tip de taller: imprime las litofanías con relleno 100% (o 99 paredes) en PLA Blanco o Marfil para mejor contraste con luz LED.</span>
              </div>
            )}

            {/* Selector rápido tecnología para cotizar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <div>
                <label className="form-label">Tecnología para Estimar Costo</label>
                <WjgSelect
                  value={tecnologiaCalc}
                  onChange={v => setTecnologiaCalc(v as TecnologiaFabricacion)}
                  options={[
                    { value: 'FDM_FILAMENTO', label: 'Filamento FDM (Bambu P1S/P2S)' },
                    { value: 'SLA_RESINA', label: 'Resina SLA 8K (Anycubic Mono)' }
                  ]}
                />
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', paddingBottom: '8px' }}>
                Material ref.: <strong style={{ color: '#e2e8f0' }}>{estimacionProduccion?.materialNombre || 'Estándar'}</strong>
                {generatedResult ? ` • ${generatedResult.trianglesCount.toLocaleString('es-CO')} triángulos` : ''}
              </div>
            </div>

            {/* Métricas en vivo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <WjgStatCard
                label="Medidas X×Y×Z"
                value={
                  generatedResult
                    ? `${generatedResult.dimensionsMm.x}×${generatedResult.dimensionsMm.y}×${generatedResult.dimensionsMm.z}`
                    : '—'
                }
                subtitle="milímetros (mm)"
                accentColor="#38bdf8"
              />
              <WjgStatCard
                label="Volumen / Peso"
                value={estimacionProduccion ? `${estimacionProduccion.pesoG} g` : '—'}
                subtitle={generatedResult ? `${generatedResult.volumeCm3} cm³` : undefined}
                accentColor="#34d399"
              />
              <WjgStatCard
                label="Tiempo / Material"
                value={estimacionProduccion ? `~${estimacionProduccion.tiempoMin} min` : '—'}
                subtitle={estimacionProduccion ? `$${estimacionProduccion.costoCop.toLocaleString('es-CO')} COP mat.` : undefined}
                accentColor="#fbbf24"
              />
            </div>

            {/* Botones de Descarga STL / SVG y Enviar al Cotizador */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <WjgButton
                variant="save"
                leftIcon={isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                disabled={!generatedResult || isGenerating}
                onClick={handleDownloadStl}
                style={{ flex: 1, minWidth: '155px' }}
              >
                Descargar .STL
              </WjgButton>

              {activeTool === 'svg' && generatedResult?.svgContent && (
                <WjgButton
                  variant="cyan"
                  leftIcon={<Download size={16} />}
                  onClick={handleDownloadSvg}
                  style={{ flex: 1, minWidth: '140px' }}
                >
                  Descargar .SVG
                </WjgButton>
              )}

              {onApplyToCotizador && (
                <WjgButton
                  variant="quote"
                  leftIcon={<Sparkles size={16} />}
                  disabled={!generatedResult || isGenerating}
                  onClick={handleEnviarCotizador}
                  style={{ flex: 1, minWidth: '185px' }}
                >
                  Enviar al Cotizador
                </WjgButton>
              )}
            </div>
          </WjgCard>
        </div>
      </div>
    </div>
  );
};
