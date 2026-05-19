// pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { loginUser, clearError, selectAuthStatus, selectAuthError, selectIsAuthenticated } from '../features/auth/authSlice';
import { Input, Button, Alert } from '../components/ui/FormField';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="11" r="1" fill="currentColor"/>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── Floating crumbs decoration ───────────────────────────────────────────────
const Crumbs = () => (
  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {[
      { size: 6,  top: '12%', left: '8%',  delay: '0s',   duration: '6s'  },
      { size: 4,  top: '25%', left: '88%', delay: '1s',   duration: '7s'  },
      { size: 8,  top: '55%', left: '5%',  delay: '2s',   duration: '5s'  },
      { size: 5,  top: '70%', left: '92%', delay: '0.5s', duration: '8s'  },
      { size: 3,  top: '80%', left: '15%', delay: '3s',   duration: '6.5s'},
      { size: 7,  top: '40%', left: '95%', delay: '1.5s', duration: '7.5s'},
    ].map((c, i) => (
      <span key={i} style={{
        position: 'absolute',
        top: c.top,
        left: c.left,
        width: c.size,
        height: c.size,
        borderRadius: '50%',
        background: 'var(--amber)',
        opacity: 0.3,
        animation: `floatCrumb ${c.duration} ${c.delay} ease-in-out infinite`,
      }} />
    ))}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isAuth    = useSelector(selectIsAuthenticated);
  const status    = useSelector(selectAuthStatus);
  const error     = useSelector(selectAuthError);

  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuth) navigate(from, { replace: true });
    return () => dispatch(clearError());
  }, [isAuth, navigate, from, dispatch]);

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'El usuario es obligatorio';
    if (!form.password)        errs.password = 'La contraseña es obligatoria';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    dispatch(loginUser(form));
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (error) dispatch(clearError());
  };

  const isLoading = status === 'loading';

  return (
    <div className={`login-page ${mounted ? 'mounted' : ''}`}>
      <Crumbs />

      {/* Brand header */}
      <header className="login-header">
        <div className="brand-mark">
          <div>
            <img src="/logo_panstock.png" alt="Logo" width="70" height="70" className="me-2"/>
          </div>
          <span className="brand-name">PanStock</span>
        </div>
        <p className="brand-sub">Dulce Hora — Gestión de inventario</p>
      </header>

      {/* Card */}
      <main className="login-card">
        <div className="card-inner">
          <div className="card-title-block">
            <h1 className="card-title">Bienvenido</h1>
            <p className="card-subtitle">Ingresá tus credenciales para continuar</p>
          </div>

          {error && (
            <Alert type="error" onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="login-form">
            <Input
              label="Usuario"
              type="text"
              placeholder="tu_usuario"
              value={form.username}
              onChange={handleChange('username')}
              error={fieldErrors.username}
              icon={<UserIcon />}
              autoComplete="username"
              autoCapitalize="off"
              disabled={isLoading}
            />

            <Input
              label="Contraseña"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange('password')}
              error={fieldErrors.password}
              icon={<LockIcon />}
              rightIcon={<EyeIcon open={showPass} />}
              onRightIconClick={() => setShowPass((v) => !v)}
              autoComplete="current-password"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="amber"
              fullWidth
              loading={isLoading}
            >
              Iniciar sesión
            </Button>
          </form>

          <div className="login-footer">
            <span className="footer-text">¿No tenés cuenta?</span>
            <Link to="/register" className="footer-link">Registrarse</Link>
          </div>

          {/* Demo hint */}
          <div className="demo-hint">
            <span className="demo-label">Demo</span>
            <span>lorena / 1234  ·  martina / 1234</span>
          </div>
        </div>
      </main>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-lg);
          position: relative;
          background:
            radial-gradient(ellipse 80% 60% at 20% 0%, rgba(200,137,58,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 100%, rgba(200,137,58,0.08) 0%, transparent 60%),
            var(--cream);
        }

        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          margin-bottom: var(--space-xl);
          animation: slideUp 0.5s ease both;
        }

        .brand-mark {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-name {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--espresso);
          letter-spacing: -0.02em;
        }

        .brand-sub {
          font-size: 0.8rem;
          color: var(--warm-gray);
          letter-spacing: 0.05em;
          text-align: center;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(200, 137, 58, 0.15);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255,255,255,0.6) inset;
          overflow: hidden;
          animation: scaleIn 0.4s ease 0.1s both;
        }

        .card-inner {
          padding: var(--space-2xl) var(--space-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .card-title-block {
          text-align: center;
        }

        .card-title {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          color: var(--espresso);
          margin-bottom: 6px;
        }

        .card-subtitle {
          font-size: 0.88rem;
          color: var(--warm-gray);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .login-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.875rem;
        }

        .footer-text { color: var(--warm-gray); }

        .footer-link {
          color: var(--amber);
          text-decoration: none;
          font-weight: 600;
          transition: color var(--transition-fast);
        }
        .footer-link:hover { color: var(--amber-dark); }

        .demo-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--warm-gray);
          padding: 10px 14px;
          background: var(--cream-dark);
          border-radius: var(--radius-md);
          border: 1px dashed var(--cream-medium);
        }

        .demo-label {
          background: var(--amber);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* Staggered field animations */
        .login-page.mounted .login-form > * {
          animation: fadeIn 0.4s ease both;
        }
        .login-page.mounted .login-form > *:nth-child(1) { animation-delay: 0.25s; }
        .login-page.mounted .login-form > *:nth-child(2) { animation-delay: 0.35s; }
        .login-page.mounted .login-form > *:nth-child(3) { animation-delay: 0.45s; }

        @media (max-width: 480px) {
          .login-page { padding: var(--space-md); justify-content: flex-start; padding-top: 60px; }
          .card-inner { padding: var(--space-xl) var(--space-lg); }
          .card-title { font-size: 1.7rem; }
        }
      `}</style>
    </div>
  );
}
