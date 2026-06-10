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

/**
 * autoWasteExpiredBatch
 *
 * Registra automáticamente la merma de UN lote vencido (daysToExpire < 0).
 * userId = null → backend lo acepta como "sistema automático".
 * created_by_id queda NULL en la BD → en /waste se muestra badge rojo
 * "Descartar lote vencido" (createdByName === null en WasteRecordResponse).
 *
 * Idempotencia:
 *   - autoWastePending (solo en memoria) evita duplicar llamadas en vuelo.
 *   - Si el lote ya está DEPLETED, el backend responde 400 → rejected se
 *     ignora silenciosamente (no se hace rejectWithValue para que no
 *     aparezca como error en UI).
 *   - El processingRef en ExpirationPage evita múltiples ciclos simultáneos.
 */
export const autoWasteExpiredBatch = createAsyncThunk(
  'waste/autoWasteExpiredBatch',
  async ({ token, batchId, quantity }, { rejectWithValue }) => {
    try {
      const data = {
        batchId,
        userId:   null,   // null = sistema automático → createdBy queda NULL
        quantity,
        reason:   'EXPIRED',
        notes:    'Descarte automático de lote vencido (sistema).',
      };
      return await fetch(`${BASE_URL}/api/waste-records`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse);
    } catch (e) {
      // No propagamos el error hacia el UI: el backend devuelve 400
      // si el lote ya está DEPLETED, lo cual es un caso esperado.
      // rejectWithValue vacío para que el slice lo maneje silenciosamente.
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
  activeFilters: initialFilters,
  // autoWastePending: guard SOLO para la sesión activa en memoria.
  // Evita llamadas simultáneas para el mismo batchId dentro de la misma sesión.
  // NO se persiste: al recargar la página debe poder reintentar.
  autoWastePending: [],
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
    resetWasteState(state) {
      state.activeFilters  = initialFilters;
      state.items          = [];
      state.listStatus     = 'idle';
      state.listError      = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetchWasteRecords ──
    builder
      .addCase(fetchWasteRecords.pending,   (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchWasteRecords.fulfilled, (s, a) => { s.listStatus = 'succeeded'; s.items = a.payload ?? []; })
      .addCase(fetchWasteRecords.rejected,  (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    // ── createWasteRecord (manual) ──
    builder
      .addCase(createWasteRecord.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createWasteRecord.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.lastCreated  = a.payload;
        if (s.items) s.items.unshift(a.payload);
      })
      .addCase(createWasteRecord.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    // ── autoWasteExpiredBatch ──
    // pending: agrega batchId a autoWastePending (guard en memoria)
    // fulfilled: quita batchId de pending e inserta el registro en la lista
    // rejected: quita batchId de pending silenciosamente
    //   (el backend devuelve 400 si el lote ya está DEPLETED, caso esperado)
    builder
      .addCase(autoWasteExpiredBatch.pending, (s, a) => {
        const batchId = a.meta.arg.batchId;
        if (!s.autoWastePending.includes(batchId)) {
          s.autoWastePending.push(batchId);
        }
      })
      .addCase(autoWasteExpiredBatch.fulfilled, (s, a) => {
        const batchId = a.meta.arg.batchId;
        s.autoWastePending = s.autoWastePending.filter((id) => id !== batchId);
        // Insertar el registro automático al inicio de la lista si está cargada
        if (s.items && a.payload) {
          s.items.unshift(a.payload);
        }
      })
      .addCase(autoWasteExpiredBatch.rejected, (s, a) => {
        // Quitar de pending silenciosamente — error esperado (lote ya DEPLETED)
        const batchId = a.meta.arg.batchId;
        s.autoWastePending = s.autoWastePending.filter((id) => id !== batchId);
      });

    // ── fetchUsers ──
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
export const selectAutoWastePending = (s) => s.waste.autoWastePending;
export const selectWasteAction      = (s) => ({
  status:      s.waste.actionStatus,
  error:       s.waste.actionError,
  lastCreated: s.waste.lastCreated,
});

export default wasteSlice.reducer;