import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, NavLink } from 'react-router-dom';
import { logout, selectUser } from '../../features/auth/authSlice';
import { selectSemaphoreCounts } from '../../features/stock/expirationSlice';

const isOwner = (user) => user?.role === 'OWNER';

export default function AppTopbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectUser);
  const counts   = useSelector(selectSemaphoreCounts);

  const owner = isOwner(user);
  const urgentCount = counts.expired + counts.red + counts.yellow;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  // Ítems disponibles para AMBOS roles
  const COMMON_ITEMS = [
    { to: '/dashboard',  label: 'Inicio',       icon: '🏠', badge: null },
    { to: '/stock',      label: 'Stock',         icon: '📦', badge: null },
    {
      to: '/expiration',
      label: 'Vencimientos',
      icon: '⏰',
      badge: urgentCount > 0 ? urgentCount : null,
      badgeColor: counts.expired > 0 ? '#C0392B' : counts.red > 0 ? '#E74C3C' : '#E67E22',
    },
  ];

  // Ítems solo para OWNER
  const OWNER_ITEMS = [
    {
      to: '/waste',
      label: 'Mermas',
      icon: '🗑️',
      badge: null,
      ownerBadge: true, // muestra indicador "solo dueño"
    },
    { to: '/products',   label: 'Productos',    icon: '🥐', badge: null },
    { to: '/categories', label: 'Categorías',   icon: '🗂',  badge: null },
    { to: '/suppliers',  label: 'Proveedores',  icon: '🚚', badge: null },
  ];

  // Ítems para EMPLOYEE (acceso de lectura a mermas, sin catálogo)
  const EMPLOYEE_ITEMS = [
    { to: '/waste',    label: 'Mermas',    icon: '🗑️', badge: null, readonly: true },
    { to: '/products', label: 'Productos', icon: '🥐', badge: null },
  ];

  const NAV_ITEMS = [
    ...COMMON_ITEMS,
    ...(owner ? OWNER_ITEMS : EMPLOYEE_ITEMS),
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/dashboard" className="topbar-brand">
          <img src="/logo_panstock.png" alt="Logo" width="32" height="32" />
          <span className="topbar-brand-name">PanStock</span>
        </NavLink>

        <nav className="topbar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}
              title={item.readonly ? 'Solo lectura' : item.label}
            >
              <span className="topbar-link-icon">{item.icon}</span>
              <span className="topbar-link-label">{item.label}</span>
              {item.badge != null && (
                <span className="topbar-badge" style={{ background: item.badgeColor }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {item.ownerBadge && owner && (
                <span className="topbar-owner-dot" title="Solo dueño/encargado" />
              )}
              {item.readonly && (
                <span className="topbar-readonly-dot" title="Solo lectura" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-user">
          {user && (
            <div className="topbar-user-info">
              <span
                className={`topbar-avatar ${owner ? 'avatar-owner' : 'avatar-employee'}`}
                title={owner ? 'Dueño / Encargado' : 'Empleado/a'}
              >
                {user.firstName?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="topbar-username hide-mobile">
                {user.firstName}&nbsp;·&nbsp;
                <span className="topbar-role">{owner ? '👑' : '👤'}</span>
              </span>
            </div>
          )}
          <button className="topbar-logout" onClick={handleLogout} title="Cerrar sesión">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
          background: rgba(247,243,238,0.95);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--cream-dark);
        }
        .topbar-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 var(--space-lg);
          display: flex; align-items: center; gap: var(--space-md);
          height: 56px;
        }
        .topbar-brand {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0;
        }
        .topbar-brand-name {
          font-family: var(--font-display); font-size: 1.1rem; font-weight: 700;
          color: var(--espresso); letter-spacing: -0.01em;
        }
        .topbar-nav {
          display: flex; align-items: center; gap: 2px; flex: 1;
          overflow-x: auto; -ms-overflow-style: none; scrollbar-width: none;
        }
        .topbar-nav::-webkit-scrollbar { display: none; }
        .topbar-link {
          position: relative; display: flex; align-items: center; gap: 5px;
          padding: 6px 10px; border-radius: var(--radius-md);
          text-decoration: none; font-size: 0.84rem; font-weight: 500;
          color: var(--warm-gray);
          transition: background var(--transition-fast), color var(--transition-fast);
          white-space: nowrap; flex-shrink: 0;
        }
        .topbar-link:hover  { background: var(--cream-dark); color: var(--espresso); }
        .topbar-link.active { background: var(--espresso); color: var(--cream); font-weight: 600; }
        .topbar-link-icon   { font-size: 0.95rem; }

        .topbar-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
          font-size: 0.65rem; font-weight: 700; color: white; line-height: 1;
          animation: pulse-badge 2s ease infinite;
        }
        @keyframes pulse-badge { 0%,100%{opacity:1} 50%{opacity:0.7} }

        /* Dot de "solo owner" (rojo pequeño en la esquina) */
        .topbar-owner-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #C0392B; flex-shrink: 0;
          animation: pulse-badge 3s ease infinite;
        }
        /* Dot de "solo lectura" (gris) */
        .topbar-readonly-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--warm-gray-light); flex-shrink: 0;
        }

        .topbar-user { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .topbar-user-info { display: flex; align-items: center; gap: 8px; }
        .topbar-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 0.85rem; font-weight: 700;
          flex-shrink: 0; color: white;
        }
        .avatar-owner    { background: var(--amber); }
        .avatar-employee { background: #2E7D32; }

        .topbar-username { font-size: 0.82rem; color: var(--warm-gray); font-weight: 500; }
        .topbar-logout {
          display: flex; align-items: center; gap: 5px; padding: 7px 12px;
          background: none; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.82rem; color: var(--warm-gray); cursor: pointer;
          transition: all var(--transition-fast); flex-shrink: 0;
        }
        .topbar-logout:hover { border-color: var(--error); color: var(--error); }

        @media (max-width: 780px) {
          .hide-mobile { display: none; }
          .topbar-link-label { display: none; }
          .topbar-link { padding: 8px; }
          .topbar-inner { gap: var(--space-sm); padding: 0 var(--space-sm); }
        }
      `}</style>
    </header>
  );
}