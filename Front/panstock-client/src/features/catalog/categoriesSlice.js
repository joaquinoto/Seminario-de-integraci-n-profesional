import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoryService } from '../../services/catalogService';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async ({ token, activeOnly = false } = {}, { rejectWithValue }) => {
    try {
      return await categoryService.getAll(token, activeOnly);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/create',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await categoryService.create(token, data);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({ token, id, data }, { rejectWithValue }) => {
    try {
      return await categoryService.update(token, id, data);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async ({ token, id }, { rejectWithValue }) => {
    try {
      await categoryService.delete(token, id);
      return id;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: {
    items: [],
    status: 'idle',       // idle | loading | succeeded | failed
    error: null,
    actionStatus: 'idle', // idle | loading | succeeded | failed
    actionError: null,
  },
  reducers: {
    clearCategoryActionState(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetch ──
    builder
      .addCase(fetchCategories.pending,   (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchCategories.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload; })
      .addCase(fetchCategories.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });

    // ── create ──
    builder
      .addCase(createCategory.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createCategory.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.items.push(a.payload);
      })
      .addCase(createCategory.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    // ── update ──
    builder
      .addCase(updateCategory.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(updateCategory.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((c) => c.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(updateCategory.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    // ── delete (logical: backend sets active=false) ──
    builder
      .addCase(deleteCategory.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(deleteCategory.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((c) => c.id === a.payload);
        if (idx !== -1) s.items[idx] = { ...s.items[idx], active: false };
      })
      .addCase(deleteCategory.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });
  },
});

export const { clearCategoryActionState } = categoriesSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectCategories       = (s) => s.categories.items;
export const selectActiveCategories = (s) => s.categories.items.filter((c) => c.active);
export const selectCategoriesStatus = (s) => s.categories.status;
export const selectCategoriesError  = (s) => s.categories.error;
export const selectCategoryAction   = (s) => ({
  status: s.categories.actionStatus,
  error:  s.categories.actionError,
});

export default categoriesSlice.reducer;