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
import {
  fetchRestockSuggestions,
  clearRestockState,
  selectRestockCount,
  selectRestockStatus,
} from '../../features/stock/restockSlice';
import {
  fetchPromotionSuggestions,
  selectSuggestionsCount,
  selectSuggestionsStatus,
} from '../../features/promotions/promotionsSlice';
import NotificationBell from '../notifications/NotificationBell';
import useNotifications from '../../features/notifications/useNotifications';

export default function AppTopbar() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const user        = useSelector(selectUser);
  const token       = useSelector(selectToken);

  // Expiration counts
  const greenCount   = useSelector(selectGreenCount);
  const yellowCount  = useSelector(selectYellowCount);
  const redCount     = useSelector(selectRedCount);
  const expiredCount = useSelector(selectExpiredCount);
  const urgentCount  = expiredCount + redCount + yellowCount;

  // Restock (OWNER only)
  const restockCount  = useSelector(selectRestockCount);
  const restockStatus = useSelector(selectRestockStatus);

  // Promotions suggestions count (OWNER only)
  const promotionSuggestionsCount  = useSelector(selectSuggestionsCount);
  const promotionSuggestionsStatus = useSelector(selectSuggestionsStatus);

  const isOwner = user?.role === 'OWNER';

  const { requestPermission } = useNotifications();

  // ── Fetch expiration semaphore on mount ──────────────────────────────────
  useEffect(() => {
    if (!token) return;
    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));
  }, [token, dispatch]);

  // ── Fetch restock suggestions on mount if OWNER ──────────────────────────
  useEffect(() => {
    if (!token || !isOwner) return;
    if (restockStatus === 'idle') {
      dispatch(fetchRestockSuggestions({ token }));
    }
  }, [token, isOwner, restockStatus, dispatch]);

  // ── Fetch promotion suggestions on mount if OWNER ────────────────────────
  useEffect(() => {
    if (!token || !isOwner) return;
    if (promotionSuggestionsStatus === 'idle') {
      dispatch(fetchPromotionSuggestions({ token }));
    }
  }, [token, isOwner, promotionSuggestionsStatus, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  // ── Badge colors ─────────────────────────────────────────────────────────
  const expirationBadgeColor  = expiredCount > 0 ? '#C0392B' : redCount > 0 ? '#E74C3C' : '#E67E22';
  const restockBadgeColor     = '#E67E22';
  const promotionsBadgeColor  = '#D68910';

  // ── Navigation items ──────────────────────────────────────────────────────
  const BASE_NAV = [
    { to: '/dashboard',   label: 'Inicio',       icon: '🏠', badge: null },
    { to: '/stock',       label: 'Stock',         icon: '📦', badge: null },
    { to: '/waste',       label: 'Mermas',        icon: '🗑️', badge: null },
    {
      to: '/expiration',  label: 'Vencimientos',  icon: '⏰',
      badge:      urgentCount > 0 ? urgentCount : null,
      badgeColor: expirationBadgeColor,
    },
    // Promociones: accesible para ambos roles
    // OWNER ve badge con cantidad de sugerencias pendientes
    // EMPLOYEE ve badge con cantidad de promociones activas (si hay)
    {
      to: '/promotions',  label: 'Promociones',   icon: '🏷️',
      badge:      isOwner && promotionSuggestionsCount > 0
                    ? promotionSuggestionsCount
                    : null,
      badgeColor: promotionsBadgeColor,
    },
    { to: '/products',    label: 'Productos',     icon: '🥐', badge: null },
    { to: '/categories',  label: 'Categorías',    icon: '🗂',  badge: null },
    { to: '/suppliers',   label: 'Proveedores',   icon: '🚚', badge: null },
  ];

  // Items exclusivos del OWNER
  const OWNER_NAV = isOwner
    ? [
        {
          to: '/restock',
          label: 'Reposición',
          icon:  '🛒',
          badge:      restockCount > 0 ? restockCount : null,
          badgeColor: restockBadgeColor,
        },
      ]
    : [];

  const NAV_ITEMS = [...BASE_NAV, ...OWNER_NAV];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Brand */}
        <NavLink to="/dashboard" className="topbar-brand">
          <img src="/logo_panstock.png" alt="PanStock" width="63" height="63" />
          <span className="topbar-brand-name">PanStock</span>
        </NavLink>

        {/* Nav */}
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

        {/* Right side */}
        <div className="topbar-right">
          <NotificationBell onRequestPermission={requestPermission} />

          {user && (
            <div className="topbar-user-info">
              <span className="topbar-avatar" title={`${user.firstName} ${user.lastName}`}>
                {user.firstName?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="topbar-username hide-mobile">
                {user.firstName}&nbsp;
              
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
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        .topbar-inner {
         
          margin: 0 auto;
          padding: 0 var(--space-lg);
          display: flex; align-items: center; gap: var(--space-md);
          height: 84px;
        }
        .topbar-brand {
          display: flex; align-items: center; gap: 7px;
          text-decoration: none; flex-shrink: 0;
        }
        .topbar-brand-name {
          font-family: var(--font-display); font-size: 1.85rem;
          font-weight: 700; color: var(--espresso); letter-spacing: -0.01em;
        }
        .topbar-nav {
          display: flex; align-items: center; gap: 1px;
          flex: 1; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none;
        }
        .topbar-nav::-webkit-scrollbar { display: none; }
        .topbar-link {
          position: relative; display: flex; align-items: center; gap: 5px;
          padding: 6px 9px; border-radius: var(--radius-md);
          text-decoration: none; font-size: 1.2rem; font-weight: 500;
          color: var(--esspresso-mid); white-space: nowrap; flex-shrink: 0;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .topbar-link:hover  { background: var(--cream-dark); color: var(--espresso); }
        .topbar-link.active { background: var(--espresso); color: var(--cream); font-weight: 600; }
        .topbar-link-icon  { font-size: 1.3rem; line-height: 1; }
        .topbar-link-label { line-height: 1; }
        .topbar-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px;
          font-size: 0.62rem; font-weight: 700; color: white; line-height: 1;
          animation: pulse-badge 2s ease infinite;
        }
        @keyframes pulse-badge { 0%,100%{ opacity:1 } 50%{ opacity:0.65 } }

        .topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .topbar-user-info { display: flex; align-items: center; gap: 7px; }
        .topbar-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--amber); color: white;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 0.8rem; font-weight: 700;
          flex-shrink: 0; cursor: default;
        }
        .topbar-username { font-size: 1.2rem; color: var(--espresso-mid); font-weight: 500; }
        .topbar-logout {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 11px; background: none; font-weight: 500;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-display); font-size: 1.15rem; color: var(--espresso-soft);
          cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0;
        }
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