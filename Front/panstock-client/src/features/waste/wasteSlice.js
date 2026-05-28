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
  async ({ token, params = {} } = {}, { rejectWithValue }) => {
    try {
      const q = new URLSearchParams();
      if (params.from)        q.set('from',        params.from);
      if (params.to)          q.set('to',          params.to);
      if (params.categoryId)  q.set('categoryId',  String(params.categoryId));
      if (params.supplierId)  q.set('supplierId',  String(params.supplierId));
      if (params.reason)      q.set('reason',      params.reason);
      if (params.createdById) q.set('createdById', String(params.createdById));

      const qs = q.toString();
      return await fetch(`${BASE_URL}/api/waste-records${qs ? `?${qs}` : ''}`, {
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

export const fetchUsers = createAsyncThunk(
  'waste/fetchUsers',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/users`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Estado inicial ───────────────────────────────────────────────────────────

// Se extrae como constante para poder reutilizarla en el reset de logout.
const initialFilters = {
  from:        '',
  to:          '',
  categoryId:  '',
  supplierId:  '',
  reason:      '',
  createdById: '',
};

const initialState = {
  items:        [],
  listStatus:   'idle',
  listError:    null,
  actionStatus: 'idle',
  actionError:  null,
  lastCreated:  null,
  users:        [],
  usersStatus:  'idle',
  // ── activeFilters NO se persiste entre sesiones ──────────────
  // El wastePersistConfig en store.js ya no incluye 'activeFilters'
  // en su whitelist. Pero además se define initialFilters como constante
  // para que el reset del rootReducer (logout) devuelva siempre filtros limpios.
  activeFilters: initialFilters,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const wasteSlice = createSlice({
  name: 'waste',
  initialState,
  reducers: {
    clearWasteActionState(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
      state.lastCreated  = null;
    },
    setWasteFilters(state, action) {
      state.activeFilters = { ...state.activeFilters, ...action.payload };
    },
    clearWasteFilters(state) {
      state.activeFilters = initialFilters;
    },
    // ── Resetear filtros y lista (llamado al montar WastePage) ────────
    resetWasteState(state) {
      state.activeFilters = initialFilters;
      state.items         = [];
      state.listStatus    = 'idle';
      state.listError     = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWasteRecords.pending,   (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchWasteRecords.fulfilled, (s, a) => { s.listStatus = 'succeeded'; s.items = a.payload ?? []; })
      .addCase(fetchWasteRecords.rejected,  (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    builder
      .addCase(createWasteRecord.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createWasteRecord.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.lastCreated  = a.payload;
        if (s.items) s.items.unshift(a.payload);
      })
      .addCase(createWasteRecord.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    builder
      .addCase(fetchUsers.pending,   (s) => { s.usersStatus = 'loading'; })
      .addCase(fetchUsers.fulfilled, (s, a) => {
        s.usersStatus = 'succeeded';
        const raw = a.payload;
        s.users = Array.isArray(raw) ? raw : (raw?.content ?? []);
      })
      .addCase(fetchUsers.rejected,  (s) => { s.usersStatus = 'failed'; });
  },
});

export const {
  clearWasteActionState,
  setWasteFilters,
  clearWasteFilters,
  resetWasteState,
} = wasteSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectWasteRecords     = (s) => s.waste.items;
export const selectWasteListStatus  = (s) => s.waste.listStatus;
export const selectWasteListError   = (s) => s.waste.listError;
export const selectWasteFilters     = (s) => s.waste.activeFilters;
export const selectWasteUsers       = (s) => s.waste.users;
export const selectWasteUsersStatus = (s) => s.waste.usersStatus;
export const selectWasteAction      = (s) => ({
  status:      s.waste.actionStatus,
  error:       s.waste.actionError,
  lastCreated: s.waste.lastCreated,
});

export default wasteSlice.reducer;