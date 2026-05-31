import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  if (data && typeof data === 'object' && 'ok' in data) {
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    return data.data ?? data;
  }
  return data;
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchStockSummary = createAsyncThunk(
  'stock/fetchSummary',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/stock`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchBatches = createAsyncThunk(
  'stock/fetchBatches',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/stock/batches`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * POST /api/stock/entries
 * Accessible by OWNER and EMPLOYEE
 */
export const registerStockEntry = createAsyncThunk(
  'stock/registerEntry',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/stock/entries`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * POST /api/stock/sales
 * Accessible by OWNER and EMPLOYEE
 * Body: { productId, userId?, quantity, notes? }
 * Backend uses FEFO to discount from batches automatically
 */
export const registerSale = createAsyncThunk(
  'stock/registerSale',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/stock/sales`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const stockSlice = createSlice({
  name: 'stock',
  initialState: {
    summary: [],
    batches: [],
    summaryStatus: 'idle',
    summaryError: null,
    batchesStatus: 'idle',
    batchesError: null,
    // Entry action state
    entryStatus: 'idle',
    entryError: null,
    lastCreatedBatch: null,
    // Sale action state
    saleStatus: 'idle',
    saleError: null,
    lastSaleResult: null,
  },
  reducers: {
    clearEntryState(state) {
      state.entryStatus = 'idle';
      state.entryError = null;
      state.lastCreatedBatch = null;
    },
    clearSaleState(state) {
      state.saleStatus = 'idle';
      state.saleError = null;
      state.lastSaleResult = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetchStockSummary ──
    builder
      .addCase(fetchStockSummary.pending,   (s) => { s.summaryStatus = 'loading'; s.summaryError = null; })
      .addCase(fetchStockSummary.fulfilled, (s, a) => { s.summaryStatus = 'succeeded'; s.summary = a.payload; })
      .addCase(fetchStockSummary.rejected,  (s, a) => { s.summaryStatus = 'failed'; s.summaryError = a.payload; });

    // ── fetchBatches ──
    builder
      .addCase(fetchBatches.pending,   (s) => { s.batchesStatus = 'loading'; s.batchesError = null; })
      .addCase(fetchBatches.fulfilled, (s, a) => { s.batchesStatus = 'succeeded'; s.batches = a.payload; })
      .addCase(fetchBatches.rejected,  (s, a) => { s.batchesStatus = 'failed'; s.batchesError = a.payload; });

    // ── registerStockEntry ──
    builder
      .addCase(registerStockEntry.pending,   (s) => { s.entryStatus = 'loading'; s.entryError = null; })
      .addCase(registerStockEntry.fulfilled, (s, a) => {
        s.entryStatus = 'succeeded';
        s.lastCreatedBatch = a.payload;
        if (s.batchesStatus === 'succeeded') {
          s.batches.unshift(a.payload);
        }
      })
      .addCase(registerStockEntry.rejected,  (s, a) => { s.entryStatus = 'failed'; s.entryError = a.payload; });

    // ── registerSale ──
    builder
      .addCase(registerSale.pending,   (s) => { s.saleStatus = 'loading'; s.saleError = null; })
      .addCase(registerSale.fulfilled, (s, a) => {
        s.saleStatus = 'succeeded';
        s.lastSaleResult = a.payload;
      })
      .addCase(registerSale.rejected,  (s, a) => { s.saleStatus = 'failed'; s.saleError = a.payload; });
  },
});

export const { clearEntryState, clearSaleState } = stockSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectStockSummary       = (s) => s.stock.summary;
export const selectStockSummaryStatus = (s) => s.stock.summaryStatus;
export const selectBatches            = (s) => s.stock.batches;
export const selectBatchesStatus      = (s) => s.stock.batchesStatus;
export const selectEntryAction        = (s) => ({
  status:      s.stock.entryStatus,
  error:       s.stock.entryError,
  lastCreated: s.stock.lastCreatedBatch,
});
export const selectSaleAction         = (s) => ({
  status:     s.stock.saleStatus,
  error:      s.stock.saleError,
  lastResult: s.stock.lastSaleResult,
});

export default stockSlice.reducer;