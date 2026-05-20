// App.jsx
import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectToken, logout } from './features/auth/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import DashboardPage  from './pages/DashboardPage';
import ProductsPage   from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage  from './pages/SuppliersPage';

// Token expiration guard — checks JWT exp on mount
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

export default function App() {
  const isAuth = useSelector(selectIsAuthenticated);

  return (
    <>
      <TokenGuard />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={isAuth ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuth ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

        {/* Protected — any authenticated user */}
        <Route path="/dashboard"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/products"   element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
        <Route path="/suppliers"  element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />

        {/* Root redirect */}
        <Route path="/"  element={<Navigate to={isAuth ? '/dashboard' : '/login'} replace />} />
        <Route path="*"  element={<Navigate to={isAuth ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
}