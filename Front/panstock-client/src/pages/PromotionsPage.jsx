import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  fetchPromotionSuggestions,
  fetchPromotions,
  createPromotion,
  cancelPromotion,
  clearPromotionActionState,
  clearPromotionsState,
  selectPromotions,
  selectPromotionsStatus,
  selectPromotionsError,
  selectPromotionSuggestions,
  selectSuggestionsStatus,
  selectSuggestionsError,
  selectPromotionAction,
} from '../features/promotions/promotionsSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import { Modal, ConfirmDialog, TableSkeleton } from '../components/ui/CatalogUI';
import AppTopbar from '../components/layout/AppTopbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isOwner = (user) => user?.role === 'OWNER';

const PROMOTION_STATUS_CONFIG = {
  ACTIVE:    { label: 'Activa',    color: '#2E7D32', bg: 'rgba(46,125,50,0.10)',    icon: '✅' },
  CANCELLED: { label: 'Cancelada', color: '#C0392B', bg: 'rgba(192,57,43,0.10)',   icon: '🚫' },
  EXPIRED:   { label: 'Vencida',   color: '#8C7B6B', bg: 'rgba(140,123,107,0.10)', icon: '⏰' },
};

const EXPIRATION_STATUS_CONFIG = {
  RED:    { color: '#E74C3C', icon: '🔴', label: 'Vence hoy'    },
  YELLOW: { color: '#D68910', icon: '🟡', label: 'Vence pronto' },
  GREEN:  { color: '#1E8449', icon: '🟢', label: 'OK'           },
};

const DISCOUNT_TYPE_LABELS = {
  PERCENTAGE:  '% Porcentaje',
  FIXED_PRICE: '$ Precio fijo',
};

const formatARS = (v) =>
  v != null
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(v)
    : '—';

const formatDate = (d) => {
  if (!d) return '—';
  const date = typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d;
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatDateTime = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const calcDiscountedPrice = (originalPrice, discountPct) => {
  if (!originalPrice || !discountPct) return null;
  return parseFloat(originalPrice) * (1 - parseFloat(discountPct) / 100);
};

const nowBsAsISO = (addHours = 0) => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  d.setHours(d.getHours() + addHours);
  return d.toISOString().slice(0, 19);
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = PROMOTION_STATUS_CONFIG[status] || PROMOTION_STATUS_CONFIG.EXPIRED;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── DiscountChip ─────────────────────────────────────────────────────────────
function DiscountChip({ promotion }) {
  if (promotion.discountType === 'PERCENTAGE' && promotion.discountPercentage) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 12px', borderRadius: 20,
        fontSize: '0.88rem', fontWeight: 800,
        color: '#C0392B', background: 'rgba(192,57,43,0.10)',
      }}>
        −{promotion.discountPercentage}%
      </span>
    );
  }
  if (promotion.discountType === 'FIXED_PRICE' && promotion.promotionalPrice) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 12px', borderRadius: 20,
        fontSize: '0.88rem', fontWeight: 800,
        color: '#C0392B', background: 'rgba(192,57,43,0.10)',
      }}>
        {formatARS(promotion.promotionalPrice)}
      </span>
    );
  }
  return null;
}

// ─── SuggestionCard ──────────────────────────────────────────────────────────
function SuggestionCard({ suggestion, onActivate, activating, highlighted, cardRef }) {
  const expCfg = EXPIRATION_STATUS_CONFIG[suggestion.expirationStatus] || EXPIRATION_STATUS_CONFIG.YELLOW;

  const daysLabel = suggestion.daysToExpire === 0
    ? 'Vence HOY'
    : suggestion.daysToExpire === 1
      ? 'Vence mañana'
      : `Vence en ${suggestion.daysToExpire} días`;

  return (
    <div
      ref={cardRef}
      className={`sg-card ${highlighted ? 'sg-highlighted' : ''}`}
      style={{ '--exp-color': expCfg.color }}
    >
      {/* Urgency bar */}
      <div className="sg-urgency-bar" style={{ background: expCfg.color }} />

      <div className="sg-body">
        {/* Top row */}
        <div className="sg-top">
          <div className="sg-product-info">
            <span className="sg-product-name">{suggestion.productName}</span>
            <div className="sg-chips">
              <span className="sg-exp-chip" style={{ color: expCfg.color, background: expCfg.color + '18' }}>
                {expCfg.icon} {daysLabel}
              </span>
              <span className="sg-stock-chip">
                📦 {Number(suggestion.currentQuantity).toLocaleString('es-AR')} u. en stock
              </span>
              <span className="sg-batch-chip">
                Lote #{suggestion.batchId}
              </span>
            </div>
          </div>

          <div className="sg-discount-badge">
            <span className="sg-discount-pct">−{suggestion.suggestedDiscountPercentage}%</span>
            <span className="sg-discount-label">sugerido</span>
          </div>
        </div>

        {/* Dates */}
        <div className="sg-date-row">
          <span className="sg-date-label">📅 Vencimiento:</span>
          <span className="sg-date-val" style={{ color: expCfg.color, fontWeight: 700 }}>
            {formatDate(suggestion.expirationDate)}
          </span>
        </div>

        {/* Suggested title */}
        <div className="sg-title-preview">
          <span className="sg-title-label">Título sugerido:</span>
          <span className="sg-title-val">"{suggestion.suggestedTitle}"</span>
        </div>

        {/* CTA */}
        <button
          className="sg-activate-btn"
          onClick={() => onActivate(suggestion)}
          disabled={activating}
          style={{ '--btn-color': expCfg.color }}
        >
          {activating ? <span className="sg-spinner" /> : '🏷️ Dar de alta esta promoción'}
        </button>
      </div>

      <style>{`
        .sg-card {
          display: flex; align-items: stretch;
          background: white; border-radius: var(--radius-lg);
          border: 1.5px solid var(--exp-color, #D68910);
          box-shadow: var(--shadow-sm); overflow: hidden;
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast), border-width 0.2s;
        }
        .sg-card:hover { box-shadow: var(--shadow-md); }

        /* Highlight cuando se llega desde /expiration */
        .sg-highlighted {
          border-width: 2.5px;
          box-shadow: 0 0 0 4px rgba(200,137,58,0.20), var(--shadow-md);
          animation: highlightPulse 1.8s ease 3;
        }
        @keyframes highlightPulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(200,137,58,0.20), var(--shadow-md); }
          50%      { box-shadow: 0 0 0 8px rgba(200,137,58,0.10), var(--shadow-lg); }
        }

        .sg-urgency-bar { width: 4px; flex-shrink: 0; background: var(--exp-color); }
        .sg-body { flex: 1; padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 10px; }

        .sg-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .sg-product-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        .sg-product-name { font-weight: 700; font-size: 0.96rem; color: var(--espresso); }
        .sg-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .sg-exp-chip, .sg-stock-chip, .sg-batch-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 20px; font-size: 0.73rem; font-weight: 600;
        }
        .sg-stock-chip { background: var(--cream-dark); color: var(--warm-gray); }
        .sg-batch-chip { background: rgba(28,17,8,0.06); color: var(--warm-gray); }

        .sg-discount-badge {
          display: flex; flex-direction: column; align-items: center;
          padding: 8px 12px; border-radius: var(--radius-md);
          background: rgba(192,57,43,0.08); flex-shrink: 0;
        }
        .sg-discount-pct   { font-weight: 800; font-size: 1.2rem; color: #C0392B; line-height: 1; }
        .sg-discount-label { font-size: 0.62rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

        .sg-date-row { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; }
        .sg-date-label { color: var(--warm-gray); }

        .sg-title-preview { display: flex; align-items: center; gap: 7px; font-size: 0.8rem; }
        .sg-title-label { color: var(--warm-gray); flex-shrink: 0; }
        .sg-title-val { color: var(--espresso); font-style: italic; }

        .sg-activate-btn {
          width: 100%; padding: 12px 16px;
          background: var(--btn-color, #D68910); color: white;
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 700;
          cursor: pointer; transition: all var(--transition-fast);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.15);
        }
        .sg-activate-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .sg-activate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sg-spinner {
          width: 16px; height: 16px; border: 2px solid white;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ─── PromotionCard ────────────────────────────────────────────────────────────
function PromotionCard({ promotion, onCancel, cancelling, isOwnerUser, highlighted, cardRef, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const cfg = PROMOTION_STATUS_CONFIG[promotion.status] || PROMOTION_STATUS_CONFIG.EXPIRED;

  // Abrir automáticamente si viene con highlight
  useEffect(() => {
    if (highlighted) setExpanded(true);
  }, [highlighted]);

  const daysLabel = promotion.daysToExpire != null
    ? promotion.daysToExpire === 0 ? 'Vence HOY'
    : promotion.daysToExpire < 0  ? `Venció hace ${Math.abs(promotion.daysToExpire)}d`
    : `Vence en ${promotion.daysToExpire}d`
    : null;

  const discountedPrice = promotion.discountType === 'PERCENTAGE' && promotion.discountPercentage && promotion.originalPrice
    ? calcDiscountedPrice(promotion.originalPrice, promotion.discountPercentage)
    : promotion.promotionalPrice;

  const savingsAmount = promotion.originalPrice && discountedPrice
    ? parseFloat(promotion.originalPrice) - parseFloat(discountedPrice)
    : null;

  return (
    <div
      ref={cardRef}
      className={`pc-card ${promotion.status.toLowerCase()} ${highlighted ? 'pc-highlighted' : ''}`}
    >
      <div className="pc-header" onClick={() => setExpanded((v) => !v)} role="button" aria-expanded={expanded}>
        <div className="pc-indicator" style={{ background: cfg.color }} />
        <div className="pc-main">
          <div className="pc-row1">
            <div className="pc-name-group">
              <span className="pc-title">{promotion.title}</span>
              <span className="pc-product">
                {promotion.productName}
                {promotion.batchId && (
                  <span style={{ color: 'var(--warm-gray-light)', fontWeight: 400 }}> · Lote #{promotion.batchId}</span>
                )}
              </span>
            </div>
            <div className="pc-badges">
              <StatusBadge status={promotion.status} />
              {promotion.suggestedBySystem && (
                <span className="pc-system-badge">🤖 Sistema</span>
              )}
            </div>
          </div>

          <div className="pc-row2">
            <DiscountChip promotion={promotion} />
            {promotion.originalPrice && discountedPrice && (
              <div className="pc-price-info">
                <span className="pc-original-price">{formatARS(promotion.originalPrice)}</span>
                <span className="pc-arrow">→</span>
                <span className="pc-new-price" style={{ color: '#C0392B' }}>{formatARS(discountedPrice)}</span>
                {savingsAmount > 0 && (
                  <span className="pc-savings">ahorras {formatARS(savingsAmount)}</span>
                )}
              </div>
            )}
          </div>

          <div className="pc-meta">
            <span className="pc-dates">
              📅 {formatDateTime(promotion.startDate)} → {formatDateTime(promotion.endDate)}
            </span>
            {daysLabel && promotion.batchExpirationDate && (
              <span className="pc-batch-exp" style={{ color: promotion.daysToExpire <= 1 ? '#C0392B' : '#D68910' }}>
                ⏰ Lote: {daysLabel}
              </span>
            )}
            {promotion.batchCurrentQuantity != null && (
              <span className="pc-qty">📦 {Number(promotion.batchCurrentQuantity).toLocaleString('es-AR')} u.</span>
            )}
            <span className="pc-expand-icon">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="pc-detail">
          <div className="pc-detail-grid">
            {promotion.description && (
              <div className="pd-item full">
                <span className="pd-label">Descripción</span>
                <span>{promotion.description}</span>
              </div>
            )}
            <div className="pd-item">
              <span className="pd-label">Tipo de descuento</span>
              <span>{DISCOUNT_TYPE_LABELS[promotion.discountType] || promotion.discountType}</span>
            </div>
            {promotion.discountType === 'PERCENTAGE' && (
              <div className="pd-item">
                <span className="pd-label">Porcentaje</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>−{promotion.discountPercentage}%</span>
              </div>
            )}
            {promotion.discountType === 'FIXED_PRICE' && (
              <div className="pd-item">
                <span className="pd-label">Precio promocional</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>{formatARS(promotion.promotionalPrice)}</span>
              </div>
            )}
            {promotion.batchId && (
              <div className="pd-item">
                <span className="pd-label">Lote</span>
                <span>#{promotion.batchId} · vence {formatDate(promotion.batchExpirationDate)}</span>
              </div>
            )}
            {promotion.createdByName && (
              <div className="pd-item">
                <span className="pd-label">Creado por</span>
                <span>{promotion.createdByName}</span>
              </div>
            )}
            <div className="pd-item">
              <span className="pd-label">Creado el</span>
              <span>{formatDateTime(promotion.createdAt)}</span>
            </div>
            <div className="pd-item">
              <span className="pd-label">ID Promoción</span>
              <span className="pd-mono">#{promotion.id}</span>
            </div>
          </div>

          {isOwnerUser && promotion.status === 'ACTIVE' && (
            <button
              className="pc-cancel-btn"
              onClick={() => onCancel(promotion)}
              disabled={cancelling}
            >
              {cancelling ? <span className="pc-spinner" /> : '🚫 Cancelar promoción'}
            </button>
          )}
        </div>
      )}

      <style>{`
        .pc-card {
          background: white; border-radius: var(--radius-lg);
          border: 1.5px solid var(--cream-dark);
          box-shadow: var(--shadow-sm); overflow: hidden;
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast);
        }
        .pc-card:hover { box-shadow: var(--shadow-md); }
        .pc-card.cancelled { opacity: 0.65; }
        .pc-card.expired   { opacity: 0.70; }

        /* Highlight cuando se llega desde /expiration */
        .pc-highlighted {
          border-color: #2E7D32; border-width: 2.5px;
          box-shadow: 0 0 0 4px rgba(46,125,50,0.15), var(--shadow-md);
          animation: highlightPulseGreen 1.8s ease 3;
        }
        @keyframes highlightPulseGreen {
          0%,100% { box-shadow: 0 0 0 4px rgba(46,125,50,0.15), var(--shadow-md); }
          50%      { box-shadow: 0 0 0 8px rgba(46,125,50,0.08), var(--shadow-lg); }
        }

        .pc-header {
          display: flex; align-items: stretch; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .pc-indicator { width: 4px; flex-shrink: 0; }
        .pc-main { flex: 1; padding: 13px 14px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }

        .pc-row1 { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .pc-name-group { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .pc-title   { font-weight: 700; font-size: 0.95rem; color: var(--espresso); word-break: break-word; }
        .pc-product { font-size: 0.76rem; color: var(--warm-gray); }
        .pc-badges  { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
        .pc-system-badge {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 3px 9px; border-radius: 20px; font-size: 0.68rem; font-weight: 700;
          color: #1565C0; background: rgba(21,101,192,0.10);
        }

        .pc-row2 { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .pc-price-info { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .pc-original-price { text-decoration: line-through; font-size: 0.8rem; color: var(--warm-gray); }
        .pc-arrow { font-size: 0.8rem; color: var(--warm-gray); }
        .pc-new-price { font-weight: 800; font-size: 0.96rem; }
        .pc-savings {
          font-size: 0.7rem; font-weight: 700; color: #2E7D32;
          background: rgba(46,125,50,0.09); padding: 2px 7px; border-radius: 10px;
        }

        .pc-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.76rem; color: var(--warm-gray); }
        .pc-dates     { flex: 1; min-width: 0; }
        .pc-batch-exp { font-weight: 600; flex-shrink: 0; }
        .pc-qty       { flex-shrink: 0; }
        .pc-expand-icon { font-size: 0.65rem; color: var(--warm-gray-light); margin-left: auto; flex-shrink: 0; }

        .pc-detail {
          border-top: 1px solid var(--cream-dark);
          background: rgba(200,137,58,0.02);
          padding: 14px 18px; display: flex; flex-direction: column; gap: 14px;
          animation: fadeIn 0.2s ease;
        }
        .pc-detail-grid { display: flex; flex-wrap: wrap; gap: 14px; }
        .pd-item { display: flex; flex-direction: column; gap: 2px; min-width: 100px; }
        .pd-item.full { width: 100%; min-width: unset; }
        .pd-label {
          font-size: 0.63rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--warm-gray-light);
        }
        .pd-mono { font-family: monospace; font-size: 0.82rem; color: var(--warm-gray); }

        .pc-cancel-btn {
          align-self: flex-start; padding: 9px 18px;
          background: transparent; color: #C0392B;
          border: 1.5px solid rgba(192,57,43,0.4); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
          display: flex; align-items: center; gap: 7px;
        }
        .pc-cancel-btn:hover:not(:disabled) { background: rgba(192,57,43,0.08); border-color: #C0392B; }
        .pc-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pc-spinner {
          width: 14px; height: 14px; border: 2px solid #C0392B;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ─── CreatePromotionForm ──────────────────────────────────────────────────────
function CreatePromotionForm({ suggestion, onSuccess, onCancel }) {
  const dispatch = useDispatch();
  const token    = useSelector(selectToken);
  const user     = useSelector(selectUser);
  const { status, error } = useSelector(selectPromotionAction);

  const [form, setForm] = useState({
    title:              suggestion?.suggestedTitle || '',
    description:        '',
    discountType:       'PERCENTAGE',
    discountPercentage: suggestion?.suggestedDiscountPercentage
                          ? String(suggestion.suggestedDiscountPercentage)
                          : '10',
    promotionalPrice:   '',
    startDate: nowBsAsISO(0),
    endDate:   suggestion?.expirationDate
                 ? suggestion.expirationDate + 'T23:59:00'
                 : nowBsAsISO(24),
  });
  const [fieldErrors, setFE] = useState({});

  useEffect(() => {
    if (status === 'succeeded') {
      dispatch(clearPromotionActionState());
      onSuccess?.();
    }
  }, [status, dispatch, onSuccess]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'El título es obligatorio';
    if (!form.discountType) e.discountType = 'Seleccioná un tipo';
    if (form.discountType === 'PERCENTAGE') {
      const pct = Number(form.discountPercentage);
      if (!form.discountPercentage || isNaN(pct) || pct < 1 || pct > 100)
        e.discountPercentage = 'Ingresá un porcentaje entre 1 y 100';
    }
    if (form.discountType === 'FIXED_PRICE') {
      const price = Number(form.promotionalPrice);
      if (!form.promotionalPrice || isNaN(price) || price <= 0)
        e.promotionalPrice = 'Ingresá un precio mayor a cero';
    }
    if (!form.startDate) e.startDate = 'La fecha de inicio es obligatoria';
    if (!form.endDate)   e.endDate   = 'La fecha de fin es obligatoria';
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      e.endDate = 'La fecha de fin debe ser posterior a la de inicio';
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
      productId:          suggestion.productId,
      batchId:            suggestion.batchId,
      createdById:        user?.id ?? null,
      title:              form.title.trim(),
      description:        form.description.trim() || null,
      discountType:       form.discountType,
      discountPercentage: form.discountType === 'PERCENTAGE' ? Number(form.discountPercentage) : null,
      promotionalPrice:   form.discountType === 'FIXED_PRICE' ? Number(form.promotionalPrice) : null,
      startDate:          form.startDate,
      endDate:            form.endDate,
      suggestedBySystem:  true,
    };

    dispatch(createPromotion({ token, data: payload }));
  };

  const isLoading = status === 'loading';

  return (
    <form onSubmit={handleSubmit} noValidate className="cpf-form">
      {error && (
        <div className="cpf-error">⚠ {error}</div>
      )}

      {/* Contexto del lote */}
      {suggestion && (
        <div className="cpf-context">
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Producto</span>
            <span className="cpf-ctx-val">{suggestion.productName}</span>
          </div>
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Lote</span>
            <span className="cpf-ctx-val">#{suggestion.batchId}</span>
          </div>
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Stock disponible</span>
            <span className="cpf-ctx-val">{Number(suggestion.currentQuantity).toLocaleString('es-AR')} u.</span>
          </div>
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Vencimiento del lote</span>
            <span className="cpf-ctx-val" style={{
              color: suggestion.daysToExpire === 0 ? '#C0392B' : '#D68910',
              fontWeight: 700
            }}>
              {formatDate(suggestion.expirationDate)}
              {' '}
              ({suggestion.daysToExpire === 0 ? 'HOY' : `en ${suggestion.daysToExpire}d`})
            </span>
          </div>
        </div>
      )}

      {/* Título */}
      <div className="cpf-field">
        <label className="cpf-label">Título de la promoción *</label>
        <input
          className={`cpf-input ${fieldErrors.title ? 'err' : ''}`}
          placeholder="Ej: Promo Medialuna de Manteca"
          value={form.title}
          onChange={handleChange('title')}
          disabled={isLoading}
          autoFocus
        />
        {fieldErrors.title && <span className="cpf-err">{fieldErrors.title}</span>}
      </div>

      {/* Descripción */}
      <div className="cpf-field">
        <label className="cpf-label">Descripción (opcional)</label>
        <textarea
          className="cpf-textarea"
          placeholder="Descripción visible para los empleados..."
          value={form.description}
          onChange={handleChange('description')}
          disabled={isLoading}
          rows={2}
        />
      </div>

      {/* Tipo de descuento */}
      <div className="cpf-field">
        <label className="cpf-label">Tipo de descuento *</label>
        <div className="cpf-type-grid">
          {[
            { v: 'PERCENTAGE',  label: '% Porcentaje', hint: 'Ej: 20% de descuento' },
            { v: 'FIXED_PRICE', label: '$ Precio fijo', hint: 'Ej: $1.500 final' },
          ].map((opt) => (
            <label key={opt.v} className={`cpf-type-opt ${form.discountType === opt.v ? 'selected' : ''}`}>
              <input
                type="radio"
                name="discountType"
                value={opt.v}
                checked={form.discountType === opt.v}
                onChange={handleChange('discountType')}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
              <span className="cpf-type-label">{opt.label}</span>
              <span className="cpf-type-hint">{opt.hint}</span>
            </label>
          ))}
        </div>
        {fieldErrors.discountType && <span className="cpf-err">{fieldErrors.discountType}</span>}
      </div>

      {/* Porcentaje o precio fijo */}
      {form.discountType === 'PERCENTAGE' && (
        <div className="cpf-field">
          <label className="cpf-label">Porcentaje de descuento (%) *</label>
          <input
            className={`cpf-input ${fieldErrors.discountPercentage ? 'err' : ''}`}
            type="number" min="1" max="100" step="1"
            placeholder="Ej: 20"
            value={form.discountPercentage}
            onChange={handleChange('discountPercentage')}
            disabled={isLoading}
          />
          {fieldErrors.discountPercentage && <span className="cpf-err">{fieldErrors.discountPercentage}</span>}
        </div>
      )}
      {form.discountType === 'FIXED_PRICE' && (
        <div className="cpf-field">
          <label className="cpf-label">Precio promocional ($) *</label>
          <input
            className={`cpf-input ${fieldErrors.promotionalPrice ? 'err' : ''}`}
            type="number" min="1" step="0.01"
            placeholder="Ej: 1500"
            value={form.promotionalPrice}
            onChange={handleChange('promotionalPrice')}
            disabled={isLoading}
          />
          {fieldErrors.promotionalPrice && <span className="cpf-err">{fieldErrors.promotionalPrice}</span>}
        </div>
      )}

      {/* Fechas */}
      <div className="cpf-dates-grid">
        <div className="cpf-field">
          <label className="cpf-label">Inicio de la promoción *</label>
          <input
            className={`cpf-input ${fieldErrors.startDate ? 'err' : ''}`}
            type="datetime-local"
            value={form.startDate}
            onChange={handleChange('startDate')}
            disabled={isLoading}
          />
          {fieldErrors.startDate && <span className="cpf-err">{fieldErrors.startDate}</span>}
        </div>
        <div className="cpf-field">
          <label className="cpf-label">Fin de la promoción *</label>
          <input
            className={`cpf-input ${fieldErrors.endDate ? 'err' : ''}`}
            type="datetime-local"
            value={form.endDate}
            onChange={handleChange('endDate')}
            disabled={isLoading}
          />
          {fieldErrors.endDate && <span className="cpf-err">{fieldErrors.endDate}</span>}
          <span className="cpf-hint">Se recomienda hasta la fecha de vencimiento del lote</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="cpf-actions">
        <button type="button" className="cpf-cancel" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </button>
        <button type="submit" className="cpf-submit" disabled={isLoading}>
          {isLoading
            ? <><span className="cpf-spinner" /> Creando...</>
            : '🏷️ Dar de alta promoción'}
        </button>
      </div>

      <style>{`
        .cpf-form { display: flex; flex-direction: column; gap: 16px; }

        .cpf-context {
          padding: 12px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.06); border: 1px solid rgba(200,137,58,0.22);
          display: flex; flex-direction: column; gap: 7px;
        }
        .cpf-ctx-row   { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .cpf-ctx-label { font-size: 0.72rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .cpf-ctx-val   { font-size: 0.85rem; font-weight: 600; color: var(--espresso); text-align: right; }

        .cpf-error {
          padding: 10px 14px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.84rem; font-weight: 500;
        }

        .cpf-field { display: flex; flex-direction: column; gap: 5px; }
        .cpf-label {
          font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--warm-gray);
        }
        .cpf-err  { font-size: 0.75rem; color: var(--error); font-weight: 500; }
        .cpf-hint { font-size: 0.72rem; color: var(--warm-gray-light); }

        .cpf-input, .cpf-textarea {
          width: 100%; padding: 11px 13px;
          font-family: var(--font-body); font-size: 0.9rem;
          color: var(--espresso); background: rgba(255,255,255,0.8);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; -webkit-appearance: none; box-sizing: border-box;
          transition: border-color var(--transition-base);
        }
        .cpf-textarea { resize: vertical; }
        .cpf-input:focus, .cpf-textarea:focus {
          border-color: var(--amber); background: #fff;
          box-shadow: 0 0 0 3px rgba(200,137,58,0.12);
        }
        .cpf-input.err { border-color: var(--error); }

        .cpf-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .cpf-type-opt {
          display: flex; flex-direction: column; gap: 3px;
          padding: 11px 13px; border-radius: var(--radius-md);
          border: 1.5px solid var(--cream-dark); background: var(--cream);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .cpf-type-opt.selected { border-color: var(--amber); background: rgba(200,137,58,0.05); }
        .cpf-type-label { font-weight: 700; font-size: 0.88rem; color: var(--espresso); }
        .cpf-type-hint  { font-size: 0.72rem; color: var(--warm-gray); }

        .cpf-dates-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .cpf-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 8px; border-top: 1px solid var(--cream-dark); }
        .cpf-cancel {
          padding: 11px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .cpf-cancel:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .cpf-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
        .cpf-submit {
          flex: 1; padding: 11px 22px;
          background: var(--amber); border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 700;
          color: white; cursor: pointer; transition: all var(--transition-fast);
          box-shadow: var(--shadow-amber);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          min-width: 180px;
        }
        .cpf-submit:hover:not(:disabled) { background: var(--amber-dark); transform: translateY(-1px); }
        .cpf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .cpf-spinner {
          width: 16px; height: 16px; border: 2px solid white;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @media (max-width: 480px) {
          .cpf-type-grid  { grid-template-columns: 1fr; }
          .cpf-dates-grid { grid-template-columns: 1fr; }
          .cpf-actions    { flex-direction: column-reverse; }
          .cpf-cancel, .cpf-submit { width: 100%; min-width: unset; justify-content: center; }
        }
      `}</style>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const dispatch    = useDispatch();
  const token       = useSelector(selectToken);
  const user        = useSelector(selectUser);
  const [searchParams, setSearchParams] = useSearchParams();

  const promotions        = useSelector(selectPromotions);
  const listStatus        = useSelector(selectPromotionsStatus);
  const listError         = useSelector(selectPromotionsError);
  const suggestions       = useSelector(selectPromotionSuggestions);
  const suggestionsStatus = useSelector(selectSuggestionsStatus);
  const suggestionsError  = useSelector(selectSuggestionsError);
  const { status: actionStatus, error: actionError } = useSelector(selectPromotionAction);

  const ownerUser = isOwner(user);

  // ── Leer query params de entrada ──────────────────────────────────────────
  // ?tab=suggestions&batchId=22   → viene de "Activar promo" en /expiration
  // ?tab=active&promoId=5         → viene de "Ver promo"     en /expiration
  const qTab     = searchParams.get('tab');      // 'suggestions' | 'active' | 'all'
  const qBatchId = searchParams.get('batchId');  // número como string
  const qPromoId = searchParams.get('promoId');  // número como string

  // Tab inicial: prioridad query param → default según rol
  const resolveInitialTab = () => {
    if (qTab === 'suggestions' && ownerUser) return 'suggestions';
    if (qTab === 'active')                   return 'active';
    if (qTab === 'all')                      return 'all';
    return ownerUser ? 'suggestions' : 'active';
  };

  const [activeTab,          setActiveTab]         = useState(resolveInitialTab);
  const [modalSuggestion,    setModalSuggestion]   = useState(null);
  const [confirmCancelItem,  setConfirmCancelItem] = useState(null);
  const [search,             setSearch]            = useState('');
  const [statusFilter,       setStatusFilter]      = useState('');

  // Refs para scroll hacia el elemento resaltado
  const highlightedSuggestionRef = useRef(null);
  const highlightedPromoRef      = useRef(null);

  // ── Cargar datos al montar ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    dispatch(fetchPromotions({ token }));
    if (ownerUser) {
      dispatch(fetchPromotionSuggestions({ token }));
    }
  }, [token, ownerUser, dispatch]);

  // ── Scroll al elemento resaltado una vez que los datos estén listos ────────
  useEffect(() => {
    if (qBatchId && suggestionsStatus === 'succeeded' && activeTab === 'suggestions') {
      // Pequeño delay para que React haya renderizado los cards
      const timer = setTimeout(() => {
        highlightedSuggestionRef.current?.scrollIntoView({
          behavior: 'smooth', block: 'center',
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [qBatchId, suggestionsStatus, activeTab]);

  useEffect(() => {
    if (qPromoId && listStatus === 'succeeded' && activeTab === 'active') {
      const timer = setTimeout(() => {
        highlightedPromoRef.current?.scrollIntoView({
          behavior: 'smooth', block: 'center',
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [qPromoId, listStatus, activeTab]);

  // ── Limpiar query params al cambiar de tab manualmente ────────────────────
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Solo limpiar si había params de navegación externos
    if (qTab || qBatchId || qPromoId) {
      setSearchParams({});
    }
  };

  // ── Refresh ───────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    dispatch(fetchPromotions({ token }));
    if (ownerUser) dispatch(fetchPromotionSuggestions({ token }));
  }, [dispatch, token, ownerUser]);

  // ── Filtro de lista ───────────────────────────────────────────────────────
  const filteredPromotions = useMemo(() => {
    let list = [...promotions];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title        || '').toLowerCase().includes(q) ||
          (p.productName  || '').toLowerCase().includes(q) ||
          (p.description  || '').toLowerCase().includes(q) ||
          (p.createdByName|| '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [promotions, statusFilter, search]);

  const activePromotions = useMemo(
    () => promotions.filter((p) => p.status === 'ACTIVE'),
    [promotions]
  );

  const stats = useMemo(() => ({
    total:     promotions.length,
    active:    promotions.filter((p) => p.status === 'ACTIVE').length,
    cancelled: promotions.filter((p) => p.status === 'CANCELLED').length,
    expired:   promotions.filter((p) => p.status === 'EXPIRED').length,
  }), [promotions]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleActivateSuggestion = (suggestion) => {
    dispatch(clearPromotionActionState());
    setModalSuggestion(suggestion);
  };

  const handleCreateSuccess = () => {
    setModalSuggestion(null);
    refresh();
    setActiveTab('all');
    // Limpiar query params si los había
    if (qTab || qBatchId) setSearchParams({});
  };

  const handleCancelConfirm = () => {
    if (!confirmCancelItem) return;
    dispatch(cancelPromotion({ token, id: confirmCancelItem.id })).then(() => {
      setConfirmCancelItem(null);
      dispatch(clearPromotionActionState());
      refresh();
    });
  };

  const isRefreshing = listStatus === 'loading' || suggestionsStatus === 'loading';
  const isCancelling = actionStatus === 'loading' && confirmCancelItem !== null;

  // Tabs disponibles según rol
  const TABS = ownerUser
    ? [
        { key: 'suggestions', label: `💡 Sugerencias${suggestions.length > 0 ? ` (${suggestions.length})` : ''}` },
        { key: 'active',      label: `✅ Activas${activePromotions.length > 0 ? ` (${activePromotions.length})` : ''}` },
        { key: 'all',         label: '📋 Todas' },
      ]
    : [
        { key: 'active', label: `✅ Activas${activePromotions.length > 0 ? ` (${activePromotions.length})` : ''}` },
        { key: 'all',    label: '📋 Todas' },
      ];

  // ── Banner informativo cuando se llega desde /expiration ─────────────────
  const fromExpirationBanner = (qBatchId || qPromoId) && (
    <div className="promo-from-expiration-banner">
      <span>⏰</span>
      <p>
        {qBatchId
          ? 'Llegaste desde Vencimientos. La sugerencia para el lote seleccionado está resaltada abajo.'
          : 'Llegaste desde Vencimientos. La promoción activa del lote está resaltada abajo.'}
      </p>
      <button
        className="promo-banner-close"
        onClick={() => setSearchParams({})}
        title="Cerrar aviso"
      >
        ✕
      </button>
    </div>
  );

  return (
    <div className="promo-page">
      <AppTopbar />

      <div className="promo-content">

        {/* ── Header ── */}
        <div className="promo-header">
          <div>
            <h1 className="promo-title">🏷️ Promociones</h1>
            <p className="promo-sub">
              Descuentos sobre lotes próximos a vencer
              {listStatus === 'succeeded' && (
                <> · <strong>{stats.active}</strong> activa{stats.active !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
          <button
            className="promo-refresh-btn"
            onClick={refresh}
            disabled={isRefreshing}
            title="Actualizar"
          >
            <span className={isRefreshing ? 'spin' : ''}>↻</span>
          </button>
        </div>

        {/* Banner de navegación desde /expiration */}
        {fromExpirationBanner}

        {/* ── Info banner para employees ── */}
        {!ownerUser && (
          <div className="promo-info-banner">
            <span>ℹ️</span>
            <p>
              Aquí podés ver las <strong>promociones activas</strong> creadas por el encargado
              para productos próximos a vencer. Solo el dueño/encargado puede crear o cancelar promociones.
            </p>
          </div>
        )}

        {/* ── Estadísticas rápidas (OWNER) ── */}
        {ownerUser && listStatus === 'succeeded' && (
          <div className="promo-stats">
            <div className="pst-item">
              <span className="pst-value" style={{ color: '#2E7D32' }}>{stats.active}</span>
              <span className="pst-label">Activas</span>
            </div>
            <div className="pst-sep" />
            <div className="pst-item">
              <span className="pst-value" style={{ color: suggestions.length > 0 ? '#D68910' : 'var(--espresso)' }}>
                {suggestions.length}
              </span>
              <span className="pst-label">Sugerencias</span>
            </div>
            <div className="pst-sep" />
            <div className="pst-item">
              <span className="pst-value">{stats.total}</span>
              <span className="pst-label">Total</span>
            </div>
            <div className="pst-sep" />
            <div className="pst-item">
              <span className="pst-value" style={{ color: '#8C7B6B' }}>{stats.cancelled + stats.expired}</span>
              <span className="pst-label">Inactivas</span>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="promo-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`promo-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Errors ── */}
        {listError && <div className="promo-error">⚠ {listError}</div>}
        {suggestionsError && ownerUser && <div className="promo-error">⚠ {suggestionsError}</div>}

        {/* ════════════════════════════════════════════════
            TAB: SUGERENCIAS (solo OWNER)
            ════════════════════════════════════════════════ */}
        {activeTab === 'suggestions' && ownerUser && (
          <>
            {suggestionsStatus === 'loading' && <TableSkeleton rows={3} />}

            {suggestionsStatus === 'succeeded' && suggestions.length === 0 && (
              <div className="promo-empty">
                <span className="promo-empty-icon">✅</span>
                <h3 className="promo-empty-title">Sin sugerencias pendientes</h3>
                <p className="promo-empty-desc">
                  No hay lotes próximos a vencer sin promoción activa.
                  Las sugerencias aparecen automáticamente cuando el stock
                  se acerca a su fecha de vencimiento.
                  {qBatchId && (
                    <strong> El lote #{qBatchId} ya tiene una promoción activa o no está próximo a vencer.</strong>
                  )}
                </p>
                <p className="promo-empty-hint">
                  El umbral de días se configura en <strong>Ajustes → Días de sugerencia de promoción</strong>.
                </p>
              </div>
            )}

            {suggestionsStatus === 'succeeded' && suggestions.length > 0 && (
              <>
                <div className="promo-suggestions-banner">
                  <span>💡</span>
                  <p>
                    El sistema detectó <strong>{suggestions.length}</strong> lote{suggestions.length !== 1 ? 's' : ''} próximo{suggestions.length !== 1 ? 's' : ''} a
                    vencer sin promoción activa. Podés dar de alta una o varias para incentivar su venta.
                  </p>
                </div>
                <div className="promo-suggestions-list">
                  {suggestions.map((sg) => {
                    const isHighlighted = qBatchId && String(sg.batchId) === String(qBatchId);
                    return (
                      <SuggestionCard
                        key={sg.batchId}
                        suggestion={sg}
                        onActivate={handleActivateSuggestion}
                        activating={false}
                        highlighted={isHighlighted}
                        cardRef={isHighlighted ? highlightedSuggestionRef : null}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════
            TAB: ACTIVAS (OWNER + EMPLOYEE)
            ════════════════════════════════════════════════ */}
        {activeTab === 'active' && (
          <>
            {listStatus === 'loading' && <TableSkeleton rows={4} />}

            {listStatus === 'succeeded' && activePromotions.length === 0 && (
              <div className="promo-empty">
                <span className="promo-empty-icon">🏷️</span>
                <h3 className="promo-empty-title">No hay promociones activas</h3>
                <p className="promo-empty-desc">
                  {ownerUser
                    ? 'Revisá las sugerencias del sistema para dar de alta promociones sobre lotes próximos a vencer.'
                    : 'El encargado aún no ha activado ninguna promoción.'}
                </p>
                {ownerUser && (
                  <button
                    className="promo-go-suggestions"
                    onClick={() => handleTabChange('suggestions')}
                  >
                    Ver sugerencias
                  </button>
                )}
              </div>
            )}

            {listStatus === 'succeeded' && activePromotions.length > 0 && (
              <div className="promo-list">
                {activePromotions.map((p) => {
                  const isHighlighted = qPromoId && String(p.id) === String(qPromoId);
                  return (
                    <PromotionCard
                      key={p.id}
                      promotion={p}
                      onCancel={setConfirmCancelItem}
                      cancelling={isCancelling && confirmCancelItem?.id === p.id}
                      isOwnerUser={ownerUser}
                      highlighted={isHighlighted}
                      cardRef={isHighlighted ? highlightedPromoRef : null}
                      defaultExpanded={isHighlighted}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════
            TAB: TODAS (OWNER + EMPLOYEE)
            ════════════════════════════════════════════════ */}
        {activeTab === 'all' && (
          <>
            {promotions.length > 0 && (
              <div className="promo-controls">
                <div className="promo-search-wrap">
                  <span className="promo-search-icon">🔍</span>
                  <input
                    className="promo-search"
                    placeholder="Buscar por título, producto o empleado..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="promo-search-clear" onClick={() => setSearch('')}>✕</button>
                  )}
                </div>
                <select
                  className="promo-filter-sel"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="ACTIVE">✅ Activas</option>
                  <option value="CANCELLED">🚫 Canceladas</option>
                  <option value="EXPIRED">⏰ Vencidas</option>
                </select>
              </div>
            )}

            {listStatus === 'loading' && <TableSkeleton rows={5} />}

            {listStatus === 'succeeded' && filteredPromotions.length === 0 && (
              <div className="promo-empty">
                <span className="promo-empty-icon">📋</span>
                <h3 className="promo-empty-title">
                  {search || statusFilter ? 'Sin resultados' : 'Sin promociones registradas'}
                </h3>
                <p className="promo-empty-desc">
                  {search || statusFilter
                    ? 'Intentá con otros filtros.'
                    : ownerUser
                      ? 'Las promociones que crees aparecerán aquí.'
                      : 'Aún no hay promociones registradas en el sistema.'}
                </p>
                {(search || statusFilter) && (
                  <button
                    className="promo-go-suggestions"
                    onClick={() => { setSearch(''); setStatusFilter(''); }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {listStatus === 'succeeded' && filteredPromotions.length > 0 && (
              <>
                <div className="promo-list">
                  {filteredPromotions.map((p) => (
                    <PromotionCard
                      key={p.id}
                      promotion={p}
                      onCancel={setConfirmCancelItem}
                      cancelling={isCancelling && confirmCancelItem?.id === p.id}
                      isOwnerUser={ownerUser}
                      highlighted={false}
                      cardRef={null}
                    />
                  ))}
                </div>
                <p className="promo-count">
                  {filteredPromotions.length} promoción{filteredPromotions.length !== 1 ? 'es' : ''}
                  {(search || statusFilter) && ' (filtradas)'}
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Modal: Dar de alta promoción (solo OWNER) ── */}
      {ownerUser && (
        <Modal
          isOpen={Boolean(modalSuggestion)}
          onClose={() => {
            setModalSuggestion(null);
            dispatch(clearPromotionActionState());
          }}
          title="Dar de alta promoción"
          width="560px"
        >
          {modalSuggestion && (
            <CreatePromotionForm
              suggestion={modalSuggestion}
              onSuccess={handleCreateSuccess}
              onCancel={() => {
                setModalSuggestion(null);
                dispatch(clearPromotionActionState());
              }}
            />
          )}
        </Modal>
      )}

      {/* ── Confirm cancel (solo OWNER) ── */}
      {ownerUser && (
        <ConfirmDialog
          isOpen={Boolean(confirmCancelItem)}
          onClose={() => setConfirmCancelItem(null)}
          onConfirm={handleCancelConfirm}
          title="Cancelar promoción"
          message={
            confirmCancelItem
              ? `¿Cancelar la promoción "${confirmCancelItem.title}"? Esta acción no se puede deshacer.`
              : ''
          }
          confirmLabel="Sí, cancelar"
          danger
          loading={isCancelling}
        />
      )}

      <style>{`
        .promo-page    { min-height: 100vh; background: var(--cream); }
        .promo-content {
          max-width: 860px; margin: 0 auto;
          padding: var(--space-lg) var(--space-md);
          display: flex; flex-direction: column; gap: var(--space-md);
        }

        /* Header */
        .promo-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .promo-title { font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; color: var(--espresso); margin-bottom: 4px; }
        .promo-sub   { font-size: 0.84rem; color: var(--warm-gray); }
        .promo-refresh-btn {
          width: 38px; height: 38px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-size: 1.1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--warm-gray); transition: all var(--transition-fast); flex-shrink: 0;
        }
        .promo-refresh-btn:hover:not(:disabled) { border-color: var(--amber); color: var(--amber); }
        .promo-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { display: inline-block; animation: spin 0.7s linear infinite; }

        /* Banner desde /expiration */
        .promo-from-expiration-banner {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.08); border: 1.5px solid rgba(200,137,58,0.3);
          animation: fadeIn 0.3s ease;
        }
        .promo-from-expiration-banner p {
          flex: 1; font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0;
        }
        .promo-banner-close {
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.8rem; padding: 2px 6px;
          border-radius: 4px; flex-shrink: 0;
          transition: color var(--transition-fast);
        }
        .promo-banner-close:hover { color: var(--espresso); }

        /* Info banner */
        .promo-info-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.07); border: 1px solid rgba(200,137,58,0.22);
        }
        .promo-info-banner p { font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }

        /* Stats strip */
        .promo-stats {
          display: flex; align-items: center;
          background: white; border: 1px solid var(--cream-dark); border-radius: var(--radius-lg);
          padding: 14px 18px; box-shadow: var(--shadow-sm);
        }
        .pst-item  { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .pst-value { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--espresso); line-height: 1; }
        .pst-label { font-size: 0.65rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .pst-sep { width: 1px; height: 34px; background: var(--cream-dark); flex-shrink: 0; margin: 0 4px; }

        /* Tabs */
        .promo-tabs {
          display: flex; background: var(--cream-dark);
          border-radius: var(--radius-md); padding: 3px;
          overflow-x: auto; scrollbar-width: none;
        }
        .promo-tabs::-webkit-scrollbar { display: none; }
        .promo-tab {
          flex: 1; padding: 9px 12px; border: none;
          border-radius: calc(var(--radius-md) - 2px);
          font-family: var(--font-body); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; color: var(--warm-gray); background: none;
          transition: all var(--transition-fast); white-space: nowrap;
          min-width: 0;
        }
        .promo-tab.active { background: white; color: var(--espresso); box-shadow: var(--shadow-sm); }

        /* Error */
        .promo-error {
          padding: 12px 14px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.86rem;
        }

        /* Suggestions banner */
        .promo-suggestions-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(214,137,16,0.07); border: 1px solid rgba(214,137,16,0.3);
        }
        .promo-suggestions-banner p { font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }

        /* Lists */
        .promo-suggestions-list,
        .promo-list { display: flex; flex-direction: column; gap: 9px; }

        /* Controls (tab ALL) */
        .promo-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .promo-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .promo-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .promo-search {
          width: 100%; padding: 9px 34px;
          font-family: var(--font-body); font-size: 0.86rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none; box-sizing: border-box;
          transition: border-color var(--transition-base);
        }
        .promo-search:focus { border-color: var(--amber); }
        .promo-search-clear {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .promo-filter-sel {
          padding: 9px 12px; font-family: var(--font-body); font-size: 0.84rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .promo-filter-sel:focus { border-color: var(--amber); }

        /* Empty states */
        .promo-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 48px 24px; text-align: center;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-xl); box-shadow: var(--shadow-sm);
        }
        .promo-empty-icon  { font-size: 2.8rem; opacity: 0.55; }
        .promo-empty-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--espresso); }
        .promo-empty-desc  { font-size: 0.84rem; color: var(--warm-gray); line-height: 1.6; max-width: 360px; }
        .promo-empty-hint  { font-size: 0.78rem; color: var(--warm-gray-light); max-width: 340px; line-height: 1.5; }
        .promo-go-suggestions {
          padding: 10px 20px; background: var(--amber); color: white;
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.86rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
          box-shadow: var(--shadow-amber);
        }
        .promo-go-suggestions:hover { background: var(--amber-dark); transform: translateY(-1px); }

        .promo-count { text-align: right; font-size: 0.75rem; color: var(--warm-gray-light); }

        @media (max-width: 480px) {
          .promo-content { padding: var(--space-md) var(--space-sm); }
          .promo-stats   { flex-wrap: wrap; gap: 8px; }
          .pst-sep       { display: none; }
          .pst-item      { min-width: 60px; }
          .promo-controls { flex-direction: column; align-items: stretch; }
          .promo-filter-sel { width: 100%; }
        }
      `}</style>
    </div>
  );
}