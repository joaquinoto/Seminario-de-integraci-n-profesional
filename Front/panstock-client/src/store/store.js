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
import stockReducer      from '../features/stock/stockSlice';

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

// Expiration: only persist badge counts — list refreshes on page visit
const expirationPersistConfig = {
  key: 'panstock-expiration',
  storage,
  whitelist: ['greenCount', 'yellowCount', 'redCount', 'expiredCount'],
};

// Stock: do NOT persist — always fetch fresh data
// (no persistReducer wrapper needed)

// ─── Root Reducer ─────────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  auth:       persistReducer(authPersistConfig,       authReducer),
  categories: persistReducer(categoriesPersistConfig, categoriesReducer),
  products:   persistReducer(productsPersistConfig,   productsReducer),
  suppliers:  persistReducer(suppliersPersistConfig,  suppliersReducer),
  expiration: persistReducer(expirationPersistConfig, expirationReducer),
  stock:      stockReducer,   // no persistence — always fresh
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