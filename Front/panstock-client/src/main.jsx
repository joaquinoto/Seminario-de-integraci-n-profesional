import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import App from './App';


/* ────────────────────────────────────────────────────────────────────────────
   SERVICE WORKER — registro temprano para que esté disponible antes de
   que cualquier componente monte useNotifications.
   
   CRÍTICO para macOS:
   1. Registramos en el evento 'load' (no inline) para no bloquear el parse.
   2. Esperamos a que el SW llegue a estado 'activated' antes de declarar
      el SW como listo. En macOS, el SW puede quedar en 'installing' o
      'waiting' y showNotification() fallaría con InvalidStateError.
   3. Si el SW estaba registrado pero en estado desactualizado (waiting),
      le mandamos SKIP_WAITING para forzar la activación del nuevo.
   ────────────────────────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      let reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      if (import.meta.env.DEV) {
        console.log('[PanStock SW] Registrado:', reg.scope);
      }

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      await navigator.serviceWorker.ready;

      if (import.meta.env.DEV) {
        const activeSW = (await navigator.serviceWorker.getRegistration('/'))?.active;
        console.log('[PanStock SW] Estado activo:', activeSW?.state);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[PanStock SW] Error al registrar:', err);
      }
    }
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
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <img src="/logo_panstock.png" alt="Logo" width="70" height="70" />
        <span style={{ fontFamily:'Georgia,serif', fontSize:'1.4rem', fontWeight:700, color:'#1C1108' }}>PanStock</span>
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
