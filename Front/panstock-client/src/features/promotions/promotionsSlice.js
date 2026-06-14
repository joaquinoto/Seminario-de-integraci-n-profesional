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

// ─── Helpers para tipos de promo extendidos ───────────────────────────────────
//
// El backend solo conoce PERCENTAGE y FIXED_PRICE.
// TWO_FOR_ONE y SECOND_UNIT_50 son conceptos del frontend:
//   - Se guardan en el campo `meta` de la promo (en el title/description)
//     y se identifican por un prefijo especial en el title.
//   - Al crear la promo se mapean a PERCENTAGE con un porcentaje especial
//     o se codifican en el description para que el frontend pueda detectarlos.
//
// Estrategia elegida: almacenar el tipo extendido en el campo `description`
// con un prefijo codificado: "[TYPE:TWO_FOR_ONE]" o "[TYPE:SECOND_UNIT_50]".
// El backend lo guarda como texto. El frontend lo detecta al leer.
//
// Para calcular el precio efectivo en ventas:
//   - TWO_FOR_ONE: si qty >= 2, precio_total = ceil(qty/2) * precio_unitario
//   - SECOND_UNIT_50: precio_promedio = precio * (1 + 0.5) / 2 = precio * 0.75
//     → efectivamente un 25% de descuento promedio cuando se compran de a 2
//
// Nota: el precio unitario efectivo que se guarda en el movimiento de stock
// es siempre el precio_promedio por unidad de esa transacción.

export const PROMO_TYPE_TAG = {
  TWO_FOR_ONE:      '[TYPE:TWO_FOR_ONE]',
  SECOND_UNIT_50:   '[TYPE:SECOND_UNIT_50]',
};

/**
 * Extrae el tipo extendido de una promo desde su description.
 * Devuelve 'TWO_FOR_ONE' | 'SECOND_UNIT_50' | null
 */
export const extractExtendedType = (promotion) => {
  if (!promotion) return null;
  const desc = promotion.description || '';
  if (desc.includes(PROMO_TYPE_TAG.TWO_FOR_ONE))    return 'TWO_FOR_ONE';
  if (desc.includes(PROMO_TYPE_TAG.SECOND_UNIT_50)) return 'SECOND_UNIT_50';
  return null;
};

/**
 * Calcula el precio efectivo por unidad según el tipo de promo y la cantidad.
 *
 * @param {object} promotion  - objeto de promo con discountType, discountPercentage, promotionalPrice
 * @param {number} originalPrice - precio base por unidad
 * @param {number} quantity   - cantidad que se va a vender
 * @returns {{ unitPrice: number, totalPrice: number, description: string }}
 */
export const calcEffectivePriceForSale = (promotion, originalPrice, quantity) => {
  if (!promotion || !originalPrice) return null;

  const extType = extractExtendedType(promotion);
  const qty = Math.max(1, quantity || 1);
  const base = parseFloat(originalPrice);

  if (extType === 'TWO_FOR_ONE') {
    // Por cada 2 unidades se paga 1
    // Precio total = ceil(qty / 2) * base
    const paidUnits = Math.ceil(qty / 2);
    const totalPrice = paidUnits * base;
    const unitPrice = totalPrice / qty;
    return {
      unitPrice,
      totalPrice,
      displayLabel: '2x1',
      detail: `Pagás ${paidUnits} de ${qty} unidades`,
    };
  }

  if (extType === 'SECOND_UNIT_50') {
    // Cada segunda unidad sale al 50% del precio
    // Ej: qty=3 → 1 full + 1 mitad + 1 full → totalPrice = 2*base + 0.5*base
    const fullUnits  = Math.ceil(qty / 2);
    const halfUnits  = Math.floor(qty / 2);
    const totalPrice = fullUnits * base + halfUnits * (base * 0.5);
    const unitPrice  = totalPrice / qty;
    return {
      unitPrice,
      totalPrice,
      displayLabel: '2da unidad 50%',
      detail: `${fullUnits} precio normal + ${halfUnits} al 50%`,
    };
  }

  // PERCENTAGE normal
  if (promotion.discountType === 'PERCENTAGE' && promotion.discountPercentage) {
    const pct = parseFloat(promotion.discountPercentage);
    const unitPrice  = base * (1 - pct / 100);
    const totalPrice = unitPrice * qty;
    return {
      unitPrice,
      totalPrice,
      displayLabel: `-${pct}%`,
      detail: `${pct}% de descuento por unidad`,
    };
  }

  // FIXED_PRICE
  if (promotion.discountType === 'FIXED_PRICE' && promotion.promotionalPrice) {
    const unitPrice  = parseFloat(promotion.promotionalPrice);
    const totalPrice = unitPrice * qty;
    return {
      unitPrice,
      totalPrice,
      displayLabel: 'precio fijo',
      detail: `Precio fijo promocional`,
    };
  }

  return null;
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

const todayISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

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

export const selectPromotionSuggestions = (s) => {
  const suggestions = s.promotions.suggestions ?? [];
  const activeProductIds = new Set(
    (s.products?.items ?? [])
      .filter((p) => p.active)
      .map((p) => p.id)
  );
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

export const selectVisiblePromotions = (s) => {
  const promos = s.promotions.items ?? [];
  const activeProductIds = new Set(
    (s.products?.items ?? [])
      .filter((p) => p.active)
      .map((p) => p.id)
  );
  if (activeProductIds.size === 0) return promos;
  return promos.filter((promo) => {
    if (!activeProductIds.has(promo.productId)) return false;
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