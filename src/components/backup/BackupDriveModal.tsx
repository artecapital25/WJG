import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FolderSync, 
  Cloud, 
  Share2, 
  Table, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  RefreshCw, 
  Code2, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  FileJson, 
  Sparkles,
  Clock,
  HardDrive
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { GoogleSheetsSyncService, GoogleSheetsConfig } from '../../services/googleSheetsSyncService';

interface BackupDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  onRestoredSuccess?: () => void;
}

export const BackupDriveModal: React.FC<BackupDriveModalProps> = ({
  isOpen,
  onClose,
  cloudStatus = 'connected',
  onRestoredSuccess
}) => {
  const [modalTab, setModalTab] = useState<'sheets' | 'json'>('sheets');
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'info' | 'error'; texto: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isTestingDriveBackup, setIsTestingDriveBackup] = useState(false);
  const [isSettingTrigger, setIsSettingTrigger] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Configuración de Google Sheets / Apps Script
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => GoogleSheetsSyncService.getConfig());
  const [webAppUrlInput, setWebAppUrlInput] = useState(sheetsConfig.webAppUrl || '');
  const [sheetUrlInput, setSheetUrlInput] = useState(sheetsConfig.sheetUrl || '');
  const [autoSyncInput, setAutoSyncInput] = useState(sheetsConfig.autoSync || false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recargar configuración al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const cfg = GoogleSheetsSyncService.getConfig();
      setSheetsConfig(cfg);
      setWebAppUrlInput(cfg.webAppUrl || '');
      setSheetUrlInput(cfg.sheetUrl || '');
      setAutoSyncInput(cfg.autoSync || false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Estadísticas del backup en vivo
  const backupData = StorageService.getBackupData();
  const totalCotizaciones = backupData.cotizaciones?.length || 0;
  const totalClientes = backupData.clientes?.length || 0;
  const totalVentasPOS = backupData.ventas_express?.length || 0;
  const totalOTs = backupData.ordenes?.length || 0;
  const totalStock = backupData.productos_stock?.length || 0;
  const totalTareas = backupData.tareas?.length || 0;
  const totalInsumos = backupData.insumos?.length || 0;
  const totalResinas = backupData.resinas?.length || 0;
  const totalHerramientas = backupData.herramientas?.length || 0;

  // Guardar configuración de Google Sheets
  const handleGuardarConfig = () => {
    const updated = GoogleSheetsSyncService.saveConfig({
      webAppUrl: webAppUrlInput.trim(),
      sheetUrl: sheetUrlInput.trim(),
      autoSync: autoSyncInput
    });
    setSheetsConfig(updated);
    setFeedbackMsg({
      tipo: 'success',
      texto: 'Configuración guardada correctamente.'
    });
  };

  // Ejecutar respaldo autónomo a Google Drive ahora
  const handleEjecutarDriveBackup = async () => {
    if (!webAppUrlInput.trim()) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Por favor ingresa primero la URL de tu Google Apps Script (/exec).'
      });
      return;
    }

    handleGuardarConfig();
    setIsTestingDriveBackup(true);
    setFeedbackMsg(null);

    try {
      const res = await GoogleSheetsSyncService.triggerNightlyDriveBackup(webAppUrlInput.trim());
      if (res.success) {
        setFeedbackMsg({
          tipo: 'success',
          texto: '🎉 ' + (res.message || 'Respaldo ejecutado con éxito en la carpeta WJGEEKS_3D_Backups de tu Google Drive.')
        });
      } else {
        setFeedbackMsg({
          tipo: 'error',
          texto: '❌ ' + res.message
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Error de conexión con Google Apps Script: ' + (e?.message || 'Fallo de red')
      });
    } finally {
      setIsTestingDriveBackup(false);
    }
  };

  // Programar disparador nocturno automático a las 3:00 AM
  const handleConfigurarTriggerNocturno = async () => {
    if (!webAppUrlInput.trim()) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Por favor ingresa primero la URL de tu Google Apps Script (/exec).'
      });
      return;
    }

    handleGuardarConfig();
    setIsSettingTrigger(true);
    setFeedbackMsg(null);

    try {
      const res = await GoogleSheetsSyncService.setupNightlyBackupTrigger(webAppUrlInput.trim());
      if (res.success) {
        setFeedbackMsg({
          tipo: 'success',
          texto: '⏰ ' + (res.message || '¡Disparador nocturno configurado! Se ejecutará todas las madrugadas a las 3:00 AM automáticamente en Google Drive.')
        });
      } else {
        setFeedbackMsg({
          tipo: 'error',
          texto: '❌ ' + res.message
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Error configurando disparador nocturno: ' + (e?.message || 'Fallo de red')
      });
    } finally {
      setIsSettingTrigger(false);
    }
  };

  // Sincronizar datos a Google Sheets mediante Apps Script
  const handleSincronizarSheets = async () => {
    if (!webAppUrlInput.trim()) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Por favor ingresa primero la URL de tu Google Apps Script (/exec).'
      });
      return;
    }

    handleGuardarConfig();
    setIsSyncingSheets(true);
    setFeedbackMsg(null);

    try {
      const res = await GoogleSheetsSyncService.syncData(webAppUrlInput.trim());
      if (res.success) {
        setSheetsConfig(GoogleSheetsSyncService.getConfig());
        setFeedbackMsg({
          tipo: 'success',
          texto: `🎉 ¡Sincronizado! 8 tablas actualizadas en tu Google Sheet de Drive (${res.timestamp || new Date().toLocaleTimeString()}).`
        });
      } else {
        setFeedbackMsg({
          tipo: 'error',
          texto: '❌ ' + res.message
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Error de sincronización: ' + (e?.message || 'Error de conexión')
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Copiar código del Apps Script al portapapeles
  const handleCopiarScript = () => {
    const code = GoogleSheetsSyncService.getAppsScriptCode();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Abrir Google Sheets en Drive
  const handleAbrirSheetEnDrive = () => {
    if (sheetUrlInput.trim()) {
      window.open(sheetUrlInput.trim(), '_blank');
    } else {
      window.open('https://drive.google.com/drive/my-drive', '_blank');
    }
  };

  // 1. Guardar en Google Drive / Compartir JSON (Móviles / PC)
  const handleGuardarEnDriveJson = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const res = await StorageService.exportBackupToDriveOrShare();
      if (res.method === 'share' && res.success) {
        setFeedbackMsg({
          tipo: 'success',
          texto: '✅ Menú de compartir abierto: selecciona "Guardar en Drive", WhatsApp o Archivos para guardar tu copia.'
        });
      } else if (res.method === 'download') {
        setFeedbackMsg({
          tipo: 'info',
          texto: `📥 Archivo ${res.fileName} descargado exitosamente. Ahora puedes guardarlo en tu Google Drive.`
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Error generando el archivo de respaldo: ' + (e?.message || 'Error desconocido')
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Descargar archivo JSON estándar
  const handleDescargarJson = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const fileName = await StorageService.exportBackup();
      setFeedbackMsg({
        tipo: 'success',
        texto: `📥 Copia de seguridad descargada exitosamente: ${fileName}`
      });
    } catch (e: any) {
      setFeedbackMsg({
        tipo: 'error',
        texto: 'Error al generar descarga JSON: ' + (e?.message || 'Error')
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Restaurar copia de seguridad JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const confirmacion = window.confirm(
          '⚠️ ¿Estás seguro de que deseas restaurar esta copia de seguridad?\n\nEsto actualizará la información local del taller con los datos del archivo.'
        );
        if (!confirmacion) return;

        const res = StorageService.importBackup(content);
        if (res.success) {
          const statsResumen = Object.entries(res.stats)
            .map(([k, v]) => `${v} ${k}`)
            .join(', ');
          setFeedbackMsg({
            tipo: 'success',
            texto: `🎉 ¡Copia de seguridad restaurada con éxito! Se cargaron: ${statsResumen || 'datos'}. La página se actualizará.`
          });
          setTimeout(() => {
            if (onRestoredSuccess) onRestoredSuccess();
            window.location.reload();
          }, 1800);
        } else {
          setFeedbackMsg({
            tipo: 'error',
            texto: '❌ El archivo no tiene un formato válido de respaldo de WJGEEKS.'
          });
        }
      } catch (err: any) {
        setFeedbackMsg({
          tipo: 'error',
          texto: '❌ Error al leer el archivo: ' + err.message
        });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          margin: 0,
          maxWidth: '720px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(56, 189, 248, 0.25))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            color: '#34d399'
          }}>
            <FileSpreadsheet size={26} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Base de Datos en Google Drive & Sheets
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Valida, consulta y edita tablas en vivo mediante Google Sheets y Google Apps Script.
            </p>
          </div>
        </div>

        {/* Selector de pestañas internas del modal */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '18px'
        }}>
          <button
            type="button"
            onClick={() => setModalTab('sheets')}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: modalTab === 'sheets' ? 'linear-gradient(135deg, #0ea5e9, #10b981)' : 'transparent',
              color: modalTab === 'sheets' ? '#fff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Clock size={16} />
            <span>Google Drive Automático (3:00 AM)</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('json')}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: modalTab === 'json' ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'transparent',
              color: modalTab === 'json' ? '#fff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <HardDrive size={16} />
            <span>Respaldo Manual Local (Móvil & PC)</span>
          </button>
        </div>

        {/* Mensaje de feedback */}
        {feedbackMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: feedbackMsg.tipo === 'success' ? 'rgba(34, 197, 94, 0.15)' : feedbackMsg.tipo === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
            border: `1px solid ${feedbackMsg.tipo === 'success' ? '#22c55e' : feedbackMsg.tipo === 'error' ? '#ef4444' : 'var(--brand-cyan)'}`,
            color: feedbackMsg.tipo === 'success' ? '#4ade80' : feedbackMsg.tipo === 'error' ? '#f87171' : '#38bdf8'
          }}>
            {feedbackMsg.tipo === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.texto}</span>
          </div>
        )}

        {/* PESTAÑA 1: GOOGLE DRIVE AUTOMÁTICO & SHEETS */}
        {modalTab === 'sheets' && (
          <div>
            {/* TARJETA PRINCIPAL: RESPALDO NOCTURNO AUTOMÁTICO EN GOOGLE DRIVE */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(16, 185, 129, 0.14))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#38bdf8" />
                  <span>Respaldo Autónomo en Google Drive (Madrugada 3:00 AM)</span>
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.4)'
                }}>
                  ● 100% en la Nube de Google
                </div>
              </div>

              <p style={{ fontSize: '0.79rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                Se ejecuta todas las noches en la madrugada (<strong>3:00 AM Colombia</strong>) en los servidores de Google sin necesidad de que tu computador o celular estén encendidos. Guarda automáticamente un archivo JSON con todas las tablas en tu carpeta <strong>WJGEEKS_3D_Backups</strong> de Google Drive y conserva los últimos 30 días.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEjecutarDriveBackup}
                  disabled={isTestingDriveBackup}
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #0ea5e9, #10b981)'
                  }}
                >
                  <RefreshCw size={15} className={isTestingDriveBackup ? 'animate-spin' : ''} />
                  <span>{isTestingDriveBackup ? 'Generando en Drive...' : '⚡ Probar / Guardar en Drive Ahora'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleConfigurarTriggerNocturno}
                  disabled={isSettingTrigger}
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderColor: 'rgba(56, 189, 248, 0.4)'
                  }}
                >
                  <Clock size={15} color="var(--brand-cyan)" />
                  <span>{isSettingTrigger ? 'Configurando...' : '⏰ Activar Disparador (3:00 AM)'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.open('https://drive.google.com/drive/my-drive', '_blank')}
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <ExternalLink size={15} color="#38bdf8" />
                  <span>Abrir Carpeta en Drive</span>
                </button>
              </div>

              {/* Enlace directo y diagnóstico en vivo */}
              {webAppUrlInput.trim() && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.76rem',
                  color: '#94a3b8'
                }}>
                  <span>¿Deseas verificar la respuesta del servidor de Google directamente?</span>
                  <a 
                    href={webAppUrlInput.trim().includes('?') ? `${webAppUrlInput.trim()}&action=trigger_backup_drive` : `${webAppUrlInput.trim()}?action=trigger_backup_drive`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      color: '#38bdf8', 
                      textDecoration: 'none', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontWeight: 700
                    }}
                  >
                    <span>Ejecutar en nueva pestaña</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {/* Guía de publicación de Nueva Versión */}
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontSize: '0.75rem',
                color: '#cbd5e1',
                lineHeight: 1.5
              }}>
                <strong style={{ color: '#38bdf8' }}>💡 ¿Probaste en el editor de Apps Script y funcionó, pero desde aquí no?</strong>
                <p style={{ margin: '4px 0 6px 0' }}>
                  Cuando pruebas en el editor ejecutas el borrador directo. Para que las peticiones web funcionen, debes publicar la nueva versión en la URL pública:
                </p>
                <ol style={{ margin: '0 0 0 16px', padding: 0 }}>
                  <li>En <code>script.google.com</code> haz clic en <strong>Implementar &gt; Administrar implementaciones</strong>.</li>
                  <li>Haz clic en el <strong>Lápiz ✏️ (Editar)</strong> de tu implementación activa.</li>
                  <li>En el selector <strong>Versión</strong>, selecciona <strong>"Nueva versión"</strong> y dale clic al botón azul <strong>Implementar</strong>.</li>
                  <li><em>(Si en cambio creaste una "Nueva implementación", copia la nueva URL terminada en <code>/exec</code> y pégala aquí abajo).</em></li>
                </ol>
              </div>
            </div>

            {/* Formulario de Configuración de Apps Script */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                1. URL de la Aplicación Web de Google Apps Script *
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input 
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={webAppUrlInput}
                  onChange={e => setWebAppUrlInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setWebAppUrlInput(text);
                    } catch (_) {}
                  }}
                  title="Pegar del portapapeles"
                >
                  Pegar
                </button>
              </div>

              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                2. Enlace directo a tu Hoja de Cálculo en Drive (Opcional)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input 
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={sheetUrlInput}
                  onChange={e => setSheetUrlInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAbrirSheetEnDrive}
                  title="Abrir la hoja de cálculo en una pestaña de Drive"
                  style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
                >
                  <ExternalLink size={14} color="var(--brand-cyan)" />
                  <span>Abrir en Drive</span>
                </button>
              </div>

              {/* Toggle de Auto-Sincronización */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                    Auto-sincronización con Google Sheets
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Actualizar las tablas de Drive al registrar cotizaciones o ventas
                  </div>
                </div>

                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={autoSyncInput}
                    onChange={e => {
                      setAutoSyncInput(e.target.checked);
                      GoogleSheetsSyncService.saveConfig({ autoSync: e.target.checked });
                    }}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </div>

            {/* BOTONES PRINCIPALES DE ACCIÓN GOOGLE SHEETS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSincronizarSheets}
                disabled={isSyncingSheets}
                style={{
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #10b981, #0ea5e9)'
                }}
              >
                <RefreshCw size={16} className={isSyncingSheets ? 'animate-spin' : ''} />
                <span>{isSyncingSheets ? 'Sincronizando...' : '⚡ Sincronizar a Drive'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowScriptModal(!showScriptModal)}
                style={{
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderColor: 'rgba(56, 189, 248, 0.4)'
                }}
              >
                <Code2 size={16} color="var(--brand-cyan)" />
                <span>{showScriptModal ? 'Ocultar Código Apps Script' : 'Obtener Código Apps Script'}</span>
              </button>
            </div>

            {/* Estado de última sincronización */}
            {sheetsConfig.lastSync && (
              <div style={{
                fontSize: '0.74rem',
                color: sheetsConfig.lastStatus === 'success' ? '#34d399' : '#f87171',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                Última sincronización exitosa: <strong>{sheetsConfig.lastSync}</strong>
              </div>
            )}

            {/* ACORDEÓN / DESPLEGABLE CON EL CÓDIGO GOOGLE APPS SCRIPT */}
            {showScriptModal && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code2 size={16} color="var(--brand-cyan)" />
                    <span>Instrucciones de Instalación en Google Drive (2 minutos)</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCopiarScript}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCode ? '¡Código Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>

                <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                  <ol style={{ margin: 0, paddingLeft: '18px' }}>
                    <li>Abre <a href="https://drive.google.com" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Google Drive</a> y crea una <strong>Hoja de cálculo de Google</strong> en blanco.</li>
                    <li>En el menú superior de la hoja, haz clic en <strong>Extensiones &gt; Apps Script</strong>.</li>
                    <li>Borra el contenido existente y haz clic en el botón superior <strong>"Copiar Código"</strong> para pegarlo allí.</li>
                    <li>Guarda el proyecto y haz clic en <strong>Implementar &gt; Nueva implementación</strong>.</li>
                    <li>Selecciona tipo: <strong>Aplicación web</strong>, Ejecutar como: <strong>Yo</strong>, Quién tiene acceso: <strong>Cualquiera</strong>.</li>
                    <li>Copia la URL terminada en <code>/exec</code> y pégala en el campo de arriba.</li>
                  </ol>
                </div>

                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  background: '#090d16',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <pre style={{ margin: 0 }}>{GoogleSheetsSyncService.getAppsScriptCode()}</pre>
                </div>
              </div>
            )}

            {/* PREVISUALIZACIÓN DE LAS 8 TABLAS QUE SE SINCRONIZAN */}
            <div style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '10px'
            }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--brand-cyan)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📑 8 Tablas automáticas que verás en tu Hoja de Cálculo:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '0.74rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  📊 <strong>Resumen</strong> (KPIs)
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  💼 <strong>Cotizaciones</strong> ({totalCotizaciones})
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  ⚙️ <strong>Órdenes OTs</strong> ({totalOTs})
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  ⚡ <strong>Ventas POS</strong> ({totalVentasPOS})
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  👥 <strong>Clientes</strong> ({totalClientes})
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  📦 <strong>Stock</strong> ({totalStock})
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  🧪 <strong>Materiales</strong> ({totalResinas + totalInsumos})
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
                  🛠️ <strong>Apps 3D</strong> ({totalHerramientas})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: RESPALDO JSON & ARCHIVOS */}
        {modalTab === 'json' && (
          <div>
            {/* Estado en Vivo de Supabase Cloud */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={18} color={cloudStatus === 'connected' ? '#34d399' : '#fbbf24'} />
                <span style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 700 }}>
                  {cloudStatus === 'connected' ? 'Base de Datos Supabase en Vivo' : 'Modo Almacenamiento Local'}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                PostgreSQL • Sincronización Automática Activa
              </div>
            </div>

            {/* Explicativo de respaldo manual móvil */}
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '0.8rem',
              color: 'var(--text-main)',
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HardDrive size={16} />
                <span>Respaldo Manual Seguro (Especial para Celulares & PC)</span>
              </div>
              <div>
                Extrae el 100% de la base de datos viva (Órdenes, Abonos, Ventas POS, Cotizaciones, Clientes y Stock). En celular abre el menú nativo para guardar en Drive, WhatsApp o Archivos en un segundo.
              </div>
            </div>

            {/* BOTONES DE ACCIÓN JSON */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGuardarEnDriveJson}
                disabled={isProcessing}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #0ea5e9, #10b981)'
                }}
              >
                <Share2 size={18} className={isProcessing ? 'animate-spin' : ''} />
                <span>{isProcessing ? 'Preparando archivo completo...' : '📱 Guardar / Compartir Respaldo (Celular o Drive)'}</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDescargarJson}
                  disabled={isProcessing}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px'
                  }}
                >
                  <Download size={15} />
                  <span>Descargar Archivo JSON</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.open('https://drive.google.com/drive/my-drive', '_blank')}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderColor: 'rgba(56, 189, 248, 0.4)'
                  }}
                >
                  <ExternalLink size={15} color="var(--brand-cyan)" />
                  <span>Abrir Google Drive Web</span>
                </button>
              </div>
            </div>

            {/* RESTAURAR COPIA DE SEGURIDAD */}
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>
                  Restaurar Base de Datos desde Archivo JSON
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  ¿Cambiaste de equipo? Sube tu archivo JSON previo para recuperar todo.
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json,application/json" 
                style={{ display: 'none' }} 
              />

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
              >
                <Upload size={14} />
                <span>Subir Archivo JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
