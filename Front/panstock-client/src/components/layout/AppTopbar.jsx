import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, NavLink } from 'react-router-dom';
import { logout, selectUser } from '../../features/auth/authSlice';

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',  icon: '🏠' },
  { to: '/products',    label: 'Productos',   icon: '🥐' },
  { to: '/categories',  label: 'Categorías',  icon: '🗂'  },
];

export default function AppTopbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectUser);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Brand */}
        <NavLink to="/dashboard" className="topbar-brand">
          <img src="/logo_panstock.png" alt="Logo" width="32" height="32" />
          <span className="topbar-brand-name">PanStock</span>
        </NavLink>

        {/* Nav */}
        <nav className="topbar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}
            >
              <span className="topbar-link-icon">{item.icon}</span>
              <span className="topbar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="topbar-user">
          {user && (
            <div className="topbar-user-info">
              <span className="topbar-avatar">
                {user.firstName?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="topbar-username hide-mobile">
                {user.firstName} · <span className="topbar-role">{user.role === 'OWNER' ? '👑' : '👤'}</span>
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
          background: rgba(247,243,238,0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--cream-dark);
        }
        .topbar-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 0 var(--space-lg);
          display: flex; align-items: center; gap: var(--space-lg);
          height: 56px;
        }
        .topbar-brand {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0;
        }
        .topbar-brand-name {
          font-family: var(--font-display);
          font-size: 1.1rem; font-weight: 700;
          color: var(--espresso); letter-spacing: -0.01em;
        }
        .topbar-nav {
          display: flex; align-items: center; gap: 2px;
          flex: 1;
        }
        .topbar-link {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 0.85rem; font-weight: 500;
          color: var(--warm-gray);
          transition: background var(--transition-fast), color var(--transition-fast);
          white-space: nowrap;
        }
        .topbar-link:hover { background: var(--cream-dark); color: var(--espresso); }
        .topbar-link.active {
          background: var(--espresso); color: var(--cream);
          font-weight: 600;
        }
        .topbar-link-icon { font-size: 1rem; }

        .topbar-user {
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .topbar-user-info {
          display: flex; align-items: center; gap: 8px;
        }
        .topbar-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--amber); color: white;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 0.85rem; font-weight: 700; flex-shrink: 0;
        }
        .topbar-username {
          font-size: 0.82rem; color: var(--warm-gray); font-weight: 500;
        }
        .topbar-role { font-style: normal; }
        .topbar-logout {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 12px;
          background: none; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.82rem;
          color: var(--warm-gray); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .topbar-logout:hover { border-color: var(--error); color: var(--error); }

        @media (max-width: 640px) {
          .hide-mobile { display: none; }
          .topbar-link-label { display: none; }
          .topbar-link { padding: 8px; }
          .topbar-inner { gap: var(--space-sm); padding: 0 var(--space-md); }
        }
      `}</style>
    </header>
  );
}
