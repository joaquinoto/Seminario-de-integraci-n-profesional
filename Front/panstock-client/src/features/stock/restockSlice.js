import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  if (res.status === 204) return [];
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

// ─── Thunk ────────────────────────────────────────────────────────────────────

export const fetchRestockSuggestions = createAsyncThunk(
  'restock/fetchSuggestions',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/stock/restock-suggestions`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const restockSlice = createSlice({
  name: 'restock',
  initialState: {
    items:  [],
    status: 'idle',   // idle | loading | succeeded | failed
    error:  null,
    lastFetch: null,
  },
  reducers: {
    clearRestockState(state) {
      state.items     = [];
      state.status    = 'idle';
      state.error     = null;
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestockSuggestions.pending,   (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchRestockSuggestions.fulfilled, (s, a) => {
        s.status    = 'succeeded';
        s.items     = a.payload ?? [];
        s.lastFetch = Date.now();
      })
      .addCase(fetchRestockSuggestions.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });
  },
});

export const { clearRestockState } = restockSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectRestockItems      = (s) => s.restock.items;
export const selectRestockStatus     = (s) => s.restock.status;
export const selectRestockError      = (s) => s.restock.error;
export const selectRestockLastFetch  = (s) => s.restock.lastFetch;
export const selectRestockCount      = (s) => s.restock.items.length;

export default restockSlice.reducer;