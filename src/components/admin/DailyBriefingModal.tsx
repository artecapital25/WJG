import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Package, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  Sun,
  ShieldCheck,
  Zap,
  Building2,
  Calendar
} from 'lucide-react';
import { WhatsAppHealthStatus, WhatsAppPingResult, DailyBriefingData } from '../../types';
import { WhatsAppNotificationService } from '../../services/whatsappNotificationService';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessDispatch?: () => void;
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  onClose,
  onSuccessDispatch
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null);
  const [health, setHealth] = useState<WhatsAppHealthStatus | null>(null);
  const [pingResult, setPingResult] = useState<WhatsAppPingResult | null>(null);
  const [pingLoading, setPingLoading] = useState<boolean>(false);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const [briefingRes, healthRes] = await Promise.all([
        WhatsAppNotificationService.obtenerDailyBriefing(),
        WhatsAppNotificationService.obtenerSaludWhatsApp()
      ]);
      setBriefing(briefingRes);
      setHealth(healthRes);
    } catch (err) {
      console.error('Error cargando datos del Daily Briefing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
      setPingResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePing = async () => {
    setPingLoading(true);
    try {
      const res = await WhatsAppNotificationService.ejecutarPingWhatsApp();
      setPingResult(res);
      // Actualizar también estado de salud
      const healthRes = await WhatsAppNotificationService.obtenerSaludWhatsApp();
      setHealth(healthRes);
    } catch (err: any) {
      setPingResult({
        valido: false,
        proveedor: 'whatsapp_cloud_api',
        linea_oficial: '+57 320 2796115',
        modo: 'error',
        mensaje: 'Error de conexión con el proveedor de WhatsApp',
        error: err.message
      });
    } finally {
      setPingLoading(false);
    }
  };

  const handleCopiar = () => {
    if (!briefing?.mensaje_whatsapp) return;
    navigator.clipboard.writeText(briefing.mensaje_whatsapp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDespacho = async () => {
    setDispatchLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await WhatsAppNotificationService.despacharDailyBriefing({ force: true });
      setFeedbackMsg({
        tipo: 'success',
        texto: '¡Reporte diario despachado exitosamente por WhatsApp a Germán, Wendy y Juan!'
      });
      if (onSuccessDispatch) onSuccessDispatch();
      // Recargar métricas
      await cargarDatos();
    } catch (err: any) {
      setFeedbackMsg({
        tipo: 'error',
        texto: `Error despachando reporte: ${err.message || 'Fallo desconocido'}`
      });
    } finally {
      setDispatchLoading(false);
    }
  };

  const urlWhatsAppGerman = briefing?.mensaje_whatsapp 
    ? WhatsAppNotificationService.generarEnlaceWhatsAppBriefing(briefing.mensaje_whatsapp, '573503443140')
    : '#';

  const urlWhatsAppJuan = briefing?.mensaje_whatsapp 
    ? WhatsAppNotificationService.generarEnlaceWhatsAppBriefing(briefing.mensaje_whatsapp, '573217273025')
    : '#';

  const isOperativo = health?.status === 'operativo' || health?.motor_activo;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 7, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div 
        className="modal-container"
        style={{
          background: 'linear-gradient(145deg, #0d131f 0%, #080d16 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 240, 255, 0.1)',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc'
        }}
      >
        {/* Encabezado */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 240, 255, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(0, 240, 255, 0.2))',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Sun size={24} color="#f59e0b" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                  Daily Briefing & Monitor de WhatsApp
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(0, 240, 255, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(0, 240, 255, 0.3)'
                }}>
                  7:00 AM
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Línea Oficial: <strong style={{ color: '#38bdf8' }}>+57 320 2796115</strong> | Destinatarios: Germán, Wendy & Juan
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={cargarDatos}
              disabled={loading}
              className="btn btn-sm btn-secondary"
              title="Recargar datos en vivo"
              style={{ padding: '8px 12px' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div style={{
            padding: '10px 24px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: feedbackMsg.tipo === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: feedbackMsg.tipo === 'success' ? '#34d399' : '#f87171',
            borderBottom: `1px solid ${feedbackMsg.tipo === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {feedbackMsg.tipo === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedbackMsg.texto}</span>
          </div>
        )}

        {/* Cuerpo del Modal con Scroll */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. SECCIÓN MONITOR DE SALUD DE WHATSAPP (HEARTBEAT) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            border: isOperativo ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)',
            padding: '16px',
            boxShadow: isOperativo ? '0 0 15px rgba(16, 185, 129, 0.05)' : '0 0 20px rgba(239, 68, 68, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isOperativo ? '#10b981' : '#ef4444',
                  boxShadow: isOperativo ? '0 0 10px #10b981' : '0 0 12px #ef4444'
                }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
                  Estado del Motor de WhatsApp:
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: isOperativo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                  color: isOperativo ? '#34d399' : '#f87171',
                  border: `1px solid ${isOperativo ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                }}>
                  {isOperativo ? '✅ OPERATIVO' : '🚨 ALERTA DE ENVÍOS'}
                </span>
              </div>

              {/* Botón de Ping activo */}
              <button
                onClick={handlePing}
                disabled={pingLoading}
                className="btn btn-sm btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(0, 240, 255, 0.3)'
                }}
              >
                <Zap size={14} color="#38bdf8" />
                <span>{pingLoading ? 'Probando Conexión...' : 'Ping Meta Graph API'}</span>
              </button>
            </div>

            {/* Resultado del Ping si se ejecutó */}
            {pingResult && (
              <div style={{
                marginBottom: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: pingResult.valido ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${pingResult.valido ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                fontSize: '0.8rem',
                color: pingResult.valido ? '#a7f3d0' : '#fca5a5'
              }}>
                <strong>Respuesta Ping:</strong> {pingResult.mensaje} 
                {pingResult.quality_rating && ` | Calidad Meta: ${pingResult.quality_rating}`}
                {pingResult.error && ` (Detalle: ${pingResult.error})`}
              </div>
            )}

            {/* Grid de métricas de la tabla whatsapp_notification_logs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px'
            }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Tasa de Fallo</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: (health?.tasa_fallo_pct || 0) > 0 ? '#ef4444' : '#10b981' }}>
                  {health?.tasa_fallo_pct ?? 0}%
                </span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Enviados (24h)</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
                  {health?.enviados_24h ?? 0}
                </span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Fallidos (24h)</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: (health?.fallidos_24h || 0) > 0 ? '#ef4444' : '#94a3b8' }}>
                  {health?.fallidos_24h ?? 0}
                </span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>En Cola</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b' }}>
                  {health?.pendientes_cola ?? 0}
                </span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Estancados (&gt;15m)</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: (health?.estancados_mas_15m || 0) > 0 ? '#ef4444' : '#10b981' }}>
                  {health?.estancados_mas_15m ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* 2. TARJETAS DE SÍNTESIS OPERATIVA DEL DÍA */}
          {briefing && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px'
            }}>
              {/* Cobranzas */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <DollarSign size={18} color="#10b981" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Cobros del Día</span>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981', marginBottom: '4px' }}>
                  ${(briefing.finanzas_cobranzas?.total_cobros_hoy || 0).toLocaleString('es-CO')} COP
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Medio activo: <strong style={{ color: '#38bdf8' }}>Bre-B ({briefing.finanzas_cobranzas?.llave_bre_b || '0090778625'})</strong>
                </div>
              </div>

              {/* Taller / Entregas */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={18} color="#38bdf8" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Entregas Hoy (OTs)</span>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38bdf8', marginBottom: '4px' }}>
                  {briefing.taller_operaciones?.conteo_ots_entrega_hoy || 0} órdenes
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  En taller: {briefing.taller_operaciones?.ots_en_proceso_taller || 0} | Calidad: {briefing.taller_operaciones?.ots_control_calidad || 0}
                </div>
              </div>

              {/* Insumos */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package size={18} color="#f59e0b" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Insumos Críticos</span>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: (briefing.insumos_logistica?.conteo_insumos_urgentes || 0) > 0 ? '#f59e0b' : '#10b981', marginBottom: '4px' }}>
                  {(briefing.insumos_logistica?.conteo_insumos_urgentes || 0)} pendientes
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {(briefing.insumos_logistica?.conteo_insumos_urgentes || 0) > 0 ? 'Compras urgentes requeridas' : 'Sin alertas de stock'}
                </div>
              </div>
            </div>
          )}

          {/* 3. PREVISUALIZACIÓN DE LA PLANTILLA OFICIAL DE WHATSAPP */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>
                Plantilla Oficial de Envío por WhatsApp:
              </span>
              <button
                onClick={handleCopiar}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? '#34d399' : '#38bdf8',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Copy size={13} />
                <span>{copied ? '¡Texto Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <pre style={{
              background: '#04070d',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '16px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              color: '#93c5fd',
              whiteSpace: 'pre-wrap',
              maxHeight: '260px',
              overflowY: 'auto',
              margin: 0
            }}>
              {briefing?.mensaje_whatsapp || 'Cargando plantilla...'}
            </pre>
          </div>
        </div>

        {/* Pie del Modal con Acciones de Despacho */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <a
            href={urlWhatsAppGerman}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              color: '#34d399',
              borderColor: 'rgba(16, 185, 129, 0.3)'
            }}
          >
            <ExternalLink size={14} />
            <span>Abrir en WhatsApp Web / Móvil</span>
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={dispatchLoading}
            >
              Cerrar
            </button>

            <button
              onClick={handleDespacho}
              disabled={dispatchLoading}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#10b981',
                color: '#fff',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Send size={15} />
              <span>
                {dispatchLoading ? 'Despachando a Admins...' : '🚀 Despachar Reporte Diario Ahora'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
