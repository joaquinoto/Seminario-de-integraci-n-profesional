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
import wasteReducer      from '../features/waste/wasteSlice';

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

// Solo contadores del semáforo — la lista se refresca al visitar la página
const expirationPersistConfig = {
  key: 'panstock-expiration',
  storage,
  whitelist: ['greenCount', 'yellowCount', 'redCount', 'expiredCount'],
};

// Waste: persistir solo los filtros activos y la lista de usuarios cargada.
// Los registros de merma siempre se traen frescos del servidor.
const wastePersistConfig = {
  key: 'panstock-waste',
  storage,
  // activeFilters incluye el nuevo campo createdById
  whitelist: ['activeFilters', 'users'],
};

// ─── Root Reducer ─────────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  auth:       persistReducer(authPersistConfig,       authReducer),
  categories: persistReducer(categoriesPersistConfig, categoriesReducer),
  products:   persistReducer(productsPersistConfig,   productsReducer),
  suppliers:  persistReducer(suppliersPersistConfig,  suppliersReducer),
  expiration: persistReducer(expirationPersistConfig, expirationReducer),
  stock:      stockReducer,
  waste:      persistReducer(wastePersistConfig,      wasteReducer),
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