import { useState, useEffect, useRef } from 'react';
import { createPortal }                from 'react-dom';
import { useDispatch, useSelector }    from 'react-redux';
import {
  selectNotifEnabled, selectNotifChannel, selectNotifInterval,
  selectNotifDaysAhead, selectLastCheckAt,
  setEnabled, setChannel, setIntervalMinutes, setAlertDaysAhead,
  syncPermission,
} from '../../features/notifications/notificationsSlice';
import {
  isMobileDevice, isMacOS, isSafari,
  supportsNotifications, supportsServiceWorker,
  getBrowserPermission,
} from '../../features/notifications/useNotifications';
import { selectUser } from '../../features/auth/authSlice';

function fmt(ts) {
  if (!ts) return 'Nunca';
  const d = Date.now() - ts;
  if (d < 60000)   return 'Hace un momento';
  if (d < 3600000) return `Hace ${Math.floor(d / 60000)} min`;
  return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function PermBadge({ p }) {
  const map = {
    granted:     { icon: '✅', label: 'Concedido',      color: '#2E7D32', bg: 'rgba(46,125,50,0.10)'     },
    denied:      { icon: '🚫', label: 'Denegado',       color: '#C0392B', bg: 'rgba(192,57,43,0.10)'     },
    default:     { icon: '⚠️', label: 'Sin configurar', color: '#D68910', bg: 'rgba(214,137,16,0.10)'    },
    unsupported: { icon: '❌', label: 'No soportado',   color: '#8C7B6B', bg: 'rgba(140,123,107,0.10)'   },
  };
  const c = map[p] || map.default;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px',
      borderRadius:20, fontSize:'0.7rem', fontWeight:700, color:c.color, background:c.bg,
    }}>
      {c.icon} {c.label}
    </span>
  );
}

function AlertBox({ type, children }) {
  const s = {
    warning: { bg:'rgba(214,137,16,0.08)', color:'#A0760B', border:'1px solid rgba(214,137,16,0.3)' },
    error:   { bg:'rgba(192,57,43,0.08)',  color:'#A0392B', border:'1px solid rgba(192,57,43,0.3)'  },
    success: { bg:'rgba(46,125,50,0.08)',  color:'#1E6B24', border:'1px solid rgba(46,125,50,0.3)'  },
    info:    { bg:'rgba(21,101,192,0.08)', color:'#0D47A1', border:'1px solid rgba(21,101,192,0.3)' },
    mac:     { bg:'rgba(88,86,214,0.08)',  color:'#3A38A0', border:'1px solid rgba(88,86,214,0.3)'  },
  }[type] || {};
  return (
    <div style={{ padding:'10px 12px', borderRadius:10, fontSize:'0.8rem', lineHeight:1.5, ...s }}>
      {children}
    </div>
  );
}

function Card({ title, right, disabled, children }) {
  return (
    <div style={{
      padding:14, borderRadius:14, background:'#F7F3EE', border:'1px solid #EDE6DB',
      opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto',
      display:'flex', flexDirection:'column', gap:10,
    }}>
      {title && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <span style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#8C7B6B' }}>{title}</span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Stepper({ value, onChange, onBlur, onDec, onInc, min, max, disabled, label }) {
  const atMin = (parseInt(value) || 0) <= min;
  const atMax = (parseInt(value) || 0) >= max;

  const btnStyle = (dis) => ({
    width: 36,
    height: 36,
    flexShrink: 0,
    background: 'white',
    border: '1.5px solid #EDE6DB',
    borderRadius: 8,
    cursor: dis ? 'not-allowed' : 'pointer',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: dis ? '#C8BAB0' : '#1C1108',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    opacity: dis ? 0.45 : 1,
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'white',
        border: '1.5px solid #EDE6DB',
        borderRadius: 10,
        padding: '4px 6px',
      }}>
        <button
          onClick={onDec}
          disabled={disabled || atMin}
          style={btnStyle(disabled || atMin)}
          type="button"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            border: 'none',
            outline: 'none',
            textAlign: 'center',
            fontFamily: 'inherit',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#1C1108',
            background: 'transparent',
            MozAppearance: 'textfield',
          }}
        />
        <button
          onClick={onInc}
          disabled={disabled || atMax}
          style={btnStyle(disabled || atMax)}
          type="button"
        >
          +
        </button>
      </div>
      {label && (
        <span style={{
          textAlign: 'center',
          fontSize: '0.68rem',
          color: '#B5A898',
          fontWeight: 500,
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

const IVLS = [5, 10, 15, 30, 60, 120, 240];

export default function NotificationSettingsModal({ onClose, onRequestPermission, onTestNotification }) {
  const dispatch   = useDispatch();
  const user       = useSelector(selectUser);
  const isOwner    = user?.role === 'OWNER';

  const enabled    = useSelector(selectNotifEnabled);
  const channel    = useSelector(selectNotifChannel);
  const interval   = useSelector(selectNotifInterval);
  const daysAhead  = useSelector(selectNotifDaysAhead);
  const lastCheck  = useSelector(selectLastCheckAt);

  const [browserPerm, setBrowserPerm] = useState(() => getBrowserPermission());
  const bodyRef  = useRef(null);
  const onMac    = isMacOS();
  const onSafari = isSafari();
  const isMobile = isMobileDevice();
  const hasNotif = supportsNotifications();
  const hasSW    = supportsServiceWorker();

  const canToggle = hasNotif && browserPerm === 'granted';

  const [req,     setReq]     = useState(false);
  const [sent,    setSent]    = useState(false);
  const [testErr, setTestErr] = useState('');
  const [lDays,   setLDays]   = useState(String(daysAhead));
  const [lIvl,    setLIvl]    = useState(String(interval));

  const effCh = channel === 'auto' ? (isMobile ? 'push' : 'desktop') : channel;

  /* ── Sync permiso cada 1.5s ──────────────────────────────────────────────── */
  useEffect(() => {
    const real = getBrowserPermission();
    setBrowserPerm(real);
    dispatch(syncPermission());
  }, [dispatch]);

  useEffect(() => {
    const id = setInterval(() => {
      const real = getBrowserPermission();
      setBrowserPerm(real);
      dispatch(syncPermission());
    }, 1500);
    return () => clearInterval(id);
  }, [dispatch]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Mantener lDays/lIvl sincronizados si cambian desde fuera (solo lectura para employees)
  useEffect(() => { setLDays(String(daysAhead)); }, [daysAhead]);
  useEffect(() => { setLIvl(String(interval));   }, [interval]);

  const applyDays = (v) => {
    if (!isOwner) return;
    const n = Math.max(1, Math.min(7, parseInt(v) || 2));
    setLDays(String(n));
    dispatch(setAlertDaysAhead(n));
  };

  const applyIvl = (v) => {
    if (!isOwner) return;
    const n = Math.max(5, Math.min(240, parseInt(v) || 30));
    setLIvl(String(n));
    dispatch(setIntervalMinutes(n));
  };

  const prevIvl = () => {
    const i = IVLS.indexOf(parseInt(lIvl) || 30);
    applyIvl(i > 0 ? IVLS[i - 1] : IVLS[0]);
  };
  const nextIvl = () => {
    const i = IVLS.indexOf(parseInt(lIvl) || 30);
    applyIvl(i < IVLS.length - 1 ? IVLS[i + 1] : IVLS[IVLS.length - 1]);
  };

  const ivlLabel = (() => {
    const v = parseInt(lIvl) || 30;
    if (v < 60) return `Cada ${v} min`;
    const h = Math.floor(v / 60), m = v % 60;
    return `Cada ${h}h${m > 0 ? ` ${m}min` : ''}`;
  })();

  const daysLabel = (() => {
    const v = parseInt(lDays) || 2;
    return `${v} día${v !== 1 ? 's' : ''} antes`;
  })();

  const handleReq = async () => {
    setReq(true);
    try {
      await onRequestPermission?.();
      const real = getBrowserPermission();
      setBrowserPerm(real);
      dispatch(syncPermission());
      if (real === 'granted') dispatch(setEnabled(true));
    } finally {
      setReq(false);
    }
  };

  const handleToggle = () => {
    if (!canToggle) return;
    dispatch(setEnabled(!enabled));
  };

  /* ── Test de notificación ──────────────────────────────────────────────────*/
  const handleTest = async () => {
    setTestErr('');
    if (!hasNotif) { setTestErr('Tu navegador no soporta notificaciones.'); return; }
    const realPerm = getBrowserPermission();
    if (realPerm !== 'granted') { setTestErr('Primero concedé permiso (sección de arriba).'); return; }

    const title = 'PanStock — Prueba de notificación';
    const body  = 'Categoría: Panadería\nVence: 31 de mayo de 2026\nCantidad en riesgo: 6 u.\n(Notificación de prueba)';
    const tag   = 'panstock-test';
    let shown   = false;

    if (hasSW) {
      try {
        let reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          await navigator.serviceWorker.ready;
          reg = await navigator.serviceWorker.getRegistration('/');
        }
        const swTarget = reg?.active || reg?.waiting || reg?.installing;
        if (swTarget) {
          shown = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 3000);
            const handler = (event) => {
              if (event.data?.type === 'NOTIFICATION_SENT' && event.data?.tag === tag) {
                clearTimeout(timeout);
                navigator.serviceWorker.removeEventListener('message', handler);
                resolve(true);
              }
            };
            navigator.serviceWorker.addEventListener('message', handler);
            swTarget.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag, url: '/expiration', icon: '/logo_panstock.png' });
          });
        }
      } catch (e1) {
        console.warn('[PanStock Test] SW postMessage falló:', e1.message);
      }
    }

    if (!shown && hasSW) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          await reg.showNotification(title, { body, icon: '/logo_panstock.png', badge: '/logo_panstock.png', tag, renotify: true });
          shown = true;
        }
      } catch (e2) {
        console.warn('[PanStock Test] reg.showNotification falló:', e2.message);
      }
    }

    if (!shown && !onMac) {
      try {
        const n = new Notification(title, { body, icon: '/logo_panstock.png', tag, renotify: true });
        n.onclick = () => { window.focus(); n.close(); };
        shown = true;
      } catch (e3) {
        console.warn('[PanStock Test] new Notification() falló:', e3.message);
      }
    }

    if (shown) {
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } else {
      setTestErr(
        onMac
          ? 'No se pudo enviar via Service Worker. En macOS, asegurate de que las notificaciones no estén bloqueadas en Preferencias del Sistema → Notificaciones.'
          : 'No se pudo enviar. Verificá los permisos en el navegador.'
      );
    }

    await onTestNotification?.();
  };

  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 520;

  /* ── Instrucciones para permisos denegados ──────────────────────────────── */
  const deniedInstructions = () => {
    if (onMac && onSafari) {
      return (
        <>
          Notificaciones bloqueadas en Safari macOS. Para habilitarlas:<br/>
          <strong>Safari → Configuración → Sitios web → Notificaciones</strong> → buscá este sitio y seleccioná "Permitir".<br/>
          O desde: <strong>Preferencias del Sistema → Notificaciones → Safari</strong>.<br/>
          Luego recargá la página.
        </>
      );
    }
    if (onMac) {
      return (
        <>
          Notificaciones bloqueadas en Chrome/Edge macOS. Para habilitarlas:<br/>
          <strong>Chrome:</strong> clic en 🔒 en la barra → Notificaciones → Permitir<br/>
          <strong>También verificá:</strong> Preferencias del Sistema → Notificaciones → Chrome/Edge → habilitar.<br/>
          Luego recargá la página.
        </>
      );
    }
    return (
      <>
        Notificaciones bloqueadas. Para habilitarlas:<br/>
        <strong>Chrome/Edge:</strong> clic en 🔒 → Notificaciones → Permitir<br/>
        <strong>Firefox:</strong> clic en candado → Permiso de notificaciones → Permitir<br/>
        Luego recargá la página.
      </>
    );
  };

  const content = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(28,17,8,0.65)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
        display:'flex', alignItems: isNarrow ? 'flex-end' : 'center', justifyContent:'center',
        padding: isNarrow ? 0 : 16,
      }}
    >
      <div style={{
        width:'100%', maxWidth:480, background:'#fff',
        borderRadius: isNarrow ? '24px 24px 0 0' : 24,
        boxShadow:'0 24px 80px rgba(28,17,8,0.30)',
        maxHeight: isNarrow ? '92vh' : '88vh',
        display:'flex', flexDirection:'column', overflow:'hidden',
        fontFamily:'"DM Sans",system-ui,sans-serif',
      }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'18px 18px 14px', borderBottom:'1px solid #EDE6DB', flexShrink:0 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'rgba(200,137,58,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
            🔔
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:700, color:'#1C1108', marginBottom:2 }}>
              Notificaciones de vencimiento
            </div>
            <div style={{ fontSize:'0.76rem', color:'#8C7B6B' }}>
              Alertas cuando productos estén próximos a vencer
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width:30, height:30, borderRadius:8, background:'#F7F3EE', border:'none', cursor:'pointer', fontSize:'0.9rem', color:'#8C7B6B', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div ref={bodyRef} style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>

          {/* Dispositivo detectado */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 13px', borderRadius:12, background:'rgba(200,137,58,0.06)', border:'1px solid rgba(200,137,58,0.2)' }}>
            <span style={{ fontSize:'1.3rem' }}>{isMobile ? '📱' : onMac ? '🍎' : '🖥️'}</span>
            <div>
              <div style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.07em', color:'#B5A898', fontWeight:600, marginBottom:2 }}>Dispositivo detectado</div>
              <div style={{ fontSize:'0.84rem', fontWeight:700, color:'#1C1108', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                {isMobile ? 'Móvil / Tablet' : onMac ? `macOS${onSafari ? ' · Safari' : ''}` : 'Escritorio'}
                <span style={{ fontSize:'0.66rem', padding:'2px 7px', borderRadius:20, background:'rgba(200,137,58,0.15)', color:'#A06C28', fontWeight:600 }}>
                  {isMobile ? 'vía Push (SW)' : onMac ? 'vía Service Worker' : 'vía escritorio'}
                </span>
              </div>
            </div>
          </div>

          {/* Nota macOS */}
          {onMac && (
            <AlertBox type="mac">
              <strong>macOS:</strong> Las notificaciones se envían <strong>vía Service Worker</strong>. Si no aparecen, verificá <strong>Preferencias del Sistema → Notificaciones</strong> y asegurate de que Chrome/Safari/Edge estén habilitados.
            </AlertBox>
          )}

          {/* Permiso del navegador */}
          <Card title="Permiso del navegador" right={<PermBadge p={!hasNotif ? 'unsupported' : browserPerm} />}>
            {!hasNotif && <AlertBox type="warning">Tu navegador no soporta notificaciones. Usá Chrome, Firefox o Safari 16.4+.</AlertBox>}

            {hasNotif && browserPerm === 'denied' && (
              <>
                <AlertBox type="error">{deniedInstructions()}</AlertBox>
                <button
                  onClick={() => window.location.reload()}
                  style={{ padding:'10px 18px', background:'transparent', color:'#C0392B', border:'1.5px solid #C0392B', borderRadius:10, fontFamily:'inherit', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', width:'100%' }}
                >
                  Recargar página tras habilitar en el navegador
                </button>
              </>
            )}

            {hasNotif && browserPerm === 'granted' && (
              <AlertBox type="success">
                Permiso concedido. {onMac ? 'En macOS las notificaciones se enviarán vía Service Worker.' : 'Las notificaciones están listas.'} Para revocar usá la configuración del navegador.
              </AlertBox>
            )}

            {hasNotif && browserPerm === 'default' && (
              <>
                <AlertBox type="info">
                  {onMac
                    ? 'En macOS, el navegador pedirá permiso. También puede aparecer un diálogo del sistema operativo. Asegurate de aceptar ambos.'
                    : 'El navegador te pedirá permiso para mostrar notificaciones.'}
                </AlertBox>
                <button
                  onClick={handleReq}
                  disabled={req}
                  style={{ padding:'12px 18px', background: req ? '#D4A853' : '#C8893A', color:'white', border:'none', borderRadius:10, fontFamily:'inherit', fontSize:'0.9rem', fontWeight:700, cursor: req ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 16px rgba(200,137,58,0.35)', width:'100%', justifyContent:'center' }}
                >
                  {req ? 'Esperando respuesta...' : '🔔 Conceder permiso de notificaciones'}
                </button>
              </>
            )}
          </Card>

          {/* Toggle activar/desactivar — ambos roles pueden hacerlo */}
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
              <div>
                <div style={{ fontSize:'0.92rem', fontWeight:700, color:'#1C1108', marginBottom:3 }}>Activar notificaciones</div>
                <div style={{ fontSize:'0.75rem', color:'#8C7B6B', lineHeight:1.4 }}>
                  {canToggle && enabled
                    ? `Chequeará vencimientos ${ivlLabel.toLowerCase()}`
                    : 'Activá para recibir alertas de vencimiento'}
                </div>
              </div>
              <div
                onClick={handleToggle}
                role="switch"
                aria-checked={enabled && canToggle}
                tabIndex={0}
                onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && canToggle) { e.preventDefault(); handleToggle(); } }}
                style={{
                  width:52, height:30, borderRadius:15,
                  background: canToggle && enabled ? '#C8893A' : '#EDE6DB',
                  cursor: canToggle ? 'pointer' : 'not-allowed',
                  position:'relative', flexShrink:0,
                  transition:'background 0.25s',
                  opacity: canToggle ? 1 : 0.45,
                  outline:'none',
                }}
              >
                <div style={{
                  position:'absolute', top:3,
                  left: canToggle && enabled ? 25 : 3,
                  width:24, height:24, borderRadius:'50%',
                  background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.25)',
                  transition:'left 0.25s',
                }}/>
              </div>
            </div>
            {!canToggle && hasNotif && browserPerm === 'default' && (
              <div style={{ fontSize:'0.74rem', color:'#D68910' }}>Concedé permiso primero.</div>
            )}
            {!canToggle && hasNotif && browserPerm === 'denied' && (
              <div style={{ fontSize:'0.74rem', color:'#C0392B' }}>Permisos bloqueados. Habilitálos desde el navegador.</div>
            )}
          </Card>

          {/* Canal — ambos roles pueden verlo, solo OWNER puede cambiarlo */}
          <Card title="Canal de notificación" disabled={!enabled || !canToggle}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { v:'auto',    ic: onMac ? '🍎' : '⚡', nm:'Automático', ds: onMac ? 'Detecta macOS → SW' : 'Detecta el dispositivo', ex: channel==='auto' ? `→ usando ${effCh==='push'?'Push':'escritorio'}` : null },
                { v:'desktop', ic:'🖥️', nm:'Escritorio', ds: onMac ? 'SW (recomendado macOS)' : 'Notifs. del sistema' },
                { v:'push',    ic:'📱', nm:'Push',        ds:'Via Service Worker', na:!hasSW },
              ].map((o) => (
                <label
                  key={o.v}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                    padding:'10px 7px', borderRadius:12, textAlign:'center',
                    border:`2px solid ${channel===o.v ? '#C8893A' : '#EDE6DB'}`,
                    background: channel===o.v ? 'rgba(200,137,58,0.05)' : 'white',
                    cursor: (o.na || !enabled || !isOwner) ? 'not-allowed' : 'pointer',
                    opacity: o.na ? 0.4 : 1,
                    transition:'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="ns-ch"
                    value={o.v}
                    checked={channel===o.v}
                    onChange={() => isOwner && dispatch(setChannel(o.v))}
                    disabled={!enabled || o.na || !isOwner}
                    style={{ display:'none' }}
                  />
                  <span style={{ fontSize:'1.1rem' }}>{o.ic}</span>
                  <span style={{ fontSize:'0.73rem', fontWeight:700, color:'#1C1108' }}>{o.nm}</span>
                  <span style={{ fontSize:'0.62rem', color:'#8C7B6B', lineHeight:1.3 }}>{o.ds}</span>
                  {o.ex && <span style={{ fontSize:'0.6rem', color:'#A06C28', fontWeight:600 }}>{o.ex}</span>}
                  {o.na && <span style={{ fontSize:'0.56rem', background:'#EDE6DB', color:'#8C7B6B', padding:'1px 5px', borderRadius:4 }}>No disp.</span>}
                </label>
              ))}
            </div>
            {!isOwner && (
              <div style={{ fontSize:'0.72rem', color:'#B5A898', textAlign:'center', marginTop:2 }}>
                🔒 Solo el dueño/encargado puede cambiar el canal
              </div>
            )}
          </Card>

          {/* ── Configuración de tiempo — SOLO OWNER puede editar ── */}
          <Card
            title="Configuración de tiempo"
            right={
              !isOwner
                ? <span style={{ fontSize:'0.65rem', color:'#B5A898', display:'flex', alignItems:'center', gap:4 }}>🔒 Solo Owner</span>
                : null
            }
            disabled={!enabled || !canToggle}
          >
            {isOwner ? (
              /* OWNER: steppers editables */
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#8C7B6B' }}>
                    Días anticipación
                  </div>
                  <Stepper
                    value={lDays}
                    onChange={setLDays}
                    onBlur={() => applyDays(lDays)}
                    onDec={() => applyDays((parseInt(lDays) || 2) - 1)}
                    onInc={() => applyDays((parseInt(lDays) || 2) + 1)}
                    min={1}
                    max={7}
                    disabled={!enabled}
                    label={daysLabel}
                  />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#8C7B6B' }}>
                    Intervalo chequeo
                  </div>
                  <Stepper
                    value={lIvl}
                    onChange={setLIvl}
                    onBlur={() => applyIvl(lIvl)}
                    onDec={prevIvl}
                    onInc={nextIvl}
                    min={5}
                    max={240}
                    disabled={!enabled}
                    label={ivlLabel}
                  />
                </div>
              </div>
            ) : (
              /* EMPLOYEE: solo lectura, muestra los valores actuales */
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  padding:'12px 8px', borderRadius:10,
                  background:'white', border:'1.5px solid #EDE6DB',
                }}>
                  <div style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.07em', color:'#B5A898', fontWeight:600 }}>
                    Días anticipación
                  </div>
                  <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#1C1108', lineHeight:1 }}>
                    {lDays}
                  </div>
                  <div style={{ fontSize:'0.68rem', color:'#8C7B6B' }}>{daysLabel}</div>
                </div>
                <div style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  padding:'12px 8px', borderRadius:10,
                  background:'white', border:'1.5px solid #EDE6DB',
                }}>
                  <div style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.07em', color:'#B5A898', fontWeight:600 }}>
                    Intervalo chequeo
                  </div>
                  <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#1C1108', lineHeight:1 }}>
                    {lIvl}
                    <span style={{ fontSize:'0.7rem', fontWeight:500, color:'#8C7B6B' }}> min</span>
                  </div>
                  <div style={{ fontSize:'0.68rem', color:'#8C7B6B' }}>{ivlLabel}</div>
                </div>
              </div>
            )}

            {lastCheck && (
              <div style={{ fontSize:'0.7rem', color:'#B5A898', padding:'5px 9px', borderRadius:8, background:'rgba(200,137,58,0.04)', border:'1px solid rgba(200,137,58,0.12)', marginTop:2 }}>
                Último chequeo: {fmt(lastCheck)}
              </div>
            )}
          </Card>

          {/* Probar notificación — ambos roles */}
          {hasNotif && (
            <Card title="Probar notificación">
              {browserPerm !== 'granted' ? (
                <AlertBox type="warning">Concedé permiso primero (sección de arriba).</AlertBox>
              ) : (
                <>
                  <div style={{ fontSize:'0.78rem', color:'#8C7B6B' }}>
                    {onMac
                      ? 'En macOS la prueba se envía vía Service Worker. Si no ves la notif, verificá Preferencias del Sistema → Notificaciones.'
                      : 'Enviá una notificación de prueba con datos de ejemplo.'}
                  </div>
                  {testErr && <AlertBox type="error">{testErr}</AlertBox>}
                  <button
                    onClick={handleTest}
                    disabled={sent || browserPerm !== 'granted'}
                    style={{
                      padding:'10px 18px', borderRadius:10, fontFamily:'inherit',
                      fontSize:'0.86rem', fontWeight:600,
                      cursor: sent ? 'default' : 'pointer',
                      border: `2px solid ${sent ? '#2E7D32' : '#1C1108'}`,
                      background: sent ? 'rgba(46,125,50,0.07)' : 'white',
                      color: sent ? '#2E7D32' : '#1C1108',
                      transition:'all 0.2s', alignSelf:'flex-start',
                      display:'flex', alignItems:'center', gap:8,
                    }}
                  >
                    {sent ? '✅ Notificación enviada' : '🧪 Enviar notificación de prueba'}
                  </button>
                </>
              )}
            </Card>
          )}

          {/* Soporte del navegador */}
          <div style={{ padding:'10px 13px', borderRadius:12, background:'#F7F3EE', border:'1px solid #EDE6DB' }}>
            <div style={{ fontSize:'0.61rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#B5A898', fontWeight:600, marginBottom:7 }}>
              Soporte del navegador
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              {[
                ['Notifications API', hasNotif, false],
                ['Service Worker',    hasSW,    false],
                [isMobile ? 'Móvil' : onMac ? 'macOS' : 'Escritorio', true, true],
                onMac ? ['Modo SW (macOS)', hasSW, true] : null,
              ].filter(Boolean).map(([lbl, ok, info]) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.73rem', color:'#8C7B6B' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', display:'inline-block', background: info ? '#1565C0' : ok ? '#2E7D32' : '#C0392B' }}/>
                  {lbl}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding:'12px 18px', borderTop:'1px solid #EDE6DB', flexShrink:0, display:'flex', justifyContent:'flex-end', background:'#fff' }}>
          <button
            onClick={onClose}
            style={{ padding:'10px 24px', background:'#1C1108', color:'#F7F3EE', border:'none', borderRadius:10, fontFamily:'inherit', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' }}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(content, document.body);
}