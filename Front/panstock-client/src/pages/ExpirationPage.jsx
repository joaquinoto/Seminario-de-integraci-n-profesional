import { useEffect, useState, useMemo } from 'react';
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
  deleteProduct,
  clearProductActionState,
  selectProductAction,
  selectProducts,
  fetchProducts,
} from '../features/catalog/productsSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import { ConfirmDialog, TableSkeleton } from '../components/ui/CatalogUI';
import AppTopbar from '../components/layout/AppTopbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isOwner = (user) => user?.role === 'OWNER';

const STATUS_CONFIG = {
  EXPIRED: { label: 'Vencido',        color: '#C0392B', bg: 'rgba(192,57,43,0.10)',  icon: '💀', order: 0 },
  RED:     { label: 'Vence hoy',      color: '#E74C3C', bg: 'rgba(231,76,60,0.10)',  icon: '🔴', order: 1 },
  YELLOW:  { label: 'Vence pronto',   color: '#D68910', bg: 'rgba(214,137,16,0.10)', icon: '🟡', order: 2 },
  GREEN:   { label: 'En buen estado', color: '#1E8449', bg: 'rgba(30,132,73,0.10)',  icon: '🟢', order: 3 },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.GREEN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      whiteSpace: 'nowrap',
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
    { key: 'ALL',    label: 'Todos',         count: counts.expired + counts.red + counts.yellow + counts.green, color: 'var(--espresso)', bg: 'var(--cream-dark)' },
    { key: 'EXPIRED',label: 'Vencidos',      count: counts.expired, color: STATUS_CONFIG.EXPIRED.color, bg: STATUS_CONFIG.EXPIRED.bg },
    { key: 'RED',    label: 'Vencen hoy',    count: counts.red,     color: STATUS_CONFIG.RED.color,     bg: STATUS_CONFIG.RED.bg     },
    { key: 'YELLOW', label: 'Vencen pronto', count: counts.yellow,  color: STATUS_CONFIG.YELLOW.color,  bg: STATUS_CONFIG.YELLOW.bg  },
    { key: 'GREEN',  label: 'En buen estado',count: counts.green,   color: STATUS_CONFIG.GREEN.color,   bg: STATUS_CONFIG.GREEN.bg   },
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExpirationPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token    = useSelector(selectToken);
  const user     = useSelector(selectUser);
  const items    = useSelector(selectSemaphoreItems);
  const counts   = useSelector(selectSemaphoreCounts);
  const status   = useSelector(selectSemaphoreStatus);
  const fetchErr = useSelector(selectSemaphoreError);
  const { status: actStatus } = useSelector(selectProductAction);

  const allProducts = useSelector(selectProducts);

  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search,       setSearch]       = useState('');
  const [confirmData,  setConfirmData]  = useState(null);

  // ── Se limpia el estado antes de fetchear ─────────────────
  // Esto evita que Redux Persist sirva datos viejos del localStorage mientras
  // llega la respuesta fresca del servidor.
  useEffect(() => {
    if (!token) return;
    // Limpiar items y conteos viejos del store ANTES del fetch
    dispatch(clearExpirationState());
    // Luego pedir datos frescos al servidor
    dispatch(fetchSemaphore({ token }));
    dispatch(fetchProducts({ token, params: { activeOnly: false } }));
  }, [token, dispatch]);

  const isProductActive = (productId) => {
    const found = allProducts.find((p) => p.id === productId);
    if (!found) return true;
    return found.active;
  };

  const filtered = useMemo(() => {
    let list = [...items];
    if (activeFilter !== 'ALL') list = list.filter((i) => i.status === activeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.productName.toLowerCase().includes(q));
    }
    return list;
  }, [items, activeFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      if (!map.has(item.productId)) {
        map.set(item.productId, { productId: item.productId, productName: item.productName, batches: [] });
      }
      map.get(item.productId).batches.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  const handleDeactivateConfirm = () => {
    if (!confirmData) return;
    dispatch(deleteProduct({ token, id: confirmData.productId })).then(() => {
      dispatch(clearProductActionState());
      setConfirmData(null);
      dispatch(clearExpirationState());
      dispatch(fetchSemaphore({ token }));
    });
  };

  const deactivating = actStatus === 'loading' && confirmData !== null;

  const worstStatus = (batches) => {
    for (const s of ['EXPIRED', 'RED', 'YELLOW', 'GREEN']) {
      if (batches.some((b) => b.status === s)) return s;
    }
    return 'GREEN';
  };

  return (
    <div className="exp-page">
      <AppTopbar />

      <div className="exp-content">

        {/* Header */}
        <div className="exp-header">
          <div>
            <h1 className="exp-title">⏰ Vencimientos</h1>
            <p className="exp-subtitle">
              Estado de los lotes activos en stock
              {status === 'succeeded' && ` · ${items.length} lote${items.length !== 1 ? 's' : ''} con fecha`}
            </p>
          </div>
          <button
            className="exp-refresh-btn"
            onClick={() => {
              // Refresh manual: limpiar + refetch
              dispatch(clearExpirationState());
              dispatch(fetchSemaphore({ token }));
              dispatch(fetchProducts({ token, params: { activeOnly: false } }));
            }}
            disabled={status === 'loading'}
            title="Actualizar"
          >
            <span className={status === 'loading' ? 'spin' : ''}>↻</span>
            <span className="hide-sm">Actualizar</span>
          </button>
        </div>

        {/* Error */}
        {fetchErr && <div className="exp-error">⚠ {fetchErr}</div>}

        {/* Loading — mostrar skeleton mientras no hay datos frescos */}
        {status === 'loading' && <TableSkeleton rows={6} />}

        {/* Summary — solo mostrar cuando ya tenemos datos del servidor (succeeded) */}
        {status === 'succeeded' && (
          <SummaryBar counts={counts} activeFilter={activeFilter} onFilter={setActiveFilter} />
        )}

        {/* Search */}
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
            {isOwner(user) && (
              <p className="exp-owner-hint">
                💡 <strong>Retirar de la venta</strong> desactiva el producto: deja de aparecer
                en el catálogo y no puede usarse en nuevas operaciones de stock.
                El historial se conserva.
              </p>
            )}
          </div>
        )}

        {/* Empty */}
        {status === 'succeeded' && filtered.length === 0 && (
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

        {/* Groups */}
        {status === 'succeeded' && grouped.length > 0 && (
          <div className="exp-groups">
            {grouped.map((group) => {
              const worst     = worstStatus(group.batches);
              const cfg       = STATUS_CONFIG[worst] || STATUS_CONFIG.GREEN;
              const hasUrgent = worst === 'EXPIRED' || worst === 'RED' || worst === 'YELLOW';
              const productActive = isProductActive(group.productId);

              return (
                <div
                  key={group.productId}
                  className="exp-group"
                  style={{ '--group-color': cfg.color, '--group-bg': cfg.bg }}
                >
                  <div className="exp-group-header">
                    <div className="exp-group-left">
                      <div className="exp-group-indicator" style={{ background: cfg.color }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="exp-group-name">{group.productName}</span>
                          {!productActive && (
                            <span className="exp-inactive-badge">🚫 Retirado de la venta</span>
                          )}
                        </div>
                        <span className="exp-group-count">
                          {group.batches.length} lote{group.batches.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="exp-group-actions">
                      <button
                        className="exp-action-btn secondary"
                        onClick={() => navigate('/products')}
                        title="Ver en catálogo de productos"
                      >
                        Ver producto
                      </button>

                      {isOwner(user) && hasUrgent && productActive && (
                        <button
                          className="exp-action-btn danger"
                          onClick={() => setConfirmData({
                            productId:   group.productId,
                            productName: group.productName,
                          })}
                          title="Retirar de la venta (desactivar producto)"
                        >
                          🚫 Retirar de la venta
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="exp-batches">
                    {group.batches.map((batch) => (
                      <div key={batch.batchId} className="exp-batch-row">
                        <div className="exp-batch-left">
                          <StatusPill status={batch.status} />
                          <span className="exp-batch-date">
                            📅 {batch.expirationDate
                              ? new Date(batch.expirationDate + 'T00:00:00').toLocaleDateString('es-AR', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                })
                              : '—'}
                          </span>
                          <DaysChip days={batch.daysToExpire} status={batch.status} />
                        </div>
                        <div className="exp-batch-right">
                          <span className="exp-batch-qty">
                            {batch.currentQuantity != null
                              ? `${Number(batch.currentQuantity).toLocaleString('es-AR')} u.`
                              : '—'}
                          </span>
                          <span className="exp-batch-id">Lote #{batch.batchId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {status === 'succeeded' && grouped.length > 0 && (
          <p className="exp-count">
            {grouped.length} producto{grouped.length !== 1 ? 's' : ''} ·{' '}
            {filtered.length} lote{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmData)}
        onClose={() => setConfirmData(null)}
        onConfirm={handleDeactivateConfirm}
        title="Retirar producto de la venta"
        message={
          confirmData
            ? `¿Desactivar "${confirmData.productName}"? El producto dejará de aparecer en el catálogo y no podrá usarse en nuevas operaciones de stock. El historial se conserva.`
            : ''
        }
        confirmLabel="Retirar de la venta"
        danger
        loading={deactivating}
      />

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
          font-size: 0.85rem; font-weight: 600; color: var(--warm-gray); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .exp-refresh-btn:hover:not(:disabled) { border-color: var(--amber); color: var(--amber); }
        .exp-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { display: inline-block; animation: spin 0.7s linear infinite; }

        .exp-error {
          padding: 12px 16px; background: var(--error-light); border: 1px solid var(--error);
          border-radius: var(--radius-md); color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
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
          background: none; border: none; cursor: pointer; color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .exp-owner-hint {
          font-size: 0.8rem; color: var(--warm-gray); padding: 10px 14px;
          background: rgba(200,137,58,0.06); border: 1px solid rgba(200,137,58,0.2);
          border-radius: var(--radius-md); line-height: 1.5; max-width: 600px;
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

        .exp-group-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .exp-action-btn {
          padding: 7px 14px; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.8rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
        }
        .exp-action-btn.secondary {
          background: white; border: 1.5px solid var(--cream-dark); color: var(--warm-gray);
        }
        .exp-action-btn.secondary:hover { border-color: var(--espresso); color: var(--espresso); }
        .exp-action-btn.danger {
          background: rgba(192,57,43,0.08); border: 1.5px solid rgba(192,57,43,0.3); color: #C0392B;
        }
        .exp-action-btn.danger:hover { background: rgba(192,57,43,0.15); border-color: #C0392B; }

        .exp-batches { display: flex; flex-direction: column; }
        .exp-batch-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 18px; border-bottom: 1px solid var(--cream-dark);
          transition: background var(--transition-fast);
        }
        .exp-batch-row:last-child { border-bottom: none; }
        .exp-batch-row:hover      { background: var(--cream); }
        .exp-batch-left  { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .exp-batch-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .exp-batch-date  { font-size: 0.82rem; color: var(--warm-gray); }
        .exp-batch-qty   { font-weight: 700; font-size: 0.88rem; color: var(--espresso); }
        .exp-batch-id    { font-size: 0.72rem; color: var(--warm-gray-light); }

        .exp-count { text-align: right; font-size: 0.78rem; color: var(--warm-gray-light); margin-top: 12px; }

        @media (max-width: 600px) {
          .exp-group-header { flex-direction: column; align-items: flex-start; }
          .exp-batch-left   { gap: 8px; }
          .hide-sm          { display: none; }
          .exp-content      { padding: var(--space-lg) var(--space-md); }
        }
      `}</style>
    </div>
  );
}