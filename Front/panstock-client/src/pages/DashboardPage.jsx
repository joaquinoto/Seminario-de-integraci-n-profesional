// pages/DashboardPage.jsx
// Placeholder dashboard — shows authenticated user info
// Will be fully built in the next delivery

import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser } from '../features/auth/authSlice';
import { logout } from '../features/auth/authSlice';

const roleLabels = {
  OWNER:    { label: 'Dueño / Encargado', color: '#A06C28', bg: 'rgba(200,137,58,0.12)', icon: '👑' },
  EMPLOYEE: { label: 'Empleado/a',        color: '#2E7D32', bg: 'rgba(46,125,50,0.10)',  icon: '👤' },
};

export default function DashboardPage() {
  const user     = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const role = roleLabels[user?.role] || roleLabels.EMPLOYEE;

  return (
    <div className="dash-page">
      {/* Top bar */}
      <header className="dash-topbar">
        <div className="dash-brand">
          <div>
            <img src="/logo_panstock.png" alt="Logo" width="70" height="70" className="me-2"/>
          </div>
          <span>PanStock</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Salir
        </button>
      </header>

      {/* Welcome */}
      <main className="dash-main">
        <div className="welcome-card">
          <div className="welcome-avatar">
            {user?.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="welcome-info">
            <h1 className="welcome-title">
              ¡Hola, {user?.firstName || user?.username}!
            </h1>
            <p className="welcome-sub">Bienvenido/a a tu panel de gestión</p>
            <span
              className="role-badge"
              style={{ color: role.color, background: role.bg }}
            >
              {role.icon} {role.label}
            </span>
          </div>
        </div>

        {/* User info card */}
        <div className="info-card">
          <h2 className="info-title">Información de cuenta</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Usuario</span>
              <span className="info-value">@{user?.username}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Nombre completo</span>
              <span className="info-value">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Rol</span>
              <span className="info-value">{role.icon} {role.label}</span>
            </div>
          </div>
        </div>

        {/* Coming soon modules */}
        <div className="modules-grid">
          {[
            { icon: '📦', title: 'Stock',       desc: 'Gestión de lotes e inventario' },
            { icon: '⚠️', title: 'Alertas',     desc: 'Vencimientos y stock bajo' },
            { icon: '📊', title: 'Reportes',    desc: 'Mermas y pérdidas económicas' },
            { icon: '🏷️', title: 'Promociones', desc: 'Descuentos por vencimiento' },
            { icon: '🥐', title: 'Productos',   desc: 'Catálogo de franquicia y externos' },
            { icon: '🚚', title: 'Proveedores', desc: 'Franquicia y mayoristas' },
          ].map((m) => (
            <div key={m.title} className="module-card">
              <span className="module-icon">{m.icon}</span>
              <div>
                <p className="module-title">{m.title}</p>
                <p className="module-desc">{m.desc}</p>
              </div>
              <span className="module-badge">Próximamente</span>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        .dash-page {
          min-height: 100vh;
          background: var(--cream);
          animation: fadeIn 0.4s ease;
        }

        .dash-topbar {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px var(--space-lg);
          background: rgba(247, 243, 238, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--cream-dark);
        }

        .dash-brand {
          display: flex; align-items: center; gap: 8px;
          font-family: var(--font-display);
          font-size: 1.2rem; font-weight: 700;
          color: var(--espresso);
        }

        .logout-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md);
          padding: 8px 14px;
          font-family: var(--font-body); font-size: 0.85rem;
          color: var(--warm-gray); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .logout-btn:hover {
          border-color: var(--error); color: var(--error);
        }

        .dash-main {
          max-width: 640px;
          margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
          display: flex; flex-direction: column; gap: var(--space-xl);
        }

        .welcome-card {
          display: flex; align-items: center; gap: var(--space-lg);
          padding: var(--space-xl);
          background: var(--espresso);
          border-radius: var(--radius-xl);
          color: var(--cream);
          animation: slideUp 0.4s ease 0.1s both;
        }

        .welcome-avatar {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--amber);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 1.6rem; font-weight: 700;
          color: white; flex-shrink: 0;
        }

        .welcome-title {
          font-family: var(--font-display);
          font-size: 1.4rem; font-weight: 700;
          margin-bottom: 4px;
        }

        .welcome-sub { font-size: 0.85rem; opacity: 0.7; margin-bottom: 10px; }

        .role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.78rem; font-weight: 600;
        }

        .info-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          border: 1px solid var(--cream-dark);
          box-shadow: var(--shadow-sm);
          animation: slideUp 0.4s ease 0.2s both;
        }

        .info-title {
          font-family: var(--font-display);
          font-size: 1.1rem; font-weight: 700;
          color: var(--espresso);
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--cream-dark);
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }

        .info-item { display: flex; flex-direction: column; gap: 4px; }

        .info-label {
          font-size: 0.72rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--warm-gray-light);
        }

        .info-value {
          font-size: 0.9rem; color: var(--espresso); font-weight: 500;
        }

        .modules-grid {
          display: flex; flex-direction: column; gap: var(--space-sm);
          animation: slideUp 0.4s ease 0.3s both;
        }

        .module-card {
          display: flex; align-items: center; gap: var(--space-md);
          padding: var(--space-lg);
          background: white;
          border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          opacity: 0.75;
          position: relative;
        }

        .module-icon { font-size: 1.4rem; flex-shrink: 0; }

        .module-title {
          font-weight: 600; font-size: 0.95rem;
          color: var(--espresso); margin-bottom: 2px;
        }

        .module-desc { font-size: 0.8rem; color: var(--warm-gray); }

        .module-badge {
          position: absolute; top: 10px; right: 12px;
          font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--warm-gray-light);
          background: var(--cream-dark);
          padding: 3px 8px; border-radius: 10px;
        }

        @media (max-width: 480px) {
          .info-grid { grid-template-columns: 1fr; }
          .welcome-card { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
}
