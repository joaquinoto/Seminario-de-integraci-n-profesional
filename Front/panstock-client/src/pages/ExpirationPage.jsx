import { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchSemaphore,
  selectSemaphoreItems,
  selectSemaphoreCounts,
  selectSemaphoreStatus,
  selectSemaphoreError,
  clearExpirationState,
} from '../features/stock/expirationSlice';
import {
  selectProducts,
  fetchProducts,
} from '../features/catalog/productsSlice';
import {
  autoWasteExpiredBatch,
  selectAutoWastePending,
} from '../features/waste/wasteSlice';
import {
  clearSaleState,
} from '../features/stock/stockSlice';
import {
  selectPromotions,
} from '../features/promotions/promotionsSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import { ConfirmDialog, TableSkeleton, Modal } from '../components/ui/CatalogUI';
import StockSaleForm from '../components/stock/StockSaleForm';
import AppTopbar from '../components/layout/AppTopbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isOwner = (user) => user?.role === 'OWNER';

const STATUS_CONFIG = {
  EXPIRED: { label: 'Vencido',        color: '#C0392B', bg: 'rgba(192,57,43,0.10)',  icon: '💀', order: 0 },
  RED:     { label: 'Vence hoy',      color: '#E74C3C', bg: 'rgba(231,76,60,0.10)',  icon: '🔴', order: 1 },
  YELLOW:  { label: 'Vence pronto',   color: '#D68910', bg: 'rgba(214,137,16,0.10)', icon: '🟡', order: 2 },
  GREEN:   { label: 'En buen estado', color: '#1E8449', bg: 'rgba(30,132,73,0.10)',  icon: '🟢', order: 3 },
};

// Orden de urgencia para elegir el lote a mostrar
const STATUS_ORDER = { EXPIRED: 0, RED: 1, YELLOW: 2, GREEN: 3 };

function statusOrder(status) {
  return STATUS_ORDER[status] ?? 99;
}

/**
 * Dado el array de ítems de un producto (ya filtrados con stock > 0),
 * devuelve el lote más urgente:
 *   1. Por status (EXPIRED < RED < YELLOW < GREEN)
 *   2. Dentro del mismo status, por daysToExpire ASC (más próximo primero)
 */
function pickMostUrgentBatch(batches) {
  if (!batches || batches.length === 0) return null;
  return [...batches].sort((a, b) => {
    const sA = statusOrder(a.status);
    const sB = statusOrder(b.status);
    if (sA !== sB) return sA - sB;
    // Mismo status: menor daysToExpire primero (vence antes)
    const dA = a.daysToExpire ?? 9999;
    const dB = b.daysToExpire ?? 9999;
    return dA - dB;
  })[0];
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.GREEN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function DaysChip({ days, status }) {
  if (days == null) return <span style={{ color: 'var(--warm-gray)', fontSize: '0.82rem' }}>—</span>;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.GREEN;
  const text = days < 0
    ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
    : days === 0 ? 'Vence hoy'
    : `${days} día${days !== 1 ? 's' : ''}`;
  return <span style={{ fontSize: '0.84rem', fontWeight: 600, color: cfg.color }}>{text}</span>;
}

// ─── Summary pills ────────────────────────────────────────────────────────────

function SummaryBar({ counts, activeFilter, onFilter }) {
  const pills = [
    { key: 'ALL',    label: 'Todos',          count: counts.expired + counts.red + counts.yellow + counts.green, color: 'var(--espresso)', bg: 'var(--cream-dark)' },
    { key: 'EXPIRED',label: 'Vencidos',       count: counts.expired, color: STATUS_CONFIG.EXPIRED.color, bg: STATUS_CONFIG.EXPIRED.bg },
    { key: 'RED',    label: 'Vencen hoy',     count: counts.red,     color: STATUS_CONFIG.RED.color,     bg: STATUS_CONFIG.RED.bg     },
    { key: 'YELLOW', label: 'Vencen pronto',  count: counts.yellow,  color: STATUS_CONFIG.YELLOW.color,  bg: STATUS_CONFIG.YELLOW.bg  },
    { key: 'GREEN',  label: 'En buen estado', count: counts.green,   color: STATUS_CONFIG.GREEN.color,   bg: STATUS_CONFIG.GREEN.bg   },
  ];

  return (
    <div className="summary-bar">
      {pills.map((p) => (
        <button
          key={p.key}
          className={`summary-pill ${activeFilter === p.key ? 'active' : ''}`}
          style={{ '--pill-color': p.color, '--pill-bg': p.bg }}
          onClick={() => onFilter(p.key)}
        >
          <span className="pill-count">{p.count}</span>
          <span className="pill-label">{p.label}</span>
        </button>
      ))}
      <style>{`
        .summary-bar {
          display: flex; gap: 8px; flex-wrap: wrap;
          padding: 14px 16px; background: white;
          border-radius: var(--radius-lg); border: 1px solid var(--cream-dark);
          box-shadow: var(--shadow-sm); margin-bottom: var(--space-lg);
        }
        .summary-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 14px; border-radius: var(--radius-md);
          border: 1.5px solid transparent; background: var(--cream);
          cursor: pointer; font-family: var(--font-body);
          transition: all var(--transition-fast);
        }
        .summary-pill:hover { background: var(--pill-bg); border-color: var(--pill-color); }
        .summary-pill.active {
          background: var(--pill-bg); border-color: var(--pill-color);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .pill-count { font-size: 1.1rem; font-weight: 800; color: var(--pill-color); line-height: 1; }
        .pill-label { font-size: 0.78rem; font-weight: 600; color: var(--warm-gray); }
        .summary-pill.active .pill-label { color: var(--pill-color); }
      `}</style>
    </div>
  );
}

// ─── ProductBatchCard ─────────────────────────────────────────────────────────
// Muestra una card por producto con el lote más urgente con stock disponible.
// Incluye botón de venta (ambos roles) y botón de promo (owner activa, employee ve).

function ProductBatchCard({
  productId,
  productName,
  displayBatch,       // el lote a mostrar (más urgente con stock)
  totalBatchesCount,  // cuántos lotes tiene el producto en total (con stock)
  isProductActive,
  activePromo,
  isOwnerUser,
  onSale,
  onPromo,
}) {
  const cfg = STATUS_CONFIG[displayBatch.status] || STATUS_CONFIG.GREEN;
  const hasActivePromo = Boolean(activePromo);
  const hasUrgent = displayBatch.status === 'EXPIRED'
    || displayBatch.status === 'RED'
    || displayBatch.status === 'YELLOW';

  return (
    <div
      className="exp-group"
      style={{ '--group-color': cfg.color, '--group-bg': cfg.bg }}
    >
      {/* Header de la card */}
      <div className="exp-group-header">
        <div className="exp-group-left">
          <div className="exp-group-indicator" style={{ background: cfg.color }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="exp-group-name">{productName}</span>
              {!isProductActive && (
                <span className="exp-inactive-badge">🚫 Retirado de la venta</span>
              )}
              {totalBatchesCount > 1 && (
                <span className="exp-more-batches">
                  +{totalBatchesCount - 1} lote{totalBatchesCount - 1 !== 1 ? 's' : ''} más
                </span>
              )}
            </div>
            <span className="exp-group-count">
              Stock total: {Number(displayBatch.currentQuantity).toLocaleString('es-AR')} u. · Lote #{displayBatch.batchId}
            </span>
          </div>
        </div>

        {/* Acciones del grupo */}
        <div className="exp-group-actions">
          {/* Registrar venta — ambos roles */}
          <button
            className="exp-action-btn sale"
            onClick={() => onSale({ productId, productName })}
            title="Registrar venta de este producto"
          >
            🛒 Registrar venta
          </button>
        </div>
      </div>

      {/* Fila del lote */}
      <div className="exp-batches">
        <div className="exp-batch-row">
          <div className="exp-batch-left">
            <StatusPill status={displayBatch.status} />
            <span className="exp-batch-date">
              📅 {displayBatch.expirationDate
                ? new Date(displayBatch.expirationDate + 'T00:00:00').toLocaleDateString('es-AR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : '—'}
            </span>
            <DaysChip days={displayBatch.daysToExpire} status={displayBatch.status} />
          </div>

          <div className="exp-batch-right-wrap">
            <div className="exp-batch-right">
              <span className="exp-batch-qty">
                {displayBatch.currentQuantity != null
                  ? `${Number(displayBatch.currentQuantity).toLocaleString('es-AR')} u.`
                  : '—'}
              </span>
              <span className="exp-batch-id">Lote #{displayBatch.batchId}</span>
            </div>

            {/* Botón de promo */}
            {hasActivePromo ? (
              <button
                className="exp-batch-promo-btn active-promo"
                onClick={() => onPromo(displayBatch, activePromo)}
                title="Ver promoción activa para este lote"
              >
                🏷️ Ver promo
              </button>
            ) : (
              isOwnerUser && hasUrgent && isProductActive && (
                <button
                  className="exp-batch-promo-btn activate-promo"
                  onClick={() => onPromo(displayBatch, null)}
                  title="Crear promoción para este lote"
                >
                  🏷️ Activar promo
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExpirationPage() {
  const dispatch         = useDispatch();
  const navigate         = useNavigate();
  const token            = useSelector(selectToken);
  const user             = useSelector(selectUser);
  const items            = useSelector(selectSemaphoreItems);
  const counts           = useSelector(selectSemaphoreCounts);
  const status           = useSelector(selectSemaphoreStatus);
  const fetchErr         = useSelector(selectSemaphoreError);
  const allProducts      = useSelector(selectProducts);
  const autoWastePending = useSelector(selectAutoWastePending);
  const allPromotions    = useSelector(selectPromotions);

  const [activeFilter,   setActiveFilter]   = useState('ALL');
  const [search,         setSearch]         = useState('');
  const [autoWasteToast, setAutoWasteToast] = useState('');
  const [saleModal,      setSaleModal]      = useState(null); // { productId, productName, activePromo }

  const processingRef = useRef(new Set());

  // ── Helpers de promociones ────────────────────────────────────────────────
  const getActivePromoForBatch = (batchId) => {
    if (!allPromotions?.length) return null;
    return allPromotions.find(
      (p) => p.status === 'ACTIVE' && p.batchId === batchId
    ) || null;
  };

  // ── Fetch al montar ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));
    dispatch(fetchProducts({ token, params: { activeOnly: false } }));
  }, [token, dispatch]);

  // ── AUTO-DESCARTE de lotes vencidos ──────────────────────────────────────
  useEffect(() => {
    if (status !== 'succeeded') return;

    const toProcess = items.filter(
      (item) =>
        item.status === 'EXPIRED' &&
        item.daysToExpire != null &&
        item.daysToExpire < 0 &&
        Number(item.currentQuantity) > 0 &&
        !processingRef.current.has(item.batchId) &&
        !autoWastePending.includes(item.batchId)
    );

    if (toProcess.length === 0) return;

    toProcess.forEach((item) => processingRef.current.add(item.batchId));

    const processAll = async () => {
      try {
        for (const item of toProcess) {
          await dispatch(
            autoWasteExpiredBatch({
              token,
              batchId:  item.batchId,
              quantity: Number(item.currentQuantity),
            })
          );
        }
        dispatch(clearExpirationState());
        dispatch(fetchSemaphore({ token }));

        const plural = toProcess.length !== 1;
        setAutoWasteToast(
          `✅ ${toProcess.length} lote${plural ? 's' : ''} vencido${plural ? 's' : ''} descartado${plural ? 's' : ''} automáticamente.`
        );
        setTimeout(() => setAutoWasteToast(''), 5000);
      } finally {
        processingRef.current.clear();
      }
    };

    processAll();
  }, [status, items, token, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const isProductActive = (productId) => {
    const found = allProducts.find((p) => p.id === productId);
    return found ? Boolean(found.active) : true;
  };

  // ── Agrupar por producto y elegir lote más urgente ─────────────────────
  // Solo mostramos lotes con stock > 0 y que no estén filtrados por activeFilter
  const groupedProducts = useMemo(() => {
    // 1. Filtrar por búsqueda
    let filtered = [...items];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((i) => i.productName.toLowerCase().includes(q));
    }

    // 2. Agrupar todos los lotes por producto
    const productMap = new Map();
    for (const item of filtered) {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          productId:   item.productId,
          productName: item.productName,
          batches:     [],
        });
      }
      productMap.get(item.productId).batches.push(item);
    }

    // 3. Por cada producto, elegir el lote más urgente con stock > 0
    const result = [];
    for (const [, group] of productMap) {
      const batchesWithStock = group.batches.filter(
        (b) => Number(b.currentQuantity) > 0
      );
      if (batchesWithStock.length === 0) continue;

      const displayBatch = pickMostUrgentBatch(batchesWithStock);

      // 4. Filtrar por activeFilter: aplicar sobre el lote elegido
      if (activeFilter !== 'ALL' && displayBatch.status !== activeFilter) continue;

      result.push({
        productId:       group.productId,
        productName:     group.productName,
        displayBatch,
        totalBatchCount: batchesWithStock.length,
      });
    }

    // 5. Ordenar: primero los más urgentes
    result.sort((a, b) => {
      const sA = statusOrder(a.displayBatch.status);
      const sB = statusOrder(b.displayBatch.status);
      if (sA !== sB) return sA - sB;
      const dA = a.displayBatch.daysToExpire ?? 9999;
      const dB = b.displayBatch.daysToExpire ?? 9999;
      return dA - dB;
    });

    return result;
  }, [items, activeFilter, search]);

  // ── Handlers de venta ────────────────────────────────────────────────────
  const handleSaleSuccess = () => {
    setSaleModal(null);
    dispatch(clearSaleState());
    dispatch(clearExpirationState());
    dispatch(fetchSemaphore({ token }));
  };

  // ── Handlers de promo ────────────────────────────────────────────────────
  const handlePromoClick = (batch, activePromo) => {
    if (activePromo) {
      navigate(`/promotions?tab=active&promoId=${activePromo.id}`);
    } else {
      navigate(`/promotions?tab=suggestions&batchId=${batch.batchId}`);
    }
  };

  const autoWasteRunning = autoWastePending.length > 0;

  return (
    <div className="exp-page">
      <AppTopbar />

      <div className="exp-content">

        {/* Header */}
        <div className="exp-header">
          <div>
            <h1 className="exp-title">⏰ Vencimientos</h1>
            <p className="exp-subtitle">
              Lote más próximo a vencer por producto
              {status === 'succeeded' && ` · ${groupedProducts.length} producto${groupedProducts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            className="exp-refresh-btn"
            onClick={() => {
              processingRef.current.clear();
              dispatch(clearExpirationState());
              dispatch(fetchSemaphore({ token }));
              dispatch(fetchProducts({ token, params: { activeOnly: false } }));
            }}
            disabled={status === 'loading' || autoWasteRunning}
            title="Actualizar"
          >
            <span className={(status === 'loading' || autoWasteRunning) ? 'spin' : ''}>↻</span>
            <span className="hide-sm">Actualizar</span>
          </button>
        </div>

        {/* Toast de auto-descarte */}
        {autoWasteToast && (
          <div className="exp-auto-toast">{autoWasteToast}</div>
        )}

        {/* Progreso de auto-descarte */}
        {autoWasteRunning && (
          <div className="exp-auto-progress">
            <span className="exp-auto-spinner" />
            <span>Descartando lotes vencidos automáticamente…</span>
          </div>
        )}

        {fetchErr && <div className="exp-error">⚠ {fetchErr}</div>}
        {status === 'loading' && <TableSkeleton rows={6} />}

        {/* Summary pills */}
        {status === 'succeeded' && (
          <SummaryBar
            counts={counts}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
          />
        )}

        {/* Buscador */}
        {status === 'succeeded' && items.length > 0 && (
          <div className="exp-controls">
            <div className="exp-search-wrap">
              <span className="exp-search-icon">🔍</span>
              <input
                className="exp-search"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="exp-search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {status === 'succeeded' && groupedProducts.length === 0 && (
          <div className="exp-empty">
            <span className="exp-empty-icon">
              {activeFilter === 'ALL' ? '✅' : STATUS_CONFIG[activeFilter]?.icon || '🔍'}
            </span>
            <p className="exp-empty-title">
              {activeFilter === 'ALL' && !search
                ? 'No hay lotes con fecha de vencimiento registrada'
                : search
                  ? 'Sin resultados para esa búsqueda'
                  : `No hay lotes en estado "${STATUS_CONFIG[activeFilter]?.label}"`}
            </p>
            {activeFilter !== 'ALL' && (
              <button className="exp-empty-reset" onClick={() => setActiveFilter('ALL')}>
                Ver todos
              </button>
            )}
          </div>
        )}

        {/* Cards de productos — 1 por producto */}
        {status === 'succeeded' && groupedProducts.length > 0 && (
          <div className="exp-groups">
            {groupedProducts.map((group) => {
              const activePromo   = getActivePromoForBatch(group.displayBatch.batchId);
              const productActive = isProductActive(group.productId);

              return (
                <ProductBatchCard
                  key={group.productId}
                  productId={group.productId}
                  productName={group.productName}
                  displayBatch={group.displayBatch}
                  totalBatchesCount={group.totalBatchCount}
                  isProductActive={productActive}
                  activePromo={activePromo}
                  isOwnerUser={isOwner(user)}
                  onSale={(info) => setSaleModal(info)}
                  onPromo={handlePromoClick}
                />
              );
            })}
          </div>
        )}

        {status === 'succeeded' && groupedProducts.length > 0 && (
          <p className="exp-count">
            {groupedProducts.length} producto{groupedProducts.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Modal: Registrar venta ── */}
      <Modal
        isOpen={Boolean(saleModal)}
        onClose={() => {
          dispatch(clearSaleState());
          setSaleModal(null);
        }}
        title={saleModal ? `Registrar venta — ${saleModal.productName}` : 'Registrar venta'}
        width="480px"
      >
        {saleModal && (
          <StockSaleForm
            initialProductId={saleModal.productId}
            onSuccess={handleSaleSuccess}
            onCancel={() => {
              dispatch(clearSaleState());
              setSaleModal(null);
            }}
          />
        )}
      </Modal>

      <style>{`
        .exp-page    { min-height: 100vh; background: var(--cream); }
        .exp-content { max-width: 1000px; margin: 0 auto; padding: var(--space-xl) var(--space-lg); }

        .exp-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; margin-bottom: var(--space-xl); flex-wrap: wrap;
        }
        .exp-title    { font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: var(--espresso); margin-bottom: 4px; }
        .exp-subtitle { font-size: 0.85rem; color: var(--warm-gray); }

        .exp-refresh-btn {
          display: flex; align-items: center; gap: 6px; padding: 9px 16px;
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.85rem; font-weight: 600; color: var(--warm-gray);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .exp-refresh-btn:hover:not(:disabled) { border-color: var(--amber); color: var(--amber); }
        .exp-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { display: inline-block; animation: spin 0.7s linear infinite; }

        .exp-auto-toast {
          padding: 12px 16px; background: rgba(46,125,50,0.10);
          border: 1.5px solid rgba(46,125,50,0.35); border-radius: var(--radius-md);
          color: #1E6B24; font-size: 0.88rem; font-weight: 600;
          animation: fadeIn 0.3s ease; margin-bottom: var(--space-md);
        }
        .exp-auto-progress {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: rgba(200,137,58,0.08);
          border: 1.5px solid rgba(200,137,58,0.3); border-radius: var(--radius-md);
          color: var(--amber-dark); font-size: 0.88rem; font-weight: 600;
          margin-bottom: var(--space-md);
        }
        .exp-auto-spinner {
          width: 16px; height: 16px; border: 2px solid var(--amber);
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
        .exp-error {
          padding: 12px 16px; background: var(--error-light); border: 1px solid var(--error);
          border-radius: var(--radius-md); color: var(--error);
          font-size: 0.88rem; margin-bottom: 16px;
        }

        .exp-controls { display: flex; flex-direction: column; gap: 10px; margin-bottom: var(--space-lg); }
        .exp-search-wrap { position: relative; max-width: 400px; }
        .exp-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .exp-search {
          width: 100%; padding: 9px 36px;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .exp-search:focus { border-color: var(--amber); }
        .exp-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }

        .exp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 24px; text-align: center; }
        .exp-empty-icon  { font-size: 2.4rem; opacity: 0.5; }
        .exp-empty-title { font-family: var(--font-display); font-size: 1.05rem; color: var(--espresso); font-weight: 700; }
        .exp-empty-reset {
          margin-top: 4px; padding: 8px 20px; background: var(--cream-dark); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body); font-size: 0.85rem;
          font-weight: 600; color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .exp-empty-reset:hover { background: var(--cream-medium); color: var(--espresso); }

        /* ── Cards ── */
        .exp-groups { display: flex; flex-direction: column; gap: 10px; }
        .exp-group {
          background: white; border-radius: var(--radius-lg);
          border: 1.5px solid var(--group-color);
          box-shadow: 0 2px 12px rgba(0,0,0,0.04); overflow: hidden;
          animation: fadeIn 0.3s ease both;
        }
        .exp-group-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 18px; background: var(--group-bg);
          border-bottom: 1px solid rgba(0,0,0,0.05); flex-wrap: wrap;
        }
        .exp-group-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .exp-group-indicator { width: 4px; height: 36px; border-radius: 2px; flex-shrink: 0; }
        .exp-group-name  { display: block; font-weight: 700; font-size: 0.98rem; color: var(--espresso); }
        .exp-group-count { display: block; font-size: 0.74rem; color: var(--warm-gray); margin-top: 1px; }

        .exp-inactive-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 20px; font-size: 0.7rem; font-weight: 700;
          color: #7f1d1d; background: rgba(127,29,29,0.1); white-space: nowrap;
        }
        /* Badge "más lotes" */
        .exp-more-batches {
          display: inline-flex; align-items: center;
          padding: 3px 9px; border-radius: 20px; font-size: 0.68rem; font-weight: 700;
          color: var(--warm-gray); background: var(--cream-dark); white-space: nowrap;
        }

        .exp-group-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .exp-action-btn {
          padding: 7px 14px; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.8rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
        }
        .exp-action-btn.sale {
          background: rgba(46,125,50,0.09); border: 1.5px solid rgba(46,125,50,0.3); color: #2E7D32;
        }
        .exp-action-btn.sale:hover {
          background: rgba(46,125,50,0.16); border-color: #2E7D32;
        }

        /* Fila del lote */
        .exp-batches { display: flex; flex-direction: column; }
        .exp-batch-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 18px;
          transition: background var(--transition-fast);
        }
        .exp-batch-row:hover { background: var(--cream); }
        .exp-batch-left  { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        .exp-batch-right-wrap {
          display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap;
          justify-content: flex-end;
        }
        .exp-batch-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .exp-batch-qty   { font-weight: 700; font-size: 0.88rem; color: var(--espresso); }
        .exp-batch-id    { font-size: 0.72rem; color: var(--warm-gray-light); }

        .exp-batch-promo-btn {
          padding: 5px 12px; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.76rem; font-weight: 700;
          cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .exp-batch-promo-btn.active-promo {
          background: rgba(46,125,50,0.10); border: 1.5px solid rgba(46,125,50,0.35); color: #2E7D32;
        }
        .exp-batch-promo-btn.active-promo:hover {
          background: rgba(46,125,50,0.18); border-color: #2E7D32;
        }
        .exp-batch-promo-btn.activate-promo {
          background: rgba(214,137,16,0.10); border: 1.5px solid rgba(214,137,16,0.35); color: #A07800;
        }
        .exp-batch-promo-btn.activate-promo:hover {
          background: rgba(214,137,16,0.18); border-color: #D68910;
        }

        .exp-count { text-align: right; font-size: 0.78rem; color: var(--warm-gray-light); margin-top: 12px; }

        @media (max-width: 600px) {
          .exp-group-header { flex-direction: column; align-items: flex-start; }
          .exp-batch-left   { gap: 8px; }
          .hide-sm          { display: none; }
          .exp-content      { padding: var(--space-lg) var(--space-md); }
          .exp-auto-progress { font-size: 0.8rem; }
          .exp-batch-right-wrap { flex-direction: column; align-items: flex-end; gap: 6px; }
        }
      `}</style>
    </div>
  );
}