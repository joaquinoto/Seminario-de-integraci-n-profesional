import { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser, selectToken } from '../features/auth/authSlice';
import {
  fetchSemaphore,
  selectSemaphoreItems,
  selectSemaphoreStatus,
  selectSemaphoreError,
  selectGreenCount,
  selectYellowCount,
  selectRedCount,
  selectExpiredCount,
  clearExpirationState,
} from '../features/stock/expirationSlice';
import {
  clearSaleState,
} from '../features/stock/stockSlice';
import {
  fetchRestockSuggestions,
  selectRestockCount,
  selectRestockStatus,
  clearRestockState,
} from '../features/stock/restockSlice';
import {
  fetchPromotions,
  fetchPromotionSuggestions,
  selectVisiblePromotions,
  selectSuggestionsCount,
  selectSuggestionsStatus,
  clearPromotionsState,
} from '../features/promotions/promotionsSlice';
import { Modal } from '../components/ui/CatalogUI';
import StockSaleForm from '../components/stock/StockSaleForm';
import AppTopbar from '../components/layout/AppTopbar';

const roleLabels = {
  OWNER:    { label: 'Dueño / Encargado', color: '#A06C28', bg: 'rgba(200,137,58,0.12)', icon: '👑' },
  EMPLOYEE: { label: 'Empleado/a',        color: '#2E7D32', bg: 'rgba(46,125,50,0.10)',  icon: '👤' },
};

const MAIN_MODULES = [
  { icon: '📦', title: 'Stock',        desc: 'Inventario, lotes e ingresos',           to: '/stock'      },
  { icon: '🗑️', title: 'Mermas',       desc: 'Registro de descartes y desperdicios',   to: '/waste'      },
  { icon: '⏰', title: 'Vencimientos', desc: 'Semáforo de fechas de vencimiento',      to: '/expiration' },
  { icon: '🏷️', title: 'Promociones',  desc: 'Descuentos sobre lotes próximos a vencer', to: '/promotions' },
];

const CATALOG_MODULES = [
  { icon: '🥐', title: 'Productos',   desc: 'Catálogo de franquicia y externos',     to: '/products'   },
  { icon: '🗂',  title: 'Categorías',  desc: 'Grupos y clasificaciones',              to: '/categories' },
  { icon: '🚚', title: 'Proveedores', desc: 'Franquicia, mayoristas y externos',     to: '/suppliers'  },
];

const OWNER_MODULES = [
  { icon: '🛒', title: 'Reposición', desc: 'Productos con stock por debajo del mínimo', to: '/restock' },
  { icon: '📊', title: 'Reportes',   desc: 'Mermas, ventas y balance de stock', to: '/reports' },
];

const MAX_STOCK_DASHBOARD_ITEMS = 9;

const EXPIRATION_STATUS_CONFIG = {
  EXPIRED: { label: 'Vencido',      color: '#C0392B', bg: 'rgba(192,57,43,0.10)',  icon: '●', order: 0 },
  RED:     { label: 'Vence hoy',    color: '#E74C3C', bg: 'rgba(231,76,60,0.10)',  icon: '●', order: 1 },
  YELLOW:  { label: 'Próximo',      color: '#ffbb00', bg: 'rgba(214,161,15,0.16)', icon: '●', order: 2 },
  GREEN:   { label: 'En orden',     color: '#27AE60', bg: 'rgba(39,174,96,0.10)',  icon: '●', order: 3 },
};

const PROMOTION_SUGGESTION_STATUSES = new Set(['EXPIRED', 'RED', 'YELLOW']);

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const formatQuantity = (value) => {
  const qty = Number(value ?? 0);
  if (!Number.isFinite(qty)) return '0 u.';
  return `${qty.toLocaleString('es-AR')} u.`;
};

const getProductName = (item) =>
  item?.productName
  || item?.product?.name
  || item?.name
  || item?.description
  || item?.productDescription
  || 'Producto sin nombre';

const getExpirationStatus = (item) =>
  item?.status
  || item?.semaphoreStatus
  || 'GREEN';

const getExpirationText = (item) => {
  const status = getExpirationStatus(item);
  const days = item?.daysToExpire;

  if (status === 'EXPIRED') {
    if (days != null && Number(days) < 0) {
      const abs = Math.abs(Number(days));
      return `Vencido hace ${abs} día${abs !== 1 ? 's' : ''}`;
    }
    return 'Vencido';
  }

  if (status === 'RED' || Number(days) === 0) return 'Vence hoy';

  if (days != null && Number(days) > 0) {
    return `Vence en ${Number(days)} día${Number(days) !== 1 ? 's' : ''}`;
  }

  return EXPIRATION_STATUS_CONFIG[status]?.label || 'Sin fecha';
};

const getRemainingQuantity = (item) =>
  Number(
    item?.currentQuantity
    ?? item?.quantity
    ?? item?.remainingUnits
    ?? item?.stock
    ?? item?.currentStock
    ?? item?.availableQuantity
    ?? 0
  );

const getRemainingUnits = (item) => formatQuantity(getRemainingQuantity(item));

const getProductIcon = (item) => {
  const text = normalizeText(`${getProductName(item)} ${item?.categoryName || item?.product?.categoryName || ''}`);
  if (text.includes('pan')) return '🥖';
  if (text.includes('factura') || text.includes('medialuna') || text.includes('croissant')) return '🥐';
  if (text.includes('torta') || text.includes('pastel')) return '🍰';
  if (text.includes('galleta') || text.includes('cookie')) return '🍪';
  if (text.includes('sandwich') || text.includes('sándwich')) return '🥪';
  if (text.includes('bebida') || text.includes('jugo')) return '🥤';
  return '📦';
};

const getCardAccentColor = (status) =>
  EXPIRATION_STATUS_CONFIG[status]?.color || EXPIRATION_STATUS_CONFIG.GREEN.color;

const getCardSoftBackground = (status) =>
  EXPIRATION_STATUS_CONFIG[status]?.bg || EXPIRATION_STATUS_CONFIG.GREEN.bg;

const getStatusOrder = (status) =>
  EXPIRATION_STATUS_CONFIG[status]?.order ?? 99;

const compareByExpirationUrgency = (a, b) => {
  const statusDiff = getStatusOrder(getExpirationStatus(a)) - getStatusOrder(getExpirationStatus(b));
  if (statusDiff !== 0) return statusDiff;

  const daysA = a?.daysToExpire ?? 9999;
  const daysB = b?.daysToExpire ?? 9999;
  if (daysA !== daysB) return daysA - daysB;

  return String(getProductName(a)).localeCompare(String(getProductName(b)), 'es');
};

export default function DashboardPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const user      = useSelector(selectUser);
  const token     = useSelector(selectToken);
  const items     = useSelector(selectSemaphoreItems);
  const semStatus = useSelector(selectSemaphoreStatus);
  const semError  = useSelector(selectSemaphoreError);
  const greenCount   = useSelector(selectGreenCount);
  const yellowCount  = useSelector(selectYellowCount);
  const redCount     = useSelector(selectRedCount);
  const expiredCount = useSelector(selectExpiredCount);

  const restockCount  = useSelector(selectRestockCount);
  const restockStatus = useSelector(selectRestockStatus);

  // Usamos selectVisiblePromotions (filtra inactivos y lotes vencidos)
  const visiblePromotions       = useSelector(selectVisiblePromotions);
  const promotionSuggestCount   = useSelector(selectSuggestionsCount);
  const promotionSuggestStatus  = useSelector(selectSuggestionsStatus);

  const activePromoCount = visiblePromotions.filter((p) => p.status === 'ACTIVE').length;

  const [productSearch, setProductSearch] = useState('');
  const [saleModal, setSaleModal] = useState(null);

  const isOwner = user?.role === 'OWNER';
  const role    = roleLabels[user?.role] || roleLabels.EMPLOYEE;

  const counts = {
    green:   greenCount,
    yellow:  yellowCount,
    red:     redCount,
    expired: expiredCount,
  };

  useEffect(() => {
    if (!token) return;

    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));

    dispatch(clearPromotionsState());
    dispatch(fetchPromotions({ token }));

    if (isOwner) {
      if (restockStatus === 'idle') {
        dispatch(clearRestockState());
        dispatch(fetchRestockSuggestions({ token }));
      }
      if (promotionSuggestStatus === 'idle') {
        dispatch(fetchPromotionSuggestions({ token }));
      }
    }
  }, [token, dispatch, isOwner]);

  const stockDashboardItems = useMemo(() => {
    const query = normalizeText(productSearch);
    const candidates = (items || []).filter((item) => {
      if (getRemainingQuantity(item) <= 0) return false;
      if (!query) return true;

      const searchText = normalizeText([
        getProductName(item),
        item?.categoryName,
        item?.batchId ? `lote ${item.batchId}` : '',
        item?.productId,
      ].join(' '));

      return searchText.includes(query);
    });

    const sorted = [...candidates].sort(compareByExpirationUrgency);

    return {
      visible: sorted.slice(0, MAX_STOCK_DASHBOARD_ITEMS),
      total: sorted.length,
      hasMore: sorted.length > MAX_STOCK_DASHBOARD_ITEMS,
    };
  }, [items, productSearch]);

  const getActivePromoForItem = (item) => {
    if (!visiblePromotions?.length) return null;
    const batchId = item?.batchId;
    const productId = item?.productId;

    return visiblePromotions.find((promo) =>
      promo.status === 'ACTIVE' && promo.batchId === batchId
    ) || visiblePromotions.find((promo) =>
      promo.status === 'ACTIVE' && promo.productId === productId && !promo.batchId
    ) || null;
  };

  const handleSaleSuccess = () => {
    setSaleModal(null);
    dispatch(clearSaleState());
    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));
  };

  const handleSaleClose = () => {
    dispatch(clearSaleState());
    setSaleModal(null);
  };

  const handlePromoClick = (item) => {
    const activePromo = getActivePromoForItem(item);
    if (activePromo) {
      navigate(`/promotions?tab=active&promoId=${activePromo.id}`);
      return;
    }

    const status = getExpirationStatus(item);
    if (isOwner && PROMOTION_SUGGESTION_STATUSES.has(status)) {
      navigate(`/promotions?tab=suggestions&batchId=${item.batchId}`);
      return;
    }

    navigate(isOwner ? '/promotions?tab=manual' : '/promotions?tab=active');
  };

  const getPromoButtonLabel = (item) => {
    if (getActivePromoForItem(item)) return 'Ver promo';
    if (isOwner && PROMOTION_SUGGESTION_STATUSES.has(getExpirationStatus(item))) return 'Ver sugerencia';
    return 'Ver promos';
  };

  const urgentCount = counts.expired + counts.red + counts.yellow;
  const semColor    = counts.expired > 0 ? '#C0392B'
                    : counts.red     > 0 ? '#E74C3C'
                    : counts.yellow  > 0 ? '#D6A10F'
                    : '#27AE60';

  const promoColor = isOwner
    ? (promotionSuggestCount > 0 ? '#D68910' : activePromoCount > 0 ? '#2E7D32' : '#27AE60')
    : (activePromoCount > 0 ? '#2E7D32' : '#27AE60');

  const promoSubtext = isOwner
    ? promotionSuggestCount > 0
        ? `${promotionSuggestCount} sugerencia${promotionSuggestCount !== 1 ? 's' : ''} pendiente${promotionSuggestCount !== 1 ? 's' : ''}`
        : activePromoCount > 0
            ? `${activePromoCount} promoción${activePromoCount !== 1 ? 'es' : ''} activa${activePromoCount !== 1 ? 's' : ''}`
            : 'Sin sugerencias ni promociones activas'
    : activePromoCount > 0
        ? `${activePromoCount} promoción${activePromoCount !== 1 ? 'es' : ''} activa${activePromoCount !== 1 ? 's' : ''}`
        : 'Sin promociones activas por el momento';

  return (
    <div className="dash-page">
      <AppTopbar />

      <main className="dash-main">

        {/* ── Welcome ── */}
        <div className="welcome-card">
          <div className="welcome-avatar">
            {user?.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="welcome-info">
            <h1 className="welcome-title">¡Hola, {user?.firstName || user?.username}!</h1>
            <p className="welcome-sub">Bienvenido/a a tu panel de gestión</p>
            <span className="role-badge" style={{ color: role.color, background: role.bg }}>
              {role.icon} {role.label}
            </span>
          </div>
        </div>

        {/* ── Stock por vencimiento ── */}
        <section className="expiring-products-section">
          <div className="eps-search-wrap">
            <span className="eps-search-icon">🔍</span>
            <input
              className="eps-search"
              placeholder="Buscar productos..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productSearch && (
              <button
                type="button"
                className="eps-search-clear"
                onClick={() => setProductSearch('')}
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="eps-header">
            <div>
              <h2 className="eps-title">Stock por vencimiento</h2>
              <p className="eps-subtitle">
                {semStatus === 'loading'
                  ? 'Actualizando lotes...'
                  : stockDashboardItems.total > 0
                    ? `${stockDashboardItems.total} lote${stockDashboardItems.total !== 1 ? 's' : ''} en stock para revisar`
                    : 'Lotes ordenados por urgencia de vencimiento'}
              </p>
            </div>
            <button
              type="button"
              className="eps-view-all"
              onClick={() => navigate('/expiration')}
            >
              Ver todos
            </button>
          </div>

          {semStatus === 'loading' && (
            <div className="eps-loading">
              <span className="eps-spinner" />
              <span>Cargando lotes en stock...</span>
            </div>
          )}

          {semStatus === 'failed' && (
            <div className="eps-message error">
              No se pudieron cargar los lotes en stock{semError ? `: ${semError}` : '.'}
            </div>
          )}

          {semStatus === 'succeeded' && stockDashboardItems.visible.length === 0 && (
            <div className="eps-message">
              {productSearch
                ? 'Sin resultados para esa búsqueda'
                : 'No hay lotes en stock con vencimiento registrado'}
            </div>
          )}

          {semStatus === 'succeeded' && stockDashboardItems.visible.length > 0 && (
            <>
              <div className="eps-grid">
                {stockDashboardItems.visible.map((item) => {
                  const status = getExpirationStatus(item);
                  const cfg = EXPIRATION_STATUS_CONFIG[status] || EXPIRATION_STATUS_CONFIG.GREEN;
                  const activePromo = getActivePromoForItem(item);
                  const cardColor = getCardAccentColor(status);
                  const cardBg = getCardSoftBackground(status);

                  return (
                    <article
                      key={`${item.batchId || item.productId}-${status}`}
                      className="eps-product-card"
                      style={{ '--ep-color': cardColor, '--ep-bg': cardBg }}
                    >
                      <div className="eps-card-top">
                        <div className="eps-product-avatar">{getProductIcon(item)}</div>
                        <div className="eps-product-main">
                          <h3 className="eps-product-name">{getProductName(item)}</h3>
                          <p className="eps-product-meta">
                            {item.categoryName ? `${item.categoryName} · ` : ''}
                            Lote #{item.batchId || '—'}
                          </p>
                        </div>
                        <span className="eps-status-dot" aria-label={cfg.label} />
                      </div>

                      <div className="eps-expiration-line" style={{ color: cardColor }}>
                        {getExpirationText(item)}
                      </div>

                      <div className="eps-stock-row">
                        <span>Unidades restantes</span>
                        <strong>{getRemainingUnits(item)}</strong>
                      </div>

                      <div className="eps-card-tags">
                        <span className="eps-status-pill">
                          <span>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                        {activePromo && <span className="eps-promo-pill">Promo activa</span>}
                      </div>

                      <div className="eps-actions">
                        <button
                          type="button"
                          className="eps-action primary"
                          onClick={() => setSaleModal({
                            productId: item.productId,
                            productName: getProductName(item),
                          })}
                          disabled={!item.productId}
                        >
                          Registrar venta
                        </button>
                        <button
                          type="button"
                          className="eps-action secondary"
                          onClick={() => handlePromoClick(item)}
                        >
                          {getPromoButtonLabel(item)}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {stockDashboardItems.hasMore && (
                <button
                  type="button"
                  className="eps-more-link"
                  onClick={() => navigate('/expiration')}
                >
                  Ver todos los lotes en vencimientos
                </button>
              )}
            </>
          )}
        </section>
      </main>

      <Modal
        isOpen={Boolean(saleModal)}
        onClose={handleSaleClose}
        title={saleModal ? `Registrar venta - ${saleModal.productName}` : 'Registrar venta'}
        width="480px"
      >
        {saleModal && (
          <StockSaleForm
            initialProductId={saleModal.productId}
            onSuccess={handleSaleSuccess}
            onCancel={handleSaleClose}
          />
        )}
      </Modal>

      <style>{`
        .dash-page  { min-height: 100vh; background: var(--cream); animation: fadeIn 0.4s ease; }
        .dash-main  {
          max-width: 920px; margin: 0 auto;
          padding: var(--space-lg) var(--space-md);
          display: flex; flex-direction: column; gap: var(--space-lg);
        }

        /* ── Welcome ── */
        .welcome-card {
          display: flex; align-items: center; gap: var(--space-md);
          padding: var(--space-lg) var(--space-xl);
          background: var(--espresso);
          border-radius: var(--radius-xl); color: var(--cream);
          animation: slideUp 0.4s ease 0.1s both;
        }
        .welcome-avatar {
          width: 50px; height: 50px; border-radius: 50%;
          background: var(--amber);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 1.4rem; font-weight: 700;
          color: white; flex-shrink: 0;
        }
        .welcome-title {
          font-family: var(--font-display);
          font-size: clamp(1.1rem, 4vw, 1.4rem);
          font-weight: 700; margin-bottom: 3px;
        }
        .welcome-sub   { font-size: 0.82rem; opacity: 0.7; margin-bottom: 8px; }
        .role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 20px;
          font-size: 0.76rem; font-weight: 600;
        }

        /* ── Expiring products section ── */
        .expiring-products-section {
          display: flex; flex-direction: column; gap: 13px;
          animation: slideUp 0.4s ease 0.13s both;
        }
        .eps-search-wrap {
          position: relative; width: 100%;
        }
        .eps-search-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%); font-size: 0.86rem;
          pointer-events: none;
        }
        .eps-search {
          width: 100%; padding: 11px 40px;
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
          font-family: var(--font-body); font-size: 0.9rem;
          color: var(--espresso); outline: none;
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
        }
        .eps-search:focus {
          border-color: var(--amber);
          box-shadow: 0 0 0 3px rgba(200,137,58,0.12), var(--shadow-sm);
        }
        .eps-search-clear {
          position: absolute; right: 11px; top: 50%;
          transform: translateY(-50%);
          width: 26px; height: 26px; border: none; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--cream); color: var(--warm-gray);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .eps-search-clear:hover { background: var(--cream-dark); color: var(--espresso); }
        .eps-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .eps-title {
          font-family: var(--font-display); font-size: 1.08rem; font-weight: 700;
          color: var(--espresso); margin-bottom: 3px;
        }
        .eps-subtitle { font-size: 0.8rem; color: var(--warm-gray); }
        .eps-view-all,
        .eps-more-link {
          border: 1.5px solid var(--cream-dark); background: white;
          color: var(--espresso); border-radius: var(--radius-md);
          font-family: var(--font-body); font-weight: 700;
          cursor: pointer; transition: all var(--transition-fast);
        }
        .eps-view-all {
          padding: 8px 13px; font-size: 0.8rem;
        }
        .eps-view-all:hover,
        .eps-more-link:hover {
          border-color: var(--amber); color: var(--amber);
          box-shadow: var(--shadow-sm); transform: translateY(-1px);
        }
        .eps-loading,
        .eps-message {
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
        }
        .eps-loading {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; color: var(--warm-gray);
          font-size: 0.86rem; font-weight: 600;
        }
        .eps-spinner {
          width: 16px; height: 16px; border: 2px solid var(--amber);
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
        .eps-message {
          padding: 24px 18px; text-align: center;
          color: var(--warm-gray); font-size: 0.88rem; font-weight: 600;
        }
        .eps-message.error {
          color: #C0392B; background: rgba(192,57,43,0.05);
          border-color: rgba(192,57,43,0.22);
        }
        .eps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 12px;
        }
        .eps-product-card {
          position: relative; overflow: hidden; min-width: 0;
          display: flex; flex-direction: column; gap: 12px;
          padding: 15px; background: var(--ep-bg);
          border: 1.5px solid var(--ep-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
        }
        .eps-product-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--ep-color);
        }
        .eps-card-top {
          display: flex; align-items: center; gap: 10px; min-width: 0;
        }
        .eps-product-avatar {
          width: 42px; height: 42px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.68); color: var(--ep-color);
          border: 1px solid rgba(255,255,255,0.75);
          font-size: 1.25rem; flex-shrink: 0;
        }
        .eps-product-main { flex: 1; min-width: 0; }
        .eps-product-name {
          font-family: var(--font-display); font-size: 0.98rem;
          line-height: 1.25; font-weight: 700; color: var(--espresso);
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
          word-break: break-word;
        }
        .eps-product-meta {
          margin-top: 2px; color: var(--warm-gray);
          font-size: 0.74rem; line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .eps-status-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--ep-color); box-shadow: 0 0 0 4px rgba(255,255,255,0.62);
          flex-shrink: 0;
        }
        .eps-expiration-line {
          padding: 9px 11px; background: rgba(255,255,255,0.62);
          border-radius: var(--radius-md);
          font-size: 0.9rem; font-weight: 800;
        }
        .eps-stock-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; color: var(--warm-gray); font-size: 0.78rem;
        }
        .eps-stock-row strong {
          font-family: var(--font-display); color: var(--espresso);
          font-size: 1rem; white-space: nowrap;
        }
        .eps-card-tags {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .eps-status-pill,
        .eps-promo-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 9px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 800;
          white-space: nowrap;
        }
        .eps-status-pill {
          color: var(--ep-color); background: rgba(255,255,255,0.64);
        }
        .eps-promo-pill {
          color: #2E7D32; background: rgba(255,255,255,0.64);
        }
        .eps-actions {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-top: auto;
        }
        .eps-action {
          min-height: 38px; padding: 9px 10px;
          border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.78rem;
          font-weight: 800; cursor: pointer;
          transition: all var(--transition-fast);
        }
        .eps-action.primary {
          border: none; background: var(--espresso); color: var(--cream);
          box-shadow: 0 4px 14px rgba(28,17,8,0.13);
        }
        .eps-action.primary:hover:not(:disabled) {
          background: var(--espresso-mid); transform: translateY(-1px);
        }
        .eps-action.primary:disabled {
          opacity: 0.5; cursor: not-allowed; transform: none;
        }
        .eps-action.secondary {
          border: 1.5px solid var(--cream-dark);
          background: var(--cream); color: var(--warm-gray);
        }
        .eps-action.secondary:hover {
          border-color: var(--amber); color: var(--amber);
          background: rgba(200,137,58,0.06);
        }
        .eps-more-link {
          align-self: center; padding: 9px 15px; font-size: 0.82rem;
          margin-top: 2px;
        }

        /* ── Semaphore card ── */
        .semaphore-card {
          width: 100%; display: flex; align-items: center; gap: var(--space-md);
          padding: 16px 18px;
          background: white; border: 2px solid var(--sem-color);
          border-radius: var(--radius-xl); cursor: pointer; text-align: left;
          font-family: var(--font-body);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          animation: slideUp 0.4s ease 0.15s both;
        }
        .semaphore-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .semaphore-card:active { transform: translateY(0); }

        .sem-left {
          display: flex; align-items: center; gap: 12px;
          flex: 1; min-width: 0;
        }
        .sem-icon-wrap {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.25rem;
        }
        .sem-title { font-weight: 700; font-size: 0.94rem; color: var(--espresso); margin-bottom: 2px; }
        .sem-sub   { font-size: 0.78rem; color: var(--warm-gray); }

        .sem-dots  { display: flex; gap: 12px; flex-shrink: 0; }
        .sem-dot-item { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .sem-dot-circle { width: 9px; height: 9px; border-radius: 50%; }
        .sem-dot-count  { font-size: 0.96rem; font-weight: 700; line-height: 1; }
        .sem-dot-label  {
          font-size: 0.6rem; color: var(--warm-gray);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .sem-arrow {
          font-size: 1.1rem; color: var(--sem-color); font-weight: 700;
          flex-shrink: 0; transition: transform var(--transition-fast);
        }
        .semaphore-card:hover .sem-arrow { transform: translateX(4px); }

        /* ── Promo dash card ── */
        .promo-dash-card {
          width: 100%; display: flex; align-items: center; gap: var(--space-md);
          padding: 16px 18px;
          background: white; border: 2px solid var(--promo-color);
          border-radius: var(--radius-xl); cursor: pointer; text-align: left;
          font-family: var(--font-body);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          animation: slideUp 0.4s ease 0.17s both;
        }
        .promo-dash-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .promo-dash-card:active { transform: translateY(0); }
        .promo-dash-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .promo-dash-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1.25rem;
        }
        .promo-dash-title { font-weight: 700; font-size: 0.94rem; color: var(--espresso); margin-bottom: 2px; }
        .promo-dash-sub   { font-size: 0.78rem; color: var(--warm-gray); }
        .promo-dash-badge {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 6px 12px; border-radius: 12px; flex-shrink: 0;
        }
        .promo-dash-badge-count { font-size: 1.3rem; font-weight: 800; line-height: 1; }
        .promo-dash-badge-label {
          font-size: 0.6rem; color: var(--warm-gray);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .promo-dash-arrow {
          font-size: 1.1rem; color: var(--promo-color); font-weight: 700;
          flex-shrink: 0; transition: transform var(--transition-fast);
        }
        .promo-dash-card:hover .promo-dash-arrow { transform: translateX(4px); }

        /* ── Restock card ── */
        .restock-card {
          width: 100%; display: flex; align-items: center; gap: var(--space-md);
          padding: 16px 18px;
          background: white; border: 2px solid var(--rst-color);
          border-radius: var(--radius-xl); cursor: pointer; text-align: left;
          font-family: var(--font-body);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          animation: slideUp 0.4s ease 0.19s both;
        }
        .restock-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .restock-card:active { transform: translateY(0); }
        .rst-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .rst-icon-wrap {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1.25rem;
        }
        .rst-title { font-weight: 700; font-size: 0.94rem; color: var(--espresso); margin-bottom: 2px; }
        .rst-sub   { font-size: 0.78rem; color: var(--warm-gray); }
        .rst-badge {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 6px 12px; border-radius: 12px;
          background: rgba(230,126,34,0.10); flex-shrink: 0;
        }
        .rst-badge-count { font-size: 1.3rem; font-weight: 800; color: #E67E22; line-height: 1; }
        .rst-badge-label {
          font-size: 0.6rem; color: var(--warm-gray);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .rst-arrow {
          font-size: 1.1rem; color: var(--rst-color); font-weight: 700;
          flex-shrink: 0; transition: transform var(--transition-fast);
        }
        .restock-card:hover .rst-arrow { transform: translateX(4px); }

        /* ── Info card ── */
        .info-card {
          background: white; border-radius: var(--radius-lg);
          padding: var(--space-xl); border: 1px solid var(--cream-dark);
          box-shadow: var(--shadow-sm);
        }
        .info-title {
          font-family: var(--font-display); font-size: 1rem; font-weight: 700;
          color: var(--espresso); margin-bottom: var(--space-md);
          padding-bottom: var(--space-md); border-bottom: 1px solid var(--cream-dark);
        }
        .info-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
        .info-item  { display: flex; flex-direction: column; gap: 3px; }
        .info-label {
          font-size: 0.68rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--warm-gray-light);
        }
        .info-value { font-size: 0.9rem; color: var(--espresso); font-weight: 500; }

        /* ── Section headings & module grid ── */
        .section-heading {
          font-family: var(--font-display); font-size: 1rem; font-weight: 700;
          color: var(--espresso); margin-bottom: var(--space-md);
        }
        .modules-grid { display: flex; flex-direction: column; gap: 7px; }

        .module-card {
          width: 100%; display: flex; align-items: center; gap: var(--space-md);
          padding: 14px 16px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm); text-align: left; font-family: var(--font-body);
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
        }
        .module-card.ready { cursor: pointer; }
        .module-card.ready:hover {
          box-shadow: var(--shadow-md); border-color: var(--amber);
          transform: translateY(-1px); background: rgba(200,137,58,0.02);
        }
        .module-card.owner-module:hover { border-color: #E67E22; }
        .module-card.ready:active { transform: translateY(0); }
        .module-card.soon  { opacity: 0.5; cursor: not-allowed; }

        .module-icon  { font-size: 1.4rem; flex-shrink: 0; }
        .module-text  { flex: 1; min-width: 0; }
        .module-title { font-weight: 600; font-size: 0.94rem; color: var(--espresso); margin-bottom: 2px; }
        .module-desc  { font-size: 0.78rem; color: var(--warm-gray); }

        .module-arrow {
          font-size: 1rem; color: var(--amber); font-weight: 700; flex-shrink: 0;
          transition: transform var(--transition-fast);
        }
        .module-card.ready:hover .module-arrow { transform: translateX(3px); }

        .module-count-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 22px; height: 22px; padding: 0 5px;
          border-radius: 11px; background: #E67E22; color: white;
          font-size: 0.72rem; font-weight: 800; flex-shrink: 0;
          animation: pulse-badge 2s ease infinite;
        }
        .module-badge {
          font-size: 0.63rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--warm-gray-light);
          background: var(--cream-dark); padding: 3px 8px;
          border-radius: 10px; flex-shrink: 0;
        }

        /* ── Mobile adjustments ── */
        @media (max-width: 480px) {
          .dash-main    { padding: var(--space-md) var(--space-sm); gap: var(--space-md); }
          .welcome-card { flex-direction: column; text-align: center; padding: var(--space-lg); }
          .welcome-avatar { width: 44px; height: 44px; font-size: 1.2rem; }
          .eps-header { align-items: flex-start; }
          .eps-view-all { width: 100%; }
          .eps-grid { grid-template-columns: 1fr; }
          .eps-actions { grid-template-columns: 1fr; }
          .sem-dots     { display: none; }
          .info-grid    { grid-template-columns: 1fr; }
          .rst-badge, .promo-dash-badge { display: none; }
          /* Cards de estado: más compactas */
          .semaphore-card,
          .promo-dash-card,
          .restock-card { padding: 13px 14px; gap: 12px; }
          .sem-icon-wrap,
          .promo-dash-icon,
          .rst-icon-wrap { width: 36px; height: 36px; font-size: 1.1rem; }
          .sem-title,
          .promo-dash-title,
          .rst-title { font-size: 0.88rem; }
          .sem-sub,
          .promo-dash-sub,
          .rst-sub   { font-size: 0.74rem; }
        }

        /* ── Desktop ── */
        @media (min-width: 768px) {
          .dash-main { padding: var(--space-xl) var(--space-lg); gap: var(--space-xl); }
          .welcome-card { padding: var(--space-xl) var(--space-2xl); }
          .welcome-avatar { width: 54px; height: 54px; font-size: 1.5rem; }
          .eps-title { font-size: 1.16rem; }
          .module-title { font-size: 1rem; }
          .module-desc  { font-size: 0.84rem; }
          .section-heading { font-size: 1.1rem; }
          .info-value { font-size: 0.96rem; }
        }
      `}</style>
    </div>
  );
}
