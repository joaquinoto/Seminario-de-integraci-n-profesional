import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser, selectToken } from '../features/auth/authSlice';
import {
  fetchSemaphore,
  selectSemaphoreCounts,
  selectSemaphoreStatus,
  clearExpirationState,     
} from '../features/stock/expirationSlice';
import {
  fetchRestockSuggestions,
  selectRestockCount,
  selectRestockStatus,
  clearRestockState,
} from '../features/stock/restockSlice';
import AppTopbar from '../components/layout/AppTopbar';

const roleLabels = {
  OWNER:    { label: 'Dueño / Encargado', color: '#A06C28', bg: 'rgba(200,137,58,0.12)', icon: '👑' },
  EMPLOYEE: { label: 'Empleado/a',        color: '#2E7D32', bg: 'rgba(46,125,50,0.10)',  icon: '👤' },
};

const MAIN_MODULES = [
  { icon: '📦', title: 'Stock',        desc: 'Inventario, lotes e ingresos',           to: '/stock'      },
  { icon: '🗑️', title: 'Mermas',       desc: 'Registro de descartes y desperdicios',   to: '/waste'      },
  { icon: '⏰', title: 'Vencimientos', desc: 'Semáforo de fechas de vencimiento',      to: '/expiration' },
];

const CATALOG_MODULES = [
  { icon: '🥐', title: 'Productos',   desc: 'Catálogo de franquicia y externos',     to: '/products'   },
  { icon: '🗂',  title: 'Categorías',  desc: 'Grupos y clasificaciones',               to: '/categories' },
  { icon: '🚚', title: 'Proveedores', desc: 'Franquicia, mayoristas y externos',      to: '/suppliers'  },
];

// OWNER-only modules
const OWNER_MODULES = [
  { icon: '🛒', title: 'Reposición',  desc: 'Productos con stock por debajo del mínimo', to: '/restock' },
];

const COMING_MODULES = [
  { icon: '📊', title: 'Reportes',    desc: 'Mermas y pérdidas económicas'   },
  { icon: '🏷️', title: 'Promociones', desc: 'Descuentos por vencimiento'     },
];

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectUser);
  const token    = useSelector(selectToken);
  const counts   = useSelector(selectSemaphoreCounts);
  const semStatus= useSelector(selectSemaphoreStatus);
  const restockCount  = useSelector(selectRestockCount);
  const restockStatus = useSelector(selectRestockStatus);
 
  const isOwner = user?.role === 'OWNER';
  const role = roleLabels[user?.role] || roleLabels.EMPLOYEE;

  useEffect(() => {
    if (!token) return;
    // ── Se limpia el estado viejo antes de pedir datos frescos ────────
    // Evita que Redux Persist sirva conteos desactualizados del localStorage
    // mientras llega la respuesta del servidor.
    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));
    // Pre-fetch restock count so the badge in the dashboard card is ready
    if (isOwner && restockStatus === 'idle') {
      dispatch(clearRestockState());
      dispatch(fetchRestockSuggestions({ token }));
    }
  }, [token, dispatch, isOwner]);

  const urgentCount = counts.expired + counts.red + counts.yellow;
  const semColor = counts.expired > 0 ? '#C0392B'
                 : counts.red     > 0 ? '#E74C3C'
                 : counts.yellow  > 0 ? '#E67E22'
                 : '#27AE60';

  return (
    <div className="dash-page">
      <AppTopbar />

      <main className="dash-main">

        {/* ── Welcome ── */}
        <div className="welcome-card">
          <div className="welcome-avatar">
            {user?.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="welcome-info">
            <h1 className="welcome-title">¡Hola, {user?.firstName || user?.username}!</h1>
            <p className="welcome-sub">Bienvenido/a a tu panel de gestión</p>
            <span className="role-badge" style={{ color: role.color, background: role.bg }}>
              {role.icon} {role.label}
            </span>
          </div>
        </div>

        {/* ── Semáforo ── */}
        <button
          className="semaphore-card"
          onClick={() => navigate('/expiration')}
          style={{ '--sem-color': semColor }}
        >
          <div className="sem-left">
            <div className="sem-icon-wrap" style={{ background: semColor }}>⏰</div>
            <div>
              <p className="sem-title">Estado de vencimientos</p>
              <p className="sem-sub">
                {semStatus === 'loading'
                  ? 'Actualizando...'
                  : urgentCount > 0
                    ? `${urgentCount} lote${urgentCount !== 1 ? 's' : ''} requieren atención`
                    : 'Todo en orden'}
              </p>
            </div>
          </div>

          <div className="sem-dots">
            {[
              { key: 'expired', label: 'Venc.',   val: counts.expired, color: '#C0392B' },
              { key: 'red',     label: 'Hoy',     val: counts.red,     color: '#E74C3C' },
              { key: 'yellow',  label: 'Próx.',   val: counts.yellow,  color: '#E67E22' },
              { key: 'green',   label: 'OK',      val: counts.green,   color: '#27AE60' },
            ].map(({ key, label, val, color }) => (
              <div key={key} className="sem-dot-item">
                <span className="sem-dot-circle" style={{ background: color }} />
                <span className="sem-dot-count" style={{ color }}>{val}</span>
                <span className="sem-dot-label">{label}</span>
              </div>
            ))}
          </div>

          <span className="sem-arrow">→</span>
        </button>
        
        {/* ── Restock card — OWNER only ── */}
        {isOwner && (
          <button
            className="restock-card"
            onClick={() => navigate('/restock')}
            style={{
              '--rst-color': restockCount > 0 ? '#E67E22' : '#27AE60',
            }}
          >
            <div className="rst-left">
              <div className="rst-icon-wrap" style={{ background: restockCount > 0 ? '#E67E22' : '#27AE60' }}>
                🛒
              </div>
              <div>
                <p className="rst-title">Reposición de stock</p>
                <p className="rst-sub">
                  {restockStatus === 'loading'
                    ? 'Verificando inventario...'
                    : restockCount > 0
                      ? `${restockCount} producto${restockCount !== 1 ? 's' : ''} por debajo del mínimo`
                      : 'Todo el stock sobre el mínimo'}
                </p>
              </div>
            </div>
 
            {restockCount > 0 && (
              <div className="rst-badge">
                <span className="rst-badge-count">{restockCount}</span>
                <span className="rst-badge-label">a reponer</span>
              </div>
            )}
 
            <span className="rst-arrow">→</span>
          </button>
        )}

        {/* ── Operaciones principales ── */}
        <div>
          <h2 className="section-heading">Operaciones</h2>
          <div className="modules-grid">
            {MAIN_MODULES.map((m) => (
              <button key={m.title} className="module-card ready" onClick={() => navigate(m.to)}>
                <span className="module-icon">{m.icon}</span>
                <div className="module-text">
                  <p className="module-title">{m.title}</p>
                  <p className="module-desc">{m.desc}</p>
                </div>
                <span className="module-arrow">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Gestión OWNER — solo se muestra al dueño ── */}
        {isOwner && (
          <div>
            <h2 className="section-heading">Gestión de inventario</h2>
            <div className="modules-grid">
              {OWNER_MODULES.map((m) => (
                <button key={m.title} className="module-card ready owner-module" onClick={() => navigate(m.to)}>
                  <span className="module-icon">{m.icon}</span>
                  <div className="module-text">
                    <p className="module-title">{m.title}</p>
                    <p className="module-desc">{m.desc}</p>
                  </div>
                  {restockCount > 0 && m.to === '/restock' && (
                    <span className="module-count-badge">{restockCount}</span>
                  )}
                  <span className="module-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Catálogo ── */}
        <div>
          <h2 className="section-heading">Catálogo</h2>
          <div className="modules-grid">
            {CATALOG_MODULES.map((m) => (
              <button key={m.title} className="module-card ready" onClick={() => navigate(m.to)}>
                <span className="module-icon">{m.icon}</span>
                <div className="module-text">
                  <p className="module-title">{m.title}</p>
                  <p className="module-desc">{m.desc}</p>
                </div>
                <span className="module-arrow">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Info de cuenta ── */}
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

        {/* ── Próximamente ── */}
        <div>
          <h2 className="section-heading">Próximamente</h2>
          <div className="modules-grid">
            {COMING_MODULES.map((m) => (
              <div key={m.title} className="module-card soon">
                <span className="module-icon">{m.icon}</span>
                <div className="module-text">
                  <p className="module-title">{m.title}</p>
                  <p className="module-desc">{m.desc}</p>
                </div>
                <span className="module-badge">Próximamente</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      <style>{`
       .dash-page { min-height: 100vh; background: var(--cream); animation: fadeIn 0.4s ease; }
        .dash-main {
          max-width: 760px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
          display: flex; flex-direction: column; gap: var(--space-xl);
        }
        .welcome-card {
          display: flex; align-items: center; gap: var(--space-lg);
          padding: var(--space-xl); background: var(--espresso);
          border-radius: var(--radius-xl); color: var(--cream);
          animation: slideUp 0.4s ease 0.1s both;
        }
        .welcome-avatar {
          width: 54px; height: 54px; border-radius: 50%; background: var(--amber);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;
          color: white; flex-shrink: 0;
        }
        .welcome-title { font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; margin-bottom: 4px; }
        .welcome-sub   { font-size: 0.84rem; opacity: 0.7; margin-bottom: 10px; }
        .role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
        }
 
        /* ── Semaphore card ── */
        .semaphore-card {
          width: 100%; display: flex; align-items: center; gap: var(--space-lg);
          padding: 18px 20px;
          background: white; border: 2px solid var(--sem-color);
          border-radius: var(--radius-xl); cursor: pointer; text-align: left;
          font-family: var(--font-body);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          animation: slideUp 0.4s ease 0.15s both;
        }
        .semaphore-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .semaphore-card:active { transform: translateY(0); }
        .sem-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
        .sem-icon-wrap {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
        }
        .sem-title { font-weight: 700; font-size: 0.95rem; color: var(--espresso); margin-bottom: 2px; }
        .sem-sub   { font-size: 0.8rem; color: var(--warm-gray); }
        .sem-dots  { display: flex; gap: 16px; flex-shrink: 0; }
        .sem-dot-item { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .sem-dot-circle { width: 10px; height: 10px; border-radius: 50%; }
        .sem-dot-count  { font-size: 1rem; font-weight: 700; line-height: 1; }
        .sem-dot-label  { font-size: 0.62rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .sem-arrow { font-size: 1.1rem; color: var(--sem-color); font-weight: 700; flex-shrink: 0; transition: transform var(--transition-fast); }
        .semaphore-card:hover .sem-arrow { transform: translateX(4px); }
 
        /* ── Restock card (OWNER only) ── */
        .restock-card {
          width: 100%; display: flex; align-items: center; gap: var(--space-lg);
          padding: 18px 20px;
          background: white; border: 2px solid var(--rst-color);
          border-radius: var(--radius-xl); cursor: pointer; text-align: left;
          font-family: var(--font-body);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          animation: slideUp 0.4s ease 0.18s both;
        }
        .restock-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .restock-card:active { transform: translateY(0); }
        .rst-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
        .rst-icon-wrap {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
        }
        .rst-title { font-weight: 700; font-size: 0.95rem; color: var(--espresso); margin-bottom: 2px; }
        .rst-sub   { font-size: 0.8rem; color: var(--warm-gray); }
        .rst-badge {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 6px 12px; border-radius: 12px;
          background: rgba(230,126,34,0.10); flex-shrink: 0;
        }
        .rst-badge-count { font-size: 1.3rem; font-weight: 800; color: #E67E22; line-height: 1; }
        .rst-badge-label { font-size: 0.6rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .rst-arrow { font-size: 1.1rem; color: var(--rst-color); font-weight: 700; flex-shrink: 0; transition: transform var(--transition-fast); }
        .restock-card:hover .rst-arrow { transform: translateX(4px); }
 
        /* ── Module cards ── */
        .info-card {
          background: white; border-radius: var(--radius-lg);
          padding: var(--space-xl); border: 1px solid var(--cream-dark);
          box-shadow: var(--shadow-sm); animation: slideUp 0.4s ease 0.2s both;
        }
        .info-title {
          font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--espresso);
          margin-bottom: var(--space-lg); padding-bottom: var(--space-md); border-bottom: 1px solid var(--cream-dark);
        }
        .info-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
        .info-item  { display: flex; flex-direction: column; gap: 4px; }
        .info-label {
          font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--warm-gray-light);
        }
        .info-value { font-size: 0.88rem; color: var(--espresso); font-weight: 500; }
        .section-heading {
          font-family: var(--font-display); font-size: 1rem; font-weight: 700;
          color: var(--espresso); margin-bottom: var(--space-md);
        }
        .modules-grid { display: flex; flex-direction: column; gap: 7px; }
        .module-card {
          width: 100%; display: flex; align-items: center; gap: var(--space-md);
          padding: 14px 16px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm); text-align: left; font-family: var(--font-body);
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
        }
        .module-card.ready { cursor: pointer; }
        .module-card.ready:hover {
          box-shadow: var(--shadow-md); border-color: var(--amber);
          transform: translateY(-1px); background: rgba(200,137,58,0.02);
        }
        .module-card.owner-module:hover { border-color: #E67E22; }
        .module-card.ready:active { transform: translateY(0); }
        .module-card.soon  { opacity: 0.5; cursor: not-allowed; }
        .module-icon  { font-size: 1.4rem; flex-shrink: 0; }
        .module-text  { flex: 1; min-width: 0; }
        .module-title { font-weight: 600; font-size: 0.92rem; color: var(--espresso); margin-bottom: 2px; }
        .module-desc  { font-size: 0.78rem; color: var(--warm-gray); }
        .module-arrow {
          font-size: 1rem; color: var(--amber); font-weight: 700; flex-shrink: 0;
          transition: transform var(--transition-fast);
        }
        .module-card.ready:hover .module-arrow { transform: translateX(3px); }
        .module-count-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 22px; height: 22px; padding: 0 5px;
          border-radius: 11px; background: #E67E22; color: white;
          font-size: 0.72rem; font-weight: 800; flex-shrink: 0;
          animation: pulse-badge 2s ease infinite;
        }
        .module-badge {
          font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--warm-gray-light); background: var(--cream-dark);
          padding: 3px 8px; border-radius: 10px; flex-shrink: 0;
        }
        @media (max-width: 480px) {
          .info-grid { grid-template-columns: 1fr; }
          .welcome-card { flex-direction: column; text-align: center; }
          .sem-dots { display: none; }
          .dash-main { padding: var(--space-lg) var(--space-md); }
          .rst-badge { display: none; }
        }
      `}</style>
    </div>
  );
}