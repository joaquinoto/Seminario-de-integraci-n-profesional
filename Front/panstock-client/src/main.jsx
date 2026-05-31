import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import App from './App';
import './index.css';

// ── Registrar Service Worker para notificaciones push ────────────────────────
// Lo hacemos aquí (fuera del árbol React) para que esté disponible lo antes
// posible, independientemente de qué componente monte useNotifications primero.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        // El hook useNotifications también hace su propia obtención del SW,
        // pero al registrarlo aquí aseguramos que esté disponible antes
        // de que cualquier componente lo necesite.
        if (import.meta.env.DEV) {
          console.log('[PanStock SW] Registrado:', reg.scope);
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[PanStock SW] Error al registrar:', err);
        }
      });
  });
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cream)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div>
        <img src="/logo_panstock.png" alt="Logo" width="70" height="70" className="me-2"/>
        <span className="logo-text">PanStock</span>
      </div>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #EDE6DB',
        borderTopColor: '#C8893A',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);