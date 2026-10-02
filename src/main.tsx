import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Registro de Service Worker para capacidades PWA e instalación en dispositivos
if ('serviceWorker' in navigator) {
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
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
