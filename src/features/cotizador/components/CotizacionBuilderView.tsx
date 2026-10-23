import React from 'react';
import { Tag, User, Plus, Edit, X } from 'lucide-react';
import { CotizacionBuilderProps } from '../types/cotizador.types';
import { useCotizadorBuilder } from '../hooks/useCotizadorBuilder';
import { CotizadorItemList } from './CotizadorItemList';
import { CotizadorPaymentWarning } from './CotizadorPaymentWarning';
import { CotizadorTotalsSummary } from './CotizadorTotalsSummary';
import { ModalEditarPiezaCotizacion } from './ModalEditarPiezaCotizacion';
import { ModalNuevoClienteRapido } from './ModalNuevoClienteRapido';
import { ModalLightboxImagen } from './ModalLightboxImagen';

export const CotizacionBuilderView: React.FC<CotizacionBuilderProps> = (props) => {
  const b = useCotizadorBuilder(props);

  return (
    <div className="glass-card">
      {/* Banner de Modo Edición */}
      {props.cotizacionEnEdicion && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.98rem' }}>
                Modo Edición Activo: Cotización N° {props.cotizacionEnEdicion.numero_cot}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cliente: <strong style={{ color: 'var(--text-main)' }}>{props.cotizacionEnEdicion.cliente?.nombre}</strong>
              </div>
            </div>
          </div>
          {props.onCancelarEdicion && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={props.onCancelarEdicion} style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}>
              <X size={14} />
              <span>Cancelar Edición</span>
            </button>
          )}
        </div>
      )}

      {/* Cabecera */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Tag size={20} color="var(--brand-cyan)" />
            {b.esEdicion ? `Editando Cotización N° ${b.numeroCotFinal}` : `Resumen de la Cotización (${props.items.length} piezas)`}
          </h2>
          <span style={{ fontSize: '0.8rem', color: b.esEdicion ? '#fbbf24' : 'var(--brand-cyan)', fontWeight: 600 }}>
            {b.esEdicion ? `Modificando registro oficial ${b.numeroCotFinal}` : `N° Sugerido: ${b.numeroCotSugerido}`}
          </span>
        </div>
      </div>

      {/* Selector de Cliente */}
      <div className="form-group" style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" style={{ margin: 0 }}>
            <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Cliente Asignado
          </label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => b.setShowNewClientModal(true)}>
            <Plus size={14} />
            <span>Nuevo Cliente</span>
          </button>
        </div>
        <select className="form-select" value={b.clienteId} onChange={e => b.setClienteId(e.target.value)}>
          {props.clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre} (Tel: {c.telefono})</option>
          ))}
        </select>
        {b.clienteSeleccionado && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span>📱 WhatsApp: {b.clienteSeleccionado.telefono}</span>
            <span>🆔 NIT/CC: {b.clienteSeleccionado.nit_cc || 'N/A'}</span>
          </div>
        )}
      </div>

      {/* Lista de Ítems */}
      <CotizadorItemList
        items={props.items}
        onRemoveItem={props.onRemoveItem}
        onUpdatePieceQuantity={props.onUpdatePieceQuantity}
        onUpdatePieceImage={props.onUpdatePieceImage}
        onOpenEditPiece={b.handleOpenEditPiece}
        onPreviewImage={b.setPreviewImage}
        onItemImageUpload={b.handleItemImageUpload}
      />

      {/* Sección Financiera y Totales */}
      {props.items.length > 0 && (
        <>
          <CotizadorPaymentWarning
            total={b.total}
            estadoPagoInicial={b.estadoPagoInicial}
            setEstadoPagoInicial={b.setEstadoPagoInicial}
            abonoInicial={b.abonoInicial}
            setAbonoInicial={b.setAbonoInicial}
            metodoPagoInicial={b.metodoPagoInicial}
            setMetodoPagoInicial={b.setMetodoPagoInicial}
            abonoEfectivo={b.abonoEfectivo}
            saldoPendiente={b.saldoPendiente}
          />

          <CotizadorTotalsSummary
            subtotal={b.subtotal}
            descuentoPorcentaje={b.descuentoPorcentaje}
            setDescuentoPorcentaje={b.setDescuentoPorcentaje}
            descuentoMonto={b.descuentoMonto}
            total={b.total}
            tipoEstado={b.tipoEstado}
            setTipoEstado={b.setTipoEstado}
            vendedorNombre={b.vendedorNombre}
            setVendedorNombre={b.setVendedorNombre}
            notas={b.notas}
            setNotas={b.setNotas}
            tieneItemsPendientes={b.tieneItemsPendientes}
            esEdicion={b.esEdicion}
            numeroCotFinal={b.numeroCotFinal}
            onSave={() => b.handleFinalizar(false)}
            onSendWhatsApp={() => b.handleFinalizar(true)}
            onSharePDFWhatsApp={b.handleCompartirPDF}
            onDownloadPDF={b.handleDescargarPDF}
            onCancelarEdicion={props.onCancelarEdicion}
          />
        </>
      )}

      {/* Modales Desacoplados */}
      <ModalEditarPiezaCotizacion
        isOpen={Boolean(b.piezaEditando)}
        onClose={b.handleCloseEditPiece}
        piezaEditando={b.piezaEditando}
        resinas={props.resinas || []}
        maquinas={props.maquinas || []}
        editNombre={b.editNombre}
        setEditNombre={b.setEditNombre}
        editCantidad={b.editCantidad}
        setEditCantidad={b.setEditCantidad}
        editPrecioUnitario={b.editPrecioUnitario}
        setEditPrecioUnitario={b.setEditPrecioUnitario}
        editAltoMm={b.editAltoMm}
        setEditAltoMm={b.setEditAltoMm}
        editAnchoMm={b.editAnchoMm}
        setEditAnchoMm={b.setEditAnchoMm}
        editProfundidadMm={b.editProfundidadMm}
        setEditProfundidadMm={b.setEditProfundidadMm}
        editResinaId={b.editResinaId}
        setEditResinaId={b.setEditResinaId}
        editVaPintado={b.editVaPintado}
        setEditVaPintado={b.setEditVaPintado}
        editTieneEmpaque={b.editTieneEmpaque}
        setEditTieneEmpaque={b.setEditTieneEmpaque}
        editDatosPendientes={b.editDatosPendientes}
        setEditDatosPendientes={b.setEditDatosPendientes}
        editDescripcionTecnica={b.editDescripcionTecnica}
        setEditDescripcionTecnica={b.setEditDescripcionTecnica}
        editMaquinasAdicionales={b.editMaquinasAdicionales}
        handleAddModalExtraProcess={b.handleAddModalExtraProcess}
        handleUpdateModalExtraProcess={b.handleUpdateModalExtraProcess}
        handleRemoveModalExtraProcess={b.handleRemoveModalExtraProcess}
        editEnlacesCompra={b.editEnlacesCompra}
        handleAddModalEnlaceCompra={b.handleAddModalEnlaceCompra}
        handleUpdateModalEnlaceCompra={b.handleUpdateModalEnlaceCompra}
        handleRemoveModalEnlaceCompra={b.handleRemoveModalEnlaceCompra}
        handleSaveEditPieceSubmit={b.handleSaveEditPieceSubmit}
        onLoadPieceToCalculator={props.onLoadPieceToCalculator}
      />

      <ModalNuevoClienteRapido
        isOpen={b.showNewClientModal}
        onClose={() => b.setShowNewClientModal(false)}
        onAddCliente={b.handleCrearNuevoCliente}
        clientesCount={props.clientes.length}
      />

      <ModalLightboxImagen
        previewImage={b.previewImage}
        onClose={() => b.setPreviewImage(null)}
      />
    </div>
  );
};
