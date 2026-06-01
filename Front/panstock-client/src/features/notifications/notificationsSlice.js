import { createSlice } from '@reduxjs/toolkit';

/*
 *
 * ARQUITECTURA DE DEDUPLICACIÓN (fix macOS):
 * ─────────────────────────────────────────────────────────────────────────────
 * `notifiedBatchIds` se usa SOLO para persistencia entre sesiones (localStorage
 * vía redux-persist). En memoria, `useNotifications` mantiene un Set local
 * (`localNotifiedRef`) que es la fuente de verdad para el dedup dentro de
 * la sesión activa. Esto elimina la dependencia de timing React render ↔ ref.
 *
 * `resetToken`: string que cambia cada vez que se debe limpiar el dedup local.
 * `useNotifications` lo escucha y resetea `localNotifiedRef` de forma síncrona.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const initialState = {
  enabled:          false,
  channel:          'auto',
  intervalMinutes:  30,
  alertDaysAhead:   2,
  permission:       'default',
  swRegistered:     false,
  // Para persistencia entre sesiones (cross-session dedup)
  notifiedBatchIds: [],
  // Token de reset: cuando cambia, useNotifications resetea localNotifiedRef.
  // Usamos Date.now().toString() para que sea único y serializable.
  resetToken:       '0',
  lastCheckAt:      null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setEnabled(state, action)         { state.enabled = action.payload; },
    setChannel(state, action)         { state.channel = action.payload; },
    setIntervalMinutes(state, action) { state.intervalMinutes = action.payload; },

    setAlertDaysAhead(state, action) {
      state.alertDaysAhead     = action.payload;
      state.notifiedBatchIds   = [];
      // Cambiar el token fuerza a useNotifications a resetear localNotifiedRef
      // de forma síncrona antes del próximo checkExpirations.
      state.resetToken         = Date.now().toString();
    },

    setPermission(state, action) { state.permission = action.payload; },

    syncPermission(state) {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        state.permission = 'unsupported';
      } else {
        state.permission = Notification.permission;
      }
    },

    setSwRegistered(state, action) { state.swRegistered = action.payload; },

    markBatchNotified(state, action) {
      const { batchId, expirationDate, notifiedDate } = action.payload;
      const exists = state.notifiedBatchIds.find(
        (n) =>
          n.batchId        === batchId        &&
          n.expirationDate === expirationDate &&
          n.notifiedDate   === notifiedDate
      );
      if (!exists) {
        state.notifiedBatchIds.push({ batchId, expirationDate, notifiedDate });
      }
    },

    cleanStaleNotified(state) {
      const todayStr = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
      ).toISOString().split('T')[0];

      state.notifiedBatchIds = state.notifiedBatchIds.filter(
        (n) =>
          n.expirationDate >= todayStr &&
          n.notifiedDate   >= todayStr
      );
    },

    resetNotifiedForDaysChange(state) {
      state.notifiedBatchIds = [];
      state.resetToken       = Date.now().toString();
    },

    setLastCheckAt(state, action) { state.lastCheckAt = action.payload; },

    resetNotificationPrefs(state) {
      state.enabled          = false;
      state.channel          = 'auto';
      state.intervalMinutes  = 30;
      state.alertDaysAhead   = 2;
      state.notifiedBatchIds = [];
      state.resetToken       = Date.now().toString();
      state.lastCheckAt      = null;
    },
  },
});

export const {
  setEnabled,
  setChannel,
  setIntervalMinutes,
  setAlertDaysAhead,
  setPermission,
  syncPermission,
  setSwRegistered,
  markBatchNotified,
  cleanStaleNotified,
  resetNotifiedForDaysChange,
  setLastCheckAt,
  resetNotificationPrefs,
} = notificationsSlice.actions;

export const selectNotifEnabled     = (s) => s.notifications.enabled;
export const selectNotifChannel     = (s) => s.notifications.channel;
export const selectNotifInterval    = (s) => s.notifications.intervalMinutes;
export const selectNotifDaysAhead   = (s) => s.notifications.alertDaysAhead;
export const selectNotifPermission  = (s) => s.notifications.permission;
export const selectSwRegistered     = (s) => s.notifications.swRegistered;
export const selectNotifiedBatchIds = (s) => s.notifications.notifiedBatchIds;
export const selectResetToken       = (s) => s.notifications.resetToken;
export const selectLastCheckAt      = (s) => s.notifications.lastCheckAt;

export default notificationsSlice.reducer;