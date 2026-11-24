import React from 'react';
import { Tag, User, Plus, Edit, X, RotateCw, Trash2 } from 'lucide-react';
import { CotizacionBuilderProps } from '../types/cotizador.types';
import { useCotizadorBuilder } from '../hooks/useCotizadorBuilder';
import { CotizadorItemList } from './CotizadorItemList';
import { CotizadorPaymentWarning } from './CotizadorPaymentWarning';
import { CotizadorTotalsSummary } from './CotizadorTotalsSummary';
import { ModalEditarPiezaCotizacion } from './ModalEditarPiezaCotizacion';
import { ModalNuevoClienteRapido } from './ModalNuevoClienteRapido';
import { ModalLightboxImagen } from './ModalLightboxImagen';
import { ModalConfirmacionWhatsApp } from '../../../components/common/ModalConfirmacionWhatsApp';
import { ModalVisualizadorDocumento } from '../../../components/common/ModalVisualizadorDocumento';
import { generateCotizacionWhatsAppText, openWhatsApp } from '../../../services/whatsappService';
import { WjgSelect } from '../../../components/ui/WjgSelect';

export const CotizacionBuilderView: React.FC<CotizacionBuilderProps> = (props) => {
  const b = useCotizadorBuilder(props);

  return (
    <div className="glass-card">
      {/* Banner de Modo Edición */}
      {props.cotizacionEnEdicion && (
        <div style={{
          background: (props.cotizacionEnEdicion.estado || '').toLowerCase().includes('aprob')
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
          border: (props.cotizacionEnEdicion.estado || '').toLowerCase().includes('aprob')
            ? '1px solid rgba(34, 197, 94, 0.5)'
            : '1px solid rgba(245, 158, 11, 0.5)',
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
            <div style={{
              background: (props.cotizacionEnEdicion.estado || '').toLowerCase().includes('aprob') ? '#22c55e' : '#f59e0b',
              color: '#000',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Edit size={18} />
            </div>
            <div>
              <div style={{
                fontWeight: 700,
                color: (props.cotizacionEnEdicion.estado || '').toLowerCase().includes('aprob') ? '#86efac' : '#fbbf24',
                fontSize: '0.98rem'
              }}>
                {(props.cotizacionEnEdicion.estado || '').toLowerCase().includes('aprob') || (props.cotizacionEnEdicion.estado || '').toLowerCase().includes('factur')
                  ? `Modo Edición Activo (Sincroniza OT y Cuenta de Cobro): N° ${props.cotizacionEnEdicion.numero_cot}`
                  : `Modo Edición Activo: Cotización N° ${props.cotizacionEnEdicion.numero_cot}`
                }
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cliente: <strong style={{ color: 'var(--text-main)' }}>{props.cotizacionEnEdicion.cliente?.nombre}</strong> • Los cambios permanecerán guardados en la nube.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={b.handleRecalcularTarifasVigentes}
              title="Recalcular todas las piezas de esta cotización con los precios actuales de resina, filamento, maquinaria e insumos del taller"
              style={{ borderColor: 'rgba(56, 189, 248, 0.45)', color: 'var(--brand-cyan)', background: 'rgba(56, 189, 248, 0.08)', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <RotateCw size={14} />
              <span>Actualizar a Tarifas Vigentes</span>
            </button>

            {props.onCancelarEdicion && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={props.onCancelarEdicion} style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}>
                <X size={14} />
                <span>Cerrar</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="section-title">
            <Tag size={20} color="var(--brand-cyan)" />
            {b.esEdicion ? `Editando Cotización N° ${b.numeroCotFinal}` : `Resumen de la Cotización (${props.items.length} piezas)`}
          </h2>
          <span style={{ fontSize: '0.8rem', color: b.esEdicion ? '#fbbf24' : 'var(--brand-cyan)', fontWeight: 600 }}>
            {b.esEdicion ? `Modificando registro oficial ${b.numeroCotFinal}` : `N° Sugerido: ${b.numeroCotSugerido}`}
          </span>
        </div>

        {!b.esEdicion && props.items.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={b.handleLimpiarConstructor}
            title="Vaciar todas las piezas actuales e iniciar una cotización totalmente en blanco"
            style={{ borderColor: 'rgba(239, 68, 68, 0.45)', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} />
            <span>Limpiar / Nueva en Blanco</span>
          </button>
        )}
      </div>

      {/* Selector de Cliente con Buscador y Actualización Rápida */}
      <div className="form-group" style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <label className="form-label" style={{ margin: 0 }}>
            <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Cliente Asignado
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Filtrar por nombre, tel, NIT o correo..."
              value={b.clienteSearchQuery}
              onChange={e => b.setClienteSearchQuery(e.target.value)}
              style={{ maxWidth: '230px', padding: '4px 10px', minHeight: '32px', fontSize: '0.78rem' }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => b.setShowNewClientModal(true)}>
              <Plus size={14} />
              <span>Nuevo / Buscar</span>
            </button>
          </div>
        </div>
        <WjgSelect
          value={b.clienteId}
          onChange={b.setClienteId}
          searchable
          searchPlaceholder="Buscar cliente por nombre, tel, NIT o correo..."
          placeholder="Seleccionar cliente..."
          options={b.clientesFiltrados.map(c => ({
            value: c.id,
            label: c.nombre,
            subtitle: `📱 ${c.telefono || 'Sin tel'}${c.nit_cc ? ` • 🆔 ${c.nit_cc}` : ''}${c.correo ? ` • ✉️ ${c.correo}` : ''}`,
          }))}
        />
        {b.clienteSeleccionado && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <span>📱 WhatsApp: {b.clienteSeleccionado.telefono || 'Sin tel'}</span>
                <span>🆔 NIT/CC: {b.clienteSeleccionado.nit_cc || 'N/A'}</span>
                {b.clienteSeleccionado.correo && <span>✉️ {b.clienteSeleccionado.correo}</span>}
              </div>
              <button
                type="button"
                onClick={() => b.setEditandoClienteInline(prev => !prev)}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--brand-cyan)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {b.editandoClienteInline ? 'Cerrar edición' : '✏️ Actualizar Tel / NIT / Correo'}
              </button>
            </div>

            {b.editandoClienteInline && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '8px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Teléfono WhatsApp</label>
                  <input type="tel" className="form-input" value={b.editCliTelefono} onChange={e => b.setEditCliTelefono(e.target.value)} style={{ padding: '4px 8px', minHeight: '32px', fontSize: '0.8rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Cédula / NIT</label>
                  <input type="text" className="form-input" value={b.editCliNitCc} onChange={e => b.setEditCliNitCc(e.target.value)} style={{ padding: '4px 8px', minHeight: '32px', fontSize: '0.8rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Correo</label>
                  <input type="email" className="form-input" value={b.editCliCorreo} onChange={e => b.setEditCliCorreo(e.target.value)} style={{ padding: '4px 8px', minHeight: '32px', fontSize: '0.8rem' }} />
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={b.handleActualizarClienteSeleccionado}>
                  Guardar Datos Cliente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de Ítems */}
      <CotizadorItemList
        items={props.items}
        onRemoveItem={props.onRemoveItem}
        onUpdatePieceQuantity={props.onUpdatePieceQuantity}
        onUpdatePieceImage={props.onUpdatePieceImage}
        onOpenEditPiece={props.onLoadPieceToCalculator || b.handleOpenEditPiece}
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
            subtotalConDescuento={b.subtotalConDescuento}
            ivaPorcentaje={b.ivaPorcentaje}
            setIvaPorcentaje={b.setIvaPorcentaje}
            ivaMonto={b.ivaMonto}
            ahorroVolumenTotal={b.ahorroVolumenTotal}
            total={b.total}
            modoMargenCotizacion={b.modoMargenCotizacion}
            onCambiarModoMargenCotizacion={b.handleCambiarModoMargenCotizacion}
            costoTotalTaller={b.costoTotalTaller}
            utilidadNetaEstimada={b.utilidadNetaEstimada}
            margenRealCotizacionPct={b.margenRealCotizacionPct}
            pisoMargenAlertaPct={props.config.piso_margen_alerta_pct ?? 20}
            totalAlternoMargenBruto={b.totalAlternoMargenBruto}
            totalAlternoMarkup={b.totalAlternoMarkup}
            tipoEstado={b.tipoEstado}
            setTipoEstado={b.setTipoEstado}
            vendedorNombre={b.vendedorNombre}
            setVendedorNombre={b.setVendedorNombre}
            notas={b.notas}
            setNotas={b.setNotas}
            diasEntrega={b.diasEntrega}
            fechaEntrega={b.fechaEntrega}
            handleCambiarDiasEntrega={b.handleCambiarDiasEntrega}
            handleCambiarFechaEntrega={b.handleCambiarFechaEntrega}
            tiempoEntregaTexto={b.tiempoEntregaTexto}
            tieneItemsPendientes={b.tieneItemsPendientes}
            esEdicion={b.esEdicion}
            numeroCotFinal={b.numeroCotFinal}
            onSave={() => b.handleFinalizar(false)}
            onSendWhatsApp={() => b.handleFinalizar(true)}
            onSharePDFWhatsApp={b.handleCompartirPDF}
            onDownloadPDF={b.handleDescargarPDF}
            onVisualizarDocumento={b.handleVisualizarDocumentoCotizacion}
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
        editAplicaDescuentoVolumen={b.editAplicaDescuentoVolumen}
        setEditAplicaDescuentoVolumen={b.setEditAplicaDescuentoVolumen}
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
        clientes={props.clientes}
      />

      <ModalLightboxImagen
        previewImage={b.previewImage}
        onClose={() => b.setPreviewImage(null)}
      />

      {/* Modal de Confirmación y Despacho WhatsApp Corporativo */}
      {b.cotizacionParaConfirmarWhatsApp && (
        <ModalConfirmacionWhatsApp
          isOpen={Boolean(b.cotizacionParaConfirmarWhatsApp)}
          onClose={() => b.setCotizacionParaConfirmarWhatsApp(null)}
          titulo={`Confirmar Cotización N° ${b.cotizacionParaConfirmarWhatsApp.numero_cot}`}
          subtitulo="Valida las piezas y valores antes de despachar desde el WhatsApp corporativo."
          clienteNombre={b.cotizacionParaConfirmarWhatsApp.cliente.nombre}
          clienteTelefono={b.cotizacionParaConfirmarWhatsApp.cliente.telefono}
          clienteCorreo={b.cotizacionParaConfirmarWhatsApp.cliente.correo}
          mensajeWhatsApp={generateCotizacionWhatsAppText(b.cotizacionParaConfirmarWhatsApp, props.config)}
          context="cotizacion"
          emailType="cotizacion"
          emailSubject={`📄 Cotización N° ${b.cotizacionParaConfirmarWhatsApp.numero_cot} — WJGEEKS 3D`}
          emailData={{
            numero_doc: b.cotizacionParaConfirmarWhatsApp.numero_cot,
            total: b.cotizacionParaConfirmarWhatsApp.total,
            abono: b.cotizacionParaConfirmarWhatsApp.abono || 0,
            saldo_pendiente: b.cotizacionParaConfirmarWhatsApp.saldo_pendiente || 0,
            tiempo_entrega: b.cotizacionParaConfirmarWhatsApp.tiempo_entrega_estimado,
            fecha: b.cotizacionParaConfirmarWhatsApp.fecha
          }}
          entidadTipo="cotizacion"
          entidadId={b.cotizacionParaConfirmarWhatsApp.id}
          config={props.config}
          resumenDetalle={[
            { etiqueta: 'Cliente', valor: b.cotizacionParaConfirmarWhatsApp.cliente.nombre },
            { etiqueta: 'Piezas Cotizadas', valor: `${b.cotizacionParaConfirmarWhatsApp.items.length} pieza(s)` },
            { etiqueta: 'Total Cotizado', valor: `$${b.cotizacionParaConfirmarWhatsApp.total.toLocaleString('es-CO')} COP`, destacado: true },
            { etiqueta: 'Abono Registrado', valor: `$${(b.cotizacionParaConfirmarWhatsApp.abono || 0).toLocaleString('es-CO')} COP` },
            { etiqueta: 'Saldo Pendiente', valor: `$${(b.cotizacionParaConfirmarWhatsApp.saldo_pendiente || 0).toLocaleString('es-CO')} COP` },
            { etiqueta: 'Tiempo de Entrega', valor: b.cotizacionParaConfirmarWhatsApp.tiempo_entrega_estimado }
          ]}
          onConfirmadoExitoso={() => b.ejecutarGuardadoFinalCotizacion(b.cotizacionParaConfirmarWhatsApp!)}
          onConfirmarSinEnvio={() => b.ejecutarGuardadoFinalCotizacion(b.cotizacionParaConfirmarWhatsApp!)}
        />
      )}

      {/* Modal Visualizador Universal de Documentos PDF y Texto Estructurado */}
      {b.cotizacionParaVisualizar && (() => {
        const docVis = b.cotizacionParaVisualizar;
        return (
          <ModalVisualizadorDocumento
            isOpen={true}
            onClose={() => b.setCotizacionParaVisualizar(null)}
            titulo={`Cotización N° ${docVis.cotizacion.numero_cot}`}
            subtitulo={`${docVis.cotizacion.cliente.nombre} • Total: $${docVis.cotizacion.total.toLocaleString('es-CO')} COP`}
            pdfBlobUrl={docVis.blobUrl}
            nombreArchivoPDF={`Cotizacion_${docVis.cotizacion.numero_cot}_${docVis.cotizacion.cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}`}
            textoDescriptivo={docVis.textoDescriptivo}
            clienteTelefono={docVis.cotizacion.cliente.telefono}
            onEnviarWhatsApp={() => {
              const phone = docVis.cotizacion.cliente.telefono;
              if (phone) {
                const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(docVis.textoDescriptivo)}`;
                openWhatsApp(url);
              }
            }}
          />
        );
      })()}
    </div>
  );
};
