import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createWasteRecord,
  clearWasteActionState,
  selectWasteAction,
} from '../../features/waste/wasteSlice';
import {
  fetchBatches,
  selectBatches,
  selectBatchesStatus,
} from '../../features/stock/stockSlice';
import { selectToken, selectUser } from '../../features/auth/authSlice';
import { Alert } from '../ui/FormField';


const WASTE_REASONS = [
  { value: 'DAMAGED',              label: '💥 Dañado / Roto'       },
  { value: 'INTERNAL_CONSUMPTION', label: '🍽 Consumo interno'     },
  { value: 'QUALITY_ISSUE',        label: '⚠️ Problema de calidad' },
  { value: 'OTHER',                label: '📝 Otro'                },
];

const EXPIRATION_CONFIG = {
  EXPIRED:        { color: '#C0392B', icon: '💀' },
  RED:            { color: '#E74C3C', icon: '🔴' },
  YELLOW:         { color: '#D68910', icon: '🟡' },
  GREEN:          { color: '#1E8449', icon: '🟢' },
  NOT_APPLICABLE: { color: '#8C7B6B', icon: '⚪' },
};

const formatDate = (d) =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

const formatARS = (v) =>
  v != null && Number(v) !== 0
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(v)
    : null;

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, hint, children, required }) {
  return (
    <div className="wf-field">
      {label && (
        <label className="wf-label">
          {label}
          {required && <span className="wf-req"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="wf-hint">{hint}</span>}
      {error && <span className="wf-error">{error}</span>}
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessView({ record, registeredBy, onNew, onClose }) {
  const loss    = record?.economicLoss;
  const lossStr = loss != null && Number(loss) > 0 ? formatARS(loss) : null;

  return (
    <div className="wf-success">
      <div className="wf-success-icon">🗑️</div>
      <h3 className="wf-success-title">¡Merma registrada!</h3>
      <p className="wf-success-desc">
        Se registró la baja de{' '}
        <strong>{Number(record?.quantity).toLocaleString('es-AR')}</strong>{' '}
        unidades de <strong>{record?.productName}</strong>.
        {lossStr && (
          <>
            {' '}Pérdida económica estimada:{' '}
            <strong style={{ color: '#C0392B' }}>{lossStr}</strong>.
          </>
        )}
      </p>

      {registeredBy && (
        <div className="wf-success-author">
          <span className="wf-success-avatar">
            {registeredBy.charAt(0).toUpperCase()}
          </span>
          <span>Registrado por <strong>{registeredBy}</strong></span>
        </div>
      )}

      <span className="wf-success-badge">Registro #{record?.id}</span>

      <div className="wf-success-actions">
        <button className="wf-btn-sec" onClick={onClose}>Volver</button>
        <button className="wf-btn-pri" onClick={onNew}>+ Otra merma</button>
      </div>

      <style>{`
        .wf-success {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 8px 0 4px; text-align: center;
          animation: fadeIn 0.3s ease;
        }
        .wf-success-icon  { font-size: 3rem; }
        .wf-success-title {
          font-family: var(--font-display); font-size: 1.3rem;
          font-weight: 700; color: var(--espresso);
        }
        .wf-success-desc {
          font-size: 0.9rem; color: var(--warm-gray);
          line-height: 1.6; max-width: 340px;
        }
        .wf-success-author {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.82rem; color: var(--warm-gray);
          padding: 8px 16px; border-radius: var(--radius-md);
          background: var(--cream); border: 1px solid var(--cream-dark);
        }
        .wf-success-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--amber); color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; flex-shrink: 0;
        }
        .wf-success-badge {
          display: inline-flex; align-items: center;
          padding: 4px 14px; border-radius: 20px;
          background: rgba(192,57,43,0.08); color: #C0392B;
          font-size: 0.78rem; font-weight: 700;
        }
        .wf-success-actions {
          display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
          padding-top: 8px;
        }
        .wf-btn-sec {
          padding: 11px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .wf-btn-sec:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .wf-btn-pri {
          padding: 11px 22px; background: #C0392B; border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.88rem; font-weight: 600; color: white; cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 16px rgba(192,57,43,0.22);
        }
        .wf-btn-pri:hover { filter: brightness(1.08); transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WasteForm({ onSuccess, onCancel }) {
  const dispatch  = useDispatch();
  const token     = useSelector(selectToken);
  const user      = useSelector(selectUser);
  const batches   = useSelector(selectBatches);
  const batchesSt = useSelector(selectBatchesStatus);
  const { status, error, lastCreated } = useSelector(selectWasteAction);

  // Estado inicial: primer motivo disponible (DAMAGED)
  const [form, setForm] = useState({
    batchId: '', quantity: '', reason: 'DAMAGED', notes: '',
  });
  const [fieldErrors, setFE]          = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (batches.length === 0 || batchesSt === 'idle') {
      dispatch(fetchBatches({ token }));
    }
    dispatch(clearWasteActionState());
  }, []); // eslint-disable-line

  useEffect(() => {
    if (status === 'succeeded') setShowSuccess(true);
  }, [status]);

  // ── Lotes disponibles: AVAILABLE con stock > 0 ────────────
  // Los lotes EXPIRED los maneja el sistema automáticamente.
  // El form manual solo muestra lotes NO vencidos (AVAILABLE con stock > 0
  // y expirationStatus distinto de EXPIRED).
  const availableBatches = useMemo(
    () =>
      batches.filter(
        (b) =>
          b.batchStatus === 'AVAILABLE' &&
          Number(b.currentQuantity) > 0 &&
          b.expirationStatus !== 'EXPIRED'   // ← excluir vencidos
      ),
    [batches]
  );

  const selectedBatch = useMemo(
    () => availableBatches.find((b) => String(b.id) === String(form.batchId)) || null,
    [availableBatches, form.batchId]
  );

  // Preview de pérdida económica
  const estimatedLoss = useMemo(() => {
    if (!selectedBatch || !form.quantity) return null;
    const price = selectedBatch.unitSalePrice;
    if (!price || Number(price) === 0) return null;
    const qty = Number(form.quantity);
    if (isNaN(qty) || qty <= 0) return null;
    return qty * Number(price);
  }, [selectedBatch, form.quantity]);

  // Nombre completo del usuario autenticado
  const fullName = useMemo(() => {
    if (!user) return null;
    const first = user.firstName || '';
    const last  = user.lastName  || '';
    if (first && last) return `${first} ${last}`;
    return first || last || user.username || null;
  }, [user]);

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.batchId) e.batchId  = 'Seleccioná un lote';
    if (!form.reason)  e.reason   = 'Seleccioná un motivo';
    const qty = Number(form.quantity);
    if (!form.quantity || isNaN(qty) || qty <= 0)
      e.quantity = 'La cantidad debe ser mayor a cero';
    else if (selectedBatch && qty > Number(selectedBatch.currentQuantity))
      e.quantity = `Máximo disponible: ${selectedBatch.currentQuantity}`;
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (fieldErrors[field]) setFE((p) => ({ ...p, [field]: undefined }));
  };

  const handleReasonChange = (e) => {
    const newReason = e.target.value;
    setForm((p) => ({ ...p, reason: newReason, batchId: '', quantity: '' }));
    setFE((p) => ({ ...p, reason: undefined, batchId: undefined, quantity: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    if (!user?.id) {
      setFE({ _global: 'No se pudo identificar al usuario. Por favor, cerrá sesión y volvé a ingresar.' });
      return;
    }

    dispatch(
      createWasteRecord({
        token,
        data: {
          batchId:  Number(form.batchId),
          userId:   user.id,
          quantity: Number(form.quantity),
          reason:   form.reason,
          notes:    form.notes.trim() || null,
        },
      })
    );
  };

  const handleNew = () => {
    setForm({ batchId: '', quantity: '', reason: 'DAMAGED', notes: '' });
    setFE({});
    setShowSuccess(false);
    dispatch(clearWasteActionState());
  };

  const handleClose = () => {
    dispatch(clearWasteActionState());
    onSuccess?.();
  };

  const isLoading = status === 'loading';

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <SuccessView
        record={lastCreated}
        registeredBy={fullName}
        onNew={handleNew}
        onClose={handleClose}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="wf-form">
      {/* Error global */}
      {(error || fieldErrors._global) && (
        <Alert type="error">{error || fieldErrors._global}</Alert>
      )}

      {/* Quién está registrando */}
      {fullName ? (
        <div className="wf-author-banner">
          <div className="wf-author-avatar">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="wf-author-info">
            <span className="wf-author-label">Registrando como</span>
            <span className="wf-author-name">
              {fullName}
              <span className="wf-author-role">
                {user?.role === 'OWNER' ? ' · 👑 Dueño/a' : ' · 👤 Empleado/a'}
              </span>
            </span>
          </div>
          <div className="wf-author-id">ID #{user?.id}</div>
        </div>
      ) : (
        <div className="wf-author-error">
          ⚠️ No se pudo identificar al usuario. Cerrá sesión y volvé a ingresar.
        </div>
      )}

      {/* Banner informativo */}
      <div className="wf-info-banner">
        <span>⚠️</span>
        <p>
          Registrá productos <strong>dañados, de consumo interno o con problemas de calidad</strong>.
          Los lotes vencidos son descartados <strong>automáticamente por el sistema</strong>
          al abrir la sección de Vencimientos.
        </p>
      </div>

      {/* ── MOTIVO ── */}
      <Field label="Motivo de la merma" required error={fieldErrors.reason}>
        <div className="wf-reason-grid">
          {WASTE_REASONS.map((r) => (
            <label
              key={r.value}
              className={`wf-reason-opt ${form.reason === r.value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={form.reason === r.value}
                onChange={handleReasonChange}
                disabled={isLoading}
                className="wf-radio"
              />
              <span className="wf-reason-label">{r.label}</span>
            </label>
          ))}
        </div>
      </Field>

      {/* ── Selector de lote ── */}
      <Field
        label="Lote a descartar"
        required
        error={fieldErrors.batchId}
      >
        {batchesSt === 'loading' ? (
          <div className="wf-loading-sel">Cargando lotes disponibles...</div>
        ) : availableBatches.length === 0 ? (
          <div className="wf-loading-sel" style={{ color: 'var(--warm-gray)' }}>
            No hay lotes disponibles con stock.
          </div>
        ) : (
          <select
            className={`wf-select ${fieldErrors.batchId ? 'err' : ''}`}
            value={form.batchId}
            onChange={handleChange('batchId')}
            disabled={isLoading}
          >
            <option value="">— Seleccioná un lote —</option>
            {availableBatches.map((b) => {
              const exp = b.expirationDate
                ? ` · Vence: ${formatDate(b.expirationDate)}`
                : '';
              const cfg =
                EXPIRATION_CONFIG[b.expirationStatus] ||
                EXPIRATION_CONFIG.NOT_APPLICABLE;
              return (
                <option key={b.id} value={b.id}>
                  {cfg.icon} {b.productName} · Stock: {b.currentQuantity}{exp}
                </option>
              );
            })}
          </select>
        )}
      </Field>

      {/* Info del lote seleccionado */}
      {selectedBatch && (
        <div className="wf-batch-card">
          <div className="wf-bc-row">
            <span className="wf-bc-label">Producto</span>
            <span className="wf-bc-val">{selectedBatch.productName}</span>
          </div>
          <div className="wf-bc-row">
            <span className="wf-bc-label">Stock disponible</span>
            <span className="wf-bc-val wf-bc-stock">
              {selectedBatch.currentQuantity} u.
            </span>
          </div>
          {selectedBatch.expirationDate && (
            <div className="wf-bc-row">
              <span className="wf-bc-label">Vencimiento</span>
              <span
                className="wf-bc-val"
                style={{
                  color: EXPIRATION_CONFIG[selectedBatch.expirationStatus]?.color,
                }}
              >
                {EXPIRATION_CONFIG[selectedBatch.expirationStatus]?.icon}{' '}
                {formatDate(selectedBatch.expirationDate)}
              </span>
            </div>
          )}
          {selectedBatch.supplierName && (
            <div className="wf-bc-row">
              <span className="wf-bc-label">Proveedor</span>
              <span className="wf-bc-val">{selectedBatch.supplierName}</span>
            </div>
          )}
          {selectedBatch.unitSalePrice &&
            Number(selectedBatch.unitSalePrice) > 0 && (
              <div className="wf-bc-row">
                <span className="wf-bc-label">Precio venta unit.</span>
                <span className="wf-bc-val">
                  {formatARS(selectedBatch.unitSalePrice)}
                </span>
              </div>
            )}
        </div>
      )}

      {/* ── Cantidad ── */}
      <Field
        label="Cantidad a descartar"
        required
        error={fieldErrors.quantity}
        hint={
          selectedBatch
            ? `Máximo: ${selectedBatch.currentQuantity} u.`
            : undefined
        }
      >
        <input
          className={`wf-input ${fieldErrors.quantity ? 'err' : ''}`}
          type="number"
          min="0.001"
          step="any"
          placeholder="Ej: 3"
          value={form.quantity}
          onChange={handleChange('quantity')}
          disabled={isLoading || !form.batchId}
        />
      </Field>

      {/* Preview de pérdida económica */}
      {estimatedLoss != null && (
        <div className="wf-loss-preview">
          <span className="wf-loss-label">Pérdida económica estimada</span>
          <span className="wf-loss-value">{formatARS(estimatedLoss)}</span>
        </div>
      )}

      {/* ── Observaciones ── */}
      <Field label="Observaciones">
        <textarea
          className="wf-textarea"
          placeholder="Descripción adicional, causa, turno, etc."
          value={form.notes}
          onChange={handleChange('notes')}
          disabled={isLoading}
          rows={2}
        />
      </Field>

      {/* ── Acciones ── */}
      <div className="wf-actions">
        {onCancel && (
          <button
            type="button"
            className="wf-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="wf-submit"
          disabled={isLoading || !form.batchId || !user?.id}
        >
          {isLoading ? (
            <>
              <span className="wf-spinner" /> Registrando...
            </>
          ) : (
            '🗑️ Registrar merma'
          )}
        </button>
      </div>

      <style>{`
        .wf-form { display: flex; flex-direction: column; gap: 16px; }

        /* Quién registra */
        .wf-author-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.06);
          border: 1px solid rgba(200,137,58,0.2);
        }
        .wf-author-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--amber); color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
        }
        .wf-author-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
        .wf-author-label {
          font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--warm-gray-light); font-weight: 600;
        }
        .wf-author-name  { font-size: 0.88rem; font-weight: 700; color: var(--espresso); }
        .wf-author-role  { font-weight: 400; color: var(--warm-gray); }
        .wf-author-id    { font-size: 0.7rem; color: var(--warm-gray-light); flex-shrink: 0; }

        .wf-author-error {
          padding: 10px 14px; border-radius: var(--radius-md);
          background: var(--error-light); border: 1px solid var(--error);
          color: var(--error); font-size: 0.82rem; font-weight: 500;
        }

        /* Info banner */
        .wf-info-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(192,57,43,0.05);
          border: 1px solid rgba(192,57,43,0.2);
        }
        .wf-info-banner p {
          font-size: 0.8rem; color: var(--warm-gray); line-height: 1.5; margin: 0;
        }

        /* Field */
        .wf-field { display: flex; flex-direction: column; gap: 5px; }
        .wf-label {
          font-family: var(--font-body); font-size: 0.76rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray);
        }
        .wf-req   { color: var(--amber); }
        .wf-hint  { font-size: 0.74rem; color: var(--warm-gray-light); line-height: 1.4; }
        .wf-error { font-size: 0.76rem; color: var(--error); font-weight: 600; }

        /* Inputs */
        .wf-select, .wf-input, .wf-textarea {
          width: 100%; padding: 12px 14px;
          font-family: var(--font-body); font-size: 0.92rem;
          color: var(--espresso); background: rgba(255,255,255,0.85);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; -webkit-appearance: none;
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
          box-sizing: border-box;
        }
        .wf-select  { cursor: pointer; }
        .wf-textarea { resize: vertical; }
        .wf-select:focus, .wf-input:focus, .wf-textarea:focus {
          border-color: #C0392B; background: #fff;
          box-shadow: 0 0 0 3px rgba(192,57,43,0.09);
        }
        .wf-select.err, .wf-input.err { border-color: var(--error); }
        .wf-select:disabled, .wf-input:disabled, .wf-textarea:disabled {
          opacity: 0.55; cursor: not-allowed;
        }
        .wf-loading-sel {
          padding: 12px 14px; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); background: var(--cream);
          font-size: 0.85rem; color: var(--warm-gray);
        }

        /* Batch info card */
        .wf-batch-card {
          padding: 12px 14px; border-radius: var(--radius-md);
          background: white; border: 1.5px solid var(--cream-dark);
          display: flex; flex-direction: column; gap: 7px;
          animation: fadeIn 0.2s ease;
        }
        .wf-bc-row   { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .wf-bc-label {
          font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--warm-gray-light); flex-shrink: 0;
        }
        .wf-bc-val   { font-size: 0.85rem; color: var(--espresso); font-weight: 600; text-align: right; }
        .wf-bc-stock { color: var(--success, #2E7D32); }

        /* Motivo — grid de 2 columnas */
        .wf-reason-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 7px;
        }
        .wf-reason-opt {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--cream-dark); background: var(--cream);
          cursor: pointer; transition: all var(--transition-fast); user-select: none;
        }
        .wf-reason-opt:hover    { border-color: rgba(192,57,43,0.35); }
        .wf-reason-opt.selected {
          border-color: #C0392B; background: rgba(192,57,43,0.05);
        }
        .wf-radio        { display: none; }
        .wf-reason-label { font-size: 0.84rem; font-weight: 500; color: var(--espresso); }

        /* Loss preview */
        .wf-loss-preview {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-radius: var(--radius-md);
          background: rgba(192,57,43,0.05);
          border: 1px solid rgba(192,57,43,0.2);
          animation: fadeIn 0.2s ease;
        }
        .wf-loss-label { font-size: 0.78rem; color: var(--warm-gray); font-weight: 500; }
        .wf-loss-value {
          font-size: 1.05rem; font-weight: 800;
          color: #C0392B; font-family: var(--font-display);
        }

        /* Actions */
        .wf-actions { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 4px; }
        .wf-cancel {
          padding: 13px 22px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .wf-cancel:hover    { border-color: var(--warm-gray); color: var(--espresso); }
        .wf-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        .wf-submit {
          flex: 1; min-width: 180px;
          padding: 13px 24px; background: #C0392B; border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
          color: white; cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 16px rgba(192,57,43,0.22);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .wf-submit:hover:not(:disabled) {
          filter: brightness(1.08); transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(192,57,43,0.3);
        }
        .wf-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .wf-spinner {
          width: 17px; height: 17px;
          border: 2px solid white; border-top-color: transparent;
          border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .wf-reason-grid   { grid-template-columns: 1fr; }
          .wf-actions       { flex-direction: column-reverse; }
          .wf-cancel, .wf-submit {
            width: 100%; min-width: unset; justify-content: center;
          }
        }
      `}</style>
    </form>
  );
}