import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToastHandler: ((type: ToastType, message: string, title?: string) => void) | null = null;

export const toast = {
  success: (message: string, title?: string) => globalToastHandler?.('success', message, title),
  error: (message: string, title?: string) => globalToastHandler?.('error', message, title),
  warning: (message: string, title?: string) => globalToastHandler?.('warning', message, title),
  info: (message: string, title?: string) => globalToastHandler?.('info', message, title)
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string, duration: number = 3800) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { id, type, message, title, duration };

    setToasts(prev => [...prev.slice(-4), newToast]); // Mantener máximo 5 en pantalla

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string, title?: string) => showToast('success', msg, title || '¡Éxito!'), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast('error', msg, title || 'Atención'), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast('warning', msg, title || 'Aviso'), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast('info', msg, title || 'Información'), [showToast]);

  // Asignar manejador global
  globalToastHandler = showToast;

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      <div className="wjg-toast-container" role="region" aria-label="Notificaciones del sistema" aria-live="polite">
        {toasts.map(t => {
          let Icon = CheckCircle2;
          let iconColor = '#10b981';

          if (t.type === 'error') {
            Icon = AlertCircle;
            iconColor = '#ef4444';
          } else if (t.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = '#f59e0b';
          } else if (t.type === 'info') {
            Icon = Info;
            iconColor = '#38bdf8';
          }

          return (
            <div key={t.id} className={`wjg-toast wjg-toast-${t.type}`} role="alert">
              <div className="wjg-toast-icon">
                <Icon size={18} color={iconColor} />
              </div>
              <div className="wjg-toast-content">
                {t.title && <div className="wjg-toast-title">{t.title}</div>}
                <div className="wjg-toast-message">{t.message}</div>
              </div>
              <button 
                type="button" 
                className="wjg-toast-close" 
                onClick={() => removeToast(t.id)}
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
};
