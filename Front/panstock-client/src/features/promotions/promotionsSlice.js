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
    items: [],
    listStatus: 'idle',
    listError: null,
    suggestions: [],
    suggestionsStatus: 'idle',
    suggestionsError: null,
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

    builder
      .addCase(createPromotion.pending, (s) => {
        s.actionStatus = 'loading'; s.actionError = null;
      })
      .addCase(createPromotion.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.lastCreated  = a.payload;
        s.items.unshift(a.payload);
        if (a.payload?.batchId) {
          s.suggestions = s.suggestions.filter(
            (sg) => sg.batchId !== a.payload.batchId
          );
        }
      })
      .addCase(createPromotion.rejected, (s, a) => {
        s.actionStatus = 'failed'; s.actionError = a.payload;
      });

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

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Devuelve la fecha local de hoy en formato YYYY-MM-DD.
 * Se usa para comparar con batchExpirationDate (que viene como string YYYY-MM-DD).
 */
const todayISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

/**
 * Un lote se considera "vencido completamente" si su fecha de vencimiento
 * es anterior (estricta) a la fecha actual (sin hora).
 * batchExpirationDate viene como 'YYYY-MM-DD' desde el backend.
 */
const isBatchFullyExpired = (batchExpirationDate) => {
  if (!batchExpirationDate) return false;
  const expStr = typeof batchExpirationDate === 'string' && batchExpirationDate.length > 10
    ? batchExpirationDate.split('T')[0]
    : batchExpirationDate;
  return expStr < todayISO();
};

// ─── Selectores ───────────────────────────────────────────────────────────────

export const selectPromotions          = (s) => s.promotions.items;
export const selectPromotionsStatus    = (s) => s.promotions.listStatus;
export const selectPromotionsError     = (s) => s.promotions.listError;

/** Sugerencias del sistema: solo para productos activos (el backend ya filtra, pero
 *  añadimos una segunda capa en el frontend usando el catálogo de productos en store). */
export const selectPromotionSuggestions = (s) => {
  const suggestions = s.promotions.suggestions ?? [];
  // El backend devuelve sugerencias solo de lotes AVAILABLE no vencidos y sin promo activa.
  // En el frontend filtramos adicionalmente por si el producto fue inactivado recientemente
  // (puede haber un gap entre el backend y el estado del catálogo en Redux).
  const activeProductIds = new Set(
    (s.products?.items ?? [])
      .filter((p) => p.active)
      .map((p) => p.id)
  );

  // Si no hay productos en el store (aún no se cargaron), devolvemos todas las sugerencias
  // para no bloquear la UI mientras carga.
  if (activeProductIds.size === 0) return suggestions;

  return suggestions.filter((sg) => activeProductIds.has(sg.productId));
};

export const selectSuggestionsStatus   = (s) => s.promotions.suggestionsStatus;
export const selectSuggestionsError    = (s) => s.promotions.suggestionsError;

export const selectPromotionAction     = (s) => ({
  status:      s.promotions.actionStatus,
  error:       s.promotions.actionError,
  lastCreated: s.promotions.lastCreated,
});

/**
 * Promociones visibles en la UI:
 * - Filtramos las que pertenecen a un producto inactivo (hidden junto con el producto).
 * - Filtramos las ACTIVAS cuyo lote ya venció completamente (fecha < hoy):
 *   en ese caso la promo debe eliminarse visualmente (no tiene sentido mostrarla).
 *   Las promos CANCELLED o EXPIRED se muestran igual en el historial.
 */
export const selectVisiblePromotions = (s) => {
  const promos = s.promotions.items ?? [];
  const activeProductIds = new Set(
    (s.products?.items ?? [])
      .filter((p) => p.active)
      .map((p) => p.id)
  );

  // Si no hay productos cargados, devolver todas
  if (activeProductIds.size === 0) return promos;

  return promos.filter((promo) => {
    // 1. Ocultar si el producto está inactivo
    if (!activeProductIds.has(promo.productId)) return false;

    // 2. Ocultar promos ACTIVAS cuyo lote ya venció completamente
    if (promo.status === 'ACTIVE' && isBatchFullyExpired(promo.batchExpirationDate)) {
      return false;
    }

    return true;
  });
};

export const selectActivePromotionsCount = (s) => {
  const visible = selectVisiblePromotions(s);
  return visible.filter((p) => p.status === 'ACTIVE').length;
};

export const selectSuggestionsCount    = (s) => selectPromotionSuggestions(s).length;

export default promotionsSlice.reducer;