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

// ─── Helper: extrae el objeto user de la respuesta del backend ───────────────
// La respuesta de /auth/authenticate y /auth/register devuelve:
//   { access_token, user_id, username, email, role, firstName, lastName }
// Mapeamos user_id → id para que el store sea consistente.
const extractUser = (payload) => ({
  id:        payload.user_id   ?? payload.userId ?? null,
  username:  payload.username,
  email:     payload.email,
  role:      payload.role,
  firstName: payload.firstName,
  lastName:  payload.lastName,
});

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  token: null,
  user: null,          // { id, username, email, role, firstName, lastName }
  isAuthenticated: false,
  status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
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
        state.user = extractUser(action.payload);
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
        state.user = extractUser(action.payload);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al registrarse';
        state.isAuthenticated = false;
      });

    // ── FETCH PROFILE ──
    // /users/data devuelve UserDTO: { id, username, firstName, lastName, email, password, role }
    builder
      .addCase(fetchProfile.fulfilled, (state, action) => {
        // Mergear — preservar lo que ya tenemos y agregar/actualizar con lo del servidor
        state.user = {
          ...state.user,
          id:        action.payload.id        ?? state.user?.id,
          username:  action.payload.username  ?? state.user?.username,
          firstName: action.payload.firstName ?? state.user?.firstName,
          lastName:  action.payload.lastName  ?? state.user?.lastName,
          email:     action.payload.email     ?? state.user?.email,
          role:      action.payload.role      ?? state.user?.role,
        };
      })
      .addCase(fetchProfile.rejected, (state) => {
        // Si falla el perfil no cerramos sesión automáticamente
        // (el token puede seguir siendo válido, solo falló la red)
        // Solo deslogueamos si no tenemos datos básicos del usuario
        if (!state.user?.username) {
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
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