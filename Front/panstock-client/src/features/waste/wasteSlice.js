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

export const fetchWasteRecords = createAsyncThunk(
  'waste/fetchAll',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/waste-records`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

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

export const { clearWasteActionState } = wasteSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectWasteRecords     = (s) => s.waste.items;
export const selectWasteListStatus  = (s) => s.waste.listStatus;
export const selectWasteListError   = (s) => s.waste.listError;
export const selectWasteAction      = (s) => ({
  status:      s.waste.actionStatus,
  error:       s.waste.actionError,
  lastCreated: s.waste.lastCreated,
});

export default wasteSlice.reducer;