import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supplierService } from '../../services/catalogService';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchAll',
  async ({ token, params = {} } = {}, { rejectWithValue }) => {
    try {
      return await supplierService.getAll(token, params);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const createSupplier = createAsyncThunk(
  'suppliers/create',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await supplierService.create(token, data);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const updateSupplier = createAsyncThunk(
  'suppliers/update',
  async ({ token, id, data }, { rejectWithValue }) => {
    try {
      return await supplierService.update(token, id, data);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const deleteSupplier = createAsyncThunk(
  'suppliers/delete',
  async ({ token, id }, { rejectWithValue }) => {
    try {
      await supplierService.delete(token, id);
      return id;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    actionStatus: 'idle',
    actionError: null,
  },
  reducers: {
    clearSupplierActionState(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending,   (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchSuppliers.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload; })
      .addCase(fetchSuppliers.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });

    builder
      .addCase(createSupplier.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createSupplier.fulfilled, (s, a) => { s.actionStatus = 'succeeded'; s.items.push(a.payload); })
      .addCase(createSupplier.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    builder
      .addCase(updateSupplier.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(updateSupplier.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((x) => x.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(updateSupplier.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    builder
      .addCase(deleteSupplier.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(deleteSupplier.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((x) => x.id === a.payload);
        if (idx !== -1) s.items[idx] = { ...s.items[idx], active: false };
      })
      .addCase(deleteSupplier.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });
  },
});

export const { clearSupplierActionState } = suppliersSlice.actions;

export const selectSuppliers       = (s) => s.suppliers.items;
export const selectActiveSuppliers = (s) => s.suppliers.items.filter((x) => x.active);
export const selectSuppliersStatus = (s) => s.suppliers.status;
export const selectSuppliersError  = (s) => s.suppliers.error;
export const selectSupplierAction  = (s) => ({
  status: s.suppliers.actionStatus,
  error:  s.suppliers.actionError,
});

export default suppliersSlice.reducer;