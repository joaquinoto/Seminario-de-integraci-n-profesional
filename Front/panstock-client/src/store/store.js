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
  // Los filtros de productos (origen, categoría, activeOnly) no deben
  // persistirse entre sesiones: cada login debe empezar con filtros limpios.
  whitelist: ['items'],
};

const suppliersPersistConfig = {
  key: 'panstock-suppliers',
  storage,
  whitelist: ['items'],
};

// ── expiration: sin persist (time-sensitive, siempre se refresca) ─────────────

const wastePersistConfig = {
  key: 'panstock-waste',
  storage,
  // Los filtros de mermas (fechas, categoría, proveedor, motivo, usuario)
  // no deben sobrevivir entre sesiones: cada login empieza desde cero.
  // Solo se persiste 'users' (lista de usuarios para el dropdown del OWNER)
  // para evitar un fetch extra innecesario al cargar la página de mermas.
  whitelist: ['users'],
};

// ─── Root Reducer con soporte para reset en logout ───────────────────────────
//
// Patrón "reset on logout": el rootReducer escucha la acción 'auth/logout'.
// Cuando se despacha, resetea el estado de todos los slices que NO deben
// sobrevivir entre sesiones (catálogo, stock, waste, expiration).
// El slice de auth se resetea solo mediante su propio reducer.
//
// Ventaja: no hay que tocar los slices individuales; cualquier slice nuevo
// que se agregue en el futuro se resetea automáticamente al hacer logout.
// ─────────────────────────────────────────────────────────────────────────────

const appReducer = combineReducers({
  auth:       persistReducer(authPersistConfig,       authReducer),
  categories: persistReducer(categoriesPersistConfig, categoriesReducer),
  products:   persistReducer(productsPersistConfig,   productsReducer),
  suppliers:  persistReducer(suppliersPersistConfig,  suppliersReducer),
  expiration: expirationReducer,
  stock:      stockReducer,
  waste:      persistReducer(wastePersistConfig,      wasteReducer),
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    // Conservar solo la clave _persist de auth para que redux-persist
    // no se confunda al rehidratar; todo lo demás se resetea a undefined
    // (cada reducer usará su initialState).
    const { auth } = state;
    return appReducer({ auth }, action);
  }
  return appReducer(state, action);
};

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