import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardService, stockService } from '../../services/stockService';

// ─── Thunks ───────────────────────────────────────────────────────────────────

/**
 * Carga el semáforo completo desde /api/dashboard/expiration-semaphore
 * Devuelve: { greenCount, yellowCount, redCount, expiredCount, items }
 */
export const fetchSemaphore = createAsyncThunk(
  'expiration/fetchSemaphore',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await dashboardService.getSemaphore(token);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * Carga solo los lotes próximos a vencer (con filtro de días opcional)
 */
export const fetchExpiring = createAsyncThunk(
  'expiration/fetchExpiring',
  async ({ token, days = null }, { rejectWithValue }) => {
    try {
      return await stockService.getExpiring(token, days);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * Carga solo los lotes ya vencidos
 */
export const fetchExpired = createAsyncThunk(
  'expiration/fetchExpired',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await stockService.getExpired(token);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const expirationSlice = createSlice({
  name: 'expiration',
  initialState: {
    greenCount:   0,
    yellowCount:  0,
    redCount:     0,
    expiredCount: 0,
    items: [],
    semaphoreStatus: 'idle',   
    semaphoreError:  null,
    lastFetch: null,           
  },
  reducers: {
    clearExpirationState(state) {
      state.items          = [];
      state.greenCount     = 0;
      state.yellowCount    = 0;
      state.redCount       = 0;
      state.expiredCount   = 0;
      state.semaphoreStatus = 'idle';
      state.semaphoreError  = null;
      state.lastFetch       = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetchSemaforo ──
    builder
      .addCase(fetchSemaphore.pending, (s) => {
        s.semaphoreStatus = 'loading';
        s.semaphoreError  = null;
      })
      .addCase(fetchSemaphore.fulfilled, (s, a) => {
        s.semaphoreStatus = 'succeeded';
        s.greenCount      = a.payload.greenCount   ?? 0;
        s.yellowCount     = a.payload.yellowCount  ?? 0;
        s.redCount        = a.payload.redCount     ?? 0;
        s.expiredCount    = a.payload.expiredCount ?? 0;
        s.items           = a.payload.items        ?? [];
        s.lastFetch       = Date.now();
      })
      .addCase(fetchSemaphore.rejected, (s, a) => {
        s.semaphoreStatus = 'failed';
        s.semaphoreError  = a.payload;
      });
  },
});

export const { clearExpirationState } = expirationSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSemaphoreItems   = (s) => s.expiration.items;
export const selectSemaphoreCounts  = (s) => ({
  green:   s.expiration.greenCount,
  yellow:  s.expiration.yellowCount,
  red:     s.expiration.redCount,
  expired: s.expiration.expiredCount,
});
export const selectSemaphoreStatus  = (s) => s.expiration.semaphoreStatus;
export const selectSemaphoreError   = (s) => s.expiration.semaphoreError;
export const selectLastFetch        = (s) => s.expiration.lastFetch;

// Items filtrados por status
export const selectExpiredItems  = (s) =>
  s.expiration.items.filter((i) => i.status === 'EXPIRED');
export const selectRedItems      = (s) =>
  s.expiration.items.filter((i) => i.status === 'RED');
export const selectYellowItems   = (s) =>
  s.expiration.items.filter((i) => i.status === 'YELLOW');
export const selectGreenItems    = (s) =>
  s.expiration.items.filter((i) => i.status === 'GREEN');

export default expirationSlice.reducer;