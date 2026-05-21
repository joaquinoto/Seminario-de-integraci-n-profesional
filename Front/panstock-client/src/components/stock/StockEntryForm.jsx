import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  registerStockEntry,
  clearEntryState,
  selectEntryAction,
} from '../../features/stock/stockSlice';
import { selectToken } from '../../features/auth/authSlice';
import { selectProducts, fetchProducts } from '../../features/catalog/productsSlice';
import { selectSuppliers, fetchSuppliers } from '../../features/catalog/suppliersSlice';
import { Alert } from '../ui/FormField';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_TYPES = [
  { value: '',                 label: '— Sin especificar —' },
  { value: 'ROOM_TEMPERATURE', label: '🌡 Temperatura ambiente' },
  { value: 'FRIDGE',           label: '❄️  Heladera' },
  { value: 'FREEZER',          label: '🧊 Freezer' },
  { value: 'DISPLAY',          label: '🍰 Mostrador / Vitrina' },
  { value: 'STORAGE',          label: '📦 Depósito' },
];

const UNIT_LABELS = {
  UNIT: 'Unid.', KG: 'kg', GRAM: 'g',
  TRAY: 'Band.', BAG: 'Bolsa', LITER: 'L', PACK: 'Pack',
};

const today = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  productId:      '',
  supplierId:     '',
  receivedDate:   today(),
  expirationDate: '',
  quantity:       '',
  unitCost:       '',
  unitSalePrice:  '',
  storageType:    '',
  notes:          '',
};

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, hint, children, required }) {
  return (
    <div className="ef-field">
      {label && (
        <label className="ef-label">
          {label}
          {required && <span className="ef-required">*</span>}
        </label>
      )}
      {children}
      {hint  && !error && <span className="ef-hint">{hint}</span>}
      {error && <span className="ef-error">{error}</span>}
    </div>
  );
}

// ─── Success screen ────────────────────────────────────────────────────────────
function SuccessView({ batch, onNew, onClose }) {
  const productName = batch?.productName || 'Producto';
  const qty         = batch?.currentQuantity ?? batch?.initialQuantity ?? '?';
  const expDate     = batch?.expirationDate
    ? new Date(batch.expirationDate + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="ef-success">
      <div className="ef-success-icon">✅</div>
      <h3 className="ef-success-title">¡Lote registrado!</h3>
      <p className="ef-success-desc">
        Se ingresaron <strong>{qty}</strong> unidades de <strong>{productName}</strong>
        {expDate && <> con vencimiento el <strong>{expDate}</strong></>}.
      </p>
      {batch?.id && (
        <span className="ef-success-badge">Lote #{batch.id}</span>
      )}
      <div className="ef-success-actions">
        <button className="ef-btn-secondary" onClick={onClose}>Volver al stock</button>
        <button className="ef-btn-primary" onClick={onNew}>+ Otro ingreso</button>
      </div>

      <style>{`
        .ef-success {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 8px 0 4px; text-align: center;
          animation: fadeIn 0.3s ease;
        }
        .ef-success-icon  { font-size: 3rem; }
        .ef-success-title {
          font-family: var(--font-display); font-size: 1.3rem;
          font-weight: 700; color: var(--espresso);
        }
        .ef-success-desc  {
          font-size: 0.9rem; color: var(--warm-gray);
          line-height: 1.6; max-width: 320px;
        }
        .ef-success-badge {
          display: inline-flex; align-items: center;
          padding: 4px 14px; border-radius: 20px;
          background: rgba(46,125,50,0.1); color: #2E7D32;
          font-size: 0.78rem; font-weight: 700;
        }
        .ef-success-actions {
          display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
          padding-top: 8px;
        }
        .ef-btn-secondary {
          padding: 11px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .ef-btn-secondary:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .ef-btn-primary {
          padding: 11px 22px; background: var(--amber); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.88rem; font-weight: 600; color: white; cursor: pointer;
          transition: all var(--transition-fast); box-shadow: var(--shadow-amber);
        }
        .ef-btn-primary:hover { background: var(--amber-dark); transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StockEntryForm({ onSuccess, onCancel }) {
  const dispatch          = useDispatch();
  const token             = useSelector(selectToken);
  const products          = useSelector(selectProducts);
  const suppliers         = useSelector(selectSuppliers);
  const { status, error, lastCreated } = useSelector(selectEntryAction);

  const [form, setForm]      = useState(EMPTY);
  const [fieldErrors, setFE] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Load products and suppliers if not already loaded
  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts({ token, params: { activeOnly: true } }));
    }
    if (suppliers.length === 0) {
      dispatch(fetchSuppliers({ token, params: { activeOnly: true } }));
    }
    dispatch(clearEntryState());
  }, []);  // eslint-disable-line

  // Show success screen when entry succeeded
  useEffect(() => {
    if (status === 'succeeded') {
      setShowSuccess(true);
    }
  }, [status]);

  // ── Selected product info ─────────────────────────────────────────────────
  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(form.productId)) || null,
    [products, form.productId]
  );

  const isPerishable = selectedProduct?.perishable === true;

  // Active products for dropdown
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products]
  );

  // Active suppliers for dropdown (plus the product's default supplier highlighted)
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active),
    [suppliers]
  );

  // ── Auto-fill supplier when product changes ───────────────────────────────
  useEffect(() => {
    if (selectedProduct?.defaultSupplierId) {
      setForm((p) => ({ ...p, supplierId: String(selectedProduct.defaultSupplierId) }));
    }
    // Clear expiration if product is not perishable
    if (selectedProduct && !selectedProduct.perishable) {
      setForm((p) => ({ ...p, expirationDate: '' }));
      setFE((p) => ({ ...p, expirationDate: undefined }));
    }
  }, [selectedProduct]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.productId)      e.productId    = 'Seleccioná un producto';
    if (!form.receivedDate)   e.receivedDate = 'La fecha de ingreso es obligatoria';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
                              e.quantity     = 'La cantidad debe ser mayor a cero';

    if (isPerishable && !form.expirationDate)
                              e.expirationDate = 'Este producto requiere fecha de vencimiento';

    if (form.expirationDate && form.receivedDate && form.expirationDate < form.receivedDate)
                              e.expirationDate = 'El vencimiento no puede ser anterior al ingreso';

    if (form.unitCost && (isNaN(Number(form.unitCost)) || Number(form.unitCost) < 0))
                              e.unitCost     = 'Debe ser un número positivo';
    if (form.unitSalePrice && (isNaN(Number(form.unitSalePrice)) || Number(form.unitSalePrice) < 0))
                              e.unitSalePrice= 'Debe ser un número positivo';
    return e;
  };

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
    if (fieldErrors[field]) setFE((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    const toNum = (v) => (v === '' || v == null ? null : Number(v));

    const payload = {
      productId:      Number(form.productId),
      supplierId:     form.supplierId ? Number(form.supplierId) : null,
      receivedDate:   form.receivedDate,
      expirationDate: form.expirationDate || null,
      quantity:       Number(form.quantity),
      unitCost:       toNum(form.unitCost),
      unitSalePrice:  toNum(form.unitSalePrice),
      storageType:    form.storageType || null,
      notes:          form.notes.trim() || null,
    };

    dispatch(registerStockEntry({ token, data: payload }));
  };

  const handleNewEntry = () => {
    setForm(EMPTY);
    setFE({});
    setShowSuccess(false);
    dispatch(clearEntryState());
  };

  const handleClose = () => {
    dispatch(clearEntryState());
    onSuccess?.();
  };

  const isLoading = status === 'loading';

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return <SuccessView batch={lastCreated} onNew={handleNewEntry} onClose={handleClose} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="ef-form">
      {error && <Alert type="error">{error}</Alert>}

      {/* ── Product selector ── */}
      <Field label="Producto" required error={fieldErrors.productId}>
        <select
          className={`ef-select ${fieldErrors.productId ? 'err' : ''}`}
          value={form.productId}
          onChange={handleChange('productId')}
          disabled={isLoading}
        >
          <option value="">— Seleccioná un producto —</option>
          {activeProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.perishable ? ' ⏰' : ''}
              {p.categoryName ? ` · ${p.categoryName}` : ''}
            </option>
          ))}
        </select>
      </Field>

      {/* Product hint */}
      {selectedProduct && (
        <div className="ef-product-hint">
          <span className={`ef-perishable-tag ${isPerishable ? 'yes' : 'no'}`}>
            {isPerishable ? '⏰ Perecedero — requiere vencimiento' : '✅ No perecedero'}
          </span>
          {selectedProduct.unitType && (
            <span className="ef-unit-tag">
              Unidad: {UNIT_LABELS[selectedProduct.unitType] || selectedProduct.unitType}
            </span>
          )}
        </div>
      )}

      {/* ── Supplier ── */}
      <Field label="Proveedor" hint="Opcional — se usa el proveedor por defecto del producto si no se especifica">
        <select
          className="ef-select"
          value={form.supplierId}
          onChange={handleChange('supplierId')}
          disabled={isLoading}
        >
          <option value="">— Sin especificar —</option>
          {activeSuppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {selectedProduct?.defaultSupplierId === s.id ? ' ★ (por defecto)' : ''}
            </option>
          ))}
        </select>
      </Field>

      {/* ── Dates row ── */}
      <div className="ef-row-2">
        <Field label="Fecha de ingreso" required error={fieldErrors.receivedDate}>
          <input
            className={`ef-input ${fieldErrors.receivedDate ? 'err' : ''}`}
            type="date"
            value={form.receivedDate}
            onChange={handleChange('receivedDate')}
            disabled={isLoading}
            max={today()}
          />
        </Field>

        <Field
          label="Fecha de vencimiento"
          required={isPerishable}
          error={fieldErrors.expirationDate}
          hint={!isPerishable ? 'No requerida para este producto' : undefined}
        >
          <input
            className={`ef-input ${fieldErrors.expirationDate ? 'err' : ''} ${!isPerishable ? 'muted' : ''}`}
            type="date"
            value={form.expirationDate}
            onChange={handleChange('expirationDate')}
            disabled={isLoading || !isPerishable}
            min={form.receivedDate || today()}
          />
        </Field>
      </div>

      {/* ── Quantity ── */}
      <Field
        label={`Cantidad${selectedProduct ? ` (${UNIT_LABELS[selectedProduct.unitType] || selectedProduct.unitType})` : ''}`}
        required
        error={fieldErrors.quantity}
      >
        <input
          className={`ef-input ${fieldErrors.quantity ? 'err' : ''}`}
          type="number"
          min="0.001"
          step="any"
          placeholder="Ej: 24"
          value={form.quantity}
          onChange={handleChange('quantity')}
          disabled={isLoading}
        />
      </Field>

      {/* ── Optional prices ── */}
      <details className="ef-details">
        <summary className="ef-summary">
          <span>Precios opcionales</span>
          <span className="ef-summary-hint">Si no se completan, se usan los del producto</span>
        </summary>
        <div className="ef-details-body">
          <div className="ef-row-2">
            <Field label="Costo unitario ($)" error={fieldErrors.unitCost}>
              <input
                className={`ef-input ${fieldErrors.unitCost ? 'err' : ''}`}
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.unitCost}
                onChange={handleChange('unitCost')}
                disabled={isLoading}
              />
            </Field>
            <Field label="Precio de venta ($)" error={fieldErrors.unitSalePrice}>
              <input
                className={`ef-input ${fieldErrors.unitSalePrice ? 'err' : ''}`}
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.unitSalePrice}
                onChange={handleChange('unitSalePrice')}
                disabled={isLoading}
              />
            </Field>
          </div>
        </div>
      </details>

      {/* ── Storage type ── */}
      <Field label="Tipo de almacenamiento">
        <select
          className="ef-select"
          value={form.storageType}
          onChange={handleChange('storageType')}
          disabled={isLoading}
        >
          {STORAGE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </Field>

      {/* ── Notes ── */}
      <Field label="Observaciones">
        <textarea
          className="ef-textarea"
          placeholder="Ej: Remito Nº 1234, proveedor entregó en buen estado..."
          value={form.notes}
          onChange={handleChange('notes')}
          disabled={isLoading}
          rows={3}
        />
      </Field>

      {/* ── Actions ── */}
      <div className="ef-actions">
        {onCancel && (
          <button type="button" className="ef-cancel" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </button>
        )}
        <button type="submit" className="ef-submit" disabled={isLoading}>
          {isLoading
            ? <><span className="ef-spinner" /> Registrando...</>
            : '📦 Registrar ingreso'}
        </button>
      </div>

      <style>{`
        .ef-form { display: flex; flex-direction: column; gap: 16px; }

        /* Field */
        .ef-field { display: flex; flex-direction: column; gap: 5px; }
        .ef-label {
          font-family: var(--font-body); font-size: 0.76rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray);
          display: flex; align-items: center; gap: 4px;
        }
        .ef-required { color: var(--amber); font-size: 0.85rem; }
        .ef-hint  { font-size: 0.74rem; color: var(--warm-gray-light); line-height: 1.4; }
        .ef-error { font-size: 0.76rem; color: var(--error); font-weight: 600; }

        /* Inputs */
        .ef-input, .ef-select, .ef-textarea {
          width: 100%; padding: 12px 14px;
          font-family: var(--font-body); font-size: 0.92rem;
          color: var(--espresso); background: rgba(255,255,255,0.8);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; transition: border-color var(--transition-base), box-shadow var(--transition-base);
          -webkit-appearance: none; box-sizing: border-box;
        }
        .ef-select  { cursor: pointer; padding-right: 14px; }
        .ef-textarea { resize: vertical; }
        .ef-input:focus, .ef-select:focus, .ef-textarea:focus {
          border-color: var(--amber); background: #fff;
          box-shadow: 0 0 0 3px rgba(200,137,58,0.12);
        }
        .ef-input.err, .ef-select.err { border-color: var(--error); }
        .ef-input.muted { opacity: 0.4; cursor: not-allowed; }
        .ef-input:disabled, .ef-select:disabled, .ef-textarea:disabled {
          opacity: 0.6; cursor: not-allowed;
        }

        /* Product hint tags */
        .ef-product-hint {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-top: -8px;
        }
        .ef-perishable-tag, .ef-unit-tag {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.74rem; font-weight: 600;
        }
        .ef-perishable-tag.yes { background: rgba(200,137,58,0.12); color: var(--amber-dark); }
        .ef-perishable-tag.no  { background: rgba(46,125,50,0.10);  color: #2E7D32; }
        .ef-unit-tag           { background: var(--cream-dark); color: var(--warm-gray); }

        /* 2-col row */
        .ef-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Details/summary for optional fields */
        .ef-details {
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: var(--cream); overflow: hidden;
        }
        .ef-summary {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; cursor: pointer;
          font-family: var(--font-body); font-size: 0.85rem; font-weight: 600;
          color: var(--espresso); list-style: none; user-select: none;
          transition: background var(--transition-fast);
        }
        .ef-summary::-webkit-details-marker { display: none; }
        .ef-summary:hover { background: var(--cream-dark); }
        .ef-summary-hint {
          font-size: 0.72rem; color: var(--warm-gray-light); font-weight: 400;
        }
        .ef-details-body { padding: 14px; border-top: 1px solid var(--cream-dark); }

        /* Actions */
        .ef-actions {
          display: flex; gap: 10px; justify-content: flex-end;
          padding-top: 4px; flex-wrap: wrap;
        }
        .ef-cancel {
          padding: 13px 22px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .ef-cancel:hover    { border-color: var(--warm-gray); color: var(--espresso); }
        .ef-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        .ef-submit {
          flex: 1; min-width: 200px;
          padding: 13px 24px; background: var(--espresso);
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
          color: var(--cream); cursor: pointer;
          transition: all var(--transition-fast); box-shadow: var(--shadow-md);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .ef-submit:hover:not(:disabled) {
          background: var(--espresso-mid); transform: translateY(-1px); box-shadow: var(--shadow-lg);
        }
        .ef-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ef-spinner {
          width: 17px; height: 17px;
          border: 2px solid var(--cream); border-top-color: transparent;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .ef-row-2  { grid-template-columns: 1fr; }
          .ef-submit { min-width: unset; }
          .ef-actions { flex-direction: column-reverse; }
          .ef-cancel, .ef-submit { width: 100%; justify-content: center; }
        }
      `}</style>
    </form>
  );
}