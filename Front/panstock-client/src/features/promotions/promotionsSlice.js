import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

//const BASE_URL = import.meta.env.VITE_API_URL;

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

/** GET /api/promotions/suggestions — OWNER only */
export const fetchPromotionSuggestions = createAsyncThunk(
  'promotions/fetchSuggestions',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/promotions/suggestions`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/** GET /api/promotions — OWNER + EMPLOYEE */
export const fetchPromotions = createAsyncThunk(
  'promotions/fetchAll',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/promotions`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/** GET /api/promotions/active — OWNER + EMPLOYEE */
export const fetchActivePromotions = createAsyncThunk(
  'promotions/fetchActive',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/promotions/active`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * POST /api/promotions — OWNER only
 * body: {
 *   productId, batchId?, createdById?,
 *   title, description?,
 *   discountType: 'PERCENTAGE' | 'FIXED_PRICE',
 *   discountPercentage? | promotionalPrice?,
 *   startDate, endDate,
 *   suggestedBySystem?
 * }
 */
export const createPromotion = createAsyncThunk(
  'promotions/create',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/promotions`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/** PATCH /api/promotions/{id}/cancel — OWNER only */
export const cancelPromotion = createAsyncThunk(
  'promotions/cancel',
  async ({ token, id }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/promotions/${id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const promotionsSlice = createSlice({
  name: 'promotions',
  initialState: {
    // Lista completa de promociones
    items: [],
    listStatus: 'idle',   // idle | loading | succeeded | failed
    listError: null,

    // Sugerencias del sistema (solo OWNER)
    suggestions: [],
    suggestionsStatus: 'idle',
    suggestionsError: null,

    // Acción (crear / cancelar)
    actionStatus: 'idle',
    actionError: null,
    lastCreated: null,

    lastFetch: null,
  },
  reducers: {
    clearPromotionActionState(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
      state.lastCreated  = null;
    },
    clearPromotionsState(state) {
      state.items            = [];
      state.listStatus       = 'idle';
      state.listError        = null;
      state.suggestions      = [];
      state.suggestionsStatus = 'idle';
      state.suggestionsError = null;
      state.actionStatus     = 'idle';
      state.actionError      = null;
      state.lastCreated      = null;
      state.lastFetch        = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetchPromotionSuggestions ──
    builder
      .addCase(fetchPromotionSuggestions.pending, (s) => {
        s.suggestionsStatus = 'loading'; s.suggestionsError = null;
      })
      .addCase(fetchPromotionSuggestions.fulfilled, (s, a) => {
        s.suggestionsStatus = 'succeeded';
        s.suggestions       = a.payload ?? [];
      })
      .addCase(fetchPromotionSuggestions.rejected, (s, a) => {
        s.suggestionsStatus = 'failed'; s.suggestionsError = a.payload;
      });

    // ── fetchPromotions ──
    builder
      .addCase(fetchPromotions.pending, (s) => {
        s.listStatus = 'loading'; s.listError = null;
      })
      .addCase(fetchPromotions.fulfilled, (s, a) => {
        s.listStatus = 'succeeded';
        s.items      = a.payload ?? [];
        s.lastFetch  = Date.now();
      })
      .addCase(fetchPromotions.rejected, (s, a) => {
        s.listStatus = 'failed'; s.listError = a.payload;
      });

    // ── fetchActivePromotions — actualiza la lista con las activas ──
    builder
      .addCase(fetchActivePromotions.pending, (s) => {
        s.listStatus = 'loading'; s.listError = null;
      })
      .addCase(fetchActivePromotions.fulfilled, (s, a) => {
        s.listStatus = 'succeeded';
        s.items      = a.payload ?? [];
        s.lastFetch  = Date.now();
      })
      .addCase(fetchActivePromotions.rejected, (s, a) => {
        s.listStatus = 'failed'; s.listError = a.payload;
      });

    // ── createPromotion ──
    builder
      .addCase(createPromotion.pending, (s) => {
        s.actionStatus = 'loading'; s.actionError = null;
      })
      .addCase(createPromotion.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.lastCreated  = a.payload;
        // Insertar al inicio de la lista para que aparezca primero
        s.items.unshift(a.payload);
        // Quitar de sugerencias el lote que acabamos de promover
        if (a.payload?.batchId) {
          s.suggestions = s.suggestions.filter(
            (sg) => sg.batchId !== a.payload.batchId
          );
        }
      })
      .addCase(createPromotion.rejected, (s, a) => {
        s.actionStatus = 'failed'; s.actionError = a.payload;
      });

    // ── cancelPromotion ──
    builder
      .addCase(cancelPromotion.pending, (s) => {
        s.actionStatus = 'loading'; s.actionError = null;
      })
      .addCase(cancelPromotion.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((p) => p.id === a.payload?.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(cancelPromotion.rejected, (s, a) => {
        s.actionStatus = 'failed'; s.actionError = a.payload;
      });
  },
});

export const {
  clearPromotionActionState,
  clearPromotionsState,
} = promotionsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectPromotions          = (s) => s.promotions.items;
export const selectPromotionsStatus    = (s) => s.promotions.listStatus;
export const selectPromotionsError     = (s) => s.promotions.listError;
export const selectPromotionSuggestions       = (s) => s.promotions.suggestions;
export const selectSuggestionsStatus   = (s) => s.promotions.suggestionsStatus;
export const selectSuggestionsError    = (s) => s.promotions.suggestionsError;
export const selectPromotionAction     = (s) => ({
  status:      s.promotions.actionStatus,
  error:       s.promotions.actionError,
  lastCreated: s.promotions.lastCreated,
});
export const selectActivePromotionsCount = (s) =>
  s.promotions.items.filter((p) => p.status === 'ACTIVE').length;
export const selectSuggestionsCount    = (s) => s.promotions.suggestions.length;

export default promotionsSlice.reducer;