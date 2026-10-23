import React from 'react';
import { CotizadorFormProps } from './types/cotizador.types';
import { useCotizadorForm } from './hooks/useCotizadorForm';
import { CotizadorFormHeader } from './components/CotizadorFormHeader';
import { CotizadorDimensionsCard } from './components/CotizadorDimensionsCard';
import { CotizadorMaterialsCard } from './components/CotizadorMaterialsCard';
import { CotizadorProcessesCard } from './components/CotizadorProcessesCard';
import { CotizadorDynamicLists } from './components/CotizadorDynamicLists';
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
    <div className="glass-card highlight">
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
      />

      <form onSubmit={form.handleSubmit}>
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
          maquinaActual={form.maquinaActual}
          tiempoImpresionModo={form.tiempoImpresionModo}
          setTiempoImpresionModo={form.setTiempoImpresionModo}
          tiempoImpresionManualMin={form.tiempoImpresionManualMin}
          setTiempoImpresionManualMin={form.setTiempoImpresionManualMin}
          altoMm={form.altoMm}
          calculoEnVivo={form.calculoEnVivo}
        />

        <CotizadorProcessesCard
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
        />

        <CotizadorCostSummary
          margenGanancia={form.margenGanancia}
          setMargenGanancia={form.setMargenGanancia}
          costoModeloComprado={form.costoModeloComprado}
          setCostoModeloComprado={form.setCostoModeloComprado}
          calculoEnVivo={form.calculoEnVivo}
          modoCalculoResina={form.modoCalculoResina}
          tipoEstructura={form.tipoEstructura}
          porcentajeRelleno={form.porcentajeRelleno}
          cantidad={form.cantidad}
          piezaEnEdicion={props.piezaEnEdicion}
        />
      </form>

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
