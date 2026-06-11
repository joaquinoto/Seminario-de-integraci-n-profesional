import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  registerSale,
  clearSaleState,
  selectSaleAction,
} from '../../features/stock/stockSlice';
import { selectToken, selectUser } from '../../features/auth/authSlice';
import { selectProducts, fetchProducts } from '../../features/catalog/productsSlice';
import { selectPromotions } from '../../features/promotions/promotionsSlice';
import { Alert } from '../ui/FormField';

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIT_LABELS = {
  UNIT: 'Unid.', KG: 'kg', GRAM: 'g',
  TRAY: 'Band.', BAG: 'Bolsa', LITER: 'L', PACK: 'Pack',
};

const buildEmpty = (initialProductId) => ({
  productId: initialProductId ? String(initialProductId) : '',
  quantity:  '',
  notes:     '',
});

const formatARS = (v) =>
  v != null
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(v)
    : null;

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
function SuccessView({ result, appliedPromo, onNew, onClose }) {
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

      {/* Indicar si se aplicó precio promocional */}
      {appliedPromo && (
        <div className="sf-promo-applied">
          🏷️ Precio de promoción aplicado:{' '}
          <strong style={{ color: '#C0392B' }}>
            {appliedPromo.discountType === 'PERCENTAGE'
              ? `−${appliedPromo.discountPercentage}%`
              : formatARS(appliedPromo.promotionalPrice)}
          </strong>
        </div>
      )}

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
        <button className="sf-btn-secondary" onClick={onClose}>Volver</button>
        <button className="sf-btn-primary" onClick={onNew}>+ Otra venta</button>
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
        .sf-promo-applied {
          padding: 8px 16px; border-radius: var(--radius-md);
          background: rgba(214,137,16,0.08); border: 1px solid rgba(214,137,16,0.3);
          font-size: 0.84rem; color: var(--warm-gray);
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
/**
 * StockSaleForm
 *
 * Si hay una promo activa para el producto seleccionado:
 *   - Muestra un banner con el precio promocional
 *   - Incluye el precio de promo en las notas del movimiento
 *   - El backend descuenta stock normalmente (FEFO), el precio queda en notas
 */
export default function StockSaleForm({ onSuccess, onCancel, initialProductId }) {
  const dispatch             = useDispatch();
  const token                = useSelector(selectToken);
  const user                 = useSelector(selectUser);
  const products             = useSelector(selectProducts);
  const allPromotions        = useSelector(selectPromotions);
  const { status, error, lastResult } = useSelector(selectSaleAction);

  const [form, setForm]           = useState(() => buildEmpty(initialProductId));
  const [fieldErrors, setFE]      = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Load active products if needed
  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts({ token, params: { activeOnly: true } }));
    }
    dispatch(clearSaleState());
  }, []); // eslint-disable-line

  useEffect(() => {
    setForm(buildEmpty(initialProductId));
    setFE({});
    setShowSuccess(false);
    setAppliedPromo(null);
    dispatch(clearSaleState());
  }, [initialProductId]); // eslint-disable-line

  useEffect(() => {
    if (status === 'succeeded') {
      setShowSuccess(true);
    }
  }, [status]);

  // Active products only
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products]
  );

  const selectedProduct = useMemo(
    () => activeProducts.find((p) => String(p.id) === String(form.productId)) || null,
    [activeProducts, form.productId]
  );

  const unitLabel = selectedProduct
    ? (UNIT_LABELS[selectedProduct.unitType] || selectedProduct.unitType)
    : '';

  // ── Buscar promo activa para el producto seleccionado ─────────────────────
  const activePromoForProduct = useMemo(() => {
    if (!form.productId || !allPromotions?.length) return null;
    const pid = Number(form.productId);
    return allPromotions.find(
      (p) => p.status === 'ACTIVE' && p.productId === pid
    ) || null;
  }, [form.productId, allPromotions]);

  // ── Calcular precio efectivo de venta ─────────────────────────────────────
  const effectivePrice = useMemo(() => {
    if (!selectedProduct) return null;

    if (activePromoForProduct) {
      if (activePromoForProduct.discountType === 'FIXED_PRICE' && activePromoForProduct.promotionalPrice) {
        return {
          price: Number(activePromoForProduct.promotionalPrice),
          isPromo: true,
          promoInfo: activePromoForProduct,
          originalPrice: selectedProduct.salePrice,
        };
      }
      if (activePromoForProduct.discountType === 'PERCENTAGE' && activePromoForProduct.discountPercentage) {
        const orig = selectedProduct.salePrice ?? activePromoForProduct.originalPrice;
        if (orig) {
          const discounted = Number(orig) * (1 - Number(activePromoForProduct.discountPercentage) / 100);
          return {
            price: discounted,
            isPromo: true,
            promoInfo: activePromoForProduct,
            originalPrice: orig,
          };
        }
      }
    }

    // Sin promo o no se pudo calcular
    if (selectedProduct.salePrice != null && selectedProduct.salePrice !== 0) {
      return {
        price: Number(selectedProduct.salePrice),
        isPromo: false,
        promoInfo: null,
        originalPrice: null,
      };
    }
    return null;
  }, [selectedProduct, activePromoForProduct]);

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

  // Construir nota con info de precio
  const buildNotes = () => {
    const parts = [];
    if (form.notes.trim()) parts.push(form.notes.trim());

    if (effectivePrice?.isPromo && effectivePrice.promoInfo) {
      const promo = effectivePrice.promoInfo;
      const priceStr = formatARS(effectivePrice.price) || `$${effectivePrice.price}`;
      const origStr  = effectivePrice.originalPrice ? formatARS(effectivePrice.originalPrice) : null;
      const promoDesc = promo.discountType === 'PERCENTAGE'
        ? `Promo: -${promo.discountPercentage}% → ${priceStr}${origStr ? ` (orig. ${origStr})` : ''}`
        : `Promo precio fijo: ${priceStr}${origStr ? ` (orig. ${origStr})` : ''}`;
      parts.push(promoDesc);
    } else if (effectivePrice && !effectivePrice.isPromo) {
      parts.push(`Precio: ${formatARS(effectivePrice.price)}`);
    }

    return parts.length > 0 ? parts.join(' | ') : null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    // Guardar la promo que se aplicó para mostrarla en el success screen
    if (effectivePrice?.isPromo) {
      setAppliedPromo(effectivePrice.promoInfo);
    } else {
      setAppliedPromo(null);
    }

    const payload = {
      productId: Number(form.productId),
      userId:    user?.id ?? null,
      quantity:  Number(form.quantity),
      notes:     buildNotes(),
    };

    dispatch(registerSale({ token, data: payload }));
  };

  const handleNew = () => {
    setForm(buildEmpty(initialProductId));
    setFE({});
    setShowSuccess(false);
    setAppliedPromo(null);
    dispatch(clearSaleState());
  };

  const handleClose = () => {
    dispatch(clearSaleState());
    onSuccess?.();
  };

  const isLoading = status === 'loading';

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return <SuccessView result={lastResult} appliedPromo={appliedPromo} onNew={handleNew} onClose={handleClose} />;
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

      {/* Product hint chips */}
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
        </div>
      )}

      {/* ── Banner de precio (promo activa o precio regular) ── */}
      {effectivePrice && (
        <div className={`sale-price-banner ${effectivePrice.isPromo ? 'promo' : 'regular'}`}>
          {effectivePrice.isPromo ? (
            <>
              <div className="spb-header">
                <span className="spb-promo-icon">🏷️</span>
                <span className="spb-promo-label">¡Promoción activa!</span>
                <span className="spb-promo-title">{effectivePrice.promoInfo.title}</span>
              </div>
              <div className="spb-prices">
                {effectivePrice.originalPrice && (
                  <span className="spb-original">{formatARS(effectivePrice.originalPrice)}</span>
                )}
                <span className="spb-arrow">→</span>
                <span className="spb-promo-price">{formatARS(effectivePrice.price)}</span>
                {effectivePrice.promoInfo.discountType === 'PERCENTAGE' && (
                  <span className="spb-discount-badge">
                    −{effectivePrice.promoInfo.discountPercentage}%
                  </span>
                )}
              </div>
              <p className="spb-note">
                Este precio quedará registrado en las notas del movimiento.
              </p>
            </>
          ) : (
            <div className="spb-regular">
              <span className="spb-regular-label">💲 Precio de venta:</span>
              <span className="spb-regular-price">{formatARS(effectivePrice.price)} / {unitLabel}</span>
            </div>
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
          autoFocus={Boolean(form.productId)}
        />
      </Field>

      {/* ── Subtotal estimado ── */}
      {effectivePrice && form.quantity && !isNaN(Number(form.quantity)) && Number(form.quantity) > 0 && (
        <div className="sale-subtotal">
          <span className="sale-subtotal-label">Subtotal estimado:</span>
          <span className="sale-subtotal-value" style={{ color: effectivePrice.isPromo ? '#C0392B' : 'var(--espresso)' }}>
            {formatARS(effectivePrice.price * Number(form.quantity))}
          </span>
        </div>
      )}

      {/* ── Notes ── */}
      <Field label="Observaciones adicionales">
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

        /* ── Banner de precio ── */
        .sale-price-banner {
          border-radius: var(--radius-md); padding: 12px 14px;
          display: flex; flex-direction: column; gap: 8px;
          animation: fadeIn 0.25s ease;
        }
        .sale-price-banner.promo {
          background: rgba(192,57,43,0.05);
          border: 1.5px solid rgba(192,57,43,0.3);
        }
        .sale-price-banner.regular {
          background: rgba(46,125,50,0.05);
          border: 1px solid rgba(46,125,50,0.2);
        }

        .spb-header {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .spb-promo-icon  { font-size: 1rem; flex-shrink: 0; }
        .spb-promo-label {
          font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.06em; color: #C0392B;
        }
        .spb-promo-title {
          font-size: 0.82rem; font-weight: 600; color: var(--espresso);
          background: rgba(192,57,43,0.08); padding: 2px 9px;
          border-radius: 12px;
        }

        .spb-prices {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .spb-original {
          text-decoration: line-through; font-size: 0.86rem;
          color: var(--warm-gray); font-weight: 500;
        }
        .spb-arrow { font-size: 0.82rem; color: var(--warm-gray); }
        .spb-promo-price {
          font-family: var(--font-display); font-size: 1.2rem;
          font-weight: 800; color: #C0392B;
        }
        .spb-discount-badge {
          padding: 3px 10px; border-radius: 20px;
          background: #C0392B; color: white;
          font-size: 0.74rem; font-weight: 800;
        }
        .spb-note {
          font-size: 0.74rem; color: var(--warm-gray); margin: 0;
        }

        .spb-regular {
          display: flex; align-items: center; gap: 10px;
        }
        .spb-regular-label { font-size: 0.82rem; color: var(--warm-gray); font-weight: 500; }
        .spb-regular-price {
          font-weight: 700; font-size: 1rem; color: #2E7D32;
        }

        /* Subtotal */
        .sale-subtotal {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-radius: var(--radius-md);
          background: var(--cream); border: 1px solid var(--cream-dark);
          animation: fadeIn 0.2s ease;
        }
        .sale-subtotal-label { font-size: 0.8rem; color: var(--warm-gray); font-weight: 500; }
        .sale-subtotal-value { font-family: var(--font-display); font-size: 1.1rem; font-weight: 800; }

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