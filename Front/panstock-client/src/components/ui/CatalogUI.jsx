// Shared UI primitives used across Products & Categories pages
import { useEffect, useRef } from 'react';

/* ─── Modal ──────────────────────────────────────────────────────────────────*/
export function Modal({ isOpen, onClose, title, children, width = '520px' }) {
  const ref = useRef();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" ref={ref} style={{ maxWidth: width }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(28,17,8,0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        .modal-box {
          width: 100%;
          background: #fff;
          border-radius: var(--radius-xl);
          box-shadow: 0 32px 80px rgba(28,17,8,0.22);
          border: 1px solid rgba(200,137,58,0.12);
          animation: scaleIn 0.25s ease;
          overflow: hidden;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--cream-dark);
        }
        .modal-title {
          font-family: var(--font-display);
          font-size: 1.25rem; font-weight: 700;
          color: var(--espresso);
        }
        .modal-close {
          width: 34px; height: 34px;
          background: var(--cream); border: none;
          border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--warm-gray);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .modal-close:hover { background: var(--cream-dark); color: var(--espresso); }
        .modal-body { padding: 24px; }
      `}</style>
    </div>
  );
}

/* ─── Confirm Dialog ─────────────────────────────────────────────────────────*/
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger = false, loading = false }) {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="400px">
      <p style={{ color: 'var(--warm-gray)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 24 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="cd-btn-cancel" onClick={onClose} disabled={loading}>Cancelar</button>
        <button
          className={`cd-btn-confirm ${danger ? 'danger' : ''}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <span className="cd-spinner" /> : confirmLabel}
        </button>
      </div>
      <style>{`
        .cd-btn-cancel {
          padding: 10px 20px;
          background: var(--cream); border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.88rem; font-weight: 600; color: var(--warm-gray);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .cd-btn-cancel:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .cd-btn-confirm {
          padding: 10px 20px;
          background: var(--espresso); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.88rem; font-weight: 600; color: var(--cream);
          cursor: pointer; transition: all var(--transition-fast);
          display: flex; align-items: center; gap: 6px; min-width: 100px; justify-content: center;
        }
        .cd-btn-confirm.danger { background: var(--error); }
        .cd-btn-confirm:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .cd-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
        .cd-spinner {
          width: 16px; height: 16px;
          border: 2px solid currentColor; border-top-color: transparent;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
      `}</style>
    </Modal>
  );
}

/* ─── Status Badge ───────────────────────────────────────────────────────────*/
export function StatusBadge({ active }) {
  return (
    <span className={`status-badge ${active ? 'active' : 'inactive'}`}>
      <span className="status-dot" />
      {active ? 'Activo' : 'Inactivo'}
      <style>{`
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase;
        }
        .status-badge.active  { background: rgba(46,125,50,0.1);  color: #2E7D32; }
        .status-badge.inactive{ background: rgba(140,123,107,0.1); color: var(--warm-gray); }
        .status-dot {
          width: 6px; height: 6px; border-radius: 50%;
        }
        .status-badge.active .status-dot  { background: #2E7D32; }
        .status-badge.inactive .status-dot{ background: var(--warm-gray); }
      `}</style>
    </span>
  );
}

/* ─── Origin Badge ───────────────────────────────────────────────────────────*/
export function OriginBadge({ origin }) {
  const isFranchise = origin === 'FRANCHISE';
  return (
    <span className={`origin-badge ${isFranchise ? 'franchise' : 'external'}`}>
      {isFranchise ? '🏷 Franquicia' : '🌐 Externo'}
      <style>{`
        .origin-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600;
        }
        .origin-badge.franchise { background: rgba(200,137,58,0.12); color: var(--amber-dark); }
        .origin-badge.external  { background: rgba(28,17,8,0.07);    color: var(--espresso-soft); }
      `}</style>
    </span>
  );
}

/* ─── Empty State ────────────────────────────────────────────────────────────*/
export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="empty-state">
      <span className="es-icon">{icon}</span>
      <p className="es-title">{title}</p>
      {description && <p className="es-desc">{description}</p>}
      {action}
      <style>{`
        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 56px 24px; text-align: center;
        }
        .es-icon { font-size: 2.4rem; opacity: 0.5; }
        .es-title { font-family: var(--font-display); font-size: 1.1rem; color: var(--espresso); font-weight: 700; }
        .es-desc  { font-size: 0.85rem; color: var(--warm-gray); max-width: 300px; line-height: 1.6; }
      `}</style>
    </div>
  );
}

/* ─── Page Shell (for Products / Categories tabs) ────────────────────────────*/
export function PageShell({ children, topbar }) {
  return (
    <div className="page-shell">
      {topbar}
      <div className="page-content">{children}</div>
      <style>{`
        .page-shell { min-height: 100vh; background: var(--cream); }
        .page-content {
          max-width: 1100px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }
        @media (max-width: 640px) {
          .page-content { padding: var(--space-lg) var(--space-md); }
        }
      `}</style>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────────────────────*/
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        <h1 className="sh-title">{title}</h1>
        {subtitle && <p className="sh-sub">{subtitle}</p>}
      </div>
      {action}
      <style>{`
        .section-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 16px; margin-bottom: var(--space-xl);
          flex-wrap: wrap;
        }
        .sh-title {
          font-family: var(--font-display);
          font-size: 1.8rem; font-weight: 700;
          color: var(--espresso); margin-bottom: 4px;
        }
        .sh-sub { font-size: 0.85rem; color: var(--warm-gray); }
      `}</style>
    </div>
  );
}

/* ─── Search + Filter Bar ────────────────────────────────────────────────────*/
export function FilterBar({ children }) {
  return (
    <div className="filter-bar">
      {children}
      <style>{`
        .filter-bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: var(--space-lg);
          padding: 14px 16px;
          background: white; border-radius: var(--radius-lg);
          border: 1px solid var(--cream-dark);
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
}

/* ─── Small action button ────────────────────────────────────────────────────*/
export function ActionBtn({ onClick, variant = 'edit', title, disabled }) {
  const configs = {
    edit:   { color: 'var(--amber)',  bg: 'rgba(200,137,58,0.10)', icon: '✏️' },
    delete: { color: 'var(--error)',  bg: 'rgba(192,57,43,0.08)',  icon: '🗑' },
    add:    { color: 'white',         bg: 'var(--espresso)',       icon: '+' },
  };
  const c = configs[variant] || configs.edit;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="action-btn"
      style={{ '--ab-color': c.color, '--ab-bg': c.bg }}
    >
      {c.icon}
      <style>{`
        .action-btn {
          width: 32px; height: 32px;
          border: none; border-radius: 8px;
          background: var(--ab-bg); color: var(--ab-color);
          cursor: pointer; font-size: 0.9rem;
          display: flex; align-items: center; justify-content: center;
          transition: transform var(--transition-fast), opacity var(--transition-fast);
        }
        .action-btn:hover:not(:disabled) { transform: scale(1.12); }
        .action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </button>
  );
}

/* ─── Loading Skeleton ───────────────────────────────────────────────────────*/
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="sk-cell wide" />
          <div className="sk-cell mid" />
          <div className="sk-cell short" />
          <div className="sk-cell short" />
        </div>
      ))}
      <style>{`
        .skeleton-wrap { display: flex; flex-direction: column; gap: 8px; }
        .skeleton-row {
          display: flex; gap: 12px; align-items: center;
          padding: 14px 16px; background: white;
          border-radius: var(--radius-md); border: 1px solid var(--cream-dark);
          animation: pulse 1.2s ease infinite;
        }
        .sk-cell {
          height: 14px; border-radius: 6px;
          background: linear-gradient(90deg, var(--cream-dark) 25%, var(--cream-medium) 50%, var(--cream-dark) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        .sk-cell.wide  { flex: 3; }
        .sk-cell.mid   { flex: 2; }
        .sk-cell.short { flex: 1; }
      `}</style>
    </div>
  );
}

/* ─── Add / primary CTA button ───────────────────────────────────────────────*/
export function PrimaryBtn({ onClick, children, disabled, loading }) {
  return (
    <button className="primary-btn" onClick={onClick} disabled={disabled || loading}>
      {loading ? <span className="primary-spinner" /> : children}
      <style>{`
        .primary-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 20px;
          background: var(--espresso); color: var(--cream);
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
          box-shadow: var(--shadow-md);
          white-space: nowrap;
        }
        .primary-btn:hover:not(:disabled) {
          background: var(--espresso-mid);
          transform: translateY(-1px);
          box-shadow: var(--shadow-lg);
        }
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .primary-spinner {
          width: 16px; height: 16px;
          border: 2px solid currentColor; border-top-color: transparent;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
      `}</style>
    </button>
  );
}