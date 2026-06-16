import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// ── Importar reducers ──
import authReducer from '../features/auth/authSlice';
import catalogReducer from '../features/catalog/catalogSlice';
import stockReducer from '../features/stock/stockSlice';
import expirationReducer from '../features/stock/expirationSlice';
import wasteReducer from '../features/waste/wasteSlice';
import alertsReducer from '../features/alerts/alertsSlice';
import promotionsReducer from '../features/promotions/promotionsSlice';
import reportsReducer from '../features/reports/reportsSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import autoWasteNotificationReducer from '../features/waste/autoWasteNotificationSlice';

// Configuración de persist para AUTH
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'], // Solo estos campos se persisten
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

// ── Crear store ──
export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    catalog: catalogReducer,
    stock: stockReducer,
    expiration: expirationReducer,
    waste: wasteReducer,
    alerts: alertsReducer,
    promotions: promotionsReducer,
    reports: reportsReducer,
    notifications: notificationsReducer,
    autoWasteNotification: autoWasteNotificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);