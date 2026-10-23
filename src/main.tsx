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
        })
        .catch((err) => {
          console.warn('PWA Service Worker note:', err);
        });
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
