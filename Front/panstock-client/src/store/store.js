// store/store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/es/storage';

import authReducer from '../features/auth/authSlice';

// ─── Persist Config ───────────────────────────────────────────────────────────
// Only persist auth state (token + user info)
const authPersistConfig = {
  key: 'panstock-auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

// ─── Root Reducer ─────────────────────────────────────────────────────────────
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  // Future slices: stock, products, alerts, etc.
});

// ─── Store ────────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);
