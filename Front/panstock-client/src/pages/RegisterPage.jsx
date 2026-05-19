// pages/RegisterPage.jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  registerUser,
  clearError,
  selectAuthStatus,
  selectAuthError,
  selectIsAuthenticated,
} from '../features/auth/authSlice';
import { Input, Select, Button, Alert } from '../components/ui/FormField';

// ─── Icons ────────────────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="11" r="1" fill="currentColor"/>
  </svg>
);
const IdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="5" cy="8" r="1.5" fill="currentColor"/>
    <path d="M8 6h5M8 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="step-dots">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`step-dot ${i === current ? 'active' : i < current ? 'done' : ''}`} />
      ))}
      <style>{`
        .step-dots { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--cream-dark);
          transition: all var(--transition-base);
        }
        .step-dot.active { width: 24px; border-radius: 4px; background: var(--amber); }
        .step-dot.done { background: var(--amber); opacity: 0.5; }
      `}</style>
    </div>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const getStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pw.length >= 4) score++;
    if (pw.length >= 8) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const labels = ['', 'Débil', 'Regular', 'Buena', 'Excelente'];
    const colors = ['transparent', 'var(--error)', '#F59E0B', '#10B981', 'var(--success)'];
    return { score, label: labels[score], color: colors[score] };
  };

  const { score, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <div className="pw-strength">
      <div className="pw-bars">
        {[1,2,3,4].map(i => (
          <div key={i} className="pw-bar" style={{ background: i <= score ? color : 'var(--cream-dark)' }} />
        ))}
      </div>
      <span className="pw-label" style={{ color }}>{label}</span>
      <style>{`
        .pw-strength { display: flex; align-items: center; gap: 8px; }
        .pw-bars { display: flex; gap: 4px; flex: 1; }
        .pw-bar { height: 4px; flex: 1; border-radius: 2px; transition: background var(--transition-base); }
        .pw-label { font-size: 0.72rem; font-weight: 600; min-width: 60px; text-align: right; }
      `}</style>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
const INITIAL_FORM = {
  username:  '',
  firstName: '',
  lastName:  '',
  email:     '',
  password:  '',
  confirm:   '',
  role:      'EMPLOYEE',
};

const STEPS = [
  { title: 'Datos personales',   subtitle: 'Contanos quién sos' },
  { title: 'Acceso y rol',       subtitle: 'Configurá tu cuenta' },
];

export default function RegisterPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const isAuth    = useSelector(selectIsAuthenticated);
  const status    = useSelector(selectAuthStatus);
  const error     = useSelector(selectAuthError);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [mounted, setMounted] = useState(false);
  const [slideDir, setSlideDir] = useState('right');

  useEffect(() => {
    setMounted(true);
    if (isAuth) navigate('/dashboard', { replace: true });
    return () => dispatch(clearError());
  }, [isAuth, navigate, dispatch]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (error) dispatch(clearError());
  };

  const validateStep0 = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'El nombre es obligatorio';
    if (!form.lastName.trim())  errs.lastName  = 'El apellido es obligatorio';
    if (!form.email.trim())     errs.email     = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                errs.email     = 'El email no tiene un formato válido';
    return errs;
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'El usuario es obligatorio';
    else if (form.username.includes(' ')) errs.username = 'El usuario no puede tener espacios';
    if (!form.password)        errs.password = 'La contraseña es obligatoria';
    else if (form.password.length < 4) errs.password = 'Mínimo 4 caracteres';
    if (!form.confirm)         errs.confirm  = 'Confirmá la contraseña';
    else if (form.confirm !== form.password) errs.confirm = 'Las contraseñas no coinciden';
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep0();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSlideDir('right');
    setStep(1);
  };

  const handleBack = () => {
    setFieldErrors({});
    setSlideDir('left');
    setStep(0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    const { confirm, ...payload } = form;
    dispatch(registerUser(payload));
  };

  const isLoading = status === 'loading';

  return (
    <div className={`register-page ${mounted ? 'mounted' : ''}`}>
      {/* Decorative background shapes */}
      <div aria-hidden="true" className="deco-circle deco-1" />
      <div aria-hidden="true" className="deco-circle deco-2" />

      {/* Brand */}
      <header className="reg-header">
        <Link to="/login" className="back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </Link>
        <div className="brand-row">
          <div>
            <img src="/logo_panstock.png" alt="Logo" width="70" height="70" className="me-2"/>
          </div>
          <span className="brand-name">PanStock</span>
        </div>
      </header>

      <main className="register-card">
        <div className="card-inner">
          <StepDots current={step} total={STEPS.length} />

          <div className="card-title-block">
            <h1 className="card-title">{STEPS[step].title}</h1>
            <p className="card-subtitle">{STEPS[step].subtitle}</p>
          </div>

          {error && (
            <Alert type="error" onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}

          {/* Step 0 — Personal info */}
          {step === 0 && (
            <div className={`form-step anim-${slideDir}`}>
              <div className="form-group">
                <div className="field-row">
                  <Input
                    label="Nombre"
                    type="text"
                    placeholder="María"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    error={fieldErrors.firstName}
                    icon={<IdIcon />}
                    autoComplete="given-name"
                    disabled={isLoading}
                  />
                  <Input
                    label="Apellido"
                    type="text"
                    placeholder="García"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    error={fieldErrors.lastName}
                    autoComplete="family-name"
                    disabled={isLoading}
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  placeholder="maria@dulcehora.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  error={fieldErrors.email}
                  icon={<MailIcon />}
                  autoComplete="email"
                  inputMode="email"
                  disabled={isLoading}
                />
              </div>

              <Button type="button" variant="amber" fullWidth onClick={handleNext}>
                Continuar →
              </Button>
            </div>
          )}

          {/* Step 1 — Account */}
          {step === 1 && (
            <form onSubmit={handleSubmit} noValidate>
              <div className={`form-step anim-${slideDir}`}>
                <div className="form-group">
                  <Input
                    label="Nombre de usuario"
                    type="text"
                    placeholder="maria_garcia"
                    value={form.username}
                    onChange={handleChange('username')}
                    error={fieldErrors.username}
                    icon={<UserIcon />}
                    autoComplete="username"
                    autoCapitalize="off"
                    disabled={isLoading}
                  />

                  <Select
                    label="Rol en la sucursal"
                    value={form.role}
                    onChange={handleChange('role')}
                    disabled={isLoading}
                    options={[
                      { value: 'EMPLOYEE', label: '👤 Empleado/a' },
                      { value: 'OWNER',    label: '👑 Dueño / Encargado' },
                    ]}
                  />

                  <div>
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
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                    <div style={{ marginTop: 8 }}>
                      <PasswordStrength password={form.password} />
                    </div>
                  </div>

                  <Input
                    label="Confirmá la contraseña"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={handleChange('confirm')}
                    error={fieldErrors.confirm}
                    icon={<LockIcon />}
                    rightIcon={<EyeIcon open={showConfirm} />}
                    onRightIconClick={() => setShowConfirm((v) => !v)}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>

                <div className="step-actions">
                  <Button type="button" variant="ghost" onClick={handleBack} disabled={isLoading}>
                    ← Atrás
                  </Button>
                  <Button type="submit" variant="amber" loading={isLoading} style={{ flex: 1 }}>
                    Crear cuenta
                  </Button>
                </div>
              </div>
            </form>
          )}

          <div className="login-link">
            <span>¿Ya tenés cuenta?</span>
            <Link to="/login" className="footer-link">Iniciar sesión</Link>
          </div>
        </div>
      </main>

      <style>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-lg);
          padding-top: var(--space-xl);
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse 80% 60% at 80% 0%, rgba(200,137,58,0.10) 0%, transparent 60%),
            var(--cream);
        }

        .deco-circle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .deco-1 {
          width: 300px; height: 300px;
          top: -100px; right: -80px;
          background: radial-gradient(circle, rgba(200,137,58,0.12) 0%, transparent 70%);
        }
        .deco-2 {
          width: 200px; height: 200px;
          bottom: -60px; left: -40px;
          background: radial-gradient(circle, rgba(28,17,8,0.06) 0%, transparent 70%);
        }

        .reg-header {
          width: 100%;
          max-width: 440px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-xl);
          animation: fadeIn 0.4s ease both;
        }

        .back-link {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.85rem; color: var(--warm-gray);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        .back-link:hover { color: var(--espresso); }

        .brand-row {
          display: flex; align-items: center; gap: 8px;
        }

        .brand-name {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--espresso);
        }

        .register-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(200, 137, 58, 0.15);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255,255,255,0.6) inset;
          animation: scaleIn 0.4s ease 0.1s both;
        }

        .card-inner {
          padding: var(--space-2xl) var(--space-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .card-title-block { text-align: center; }
        .card-title {
          font-family: var(--font-display);
          font-size: 1.7rem;
          font-weight: 700;
          color: var(--espresso);
          margin-bottom: 4px;
        }
        .card-subtitle { font-size: 0.85rem; color: var(--warm-gray); }

        .form-step {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .form-step.anim-right { animation: slideRight 0.3s ease; }
        .form-step.anim-left  { animation: slideLeft 0.3s ease; }

        @keyframes slideRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm);
        }

        .step-actions {
          display: flex;
          gap: var(--space-sm);
          align-items: center;
        }

        .login-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.875rem;
          color: var(--warm-gray);
        }

        .footer-link {
          color: var(--amber);
          text-decoration: none;
          font-weight: 600;
          transition: color var(--transition-fast);
        }
        .footer-link:hover { color: var(--amber-dark); }

        @media (max-width: 480px) {
          .register-page { padding: var(--space-md); padding-top: var(--space-lg); }
          .card-inner { padding: var(--space-xl) var(--space-lg); }
          .field-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
