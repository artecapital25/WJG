import { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { 
  Resina, 
  Filamento,
  Maquina, 
  Insumo, 
  Personal, 
  ConfiguracionTaller, 
  PiezaCotizada, 
  TarifaTamano,
  TecnologiaFabricacion
} from '../../../types';
import { 
  ItemPinturaForm, 
  ItemAccesorioForm, 
  ItemMaquinaExtraForm, 
  ItemEmpaqueForm, 
  ItemEnlaceCompraForm,
  CotizadorFormProps 
} from '../types/cotizador.types';
import { 
  calcularCotizacionIntegral, 
  ParametrosPiezaInput 
} from '../utils/pricingCalculator';
import { processAndOptimizeImage } from '../../../services/imageService';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';
import { toast } from '../../../components/ui/ToastProvider';

export function useCotizadorForm(props: CotizadorFormProps) {
  const {
    resinas,
    maquinas,
    insumos,
    personal,
    config,
    onAgregarPieza,
    initialPieceData,
    piezaEnEdicion
  } = props;

  // Estado del Formulario
  const [nombreItem, setNombreItem] = useState('Figura Coleccionable 3D');
  const [cantidad, setCantidad] = useState(1);
  const [altoMm, setAltoMm] = useState<number>(100);
  const [anchoMm, setAnchoMm] = useState<number>(60);
  const [profundidadMm, setProfundidadMm] = useState<number>(60);

  // Parámetros avanzados
  const [showParametrosAvanzados, setShowParametrosAvanzados] = useState(false);
  const [showTarifarioModal, setShowTarifarioModal] = useState(false);

  // Tarifas fijadas
  const [precioFijadoTarifa, setPrecioFijadoTarifa] = useState(false);
  const [tarifaAplicada, setTarifaAplicada] = useState<{ altura_cm: number; precio_sugerido: number } | null>(null);
  const [precioUnitarioManual, setPrecioUnitarioManual] = useState<number>(0);

  // Estructura y relleno
  const [tipoEstructura, setTipoEstructura] = useState<'solido' | 'ahuecado'>('solido');
  const [porcentajeRelleno, setPorcentajeRelleno] = useState<number>(35);

  // Tecnología de Fabricación Multi-Proceso
  const [tecnologia, setTecnologia] = useState<TecnologiaFabricacion>(piezaEnEdicion?.tecnologia || 'SLA_RESINA');

  // Parámetros FDM Filamento
  const filamentos = props.filamentos || [];
  const [filamentoId, setFilamentoId] = useState<string>(piezaEnEdicion?.filamento_id || filamentos[0]?.id || '');
  const [materialFilamento, setMaterialFilamento] = useState<string>(piezaEnEdicion?.material_filamento || 'PLA');
  const [pesoFilamentoG, setPesoFilamentoG] = useState<number>(piezaEnEdicion?.peso_filamento_g || 45);
  const [costoRolloKg, setCostoRolloKg] = useState<number>(piezaEnEdicion?.costo_filamento_kg || 85000);
  const [tiempoFDMMin, setTiempoFDMMin] = useState<number>(piezaEnEdicion?.tiempo_impresion_min || 180);

  // Mermas de Seguridad Editables (% configurable por pieza)
  const [mermaPorcentajeFdm, setMermaPorcentajeFdm] = useState<number>(
    piezaEnEdicion?.merma_porcentaje !== undefined 
      ? piezaEnEdicion.merma_porcentaje 
      : (config.margen_merma_fdm !== undefined ? config.margen_merma_fdm : 5)
  );
  const [mermaPorcentajeResina, setMermaPorcentajeResina] = useState<number>(
    piezaEnEdicion?.merma_porcentaje !== undefined
      ? piezaEnEdicion.merma_porcentaje
      : (config.margen_merma_resina ? (config.margen_merma_resina > 2 ? config.margen_merma_resina : Math.round((config.margen_merma_resina - 1) * 100)) : 10)
  );

  const filamentoActual = filamentos.find(f => f.id === filamentoId) || filamentos[0];

  // Auto-seleccionar primer filamento si cambia la lista o no estaba asignado
  useEffect(() => {
    if (filamentos.length > 0) {
      if (!filamentoId || !filamentos.some(f => f.id === filamentoId)) {
        setFilamentoId(filamentos[0].id);
      }
    }
  }, [filamentos, filamentoId]);

  useEffect(() => {
    if (filamentoActual) {
      setMaterialFilamento(`${filamentoActual.marca} ${filamentoActual.tipo} (${filamentoActual.color})`);
      setCostoRolloKg(Math.round(filamentoActual.costo_gramo * 1000));
    }
  }, [filamentoId, filamentoActual]);

  // Conmutación inteligente de tecnología con auto-asignación de máquina
  const setTecnologiaSegura = (tec: TecnologiaFabricacion) => {
    setTecnologia(tec);
    if (tec === 'FDM_FILAMENTO') {
      const fdmMaq = maquinas.find(m => 
        m.tecnologia === 'FDM_FILAMENTO' || 
        m.nombre.toLowerCase().includes('bambu') || 
        m.nombre.toLowerCase().includes('p1s') || 
        m.nombre.toLowerCase().includes('p2s') || 
        m.nombre.toLowerCase().includes('kobra') ||
        (m.tipo || '').toLowerCase().includes('fdm')
      );
      if (fdmMaq) {
        setMaquinaId(fdmMaq.id);
      }
      if (filamentos.length > 0) {
        if (!filamentoId || !filamentos.some(f => f.id === filamentoId)) {
          setFilamentoId(filamentos[0].id);
        }
      }
    } else if (tec === 'SLA_RESINA') {
      const slaMaq = maquinas.find(m => 
        m.tecnologia === 'SLA_RESINA' || 
        m.nombre.toLowerCase().includes('mono 4') || 
        m.nombre.toLowerCase().includes('mono') || 
        m.nombre.toLowerCase().includes('photon') ||
        (m.tipo || '').toLowerCase().includes('resina')
      );
      if (slaMaq) {
        setMaquinaId(slaMaq.id);
      }
    }
  };

  // Parámetros Láser CO2
  const [materialLamina, setMaterialLamina] = useState<string>(piezaEnEdicion?.material_lamina || 'Acrílico Cristal 3mm');
  const [espesorLaminaMm, setEspesorLaminaMm] = useState<number>(piezaEnEdicion?.espesor_lamina_mm || 3);
  const [longitudCorteMm, setLongitudCorteMm] = useState<number>(1200);
  const [costoMetroCuadradoLamina, setCostoMetroCuadradoLamina] = useState<number>(110000);
  const [tiempoLaserMin, setTiempoLaserMin] = useState<number>(piezaEnEdicion?.tiempo_laser_min || 15);
  const [tipoProcesoLaser, setTipoProcesoLaser] = useState<'corte' | 'grabado' | 'ambos'>(piezaEnEdicion?.tipo_proceso_laser || 'corte');

  // Parámetros Router CNC
  const [materialBloque, setMaterialBloque] = useState<string>(piezaEnEdicion?.material_bloque || 'Madera Cedro / MDF');
  const [costoBloqueMaterial, setCostoBloqueMaterial] = useState<number>(35000);
  const [tiempoMecanizadoMin, setTiempoMecanizadoMin] = useState<number>(piezaEnEdicion?.tiempo_mecanizado_min || 45);

  // Sincronizar datos iniciales desde el visor STL
  useEffect(() => {
    if (initialPieceData) {
      if (initialPieceData.altoMm) setAltoMm(initialPieceData.altoMm);
      if (initialPieceData.anchoMm) setAnchoMm(initialPieceData.anchoMm);
      if (initialPieceData.profundidadMm) setProfundidadMm(initialPieceData.profundidadMm);
      if (initialPieceData.nombrePieza) setNombreItem(initialPieceData.nombrePieza);
      if (initialPieceData.imagenUrl) {
        setImagenUrl(initialPieceData.imagenUrl);
        setTipoOrigenImagen('stl');
      }
      if (initialPieceData.tipoEstructura) setTipoEstructura(initialPieceData.tipoEstructura);
      if (initialPieceData.porcentajeRelleno !== undefined) setPorcentajeRelleno(initialPieceData.porcentajeRelleno);
      if (initialPieceData.pesoResinaG && initialPieceData.pesoResinaG > 0) {
        setModoCalculoResina('manual');
        setPesoResinaManualG(initialPieceData.pesoResinaG);
      }
    }
  }, [initialPieceData]);

  // Cargar datos completos (100% de hidratación) si se está editando una pieza
  useEffect(() => {
    if (piezaEnEdicion) {
      setNombreItem(piezaEnEdicion.nombre_item || 'Figura Coleccionable 3D');
      setCantidad(piezaEnEdicion.cantidad || 1);
      setAltoMm(piezaEnEdicion.alto_mm ?? 100);
      setAnchoMm(piezaEnEdicion.ancho_mm ?? 60);
      setProfundidadMm(piezaEnEdicion.profundidad_mm ?? 60);
      setTecnologia(piezaEnEdicion.tecnologia || 'SLA_RESINA');

      if (piezaEnEdicion.filamento_id) {
        setFilamentoId(piezaEnEdicion.filamento_id);
      }
      if (piezaEnEdicion.material_filamento) {
        setMaterialFilamento(piezaEnEdicion.material_filamento);
      }
      if (piezaEnEdicion.peso_filamento_g !== undefined) {
        setPesoFilamentoG(piezaEnEdicion.peso_filamento_g);
      } else if (piezaEnEdicion.tecnologia === 'FDM_FILAMENTO' && piezaEnEdicion.peso_estimado_g !== undefined) {
        setPesoFilamentoG(piezaEnEdicion.peso_estimado_g);
      }
      if (piezaEnEdicion.costo_filamento_kg !== undefined) {
        setCostoRolloKg(piezaEnEdicion.costo_filamento_kg);
      }
      if (piezaEnEdicion.tiempo_impresion_min !== undefined && piezaEnEdicion.tiempo_impresion_min > 0) {
        setTiempoFDMMin(piezaEnEdicion.tiempo_impresion_min);
        setTiempoImpresionManualMin(piezaEnEdicion.tiempo_impresion_min);
        setTiempoImpresionModo(piezaEnEdicion.tiempo_impresion_modo || 'auto');
      } else {
        setTiempoImpresionModo('auto');
      }

      if (piezaEnEdicion.merma_porcentaje !== undefined) {
        if (piezaEnEdicion.tecnologia === 'FDM_FILAMENTO') {
          setMermaPorcentajeFdm(piezaEnEdicion.merma_porcentaje);
        } else {
          setMermaPorcentajeResina(piezaEnEdicion.merma_porcentaje);
        }
      }

      if (piezaEnEdicion.material_lamina) setMaterialLamina(piezaEnEdicion.material_lamina);
      if (piezaEnEdicion.espesor_lamina_mm) setEspesorLaminaMm(piezaEnEdicion.espesor_lamina_mm);
      if (piezaEnEdicion.tiempo_laser_min) setTiempoLaserMin(piezaEnEdicion.tiempo_laser_min);
      if (piezaEnEdicion.tipo_proceso_laser) setTipoProcesoLaser(piezaEnEdicion.tipo_proceso_laser);
      if (piezaEnEdicion.material_bloque) setMaterialBloque(piezaEnEdicion.material_bloque);
      if (piezaEnEdicion.tiempo_mecanizado_min) setTiempoMecanizadoMin(piezaEnEdicion.tiempo_mecanizado_min);
      if (piezaEnEdicion.resina_id) setResinaId(piezaEnEdicion.resina_id);
      if (piezaEnEdicion.maquina_id) setMaquinaId(piezaEnEdicion.maquina_id);

      setModoCalculoResina(piezaEnEdicion.modo_calculo_resina || 'volumen');
      if (piezaEnEdicion.gramos_resina_manual !== undefined && piezaEnEdicion.gramos_resina_manual > 0) {
        setPesoResinaManualG(piezaEnEdicion.gramos_resina_manual);
      } else if (piezaEnEdicion.peso_estimado_g !== undefined && piezaEnEdicion.peso_estimado_g > 0) {
        setPesoResinaManualG(piezaEnEdicion.peso_estimado_g);
      }

      setTipoEstructura(piezaEnEdicion.tipo_estructura || 'solido');
      setPorcentajeRelleno(piezaEnEdicion.porcentaje_relleno ?? 35);

      if (piezaEnEdicion.imagen_url) {
        setImagenUrl(piezaEnEdicion.imagen_url);
        setTipoOrigenImagen('archivo');
      } else {
        setImagenUrl('');
        setTipoOrigenImagen(null);
      }

      setEsParcial(Boolean(piezaEnEdicion.datos_pendientes));
      if (piezaEnEdicion.notas_pendientes) setNotasPendientes(piezaEnEdicion.notas_pendientes);

      setVaPintado(Boolean(piezaEnEdicion.va_pintado));
      setTiempoDesarrolloMin(piezaEnEdicion.tiempo_desarrollo_min ?? 30);
      setTiempoArmadoMin(piezaEnEdicion.tiempo_armado_min ?? 15);
      setTiempoPinturaMin(piezaEnEdicion.tiempo_pintura_min ?? 0);

      // Restaurar Curado y Compresor
      const curadoProc = piezaEnEdicion.maquinas_involucradas?.find(m => m.proceso === 'Lavado y Curado UV');
      if (piezaEnEdicion.requiere_curado !== undefined) {
        setRequiereCurado(piezaEnEdicion.requiere_curado);
      } else if (piezaEnEdicion.maquinas_involucradas) {
        setRequiereCurado(Boolean(curadoProc));
      }
      if (piezaEnEdicion.curado_maquina_id) {
        setCuradoId(piezaEnEdicion.curado_maquina_id);
      } else if (curadoProc?.maquina_id) {
        setCuradoId(curadoProc.maquina_id);
      }
      if (piezaEnEdicion.tiempo_curado_min !== undefined) {
        setTiempoCuradoMin(piezaEnEdicion.tiempo_curado_min);
      } else if (curadoProc?.tiempo_min !== undefined) {
        setTiempoCuradoMin(curadoProc.tiempo_min);
      }
      setTiempoCuradoPersonalizado(Boolean(piezaEnEdicion.tiempo_curado_personalizado));

      const compProc = piezaEnEdicion.maquinas_involucradas?.find(m => m.proceso === 'Pintura y Aerografía');
      if (piezaEnEdicion.requiere_compresor_pintura !== undefined) {
        setRequiereCompresorPintura(piezaEnEdicion.requiere_compresor_pintura);
      } else if (piezaEnEdicion.maquinas_involucradas) {
        setRequiereCompresorPintura(Boolean(compProc));
      }
      if (piezaEnEdicion.compresor_maquina_id) {
        setCompresorId(piezaEnEdicion.compresor_maquina_id);
      } else if (compProc?.maquina_id) {
        setCompresorId(compProc.maquina_id);
      }
      if (piezaEnEdicion.tiempo_compresor_min !== undefined) {
        setTiempoCompresorMin(piezaEnEdicion.tiempo_compresor_min);
      } else if (compProc?.tiempo_min !== undefined) {
        setTiempoCompresorMin(compProc.tiempo_min);
      }
      if (piezaEnEdicion.tiempo_compresor_sincronizado !== undefined) {
        setTiempoCompresorSincronizado(piezaEnEdicion.tiempo_compresor_sincronizado);
      }

      // Restaurar Costos, Márgenes y Tarifas
      setCostoModeloComprado(piezaEnEdicion.costo_modelo_comprado ?? 0);
      if (piezaEnEdicion.margen_ganancia !== undefined) {
        setMargenGanancia(piezaEnEdicion.margen_ganancia);
      }
      if (piezaEnEdicion.precio_fijado_tarifa && piezaEnEdicion.tarifa_tamano_aplicada) {
        setPrecioFijadoTarifa(true);
        setTarifaAplicada(piezaEnEdicion.tarifa_tamano_aplicada);
        setPrecioUnitarioManual(piezaEnEdicion.tarifa_tamano_aplicada.precio_sugerido || piezaEnEdicion.precio_unitario);
      } else if (piezaEnEdicion.precio_fijado_tarifa) {
        setPrecioFijadoTarifa(true);
        setTarifaAplicada(null);
        setPrecioUnitarioManual(piezaEnEdicion.precio_unitario_original || piezaEnEdicion.precio_unitario);
      } else {
        setPrecioFijadoTarifa(false);
        setTarifaAplicada(null);
        setPrecioUnitarioManual(0);
      }

      setAplicaDescuentoVolumen(piezaEnEdicion.aplica_descuento_volumen ?? true);
      setDescuentoVolumenManual(piezaEnEdicion.descuento_volumen_porcentaje);

      // Restaurar Pinturas
      if (Array.isArray(piezaEnEdicion.lista_pinturas)) {
        setPinturasSeleccionadas(piezaEnEdicion.lista_pinturas.map((p, idx) => {
          const matchIns = insumos.find(i => i.id === p.insumo_id || i.nombre.toLowerCase().trim() === (p.nombre || '').toLowerCase().trim());
          return {
            tempId: `p-edit-${Date.now()}-${idx}`,
            insumoId: matchIns?.id || p.insumo_id || '',
            cantidadMl: Number(p.cantidad_ml) || 0
          };
        }));
      } else {
        setPinturasSeleccionadas([]);
      }

      // Restaurar Herrajes / Insumos Porcionados y Porcentuales
      if (Array.isArray(piezaEnEdicion.lista_accesorios)) {
        setHerrajesSeleccionados(piezaEnEdicion.lista_accesorios.map((a, idx) => {
          const matchIns = insumos.find(i => i.id === a.insumo_id || i.nombre.toLowerCase().trim() === (a.nombre || '').toLowerCase().trim());
          const modo = a.modo_consumo || 'unidad';
          const cant = Number(a.cantidad) || 0;
          const val = a.valor_entrada !== undefined ? Number(a.valor_entrada) : (modo === 'porcentaje' ? Number((cant * 100).toFixed(2)) : cant);
          return {
            tempId: `h-edit-${Date.now()}-${idx}`,
            insumoId: matchIns?.id || a.insumo_id || '',
            cantidad: cant,
            modoConsumo: modo,
            valorEntrada: val
          };
        }));
      } else {
        setHerrajesSeleccionados([]);
      }

      // Restaurar Empaques
      if (Array.isArray(piezaEnEdicion.lista_empaques)) {
        setEmpaquesSeleccionados(piezaEnEdicion.lista_empaques.map((e, idx) => {
          const matchIns = insumos.find(i => i.id === e.insumo_id || i.nombre.toLowerCase().trim() === (e.nombre || '').toLowerCase().trim());
          return {
            tempId: `emp-edit-${Date.now()}-${idx}`,
            insumoId: matchIns?.id || e.insumo_id || '',
            cantidad: Number(e.cantidad) || 1
          };
        }));
      } else {
        setEmpaquesSeleccionados([]);
      }

      if (piezaEnEdicion.enlaces_compra && piezaEnEdicion.enlaces_compra.length > 0) {
        setEnlacesCompra(piezaEnEdicion.enlaces_compra.map((enl, idx) => ({
          tempId: enl.id || `enl-${Date.now()}-${idx}`,
          titulo: enl.titulo || 'Modelo 3D',
          url: enl.url || '',
          costoEstimado: enl.costo_estimado || 0
        })));
      } else {
        setEnlacesCompra([]);
      }

      if (piezaEnEdicion.maquinas_involucradas) {
        const extras: ItemMaquinaExtraForm[] = piezaEnEdicion.maquinas_involucradas
          .filter(m => m.proceso !== 'Impresión 3D' && m.proceso !== 'Lavado y Curado UV' && m.proceso !== 'Pintura y Aerografía')
          .map((m, idx) => ({
            tempId: `extra-${Date.now()}-${idx}`,
            maquinaId: m.maquina_id,
            proceso: m.proceso,
            tiempoMin: m.tiempo_min,
            mostrarEnCliente: Boolean(m.mostrar_en_cliente)
          }));
        setMaquinasAdicionales(extras);
      } else {
        setMaquinasAdicionales([]);
      }
    }
  }, [piezaEnEdicion]);

  // Modo de Cotización Parcial / Pendiente de Slicer
  const [esParcial, setEsParcial] = useState(false);
  const [notasPendientes, setNotasPendientes] = useState('Pendiente abrir software 3D (Chitubox/Lychee) para medidas y resina exactas');

  // Modo de cálculo de resina: 'volumen' o 'manual'
  const [modoCalculoResina, setModoCalculoResina] = useState<'volumen' | 'manual'>('volumen');
  const [pesoResinaManualG, setPesoResinaManualG] = useState<number>(85);

  const [resinaId, setResinaId] = useState(resinas[0]?.id || '');

  // 1. Impresora 3D Principal
  const [maquinaId, setMaquinaId] = useState(maquinas[0]?.id || '');
  const [tiempoImpresionModo, setTiempoImpresionModo] = useState<'auto' | 'manual'>('auto');
  const [tiempoImpresionManualMin, setTiempoImpresionManualMin] = useState<number>(120);

  // Selección inteligente de Maquinaria con Adaptación Automática de Tecnología
  const handleSelectMaquina = (mId: string) => {
    setMaquinaId(mId);
    const selectedMaq = maquinas.find(m => m.id === mId);
    if (selectedMaq) {
      if (selectedMaq.tecnologia) {
        setTecnologia(selectedMaq.tecnologia);
      } else {
        const nom = (selectedMaq.nombre + ' ' + selectedMaq.tipo).toLowerCase();
        if (nom.includes('fdm') || nom.includes('filamento') || nom.includes('bambu') || nom.includes('kobra') || nom.includes('ender')) {
          setTecnologia('FDM_FILAMENTO');
        } else if (nom.includes('laser') || nom.includes('láser')) {
          setTecnologia('CORTE_LASER');
        } else if (nom.includes('cnc') || nom.includes('router')) {
          setTecnologia('CNC_ROUTER');
        } else {
          setTecnologia('SLA_RESINA');
        }
      }
    }
  };

  // 2. Lavado y Curado UV (Wash & Cure)
  const defaultCuradoMaq = maquinas.find(m => m.tipo.toLowerCase().includes('curad')) || maquinas[1] || maquinas[0];
  const [requiereCurado, setRequiereCurado] = useState(true);
  const [curadoId, setCuradoId] = useState(defaultCuradoMaq?.id || '');
  const [tiempoCuradoMin, setTiempoCuradoMin] = useState<number>(10);
  const [tiempoCuradoPersonalizado, setTiempoCuradoPersonalizado] = useState(false);

  // 3. Pintura & Aerógrafo (Compresor)
  const defaultCompresor = maquinas.find(m => m.tipo.toLowerCase().includes('aer') || m.nombre.toLowerCase().includes('compresor')) || maquinas[2] || maquinas[0];
  const [requiereCompresorPintura, setRequiereCompresorPintura] = useState(false);
  const [compresorId, setCompresorId] = useState(defaultCompresor?.id || '');
  const [tiempoCompresorMin, setTiempoCompresorMin] = useState<number>(60);
  const [tiempoCompresorSincronizado, setTiempoCompresorSincronizado] = useState(true);

  // 4. Máquinas y Procesos Adicionales Dinámicos
  const [maquinasAdicionales, setMaquinasAdicionales] = useState<ItemMaquinaExtraForm[]>([]);

  // 5. Enlaces de Referencia de Compra (Uso Interno del Taller)
  const [enlacesCompra, setEnlacesCompra] = useState<ItemEnlaceCompraForm[]>([]);

  const [tiempoDesarrolloMin, setTiempoDesarrolloMin] = useState(30);
  const [tiempoArmadoMin, setTiempoArmadoMin] = useState(15);
  const [tiempoPinturaMin, setTiempoPinturaMin] = useState(60);

  // Lista dinámica de Pinturas
  const [pinturasSeleccionadas, setPinturasSeleccionadas] = useState<ItemPinturaForm[]>([
    { tempId: 'p-1', insumoId: insumos.find(i => i.categoria.toLowerCase().includes('pintura'))?.id || '', cantidadMl: 30 }
  ]);

  // Lista dinámica de Herrajes / Insumos adicionales
  const [herrajesSeleccionados, setHerrajesSeleccionados] = useState<ItemAccesorioForm[]>([]);

  // Estado de Acabado de Pintura (Pintado Sí / No)
  const [vaPintado, setVaPintado] = useState(true);

  // Lista dinámica de Empaques de la Pieza
  const [empaquesSeleccionados, setEmpaquesSeleccionados] = useState<ItemEmpaqueForm[]>([]);

  const [costoModeloComprado, setCostoModeloComprado] = useState(0);
  const [margenGanancia, setMargenGanancia] = useState(0.40); // 40%
  const [aplicaDescuentoVolumen, setAplicaDescuentoVolumen] = useState<boolean>(piezaEnEdicion?.aplica_descuento_volumen ?? true);
  const [descuentoVolumenManual, setDescuentoVolumenManual] = useState<number | undefined>(piezaEnEdicion?.descuento_volumen_porcentaje);
  const [imagenUrl, setImagenUrl] = useState<string>('');
  const [tipoOrigenImagen, setTipoOrigenImagen] = useState<'archivo' | 'stl' | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);

  // Selecciones activas
  const resinaActual = resinas.find(r => r.id === resinaId) || resinas[0];
  const maquinaActual = maquinas.find(m => m.id === maquinaId) || maquinas[0];
  const estacionCurado = maquinas.find(m => m.id === curadoId) || defaultCuradoMaq;
  const maquinaCompresor = maquinas.find(m => m.id === compresorId) || defaultCompresor;
  const insumoCurado = insumos.find(i => i.nombre.toLowerCase().includes('etanol') || i.nombre.toLowerCase().includes('alcohol'));

  // Manejo de imagen optimizada
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor selecciona un archivo de imagen válido (PNG, JPG o WebP).');
      return;
    }
    setIsOptimizingImage(true);
    try {
      const optimized = await processAndOptimizeImage(file, 800, 800, 0.85);
      setImagenUrl(optimized);
      setTipoOrigenImagen('archivo');
    } catch (err) {
      console.error('Error optimizando imagen:', err);
    } finally {
      setIsOptimizingImage(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleRemoverImagen = () => {
    setImagenUrl('');
    setTipoOrigenImagen(null);
  };

  // Pegar imágenes con Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            toast.success('Imagen pegada desde el portapapeles.');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Handlers para Pinturas
  const handleAddPintura = () => {
    const defaultPintura = insumos.find(i => i.categoria.toLowerCase().includes('pintura'));
    setPinturasSeleccionadas(prev => [
      ...prev,
      { tempId: `p-${Date.now()}`, insumoId: defaultPintura?.id || '', cantidadMl: 20 }
    ]);
    setRequiereCompresorPintura(true);
  };

  const handleRemovePintura = (tempId: string) => {
    setPinturasSeleccionadas(prev => prev.filter(p => p.tempId !== tempId));
  };

  const handleUpdatePintura = (tempId: string, field: 'insumoId' | 'cantidadMl', val: any) => {
    setPinturasSeleccionadas(prev => prev.map(p => p.tempId === tempId ? { ...p, [field]: val } : p));
  };

  // Handlers para Herrajes / Insumos Porcionados y Porcentuales
  const handleAddHerraje = (presetModo?: 'unidad' | 'porcentaje', presetVal?: number) => {
    const defaultHerraje = insumos.find(i => !i.categoria.toLowerCase().includes('pintura'));
    const defaultModo: 'unidad' | 'porcentaje' = presetModo || (defaultHerraje?.permite_fraccion ? 'porcentaje' : 'unidad');
    const defaultVal = presetVal !== undefined ? presetVal : (defaultModo === 'porcentaje' ? 10 : 1);
    const defaultCant = defaultModo === 'porcentaje' ? Number((defaultVal / 100).toFixed(4)) : defaultVal;
    setHerrajesSeleccionados(prev => [
      ...prev,
      {
        tempId: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        insumoId: defaultHerraje?.id || '',
        cantidad: defaultCant,
        modoConsumo: defaultModo,
        valorEntrada: defaultVal
      }
    ]);
  };

  const handleRemoveHerraje = (tempId: string) => {
    setHerrajesSeleccionados(prev => prev.filter(h => h.tempId !== tempId));
  };

  const handleUpdateHerraje = (
    tempId: string,
    field: 'insumoId' | 'cantidad' | 'modoConsumo' | 'valorEntrada',
    val: any
  ) => {
    setHerrajesSeleccionados(prev => prev.map(h => {
      if (h.tempId !== tempId) return h;
      if (field === 'modoConsumo') {
        const nuevoModo: 'unidad' | 'porcentaje' = val;
        const actualModo = h.modoConsumo || 'unidad';
        if (nuevoModo === actualModo) return h;
        const actualValor = h.valorEntrada !== undefined ? h.valorEntrada : h.cantidad;
        if (nuevoModo === 'porcentaje') {
          const nuevoPct = (actualValor > 0 && actualValor <= 1) ? Number((actualValor * 100).toFixed(2)) : 10;
          return { ...h, modoConsumo: 'porcentaje', valorEntrada: nuevoPct, cantidad: Number((nuevoPct / 100).toFixed(4)) };
        } else {
          const nuevaFracc = actualValor > 0 ? Number((actualValor / 100).toFixed(4)) : 0.2;
          return { ...h, modoConsumo: 'unidad', valorEntrada: nuevaFracc, cantidad: nuevaFracc };
        }
      }
      if (field === 'valorEntrada' || field === 'cantidad') {
        const numVal = Math.max(0, Number(val) || 0);
        const modo = h.modoConsumo || 'unidad';
        const cantEquiv = modo === 'porcentaje' ? Number((numVal / 100).toFixed(4)) : numVal;
        return { ...h, valorEntrada: numVal, cantidad: cantEquiv };
      }
      if (field === 'insumoId') {
        const ins = insumos.find(i => i.id === val);
        const esCintaOPorcionado = ins?.permite_fraccion || (ins?.nombre || '').toLowerCase().includes('cinta');
        if (esCintaOPorcionado && (!h.valorEntrada || h.valorEntrada === 1)) {
          return { ...h, insumoId: val, modoConsumo: 'porcentaje', valorEntrada: 10, cantidad: 0.1 };
        }
        return { ...h, insumoId: val };
      }
      return { ...h, [field]: val };
    }));
  };

  // Handlers para Máquinas y Procesos Adicionales
  const handleAddMaquinaAdicional = () => {
    const defaultExtra = maquinas.find(m => m.id !== maquinaId && m.id !== curadoId) || maquinas[0];
    setMaquinasAdicionales(prev => [
      ...prev,
      {
        tempId: `maq-extra-${Date.now()}`,
        maquinaId: defaultExtra?.id || '',
        proceso: '',
        tiempoMin: 15,
        mostrarEnCliente: false
      }
    ]);
  };

  const handleRemoveMaquinaAdicional = (tempId: string) => {
    setMaquinasAdicionales(prev => prev.filter(m => m.tempId !== tempId));
  };

  const handleUpdateMaquinaAdicional = (tempId: string, field: keyof ItemMaquinaExtraForm, val: any) => {
    setMaquinasAdicionales(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: val } : m));
  };

  // Handlers para Empaques
  const handleAddEmpaque = () => {
    const defaultEmpaque = insumos.find(i => i.categoria.toLowerCase().includes('empaque'));
    setEmpaquesSeleccionados(prev => [
      ...prev,
      { tempId: `emp-${Date.now()}`, insumoId: defaultEmpaque?.id || '', cantidad: 1 }
    ]);
  };

  const handleRemoveEmpaque = (tempId: string) => {
    setEmpaquesSeleccionados(prev => prev.filter(e => e.tempId !== tempId));
  };

  const handleUpdateEmpaque = (tempId: string, field: 'insumoId' | 'cantidad', val: any) => {
    setEmpaquesSeleccionados(prev => prev.map(e => e.tempId === tempId ? { ...e, [field]: val } : e));
  };

  // Handlers para Enlaces de Compra
  const handleAddEnlaceCompra = () => {
    setEnlacesCompra(prev => [
      ...prev,
      {
        tempId: `enl-${Date.now()}`,
        titulo: '',
        url: '',
        costoEstimado: 0
      }
    ]);
  };

  const handleRemoveEnlaceCompra = (tempId: string) => {
    setEnlacesCompra(prev => prev.filter(e => e.tempId !== tempId));
  };

  const handleUpdateEnlaceCompra = (tempId: string, field: keyof ItemEnlaceCompraForm, val: any) => {
    setEnlacesCompra(prev => prev.map(e => {
      if (e.tempId !== tempId) return e;
      const updated = { ...e, [field]: val };
      if (field === 'url' && val && !e.titulo) {
        const detected = detect3DPlatform(val);
        if (detected.name !== 'Enlace Web') {
          updated.titulo = detected.name;
        }
      }
      return updated;
    }));
  };

  // Aplicar tarifa estándar
  const handleAplicarTarifa = (tarifa: TarifaTamano) => {
    setAltoMm(tarifa.altura_cm * 10);
    setAnchoMm(Math.round(tarifa.altura_cm * 10 * 0.6));
    setProfundidadMm(Math.round(tarifa.altura_cm * 10 * 0.6));
    setPrecioFijadoTarifa(true);
    setTarifaAplicada({
      altura_cm: tarifa.altura_cm,
      precio_sugerido: tarifa.precio_sugerido
    });
    setPrecioUnitarioManual(tarifa.precio_sugerido);
    setShowTarifarioModal(false);
  };

  const handleQuitarTarifa = () => {
    setPrecioFijadoTarifa(false);
    setTarifaAplicada(null);
    setPrecioUnitarioManual(0);
  };

  // Insumos filtrados
  const insumosPinturas = useMemo(() => {
    return insumos.filter(i => i.categoria.toLowerCase().includes('pintura'));
  }, [insumos]);

  const insumosHerrajes = useMemo(() => {
    return insumos.filter(i => 
      !i.categoria.toLowerCase().includes('pintura')
    );
  }, [insumos]);

  const insumosEmpaques = useMemo(() => {
    return insumos.filter(i => i.categoria.toLowerCase().includes('empaque'));
  }, [insumos]);

  // Cálculo en Vivo de la Pieza
  const calculoEnVivo = useMemo(() => {
    if (!resinaActual || !maquinaActual) return null;

    const pinturasValidas = pinturasSeleccionadas
      .map(p => {
        const ins = insumos.find(i => i.id === p.insumoId);
        return ins ? { insumo: ins, cantidad_ml: Number(p.cantidadMl) || 0 } : null;
      })
      .filter((p): p is { insumo: Insumo; cantidad_ml: number } => p !== null && p.cantidad_ml > 0);

    const accesoriosValidos = herrajesSeleccionados
      .map(h => {
        const ins = insumos.find(i => i.id === h.insumoId);
        if (!ins) return null;
        const modo: 'unidad' | 'porcentaje' = h.modoConsumo || 'unidad';
        const val = h.valorEntrada !== undefined ? Number(h.valorEntrada) : Number(h.cantidad);
        const cant = modo === 'porcentaje' ? (val / 100) : val;
        return cant > 0 ? { insumo: ins, cantidad: cant, modo_consumo: modo, valor_entrada: val } : null;
      })
      .filter((h): h is { insumo: Insumo; cantidad: number; modo_consumo: 'unidad' | 'porcentaje'; valor_entrada: number } => h !== null);

    const empaquesValidos = empaquesSeleccionados
      .map(e => {
        const ins = insumos.find(i => i.id === e.insumoId);
        return ins ? { insumo: ins, cantidad: Number(e.cantidad) || 0 } : null;
      })
      .filter((e): e is { insumo: Insumo; cantidad: number } => e !== null && e.cantidad > 0);

    const maquinasExtrasValidas = maquinasAdicionales
      .map(item => {
        const maq = maquinas.find(m => m.id === item.maquinaId);
        const procesoLimpio = item.proceso.trim();
        const esVisibleCliente = Boolean(item.mostrarEnCliente) && 
          procesoLimpio !== '' && 
          !procesoLimpio.toLowerCase().includes('proceso adicional') &&
          !procesoLimpio.toLowerCase().includes('proceso extra');

        return maq ? { 
          maquina: maq, 
          proceso: procesoLimpio || maq.nombre, 
          tiempo_min: Number(item.tiempoMin) || 0,
          mostrar_en_cliente: esVisibleCliente
        } : null;
      })
      .filter((item): item is { maquina: Maquina; proceso: string; tiempo_min: number; mostrar_en_cliente: boolean } => item !== null && item.tiempo_min > 0);

    const enlacesValidos = enlacesCompra
      .filter(l => l.url.trim() || l.titulo.trim())
      .map(l => ({
        id: l.tempId,
        titulo: l.titulo.trim() || detect3DPlatform(l.url).name,
        url: formatExternalUrl(l.url),
        costo_estimado: Number(l.costoEstimado) || undefined
      }));

    const input: ParametrosPiezaInput = {
      nombre_item: nombreItem,
      cantidad,
      alto_mm: Number(altoMm) || 1,
      ancho_mm: Number(anchoMm) || 1,
      profundidad_mm: Number(profundidadMm) || 1,
      resina: resinaActual,
      impresora: maquinaActual,
      tecnologia,
      filamentoSeleccionado: filamentoActual,
      mermaPorcentajeFdm,
      mermaPorcentajeResina,
      materialFilamento,
      pesoFilamentoG: Number(pesoFilamentoG) || 45,
      costoRolloKg: filamentoActual ? Math.round(filamentoActual.costo_gramo * 1000) : (Number(costoRolloKg) || 85000),
      tiempoFDMMin: Number(tiempoFDMMin) || 180,
      materialLamina,
      espesorLaminaMm: Number(espesorLaminaMm) || 3,
      longitudCorteMm: Number(longitudCorteMm) || 1200,
      costoMetroCuadradoLamina: Number(costoMetroCuadradoLamina) || 110000,
      tiempoLaserMin: Number(tiempoLaserMin) || 15,
      tipoProcesoLaser,
      materialBloque,
      costoBloqueMaterial: Number(costoBloqueMaterial) || 35000,
      tiempoMecanizadoMin: Number(tiempoMecanizadoMin) || 45,
      tiempoImpresionManualMin: tiempoImpresionModo === 'manual' ? Number(tiempoImpresionManualMin) : undefined,
      tiempoImpresionModo,
      requiereCurado,
      estacionCurado,
      tiempoCuradoMin: tiempoCuradoPersonalizado ? Number(tiempoCuradoMin) : undefined,
      tiempoCuradoPersonalizado,
      insumoCurado,
      requiereCompresorPintura: vaPintado ? requiereCompresorPintura : false,
      maquinaPintura: maquinaCompresor,
      tiempoCompresorMin: tiempoCompresorSincronizado ? Number(tiempoPinturaMin) : Number(tiempoCompresorMin) || 0,
      tiempoCompresorSincronizado,
      maquinasAdicionales: maquinasExtrasValidas,
      enlacesCompra: enlacesValidos,
      tiempoDesarrolloMin: Number(tiempoDesarrolloMin) || 0,
      tiempoArmadoMin: Number(tiempoArmadoMin) || 0,
      tiempoPinturaMin: vaPintado ? Number(tiempoPinturaMin) || 0 : 0,
      pinturas: vaPintado ? pinturasValidas : [],
      accesorios: accesoriosValidos,
      empaques: empaquesValidos,
      vaPintadoManual: vaPintado,
      costoModeloComprado: Number(costoModeloComprado) || 0,
      margenGanancia: Number(margenGanancia) || 0.40,
      imagen_url: imagenUrl,
      modoCalculoResina,
      tipoEstructura,
      porcentajeRelleno,
      pesoResinaManualG: Number(pesoResinaManualG) || 0,
      datosPendientes: esParcial,
      notasPendientes,
      precioUnitarioManual: precioFijadoTarifa ? precioUnitarioManual : undefined,
      tarifaTamanoAplicada: precioFijadoTarifa && tarifaAplicada ? tarifaAplicada : undefined,
      precioFijadoTarifa,
      aplicaDescuentoVolumen,
      descuentoVolumenPorcentaje: descuentoVolumenManual
    };

    return calcularCotizacionIntegral(input, personal, config);
  }, [
    nombreItem,
    cantidad,
    altoMm,
    anchoMm,
    profundidadMm,
    esParcial,
    notasPendientes,
    modoCalculoResina,
    tipoEstructura,
    porcentajeRelleno,
    pesoResinaManualG,
    resinaActual,
    maquinaActual,
    tiempoImpresionModo,
    tiempoImpresionManualMin,
    requiereCurado,
    curadoId,
    estacionCurado,
    tiempoCuradoMin,
    tiempoCuradoPersonalizado,
    insumoCurado,
    requiereCompresorPintura,
    compresorId,
    maquinaCompresor,
    tiempoCompresorMin,
    tiempoCompresorSincronizado,
    maquinasAdicionales,
    enlacesCompra,
    tiempoDesarrolloMin,
    tiempoArmadoMin,
    tiempoPinturaMin,
    vaPintado,
    pinturasSeleccionadas,
    herrajesSeleccionados,
    empaquesSeleccionados,
    costoModeloComprado,
    margenGanancia,
    aplicaDescuentoVolumen,
    descuentoVolumenManual,
    imagenUrl,
    personal,
    config,
    insumos,
    maquinas,
    precioFijadoTarifa,
    precioUnitarioManual,
    tarifaAplicada,
    tecnologia,
    filamentoId,
    filamentoActual,
    mermaPorcentajeFdm,
    mermaPorcentajeResina,
    materialFilamento,
    pesoFilamentoG,
    costoRolloKg,
    tiempoFDMMin,
    materialLamina,
    espesorLaminaMm,
    longitudCorteMm,
    costoMetroCuadradoLamina,
    tiempoLaserMin,
    tipoProcesoLaser,
    materialBloque,
    costoBloqueMaterial,
    tiempoMecanizadoMin
  ]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!calculoEnVivo) return;
    const piezaFinal: PiezaCotizada = piezaEnEdicion
      ? { ...calculoEnVivo, id: piezaEnEdicion.id }
      : calculoEnVivo;
    onAgregarPieza(piezaFinal);
    setImagenUrl('');
    setTipoOrigenImagen(null);
    setPrecioFijadoTarifa(false);
    setTarifaAplicada(null);
    setPrecioUnitarioManual(0);
    setEnlacesCompra([]);
    setEmpaquesSeleccionados([]);
  };

  return {
    // Datos básicos
    nombreItem,
    setNombreItem,
    cantidad,
    setCantidad,
    altoMm,
    setAltoMm,
    anchoMm,
    setAnchoMm,
    profundidadMm,
    setProfundidadMm,
    esParcial,
    setEsParcial,
    notasPendientes,
    setNotasPendientes,

    // Resina y estructura
    modoCalculoResina,
    setModoCalculoResina,
    pesoResinaManualG,
    setPesoResinaManualG,
    tipoEstructura,
    setTipoEstructura,
    porcentajeRelleno,
    setPorcentajeRelleno,
    resinaId,
    setResinaId,
    resinaActual,

    // Filamentos y Mermas
    filamentos,
    filamentoId,
    setFilamentoId,
    filamentoActual,
    mermaPorcentajeFdm,
    setMermaPorcentajeFdm,
    mermaPorcentajeResina,
    setMermaPorcentajeResina,

    // Maquinaria principal
    maquinaId,
    setMaquinaId,
    handleSelectMaquina,
    maquinaActual,
    tiempoImpresionModo,
    setTiempoImpresionModo,
    tiempoImpresionManualMin,
    setTiempoImpresionManualMin,

    // Post-procesamiento
    requiereCurado,
    setRequiereCurado,
    curadoId,
    setCuradoId,
    estacionCurado,
    tiempoCuradoMin,
    setTiempoCuradoMin,
    tiempoCuradoPersonalizado,
    setTiempoCuradoPersonalizado,
    insumoCurado,

    // Pintura y compresor
    vaPintado,
    setVaPintado,
    tiempoPinturaMin,
    setTiempoPinturaMin,
    requiereCompresorPintura,
    setRequiereCompresorPintura,
    compresorId,
    setCompresorId,
    maquinaCompresor,
    tiempoCompresorMin,
    setTiempoCompresorMin,
    tiempoCompresorSincronizado,
    setTiempoCompresorSincronizado,

    // Mano de obra
    tiempoDesarrolloMin,
    setTiempoDesarrolloMin,
    tiempoArmadoMin,
    setTiempoArmadoMin,

    // Costos y márgenes
    costoModeloComprado,
    setCostoModeloComprado,
    margenGanancia,
    setMargenGanancia,

    // Multimedia e imagen
    imagenUrl,
    setImagenUrl,
    tipoOrigenImagen,
    isOptimizingImage,
    showImagePreviewModal,
    setShowImagePreviewModal,
    handleImageUpload,
    handleImageFile,
    handleRemoverImagen,

    // Tarifas y precios
    precioFijadoTarifa,
    tarifaAplicada,
    precioUnitarioManual,
    setPrecioUnitarioManual,
    showTarifarioModal,
    setShowTarifarioModal,
    showParametrosAvanzados,
    setShowParametrosAvanzados,
    handleAplicarTarifa,
    handleQuitarTarifa,

    // Listas dinámicas
    pinturasSeleccionadas,
    handleAddPintura,
    handleRemovePintura,
    handleUpdatePintura,
    insumosPinturas,

    herrajesSeleccionados,
    handleAddHerraje,
    handleRemoveHerraje,
    handleUpdateHerraje,
    insumosHerrajes,

    empaquesSeleccionados,
    handleAddEmpaque,
    handleRemoveEmpaque,
    handleUpdateEmpaque,
    insumosEmpaques,

    maquinasAdicionales,
    handleAddMaquinaAdicional,
    handleRemoveMaquinaAdicional,
    handleUpdateMaquinaAdicional,

    enlacesCompra,
    handleAddEnlaceCompra,
    handleRemoveEnlaceCompra,
    handleUpdateEnlaceCompra,

    // Descuento por volumen
    aplicaDescuentoVolumen,
    setAplicaDescuentoVolumen,
    descuentoVolumenManual,
    setDescuentoVolumenManual,

    // Multi-Fabricación Polimórfica
    tecnologia,
    setTecnologia: setTecnologiaSegura,
    materialFilamento,
    setMaterialFilamento,
    pesoFilamentoG,
    setPesoFilamentoG,
    costoRolloKg,
    setCostoRolloKg,
    tiempoFDMMin,
    setTiempoFDMMin,
    materialLamina,
    setMaterialLamina,
    espesorLaminaMm,
    setEspesorLaminaMm,
    longitudCorteMm,
    setLongitudCorteMm,
    costoMetroCuadradoLamina,
    setCostoMetroCuadradoLamina,
    tiempoLaserMin,
    setTiempoLaserMin,
    tipoProcesoLaser,
    setTipoProcesoLaser,
    materialBloque,
    setMaterialBloque,
    costoBloqueMaterial,
    setCostoBloqueMaterial,
    tiempoMecanizadoMin,
    setTiempoMecanizadoMin,

    // Cálculo y envío
    calculoEnVivo,
    handleSubmit
  };
}
