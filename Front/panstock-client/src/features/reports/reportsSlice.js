import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const BASE_URL = import.meta.env.MODE === 'development'
  ? ''
  : import.meta.env.VITE_API_URL;

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

const buildDateParams = (from, to) => {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to)   q.set('to',   to);
  return q.toString();
};

// ── Waste thunks ──────────────────────────────────────────────────────────────
export const fetchWasteSummary = createAsyncThunk(
  'reports/fetchWasteSummary',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/waste-summary?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchWasteByCategory = createAsyncThunk(
  'reports/fetchWasteByCategory',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/waste-by-category?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchWasteBySupplier = createAsyncThunk(
  'reports/fetchWasteBySupplier',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/waste-by-supplier?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

// ── Sales thunks ──────────────────────────────────────────────────────────────
export const fetchSalesSummary = createAsyncThunk(
  'reports/fetchSalesSummary',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/sales-summary?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchSalesByProduct = createAsyncThunk(
  'reports/fetchSalesByProduct',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/sales-by-product?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchSalesByCategory = createAsyncThunk(
  'reports/fetchSalesByCategory',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/sales-by-category?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

// ── Balance thunks ────────────────────────────────────────────────────────────
export const fetchStockBalance = createAsyncThunk(
  'reports/fetchStockBalance',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/stock-balance?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchStockBalanceByProduct = createAsyncThunk(
  'reports/fetchStockBalanceByProduct',
  async ({ token, from, to }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/reports/stock-balance-by-product?${buildDateParams(from, to)}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

// ── Helper: add fulfilled/rejected cases ──────────────────────────────────────
const addDataCases = (builder, thunk, stateKey) => {
  builder
    .addCase(thunk.pending, (s) => {
      s[stateKey] = { status: 'loading', data: null, error: null };
    })
    .addCase(thunk.fulfilled, (s, a) => {
      s[stateKey] = { status: 'succeeded', data: a.payload, error: null };
    })
    .addCase(thunk.rejected, (s, a) => {
      s[stateKey] = { status: 'failed', data: null, error: a.payload };
    });
};

const emptySlot = { status: 'idle', data: null, error: null };

// ── Slice ─────────────────────────────────────────────────────────────────────
const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    // waste
    wasteSummary:     { ...emptySlot },
    wasteByCategory:  { ...emptySlot },
    wasteBySupplier:  { ...emptySlot },
    // sales
    salesSummary:     { ...emptySlot },
    salesByProduct:   { ...emptySlot },
    salesByCategory:  { ...emptySlot },
    // balance
    stockBalance:          { ...emptySlot },
    stockBalanceByProduct: { ...emptySlot },
  },
  reducers: {
    clearReports(state) {
      Object.keys(state).forEach((k) => { state[k] = { ...emptySlot }; });
    },
  },
  extraReducers: (builder) => {
    addDataCases(builder, fetchWasteSummary,         'wasteSummary');
    addDataCases(builder, fetchWasteByCategory,      'wasteByCategory');
    addDataCases(builder, fetchWasteBySupplier,      'wasteBySupplier');
    addDataCases(builder, fetchSalesSummary,         'salesSummary');
    addDataCases(builder, fetchSalesByProduct,       'salesByProduct');
    addDataCases(builder, fetchSalesByCategory,      'salesByCategory');
    addDataCases(builder, fetchStockBalance,         'stockBalance');
    addDataCases(builder, fetchStockBalanceByProduct,'stockBalanceByProduct');
  },
});

export const { clearReports } = reportsSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectWasteSummary          = (s) => s.reports.wasteSummary;
export const selectWasteByCategory       = (s) => s.reports.wasteByCategory;
export const selectWasteBySupplier       = (s) => s.reports.wasteBySupplier;
export const selectSalesSummary          = (s) => s.reports.salesSummary;
export const selectSalesByProduct        = (s) => s.reports.salesByProduct;
export const selectSalesByCategory       = (s) => s.reports.salesByCategory;
export const selectStockBalance          = (s) => s.reports.stockBalance;
export const selectStockBalanceByProduct = (s) => s.reports.stockBalanceByProduct;

export default reportsSlice.reducer;