import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser } from '../features/auth/authSlice';
import AppTopbar from '../components/layout/AppTopbar';

const roleLabels = {
  OWNER:    { label: 'Dueño / Encargado', color: '#A06C28', bg: 'rgba(200,137,58,0.12)', icon: '👑' },
  EMPLOYEE: { label: 'Empleado/a',        color: '#2E7D32', bg: 'rgba(46,125,50,0.10)',  icon: '👤' },
};

// Modules: those with `to` are navigable, others are "coming soon"
const MODULES = [
  { icon: '🥐', title: 'Productos',    desc: 'Catálogo de franquicia y externos',    to: '/products'   },
  { icon: '🗂',  title: 'Categorías',   desc: 'Grupos y clasificaciones de productos', to: '/categories' },
  { icon: '🚚', title: 'Proveedores',  desc: 'Franquicia, mayoristas y externos',    to: '/suppliers'  },
  { icon: '📦', title: 'Stock',        desc: 'Gestión de lotes e inventario',        to: null          },
  { icon: '⚠️', title: 'Alertas',      desc: 'Vencimientos y stock bajo',            to: null          },
  { icon: '📊', title: 'Reportes',     desc: 'Mermas y pérdidas económicas',         to: null          },
  { icon: '🏷️', title: 'Promociones',  desc: 'Descuentos por vencimiento',           to: null          },
];

export default function DashboardPage() {
  const user     = useSelector(selectUser);
  const navigate = useNavigate();

  const role = roleLabels[user?.role] || roleLabels.EMPLOYEE;

  return (
    <div className="dash-page">
      <AppTopbar />

      <main className="dash-main">
        {/* Welcome card */}
        <div className="welcome-card">
          <div className="welcome-avatar">
            {user?.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="welcome-info">
            <h1 className="welcome-title">
              ¡Hola, {user?.firstName || user?.username}!
            </h1>
            <p className="welcome-sub">Bienvenido/a a tu panel de gestión</p>
            <span className="role-badge" style={{ color: role.color, background: role.bg }}>
              {role.icon} {role.label}
            </span>
          </div>
        </div>

        {/* Account info */}
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

        {/* Module cards */}
        <div>
          <h2 className="modules-heading">Módulos</h2>
          <div className="modules-grid">
            {MODULES.map((m) => {
              const isReady = Boolean(m.to);
              return (
                <button
                  key={m.title}
                  className={`module-card ${isReady ? 'ready' : 'soon'}`}
                  onClick={() => isReady && navigate(m.to)}
                  disabled={!isReady}
                  title={isReady ? `Ir a ${m.title}` : 'Próximamente'}
                >
                  <span className="module-icon">{m.icon}</span>
                  <div className="module-text">
                    <p className="module-title">{m.title}</p>
                    <p className="module-desc">{m.desc}</p>
                  </div>
                  {isReady ? (
                    <span className="module-arrow">→</span>
                  ) : (
                    <span className="module-badge">Próximamente</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <style>{`
        .dash-page {
          min-height: 100vh;
          background: var(--cream);
          animation: fadeIn 0.4s ease;
        }

        .dash-main {
          max-width: 700px;
          margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
          display: flex; flex-direction: column; gap: var(--space-xl);
        }

        /* ── Welcome ── */
        .welcome-card {
          display: flex; align-items: center; gap: var(--space-lg);
          padding: var(--space-xl);
          background: var(--espresso);
          border-radius: var(--radius-xl);
          color: var(--cream);
          animation: slideUp 0.4s ease 0.1s both;
        }
        .welcome-avatar {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--amber);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 1.6rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .welcome-title {
          font-family: var(--font-display);
          font-size: 1.4rem; font-weight: 700; margin-bottom: 4px;
        }
        .welcome-sub { font-size: 0.85rem; opacity: 0.7; margin-bottom: 10px; }
        .role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 20px;
          font-size: 0.78rem; font-weight: 600;
        }

        /* ── Info ── */
        .info-card {
          background: white; border-radius: var(--radius-lg);
          padding: var(--space-xl);
          border: 1px solid var(--cream-dark); box-shadow: var(--shadow-sm);
          animation: slideUp 0.4s ease 0.2s both;
        }
        .info-title {
          font-family: var(--font-display);
          font-size: 1.1rem; font-weight: 700; color: var(--espresso);
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md); border-bottom: 1px solid var(--cream-dark);
        }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
        .info-item { display: flex; flex-direction: column; gap: 4px; }
        .info-label {
          font-size: 0.72rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--warm-gray-light);
        }
        .info-value { font-size: 0.9rem; color: var(--espresso); font-weight: 500; }

        /* ── Modules ── */
        .modules-heading {
          font-family: var(--font-display);
          font-size: 1.1rem; font-weight: 700; color: var(--espresso);
          margin-bottom: var(--space-md);
        }
        .modules-grid {
          display: flex; flex-direction: column; gap: 8px;
          animation: slideUp 0.4s ease 0.3s both;
        }

        .module-card {
          width: 100%;
          display: flex; align-items: center; gap: var(--space-md);
          padding: var(--space-lg);
          background: white;
          border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          text-align: left; cursor: pointer;
          transition: box-shadow var(--transition-fast),
                      border-color var(--transition-fast),
                      transform var(--transition-fast),
                      background var(--transition-fast);
          font-family: var(--font-body);
          position: relative;
        }

        /* Navigable modules */
        .module-card.ready {
          opacity: 1;
        }
        .module-card.ready:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--amber);
          transform: translateY(-2px);
          background: rgba(200,137,58,0.03);
        }
        .module-card.ready:active {
          transform: translateY(0);
          box-shadow: var(--shadow-sm);
        }

        /* Coming soon modules */
        .module-card.soon {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .module-icon { font-size: 1.5rem; flex-shrink: 0; }
        .module-text { flex: 1; min-width: 0; }
        .module-title {
          font-weight: 600; font-size: 0.95rem;
          color: var(--espresso); margin-bottom: 2px;
        }
        .module-desc { font-size: 0.8rem; color: var(--warm-gray); }

        .module-arrow {
          font-size: 1.1rem; color: var(--amber);
          flex-shrink: 0; font-weight: 700;
          transition: transform var(--transition-fast);
        }
        .module-card.ready:hover .module-arrow { transform: translateX(4px); }

        .module-badge {
          font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--warm-gray-light);
          background: var(--cream-dark);
          padding: 3px 8px; border-radius: 10px;
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .info-grid { grid-template-columns: 1fr; }
          .welcome-card { flex-direction: column; text-align: center; }
          .dash-main { padding: var(--space-lg) var(--space-md); }
        }
      `}</style>
    </div>
  );
}