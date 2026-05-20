import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/es/storage';

import authReducer       from '../features/auth/authSlice';
import categoriesReducer from '../features/catalog/categoriesSlice';
import productsReducer   from '../features/catalog/productsSlice';
import suppliersReducer  from '../features/catalog/suppliersSlice';
import expirationReducer from '../features/stock/expirationSlice';

// ─── Persist configs ──────────────────────────────────────────────────────────

const authPersistConfig = {
  key: 'panstock-auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

const categoriesPersistConfig = {
  key: 'panstock-categories',
  storage,
  whitelist: ['items'],
};

const productsPersistConfig = {
  key: 'panstock-products',
  storage,
  whitelist: ['items', 'filters'],
};

const suppliersPersistConfig = {
  key: 'panstock-suppliers',
  storage,
  whitelist: ['items'],
};

// Expiration: solo persistir los conteos del badge del topbar,
// no la lista completa (se refresca siempre al entrar a la página)
const expirationPersistConfig = {
  key: 'panstock-expiration',
  storage,
  whitelist: ['greenCount', 'yellowCount', 'redCount', 'expiredCount'],
};

// ─── Root Reducer ─────────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  auth:       persistReducer(authPersistConfig,       authReducer),
  categories: persistReducer(categoriesPersistConfig, categoriesReducer),
  products:   persistReducer(productsPersistConfig,   productsReducer),
  suppliers:  persistReducer(suppliersPersistConfig,  suppliersReducer),
  expiration: persistReducer(expirationPersistConfig, expirationReducer),
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);