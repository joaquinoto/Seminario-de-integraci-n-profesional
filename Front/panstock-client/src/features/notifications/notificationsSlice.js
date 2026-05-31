import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  enabled:          false,
  channel:          'auto',
  intervalMinutes:  30,
  alertDaysAhead:   2,
  permission:       'default',
  swRegistered:     false,
  notifiedBatchIds: [],
  lastCheckAt:      null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setEnabled(state, action)          { state.enabled = action.payload; },
    setChannel(state, action)          { state.channel = action.payload; },
    setIntervalMinutes(state, action)  { state.intervalMinutes = action.payload; },
    setAlertDaysAhead(state, action)   { state.alertDaysAhead = action.payload; },
    setPermission(state, action)       { state.permission = action.payload; },
    syncPermission(state) {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        state.permission = 'unsupported';
      } else {
        state.permission = Notification.permission;
      }
    },
    setSwRegistered(state, action)     { state.swRegistered = action.payload; },
    markBatchNotified(state, action) {
      const { batchId, expirationDate } = action.payload;
      const exists = state.notifiedBatchIds.find(
        (n) => n.batchId === batchId && n.expirationDate === expirationDate
      );
      if (!exists) {
        state.notifiedBatchIds.push({ batchId, expirationDate, notifiedAt: Date.now() });
      }
    },
    cleanStaleNotified(state) {
      const now = new Date().toISOString().split('T')[0];
      state.notifiedBatchIds = state.notifiedBatchIds.filter(
        (n) => n.expirationDate >= now
      );
    },
    setLastCheckAt(state, action)      { state.lastCheckAt = action.payload; },
    resetNotificationPrefs(state) {
      state.enabled          = false;
      state.channel          = 'auto';
      state.intervalMinutes  = 30;
      state.alertDaysAhead   = 2;
      state.notifiedBatchIds = [];
      state.lastCheckAt      = null;
    },
  },
});

export const {
  setEnabled, setChannel, setIntervalMinutes, setAlertDaysAhead,
  setPermission, syncPermission, setSwRegistered,
  markBatchNotified, cleanStaleNotified, setLastCheckAt,
  resetNotificationPrefs,
} = notificationsSlice.actions;

export const selectNotifEnabled     = (s) => s.notifications.enabled;
export const selectNotifChannel     = (s) => s.notifications.channel;
export const selectNotifInterval    = (s) => s.notifications.intervalMinutes;
export const selectNotifDaysAhead   = (s) => s.notifications.alertDaysAhead;
export const selectNotifPermission  = (s) => s.notifications.permission;
export const selectSwRegistered     = (s) => s.notifications.swRegistered;
export const selectNotifiedBatchIds = (s) => s.notifications.notifiedBatchIds;
export const selectLastCheckAt      = (s) => s.notifications.lastCheckAt;

export default notificationsSlice.reducer;
