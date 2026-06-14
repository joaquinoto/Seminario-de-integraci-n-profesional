import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  registerSale,
  clearSaleState,
  selectSaleAction,
} from '../../features/stock/stockSlice';
import { selectToken, selectUser } from '../../features/auth/authSlice';
import { selectProducts, fetchProducts } from '../../features/catalog/productsSlice';
import {
  selectPromotions,
  extractExtendedType,
  calcEffectivePriceForSale,
} from '../../features/promotions/promotionsSlice';
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

// ─── Colores por tipo de promo ────────────────────────────────────────────────
const PROMO_STYLES = {
  TWO_FOR_ONE:     { bg: 'rgba(88,0,220,0.07)',  border: 'rgba(88,0,220,0.35)',  text: '#5500CC', badge: '#5500CC', label: '2x1' },
  SECOND_UNIT_50:  { bg: 'rgba(0,120,150,0.07)', border: 'rgba(0,120,150,0.35)', text: '#006080', badge: '#006080', label: '2da unidad 50%' },
  PERCENTAGE:      { bg: 'rgba(192,57,43,0.05)', border: 'rgba(192,57,43,0.30)', text: '#C0392B', badge: '#C0392B', label: 'Descuento' },
  FIXED_PRICE:     { bg: 'rgba(46,125,50,0.05)', border: 'rgba(46,125,50,0.25)', text: '#2E7D32', badge: '#2E7D32', label: 'Precio fijo' },
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

// ─── SuccessView ──────────────────────────────────────────────────────────────
function SuccessView({ result, promoInfo, onNew, onClose }) {
  const productName = result?.productName || 'Producto';
  const totalQty    = result?.totalQuantity ?? '?';
  const movements   = result?.movements ?? [];

  return (
    <div className="sf-success">
      <div className="sf-success-icon">🛒</div>
      <h3 className="sf-success-title">¡Venta registrada!</h3>
      <p className="sf-success-desc">
        Se registró la venta de <strong>{totalQty}</strong> unidades de{' '}
        <strong>{productName}</strong>
        {movements.length > 1 && <>, descontando de <strong>{movements.length} lotes</strong> (FEFO)</>}.
      </p>

      {promoInfo && (
        <div className="sf-promo-applied">
          🏷️ Precio registrado con promo activa:{' '}
          <strong style={{ color: promoInfo.style.text }}>
            {promoInfo.displayLabel}
          </strong>
          {promoInfo.detail && (
            <span style={{ color: 'var(--warm-gray)', fontWeight: 400 }}>
              {' '}· {promoInfo.detail}
            </span>
          )}
        </div>
      )}

      {!promoInfo && (
        <div className="sf-no-promo-applied">
          💲 Precio sin promoción registrado correctamente.
        </div>
      )}

      {movements.length > 0 && (
        <div className="sf-success-movements">
          {movements.map((m) => (
            <div key={m.id} className="sf-movement-row">
              <span className="sf-movement-badge">Lote #{m.batchId}</span>
              <span className="sf-movement-qty">−{m.quantity} u.</span>
              {m.unitSalePrice != null && (
                <span className="sf-movement-price">{formatARS(m.unitSalePrice)}/u.</span>
              )}
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
        .sf-no-promo-applied {
          padding: 8px 16px; border-radius: var(--radius-md);
          background: rgba(46,125,50,0.07); border: 1px solid rgba(46,125,50,0.2);
          font-size: 0.84rem; color: #2E7D32; font-weight: 500;
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
        .sf-movement-price { font-size: 0.72rem; color: var(--espresso); font-weight: 600; }
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

// ─── PromoBanner ──────────────────────────────────────────────────────────────
// Muestra la promo activa y calcula en tiempo real el precio según cantidad.
function PromoBanner({ promotion, originalPrice, quantity }) {
  const extType = extractExtendedType(promotion);
  const style   = PROMO_STYLES[extType || promotion?.discountType] || PROMO_STYLES.PERCENTAGE;
  const qty     = parseFloat(quantity) || 1;

  const effective = calcEffectivePriceForSale(promotion, originalPrice, qty);

  // Etiqueta del tipo de promo
  const promoTypeLabel = extType === 'TWO_FOR_ONE'
    ? '2 x 1'
    : extType === 'SECOND_UNIT_50'
      ? '2da unidad al 50%'
      : promotion?.discountType === 'PERCENTAGE'
        ? `−${promotion.discountPercentage}%`
        : 'Precio fijo';

  return (
    <div className="pb-banner" style={{ '--pb-bg': style.bg, '--pb-border': style.border, '--pb-text': style.text }}>
      {/* Cabecera */}
      <div className="pb-header">
        <span className="pb-badge" style={{ background: style.badge }}>
          🏷️ PROMO ACTIVA
        </span>
        <span className="pb-title">{promotion.title}</span>
        <span className="pb-type-chip" style={{ color: style.text, background: style.bg, border: `1px solid ${style.border}` }}>
          {promoTypeLabel}
        </span>
      </div>

      {/* Precios */}
      {effective && originalPrice && (
        <div className="pb-prices">
          <div className="pb-price-row">
            <span className="pb-price-label">Precio normal:</span>
            <span className="pb-price-original">{formatARS(originalPrice)}</span>
          </div>
          <div className="pb-price-row pb-price-row--main">
            <span className="pb-price-label">Precio unit. efectivo:</span>
            <span className="pb-price-effective" style={{ color: style.text }}>
              {formatARS(effective.unitPrice)}
            </span>
          </div>
          {effective.detail && (
            <p className="pb-detail">{effective.detail}</p>
          )}
        </div>
      )}

      {/* Subtotal en tiempo real (solo si hay cantidad válida y > 1) */}
      {effective && qty >= 1 && (
        <div className="pb-subtotal">
          <span className="pb-subtotal-label">
            Subtotal ({qty} u.):
          </span>
          <span className="pb-subtotal-value" style={{ color: style.text }}>
            {formatARS(effective.totalPrice)}
          </span>
          {originalPrice && (
            <span className="pb-subtotal-saving">
              ahorras {formatARS(originalPrice * qty - effective.totalPrice)}
            </span>
          )}
        </div>
      )}

      <p className="pb-note">
        El precio efectivo por unidad se registrará en el historial de esta venta.
      </p>

      <style>{`
        .pb-banner {
          display: flex; flex-direction: column; gap: 10px;
          padding: 13px 14px; border-radius: var(--radius-md);
          background: var(--pb-bg); border: 1.5px solid var(--pb-border);
          animation: fadeIn 0.25s ease;
        }
        .pb-header {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .pb-badge {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 4px;
          font-size: 0.64rem; font-weight: 800; color: white;
          letter-spacing: 0.05em; flex-shrink: 0;
        }
        .pb-title {
          font-size: 0.86rem; font-weight: 700; color: var(--espresso); flex: 1; min-width: 0;
        }
        .pb-type-chip {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.76rem; font-weight: 800; flex-shrink: 0; white-space: nowrap;
        }
        .pb-prices {
          display: flex; flex-direction: column; gap: 4px;
          padding: 8px 10px; border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.7);
        }
        .pb-price-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .pb-price-row--main { font-size: 1.02rem; }
        .pb-price-label { font-size: 0.76rem; color: var(--warm-gray); }
        .pb-price-original { font-size: 0.82rem; text-decoration: line-through; color: var(--warm-gray); }
        .pb-price-effective { font-weight: 800; font-size: 1.05rem; }
        .pb-detail { font-size: 0.73rem; color: var(--warm-gray); margin-top: 2px; font-style: italic; }

        .pb-subtotal {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 8px 10px; border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.85); border-top: 1px solid var(--pb-border);
        }
        .pb-subtotal-label { font-size: 0.78rem; color: var(--warm-gray); font-weight: 500; }
        .pb-subtotal-value { font-family: var(--font-display); font-size: 1.15rem; font-weight: 800; flex: 1; }
        .pb-subtotal-saving {
          font-size: 0.72rem; font-weight: 700; color: #2E7D32;
          background: rgba(46,125,50,0.09); padding: 2px 8px; border-radius: 10px;
          white-space: nowrap;
        }
        .pb-note {
          font-size: 0.72rem; color: var(--warm-gray); line-height: 1.4; margin: 0;
        }
      `}</style>
    </div>
  );
}

// ─── NoPriceBanner (cuando hay precio normal sin promo) ───────────────────────
function NoPriceBanner({ originalPrice, quantity }) {
  const qty = parseFloat(quantity) || 1;
  if (!originalPrice) return null;
  return (
    <div className="np-banner">
      <div className="np-row">
        <span className="np-label">💲 Precio sin promoción:</span>
        <span className="np-value">{formatARS(originalPrice)}</span>
      </div>
      {qty > 1 && (
        <div className="np-subtotal">
          <span className="np-sub-label">Subtotal ({qty} u.):</span>
          <span className="np-sub-val">{formatARS(originalPrice * qty)}</span>
        </div>
      )}
      <style>{`
        .np-banner {
          display: flex; flex-direction: column; gap: 6px;
          padding: 10px 13px; border-radius: var(--radius-md);
          background: rgba(46,125,50,0.05); border: 1px solid rgba(46,125,50,0.2);
          animation: fadeIn 0.2s ease;
        }
        .np-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .np-label { font-size: 0.82rem; color: var(--warm-gray); font-weight: 500; }
        .np-value { font-weight: 700; font-size: 1rem; color: #2E7D32; }
        .np-subtotal { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 4px; border-top: 1px solid rgba(46,125,50,0.15); }
        .np-sub-label { font-size: 0.76rem; color: var(--warm-gray); }
        .np-sub-val   { font-family: var(--font-display); font-size: 1rem; font-weight: 800; color: var(--espresso); }
      `}</style>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StockSaleForm({ onSuccess, onCancel, initialProductId }) {
  const dispatch             = useDispatch();
  const token                = useSelector(selectToken);
  const user                 = useSelector(selectUser);
  const products             = useSelector(selectProducts);
  const allPromotions        = useSelector(selectPromotions);
  const { status, error, lastResult } = useSelector(selectSaleAction);

  const [form, setForm]             = useState(() => buildEmpty(initialProductId));
  const [fieldErrors, setFE]        = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [appliedPromoInfo, setAppliedPromoInfo] = useState(null);

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
    setAppliedPromoInfo(null);
    dispatch(clearSaleState());
  }, [initialProductId]); // eslint-disable-line

  useEffect(() => {
    if (status === 'succeeded') setShowSuccess(true);
  }, [status]);

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

  // Promo activa para el producto seleccionado
  const activePromoForProduct = useMemo(() => {
    if (!form.productId || !allPromotions?.length) return null;
    const pid = Number(form.productId);
    return allPromotions.find(
      (p) => p.status === 'ACTIVE' && p.productId === pid
    ) || null;
  }, [form.productId, allPromotions]);

  // Precio base del producto/promo
  const originalPrice = useMemo(() => {
    if (!selectedProduct) return null;
    if (activePromoForProduct?.originalPrice) return parseFloat(activePromoForProduct.originalPrice);
    if (selectedProduct.salePrice) return parseFloat(selectedProduct.salePrice);
    return null;
  }, [selectedProduct, activePromoForProduct]);

  // Precio unitario efectivo calculado (según promo y cantidad)
  const effectivePriceInfo = useMemo(() => {
    const qty = parseFloat(form.quantity) || 1;
    if (activePromoForProduct && originalPrice) {
      return calcEffectivePriceForSale(activePromoForProduct, originalPrice, qty);
    }
    return null;
  }, [activePromoForProduct, originalPrice, form.quantity]);

  // ── Validación ────────────────────────────────────────────────────────────
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

  // Construir nota con info del precio real aplicado
  const buildNotes = (unitSalePrice) => {
    const parts = [];
    if (form.notes.trim()) parts.push(form.notes.trim());

    if (activePromoForProduct && effectivePriceInfo) {
      const extType = extractExtendedType(activePromoForProduct);
      let promoDesc = '';
      if (extType === 'TWO_FOR_ONE') {
        promoDesc = `Promo 2x1 → precio unit. efectivo: ${formatARS(effectivePriceInfo.unitPrice)} (${effectivePriceInfo.detail})`;
      } else if (extType === 'SECOND_UNIT_50') {
        promoDesc = `Promo 2da unidad al 50% → precio unit. efectivo: ${formatARS(effectivePriceInfo.unitPrice)} (${effectivePriceInfo.detail})`;
      } else if (activePromoForProduct.discountType === 'PERCENTAGE') {
        promoDesc = `Promo -${activePromoForProduct.discountPercentage}% → precio unit.: ${formatARS(unitSalePrice)}`;
      } else {
        promoDesc = `Promo precio fijo → ${formatARS(unitSalePrice)}/u.`;
      }
      parts.push(promoDesc);
    } else if (originalPrice && !activePromoForProduct) {
      parts.push(`Precio sin promo: ${formatARS(originalPrice)}/u.`);
    }

    return parts.length > 0 ? parts.join(' | ') : null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    const qty = parseFloat(form.quantity);

    // Calcular el unitSalePrice real a registrar
    let unitSalePrice = null;

    if (activePromoForProduct && originalPrice) {
      const info = calcEffectivePriceForSale(activePromoForProduct, originalPrice, qty);
      if (info) {
        unitSalePrice = info.unitPrice;
        setAppliedPromoInfo({
          ...info,
          style: PROMO_STYLES[extractExtendedType(activePromoForProduct) || activePromoForProduct.discountType] || PROMO_STYLES.PERCENTAGE,
        });
      }
    } else if (originalPrice) {
      // Sin promo: precio normal
      unitSalePrice = originalPrice;
      setAppliedPromoInfo(null);
    }

    const payload = {
      productId:    Number(form.productId),
      userId:       user?.id ?? null,
      quantity:     qty,
      unitSalePrice: unitSalePrice,           // ← precio real del momento
      notes:        buildNotes(unitSalePrice),
    };

    dispatch(registerSale({ token, data: payload }));
  };

  const handleNew = () => {
    setForm(buildEmpty(initialProductId));
    setFE({});
    setShowSuccess(false);
    setAppliedPromoInfo(null);
    dispatch(clearSaleState());
  };

  const handleClose = () => {
    dispatch(clearSaleState());
    onSuccess?.();
  };

  const isLoading = status === 'loading';

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <SuccessView
        result={lastResult}
        promoInfo={appliedPromoInfo}
        onNew={handleNew}
        onClose={handleClose}
      />
    );
  }

  const qtyNum = parseFloat(form.quantity) || 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="sale-form">
      {error && <Alert type="error">{error}</Alert>}

      {/* Info banner: FEFO */}
      <div className="sale-fefo-hint">
        <span className="sale-fefo-icon">ℹ️</span>
        <p className="sale-fefo-text">
          El stock se descuenta automáticamente comenzando por los lotes más próximos a vencer
          <strong> (FEFO)</strong>. El precio real del momento queda registrado en el historial.
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

      {/* ── Cantidad ── */}
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

      {/* ── Banner de precio ── */}
      {selectedProduct && (
        <>
          {activePromoForProduct ? (
            <PromoBanner
              promotion={activePromoForProduct}
              originalPrice={originalPrice}
              quantity={qtyNum || 1}
            />
          ) : (
            <NoPriceBanner
              originalPrice={originalPrice}
              quantity={qtyNum || 1}
            />
          )}
        </>
      )}

      {/* ── Observaciones ── */}
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

        .sf-field { display: flex; flex-direction: column; gap: 5px; }
        .sf-label {
          font-family: var(--font-body); font-size: 0.76rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray);
        }
        .sf-required { color: var(--amber); }
        .sf-hint  { font-size: 0.74rem; color: var(--warm-gray-light); line-height: 1.4; }
        .sf-error { font-size: 0.76rem; color: var(--error); font-weight: 600; }

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
