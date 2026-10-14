import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Smartphone, 
  HardDrive, 
  FolderSync, 
  Cloud, 
  Share2,
  Terminal,
  FileJson
} from 'lucide-react';
import { StorageService } from '../../services/storageService';

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
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'info' | 'error'; texto: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Estadísticas del backup en vivo
  const backupData = StorageService.getBackupData();
  const totalCotizaciones = backupData.cotizaciones?.length || 0;
  const totalClientes = backupData.clientes?.length || 0;
  const totalVentasPOS = backupData.ventas_express?.length || 0;
  const totalTareas = backupData.tareas?.length || 0;
  const totalInsumos = backupData.insumos?.length || 0;
  const totalResinas = backupData.resinas?.length || 0;

  // 1. Guardar en Google Drive / Compartir
  const handleGuardarEnDrive = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const res = await StorageService.exportBackupToDriveOrShare();
      if (res.method === 'share' && res.success) {
        setFeedbackMsg({
          tipo: 'success',
          texto: '✅ Menú de compartir abierto: selecciona "Guardar en Drive" para subir tu respaldo.'
        });
      } else if (res.method === 'download') {
        setFeedbackMsg({
          tipo: 'info',
          texto: '📥 Archivo descargado en tu equipo. Ahora puedes arrastrarlo a tu carpeta de Google Drive.'
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
  const handleDescargarJson = () => {
    StorageService.exportBackup();
    setFeedbackMsg({
      tipo: 'success',
      texto: '📥 Copia de seguridad descargada exitosamente en formato JSON.'
    });
  };

  // 3. Abrir Google Drive Web
  const handleAbrirDriveWeb = () => {
    window.open('https://drive.google.com/drive/my-drive', '_blank');
  };

  // 4. Restaurar copia de seguridad
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

        const ok = StorageService.importBackup(content);
        if (ok) {
          setFeedbackMsg({
            tipo: 'success',
            texto: '🎉 ¡Copia de seguridad restaurada con éxito! La página se recargará para reflejar los datos.'
          });
          setTimeout(() => {
            if (onRestoredSuccess) onRestoredSuccess();
            window.location.reload();
          }, 1500);
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
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
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
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(34, 197, 94, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: 'var(--brand-cyan)'
          }}>
            <Database size={24} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Copia de Seguridad & Google Drive
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Respalda y protege la base de datos completa de WJGEEKS 3D PRO en tu nube personal.
            </p>
          </div>
        </div>

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

        {/* Resumen del Contenido que se Respalda */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.06)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-cyan)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📦 ¿Qué incluye este archivo de respaldo?
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.76rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
              <strong>{totalClientes}</strong> Clientes
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
              <strong>{totalCotizaciones}</strong> Cotizaciones
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
              <strong>{totalVentasPOS}</strong> Ventas POS
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
              <strong>{totalTareas}</strong> Tareas Equipo
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
              <strong>{totalResinas}</strong> Resinas
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', color: '#fff' }}>
              <strong>{totalInsumos}</strong> Insumos
            </div>
          </div>
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

        {/* BOTONES DE ACCIÓN PRINCIPALES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
          {/* Opción 1: Guardar en Google Drive / Compartir */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGuardarEnDrive}
            disabled={isProcessing}
            style={{
              padding: '12px 16px',
              fontSize: '0.92rem',
              fontWeight: 800,
              justifyContent: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, #0ea5e9, #10b981)'
            }}
          >
            <Share2 size={18} />
            <span>📱 Guardar en Google Drive / Compartir (1 Clic)</span>
          </button>

          {/* Opción 2: Descargar JSON */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDescargarJson}
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
              <span>Descargar JSON</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAbrirDriveWeb}
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
              title="Abrir drive.google.com en una pestaña nueva"
            >
              <ExternalLink size={15} color="var(--brand-cyan)" />
              <span>Abrir Drive Web</span>
            </button>
          </div>
        </div>

        {/* GUÍA PASO A PASO PARA GOOGLE DRIVE */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderSync size={16} color="var(--brand-cyan)" />
            ¿Cómo guardar y sincronizar con Google Drive?
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div>
              <strong style={{ color: '#fff' }}>1. En Celular (Android o iPhone):</strong> Pulsa el botón verde superior <em>"Guardar en Google Drive"</em>. Se abrirá el menú nativo de tu teléfono; selecciona <strong>Google Drive</strong> y elige tu carpeta preferida (ej: <code>WJGEEKS Backups</code>).
            </div>

            <div>
              <strong style={{ color: '#fff' }}>2. En Computador (PC / Laptop):</strong> Pulsa <em>"Descargar JSON"</em> y arrastra el archivo directamente a tu carpeta de Google Drive en el navegador, o guárdalo dentro de tu unidad sincronizada <code>G:\Mi unidad\</code> si usas Google Drive de escritorio.
            </div>

            <div>
              <strong style={{ color: '#fff' }}>3. Vía Terminal en el Proyecto:</strong> Puedes ejecutar <code>npm run backup</code> en la terminal y se generará una copia completa en la carpeta <code>backups/</code> con fecha y hora exacta.
            </div>
          </div>
        </div>

        {/* RESTAURAR COPIA DE SEGURIDAD */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>
              Restaurar Base de Datos
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              ¿Cambiaste de equipo? Sube un archivo JSON previo para recuperar todo.
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
            <span>Subir Backup JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
