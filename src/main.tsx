import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ToastProvider } from './components/ui/ToastProvider';
import './index.css';

// Registro de Service Worker para capacidades PWA e instalación en dispositivos (Solo en Producción)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✓ WJGEEKS PWA Service Worker activo con alcance:', reg.scope);

          // Verificar si hay actualizaciones cuando el usuario regrese a la app
          window.addEventListener('focus', () => {
            reg.update().catch(() => {});
          });

          // Detectar si se instaló una nueva versión en segundo plano
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Notificar al nuevo worker que tome el control inmediatamente
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('PWA Service Worker note:', err);
        });
    });

    // Recargar suavemente la aplicación solo cuando un nuevo Service Worker haya tomado el control
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        window.location.reload();
      }
    });
  } else {
    // En entorno de desarrollo (localhost), desactivar workers previos para evitar desfases de caché en HMR
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
