import { createSlice } from '@reduxjs/toolkit';

/**
 * autoWasteNotification slice
 *
 * Persiste (via redux-persist) los lotes que el sistema descartó
 * automáticamente HOY por vencimiento, y si el usuario ya confirmó
 * haberlos procesado ("Ya descarte los lotes").
 *
 * Lógica:
 * - `todayKey`: YYYY-MM-DD en zona horaria local del cliente.
 *   Cada vez que es un nuevo día, se resetea automáticamente.
 * - `confirmedForDate`: si coincide con `todayKey`, el usuario ya confirmó.
 * - `batches`: lista de { batchId, productName, quantity, wasteRecordId }
 *   que se acumulan durante el día.
 */

const todayLocalKey = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

const initialState = {
  /** YYYY-MM-DD de la última sesión con auto-descartes */
  dateKey: null,
  /** YYYY-MM-DD en que el usuario confirmó */
  confirmedForDate: null,
  /** [{ batchId, productName, quantity, wasteRecordId }] */
  batches: [],
};

const autoWasteNotificationSlice = createSlice({
  name: 'autoWasteNotification',
  initialState,
  reducers: {
    /**
     * Registra un lote auto-descartado.
     * Si es un nuevo día, reinicia la lista y el estado de confirmación.
     */
    recordAutoWaste(state, action) {
      const today = todayLocalKey();
      const { batchId, productName, quantity, wasteRecordId } = action.payload;

      // Nuevo día → resetear
      if (state.dateKey !== today) {
        state.dateKey          = today;
        state.confirmedForDate = null;
        state.batches          = [];
      }

      // No duplicar por batchId
      const alreadyIn = state.batches.some((b) => b.batchId === batchId);
      if (!alreadyIn) {
        state.batches.push({ batchId, productName, quantity, wasteRecordId });
      }
    },

    /**
     * El usuario presiona "Ya descarte los lotes".
     * Marca la fecha actual como confirmada.
     */
    confirmAutoWaste(state) {
      state.confirmedForDate = todayLocalKey();
    },

    /** Reset manual (por si se necesita en tests o logout) */
    resetAutoWasteNotification() {
      return initialState;
    },
  },
});

export const {
  recordAutoWaste,
  confirmAutoWaste,
  resetAutoWasteNotification,
} = autoWasteNotificationSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

/** true si hay lotes auto-descartados hoy Y el usuario NO confirmó aún */
export const selectShouldShowAutoWasteModal = (state) => {
  const today = todayLocalKey();
  const { dateKey, confirmedForDate, batches } = state.autoWasteNotification;
  return (
    dateKey === today &&
    confirmedForDate !== today &&
    batches.length > 0
  );
};

export const selectAutoWasteBatches = (state) =>
  state.autoWasteNotification.batches;

export const selectAutoWasteConfirmed = (state) => {
  const today = todayLocalKey();
  return state.autoWasteNotification.confirmedForDate === today;
};

export default autoWasteNotificationSlice.reducer;       