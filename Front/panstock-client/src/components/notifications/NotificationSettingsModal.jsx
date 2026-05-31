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
  isMobileDevice, supportsNotifications, supportsServiceWorker,
  getBrowserPermission,
} from '../../features/notifications/useNotifications';

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

function Stepper({ value, onChange, onBlur, onDec, onInc, min, max, disabled }) {
  const atMin = (parseInt(value) || 0) <= min;
  const atMax = (parseInt(value) || 0) >= max;
  const btnBase = (dis) => ({
    width:36, height:36, background:'#F7F3EE', border:'none',
    cursor: dis ? 'not-allowed' : 'pointer', fontSize:'1rem', fontWeight:700, color:'#1C1108',
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    opacity: dis ? 0.4 : 1,
  });
  return (
    <div style={{ display:'flex', alignItems:'center', border:'1.5px solid #EDE6DB', borderRadius:10, overflow:'hidden', background:'white' }}>
      <button onClick={onDec} disabled={disabled || atMin}
        style={{ ...btnBase(disabled || atMin), borderRight:'1px solid #EDE6DB' }}>−</button>
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)}
        onBlur={onBlur} disabled={disabled}
        style={{ flex:1, height:36, border:'none', outline:'none', textAlign:'center',
          fontFamily:'inherit', fontSize:'0.9rem', fontWeight:700, color:'#1C1108',
          background:'white', minWidth:0, MozAppearance:'textfield' }}
      />
      <button onClick={onInc} disabled={disabled || atMax}
        style={{ ...btnBase(disabled || atMax), borderLeft:'1px solid #EDE6DB' }}>+</button>
    </div>
  );
}

const IVLS = [5, 10, 15, 30, 60, 120, 240];

export default function NotificationSettingsModal({ onClose, onRequestPermission, onTestNotification }) {
  const dispatch  = useDispatch();
  const enabled   = useSelector(selectNotifEnabled);
  const channel   = useSelector(selectNotifChannel);
  const interval  = useSelector(selectNotifInterval);
  const daysAhead = useSelector(selectNotifDaysAhead);
  const lastCheck = useSelector(selectLastCheckAt);

  const [browserPerm, setBrowserPerm] = useState(() => getBrowserPermission());
  const bodyRef  = useRef(null);
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
    }, 1000);
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
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const applyDays = v => {
    const n = Math.max(1, Math.min(7, parseInt(v) || 2));
    setLDays(String(n));
    dispatch(setAlertDaysAhead(n));
  };
  const applyIvl = v => {
    const n = Math.max(5, Math.min(240, parseInt(v) || 30));
    setLIvl(String(n));
    dispatch(setIntervalMinutes(n));
  };
  const prevIvl = () => { const i = IVLS.indexOf(parseInt(lIvl)||30); applyIvl(i > 0 ? IVLS[i-1] : IVLS[0]); };
  const nextIvl = () => { const i = IVLS.indexOf(parseInt(lIvl)||30); applyIvl(i < IVLS.length-1 ? IVLS[i+1] : IVLS[IVLS.length-1]); };

  const ivlLabel = (() => {
    const v = parseInt(lIvl) || 30;
    if (v < 60) return `Cada ${v} min`;
    const h = Math.floor(v / 60), m = v % 60;
    return `Cada ${h}h${m > 0 ? ` ${m}min` : ''}`;
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
    const next = !enabled;
    dispatch(setEnabled(next));
  };

  const handleTest = async () => {
    setTestErr('');
    if (!hasNotif) { setTestErr('Tu navegador no soporta notificaciones.'); return; }
    const realPerm = getBrowserPermission();
    if (realPerm !== 'granted') { setTestErr('Primero concedé permiso (botón de arriba).'); return; }

    const title = 'PanStock — Prueba de notificación';
    const body  = 'Categoría: Panadería\nVence: 31 de mayo de 2026\nCantidad en riesgo: 6 u.\n(Notificación de prueba)';
    let shown = false;

    try {
      const n = new Notification(title, { body, icon: '/logo_panstock.png', tag: 'panstock-test', renotify: true });
      n.onclick = () => { window.focus(); n.close(); };
      shown = true;
    } catch (e1) { console.warn('[PanStock Test] Notification API falló:', e1.message); }

    if (!shown && hasSW) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg && reg.active) {
          await reg.showNotification(title, { body, icon: '/logo_panstock.png', badge: '/logo_panstock.png', tag: 'panstock-test', renotify: true });
          shown = true;
        }
      } catch (e2) { console.warn('[PanStock Test] SW falló:', e2.message); }
    }

    if (!shown && hasSW) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg) {
          reg.active?.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag: 'panstock-test', url: '/expiration' });
          shown = true;
        }
      } catch (_) {}
    }

    if (shown) {
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } else {
      setTestErr('No se pudo enviar. Verificá los permisos en el navegador.');
    }
    await onTestNotification?.();
  };

  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 520;

  const content = (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
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
        maxHeight: isNarrow ? '92vh' : '88vh', display:'flex', flexDirection:'column', overflow:'hidden',
        fontFamily:'"DM Sans",system-ui,sans-serif',
      }}>

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
          <button onClick={onClose}
            style={{ width:30, height:30, borderRadius:8, background:'#F7F3EE', border:'none', cursor:'pointer', fontSize:'0.9rem', color:'#8C7B6B', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}
            aria-label="Cerrar">✕</button>
        </div>

        <div ref={bodyRef} style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>

          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 13px', borderRadius:12, background:'rgba(200,137,58,0.06)', border:'1px solid rgba(200,137,58,0.2)' }}>
            <span style={{ fontSize:'1.3rem' }}>{isMobile ? '📱' : '🖥️'}</span>
            <div>
              <div style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.07em', color:'#B5A898', fontWeight:600, marginBottom:2 }}>Dispositivo detectado</div>
              <div style={{ fontSize:'0.84rem', fontWeight:700, color:'#1C1108', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                {isMobile ? 'Móvil / Tablet' : 'Escritorio'}
                <span style={{ fontSize:'0.66rem', padding:'2px 7px', borderRadius:20, background:'rgba(200,137,58,0.15)', color:'#A06C28', fontWeight:600 }}>
                  Recomendado: {isMobile ? 'Push' : 'Escritorio'}
                </span>
              </div>
            </div>
          </div>

          <Card title="Permiso del navegador" right={<PermBadge p={!hasNotif ? 'unsupported' : browserPerm} />}>
            {!hasNotif && <AlertBox type="warning">Tu navegador no soporta notificaciones. Usá Chrome, Firefox o Safari.</AlertBox>}

            {hasNotif && browserPerm === 'denied' && (
              <>
                <AlertBox type="error">
                  Notificaciones bloqueadas. Para habilitarlas:<br/>
                  <strong>Chrome/Edge:</strong> clic en 🔒 → Notificaciones → Permitir<br/>
                  <strong>Firefox:</strong> clic en candado → Permiso de notificaciones → Permitir<br/>
                  Luego recargá la página.
                </AlertBox>
                <button onClick={() => window.location.reload()}
                  style={{ padding:'10px 18px', background:'transparent', color:'#C0392B', border:'1.5px solid #C0392B', borderRadius:10, fontFamily:'inherit', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', width:'100%' }}>
                  Recargar página tras habilitar en el navegador
                </button>
              </>
            )}

            {hasNotif && browserPerm === 'granted' && (
              <AlertBox type="success">
                Permiso concedido. Las notificaciones están listas. Para revocar usá la configuración del navegador (🔒 en la barra de URL).
              </AlertBox>
            )}

            {hasNotif && browserPerm === 'default' && (
              <>
                <AlertBox type="info">
                  El navegador te pedirá permiso para mostrar notificaciones. Al concederlo, las notificaciones se activarán automáticamente.
                </AlertBox>
                <button onClick={handleReq} disabled={req}
                  style={{ padding:'12px 18px', background: req ? '#D4A853' : '#C8893A', color:'white', border:'none', borderRadius:10, fontFamily:'inherit', fontSize:'0.9rem', fontWeight:700, cursor: req ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 16px rgba(200,137,58,0.35)', width:'100%', justifyContent:'center' }}>
                  {req ? 'Esperando respuesta del navegador...' : '🔔 Conceder permiso de notificaciones'}
                </button>
              </>
            )}
          </Card>

          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
              <div>
                <div style={{ fontSize:'0.92rem', fontWeight:700, color:'#1C1108', marginBottom:3 }}>Activar notificaciones</div>
                <div style={{ fontSize:'0.75rem', color:'#8C7B6B', lineHeight:1.4 }}>
                  {canToggle && enabled ? `Chequeará vencimientos cada ${lIvl} min` : 'Activá para recibir alertas de vencimiento'}
                </div>
              </div>
              <div
                onClick={handleToggle} role="switch" aria-checked={enabled && canToggle} tabIndex={0}
                onKeyDown={e => { if ((e.key===' '||e.key==='Enter') && canToggle) { e.preventDefault(); handleToggle(); } }}
                style={{ width:52, height:30, borderRadius:15, background: canToggle && enabled ? '#C8893A' : '#EDE6DB', cursor: canToggle ? 'pointer' : 'not-allowed', position:'relative', flexShrink:0, transition:'background 0.25s', opacity: canToggle ? 1 : 0.45, outline:'none' }}
              >
                <div style={{ position:'absolute', top:3, left: canToggle && enabled ? 25 : 3, width:24, height:24, borderRadius:'50%', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.25)', transition:'left 0.25s' }}/>
              </div>
            </div>
            {!canToggle && hasNotif && browserPerm === 'default' && (
              <div style={{ fontSize:'0.74rem', color:'#D68910' }}>Concedé permiso (sección de arriba) para activar.</div>
            )}
            {!canToggle && hasNotif && browserPerm === 'denied' && (
              <div style={{ fontSize:'0.74rem', color:'#C0392B' }}>Permisos bloqueados. Habilitálos desde el navegador.</div>
            )}
          </Card>

          <Card title="Canal de notificación" disabled={!enabled || !canToggle}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { v:'auto',    ic:'⚡', nm:'Automático', ds:'Detecta el dispositivo', ex: channel==='auto' ? `→ usando ${effCh==='push'?'Push':'Escritorio'}` : null },
                { v:'desktop', ic:'🖥️', nm:'Escritorio',  ds:'Notifs. del sistema' },
                { v:'push',    ic:'📱', nm:'Push',         ds:'Via Service Worker', na:!hasSW },
              ].map(o => (
                <label key={o.v} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 7px', borderRadius:12, textAlign:'center', border:`2px solid ${channel===o.v ? '#C8893A' : '#EDE6DB'}`, background: channel===o.v ? 'rgba(200,137,58,0.05)' : 'white', cursor: (o.na||!enabled) ? 'not-allowed' : 'pointer', opacity: o.na ? 0.4 : 1, transition:'all 0.15s' }}>
                  <input type="radio" name="ns-ch" value={o.v} checked={channel===o.v} onChange={() => dispatch(setChannel(o.v))} disabled={!enabled||o.na} style={{ display:'none' }}/>
                  <span style={{ fontSize:'1.1rem' }}>{o.ic}</span>
                  <span style={{ fontSize:'0.73rem', fontWeight:700, color:'#1C1108' }}>{o.nm}</span>
                  <span style={{ fontSize:'0.62rem', color:'#8C7B6B', lineHeight:1.3 }}>{o.ds}</span>
                  {o.ex && <span style={{ fontSize:'0.6rem', color:'#A06C28', fontWeight:600 }}>{o.ex}</span>}
                  {o.na && <span style={{ fontSize:'0.56rem', background:'#EDE6DB', color:'#8C7B6B', padding:'1px 5px', borderRadius:4 }}>No disp.</span>}
                </label>
              ))}
            </div>
          </Card>

          <Card title="Configuración de tiempo" disabled={!enabled || !canToggle}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#8C7B6B', marginBottom:6 }}>Días anticipación</div>
                <Stepper value={lDays} onChange={setLDays} onBlur={() => applyDays(lDays)}
                  onDec={() => applyDays((parseInt(lDays)||2)-1)} onInc={() => applyDays((parseInt(lDays)||2)+1)}
                  min={1} max={7} disabled={!enabled}/>
                <div style={{ fontSize:'0.62rem', color:'#B5A898', marginTop:4 }}>1–7 días (recom: 2)</div>
              </div>
              <div>
                <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#8C7B6B', marginBottom:6 }}>Intervalo chequeo</div>
                <Stepper value={lIvl} onChange={setLIvl} onBlur={() => applyIvl(lIvl)}
                  onDec={prevIvl} onInc={nextIvl} min={5} max={240} disabled={!enabled}/>
                <div style={{ fontSize:'0.62rem', color:'#B5A898', marginTop:4 }}>{ivlLabel}</div>
              </div>
            </div>
            {lastCheck && (
              <div style={{ fontSize:'0.7rem', color:'#B5A898', padding:'5px 9px', borderRadius:8, background:'rgba(200,137,58,0.04)', border:'1px solid rgba(200,137,58,0.12)', marginTop:2 }}>
                Último chequeo: {fmt(lastCheck)}
              </div>
            )}
          </Card>

          {hasNotif && (
            <Card title="Probar notificación">
              {browserPerm !== 'granted' ? (
                <AlertBox type="warning">Concedé permiso primero (sección de arriba).</AlertBox>
              ) : (
                <>
                  <div style={{ fontSize:'0.78rem', color:'#8C7B6B' }}>
                    Enviá una notificación de prueba con datos de ejemplo.
                  </div>
                  {testErr && <AlertBox type="error">{testErr}</AlertBox>}
                  <button onClick={handleTest} disabled={sent || browserPerm !== 'granted'}
                    style={{ padding:'10px 18px', borderRadius:10, fontFamily:'inherit', fontSize:'0.86rem', fontWeight:600, cursor: sent ? 'default' : 'pointer', border: `2px solid ${sent ? '#2E7D32' : '#1C1108'}`, background: sent ? 'rgba(46,125,50,0.07)' : 'white', color: sent ? '#2E7D32' : '#1C1108', transition:'all 0.2s', alignSelf:'flex-start', display:'flex', alignItems:'center', gap:8 }}>
                    {sent ? '✅ Notificación enviada' : '🧪 Enviar notificación de prueba'}
                  </button>
                </>
              )}
            </Card>
          )}

          <div style={{ padding:'10px 13px', borderRadius:12, background:'#F7F3EE', border:'1px solid #EDE6DB' }}>
            <div style={{ fontSize:'0.61rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#B5A898', fontWeight:600, marginBottom:7 }}>Soporte del navegador</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              {[
                ['Notifications API', hasNotif, false],
                ['Service Worker',    hasSW,    false],
                [isMobile ? 'Móvil' : 'Escritorio', true, true],
              ].map(([lbl, ok, info]) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.73rem', color:'#8C7B6B' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', display:'inline-block', background: info ? '#1565C0' : ok ? '#2E7D32' : '#C0392B' }}/>
                  {lbl}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding:'12px 18px', borderTop:'1px solid #EDE6DB', flexShrink:0, display:'flex', justifyContent:'flex-end', background:'#fff' }}>
          <button onClick={onClose}
            style={{ padding:'10px 24px', background:'#1C1108', color:'#F7F3EE', border:'none', borderRadius:10, fontFamily:'inherit', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
