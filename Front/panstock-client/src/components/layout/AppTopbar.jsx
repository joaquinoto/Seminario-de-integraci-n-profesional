import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, NavLink } from 'react-router-dom';
import { logout, selectUser, selectToken } from '../../features/auth/authSlice';
import {
  fetchSemaphore,
  clearExpirationState,
  selectGreenCount,
  selectYellowCount,
  selectRedCount,
  selectExpiredCount,
} from '../../features/stock/expirationSlice';
import NotificationBell from '../notifications/NotificationBell';
import useNotifications from '../../features/notifications/useNotifications';

export default function AppTopbar() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const user        = useSelector(selectUser);
  const token       = useSelector(selectToken);

  const greenCount   = useSelector(selectGreenCount);
  const yellowCount  = useSelector(selectYellowCount);
  const redCount     = useSelector(selectRedCount);
  const expiredCount = useSelector(selectExpiredCount);
  const urgentCount  = expiredCount + redCount + yellowCount;

  const { requestPermission } = useNotifications();

  useEffect(() => {
    if (!token) return;
    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));
  }, [token, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const badgeColor = expiredCount > 0 ? '#C0392B' : redCount > 0 ? '#E74C3C' : '#E67E22';

  const NAV_ITEMS = [
    { to: '/dashboard',  label: 'Inicio',      icon: '🏠', badge: null },
    { to: '/stock',      label: 'Stock',        icon: '📦', badge: null },
    { to: '/waste',      label: 'Mermas',       icon: '🗑️', badge: null },
    {
      to: '/expiration', label: 'Vencimientos', icon: '⏰',
      badge: urgentCount > 0 ? urgentCount : null,
      badgeColor,
    },
    { to: '/products',   label: 'Productos',    icon: '🥐', badge: null },
    { to: '/categories', label: 'Categorías',   icon: '🗂',  badge: null },
    { to: '/suppliers',  label: 'Proveedores',  icon: '🚚', badge: null },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/dashboard" className="topbar-brand">
          <img src="/logo_panstock.png" alt="PanStock" width="30" height="30" />
          <span className="topbar-brand-name">PanStock</span>
        </NavLink>

        <nav className="topbar-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}
            >
              <span className="topbar-link-icon" aria-hidden="true">{item.icon}</span>
              <span className="topbar-link-label">{item.label}</span>
              {item.badge != null && (
                <span
                  className="topbar-badge"
                  style={{ background: item.badgeColor }}
                  aria-label={`${item.badge} alertas`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          <NotificationBell onRequestPermission={requestPermission} />

          {user && (
            <div className="topbar-user-info">
              <span className="topbar-avatar" title={`${user.firstName} ${user.lastName}`}>
                {user.firstName?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="topbar-username hide-mobile">
                {user.firstName}&nbsp;
                <span className="topbar-role">{user.role === 'OWNER' ? '👑' : '👤'}</span>
              </span>
            </div>
          )}

          <button
            className="topbar-logout"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hide-mobile">Salir</span>
          </button>
        </div>
      </div>

      <style>{`
        .topbar {
          position: sticky; top: 0; z-index: 200;
          background: rgba(247,243,238,0.96);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--cream-dark);
        }
        .topbar-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 var(--space-lg);
          display: flex; align-items: center; gap: var(--space-md);
          height: 54px;
        }
        .topbar-brand { display: flex; align-items: center; gap: 7px; text-decoration: none; flex-shrink: 0; }
        .topbar-brand-name { font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--espresso); letter-spacing: -0.01em; }
        .topbar-nav { display: flex; align-items: center; gap: 1px; flex: 1; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .topbar-nav::-webkit-scrollbar { display: none; }
        .topbar-link { position: relative; display: flex; align-items: center; gap: 5px; padding: 6px 9px; border-radius: var(--radius-md); text-decoration: none; font-size: 0.83rem; font-weight: 500; color: var(--warm-gray); white-space: nowrap; flex-shrink: 0; transition: background var(--transition-fast), color var(--transition-fast); }
        .topbar-link:hover  { background: var(--cream-dark); color: var(--espresso); }
        .topbar-link.active { background: var(--espresso); color: var(--cream); font-weight: 600; }
        .topbar-link-icon  { font-size: 0.92rem; line-height: 1; }
        .topbar-link-label { line-height: 1; }
        .topbar-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; font-size: 0.62rem; font-weight: 700; color: white; line-height: 1; animation: pulse-badge 2s ease infinite; }
        @keyframes pulse-badge { 0%,100%{ opacity:1 } 50%{ opacity:0.65 } }
        .topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .topbar-user-info { display: flex; align-items: center; gap: 7px; }
        .topbar-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--amber); color: white; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 0.8rem; font-weight: 700; flex-shrink: 0; cursor: default; }
        .topbar-username { font-size: 0.8rem; color: var(--warm-gray); font-weight: 500; }
        .topbar-role { font-size: 0.85rem; }
        .topbar-logout { display: flex; align-items: center; gap: 5px; padding: 6px 11px; background: none; border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md); font-family: var(--font-body); font-size: 0.8rem; color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0; }
        .topbar-logout:hover { border-color: var(--error); color: var(--error); }
        @media (max-width: 780px) {
          .hide-mobile       { display: none !important; }
          .topbar-link-label { display: none; }
          .topbar-link       { padding: 7px 8px; }
          .topbar-inner      { gap: var(--space-sm); padding: 0 var(--space-sm); }
          .topbar-brand-name { display: none; }
        }
      `}</style>
    </header>
  );
}
