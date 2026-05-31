import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  selectNotifEnabled,
  selectNotifPermission,
  selectNotifDaysAhead,
} from '../../features/notifications/notificationsSlice';
import {
  supportsNotifications,
  supportsServiceWorker,
  getBrowserPermission,
} from '../../features/notifications/useNotifications';
import {
  selectExpiredCount,
  selectRedCount,
  selectYellowCount,
} from '../../features/stock/expirationSlice';
import NotificationSettingsModal from './NotificationSettingsModal';

export default function NotificationBell({ onRequestPermission }) {
  const enabled      = useSelector(selectNotifEnabled);
  const permission   = useSelector(selectNotifPermission);
  const daysAhead    = useSelector(selectNotifDaysAhead);
  const expiredCount = useSelector(selectExpiredCount);
  const redCount     = useSelector(selectRedCount);
  const yellowCount  = useSelector(selectYellowCount);

  const [modalOpen, setModalOpen] = useState(false);

  const urgentCount = expiredCount + redCount + yellowCount;
  const browserPerm = getBrowserPermission();

  const iconColor = !supportsNotifications()
    ? '#B5A898'
    : browserPerm === 'granted' && enabled
      ? '#C8893A'
      : browserPerm === 'denied'
        ? '#C0392B'
        : '#8C7B6B';

  const tooltip = !supportsNotifications()
    ? 'Tu navegador no soporta notificaciones'
    : browserPerm === 'granted' && enabled
      ? `Notificaciones activas · Alertando ${daysAhead} días antes`
      : browserPerm === 'denied'
        ? 'Notificaciones bloqueadas — clic para ver cómo habilitarlas'
        : 'Configurar notificaciones de vencimiento';

  const handleTestNotification = useCallback(async () => {
    if (!supportsNotifications() || Notification.permission !== 'granted') return;
    const title = 'PanStock — Prueba de notificación';
    const body  = 'Categoría: Panadería\nVence: 31 de mayo de 2026\nCantidad en riesgo: 6 u.\n(Prueba)';
    try {
      const n = new Notification(title, { body, icon: '/logo_panstock.png', tag: 'panstock-test', renotify: true });
      n.onclick = () => { window.focus(); n.close(); };
      return;
    } catch (_) {}
    if (supportsServiceWorker()) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg?.active) {
          await reg.showNotification(title, { body, icon: '/logo_panstock.png', tag: 'panstock-test' });
        }
      } catch (err) { console.warn('[PanStock] Test SW error:', err); }
    }
  }, []);

  return (
    <>
      <button
        className="bell-btn"
        onClick={() => setModalOpen(true)}
        title={tooltip}
        aria-label="Configuración de notificaciones"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true" style={{ display:'block' }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          {browserPerm === 'denied' && (
            <line x1="3" y1="3" x2="21" y2="21" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
          )}
        </svg>

        {supportsNotifications() && (
          <span className="bell-dot" style={{
            background: browserPerm === 'granted' && enabled
              ? '#27AE60'
              : browserPerm === 'denied'
                ? '#C0392B'
                : 'transparent',
          }}/>
        )}

        {urgentCount > 0 && enabled && browserPerm === 'granted' && (
          <span className="bell-badge">{urgentCount > 9 ? '9+' : urgentCount}</span>
        )}
      </button>

      {modalOpen && (
        <NotificationSettingsModal
          onClose={() => setModalOpen(false)}
          onRequestPermission={onRequestPermission}
          onTestNotification={handleTestNotification}
        />
      )}

      <style>{`
        .bell-btn {
          position:relative; display:flex; align-items:center; justify-content:center;
          width:34px; height:34px; background:none;
          border:1.5px solid var(--cream-dark,#EDE6DB); border-radius:10px;
          cursor:pointer; flex-shrink:0; padding:0;
          transition:background 0.15s, border-color 0.15s;
        }
        .bell-btn:hover { background:var(--cream-dark,#EDE6DB); border-color:var(--amber,#C8893A); }
        .bell-dot {
          position:absolute; bottom:5px; right:5px; width:7px; height:7px;
          border-radius:50%; border:1.5px solid white; transition:background 0.3s; pointer-events:none;
        }
        .bell-badge {
          position:absolute; top:-4px; right:-4px; min-width:16px; height:16px;
          padding:0 3px; border-radius:8px; border:1.5px solid white; background:#E74C3C;
          color:white; font-size:0.55rem; font-weight:800;
          display:flex; align-items:center; justify-content:center;
          line-height:1; pointer-events:none; animation:pulse-badge 2s ease infinite;
        }
      `}</style>
    </>
  );
}
