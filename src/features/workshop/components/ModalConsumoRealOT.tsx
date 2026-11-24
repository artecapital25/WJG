import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Paintbrush,
  Plus,
  Printer,
  Trash2,
  X
} from 'lucide-react';
import {
  ConsumoRealProduccion,
  Cotizacion,
  EtapaConsumoReal,
  Filamento,
  Insumo,
  InsumoRealConsumido,
  OrdenTrabajo,
  Personal,
  Resina,
  TecnologiaFabricacion
} from '../../../types';
import { WjgSelect } from '../../../components/ui/WjgSelect';
import { toast } from '../../../components/ui/ToastProvider';

interface ModalConsumoRealOTProps {
  isOpen: boolean;
  ot: OrdenTrabajo | null;
  cotizacion?: Cotizacion | null;
  resinas?: Resina[];
  filamentos?: Filamento[];
  insumos?: Insumo[];
  personal?: Personal[];
  consumosExistentes?: ConsumoRealProduccion[];
  activeOperator?: string;
  activeOperatorId?: string;
  onClose: () => void;
  onSaveConsumo: (registro: ConsumoRealProduccion, descontarInventario: boolean) => void;
  onDeleteConsumo?: (consumoId: string) => void;
}

interface FilaInsumoForm {
  tempId: string;
  insumoId: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  estabaCotizado: boolean;
}

const CHIPS_RAPIDOS_TALLER = [
  { label: '+ Guantes Nitrilo (par)', keyword: 'guant', defaultUnit: 'par', defaultQty: 1, defaultCost: 1200 },
  { label: '+ Alcohol IPA (ml)', keyword: 'alcohol', defaultUnit: 'ml', defaultQty: 40, defaultCost: 35 },
  { label: '+ Filtro Resina', keyword: 'filtro', defaultUnit: 'und', defaultQty: 1, defaultCost: 1500 },
  { label: '+ Papel / Servilletas', keyword: 'papel', defaultUnit: 'und', defaultQty: 2, defaultCost: 300 }
];

const CHIPS_RAPIDOS_PINTURA = [
  { label: '+ Primer / Base (ml)', keyword: 'primer', defaultUnit: 'ml', defaultQty: 15, defaultCost: 180 },
  { label: '+ Pintura Acrílica (ml)', keyword: 'pintura', defaultUnit: 'ml', defaultQty: 12, defaultCost: 220 },
  { label: '+ Barniz / Laca (ml)', keyword: 'barniz', defaultUnit: 'ml', defaultQty: 15, defaultCost: 200 },
  { label: '+ Guantes Pintura (par)', keyword: 'guant', defaultUnit: 'par', defaultQty: 1, defaultCost: 1200 }
];

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `cons-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export const ModalConsumoRealOT: React.FC<ModalConsumoRealOTProps> = ({
  isOpen,
  ot,
  cotizacion,
  resinas = [],
  filamentos = [],
  insumos = [],
  personal = [],
  consumosExistentes = [],
  activeOperator = 'Juan (Taller)',
  activeOperatorId,
  onClose,
  onSaveConsumo,
  onDeleteConsumo
}) => {
  const [etapa, setEtapa] = useState<EtapaConsumoReal>('TALLER_IMPRESION');
  const [materialId, setMaterialId] = useState<string>('');
  const [materialRealG, setMaterialRealG] = useState<number>(0);
  const [tiempoRealImpresionMin, setTiempoRealImpresionMin] = useState<number>(0);
  const [tiempoRealManoObraMin, setTiempoRealManoObraMin] = useState<number>(0);
  const [huboFallo, setHuboFallo] = useState<boolean>(false);
  const [piezasFallidas, setPiezasFallidas] = useState<number>(0);
  const [insumosConsumidos, setInsumosConsumidos] = useState<FilaInsumoForm[]>([]);
  const [descontarInventario, setDescontarInventario] = useState<boolean>(true);
  const [notas, setNotas] = useState<string>('');

  // Buscar pieza estimada dentro de la cotización vinculada
  const piezaCotizada = useMemo(() => {
    if (!ot || !cotizacion?.items?.length) return undefined;
    return (
      cotizacion.items.find(
        it => it.nombre_item?.toLowerCase().trim() === ot.item_nombre?.toLowerCase().trim()
      ) || cotizacion.items[0]
    );
  }, [ot, cotizacion]);

  const tecnologia: TecnologiaFabricacion = useMemo(() => {
    if (piezaCotizada?.tecnologia) return piezaCotizada.tecnologia;
    const matName = (ot?.resina_nombre || ot?.maquina_nombre || '').toLowerCase();
    if (matName.includes('pla') || matName.includes('petg') || matName.includes('fdm') || matName.includes('bambu') || matName.includes('ender')) {
      return 'FDM_FILAMENTO';
    }
    return 'SLA_RESINA';
  }, [ot, piezaCotizada]);

  const cantidadPiezas = ot?.cantidad || 1;
  const materialEstimadoTotalG = useMemo(() => {
    if (piezaCotizada) {
      return Math.round((piezaCotizada.peso_estimado_g || 0) * cantidadPiezas * 10) / 10;
    }
    return 0;
  }, [piezaCotizada, cantidadPiezas]);

  // Inicializar valores sugeridos al abrir la OT
  useEffect(() => {
    if (!isOpen || !ot) return;
    const estadoLower = (ot.estado || '').toLowerCase();
    const esEtapaPintura = estadoLower.includes('pint') || estadoLower.includes('post') || estadoLower.includes('acabad');
    setEtapa(esEtapaPintura ? 'PINTURA_ACABADOS' : 'TALLER_IMPRESION');

    if (tecnologia === 'FDM_FILAMENTO') {
      const fil =
        filamentos.find(f => f.id === piezaCotizada?.filamento_id) ||
        filamentos.find(f => (ot.resina_nombre || '').toLowerCase().includes((f.tipo || '').toLowerCase())) ||
        filamentos[0];
      setMaterialId(fil?.id || '');
    } else {
      const res =
        resinas.find(r => r.id === piezaCotizada?.resina_id) ||
        resinas.find(r => (ot.resina_nombre || '').toLowerCase().includes((r.tipo || '').toLowerCase())) ||
        resinas[0];
      setMaterialId(res?.id || '');
    }

    setMaterialRealG(materialEstimadoTotalG);
    setTiempoRealImpresionMin(ot.tiempo_impresion_min || 0);
    setTiempoRealManoObraMin(
      esEtapaPintura
        ? (ot.tiempo_pintura_min || 0) * cantidadPiezas
        : (ot.tiempo_armado_min || 0) * cantidadPiezas
    );
    setHuboFallo(false);
    setPiezasFallidas(0);
    setInsumosConsumidos([]);
    setDescontarInventario(true);
    setNotas('');
  }, [isOpen, ot?.id]);

  // Costos reales calculados en vivo
  const calculoReal = useMemo(() => {
    let costoGramoMat = 0;
    let materialNombre = ot?.resina_nombre || 'Material';

    if (tecnologia === 'FDM_FILAMENTO') {
      const f = filamentos.find(fl => fl.id === materialId);
      if (f) {
        costoGramoMat = f.costo_gramo || (f.precio_compra && f.peso_bobina_g ? f.precio_compra / f.peso_bobina_g : 0);
        materialNombre = `${f.marca} ${f.tipo} ${f.color}`.trim();
      }
    } else {
      const r = resinas.find(rs => rs.id === materialId);
      if (r) {
        costoGramoMat = r.costo_gramo || (r.precio_compra && r.peso_g ? r.precio_compra / r.peso_g : 0);
        materialNombre = `${r.marca} ${r.tipo} ${r.color}`.trim();
      }
    }

    const costoMaterialReal =
      etapa === 'TALLER_IMPRESION' ? Math.round((materialRealG || 0) * costoGramoMat) : 0;

    const costoInsumosReales = insumosConsumidos.reduce(
      (sum, item) => sum + Math.round((item.cantidad || 0) * (item.costoUnitario || 0)),
      0
    );

    const rolPintor =
      personal.find(p => p.rol.toLowerCase().includes('pint')) ||
      personal[1] ||
      personal[0];
    const rolTaller =
      personal.find(p => p.rol.toLowerCase().includes('impres') || p.rol.toLowerCase().includes('post') || p.rol.toLowerCase().includes('taller')) ||
      personal[0];
    const tarifaMoMin =
      etapa === 'PINTURA_ACABADOS'
        ? rolPintor?.costo_minuto || 150
        : rolTaller?.costo_minuto || 150;

    const costoManoObraReal = Math.round((tiempoRealManoObraMin || 0) * tarifaMoMin);
    const costoTotalReal = costoMaterialReal + costoInsumosReales + costoManoObraReal;

    const costoEstimadoRef = piezaCotizada
      ? Math.round((piezaCotizada.costo_base_produccion || 0) * cantidadPiezas)
      : 0;

    const acumuladoOtPrevio = consumosExistentes.reduce((s, c) => s + (c.costo_total_real || 0), 0);
    const desviacionCop = costoEstimadoRef > 0 ? acumuladoOtPrevio + costoTotalReal - costoEstimadoRef : 0;
    const desviacionPct =
      costoEstimadoRef > 0 ? Math.round((desviacionCop / costoEstimadoRef) * 1000) / 10 : 0;

    return {
      materialNombre,
      costoMaterialReal,
      costoInsumosReales,
      costoManoObraReal,
      costoTotalReal,
      costoEstimadoRef,
      desviacionCop,
      desviacionPct
    };
  }, [
    ot,
    etapa,
    tecnologia,
    materialId,
    materialRealG,
    insumosConsumidos,
    tiempoRealManoObraMin,
    filamentos,
    resinas,
    personal,
    piezaCotizada,
    cantidadPiezas,
    consumosExistentes
  ]);

  if (!isOpen || !ot) return null;

  const handleAddInsumoChip = (chip: {
    label: string;
    keyword: string;
    defaultUnit: string;
    defaultQty: number;
    defaultCost: number;
  }) => {
    const match = insumos.find(
      i =>
        i.nombre.toLowerCase().includes(chip.keyword) ||
        (i.categoria || '').toLowerCase().includes(chip.keyword)
    );
    const nuevo: FilaInsumoForm = {
      tempId: generateId(),
      insumoId: match?.id || '',
      nombre: match ? match.nombre : chip.label.replace(/^\+\s*/, ''),
      categoria: match?.categoria || (etapa === 'PINTURA_ACABADOS' ? 'Pintura' : 'Consumible Taller'),
      cantidad: chip.defaultQty,
      unidad: match?.unidad_medida || chip.defaultUnit,
      costoUnitario: match?.costo_unitario || chip.defaultCost,
      estabaCotizado: false
    };
    setInsumosConsumidos(prev => [...prev, nuevo]);
  };

  const handleAddFilaVacia = () => {
    setInsumosConsumidos(prev => [
      ...prev,
      {
        tempId: generateId(),
        insumoId: '',
        nombre: '',
        categoria: etapa === 'PINTURA_ACABADOS' ? 'Pintura' : 'Insumo Taller',
        cantidad: 1,
        unidad: etapa === 'PINTURA_ACABADOS' ? 'ml' : 'und',
        costoUnitario: 0,
        estabaCotizado: false
      }
    ]);
  };

  const handleSelectCatalogInsumo = (tempId: string, insumoId: string) => {
    const ins = insumos.find(i => i.id === insumoId);
    setInsumosConsumidos(prev =>
      prev.map(row => {
        if (row.tempId !== tempId) return row;
        if (!ins) return { ...row, insumoId: '' };
        return {
          ...row,
          insumoId: ins.id,
          nombre: ins.nombre,
          categoria: ins.categoria || row.categoria,
          unidad: ins.unidad_medida || (ins.categoria?.toLowerCase().includes('pint') ? 'ml' : 'und'),
          costoUnitario: ins.costo_unitario || 0
        };
      })
    );
  };

  const handleUpdateFila = (tempId: string, patch: Partial<FilaInsumoForm>) => {
    setInsumosConsumidos(prev => prev.map(row => (row.tempId === tempId ? { ...row, ...patch } : row)));
  };

  const handleRemoveFila = (tempId: string) => {
    setInsumosConsumidos(prev => prev.filter(row => row.tempId !== tempId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const insumosFinal: InsumoRealConsumido[] = insumosConsumidos
      .filter(f => (f.nombre.trim() || f.insumoId) && f.cantidad > 0)
      .map(f => ({
        insumo_id: f.insumoId || undefined,
        nombre: f.nombre.trim() || 'Insumo no catalogado',
        categoria: f.categoria,
        cantidad: Number(f.cantidad) || 0,
        unidad: f.unidad || 'und',
        costo_unitario: Number(f.costoUnitario) || 0,
        costo_total: Math.round((Number(f.cantidad) || 0) * (Number(f.costoUnitario) || 0)),
        estaba_cotizado: f.estabaCotizado
      }));

    if (
      etapa === 'TALLER_IMPRESION' &&
      materialRealG <= 0 &&
      tiempoRealManoObraMin <= 0 &&
      insumosFinal.length === 0
    ) {
      toast.warning('Ingresa gramos reales, minutos de trabajo o al menos un insumo consumido.');
      return;
    }
    if (etapa === 'PINTURA_ACABADOS' && tiempoRealManoObraMin <= 0 && insumosFinal.length === 0) {
      toast.warning('Ingresa minutos reales de pintura o las pinturas/barnices consumidos.');
      return;
    }

    const registro: ConsumoRealProduccion = {
      id: generateId(),
      orden_trabajo_id: ot.id,
      cotizacion_id: cotizacion?.id || ot.cotizacion_id,
      numero_referencia: cotizacion?.numero_cot || ot.cotizacion_numero || ot.numero_ot,
      etapa,
      tecnologia,
      altura_referencia_mm: piezaCotizada?.alto_mm || (ot.altura_cm_tarifario ? ot.altura_cm_tarifario * 10 : undefined),
      cantidad_piezas: cantidadPiezas,
      registrado_por_id: activeOperatorId,
      registrado_por_nombre: activeOperator || 'Operador Taller',
      material_id: etapa === 'TALLER_IMPRESION' ? materialId || undefined : undefined,
      material_nombre: etapa === 'TALLER_IMPRESION' ? calculoReal.materialNombre : undefined,
      material_estimado_g: etapa === 'TALLER_IMPRESION' ? materialEstimadoTotalG : undefined,
      material_real_g: etapa === 'TALLER_IMPRESION' ? materialRealG : undefined,
      tiempo_real_impresion_min: etapa === 'TALLER_IMPRESION' ? tiempoRealImpresionMin : undefined,
      tiempo_real_mano_obra_min: tiempoRealManoObraMin,
      hubo_fallo: huboFallo,
      piezas_fallidas: huboFallo ? Math.max(1, piezasFallidas || 1) : 0,
      insumos_consumidos: insumosFinal,
      costo_material_real: calculoReal.costoMaterialReal,
      costo_insumos_reales: calculoReal.costoInsumosReales,
      costo_mano_obra_real: calculoReal.costoManoObraReal,
      costo_total_real: calculoReal.costoTotalReal,
      descontado_de_inventario: descontarInventario,
      notas: notas.trim() || undefined,
      created_at: new Date().toISOString()
    };

    onSaveConsumo(registro, descontarInventario);
    toast.success('Consumo real registrado. Alimentará los promedios del cotizador.');
    onClose();
  };

  const chipsActivos = etapa === 'PINTURA_ACABADOS' ? CHIPS_RAPIDOS_PINTURA : CHIPS_RAPIDOS_TALLER;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto', padding: '20px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#38bdf8" />
              <span>Registro de Consumo Real • {ot.numero_ot}</span>
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              {ot.item_nombre} ({cantidadPiezas} und.) • Ref: <strong style={{ color: '#38bdf8' }}>{ot.cotizacion_numero || ot.numero_ot}</strong>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={15} />
          </button>
        </div>

        {/* Switch de Área: Taller / Impresión vs Pintura / Acabados */}
        <div className="modo-margen-switch" style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className={etapa === 'TALLER_IMPRESION' ? 'active' : ''}
            onClick={() => setEtapa('TALLER_IMPRESION')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Printer size={14} />
            <span>Taller / Impresión</span>
          </button>
          <button
            type="button"
            className={etapa === 'PINTURA_ACABADOS' ? 'active' : ''}
            onClick={() => setEtapa('PINTURA_ACABADOS')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Paintbrush size={14} />
            <span>Pintura / Acabados</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {etapa === 'TALLER_IMPRESION' && (
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>
                    {tecnologia === 'FDM_FILAMENTO' ? 'Filamento Usado Realmente' : 'Resina Usada Realmente'}
                  </label>
                  <WjgSelect
                    value={materialId}
                    onChange={setMaterialId}
                    placeholder="Seleccionar material..."
                    options={
                      tecnologia === 'FDM_FILAMENTO'
                        ? filamentos.map(f => ({
                            value: f.id,
                            label: `${f.marca} ${f.tipo} ${f.color}`,
                            subtitle: `$${Math.round(f.costo_gramo)}/g`
                          }))
                        : resinas.map(r => ({
                            value: r.id,
                            label: `${r.marca} ${r.tipo} ${r.color}`,
                            subtitle: `$${Math.round(r.costo_gramo)}/g`
                          }))
                    }
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>
                    Gramos Reales Consumidos (incl. soportes/fallos)
                  </label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input tabular-nums"
                      value={materialRealG === 0 ? '' : materialRealG}
                      onChange={e => setMaterialRealG(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      placeholder={materialEstimadoTotalG ? `Est: ${materialEstimadoTotalG}g` : '0'}
                    />
                    <span className="input-unit-badge">g {materialEstimadoTotalG > 0 ? `(Est ${materialEstimadoTotalG}g)` : ''}</span>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Tiempo Real Impresión (min)</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input tabular-nums"
                      value={tiempoRealImpresionMin === 0 ? '' : tiempoRealImpresionMin}
                      onChange={e => setTiempoRealImpresionMin(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      placeholder="min"
                    />
                    <span className="input-unit-badge">min</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mano de Obra y Fallos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>
                {etapa === 'PINTURA_ACABADOS' ? 'Minutos Reales de Pintura / Acabado' : 'Minutos Reales Limpieza / Postproceso'}
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input tabular-nums"
                  value={tiempoRealManoObraMin === 0 ? '' : tiempoRealManoObraMin}
                  onChange={e => setTiempoRealManoObraMin(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
                <span className="input-unit-badge">min</span>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: huboFallo ? '#f87171' : '#e2e8f0', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={huboFallo}
                  onChange={e => setHuboFallo(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                />
                <AlertTriangle size={14} color={huboFallo ? '#f87171' : '#94a3b8'} />
                <span>¿Hubo fallo / reimpresión?</span>
              </label>
              {huboFallo && (
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-input tabular-nums"
                    value={piezasFallidas === 0 ? '' : piezasFallidas}
                    onChange={e => setPiezasFallidas(e.target.value === '' ? 1 : parseInt(e.target.value, 10) || 1)}
                    placeholder="1"
                  />
                  <span className="input-unit-badge">piezas fallidas</span>
                </div>
              )}
            </div>
          </div>

          {/* Insumos Reales (Guantes, Alcohol, Filtros, Pinturas no contempladas) */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(168, 85, 247, 0.28)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                Insumos Consumidos (Pinturas, Guantes, IPA, Extras)
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddFilaVacia} style={{ fontSize: '0.72rem' }}>
                <Plus size={12} /> Agregar Manual
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {chipsActivos.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleAddInsumoChip(chip)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.14)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {insumosConsumidos.length === 0 ? (
              <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                Toca un botón rápido arriba o "Agregar Manual" para registrar guantes, alcohol IPA, filtros o pinturas realmente gastadas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {insumosConsumidos.map(row => (
                  <div
                    key={row.tempId}
                    style={{
                      background: 'rgba(0,0,0,0.28)',
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: '170px' }}>
                        <WjgSelect
                          value={row.insumoId}
                          onChange={val => handleSelectCatalogInsumo(row.tempId, val)}
                          placeholder="Del catálogo (opcional)..."
                          options={[
                            { value: '', label: 'Ingreso manual (no catalogado)' },
                            ...insumos.map(ins => ({
                              value: ins.id,
                              label: ins.nombre,
                              subtitle: `$${Math.round(ins.costo_unitario)}/${ins.unidad_medida || 'und'}`
                            }))
                          ]}
                        />
                      </div>
                      {!row.insumoId && (
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1, minWidth: '140px', fontSize: '0.76rem' }}
                          value={row.nombre}
                          onChange={e => handleUpdateFila(row.tempId, { nombre: e.target.value })}
                          placeholder="Ej: Guantes nitrilo negro"
                        />
                      )}
                      <div className="input-with-unit" style={{ width: '92px' }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input tabular-nums"
                          value={row.cantidad === 0 ? '' : row.cantidad}
                          onChange={e => handleUpdateFila(row.tempId, { cantidad: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        />
                        <span className="input-unit-badge">{row.unidad}</span>
                      </div>
                      <div className="input-with-unit" style={{ width: '105px' }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input tabular-nums"
                          value={row.costoUnitario === 0 ? '' : row.costoUnitario}
                          onChange={e => handleUpdateFila(row.tempId, { costoUnitario: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          placeholder="$ c/u"
                        />
                        <span className="input-unit-badge">$/{row.unidad}</span>
                      </div>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveFila(row.tempId)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!row.estabaCotizado}
                          onChange={e => handleUpdateFila(row.tempId, { estabaCotizado: !e.target.checked })}
                          style={{ accentColor: '#fbbf24' }}
                        />
                        <span style={{ color: !row.estabaCotizado ? '#fcd34d' : '#94a3b8' }}>
                          Gasto NO contemplado en cotización (retroalimenta futuros cálculos)
                        </span>
                      </label>
                      <strong className="tabular-nums" style={{ color: '#4ade80' }}>
                        ${Math.round(row.cantidad * row.costoUnitario).toLocaleString('es-CO')}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen Comparativo Estimado vs Real */}
          <div style={{ background: 'rgba(13, 19, 31, 0.9)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Material Real</div>
                <div className="tabular-nums" style={{ fontWeight: 700, color: '#38bdf8' }}>${calculoReal.costoMaterialReal.toLocaleString('es-CO')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Insumos / Pinturas</div>
                <div className="tabular-nums" style={{ fontWeight: 700, color: '#d8b4fe' }}>${calculoReal.costoInsumosReales.toLocaleString('es-CO')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Mano de Obra</div>
                <div className="tabular-nums" style={{ fontWeight: 700, color: '#f8fafc' }}>${calculoReal.costoManoObraReal.toLocaleString('es-CO')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Este Registro</div>
                <div className="tabular-nums" style={{ fontWeight: 800, color: '#34d399', fontSize: '0.98rem' }}>
                  ${calculoReal.costoTotalReal.toLocaleString('es-CO')}
                </div>
              </div>
            </div>
            {calculoReal.costoEstimadoRef > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.73rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span>Costo Base Cotizado Lote: <strong>${calculoReal.costoEstimadoRef.toLocaleString('es-CO')}</strong></span>
                <span style={{ color: calculoReal.desviacionCop > 0 ? '#f87171' : '#34d399', fontWeight: 700 }}>
                  Desviación acumulada OT: {calculoReal.desviacionCop >= 0 ? '+' : ''}${calculoReal.desviacionCop.toLocaleString('es-CO')} ({calculoReal.desviacionPct >= 0 ? '+' : ''}{calculoReal.desviacionPct}%)
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={descontarInventario}
                onChange={e => setDescontarInventario(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
              />
              <span>Descontar del inventario de bodega (gramos e insumos catalogados)</span>
            </label>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <input
              type="text"
              className="form-input"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas internas de producción o incidencias (ej: requirió 2da capa de primer)..."
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ minHeight: '44px', fontWeight: 800 }}>
            <CheckCircle2 size={16} />
            <span>Guardar Consumo Real</span>
          </button>
        </form>

        {/* Historial de registros existentes en esta OT (con eliminar obligatorio) */}
        {consumosExistentes.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardCheck size={14} color="#38bdf8" />
              <span>Registros Realizados en esta OT ({consumosExistentes.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {consumosExistentes.map(reg => (
                <div
                  key={reg.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.74rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>
                      {reg.etapa === 'PINTURA_ACABADOS' ? '🎨 Pintura' : '🖨️ Impresión'} • {reg.registrado_por_nombre}
                      {reg.hubo_fallo && <span style={{ color: '#f87171', marginLeft: '6px' }}>(Con fallo: {reg.piezas_fallidas || 1})</span>}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                      {reg.material_real_g ? `${reg.material_real_g}g • ` : ''}
                      {reg.tiempo_real_mano_obra_min ? `${reg.tiempo_real_mano_obra_min} min MO • ` : ''}
                      {reg.insumos_consumidos?.length || 0} insumo(s) • Total: <strong style={{ color: '#34d399' }}>${reg.costo_total_real.toLocaleString('es-CO')}</strong>
                    </div>
                  </div>
                  {onDeleteConsumo && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm('¿Eliminar este registro de consumo real de la base de datos?')) {
                          onDeleteConsumo(reg.id);
                        }
                      }}
                      title="Eliminar registro de consumo real"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
