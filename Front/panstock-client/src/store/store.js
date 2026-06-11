import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore, persistReducer,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/es/storage';

import authReducer                  from '../features/auth/authSlice';
import categoriesReducer            from '../features/catalog/categoriesSlice';
import productsReducer              from '../features/catalog/productsSlice';
import suppliersReducer             from '../features/catalog/suppliersSlice';
import expirationReducer            from '../features/stock/expirationSlice';
import stockReducer                 from '../features/stock/stockSlice';
import wasteReducer                 from '../features/waste/wasteSlice';
import notificationsReducer         from '../features/notifications/notificationsSlice';
import restockReducer               from '../features/stock/restockSlice';
import promotionsReducer            from '../features/promotions/promotionsSlice';
import autoWasteNotificationReducer from '../features/waste/autoWasteNotificationSlice';

const authPersistConfig = {
  key: 'panstock-auth', storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

const categoriesPersistConfig = {
  key: 'panstock-categories', storage,
  whitelist: ['items'],
};

const productsPersistConfig = {
  key: 'panstock-products', storage,
  whitelist: ['items'],
};

const suppliersPersistConfig = {
  key: 'panstock-suppliers', storage,
  whitelist: ['items'],
};

const wastePersistConfig = {
  key: 'panstock-waste', storage,
  whitelist: ['users'],
};

const notificationsPersistConfig = {
  key: 'panstock-notifications', storage,
  whitelist: [
    'enabled',
    'channel',
    'intervalMinutes',
    'alertDaysAhead',
    'permission',
  ],
};

/**
 * autoWasteNotification persiste los lotes auto-descartados del día
 * y si el usuario confirmó el descarte físico.
 * Persiste todo el slice (dateKey, confirmedForDate, batches) para que
 * sobreviva recargas de página durante el mismo día.
 */
const autoWasteNotificationPersistConfig = {
  key: 'panstock-auto-waste-notification', storage,
  // whitelist vacío = persiste todo el estado del slice
};

const appReducer = combineReducers({
  auth:                  persistReducer(authPersistConfig,                  authReducer),
  categories:            persistReducer(categoriesPersistConfig,            categoriesReducer),
  products:              persistReducer(productsPersistConfig,              productsReducer),
  suppliers:             persistReducer(suppliersPersistConfig,             suppliersReducer),
  expiration:            expirationReducer,
  stock:                 stockReducer,
  waste:                 persistReducer(wastePersistConfig,                 wasteReducer),
  notifications:         persistReducer(notificationsPersistConfig,         notificationsReducer),
  restock:               restockReducer,
  promotions:            promotionsReducer,
  autoWasteNotification: persistReducer(autoWasteNotificationPersistConfig, autoWasteNotificationReducer),
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    // Al cerrar sesión limpiamos todo excepto auth y notifications.
    const { auth, notifications } = state;
    return appReducer({ auth, notifications }, action);
  }
  return appReducer(state, action);
};

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