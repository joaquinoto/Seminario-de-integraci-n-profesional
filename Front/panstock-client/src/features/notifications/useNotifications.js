import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector }       from 'react-redux';
import { selectToken }                    from '../auth/authSlice';
import {
  selectNotifEnabled,
  selectNotifInterval,
  selectNotifDaysAhead,
  selectNotifPermission,
  selectNotifiedBatchIds,
  selectResetToken,
  syncPermission,
  setPermission,
  setSwRegistered,
  markBatchNotified,
  cleanStaleNotified,
  setLastCheckAt,
} from './notificationsSlice';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

/* ────────────────────────────────────────────────────────────────────────────
   HELPERS DE ENTORNO
   ─────────────────────────────────────────────────────────────────────────── */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isMacOS() {
  if (typeof navigator === 'undefined') return false;
  return /Mac OS X/.test(navigator.userAgent) && !/iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isSafari() {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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

/* ────────────────────────────────────────────────────────────────────────────
   FECHA LOCAL DEL CLIENTE
   ─────────────────────────────────────────────────────────────────────────── */
function todayLocal() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
}

/* ────────────────────────────────────────────────────────────────────────────
   Construye la clave de dedup para el Set local.
   Formato: "batchId|expirationDate|notifiedDate"
   ─────────────────────────────────────────────────────────────────────────── */
function dedupKey(batchId, expirationDate, notifiedDate) {
  return `${batchId}|${expirationDate}|${notifiedDate}`;
}

/* ────────────────────────────────────────────────────────────────────────────
   SW REGISTRATION
   ─────────────────────────────────────────────────────────────────────────── */
async function registerAndWaitSW() {
  if (!supportsServiceWorker()) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    if (reg.active) return reg;
    await navigator.serviceWorker.ready;
    reg = await navigator.serviceWorker.getRegistration('/');
    return reg || null;
  } catch (err) {
    console.warn('[PanStock SW] Error al registrar:', err);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   PEDIR PERMISO
   ─────────────────────────────────────────────────────────────────────────── */
async function requestPermissionNative() {
  if (!supportsNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   ENVIAR NOTIFICACIÓN
   Orden de preferencia (macOS-safe):
   1. SW postMessage → sw.showNotification
   2. reg.showNotification() directo
   3. new Notification() — SOLO si no es macOS
   ─────────────────────────────────────────────────────────────────────────── */
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

  const onMac = isMacOS();

  /* Intento 1: SW postMessage */
  if (supportsServiceWorker()) {
    try {
      let reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        reg = await navigator.serviceWorker.getRegistration('/');
      }
      const swTarget = reg?.active || reg?.waiting || reg?.installing;
      if (swTarget) {
        return await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 3000);
          const handler = (event) => {
            if (event.data?.type === 'NOTIFICATION_SENT' && event.data?.tag === tag) {
              clearTimeout(timeout);
              navigator.serviceWorker.removeEventListener('message', handler);
              resolve(true);
            }
          };
          navigator.serviceWorker.addEventListener('message', handler);
          swTarget.postMessage({
            type: 'SHOW_NOTIFICATION',
            title, body,
            tag:  tag || 'panstock-exp',
            url:  url || '/expiration',
            icon: '/logo_panstock.png',
          });
        });
      }
    } catch (e1) {
      if (import.meta.env?.DEV) console.warn('[PanStock Notif] SW postMessage falló:', e1.message);
    }
  }

  /* Intento 2: reg.showNotification() directo */
  if (supportsServiceWorker()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
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
      if (import.meta.env?.DEV) console.warn('[PanStock Notif] reg.showNotification falló:', e2.message);
    }
  }

  /* Intento 3: new Notification() — SOLO si NO es macOS */
  if (!onMac) {
    try {
      const n = new Notification(title, opts);
      n.onclick = () => {
        window.focus();
        if (window.location.pathname !== (url || '/expiration'))
          window.location.href = url || '/expiration';
        n.close();
      };
      return true;
    } catch (e3) {
      if (import.meta.env?.DEV) console.warn('[PanStock Notif] new Notification() falló:', e3.message);
    }
  }

  return false;
}

/* ────────────────────────────────────────────────────────────────────────────
   FETCH SEMÁFORO
   ─────────────────────────────────────────────────────────────────────────── */
async function fetchSemaphore(token) {
  const res = await fetch(`${BASE_URL}/api/dashboard/expiration-semaphore`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

/* ────────────────────────────────────────────────────────────────────────────
   HOOK PRINCIPAL
   ─────────────────────────────────────────────────────────────────────────── */
export default function useNotifications() {
  const dispatch         = useDispatch();
  const token            = useSelector(selectToken);
  const enabled          = useSelector(selectNotifEnabled);
  const intervalMinutes  = useSelector(selectNotifInterval);
  const daysAhead        = useSelector(selectNotifDaysAhead);
  const storedPermission = useSelector(selectNotifPermission);
  const notifiedBatchIds = useSelector(selectNotifiedBatchIds);
  // resetToken cambia cada vez que se limpia notifiedBatchIds desde Redux
  // (por cambio de alertDaysAhead u otras acciones de reset).
  const resetToken       = useSelector(selectResetToken);

  const swRegRef     = useRef(null);
  const intervalRef  = useRef(null);

  /*
   * ── localNotifiedRef ──────────────────────────────────────────────────────
   *
   * FUENTE DE VERDAD para el dedup dentro de la sesión activa.
   *
   * POR QUÉ UN Set LOCAL EN LUGAR DE notifiedBatchIds DE REDUX:
   *
   * En macOS el store Redux persiste en memoria mientras la pestaña esté
   * abierta. Pero `notifiedBatchIds` en Redux solo es accesible desde el
   * hook vía `useSelector`, cuyo valor se actualiza en el próximo render
   * de React — un proceso asíncrono. Esto crea una ventana de tiempo donde:
   *
   *   1. `setAlertDaysAhead` limpia `notifiedBatchIds` en Redux.
   *   2. El `useEffect` del intervalo se re-ejecuta y llama `checkExpirations`.
   *   3. `checkExpirations` lee `notifiedBatchIds` vía selector (o ref
   *      actualizada por useEffect) y obtiene el array VIEJO porque React
   *      no terminó de re-renderizar.
   *   4. Los lotes del rango previo (ej. 1-2 días) siguen pareciendo
   *      "ya notificados", y solo se notifican los nuevos (ej. 7 días).
   *
   * Con `localNotifiedRef` (un Set de JavaScript puro, sin React ni Redux):
   *
   *   - Las lecturas y escrituras son síncronas e inmediatas.
   *   - `checkExpirations` siempre ve el estado real del dedup.
   *   - Cuando Redux dice "limpiar" (via resetToken), borramos el Set
   *     de forma síncrona en el mismo efecto que detecta el cambio,
   *     ANTES de que corra el primer checkExpirations.
   *
   * Redux (`notifiedBatchIds`) se mantiene como backup para persistencia
   * entre sesiones: al montar el hook, precargamos el Set desde Redux.
   * Al notificar, escribimos en ambos (Set + Redux).
   * ─────────────────────────────────────────────────────────────────────────
   */
  const localNotifiedRef = useRef(null);

  // Inicializar el Set local UNA SOLA VEZ desde el estado persistido en Redux.
  // Solo corremos esto en el mount — después, localNotifiedRef es la fuente
  // de verdad y Redux es el respaldo.
  if (localNotifiedRef.current === null) {
    const today = todayLocal();
    localNotifiedRef.current = new Set(
      (notifiedBatchIds || [])
        .filter((n) => n.expirationDate >= today && n.notifiedDate >= today)
        .map((n) => dedupKey(n.batchId, n.expirationDate, n.notifiedDate))
    );
  }

  // Refs para valores que checkExpirations necesita leer sin causar
  // re-renders ni problemas de closure stale.
  const tokenRef     = useRef(token);
  const daysAheadRef = useRef(daysAhead);
  // Actualizamos síncronamente en el cuerpo del hook (no en useEffect)
  // para que siempre estén frescos antes de que cualquier effect corra.
  tokenRef.current     = token;
  daysAheadRef.current = daysAhead;

  /* ── Sync permiso: polling cada 2s ──────────────────────────────────────── */
  useEffect(() => {
    const sync = () => dispatch(syncPermission());
    sync();
    const id = setInterval(sync, 2000);
    return () => clearInterval(id);
  }, [dispatch]);

  /* ── Registro del SW ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!supportsServiceWorker()) return;
    registerAndWaitSW().then((reg) => {
      if (reg) {
        swRegRef.current = reg;
        dispatch(setSwRegistered(true));
      }
    });
  }, [dispatch]);

  /*
   * ── RESET del Set local cuando Redux señala limpieza ─────────────────────
   *
   * `resetToken` cambia cuando:
   *   - El usuario cambia alertDaysAhead
   *   - Se llama resetNotifiedForDaysChange
   *   - Se llama resetNotificationPrefs
   *
   * Este effect corre SÍNCRONAMENTE (antes del paint) cuando detecta el
   * cambio de token, limpiando el Set local. Así, cuando el useEffect del
   * intervalo (que también tiene resetToken en sus deps) corra, el Set ya
   * está vacío y checkExpirations notificará todos los lotes en el nuevo rango.
   *
   * También limpiamos Redux (entradas stale del día anterior).
   * ─────────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    // Limpiar el Set local de forma síncrona
    if (localNotifiedRef.current) {
      localNotifiedRef.current.clear();
    } else {
      localNotifiedRef.current = new Set();
    }
    // Limpiar también entradas stale en Redux
    dispatch(cleanStaleNotified());
  }, [resetToken, dispatch]);

  /* ────────────────────────────────────────────────────────────────────────
     checkExpirations
     ─────────────────────────────────────────────────────────────────────────
     Usa localNotifiedRef (Set) como fuente de verdad para el dedup.
     Lee siempre desde refs para valores que cambian frecuentemente.
  ── */
  const checkExpirations = useCallback(async () => {
    const tkn  = tokenRef.current;
    const perm = getBrowserPermission();
    if (!tkn)                        return;
    if (!supportsNotifications())    return;
    if (perm !== 'granted')          return;

    if (import.meta.env?.DEV) console.log('[PanStock Notif] Chequeando vencimientos…');

    try {
      const items = await fetchSemaphore(tkn);
      dispatch(setLastCheckAt(Date.now()));
      dispatch(syncPermission());

      const days  = daysAheadRef.current;
      const today = todayLocal();

      // Limpiar entradas del día anterior del Set local
      if (localNotifiedRef.current) {
        for (const key of localNotifiedRef.current) {
          // Las keys tienen formato "batchId|expirationDate|notifiedDate"
          const parts = key.split('|');
          const notifiedDate   = parts[2];
          const expirationDate = parts[1];
          if (!notifiedDate || notifiedDate < today || !expirationDate || expirationDate < today) {
            localNotifiedRef.current.delete(key);
          }
        }
      }

      const urgent = items.filter(
        (i) => i.daysToExpire != null && i.daysToExpire >= 0 && i.daysToExpire <= days
      );

      if (urgent.length === 0) return;

      const groups = {};
      for (const item of urgent) {
        const key = dedupKey(item.batchId, item.expirationDate, today);

        // Dedup usando el Set local — lectura y escritura síncronas,
        // sin depender de React render ni de refs actualizadas por useEffect.
        if (localNotifiedRef.current.has(key)) continue;

        // Marcar de inmediato en el Set local (síncrono)
        localNotifiedRef.current.add(key);

        // Marcar también en Redux para persistencia entre sesiones
        dispatch(markBatchNotified({
          batchId:        item.batchId,
          expirationDate: item.expirationDate,
          notifiedDate:   today,
        }));

        if (!groups[item.productId]) {
          groups[item.productId] = {
            productName:  item.productName,
            categoryName: item.categoryName || null,
            batches:      [],
          };
        }
        groups[item.productId].batches.push(item);
      }

      /*
       * NOTIFICACIÓN CONSOLIDADA — una sola notificación con todos los
       * productos urgentes no notificados aún.
       *
       * POR QUÉ: en macOS, Chrome apila las notificaciones web en el
       * Notification Center usando el `tag` como agrupador. Si se envían
       * N notificaciones con distintos tags, macOS muestra solo la ÚLTIMA
       * en el banner y esconde las anteriores detrás de ella. El usuario
       * no sabe que hay más hasta que expande el grupo en el NC.
       *
       * Solución: una única notificación con tag fijo "panstock-expiration"
       * que lista todos los productos urgentes en el cuerpo. Esto funciona
       * igual en Windows y Linux (donde también es mejor UX tener un solo
       * banner que N banners superpuestos).
       *
       * DEDUP: el tag fijo hace que macOS/Chrome REEMPLACE la notificación
       * anterior en lugar de apilar una nueva (renotify: true). Así, si el
       * intervalo corre de nuevo, la notificación se actualiza en lugar de
       * acumularse.
       */
      const groupList = Object.values(groups).filter((g) => g.batches.length > 0);
      if (groupList.length === 0) return;

      // Ordenar productos: primero los que vencen antes
      groupList.forEach((g) => g.batches.sort((a, b) => a.daysToExpire - b.daysToExpire));
      groupList.sort((a, b) => a.batches[0].daysToExpire - b.batches[0].daysToExpire);

      // Título: menciona el producto más urgente + cuántos más hay
      const firstGroup = groupList[0];
      const firstBatch = firstGroup.batches[0];
      const firstDaysText = firstBatch.daysToExpire === 0
        ? 'vence HOY'
        : firstBatch.daysToExpire === 1
          ? 'vence mañana'
          : `vence en ${firstBatch.daysToExpire} días`;

      const title = groupList.length === 1
        ? `PanStock — ${firstGroup.productName} ${firstDaysText}`
        : `PanStock — ${firstGroup.productName} y ${groupList.length - 1} producto${groupList.length - 1 > 1 ? 's' : ''} más por vencer`;

      // Cuerpo: una línea por producto
      const bodyLines = groupList.map((group) => {
        const b = group.batches[0];
        const daysLabel = b.daysToExpire === 0
          ? 'HOY'
          : b.daysToExpire === 1
            ? 'mañana'
            : `en ${b.daysToExpire}d`;
        const totalQty = group.batches.reduce(
          (sum, lote) => sum + Number(lote.currentQuantity || 0), 0
        );
        const batchSuffix = group.batches.length > 1
          ? ` (${group.batches.length} lotes)`
          : '';
        return `• ${group.productName} — vence ${daysLabel} · ${totalQty.toLocaleString('es-AR')} u.${batchSuffix}`;
      });

      await sendNotif({
        title,
        body:  bodyLines.join('\n'),
        // Tag fijo: macOS reemplaza la notificación anterior en vez de apilar
        tag:   'panstock-expiration',
        url:   '/expiration',
      });
    } catch (err) {
      console.warn('[PanStock Notif] Error en chequeo:', err.message);
    }
  }, [dispatch]);
  // checkExpirations NO tiene daysAhead en sus deps porque lo lee desde
  // daysAheadRef.current (actualizado síncronamente en el cuerpo del hook).

  /* ────────────────────────────────────────────────────────────────────────
     INTERVALO DE POLLING

     DEPENDENCIAS:
     - `daysAhead`: lanzar check inmediato cuando el usuario cambia los días.
     - `resetToken`: lanzar check inmediato DESPUÉS de que el Set local fue
       limpiado (el effect de reset corre antes que este, garantizado por
       el orden de los useEffect en React). Así todos los lotes del nuevo
       rango se notifican sin que el Set viejo los bloquee.
     - Resto de deps estándar: enabled, token, intervalMinutes, permission.
     ─────────────────────────────────────────────────────────────────────
  ── */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const perm = getBrowserPermission();

    if (!enabled || !token)        return;
    if (!supportsNotifications())  return;
    if (perm !== 'granted')        return;

    // Disparo inmediato. En este punto localNotifiedRef ya fue limpiado
    // por el effect de reset (los effects corren en orden de declaración).
    checkExpirations();

    const ms = intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(checkExpirations, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    enabled,
    token,
    intervalMinutes,
    daysAhead,
    storedPermission,
    checkExpirations,
    resetToken, // garantiza que el check corre DESPUÉS del reset del Set local
  ]);

  return {
    requestPermission: async () => {
      const result = await requestPermissionNative();
      dispatch(setPermission(result));
      if (result === 'granted') {
        registerAndWaitSW().then((reg) => {
          if (reg) {
            swRegRef.current = reg;
            dispatch(setSwRegistered(true));
          }
          if (enabled) setTimeout(() => checkExpirations(), 500);
        });
      }
      return result;
    },
    checkNow:              checkExpirations,
    isMobile:              isMobileDevice(),
    isMacOS:               isMacOS(),
    supportsNotifications: supportsNotifications(),
    supportsServiceWorker: supportsServiceWorker(),
  };
}