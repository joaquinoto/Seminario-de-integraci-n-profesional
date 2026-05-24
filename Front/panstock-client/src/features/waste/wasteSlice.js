import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  if (res.status === 204) return null;
  if (res.status === 403) throw new Error('No tenés permiso para realizar esta acción.');
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

/**
 * GET /api/waste-records
 * Soporta filtro ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Acceso: OWNER y EMPLOYEE (solo lectura)
 */
export const fetchWasteRecords = createAsyncThunk(
  'waste/fetchAll',
  async ({ token, from = null, to = null }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to', to);
      const qs = params.toString();
      return await fetch(`${BASE_URL}/api/waste-records${qs ? `?${qs}` : ''}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * POST /api/waste-records
 * Acceso: SOLO OWNER (el backend devuelve 403 si es EMPLOYEE)
 */
export const createWasteRecord = createAsyncThunk(
  'waste/create',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/waste-records`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const wasteSlice = createSlice({
  name: 'waste',
  initialState: {
    items: [],
    filters: { from: '', to: '' },
    listStatus: 'idle',
    listError: null,
    actionStatus: 'idle',
    actionError: null,
    lastCreated: null,
  },
  reducers: {
    clearWasteActionState(state) {
      state.actionStatus = 'idle';
      state.actionError = null;
      state.lastCreated = null;
    },
    setWasteFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearWasteFilters(state) {
      state.filters = { from: '', to: '' };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWasteRecords.pending,   (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchWasteRecords.fulfilled, (s, a) => { s.listStatus = 'succeeded'; s.items = a.payload; })
      .addCase(fetchWasteRecords.rejected,  (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    builder
      .addCase(createWasteRecord.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createWasteRecord.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.lastCreated = a.payload;
        s.items.unshift(a.payload);
      })
      .addCase(createWasteRecord.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });
  },
});

export const { clearWasteActionState, setWasteFilters, clearWasteFilters } = wasteSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectWasteRecords     = (s) => s.waste.items;
export const selectWasteFilters     = (s) => s.waste.filters;
export const selectWasteListStatus  = (s) => s.waste.listStatus;
export const selectWasteListError   = (s) => s.waste.listError;
export const selectWasteAction      = (s) => ({
  status:      s.waste.actionStatus,
  error:       s.waste.actionError,
  lastCreated: s.waste.lastCreated,
});

/** Métricas económicas calculadas del listado actual */
export const selectWasteMetrics = (s) => {
  const records = s.waste.items;
  const totalRecords   = records.length;
  const totalQty       = records.reduce((acc, r) => acc + Number(r.quantity    || 0), 0);
  const totalLoss      = records.reduce((acc, r) => acc + Number(r.economicLoss || 0), 0);
  const avgLoss        = totalRecords > 0 ? totalLoss / totalRecords : 0;

  // Pérdida por motivo
  const byReason = records.reduce((acc, r) => {
    const key = r.reason || 'OTHER';
    if (!acc[key]) acc[key] = { count: 0, qty: 0, loss: 0 };
    acc[key].count += 1;
    acc[key].qty   += Number(r.quantity || 0);
    acc[key].loss  += Number(r.economicLoss || 0);
    return acc;
  }, {});

  // Pérdida por producto (top 5)
  const byProduct = Object.values(
    records.reduce((acc, r) => {
      const key = r.productId;
      if (!acc[key]) acc[key] = { productId: key, productName: r.productName, count: 0, qty: 0, loss: 0 };
      acc[key].count += 1;
      acc[key].qty   += Number(r.quantity || 0);
      acc[key].loss  += Number(r.economicLoss || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 5);

  return { totalRecords, totalQty, totalLoss, avgLoss, byReason, byProduct };
};

export default wasteSlice.reducer;