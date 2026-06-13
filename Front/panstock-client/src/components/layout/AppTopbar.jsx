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

  const greenCount   = useSelector(selectGreenCount);
  const yellowCount  = useSelector(selectYellowCount);
  const redCount     = useSelector(selectRedCount);
  const expiredCount = useSelector(selectExpiredCount);
  const urgentCount  = expiredCount + redCount + yellowCount;

  const restockCount  = useSelector(selectRestockCount);
  const restockStatus = useSelector(selectRestockStatus);

  const promotionSuggestionsCount  = useSelector(selectSuggestionsCount);
  const promotionSuggestionsStatus = useSelector(selectSuggestionsStatus);

  const isOwner = user?.role === 'OWNER';

  const { requestPermission } = useNotifications();

  useEffect(() => {
    if (!token) return;
    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));
  }, [token, dispatch]);

  useEffect(() => {
    if (!token || !isOwner) return;
    if (restockStatus === 'idle') {
      dispatch(fetchRestockSuggestions({ token }));
    }
  }, [token, isOwner, restockStatus, dispatch]);

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

  const expirationBadgeColor  = expiredCount > 0 ? '#C0392B' : redCount > 0 ? '#E74C3C' : '#E67E22';
  const restockBadgeColor     = '#E67E22';
  const promotionsBadgeColor  = '#D68910';

  const BASE_NAV = [
    { to: '/dashboard',   label: 'Inicio',       icon: '🏠', badge: null },
    { to: '/stock',       label: 'Stock',         icon: '📦', badge: null },
    { to: '/waste',       label: 'Mermas',        icon: '🗑️', badge: null },
    {
      to: '/expiration',  label: 'Vencimientos',  icon: '⏰',
      badge:      urgentCount > 0 ? urgentCount : null,
      badgeColor: expirationBadgeColor,
    },
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

  /* Inicial del usuario para el avatar */
  const avatarLetter = user?.firstName?.[0]?.toUpperCase() || '?';

  return (
    <header className="topbar">
      <div className="topbar-inner">

        {/* ── Brand ── */}
        <NavLink to="/dashboard" className="topbar-brand" aria-label="PanStock — Inicio">
          <img src="/logo_panstock.png" alt="PanStock" width="48" height="48" />
          <span className="topbar-brand-name">PanStock</span>
        </NavLink>

        {/* ── Nav (scroll horizontal en mobile) ── */}
        <nav className="topbar-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}
              title={item.label}
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

        {/* ── Right side ── */}
        <div className="topbar-right">
          <NotificationBell onRequestPermission={requestPermission} />

          {/* Avatar con inicial */}
          {user && (
            <div
              className="topbar-avatar"
              title={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
              aria-label="Usuario actual"
            >
              {avatarLetter}
            </div>
          )}

          <button
            className="topbar-logout"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="topbar-logout-label">Salir</span>
          </button>
        </div>
      </div>

      <style>{`
        /* ══════════════════════════════════════
           TOPBAR — mobile first
           ══════════════════════════════════════ */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 200;
          background: rgba(247,243,238,0.97);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--cream-dark);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }

        .topbar-inner {
          margin: 0 auto;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 60px;        /* más compacto en mobile */
        }

        /* ── Brand ── */
        .topbar-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .topbar-brand img {
          width: 36px;
          height: 36px;
          object-fit: contain;
        }
        .topbar-brand-name {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--espresso);
          letter-spacing: -0.01em;
          /* Ocultar en mobile muy estrecho */
          display: none;
        }

        /* ── Nav ── */
        .topbar-nav {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          /* Padding para que el primer/último item no quede pegado al borde */
          padding: 0 2px;
        }
        .topbar-nav::-webkit-scrollbar { display: none; }

        .topbar-link {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 8px;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 0.6rem;
          font-weight: 600;
          color: var(--warm-gray);
          white-space: nowrap;
          flex-shrink: 0;
          transition: background var(--transition-fast), color var(--transition-fast);
          min-width: 44px;      /* área táctil mínima */
          text-align: center;
        }
        .topbar-link:hover  { background: var(--cream-dark); color: var(--espresso); }
        .topbar-link.active {
          background: var(--espresso);
          color: var(--cream);
          font-weight: 700;
        }

        .topbar-link-icon  {
          font-size: 1.35rem;
          line-height: 1;
          display: block;
        }
        .topbar-link-label {
          line-height: 1;
          font-size: 0.58rem;
          letter-spacing: 0.01em;
        }

        .topbar-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          height: 16px;
          padding: 0 3px;
          border-radius: 8px;
          font-size: 0.55rem;
          font-weight: 800;
          color: white;
          line-height: 1;
          animation: pulse-badge 2s ease infinite;
          pointer-events: none;
        }

        /* ── Right side ── */
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .topbar-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--amber);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 0.82rem;
          font-weight: 700;
          flex-shrink: 0;
          cursor: default;
          user-select: none;
        }

        .topbar-logout {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 8px;
          background: none;
          border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--warm-gray);
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }
        .topbar-logout:hover { border-color: var(--error); color: var(--error); }
        .topbar-logout-label { display: none; }

        /* ══════════════════════════════════════
           TABLET (≥ 600px)
           ══════════════════════════════════════ */
        @media (min-width: 600px) {
          .topbar-inner { padding: 0 16px; height: 68px; gap: 10px; }

          .topbar-brand img   { width: 42px; height: 42px; }
          .topbar-brand-name  { display: block; font-size: 1.45rem; }

          .topbar-link {
            flex-direction: row;
            gap: 5px;
            padding: 7px 10px;
            font-size: 0.78rem;
            min-width: unset;
          }
          .topbar-link-icon  { font-size: 1.2rem; }
          .topbar-link-label { font-size: 0.78rem; }

          /* Badge repositioned for horizontal layout */
          .topbar-badge {
            position: static;
            min-width: 17px;
            height: 17px;
            padding: 0 4px;
            font-size: 0.62rem;
          }

          .topbar-avatar { width: 32px; height: 32px; font-size: 0.88rem; }
          .topbar-logout-label { display: inline; }
          .topbar-logout { padding: 6px 12px; font-size: 0.88rem; gap: 5px; }
        }

        /* ══════════════════════════════════════
           DESKTOP (≥ 900px)
           ══════════════════════════════════════ */
        @media (min-width: 900px) {
          .topbar-inner { padding: 0 var(--space-lg); height: 76px; gap: 12px; }

          .topbar-brand img   { width: 52px; height: 52px; }
          .topbar-brand-name  { font-size: 1.75rem; }

          .topbar-link {
            gap: 6px;
            padding: 7px 10px;
            font-size: 0.9rem;
            border-radius: var(--radius-md);
          }
          .topbar-link-icon  { font-size: 1.25rem; }
          .topbar-link-label { font-size: 0.9rem; }

          .topbar-avatar { width: 34px; height: 34px; font-size: 0.92rem; }
          .topbar-logout { font-size: 0.92rem; }
        }
      `}</style>
    </header>
  );
}