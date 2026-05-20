import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '../../services/catalogService';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async ({ token, params = {} } = {}, { rejectWithValue }) => {
    try {
      return await productService.getAll(token, params);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await productService.create(token, data);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ token, id, data }, { rejectWithValue }) => {
    try {
      return await productService.update(token, id, data);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async ({ token, id }, { rejectWithValue }) => {
    try {
      await productService.delete(token, id);
      return id;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    filters: { activeOnly: true, origin: '', categoryId: '' },
    status: 'idle',
    error: null,
    actionStatus: 'idle',
    actionError: null,
  },
  reducers: {
    setProductFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearProductActionState(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetch ──
    builder
      .addCase(fetchProducts.pending,   (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchProducts.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload; })
      .addCase(fetchProducts.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });

    // ── create ──
    builder
      .addCase(createProduct.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createProduct.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.items.push(a.payload);
      })
      .addCase(createProduct.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    // ── update ──
    builder
      .addCase(updateProduct.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(updateProduct.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((p) => p.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(updateProduct.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    // ── delete (logical: backend sets active=false) ──
    builder
      .addCase(deleteProduct.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(deleteProduct.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((p) => p.id === a.payload);
        if (idx !== -1) s.items[idx] = { ...s.items[idx], active: false };
      })
      .addCase(deleteProduct.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });
  },
});

export const { setProductFilters, clearProductActionState } = productsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectProducts       = (s) => s.products.items;
export const selectProductFilters = (s) => s.products.filters;
export const selectProductsStatus = (s) => s.products.status;
export const selectProductsError  = (s) => s.products.error;
export const selectProductAction  = (s) => ({
  status: s.products.actionStatus,
  error:  s.products.actionError,
});

export default productsSlice.reducer;