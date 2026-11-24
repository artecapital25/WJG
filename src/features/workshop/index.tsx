import React, { useState } from 'react';
import { Kanban, Plus, Trash2, Clock, LayoutGrid, List } from 'lucide-react';
import { EstadoOT, OrdenTrabajo } from '../../types';
import { WorkOrdersPipelineProps } from './types/workshop.types';
import { useTallerOrders } from './hooks/useTallerOrders';
import { ETAPAS } from './utils/workshopUtils';
import { OTQuickFilters } from './components/OTQuickFilters';
import { OTCardItem } from './components/OTCardItem';
import { OTKanbanColumn } from './components/OTKanbanColumn';
import { OTStatusTransitionModal } from './components/OTStatusTransitionModal';
import { ModalProyectoRapido } from './components/ModalProyectoRapido';
import { ModalTrazabilidadSTL } from './components/ModalTrazabilidadSTL';
import { ModalDetalleCotizacionOT } from './components/ModalDetalleCotizacionOT';
import { ModalEditarEnlacesOT } from './components/ModalEditarEnlacesOT';
import { ModalConsumoRealOT } from './components/ModalConsumoRealOT';
import { ModalRegistrarPago } from '../../components/common/ModalRegistrarPago';
import { ModalEliminarOT } from '../../components/common/ModalEliminarOT';
import { WjgButton } from '../../components/ui';

export const WorkOrdersPipeline: React.FC<WorkOrdersPipelineProps> = (props) => {
  const taller = useTallerOrders(props);
  const [otParaConsumoReal, setOtParaConsumoReal] = useState<OrdenTrabajo | null>(null);

  return (
    <div style={{ paddingBottom: '70px' }}>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Kanban size={22} color="var(--brand-cyan)" />
            Taller & Órdenes de Trabajo (OT)
          </h2>
          <p className="section-subtitle">
            Flujo de manufactura 3D, proyectos directos por tarifario y trazabilidad STL (Germán ➔ Juan).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Toggle Vista Lista / Kanban */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            padding: '2px'
          }}>
            <WjgButton
              variant={taller.vistaModo === 'lista' ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<List size={14} />}
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              onClick={() => taller.setVistaModo('lista')}
              title="Vista Lista Móvil"
            >
              Lista
            </WjgButton>
            <WjgButton
              variant={taller.vistaModo === 'kanban' ? 'cyan' : 'secondary'}
              size="sm"
              leftIcon={<LayoutGrid size={14} />}
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              onClick={() => taller.setVistaModo('kanban')}
              title="Vista Tablero Kanban"
            >
              Kanban
            </WjgButton>
          </div>

          {props.onOpenProduccionInterna && (
            <WjgButton
              variant="secondary"
              size="sm"
              onClick={props.onOpenProduccionInterna}
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
              title="Registrar piezas de exhibición, vitrina, pruebas de calibración o fallas"
            >
              🧪 Pruebas & Exhibición
            </WjgButton>
          )}

          <WjgButton
            variant="quote"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => taller.setShowModalRapido(true)}
          >
            Proyecto Rápido
          </WjgButton>
        </div>
      </div>

      {/* Notificación de eliminación */}
      {taller.notifEliminacion && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.86rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Trash2 size={16} />
          <span>{taller.notifEliminacion}</span>
        </div>
      )}

      {/* Filtros Rápidos Touch */}
      <OTQuickFilters
        ordenes={props.ordenes}
        filtroEstado={taller.filtroEstado}
        setFiltroEstado={taller.setFiltroEstado}
        conSaldoCount={taller.conSaldoCount}
        entregadasCount={taller.entregadasCount}
        activasCount={taller.activasCount}
      />

      {/* Vista Principal: Lista o Kanban Columnas */}
      {taller.ordenesFiltradas.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p>No hay órdenes de trabajo en este estado.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Puedes registrar un <strong>Proyecto Rápido</strong> con el botón superior o aceptar una Cotización formal.
          </p>
        </div>
      ) : taller.vistaModo === 'kanban' ? (
        <div 
          className="kanban-board-container"
          style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            paddingBottom: '16px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {(taller.filtroEstado === 'entregadas' ? ['Entregado' as EstadoOT] : ETAPAS).map((etapa) => {
            const ordenesEtapa = taller.ordenesFiltradas.filter(o => o.estado === etapa);
            return (
              <OTKanbanColumn
                key={etapa}
                titulo={etapa === 'Entregado' ? '📦 Historial de Órdenes Entregadas' : etapa}
                estado={etapa}
                ordenes={ordenesEtapa}
                config={props.config}
                cotizaciones={props.cotizaciones}
                copiedOtId={taller.copiedOtId}
                copiedLinkId={taller.copiedLinkId}
                consumosReales={props.consumosReales}
                onOpenConsumoReal={setOtParaConsumoReal}
                colorBorder={etapa === 'Entregado' ? 'rgba(16, 185, 129, 0.4)' : undefined}
                badgeBg={etapa === 'Entregado' ? 'rgba(16, 185, 129, 0.15)' : undefined}
                onUpdateEstado={props.onUpdateEstado}
                onGenerarCuentaCobro={props.onGenerarCuentaCobro}
                onOpenCotizacionModal={taller.handleOpenCotizacionModal}
                onOpenLinksModal={taller.handleOpenLinksModal}
                onOpenModalSTL={taller.handleOpenModalSTL}
                onHandoffPorRol={taller.handleAbrirTransicionModal}
                onNotificarCliente={taller.handleNotificarCliente}
                onCopyTrackingLink={taller.handleCopyTrackingLink}
                onCopyLink={taller.handleCopyLink}
                onSetOtParaPago={taller.setOtParaPago}
                onSetOtParaEliminar={taller.setOtParaEliminar}
              />
            );
          })}
        </div>
      ) : (
        <div className="cards-grid-mobile">
          {taller.ordenesFiltradas.map(ot => (
            <OTCardItem
              key={ot.id}
              ot={ot}
              config={props.config}
              cotizaciones={props.cotizaciones}
              copiedOtId={taller.copiedOtId}
              copiedLinkId={taller.copiedLinkId}
              consumosRealesCount={(props.consumosReales || []).filter(c => c.orden_trabajo_id === ot.id).length}
              onOpenConsumoReal={setOtParaConsumoReal}
              onUpdateEstado={props.onUpdateEstado}
              onGenerarCuentaCobro={props.onGenerarCuentaCobro}
              onOpenCotizacionModal={taller.handleOpenCotizacionModal}
              onOpenLinksModal={taller.handleOpenLinksModal}
              onOpenModalSTL={taller.handleOpenModalSTL}
              onHandoffPorRol={taller.handleAbrirTransicionModal}
              onNotificarCliente={taller.handleNotificarCliente}
              onCopyTrackingLink={taller.handleCopyTrackingLink}
              onCopyLink={taller.handleCopyLink}
              onSetOtParaPago={taller.setOtParaPago}
              onSetOtParaEliminar={taller.setOtParaEliminar}
            />
          ))}
        </div>
      )}

      {/* Modal Pase de Turno / Transición de Estado */}
      <OTStatusTransitionModal
        isOpen={Boolean(taller.otParaTransicion)}
        ot={taller.otParaTransicion}
        handoffConfig={taller.configHandoffTransicion}
        siguienteEstado={taller.siguienteEstadoTransicion}
        onOpenConsumoReal={setOtParaConsumoReal}
        onClose={taller.handleCerrarTransicionModal}
        onConfirmHandoff={taller.handleConfirmarTransicionModal}
      />

      {/* Modal Registro de Consumos Reales (Taller y Pintor) */}
      <ModalConsumoRealOT
        isOpen={Boolean(otParaConsumoReal)}
        ot={otParaConsumoReal}
        cotizacion={
          otParaConsumoReal
            ? (props.cotizaciones || []).find(
                c =>
                  (otParaConsumoReal.cotizacion_id && c.id === otParaConsumoReal.cotizacion_id) ||
                  (otParaConsumoReal.cotizacion_numero && c.numero_cot === otParaConsumoReal.cotizacion_numero)
              )
            : null
        }
        resinas={props.resinas}
        filamentos={props.filamentos}
        insumos={props.insumos}
        personal={props.personal}
        consumosExistentes={
          otParaConsumoReal
            ? (props.consumosReales || []).filter(c => c.orden_trabajo_id === otParaConsumoReal.id)
            : []
        }
        activeOperator={props.activeOperator}
        activeOperatorId={props.activeOperatorId}
        onClose={() => setOtParaConsumoReal(null)}
        onSaveConsumo={(reg, descontar) => {
          props.onSaveConsumoReal?.(reg, descontar);
        }}
        onDeleteConsumo={props.onDeleteConsumoReal}
      />

      {/* Modal Proyecto Rápido */}
      <ModalProyectoRapido
        isOpen={taller.showModalRapido}
        onClose={() => taller.setShowModalRapido(false)}
        fotoUrlRapida={taller.fotoUrlRapida}
        setFotoUrlRapida={taller.setFotoUrlRapida}
        isProcessingImg={taller.isProcessingImg}
        nombreItemRapido={taller.nombreItemRapido}
        setNombreItemRapido={taller.setNombreItemRapido}
        clienteNombreRapido={taller.clienteNombreRapido}
        setClienteNombreRapido={taller.setClienteNombreRapido}
        clienteTelefonoRapido={taller.clienteTelefonoRapido}
        setClienteTelefonoRapido={taller.setClienteTelefonoRapido}
        alturaSeleccionada={taller.alturaSeleccionada}
        setAlturaSeleccionada={taller.setAlturaSeleccionada}
        crearCobroPOS={taller.crearCobroPOS}
        setCrearCobroPOS={taller.setCrearCobroPOS}
        fileInputRef={taller.fileInputRef}
        handleImageUpload={taller.handleImageUpload}
        handleGuardarProyectoRapido={taller.handleGuardarProyectoRapido}
      />

      {/* Modal Trazabilidad STL */}
      <ModalTrazabilidadSTL
        ot={taller.otParaSTL}
        onClose={() => taller.setOtParaSTL(null)}
        inputStlEstado={taller.inputStlEstado}
        setInputStlEstado={taller.setInputStlEstado}
        inputStlVersion={taller.inputStlVersion}
        setInputStlVersion={taller.setInputStlVersion}
        inputStlUrl={taller.inputStlUrl}
        setInputStlUrl={taller.setInputStlUrl}
        onGuardarSTL={taller.handleGuardarSTL}
        onSwitchToPago={(ot) => {
          taller.setOtParaSTL(null);
          taller.setOtParaPago(ot);
        }}
      />

      {/* Modal Detalle de Cotización Vinculada */}
      <ModalDetalleCotizacionOT
        cotizacion={taller.selectedCotizacionForModal}
        onClose={() => taller.setSelectedCotizacionForModal(null)}
        onNavigateToCotizaciones={props.onNavigateToCotizaciones}
      />

      {/* Modal Edición de Enlaces Web */}
      <ModalEditarEnlacesOT
        ot={taller.otParaEditarLinks}
        onClose={() => taller.setOtParaEditarLinks(null)}
        modalLinksList={taller.modalLinksList}
        onAddModalLink={taller.handleAddModalLink}
        onUpdateModalLink={taller.handleUpdateModalLink}
        onRemoveModalLink={taller.handleRemoveModalLink}
        onSaveLinksModal={taller.handleSaveLinksModal}
      />

      {/* Modal Registrar Pago */}
      {taller.otParaPago && (
        <ModalRegistrarPago
          isOpen={true}
          onClose={() => taller.setOtParaPago(null)}
          titulo={`Gestión de Pago • ${taller.otParaPago.numero_ot}`}
          subtitulo={`${taller.otParaPago.item_nombre} • Cliente: ${taller.otParaPago.cliente_nombre}`}
          referenciaDoc={taller.otParaPago.numero_ot}
          clienteNombre={taller.otParaPago.cliente_nombre}
          clienteTelefono={taller.otParaPago.cliente_telefono}
          montoTotal={
            taller.otParaPago.precio_cobrado || 
            (props.cotizaciones?.find(c => c.id === taller.otParaPago?.cotizacion_id || c.numero_cot === taller.otParaPago?.cotizacion_numero)?.total) || 
            50000
          }
          pagoActual={{
            estado_pago: taller.otParaPago.estado_pago,
            abono: taller.otParaPago.abono,
            saldo_pendiente: taller.otParaPago.saldo_pendiente,
            metodo_pago: taller.otParaPago.metodo_pago,
            comprobante_pago: taller.otParaPago.comprobante_pago
          }}
          esAprobacionCotizacion={false}
          onConfirmarPago={taller.handleConfirmarPagoOT}
        />
      )}

      {/* Modal Eliminar OT */}
      <ModalEliminarOT
        isOpen={Boolean(taller.otParaEliminar)}
        ot={taller.otParaEliminar}
        cotizaciones={props.cotizaciones || []}
        onClose={() => taller.setOtParaEliminar(null)}
        onConfirmarEliminar={taller.handleConfirmarEliminarOT}
      />
    </div>
  );
};
