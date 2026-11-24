import React from 'react';
import { PlusCircle } from 'lucide-react';
import { CotizadorFormProps } from './types/cotizador.types';
import { useCotizadorForm } from './hooks/useCotizadorForm';
import { CotizadorFormHeader } from './components/CotizadorFormHeader';
import { RealCostFeedbackBanner } from './components/RealCostFeedbackBanner';
import { CotizadorDimensionsCard } from './components/CotizadorDimensionsCard';
import { CotizadorMaterialsCard } from './components/CotizadorMaterialsCard';
import { CotizadorProcessesCard } from './components/CotizadorProcessesCard';
import { CotizadorDynamicLists } from './components/CotizadorDynamicLists';
import { CotizadorAdvancedCostsCard } from './components/CotizadorAdvancedCostsCard';
import { CotizadorCostSummary } from './components/CotizadorCostSummary';
import { TarifarioModal } from '../../components/cotizador/TarifarioModal';

export const CotizadorForm: React.FC<CotizadorFormProps> = (props) => {
  const form = useCotizadorForm(props);

  if (props.resinas.length === 0 || props.maquinas.length === 0) {
    return (
      <div className="glass-card highlight" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando catálogo del taller...</p>
      </div>
    );
  }

  return (
    <div className="glass-card highlight" style={{ paddingBottom: '26px' }}>
      <form id="cotizador-main-form" onSubmit={form.handleSubmit}>
        <div className="cotizador-two-col-layout">
          {/* COLUMNA IZQUIERDA: ENTRADAS MODULARES */}
          <div style={{ minWidth: 0 }}>
            <CotizadorFormHeader
              piezaEnEdicion={props.piezaEnEdicion}
              onCancelarEdicionPieza={props.onCancelarEdicionPieza}
              nombreItem={form.nombreItem}
              setNombreItem={form.setNombreItem}
              cantidad={form.cantidad}
              setCantidad={form.setCantidad}
              esParcial={form.esParcial}
              setEsParcial={form.setEsParcial}
              notasPendientes={form.notasPendientes}
              setNotasPendientes={form.setNotasPendientes}
              onOpenTarifario={() => form.setShowTarifarioModal(true)}
              tecnologia={form.tecnologia}
              modoVista={form.modoVista}
              setModoVista={form.setModoVista}
            />

            <RealCostFeedbackBanner
              consumosReales={props.consumosReales}
              tecnologia={form.tecnologia}
              altoMm={form.altoMm}
              onAplicarPromedios={form.handleAplicarPromediosReales}
            />

            <CotizadorDimensionsCard
              altoMm={form.altoMm}
              setAltoMm={form.setAltoMm}
              anchoMm={form.anchoMm}
              setAnchoMm={form.setAnchoMm}
              profundidadMm={form.profundidadMm}
              setProfundidadMm={form.setProfundidadMm}
              esParcial={form.esParcial}
              tarifaAplicada={form.tarifaAplicada}
              precioFijadoTarifa={form.precioFijadoTarifa}
              precioUnitarioManual={form.precioUnitarioManual}
              onOpenTarifario={() => form.setShowTarifarioModal(true)}
              onQuitarTarifa={form.handleQuitarTarifa}
              onOpenSTLViewer={props.onOpenSTLViewer}
              imagenUrl={form.imagenUrl}
              tipoOrigenImagen={form.tipoOrigenImagen}
              isOptimizingImage={form.isOptimizingImage}
              showImagePreviewModal={form.showImagePreviewModal}
              setShowImagePreviewModal={form.setShowImagePreviewModal}
              handleImageUpload={form.handleImageUpload}
              handleImageFile={form.handleImageFile}
              handleRemoverImagen={form.handleRemoverImagen}
              nombreItem={form.nombreItem}
            />

            <CotizadorMaterialsCard
              resinas={props.resinas}
              resinaId={form.resinaId}
              setResinaId={form.setResinaId}
              resinaActual={form.resinaActual}
              filamentos={props.filamentos || []}
              filamentoId={form.filamentoId}
              setFilamentoId={form.setFilamentoId}
              filamentoActual={form.filamentoActual}
              mermaPorcentajeFdm={form.mermaPorcentajeFdm}
              setMermaPorcentajeFdm={form.setMermaPorcentajeFdm}
              mermaPorcentajeResina={form.mermaPorcentajeResina}
              setMermaPorcentajeResina={form.setMermaPorcentajeResina}
              modoCalculoResina={form.modoCalculoResina}
              setModoCalculoResina={form.setModoCalculoResina}
              pesoResinaManualG={form.pesoResinaManualG}
              setPesoResinaManualG={form.setPesoResinaManualG}
              tipoEstructura={form.tipoEstructura}
              setTipoEstructura={form.setTipoEstructura}
              porcentajeRelleno={form.porcentajeRelleno}
              setPorcentajeRelleno={form.setPorcentajeRelleno}
              maquinas={props.maquinas}
              maquinaId={form.maquinaId}
              setMaquinaId={form.setMaquinaId}
              onSelectMaquina={form.handleSelectMaquina}
              maquinaActual={form.maquinaActual}
              tiempoImpresionModo={form.tiempoImpresionModo}
              setTiempoImpresionModo={form.setTiempoImpresionModo}
              tiempoImpresionManualMin={form.tiempoImpresionManualMin}
              setTiempoImpresionManualMin={form.setTiempoImpresionManualMin}
              altoMm={form.altoMm}
              calculoEnVivo={form.calculoEnVivo}
              tecnologia={form.tecnologia}
              setTecnologia={form.setTecnologia}
              materialFilamento={form.materialFilamento}
              setMaterialFilamento={form.setMaterialFilamento}
              pesoFilamentoG={form.pesoFilamentoG}
              setPesoFilamentoG={form.setPesoFilamentoG}
              costoRolloKg={form.costoRolloKg}
              setCostoRolloKg={form.setCostoRolloKg}
              tiempoFDMMin={form.tiempoFDMMin}
              setTiempoFDMMin={form.setTiempoFDMMin}
              materialLamina={form.materialLamina}
              setMaterialLamina={form.setMaterialLamina}
              espesorLaminaMm={form.espesorLaminaMm}
              setEspesorLaminaMm={form.setEspesorLaminaMm}
              longitudCorteMm={form.longitudCorteMm}
              setLongitudCorteMm={form.setLongitudCorteMm}
              costoMetroCuadradoLamina={form.costoMetroCuadradoLamina}
              setCostoMetroCuadradoLamina={form.setCostoMetroCuadradoLamina}
              tiempoLaserMin={form.tiempoLaserMin}
              setTiempoLaserMin={form.setTiempoLaserMin}
              tipoProcesoLaser={form.tipoProcesoLaser}
              setTipoProcesoLaser={form.setTipoProcesoLaser}
              materialBloque={form.materialBloque}
              setMaterialBloque={form.setMaterialBloque}
              costoBloqueMaterial={form.costoBloqueMaterial}
              setCostoBloqueMaterial={form.setCostoBloqueMaterial}
              tiempoMecanizadoMin={form.tiempoMecanizadoMin}
              setTiempoMecanizadoMin={form.setTiempoMecanizadoMin}
              modoVista={form.modoVista}
              amsActivo={form.amsActivo}
              setAmsActivo={form.setAmsActivo}
              amsColores={form.amsColores}
              setAmsColores={form.setAmsColores}
              amsPurgaPct={form.amsPurgaPct}
              setAmsPurgaPct={form.setAmsPurgaPct}
              amsPurgaGramosManual={form.amsPurgaGramosManual}
              setAmsPurgaGramosManual={form.setAmsPurgaGramosManual}
              consumiblesSlaExtra={form.consumiblesSlaExtra}
              setConsumiblesSlaExtra={form.setConsumiblesSlaExtra}
              gcodeInfo={form.gcodeInfo}
              onImportGCode={form.handleImportGCode}
            />

            <CotizadorProcessesCard
              tecnologia={form.tecnologia}
              requiereCurado={form.requiereCurado}
              setRequiereCurado={form.setRequiereCurado}
              curadoId={form.curadoId}
              setCuradoId={form.setCuradoId}
              tiempoCuradoPersonalizado={form.tiempoCuradoPersonalizado}
              setTiempoCuradoPersonalizado={form.setTiempoCuradoPersonalizado}
              tiempoCuradoMin={form.tiempoCuradoMin}
              setTiempoCuradoMin={form.setTiempoCuradoMin}
              vaPintado={form.vaPintado}
              setVaPintado={form.setVaPintado}
              tiempoPinturaMin={form.tiempoPinturaMin}
              setTiempoPinturaMin={form.setTiempoPinturaMin}
              requiereCompresorPintura={form.requiereCompresorPintura}
              setRequiereCompresorPintura={form.setRequiereCompresorPintura}
              compresorId={form.compresorId}
              setCompresorId={form.setCompresorId}
              tiempoCompresorMin={form.tiempoCompresorMin}
              setTiempoCompresorMin={form.setTiempoCompresorMin}
              tiempoCompresorSincronizado={form.tiempoCompresorSincronizado}
              setTiempoCompresorSincronizado={form.setTiempoCompresorSincronizado}
              maquinaCompresor={form.maquinaCompresor}
              maquinas={props.maquinas}
              maquinasAdicionales={form.maquinasAdicionales}
              handleAddMaquinaAdicional={form.handleAddMaquinaAdicional}
              handleRemoveMaquinaAdicional={form.handleRemoveMaquinaAdicional}
              handleUpdateMaquinaAdicional={form.handleUpdateMaquinaAdicional}
              calculoEnVivo={form.calculoEnVivo}
              tiempoDesarrolloMin={form.tiempoDesarrolloMin}
              setTiempoDesarrolloMin={form.setTiempoDesarrolloMin}
              tiempoArmadoMin={form.tiempoArmadoMin}
              setTiempoArmadoMin={form.setTiempoArmadoMin}
              operadorPinturaId={form.operadorPinturaId}
              setOperadorPinturaId={form.setOperadorPinturaId}
              operadorArmadoId={form.operadorArmadoId}
              setOperadorArmadoId={form.setOperadorArmadoId}
              operadorDisenoId={form.operadorDisenoId}
              setOperadorDisenoId={form.setOperadorDisenoId}
              personal={props.personal}
              cantidad={form.cantidad}
              prorratearDiseno3D={form.prorratearDiseno3D}
              setProrratearDiseno3D={form.setProrratearDiseno3D}
              nivelComplejidad={form.nivelComplejidad}
              modoVista={form.modoVista}
            />

            <CotizadorDynamicLists
              vaPintado={form.vaPintado}
              setVaPintado={form.setVaPintado}
              pinturasSeleccionadas={form.pinturasSeleccionadas}
              handleAddPintura={form.handleAddPintura}
              handleRemovePintura={form.handleRemovePintura}
              handleUpdatePintura={form.handleUpdatePintura}
              insumosPinturas={form.insumosPinturas}
              herrajesSeleccionados={form.herrajesSeleccionados}
              handleAddHerraje={form.handleAddHerraje}
              handleRemoveHerraje={form.handleRemoveHerraje}
              handleUpdateHerraje={form.handleUpdateHerraje}
              insumosHerrajes={form.insumosHerrajes}
              empaquesSeleccionados={form.empaquesSeleccionados}
              handleAddEmpaque={form.handleAddEmpaque}
              handleRemoveEmpaque={form.handleRemoveEmpaque}
              handleUpdateEmpaque={form.handleUpdateEmpaque}
              insumosEmpaques={form.insumosEmpaques}
              enlacesCompra={form.enlacesCompra}
              handleAddEnlaceCompra={form.handleAddEnlaceCompra}
              handleRemoveEnlaceCompra={form.handleRemoveEnlaceCompra}
              handleUpdateEnlaceCompra={form.handleUpdateEnlaceCompra}
              calculoEnVivo={form.calculoEnVivo}
              modoVista={form.modoVista}
            />

            <CotizadorAdvancedCostsCard
              modoVista={form.modoVista}
              cantidad={form.cantidad}
              costoModeloComprado={form.costoModeloComprado}
              setCostoModeloComprado={form.setCostoModeloComprado}
              prorratearArchivo3D={form.prorratearArchivo3D}
              setProrratearArchivo3D={form.setProrratearArchivo3D}
              nivelComplejidad={form.nivelComplejidad}
              setNivelComplejidad={form.setNivelComplejidad}
              tasaFalloPct={form.tasaFalloPct}
              setTasaFalloPct={form.setTasaFalloPct}
              incluirOverhead={form.incluirOverhead}
              setIncluirOverhead={form.setIncluirOverhead}
              gastosFijosMensuales={props.config.gastos_fijos_mensuales || 0}
              horasFacturablesMes={props.config.horas_facturables_mes || 160}
              comisionPasarelaPct={form.comisionPasarelaPct}
              setComisionPasarelaPct={form.setComisionPasarelaPct}
              costoEnvio={form.costoEnvio}
              setCostoEnvio={form.setCostoEnvio}
              calculoEnVivo={form.calculoEnVivo}
            />
          </div>

          {/* COLUMNA DERECHA STICKY: PRECIO, SWITCH MARGIN/MARKUP & DESGLOSE POR APARTADO */}
          <div className="cotizador-sticky-sidebar">
            <CotizadorCostSummary
              margenGanancia={form.margenGanancia}
              setMargenGanancia={form.setMargenGanancia}
              modoMargen={form.modoMargen}
              setModoMargen={form.setModoMargen}
              tipoObjetivoPrecio={form.tipoObjetivoPrecio}
              setTipoObjetivoPrecio={form.setTipoObjetivoPrecio}
              gananciaDeseadaCop={form.gananciaDeseadaCop}
              setGananciaDeseadaCop={form.setGananciaDeseadaCop}
              calculoEnVivo={form.calculoEnVivo}
              modoCalculoResina={form.modoCalculoResina}
              tipoEstructura={form.tipoEstructura}
              porcentajeRelleno={form.porcentajeRelleno}
              cantidad={form.cantidad}
              piezaEnEdicion={props.piezaEnEdicion}
              aplicaDescuentoVolumen={form.aplicaDescuentoVolumen}
              setAplicaDescuentoVolumen={form.setAplicaDescuentoVolumen}
              precioMinimoTrabajo={props.config.precio_minimo_trabajo ?? 15000}
              mermaPct={form.tecnologia === 'FDM_FILAMENTO' ? form.mermaPorcentajeFdm : form.mermaPorcentajeResina}
            />
          </div>
        </div>
      </form>

      {/* Barra Flotante Sticky Móvil */}
      {form.calculoEnVivo && (
        <div className="cotizador-mobile-sticky-bar">
          <div className="tabular-nums" style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Costo: ${form.calculoEnVivo.costo_base_produccion.toLocaleString('es-CO')} •{' '}
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                +${(form.calculoEnVivo.utilidad_neta_unitaria ?? 0).toLocaleString('es-CO')}
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-display)' }}>
              ${form.calculoEnVivo.precio_unitario.toLocaleString('es-CO')} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>COP c/u</span>
            </div>
          </div>
          <button
            type="submit"
            form="cotizador-main-form"
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap', minHeight: '42px', padding: '0 14px' }}
          >
            <PlusCircle size={15} />
            <span>{props.piezaEnEdicion ? 'Guardar' : 'Agregar'}</span>
          </button>
        </div>
      )}

      <TarifarioModal
        isOpen={form.showTarifarioModal}
        onClose={() => form.setShowTarifarioModal(false)}
        tarifas={props.tarifasTamanos || []}
        onSelectTarifa={form.handleAplicarTarifa}
        onNavigateToCatalogos={props.onNavigateToCatalogos}
      />
    </div>
  );
};
