// components/ui/FormField.jsx
import { useState } from 'react';

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, error, icon, rightIcon, onRightIconClick, ...props }) {
  return (
    <div className="field-wrapper">
      {label && <label className="field-label">{label}</label>}
      <div className="field-input-wrap">
        {icon && <span className="field-icon-left">{icon}</span>}
        <input
          className={`field-input ${icon ? 'has-left-icon' : ''} ${error ? 'has-error' : ''}`}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            className="field-icon-right"
            onClick={onRightIconClick}
            tabIndex={-1}
          >
            {rightIcon}
          </button>
        )}
      </div>
      {error && <span className="field-error">{error}</span>}

      <style>{`
        .field-wrapper { display: flex; flex-direction: column; gap: 6px; }
        
        .field-label {
          font-family: var(--font-body);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--warm-gray);
        }
        
        .field-input-wrap { position: relative; }
        
        .field-input {
          width: 100%;
          padding: 14px 16px;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--espresso);
          background: rgba(255,255,255,0.7);
          border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
          outline: none;
          -webkit-appearance: none;
        }
        
        .field-input.has-left-icon { padding-left: 44px; }
        
        .field-input::placeholder { color: var(--warm-gray-light); }
        
        .field-input:focus {
          border-color: var(--amber);
          background: rgba(255,255,255,0.95);
          box-shadow: 0 0 0 3px rgba(200, 137, 58, 0.12);
        }
        
        .field-input.has-error {
          border-color: var(--error);
          background: var(--error-light);
        }
        
        .field-icon-left {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--warm-gray);
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        
        .field-icon-right {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--warm-gray);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: color var(--transition-fast);
        }
        .field-icon-right:hover { color: var(--espresso); }
        
        .field-error {
          font-size: 0.78rem;
          color: var(--error);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, error, options, ...props }) {
  return (
    <div className="field-wrapper">
      {label && <label className="field-label">{label}</label>}
      <div className="select-wrap">
        <select className={`field-select ${error ? 'has-error' : ''}`} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="select-arrow">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
      </div>
      {error && <span className="field-error">{error}</span>}

      <style>{`
        .select-wrap { position: relative; }
        .field-select {
          width: 100%;
          padding: 14px 40px 14px 16px;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--espresso);
          background: rgba(255,255,255,0.7);
          border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
          outline: none;
          -webkit-appearance: none;
          cursor: pointer;
        }
        .field-select:focus {
          border-color: var(--amber);
          background: rgba(255,255,255,0.95);
          box-shadow: 0 0 0 3px rgba(200, 137, 58, 0.12);
        }
        .select-arrow {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--warm-gray);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', loading, fullWidth, ...props }) {
  return (
    <button
      className={`btn btn-${variant} ${fullWidth ? 'btn-full' : ''} ${loading ? 'btn-loading' : ''}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : children}

      <style>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 15px 28px;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        
        .btn:active:not(:disabled) { transform: scale(0.97); }
        
        .btn-full { width: 100%; }
        
        .btn-primary {
          background: var(--espresso);
          color: var(--cream);
          box-shadow: var(--shadow-md);
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--espresso-mid);
          box-shadow: var(--shadow-lg);
          transform: translateY(-1px);
        }
        
        .btn-amber {
          background: var(--amber);
          color: white;
          box-shadow: var(--shadow-amber);
        }
        .btn-amber:hover:not(:disabled) {
          background: var(--amber-dark);
          box-shadow: 0 6px 30px rgba(200, 137, 58, 0.35);
          transform: translateY(-1px);
        }
        
        .btn-ghost {
          background: transparent;
          color: var(--amber);
          border: 1.5px solid var(--amber);
        }
        .btn-ghost:hover:not(:disabled) {
          background: rgba(200, 137, 58, 0.06);
        }
        
        .btn-text {
          background: transparent;
          color: var(--amber);
          padding: 8px 4px;
          font-size: 0.85rem;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .btn-text:hover:not(:disabled) { color: var(--amber-dark); }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .btn-loading { pointer-events: none; }
        
        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </button>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
export function Alert({ type = 'error', children, onClose }) {
  const colors = {
    error:   { bg: 'var(--error-light)',   border: 'var(--error)',   text: 'var(--error)' },
    success: { bg: 'var(--success-light)', border: 'var(--success)', text: 'var(--success)' },
  };
  const c = colors[type];

  return (
    <div className="alert-box" style={{ '--alert-bg': c.bg, '--alert-border': c.border, '--alert-text': c.text }}>
      <span className="alert-icon">
        {type === 'error' ? '⚠' : '✓'}
      </span>
      <span className="alert-text">{children}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose}>✕</button>
      )}

      <style>{`
        .alert-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: var(--alert-bg);
          border: 1px solid var(--alert-border);
          border-radius: var(--radius-md);
          animation: fadeIn 0.3s ease;
        }
        .alert-icon { font-size: 1rem; color: var(--alert-text); flex-shrink: 0; margin-top: 1px; }
        .alert-text { font-size: 0.875rem; color: var(--alert-text); flex: 1; line-height: 1.5; }
        .alert-close {
          background: none; border: none; cursor: pointer;
          color: var(--alert-text); font-size: 0.8rem;
          padding: 2px; border-radius: 3px; flex-shrink: 0;
          margin-top: 1px;
        }
      `}</style>
    </div>
  );
}
