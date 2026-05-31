import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector }       from 'react-redux';
import { selectToken }                    from '../auth/authSlice';
import {
  selectNotifEnabled,
  selectNotifInterval,
  selectNotifDaysAhead,
  selectNotifPermission,
  selectNotifiedBatchIds,
  syncPermission,
  setPermission,
  setSwRegistered,
  markBatchNotified,
  cleanStaleNotified,
  setLastCheckAt,
} from './notificationsSlice';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function supportsNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function supportsServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function getBrowserPermission() {
  if (!supportsNotifications()) return 'unsupported';
  return Notification.permission;
}

async function registerSW() {
  if (!supportsServiceWorker()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      if (!existing.active) await navigator.serviceWorker.ready;
      return existing;
    }
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[PanStock SW] Error al registrar:', err);
    return null;
  }
}

async function requestPermissionNative() {
  if (!supportsNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  try { return await Notification.requestPermission(); }
  catch { return 'denied'; }
}

async function sendNotif({ title, body, tag, url }) {
  if (!supportsNotifications()) return false;
  if (Notification.permission !== 'granted') return false;

  const opts = {
    body,
    icon:               '/logo_panstock.png',
    badge:              '/logo_panstock.png',
    tag:                tag || 'panstock-exp',
    renotify:           true,
    requireInteraction: false,
    data:               { url: url || '/expiration' },
  };

  try {
    const n = new Notification(title, opts);
    n.onclick = () => {
      window.focus();
      if (window.location.pathname !== (url || '/expiration'))
        window.location.href = url || '/expiration';
      n.close();
    };
    return true;
  } catch (e1) {
    if (import.meta.env?.DEV) console.warn('[PanStock Notif] Notification API falló:', e1.message);
  }

  if (supportsServiceWorker()) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && reg.active) {
        await reg.showNotification(title, {
          ...opts,
          actions: [
            { action: 'view',    title: 'Ver vencimientos' },
            { action: 'dismiss', title: 'Cerrar'           },
          ],
        });
        return true;
      }
    } catch (e2) {
      console.warn('[PanStock Notif] SW también falló:', e2.message);
    }
  }

  if (supportsServiceWorker()) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        reg.active?.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag, url });
        return true;
      }
    } catch (_) {}
  }

  return false;
}

async function fetchSemaphore(token) {
  const res = await fetch(`${BASE_URL}/api/dashboard/expiration-semaphore`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

export default function useNotifications() {
  const dispatch         = useDispatch();
  const token            = useSelector(selectToken);
  const enabled          = useSelector(selectNotifEnabled);
  const intervalMinutes  = useSelector(selectNotifInterval);
  const daysAhead        = useSelector(selectNotifDaysAhead);
  const storedPermission = useSelector(selectNotifPermission);
  const notifiedBatchIds = useSelector(selectNotifiedBatchIds);

  const swRegRef       = useRef(null);
  const tokenRef       = useRef(token);
  const daysAheadRef   = useRef(daysAhead);
  const notifiedRef    = useRef(notifiedBatchIds);
  const intervalRef    = useRef(null);
  const permissionRef  = useRef(storedPermission);

  useEffect(() => { tokenRef.current     = token;          }, [token]);
  useEffect(() => { daysAheadRef.current = daysAhead;      }, [daysAhead]);
  useEffect(() => { notifiedRef.current  = notifiedBatchIds; }, [notifiedBatchIds]);
  useEffect(() => { permissionRef.current = storedPermission; }, [storedPermission]);

  useEffect(() => {
    const sync = () => {
      const real = getBrowserPermission();
      dispatch(syncPermission());
      permissionRef.current = real;
    };
    sync();
    const id = setInterval(sync, 5000);
    return () => clearInterval(id);
  }, [dispatch]);

  useEffect(() => {
    if (!supportsServiceWorker()) return;
    registerSW().then(reg => {
      if (reg) { swRegRef.current = reg; dispatch(setSwRegistered(true)); }
    });
  }, [dispatch]);

  const checkExpirations = useCallback(async () => {
    const tkn  = tokenRef.current;
    const perm = getBrowserPermission();
    if (!tkn)                         return;
    if (!supportsNotifications())     return;
    if (perm !== 'granted')           return;

    if (import.meta.env?.DEV) console.log('[PanStock Notif] Chequeando vencimientos...');

    try {
      const items = await fetchSemaphore(tkn);
      dispatch(setLastCheckAt(Date.now()));
      dispatch(cleanStaleNotified());
      dispatch(syncPermission());

      const days   = daysAheadRef.current;
      const urgent = items.filter(
        (i) => i.daysToExpire != null && i.daysToExpire >= 0 && i.daysToExpire <= days
      );

      if (urgent.length === 0) return;

      const groups = {};
      for (const item of urgent) {
        const alreadyNotified = notifiedRef.current.some(
          (n) => n.batchId === item.batchId && n.expirationDate === item.expirationDate
        );
        if (alreadyNotified) continue;

        dispatch(markBatchNotified({ batchId: item.batchId, expirationDate: item.expirationDate }));

        if (!groups[item.productId]) {
          groups[item.productId] = {
            productName:  item.productName,
            categoryName: item.categoryName || null,
            batches:      [],
          };
        }
        groups[item.productId].batches.push(item);
      }

      for (const group of Object.values(groups)) {
        if (!group.batches.length) continue;
        group.batches.sort((a, b) => a.daysToExpire - b.daysToExpire);
        const b = group.batches[0];

        const daysText = b.daysToExpire === 0
          ? 'vence HOY'
          : b.daysToExpire === 1
            ? 'vence mañana'
            : `vence en ${b.daysToExpire} días`;

        const expStr = b.expirationDate
          ? new Date(b.expirationDate + 'T00:00:00').toLocaleDateString('es-AR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })
          : '—';

        const totalQty = group.batches.reduce(
          (sum, lote) => sum + Number(lote.currentQuantity || 0), 0
        );
        const qtyStr = totalQty.toLocaleString('es-AR');
        const catStr = group.categoryName ? `Categoría: ${group.categoryName}` : null;

        const bodyLines = [
          catStr,
          `Vence: ${expStr}`,
          `Cantidad en riesgo: ${qtyStr} u.`,
          group.batches.length > 1 ? `(${group.batches.length} lotes afectados)` : null,
        ].filter(Boolean).join('\n');

        await sendNotif({
          title: `PanStock — ${group.productName} ${daysText}`,
          body:  bodyLines,
          tag:   `panstock-exp-${b.batchId}-${b.expirationDate}`,
          url:   '/expiration',
        });
      }
    } catch (err) {
      console.warn('[PanStock Notif] Error en chequeo:', err.message);
    }
  }, [dispatch]);

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    const perm = getBrowserPermission();

    if (!enabled || !token)           return;
    if (!supportsNotifications())     return;
    if (perm !== 'granted')           return;

    checkExpirations();

    const ms = intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(checkExpirations, ms);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [enabled, token, intervalMinutes, storedPermission, checkExpirations]);

  return {
    requestPermission: async () => {
      const result = await requestPermissionNative();
      dispatch(setPermission(result));
      permissionRef.current = result;
      if (result === 'granted' && enabled) {
        setTimeout(() => checkExpirations(), 300);
      }
      return result;
    },
    checkNow:              checkExpirations,
    isMobile:              isMobileDevice(),
    supportsNotifications: supportsNotifications(),
    supportsServiceWorker: supportsServiceWorker(),
  };
}
