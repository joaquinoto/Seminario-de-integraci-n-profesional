import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  fetchPromotionSuggestions,
  fetchPromotions,
  fetchActivePromotions,
  createPromotion,
  cancelPromotion,
  clearPromotionActionState,
  selectVisiblePromotions,
  selectPromotionsStatus,
  selectPromotionsError,
  selectPromotionSuggestions,
  selectSuggestionsStatus,
  selectSuggestionsError,
  selectPromotionAction,
  PROMO_TYPE_TAG,
  extractExtendedType,
} from '../features/promotions/promotionsSlice';
import {
  fetchBatches,
  selectBatches,
  selectBatchesStatus,
} from '../features/stock/stockSlice';
import { fetchProducts, selectProducts } from '../features/catalog/productsSlice';
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
  RED:            { color: '#E74C3C', icon: '🔴', label: 'Vence hoy'    },
  YELLOW:         { color: '#D68910', icon: '🟡', label: 'Vence pronto' },
  GREEN:          { color: '#1E8449', icon: '🟢', label: 'En buen estado' },
  NOT_APPLICABLE: { color: '#8C7B6B', icon: '⚪', label: 'Sin vencimiento' },
};

const DISCOUNT_TYPE_LABELS = {
  PERCENTAGE:  '% Porcentaje',
  FIXED_PRICE: '$ Precio fijo',
};

// Tipos de descuento disponibles en el form de creación manual
const DISCOUNT_TYPE_OPTIONS = [
  { v: 'PERCENTAGE',    label: '% Porcentaje',     hint: 'Ej: 20% de descuento por unidad' },
  { v: 'TWO_FOR_ONE',   label: '2 x 1',             hint: 'Llevá 2 y pagá 1' },
  { v: 'SECOND_UNIT_50',label: '2da unidad 50%',    hint: '50% de descuento en la 2da unidad de cada par' },
];

const UNIT_LABELS = {
  UNIT: 'u.', KG: 'kg', GRAM: 'g',
  TRAY: 'band.', BAG: 'bolsa', LITER: 'L', PACK: 'pack',
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

const resolveDiscountDisplay = (promotion) => {
  const ext = extractExtendedType(promotion);
  if (ext === 'TWO_FOR_ONE')    return { label: '2 x 1',         color: '#5500CC', bg: 'rgba(88,0,220,0.10)'  };
  if (ext === 'SECOND_UNIT_50') return { label: '2da ud. al 50%', color: '#006080', bg: 'rgba(0,120,150,0.10)' };
  if (promotion.discountType === 'PERCENTAGE' && promotion.discountPercentage) {
    return { label: `−${promotion.discountPercentage}%`, color: '#C0392B', bg: 'rgba(192,57,43,0.10)' };
  }
  if (promotion.discountType === 'FIXED_PRICE' && promotion.promotionalPrice) {
    return { label: formatARS(promotion.promotionalPrice), color: '#C0392B', bg: 'rgba(192,57,43,0.10)' };
  }
  return null;
};

const buildCreatePayload = ({ productId, batchId, form, userId, suggestedBySystem = false }) => {
  const base = {
    productId,
    batchId: batchId || null,
    createdById: userId ?? null,
    title: form.title.trim(),
    description: null,
    startDate: form.startDate,
    endDate: form.endDate,
    suggestedBySystem,
  };

  if (form.discountType === 'TWO_FOR_ONE') {
    return {
      ...base,
      discountType: 'PERCENTAGE',
      discountPercentage: 50,
      description: `${PROMO_TYPE_TAG.TWO_FOR_ONE}${form.description.trim() ? ' ' + form.description.trim() : ''}`,
    };
  }
  if (form.discountType === 'SECOND_UNIT_50') {
    return {
      ...base,
      discountType: 'PERCENTAGE',
      discountPercentage: 25,
      description: `${PROMO_TYPE_TAG.SECOND_UNIT_50}${form.description.trim() ? ' ' + form.description.trim() : ''}`,
    };
  }
  return {
    ...base,
    discountType: 'PERCENTAGE',
    discountPercentage: Number(form.discountPercentage),
    promotionalPrice: null,
    description: form.description.trim() || null,
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function DiscountChip({ promotion }) {
  const display = resolveDiscountDisplay(promotion);
  if (!display) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 12px', borderRadius: 20,
      fontSize: '0.88rem', fontWeight: 800,
      color: display.color, background: display.bg,
    }}>
      {display.label}
    </span>
  );
}

// ─── SuggestionCard (lotes próximos a vencer — igual que antes) ──────────────
function SuggestionCard({ suggestion, onActivate, highlighted, cardRef }) {
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
      <div className="sg-urgency-bar" style={{ background: expCfg.color }} />
      <div className="sg-body">
        <div className="sg-top">
          <div className="sg-product-info">
            <span className="sg-product-name">{suggestion.productName}</span>
            <div className="sg-chips">
              <span className="sg-exp-chip" style={{ color: expCfg.color, background: expCfg.color + '18' }}>
                {expCfg.icon} {daysLabel}
              </span>
              <span className="sg-stock-chip">📦 {Number(suggestion.currentQuantity).toLocaleString('es-AR')} u. en stock</span>
              <span className="sg-batch-chip">Lote #{suggestion.batchId}</span>
            </div>
          </div>
          <div className="sg-discount-badge">
            <span className="sg-discount-pct">−{suggestion.suggestedDiscountPercentage}%</span>
            <span className="sg-discount-label">sugerido</span>
          </div>
        </div>
        <div className="sg-date-row">
          <span className="sg-date-label">📅 Vencimiento:</span>
          <span className="sg-date-val" style={{ color: expCfg.color, fontWeight: 700 }}>
            {formatDate(suggestion.expirationDate)}
          </span>
        </div>
        <div className="sg-title-preview">
          <span className="sg-title-label">Título sugerido:</span>
          <span className="sg-title-val">"{suggestion.suggestedTitle}"</span>
        </div>
        <button
          className="sg-activate-btn"
          onClick={() => onActivate(suggestion)}
          style={{ '--btn-color': expCfg.color }}
        >
          🏷️ Dar de alta esta promoción
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
      `}</style>
    </div>
  );
}

// ─── GreenBatchCard (lote en buen estado — para promo manual) ────────────────
function GreenBatchCard({ batch, productName, onActivate }) {
  const expCfg = EXPIRATION_STATUS_CONFIG[batch.expirationStatus] || EXPIRATION_STATUS_CONFIG.GREEN;
  const ul = UNIT_LABELS[batch.unitType] || 'u.';

  return (
    <div className="gb-card" style={{ '--exp-color': expCfg.color }}>
      <div className="gb-urgency-bar" style={{ background: expCfg.color }} />
      <div className="gb-body">
        <div className="gb-top">
          <div className="gb-product-info">
            <span className="gb-product-name">{productName}</span>
            <div className="gb-chips">
              <span className="gb-status-chip" style={{ color: expCfg.color, background: expCfg.color + '18' }}>
                {expCfg.icon} {expCfg.label}
              </span>
              <span className="gb-stock-chip">
                📦 {Number(batch.currentQuantity).toLocaleString('es-AR')} {ul} disponibles
              </span>
              <span className="gb-batch-chip">Lote #{batch.id}</span>
            </div>
          </div>
          {batch.unitSalePrice && Number(batch.unitSalePrice) > 0 && (
            <div className="gb-price-badge">
              <span className="gb-price-val">{formatARS(batch.unitSalePrice)}</span>
              <span className="gb-price-label">precio unit.</span>
            </div>
          )}
        </div>
        {batch.expirationDate && (
          <div className="gb-date-row">
            <span className="gb-date-label">📅 Vencimiento:</span>
            <span className="gb-date-val" style={{ color: expCfg.color, fontWeight: 700 }}>
              {formatDate(batch.expirationDate)}
            </span>
          </div>
        )}
        {!batch.expirationDate && (
          <div className="gb-date-row">
            <span className="gb-date-label">📅 Sin fecha de vencimiento</span>
          </div>
        )}
        <button
          className="gb-activate-btn"
          onClick={() => onActivate(batch, productName)}
        >
          🏷️ Crear promoción para este lote
        </button>
      </div>

      <style>{`
        .gb-card {
          display: flex; align-items: stretch;
          background: white; border-radius: var(--radius-lg);
          border: 1.5px solid var(--exp-color, #1E8449);
          box-shadow: var(--shadow-sm); overflow: hidden;
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast);
        }
        .gb-card:hover { box-shadow: var(--shadow-md); }
        .gb-urgency-bar { width: 4px; flex-shrink: 0; }
        .gb-body { flex: 1; padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 10px; }
        .gb-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .gb-product-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        .gb-product-name { font-weight: 700; font-size: 0.96rem; color: var(--espresso); }
        .gb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .gb-status-chip, .gb-stock-chip, .gb-batch-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 20px; font-size: 0.73rem; font-weight: 600;
        }
        .gb-stock-chip { background: var(--cream-dark); color: var(--warm-gray); }
        .gb-batch-chip { background: rgba(28,17,8,0.06); color: var(--warm-gray); }
        .gb-price-badge {
          display: flex; flex-direction: column; align-items: center;
          padding: 8px 12px; border-radius: var(--radius-md);
          background: rgba(46,125,50,0.08); flex-shrink: 0;
        }
        .gb-price-val   { font-weight: 800; font-size: 1rem; color: #2E7D32; line-height: 1; }
        .gb-price-label { font-size: 0.62rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
        .gb-date-row { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; }
        .gb-date-label { color: var(--warm-gray); }
        .gb-activate-btn {
          width: 100%; padding: 12px 16px;
          background: #2E7D32; color: white;
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 700;
          cursor: pointer; transition: all var(--transition-fast);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 3px 12px rgba(46,125,50,0.25);
        }
        .gb-activate-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ─── PromotionCard ────────────────────────────────────────────────────────────
function PromotionCard({ promotion, onCancel, cancelling, isOwnerUser, highlighted, cardRef, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const cfg = PROMOTION_STATUS_CONFIG[promotion.status] || PROMOTION_STATUS_CONFIG.EXPIRED;

  useEffect(() => {
    if (highlighted) setExpanded(true);
  }, [highlighted]);

  const daysLabel = promotion.daysToExpire != null
    ? promotion.daysToExpire === 0 ? 'Vence HOY'
    : promotion.daysToExpire < 0  ? `Venció hace ${Math.abs(promotion.daysToExpire)}d`
    : `Vence en ${promotion.daysToExpire}d`
    : null;

  const extType = extractExtendedType(promotion);
  const discountedPrice = !extType && promotion.discountType === 'PERCENTAGE'
    && promotion.discountPercentage && promotion.originalPrice
      ? calcDiscountedPrice(promotion.originalPrice, promotion.discountPercentage)
      : (!extType && promotion.promotionalPrice ? promotion.promotionalPrice : null);

  const savingsAmount = !extType && promotion.originalPrice && discountedPrice
    ? parseFloat(promotion.originalPrice) - parseFloat(discountedPrice)
    : null;

  const cleanDescription = promotion.description
    ? promotion.description.replace(/\[TYPE:[^\]]+\]\s*/g, '').trim()
    : null;

  const discountTypeLabel = extType === 'TWO_FOR_ONE'
    ? '2 x 1'
    : extType === 'SECOND_UNIT_50'
      ? '2da unidad al 50%'
      : DISCOUNT_TYPE_LABELS[promotion.discountType] || promotion.discountType;

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
            {!extType && promotion.originalPrice && discountedPrice && (
              <div className="pc-price-info">
                <span className="pc-original-price">{formatARS(promotion.originalPrice)}</span>
                <span className="pc-arrow">→</span>
                <span className="pc-new-price" style={{ color: '#C0392B' }}>{formatARS(discountedPrice)}</span>
                {savingsAmount > 0 && (
                  <span className="pc-savings">ahorras {formatARS(savingsAmount)}</span>
                )}
              </div>
            )}
            {extType && promotion.originalPrice && (
              <span className="pc-ext-price-note">
                Base: {formatARS(promotion.originalPrice)} · precio varía según cantidad
              </span>
            )}
          </div>
          <div className="pc-meta">
            <span className="pc-dates">📅 {formatDateTime(promotion.startDate)} → {formatDateTime(promotion.endDate)}</span>
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
            {cleanDescription && (
              <div className="pd-item full">
                <span className="pd-label">Descripción</span>
                <span>{cleanDescription}</span>
              </div>
            )}
            <div className="pd-item">
              <span className="pd-label">Tipo de descuento</span>
              <span>{discountTypeLabel}</span>
            </div>
            {!extType && promotion.discountType === 'PERCENTAGE' && (
              <div className="pd-item">
                <span className="pd-label">Porcentaje</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>−{promotion.discountPercentage}%</span>
              </div>
            )}
            {!extType && promotion.discountType === 'FIXED_PRICE' && (
              <div className="pd-item">
                <span className="pd-label">Precio promocional</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>{formatARS(promotion.promotionalPrice)}</span>
              </div>
            )}
            {promotion.batchId && (
              <div className="pd-item">
                <span className="pd-label">Lote</span>
                <span>#{promotion.batchId}{promotion.batchExpirationDate ? ` · vence ${formatDate(promotion.batchExpirationDate)}` : ''}</span>
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
        .pc-highlighted {
          border-color: #2E7D32; border-width: 2.5px;
          box-shadow: 0 0 0 4px rgba(46,125,50,0.15), var(--shadow-md);
          animation: highlightPulseGreen 1.8s ease 3;
        }
        @keyframes highlightPulseGreen {
          0%,100% { box-shadow: 0 0 0 4px rgba(46,125,50,0.15), var(--shadow-md); }
          50%      { box-shadow: 0 0 0 8px rgba(46,125,50,0.08), var(--shadow-lg); }
        }
        .pc-header { display: flex; align-items: stretch; cursor: pointer; -webkit-tap-highlight-color: transparent; }
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
        .pc-original-price { text-decoration: line-through; font-size: 0.8rem; color: var(--warm-gray); font-weight: 500; }
        .pc-arrow { font-size: 0.8rem; color: var(--warm-gray); }
        .pc-new-price { font-weight: 800; font-size: 0.96rem; }
        .pc-savings {
          font-size: 0.7rem; font-weight: 700; color: #2E7D32;
          background: rgba(46,125,50,0.09); padding: 2px 7px; border-radius: 10px;
        }
        .pc-ext-price-note { font-size: 0.75rem; color: var(--warm-gray); font-style: italic; }
        .pc-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.76rem; color: var(--warm-gray); }
        .pc-dates { flex: 1; min-width: 0; }
        .pc-batch-exp { font-weight: 600; flex-shrink: 0; }
        .pc-qty { flex-shrink: 0; }
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

// ─── CreatePromotionForm — genérico para sugerencias Y lotes manuales ────────
function CreatePromotionForm({ productId, batchId, productName, suggestion, originalPrice, onSuccess, onCancel }) {
  const dispatch = useDispatch();
  const token    = useSelector(selectToken);
  const user     = useSelector(selectUser);
  const { status, error } = useSelector(selectPromotionAction);

  const isSuggestion = Boolean(suggestion);
  const resolvedProductId = suggestion?.productId ?? productId;
  const resolvedBatchId   = suggestion?.batchId   ?? batchId;
  const resolvedOrigPrice = suggestion ? (suggestion.originalPrice ?? null) : originalPrice;

  const [form, setForm] = useState({
    title:              suggestion?.suggestedTitle || `Promo ${productName || ''}`,
    description:        '',
    discountType:       'PERCENTAGE',
    discountPercentage: suggestion?.suggestedDiscountPercentage
                          ? String(suggestion.suggestedDiscountPercentage)
                          : '10',
    startDate: nowBsAsISO(0),
    endDate:   suggestion?.expirationDate
                 ? suggestion.expirationDate + 'T23:59:00'
                 : nowBsAsISO(24 * 7),
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
    if (form.discountType === 'PERCENTAGE') {
      const pct = Number(form.discountPercentage);
      if (!form.discountPercentage || isNaN(pct) || pct < 1 || pct > 100)
        e.discountPercentage = 'Ingresá un porcentaje entre 1 y 100';
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
    const payload = buildCreatePayload({
      productId: resolvedProductId,
      batchId: resolvedBatchId,
      form,
      userId: user?.id,
      suggestedBySystem: isSuggestion,
    });
    dispatch(createPromotion({ token, data: payload }));
  };

  const isLoading = status === 'loading';

  const pricePreview = useMemo(() => {
    if (!resolvedOrigPrice) return null;
    const base = parseFloat(resolvedOrigPrice);
    if (form.discountType === 'PERCENTAGE' && form.discountPercentage) {
      const pct = parseFloat(form.discountPercentage);
      if (isNaN(pct) || pct <= 0 || pct > 100) return null;
      return { label: `${formatARS(base)} → ${formatARS(base * (1 - pct / 100))} por unidad`, color: '#C0392B' };
    }
    if (form.discountType === 'TWO_FOR_ONE') {
      return { label: `2 unidades por ${formatARS(base)} (pagás 1, llevás 2)`, color: '#5500CC' };
    }
    if (form.discountType === 'SECOND_UNIT_50') {
      return { label: `2 unidades por ${formatARS(base * 1.5)} · precio promedio ${formatARS(base * 0.75)}/u.`, color: '#006080' };
    }
    return null;
  }, [form.discountType, form.discountPercentage, resolvedOrigPrice]);

  return (
    <form onSubmit={handleSubmit} noValidate className="cpf-form">
      {error && <div className="cpf-error">⚠ {error}</div>}

      {/* Contexto del lote */}
      <div className="cpf-context">
        <div className="cpf-ctx-row">
          <span className="cpf-ctx-label">Producto</span>
          <span className="cpf-ctx-val">{productName}</span>
        </div>
        {resolvedBatchId && (
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Lote</span>
            <span className="cpf-ctx-val">#{resolvedBatchId}</span>
          </div>
        )}
        {resolvedOrigPrice && (
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Precio base</span>
            <span className="cpf-ctx-val" style={{ color: '#2E7D32', fontWeight: 700 }}>
              {formatARS(resolvedOrigPrice)}
            </span>
          </div>
        )}
        {suggestion?.currentQuantity && (
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Stock disponible</span>
            <span className="cpf-ctx-val">{Number(suggestion.currentQuantity).toLocaleString('es-AR')} u.</span>
          </div>
        )}
        {suggestion?.expirationDate && (
          <div className="cpf-ctx-row">
            <span className="cpf-ctx-label">Vencimiento del lote</span>
            <span className="cpf-ctx-val" style={{
              color: suggestion.daysToExpire === 0 ? '#C0392B' : '#D68910', fontWeight: 700
            }}>
              {formatDate(suggestion.expirationDate)}
              {' '}({suggestion.daysToExpire === 0 ? 'HOY' : `en ${suggestion.daysToExpire}d`})
            </span>
          </div>
        )}
      </div>

      <div className="cpf-field">
        <label className="cpf-label">Título de la promoción *</label>
        <input
          className={`cpf-input ${fieldErrors.title ? 'err' : ''}`}
          placeholder="Ej: Promo Verano — Medialunas"
          value={form.title}
          onChange={handleChange('title')}
          disabled={isLoading}
          autoFocus
        />
        {fieldErrors.title && <span className="cpf-err">{fieldErrors.title}</span>}
      </div>

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

      <div className="cpf-field">
        <label className="cpf-label">Tipo de descuento *</label>
        <div className="cpf-type-grid">
          {DISCOUNT_TYPE_OPTIONS.map((opt) => (
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
      </div>

      {form.discountType === 'PERCENTAGE' && (
        <div className="cpf-field">
          <label className="cpf-label">Porcentaje de descuento (%) *</label>
          <input
            className={`cpf-input ${fieldErrors.discountPercentage ? 'err' : ''}`}
            type="number" min="1" max="100" step="1"
            placeholder="Ej: 15"
            value={form.discountPercentage}
            onChange={handleChange('discountPercentage')}
            disabled={isLoading}
          />
          {fieldErrors.discountPercentage && <span className="cpf-err">{fieldErrors.discountPercentage}</span>}
        </div>
      )}

      {pricePreview && (
        <div className="cpf-price-preview" style={{ color: pricePreview.color }}>
          💡 {pricePreview.label}
        </div>
      )}

      <div className="cpf-dates-grid">
        <div className="cpf-field">
          <label className="cpf-label">Inicio *</label>
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
          <label className="cpf-label">Fin *</label>
          <input
            className={`cpf-input ${fieldErrors.endDate ? 'err' : ''}`}
            type="datetime-local"
            value={form.endDate}
            onChange={handleChange('endDate')}
            disabled={isLoading}
          />
          {fieldErrors.endDate && <span className="cpf-err">{fieldErrors.endDate}</span>}
        </div>
      </div>

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
          background: rgba(46,125,50,0.06); border: 1px solid rgba(46,125,50,0.22);
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
        .cpf-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-gray); }
        .cpf-err  { font-size: 0.75rem; color: var(--error); font-weight: 500; }
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
        .cpf-type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .cpf-type-opt {
          display: flex; flex-direction: column; gap: 3px;
          padding: 11px 13px; border-radius: var(--radius-md);
          border: 1.5px solid var(--cream-dark); background: var(--cream);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .cpf-type-opt.selected { border-color: var(--amber); background: rgba(200,137,58,0.05); }
        .cpf-type-label { font-weight: 700; font-size: 0.88rem; color: var(--espresso); }
        .cpf-type-hint  { font-size: 0.7rem; color: var(--warm-gray); line-height: 1.35; }
        .cpf-price-preview {
          padding: 9px 13px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.05); border: 1px solid rgba(200,137,58,0.18);
          font-size: 0.82rem; font-weight: 600; line-height: 1.4;
          animation: fadeIn 0.2s ease;
        }
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
          background: #2E7D32; border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 700;
          color: white; cursor: pointer; transition: all var(--transition-fast);
          box-shadow: 0 4px 14px rgba(46,125,50,0.25);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          min-width: 180px;
        }
        .cpf-submit:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
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

// ─── ManualPromoTab — selector de producto + lote en buen estado ──────────────
function ManualPromoTab({ token }) {
  const dispatch  = useDispatch();
  const batches   = useSelector(selectBatches);
  const batchesSt = useSelector(selectBatchesStatus);
  const products  = useSelector(selectProducts);
  const allPromotions = useSelector(selectVisiblePromotions);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [modalBatch, setModalBatch]               = useState(null);
  const [searchProduct, setSearchProduct]         = useState('');

  useEffect(() => {
    if (batchesSt === 'idle' || batchesSt === 'failed') {
      dispatch(fetchBatches({ token }));
    }
    if (products.length === 0) {
      dispatch(fetchProducts({ token, params: { activeOnly: true } }));
    }
  }, [dispatch, token, batchesSt, products.length]);

  // Lotes elegibles: AVAILABLE, stock > 0, estado GREEN o NOT_APPLICABLE, sin promo activa
  const eligibleBatches = useMemo(() => {
    return batches.filter((b) => {
      if (b.batchStatus !== 'AVAILABLE') return false;
      if (Number(b.currentQuantity) <= 0) return false;
      if (b.expirationStatus !== 'GREEN' && b.expirationStatus !== 'NOT_APPLICABLE') return false;
      // Verificar que no tenga ya una promo activa
      const hasActivePromo = allPromotions.some(
        (p) => p.status === 'ACTIVE' && p.batchId === b.id
      );
      if (hasActivePromo) return false;
      return true;
    });
  }, [batches, allPromotions]);

  // Productos activos que tienen al menos un lote elegible
  const eligibleProductIds = useMemo(() => {
    const set = new Set(eligibleBatches.map((b) => b.productId));
    return set;
  }, [eligibleBatches]);

  const activeProductsWithStock = useMemo(() => {
    return products.filter((p) => p.active && eligibleProductIds.has(p.id));
  }, [products, eligibleProductIds]);

  const filteredProducts = useMemo(() => {
    if (!searchProduct.trim()) return activeProductsWithStock;
    const q = searchProduct.trim().toLowerCase();
    return activeProductsWithStock.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.categoryName || '').toLowerCase().includes(q)
    );
  }, [activeProductsWithStock, searchProduct]);

  const selectedProductBatches = useMemo(() => {
    if (!selectedProductId) return [];
    return eligibleBatches.filter((b) => String(b.productId) === String(selectedProductId));
  }, [eligibleBatches, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProductId)) || null,
    [products, selectedProductId]
  );

  const handleActivate = (batch, productName) => {
    setModalBatch({ batch, productName });
  };

  const handleSuccess = () => {
    setModalBatch(null);
    dispatch(fetchBatches({ token }));
    // Recargar promos para actualizar los filtros de "ya tiene promo activa"
    dispatch(fetchPromotions({ token }));
  };

  const isLoading = batchesSt === 'loading';

  return (
    <div className="mpt-wrap">
      {/* Info banner */}
      <div className="mpt-info-banner">
        <span>💡</span>
        <p>
          Aquí podés crear una promoción para cualquier lote en{' '}
          <strong>buen estado</strong> (verde o sin vencimiento) de un producto activo.
          Solo aparecen lotes <strong>sin promoción activa</strong>.
        </p>
      </div>

      {isLoading && <TableSkeleton rows={3} />}

      {!isLoading && activeProductsWithStock.length === 0 && (
        <div className="mpt-empty">
          <span className="mpt-empty-icon">✅</span>
          <h3 className="mpt-empty-title">No hay lotes disponibles</h3>
          <p className="mpt-empty-desc">
            Todos los lotes en buen estado ya tienen una promoción activa,
            o no hay stock disponible en lotes GREEN / sin vencimiento.
          </p>
        </div>
      )}

      {!isLoading && activeProductsWithStock.length > 0 && (
        <>
          {/* Buscador de producto */}
          <div className="mpt-search-wrap">
            <span className="mpt-search-icon">🔍</span>
            <input
              className="mpt-search"
              placeholder="Buscar producto..."
              value={searchProduct}
              onChange={(e) => { setSearchProduct(e.target.value); setSelectedProductId(''); }}
            />
            {searchProduct && (
              <button className="mpt-search-clear" onClick={() => setSearchProduct('')}>✕</button>
            )}
          </div>

          {/* Lista de productos */}
          {!selectedProductId && (
            <div className="mpt-product-list">
              <p className="mpt-section-label">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} con lotes elegibles
              </p>
              {filteredProducts.map((product) => {
                const batchCount = eligibleBatches.filter((b) => String(b.productId) === String(product.id)).length;
                return (
                  <button
                    key={product.id}
                    className="mpt-product-row"
                    onClick={() => { setSelectedProductId(String(product.id)); setSearchProduct(''); }}
                  >
                    <div className="mpt-pr-left">
                      <span className="mpt-pr-name">{product.name}</span>
                      <span className="mpt-pr-cat">{product.categoryName}</span>
                    </div>
                    <div className="mpt-pr-right">
                      <span className="mpt-pr-badge">
                        🟢 {batchCount} lote{batchCount !== 1 ? 's' : ''}
                      </span>
                      <span className="mpt-pr-arrow">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Lotes del producto seleccionado */}
          {selectedProductId && selectedProduct && (
            <div className="mpt-batches-section">
              <div className="mpt-back-row">
                <button className="mpt-back-btn" onClick={() => setSelectedProductId('')}>
                  ← Volver a productos
                </button>
                <span className="mpt-selected-product">{selectedProduct.name}</span>
              </div>
              <p className="mpt-section-label">
                {selectedProductBatches.length} lote{selectedProductBatches.length !== 1 ? 's' : ''} disponible{selectedProductBatches.length !== 1 ? 's' : ''} para promocionar
              </p>
              <div className="mpt-batch-cards">
                {selectedProductBatches.map((batch) => (
                  <GreenBatchCard
                    key={batch.id}
                    batch={batch}
                    productName={selectedProduct.name}
                    onActivate={handleActivate}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: crear promo */}
      <Modal
        isOpen={Boolean(modalBatch)}
        onClose={() => { setModalBatch(null); dispatch(clearPromotionActionState()); }}
        title={modalBatch ? `Nueva promoción — ${modalBatch.productName}` : 'Nueva promoción'}
        width="560px"
      >
        {modalBatch && (
          <CreatePromotionForm
            productId={modalBatch.batch.productId}
            batchId={modalBatch.batch.id}
            productName={modalBatch.productName}
            originalPrice={modalBatch.batch.unitSalePrice}
            suggestion={null}
            onSuccess={handleSuccess}
            onCancel={() => { setModalBatch(null); dispatch(clearPromotionActionState()); }}
          />
        )}
      </Modal>

      <style>{`
        .mpt-wrap { display: flex; flex-direction: column; gap: 14px; }
        .mpt-info-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(46,125,50,0.07); border: 1px solid rgba(46,125,50,0.22);
        }
        .mpt-info-banner p { font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }

        .mpt-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 48px 24px; text-align: center;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-xl); box-shadow: var(--shadow-sm);
        }
        .mpt-empty-icon  { font-size: 2.8rem; }
        .mpt-empty-title { font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--espresso); }
        .mpt-empty-desc  { font-size: 0.84rem; color: var(--warm-gray); max-width: 340px; line-height: 1.6; }

        .mpt-search-wrap { position: relative; }
        .mpt-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .mpt-search {
          width: 100%; padding: 10px 36px; box-sizing: border-box;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .mpt-search:focus { border-color: #2E7D32; }
        .mpt-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }

        .mpt-section-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: var(--warm-gray); margin-bottom: 4px;
        }

        .mpt-product-list { display: flex; flex-direction: column; gap: 7px; }
        .mpt-product-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 13px 16px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-lg);
          cursor: pointer; font-family: var(--font-body); text-align: left;
          transition: all var(--transition-fast); box-shadow: var(--shadow-sm);
        }
        .mpt-product-row:hover { border-color: #2E7D32; box-shadow: var(--shadow-md); transform: translateY(-1px); }
        .mpt-pr-left { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .mpt-pr-name { font-weight: 700; font-size: 0.94rem; color: var(--espresso); }
        .mpt-pr-cat  { font-size: 0.74rem; color: var(--warm-gray); }
        .mpt-pr-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .mpt-pr-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 20px; font-size: 0.74rem; font-weight: 700;
          color: #2E7D32; background: rgba(46,125,50,0.10);
        }
        .mpt-pr-arrow { font-size: 1rem; color: #2E7D32; font-weight: 700; transition: transform var(--transition-fast); }
        .mpt-product-row:hover .mpt-pr-arrow { transform: translateX(4px); }

        .mpt-batches-section { display: flex; flex-direction: column; gap: 10px; }
        .mpt-back-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .mpt-back-btn {
          padding: 7px 14px; background: var(--cream-dark); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.82rem; font-weight: 600; color: var(--warm-gray);
          cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
        }
        .mpt-back-btn:hover { background: var(--cream-medium); color: var(--espresso); }
        .mpt-selected-product { font-weight: 700; font-size: 0.96rem; color: var(--espresso); }
        .mpt-batch-cards { display: flex; flex-direction: column; gap: 9px; }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const dispatch    = useDispatch();
  const token       = useSelector(selectToken);
  const user        = useSelector(selectUser);
  const [searchParams, setSearchParams] = useSearchParams();

  const promotions        = useSelector(selectVisiblePromotions);
  const listStatus        = useSelector(selectPromotionsStatus);
  const listError         = useSelector(selectPromotionsError);
  const suggestions       = useSelector(selectPromotionSuggestions);
  const suggestionsStatus = useSelector(selectSuggestionsStatus);
  const suggestionsError  = useSelector(selectSuggestionsError);
  const { status: actionStatus } = useSelector(selectPromotionAction);

  const ownerUser = isOwner(user);

  const qTab     = searchParams.get('tab');
  const qBatchId = searchParams.get('batchId');
  const qPromoId = searchParams.get('promoId');

  // Tabs disponibles según rol
  const resolveInitialTab = () => {
    if (qTab === 'suggestions' && ownerUser) return 'suggestions';
    if (qTab === 'manual'      && ownerUser) return 'manual';
    if (qTab === 'active')                   return 'active';
    if (qTab === 'all')                      return 'all';
    return ownerUser ? 'suggestions' : 'active';
  };

  const [activeTab,         setActiveTab]        = useState(resolveInitialTab);
  const [modalSuggestion,   setModalSuggestion]  = useState(null);
  const [confirmCancelItem, setConfirmCancelItem] = useState(null);
  const [search,            setSearch]           = useState('');
  const [statusFilter,      setStatusFilter]     = useState('');

  const highlightedSuggestionRef = useRef(null);
  const highlightedPromoRef      = useRef(null);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchPromotions({ token }));
    if (ownerUser) {
      dispatch(fetchPromotionSuggestions({ token }));
    }
  }, [token, ownerUser, dispatch]);

  useEffect(() => {
    if (qBatchId && suggestionsStatus === 'succeeded' && activeTab === 'suggestions') {
      const timer = setTimeout(() => {
        highlightedSuggestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [qBatchId, suggestionsStatus, activeTab]);

  useEffect(() => {
    if (qPromoId && listStatus === 'succeeded' && activeTab === 'active') {
      const timer = setTimeout(() => {
        highlightedPromoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [qPromoId, listStatus, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (qTab || qBatchId || qPromoId) setSearchParams({});
  };

  const refresh = useCallback(() => {
    dispatch(fetchPromotions({ token }));
    if (ownerUser) dispatch(fetchPromotionSuggestions({ token }));
  }, [dispatch, token, ownerUser]);

  const filteredPromotions = useMemo(() => {
    let list = [...promotions];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title         || '').toLowerCase().includes(q) ||
          (p.productName   || '').toLowerCase().includes(q) ||
          (p.description   || '').toLowerCase().includes(q) ||
          (p.createdByName || '').toLowerCase().includes(q)
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

  const handleActivateSuggestion = (suggestion) => {
    dispatch(clearPromotionActionState());
    setModalSuggestion(suggestion);
  };

  const handleCreateSuccess = () => {
    setModalSuggestion(null);
    refresh();
    setActiveTab('all');
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

  // Definición de tabs según rol
  const TABS = ownerUser
    ? [
        { key: 'suggestions', label: `💡 Por vencer${suggestions.length > 0 ? ` (${suggestions.length})` : ''}` },
        { key: 'manual',      label: '🟢 Crear promo manual' },
        { key: 'active',      label: `✅ Activas${activePromotions.length > 0 ? ` (${activePromotions.length})` : ''}` },
        { key: 'all',         label: '📋 Todas' },
      ]
    : [
        { key: 'active', label: `✅ Activas${activePromotions.length > 0 ? ` (${activePromotions.length})` : ''}` },
        { key: 'all',    label: '📋 Todas' },
      ];

  const fromExpirationBanner = (qBatchId || qPromoId) && (
    <div className="promo-from-expiration-banner">
      <span>⏰</span>
      <p>
        {qBatchId
          ? 'Llegaste desde Vencimientos. La sugerencia para el lote seleccionado está resaltada abajo.'
          : 'Llegaste desde Vencimientos. La promoción activa del lote está resaltada abajo.'}
      </p>
      <button className="promo-banner-close" onClick={() => setSearchParams({})} title="Cerrar aviso">✕</button>
    </div>
  );

  return (
    <div className="promo-page">
      <AppTopbar />

      <div className="promo-content">

        <div className="promo-header">
          <div>
            <h1 className="promo-title">🏷️ Promociones</h1>
            <p className="promo-sub">
              Descuentos sobre productos · gestión de precios especiales
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

        {fromExpirationBanner}

        {!ownerUser && (
          <div className="promo-info-banner">
            <span>ℹ️</span>
            <p>
              Aquí podés ver las <strong>promociones activas</strong> creadas por el encargado.
              Al registrar una venta, el precio de promo se aplica automáticamente.
            </p>
          </div>
        )}

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
              <span className="pst-label">Por vencer</span>
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

        {/* Tabs */}
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

        {listError && <div className="promo-error">⚠ {listError}</div>}
        {suggestionsError && ownerUser && <div className="promo-error">⚠ {suggestionsError}</div>}

        {/* TAB: SUGERENCIAS (lotes por vencer) */}
        {activeTab === 'suggestions' && ownerUser && (
          <>
            {suggestionsStatus === 'loading' && <TableSkeleton rows={3} />}
            {suggestionsStatus === 'succeeded' && suggestions.length === 0 && (
              <div className="promo-empty">
                <span className="promo-empty-icon">✅</span>
                <h3 className="promo-empty-title">Sin sugerencias pendientes</h3>
                <p className="promo-empty-desc">
                  No hay lotes próximos a vencer sin promoción activa.
                </p>
                <p className="promo-empty-hint">
                  Para crear promos en lotes en buen estado, usá la pestaña <strong>"🟢 Crear promo manual"</strong>.
                </p>
              </div>
            )}
            {suggestionsStatus === 'succeeded' && suggestions.length > 0 && (
              <>
                <div className="promo-suggestions-banner">
                  <span>⚡</span>
                  <p>
                    El sistema detectó <strong>{suggestions.length}</strong> lote{suggestions.length !== 1 ? 's' : ''} próximo{suggestions.length !== 1 ? 's' : ''} a vencer sin promoción activa.
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

        {/* TAB: PROMO MANUAL (lotes en buen estado) */}
        {activeTab === 'manual' && ownerUser && (
          <ManualPromoTab token={token} />
        )}

        {/* TAB: ACTIVAS */}
        {activeTab === 'active' && (
          <>
            {listStatus === 'loading' && <TableSkeleton rows={4} />}
            {listStatus === 'succeeded' && activePromotions.length === 0 && (
              <div className="promo-empty">
                <span className="promo-empty-icon">🏷️</span>
                <h3 className="promo-empty-title">No hay promociones activas</h3>
                <p className="promo-empty-desc">
                  {ownerUser
                    ? 'Podés crear promos desde "Por vencer" (para lotes urgentes) o desde "Crear promo manual" (para cualquier lote).'
                    : 'El encargado aún no ha activado ninguna promoción.'}
                </p>
                {ownerUser && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button className="promo-go-suggestions" onClick={() => handleTabChange('suggestions')}>
                      💡 Ver sugerencias
                    </button>
                    <button className="promo-go-suggestions" style={{ background: '#2E7D32', boxShadow: '0 4px 14px rgba(46,125,50,0.25)' }} onClick={() => handleTabChange('manual')}>
                      🟢 Crear promo manual
                    </button>
                  </div>
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

        {/* TAB: TODAS */}
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
                  <button className="promo-go-suggestions" onClick={() => { setSearch(''); setStatusFilter(''); }}>
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

      {/* Modal: sugerencia por vencer */}
      {ownerUser && (
        <Modal
          isOpen={Boolean(modalSuggestion)}
          onClose={() => { setModalSuggestion(null); dispatch(clearPromotionActionState()); }}
          title="Dar de alta promoción"
          width="560px"
        >
          {modalSuggestion && (
            <CreatePromotionForm
              productId={modalSuggestion.productId}
              batchId={modalSuggestion.batchId}
              productName={modalSuggestion.productName}
              originalPrice={modalSuggestion.originalPrice ?? null}
              suggestion={modalSuggestion}
              onSuccess={handleCreateSuccess}
              onCancel={() => { setModalSuggestion(null); dispatch(clearPromotionActionState()); }}
            />
          )}
        </Modal>
      )}

      {/* Confirm cancel */}
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

        .promo-from-expiration-banner {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.08); border: 1.5px solid rgba(200,137,58,0.3);
          animation: fadeIn 0.3s ease;
        }
        .promo-from-expiration-banner p { flex: 1; font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }
        .promo-banner-close {
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
        }
        .promo-banner-close:hover { color: var(--espresso); }

        .promo-info-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.07); border: 1px solid rgba(200,137,58,0.22);
        }
        .promo-info-banner p { font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }

        .promo-stats {
          display: flex; align-items: center;
          background: white; border: 1px solid var(--cream-dark); border-radius: var(--radius-lg);
          padding: 14px 18px; box-shadow: var(--shadow-sm);
        }
        .pst-item  { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .pst-value { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--espresso); line-height: 1; }
        .pst-label { font-size: 0.65rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .pst-sep { width: 1px; height: 34px; background: var(--cream-dark); flex-shrink: 0; margin: 0 4px; }

        /* Tabs — scroll horizontal en mobile */
        .promo-tabs {
          display: flex; background: var(--cream-dark);
          border-radius: var(--radius-md); padding: 3px;
          overflow-x: auto; scrollbar-width: none;
          gap: 2px;
        }
        .promo-tabs::-webkit-scrollbar { display: none; }
        .promo-tab {
          flex-shrink: 0;
          padding: 9px 12px; border: none;
          border-radius: calc(var(--radius-md) - 2px);
          font-family: var(--font-body); font-size: 0.8rem; font-weight: 600;
          cursor: pointer; color: var(--warm-gray); background: none;
          transition: all var(--transition-fast); white-space: nowrap;
        }
        .promo-tab.active { background: white; color: var(--espresso); box-shadow: var(--shadow-sm); }

        .promo-error {
          padding: 12px 14px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.86rem;
        }

        .promo-suggestions-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(214,137,16,0.07); border: 1px solid rgba(214,137,16,0.3);
        }
        .promo-suggestions-banner p { font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }

        .promo-suggestions-list,
        .promo-list { display: flex; flex-direction: column; gap: 9px; }

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
        .promo-go-suggestions:hover { filter: brightness(1.08); transform: translateY(-1px); }

        .promo-count { text-align: right; font-size: 0.75rem; color: var(--warm-gray-light); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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