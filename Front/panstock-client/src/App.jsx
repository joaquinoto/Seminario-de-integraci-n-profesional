import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectToken, logout } from './features/auth/authSlice';
import {
  selectShouldShowAutoWasteModal,
} from './features/waste/autoWasteNotificationSlice';
import ProtectedRoute  from './components/ProtectedRoute';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import DashboardPage   from './pages/DashboardPage';
import ExpirationPage  from './pages/ExpirationPage';
import ProductsPage    from './pages/ProductsPage';
import CategoriesPage  from './pages/CategoriesPage';
import SuppliersPage   from './pages/SuppliersPage';
import StockPage       from './pages/StockPage';
import WastePage       from './pages/WastePage';
import Restockpage     from './pages/RestockPage';
import PromotionsPage  from './pages/PromotionsPage';
import AutoWasteModal  from './components/AutoWasteModal';

/**
 * TokenGuard — verifica en cada render si el JWT del store sigue vigente.
 * Si expiró, hace logout automático y redirige al login.
 */
function TokenGuard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token    = useSelector(selectToken);
  const isAuth   = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!token || !isAuth) return;
    try {
      const payload   = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) {
        dispatch(logout());
        navigate('/login', { replace: true });
      }
    } catch {
      dispatch(logout());
    }
  }, [token, isAuth, dispatch, navigate]);

  return null;
}

/**
 * AutoWasteModalController
 *
 * Se monta dentro del Router para poder usar useLocation().
 * Controla cuándo se muestra el AutoWasteModal:
 *
 * - Aparece cuando `shouldShow` es true (hay lotes auto-descartados hoy
 *   y el usuario no confirmó aún).
 * - Se oculta temporalmente al hacer clic fuera del modal (dismiss).
 * - Reaparece CADA VEZ que la ruta cambia, hasta que el usuario confirme.
 * - No aparece en rutas de auth (/login, /register).
 */
function AutoWasteModalController() {
  const location     = useLocation();
  const isAuth       = useSelector(selectIsAuthenticated);
  const shouldShow   = useSelector(selectShouldShowAutoWasteModal);
  const [visible, setVisible] = useState(false);

  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/register';

  // Cada vez que cambia la ruta y hay lotes pendientes, volver a mostrar
  useEffect(() => {
    if (!isAuth || isAuthRoute) {
      setVisible(false);
      return;
    }
    if (shouldShow) {
      // Pequeño delay para no interrumpir la transición de ruta
      const t = setTimeout(() => setVisible(true), 350);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, shouldShow, isAuth]);

  if (!visible || !shouldShow || !isAuth || isAuthRoute) return null;

  return (
    <AutoWasteModal
      onDismiss={() => setVisible(false)}
    />
  );
}

export default function App() {
  const isAuth = useSelector(selectIsAuthenticated);

  return (
    <>
      <TokenGuard />
      <AutoWasteModalController />

      <Routes>
        {/* ── Rutas públicas ─────────────────────────────────────────────── */}
        <Route
          path="/login"
          element={isAuth ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuth ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
        />

        {/* ── Rutas protegidas — ambos roles (OWNER y EMPLOYEE) ──────────── */}
        <Route path="/dashboard"   element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/stock"       element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
        <Route path="/waste"       element={<ProtectedRoute><WastePage /></ProtectedRoute>} />
        <Route path="/expiration"  element={<ProtectedRoute><ExpirationPage /></ProtectedRoute>} />
        <Route path="/products"    element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/categories"  element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
        <Route path="/suppliers"   element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />

        {/*
          /promotions — accesible por OWNER y EMPLOYEE.
          OWNER ve sugerencias + puede crear/cancelar.
          EMPLOYEE solo ve las activas y el historial.
        */}
        <Route path="/promotions"  element={<ProtectedRoute><PromotionsPage /></ProtectedRoute>} />

        {/* ── Rutas solo OWNER ──────────────────────────────────────────── */}
        <Route
          path="/restock"
          element={<ProtectedRoute requireRole="OWNER"><Restockpage /></ProtectedRoute>}
        />

        {/* ── Fallback ──────────────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to={isAuth ? '/dashboard' : '/login'} replace />} />
        <Route path="*"  element={<Navigate to={isAuth ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
}