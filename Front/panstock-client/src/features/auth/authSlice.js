import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await authService.login(credentials);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const data = await authService.register(userData);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) throw new Error('No hay token disponible');
      const data = await authService.getProfile(token);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  // Auth data
  token: null,
  user: null,          // { username, email, role, firstName, lastName }
  isAuthenticated: false,

  // UI state
  status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  
  // Form mode
  lastAction: null,    // 'login' | 'register'
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      state.lastAction = null;
    },
    clearError(state) {
      state.error = null;
    },
    resetStatus(state) {
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── LOGIN ──
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastAction = 'login';
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.token = action.payload.access_token;
        state.user = {
          username: action.payload.username,
          email: action.payload.email,
          role: action.payload.role,
          firstName: action.payload.firstName,
          lastName: action.payload.lastName,
        };
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al iniciar sesión';
        state.isAuthenticated = false;
      });

    // ── REGISTER ──
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastAction = 'register';
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.token = action.payload.access_token;
        state.user = {
          username: action.payload.username,
          email: action.payload.email,
          role: action.payload.role,
          firstName: action.payload.firstName,
          lastName: action.payload.lastName,
        };
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al registrarse';
        state.isAuthenticated = false;
      });

    // ── FETCH PROFILE ──
    builder
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = {
          ...state.user,
          ...action.payload,
        };
      })
      .addCase(fetchProfile.rejected, (state) => {
        // If profile fetch fails, log out
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { logout, clearError, resetStatus } = authSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser             = (state) => state.auth.user;
export const selectToken            = (state) => state.auth.token;
export const selectAuthStatus       = (state) => state.auth.status;
export const selectAuthError        = (state) => state.auth.error;
export const selectLastAction       = (state) => state.auth.lastAction;

export default authSlice.reducer;
