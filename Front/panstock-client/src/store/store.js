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

// ── ATENCIÓN: el slice de expiration NO se persiste ─────────────────────────
// Persistir los conteos del semáforo causa que Redux Persist restaure
// valores del día anterior al recargar la app o navegar entre páginas.
// Como los datos de vencimiento se refrescan en cada montaje de AppTopbar,
// DashboardPage y ExpirationPage, no hay ningún beneficio en persistirlos
// y sí hay un costo: mostrar fechas incorrectas hasta que llega el fetch.
//
// ─────────────────────────────────────────────────────────────────────────────

const wastePersistConfig = {
  key: 'panstock-waste',
  storage,
  whitelist: ['activeFilters', 'users'],
};

// ─── Root Reducer ─────────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  auth:       persistReducer(authPersistConfig,       authReducer),
  categories: persistReducer(categoriesPersistConfig, categoriesReducer),
  products:   persistReducer(productsPersistConfig,   productsReducer),
  suppliers:  persistReducer(suppliersPersistConfig,  suppliersReducer),
  // SIN persistReducer — siempre arranca limpio
  //siempre arranca con el estado inicial (conteos en 0, items vacíos) y se puebla
 // inmediatamente desde el servidor al montar cualquier página.
  expiration: expirationReducer,
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