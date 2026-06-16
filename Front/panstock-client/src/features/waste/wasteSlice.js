import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { recordAutoWaste } from './autoWasteNotificationSlice';

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
      //Si no viene token en el argumento, extrae de Redux
      let effectiveToken = token;
      if (!effectiveToken) {
        const state = getState();
        effectiveToken = state.auth?.token;
        console.warn('[wasteSlice] Token no llegó en argumento, extrayendo de Redux:', effectiveToken?.substring(0, 20) + '...');
      }
      
      if (!effectiveToken) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
      }

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
     let effectiveToken = token;
      if (!effectiveToken) {
        const state = getState();
        effectiveToken = state.auth?.token;
      }
      
      if (!effectiveToken) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
      }

      return await fetch(`${BASE_URL}/api/waste-records`, {
        method: 'POST',
        headers: authHeaders(effectiveToken),
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
 *
 * Ahora valida token y maneja errores 403 (auth) vs otros errores.
 *
 * Tras el éxito, dispara recordAutoWaste para acumular el lote en el
 * slice de notificación del día y mostrar el modal de confirmación.
 */
export const autoWasteExpiredBatch = createAsyncThunk(
  'waste/autoWasteExpiredBatch',
  async ({ token, batchId, quantity, productName }, { dispatch, rejectWithValue }) => {
    try {
      let effectiveToken = token;
      if (!effectiveToken) {
        const state = getState();
        effectiveToken = state.auth?.token;
      }

      if (!effectiveToken) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
      }

      const data = {
        batchId,
        userId:   null,
        quantity,
        reason:   'EXPIRED',
        notes:    'Descarte automático de lote vencido (sistema).',
      };

      const response = await fetch(`${BASE_URL}/api/waste-records`, {
        method: 'POST',
        headers: authHeaders(effectiveToken),
        body: JSON.stringify(data),
      });

      // Detectar errores específicos
      if (response.status === 403) {
        throw new Error(
          'Acceso denegado (403). Verifica tu sesión o permisos. ' +
          'Si el problema persiste, intenta cerrar sesión y volver a iniciar.'
        );
      }

      const result = await handleResponse(response);

      // ── Notificar al slice del modal ──────────────────────────────────
      // Se dispara aquí (no en extraReducers) para tener acceso al payload
      // enriquecido (productName viene del thunk arg, wasteRecordId del result).
      if (result) {
        dispatch(recordAutoWaste({
          batchId,
          productName: productName || result.productName || `Lote #${batchId}`,
          quantity,
          wasteRecordId: result.id ?? null,
        }));
      }

      return result;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchUsers = createAsyncThunk(
  'waste/fetchUsers',
  async ({ token }, { rejectWithValue }) => {
    try {
      if (!token) {
        throw new Error('No hay token de autenticación.');
      }

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
  items:            [],
  listStatus:       'idle',
  listError:        null,
  actionStatus:     'idle',
  actionError:      null,
  lastCreated:      null,
  users:            [],
  usersStatus:      'idle',
  activeFilters:    initialFilters,
  autoWastePending: [],
  lastFetch:        null,
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
      .addCase(fetchWasteRecords.fulfilled, (s, a) => { s.listStatus = 'succeeded'; s.items = a.payload ?? []; s.lastFetch = Date.now(); })
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
        if (s.items && a.payload) {
          s.items.unshift(a.payload);
        }
      })
      .addCase(autoWasteExpiredBatch.rejected, (s, a) => {
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

export const selectWasteRecords      = (s) => s.waste.items;
export const selectWasteListStatus   = (s) => s.waste.listStatus;
export const selectWasteListError    = (s) => s.waste.listError;
export const selectWasteFilters      = (s) => s.waste.activeFilters;
export const selectWasteUsers        = (s) => s.waste.users;
export const selectWasteUsersStatus  = (s) => s.waste.usersStatus;
export const selectAutoWastePending  = (s) => s.waste.autoWastePending;
export const selectWasteActionStatus = (s) => s.waste.actionStatus;
export const selectWasteActionError  = (s) => s.waste.actionError;
export const selectWasteAction       = (s) => ({
  status:      s.waste.actionStatus,
  error:       s.waste.actionError,
  lastCreated: s.waste.lastCreated,
});

export default wasteSlice.reducer;
