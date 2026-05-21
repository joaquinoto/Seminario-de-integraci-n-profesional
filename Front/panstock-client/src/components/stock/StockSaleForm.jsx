import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  registerSale,
  clearSaleState,
  selectSaleAction,
} from '../../features/stock/stockSlice';
import { selectToken, selectUser } from '../../features/auth/authSlice';
import { selectProducts, fetchProducts } from '../../features/catalog/productsSlice';
import { Alert } from '../ui/FormField';

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIT_LABELS = {
  UNIT: 'Unid.', KG: 'kg', GRAM: 'g',
  TRAY: 'Band.', BAG: 'Bolsa', LITER: 'L', PACK: 'Pack',
};

const EMPTY = {
  productId: '',
  quantity:  '',
  notes:     '',
};

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, hint, children, required }) {
  return (
    <div className="sf-field">
      {label && (
        <label className="sf-label">
          {label}
          {required && <span className="sf-required"> *</span>}
        </label>
      )}
      {children}
      {hint  && !error && <span className="sf-hint">{hint}</span>}
      {error && <span className="sf-error">{error}</span>}
    </div>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────
function SuccessView({ result, onNew, onClose }) {
  const productName = result?.productName || 'Producto';
  const totalQty    = result?.totalQuantity ?? '?';
  const movements   = result?.movements ?? [];
  const lots        = movements.length;

  return (
    <div className="sf-success">
      <div className="sf-success-icon">🛒</div>
      <h3 className="sf-success-title">¡Venta registrada!</h3>
      <p className="sf-success-desc">
        Se registró la venta de <strong>{totalQty}</strong> unidades de{' '}
        <strong>{productName}</strong>
        {lots > 1 && <>, descontando de <strong>{lots} lotes</strong> (FEFO)</>}.
      </p>

      {movements.length > 0 && (
        <div className="sf-success-movements">
          {movements.map((m) => (
            <div key={m.id} className="sf-movement-row">
              <span className="sf-movement-badge">Lote #{m.batchId}</span>
              <span className="sf-movement-qty">−{m.quantity} u.</span>
            </div>
          ))}
        </div>
      )}

      <div className="sf-success-actions">
        <button className="sf-btn-secondary" onClick={onClose}>
          Volver al stock
        </button>
        <button className="sf-btn-primary" onClick={onNew}>
          + Otra venta
        </button>
      </div>

      <style>{`
        .sf-success {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 8px 0 4px; text-align: center;
          animation: fadeIn 0.3s ease;
        }
        .sf-success-icon  { font-size: 3rem; }
        .sf-success-title {
          font-family: var(--font-display); font-size: 1.3rem;
          font-weight: 700; color: var(--espresso);
        }
        .sf-success-desc {
          font-size: 0.9rem; color: var(--warm-gray);
          line-height: 1.6; max-width: 340px;
        }
        .sf-success-movements {
          display: flex; flex-wrap: wrap; gap: 7px;
          justify-content: center; max-width: 360px;
        }
        .sf-movement-row {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 20px;
          background: rgba(46,125,50,0.10); border: 1px solid rgba(46,125,50,0.2);
        }
        .sf-movement-badge { font-size: 0.74rem; font-weight: 700; color: #2E7D32; }
        .sf-movement-qty   { font-size: 0.74rem; color: var(--warm-gray); }

        .sf-success-actions {
          display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
          padding-top: 8px;
        }
        .sf-btn-secondary {
          padding: 11px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .sf-btn-secondary:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .sf-btn-primary {
          padding: 11px 22px; background: var(--espresso); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.88rem; font-weight: 600; color: var(--cream); cursor: pointer;
          transition: all var(--transition-fast); box-shadow: var(--shadow-md);
        }
        .sf-btn-primary:hover { background: var(--espresso-mid); transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StockSaleForm({ onSuccess, onCancel }) {
  const dispatch            = useDispatch();
  const token               = useSelector(selectToken);
  const user                = useSelector(selectUser);
  const products            = useSelector(selectProducts);
  const { status, error, lastResult } = useSelector(selectSaleAction);

  const [form, setForm]         = useState(EMPTY);
  const [fieldErrors, setFE]    = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Load active products if needed
  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts({ token, params: { activeOnly: true } }));
    }
    dispatch(clearSaleState());
  }, []); // eslint-disable-line

  // Show success screen on completion
  useEffect(() => {
    if (status === 'succeeded') {
      setShowSuccess(true);
    }
  }, [status]);

  // Active products only (can't sell inactive)
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products]
  );

  const selectedProduct = useMemo(
    () => activeProducts.find((p) => String(p.id) === String(form.productId)) || null,
    [activeProducts, form.productId]
  );

  // ── Stock info for the selected product ───────────────────────────────────
  // We show the product's unit type so the user knows what "quantity" means
  const unitLabel = selectedProduct
    ? (UNIT_LABELS[selectedProduct.unitType] || selectedProduct.unitType)
    : '';

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.productId)
      e.productId = 'Seleccioná un producto';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      e.quantity = 'La cantidad debe ser mayor a cero';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (fieldErrors[field]) setFE((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    const payload = {
      productId: Number(form.productId),
      userId:    user?.id ?? null,
      quantity:  Number(form.quantity),
      notes:     form.notes.trim() || null,
    };

    dispatch(registerSale({ token, data: payload }));
  };

  const handleNew = () => {
    setForm(EMPTY);
    setFE({});
    setShowSuccess(false);
    dispatch(clearSaleState());
  };

  const handleClose = () => {
    dispatch(clearSaleState());
    onSuccess?.();
  };

  const isLoading = status === 'loading';

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return <SuccessView result={lastResult} onNew={handleNew} onClose={handleClose} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="sale-form">
      {error && <Alert type="error">{error}</Alert>}

      {/* Info banner: FEFO */}
      <div className="sale-fefo-hint">
        <span className="sale-fefo-icon">ℹ️</span>
        <p className="sale-fefo-text">
          El stock se descuenta automáticamente comenzando por los lotes más próximos a vencer
          <strong> (FEFO)</strong>. No se venden lotes vencidos.
        </p>
      </div>

      {/* ── Product selector ── */}
      <Field label="Producto a vender" required error={fieldErrors.productId}>
        <select
          className={`sale-select ${fieldErrors.productId ? 'err' : ''}`}
          value={form.productId}
          onChange={handleChange('productId')}
          disabled={isLoading}
        >
          <option value="">— Seleccioná un producto —</option>
          {activeProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.categoryName ? ` · ${p.categoryName}` : ''}
            </option>
          ))}
        </select>
      </Field>

      {/* Product hint */}
      {selectedProduct && (
        <div className="sale-product-hint">
          <span className="sale-product-chip origin">
            {selectedProduct.origin === 'FRANCHISE' ? '🏷 Franquicia' : '🌐 Externo'}
          </span>
          {selectedProduct.unitType && (
            <span className="sale-product-chip unit">
              Unidad: {unitLabel}
            </span>
          )}
          {selectedProduct.salePrice != null && selectedProduct.salePrice !== 0 && (
            <span className="sale-product-chip price">
              💲 {new Intl.NumberFormat('es-AR', {
                style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
              }).format(selectedProduct.salePrice)} / {unitLabel}
            </span>
          )}
        </div>
      )}

      {/* ── Quantity ── */}
      <Field
        label={`Cantidad${unitLabel ? ` (${unitLabel})` : ''}`}
        required
        error={fieldErrors.quantity}
        hint="El backend verificará que haya stock suficiente disponible"
      >
        <input
          className={`sale-input ${fieldErrors.quantity ? 'err' : ''}`}
          type="number"
          min="0.001"
          step="any"
          placeholder="Ej: 5"
          value={form.quantity}
          onChange={handleChange('quantity')}
          disabled={isLoading}
          autoFocus={!!form.productId}
        />
      </Field>

      {/* ── Notes ── */}
      <Field label="Observaciones">
        <textarea
          className="sale-textarea"
          placeholder="Ej: Venta mostrador turno tarde..."
          value={form.notes}
          onChange={handleChange('notes')}
          disabled={isLoading}
          rows={2}
        />
      </Field>

      {/* ── Actions ── */}
      <div className="sale-actions">
        {onCancel && (
          <button
            type="button"
            className="sale-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="sale-submit"
          disabled={isLoading || !form.productId}
        >
          {isLoading
            ? <><span className="sale-spinner" /> Registrando...</>
            : '🛒 Registrar venta'}
        </button>
      </div>

      <style>{`
        .sale-form { display: flex; flex-direction: column; gap: 16px; }

        /* FEFO hint */
        .sale-fefo-hint {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 12px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.07);
          border: 1px solid rgba(200,137,58,0.25);
        }
        .sale-fefo-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
        .sale-fefo-text {
          font-size: 0.8rem; color: var(--warm-gray);
          line-height: 1.5; margin: 0;
        }

        /* Field */
        .sf-field { display: flex; flex-direction: column; gap: 5px; }
        .sf-label {
          font-family: var(--font-body); font-size: 0.76rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray);
        }
        .sf-required { color: var(--amber); }
        .sf-hint  { font-size: 0.74rem; color: var(--warm-gray-light); line-height: 1.4; }
        .sf-error { font-size: 0.76rem; color: var(--error); font-weight: 600; }

        /* Inputs */
        .sale-select, .sale-input, .sale-textarea {
          width: 100%; padding: 12px 14px;
          font-family: var(--font-body); font-size: 0.92rem;
          color: var(--espresso); background: rgba(255,255,255,0.85);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; -webkit-appearance: none;
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
          box-sizing: border-box;
        }
        .sale-select  { cursor: pointer; }
        .sale-textarea { resize: vertical; }
        .sale-select:focus, .sale-input:focus, .sale-textarea:focus {
          border-color: var(--amber); background: #fff;
          box-shadow: 0 0 0 3px rgba(200,137,58,0.12);
        }
        .sale-select.err, .sale-input.err { border-color: var(--error); }
        .sale-select:disabled, .sale-input:disabled, .sale-textarea:disabled {
          opacity: 0.6; cursor: not-allowed;
        }

        /* Product hint chips */
        .sale-product-hint {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-top: -8px;
        }
        .sale-product-chip {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.74rem; font-weight: 600;
        }
        .sale-product-chip.origin { background: rgba(200,137,58,0.10); color: var(--amber-dark); }
        .sale-product-chip.unit   { background: var(--cream-dark); color: var(--warm-gray); }
        .sale-product-chip.price  { background: rgba(46,125,50,0.10); color: #2E7D32; }

        /* Actions */
        .sale-actions {
          display: flex; gap: 10px; flex-wrap: wrap;
          padding-top: 4px;
        }
        .sale-cancel {
          padding: 13px 22px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .sale-cancel:hover    { border-color: var(--warm-gray); color: var(--espresso); }
        .sale-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        .sale-submit {
          flex: 1; min-width: 180px;
          padding: 13px 24px; background: var(--success, #2E7D32);
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
          color: white; cursor: pointer;
          transition: all var(--transition-fast); box-shadow: 0 4px 16px rgba(46,125,50,0.22);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .sale-submit:hover:not(:disabled) {
          filter: brightness(1.08); transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(46,125,50,0.28);
        }
        .sale-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .sale-spinner {
          width: 17px; height: 17px;
          border: 2px solid white; border-top-color: transparent;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .sale-actions { flex-direction: column-reverse; }
          .sale-cancel, .sale-submit { width: 100%; min-width: unset; justify-content: center; }
        }
      `}</style>
    </form>
  );
}
