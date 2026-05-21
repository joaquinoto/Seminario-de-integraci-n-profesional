import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStockSummary,
  fetchBatches,
  selectStockSummary,
  selectStockSummaryStatus,
  selectBatches,
  selectBatchesStatus,
} from '../features/stock/stockSlice';
import { selectToken } from '../features/auth/authSlice';
import { Modal, TableSkeleton } from '../components/ui/CatalogUI';
import StockEntryForm from '../components/stock/StockEntryForm';
import StockSaleForm  from '../components/stock/StockSaleForm';
import AppTopbar from '../components/layout/AppTopbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXPIRATION_CONFIG = {
  EXPIRED:        { label: 'Vencido',        color: '#C0392B', bg: 'rgba(192,57,43,0.10)',  icon: '💀' },
  RED:            { label: 'Vence hoy',      color: '#E74C3C', bg: 'rgba(231,76,60,0.10)',  icon: '🔴' },
  YELLOW:         { label: 'Vence pronto',   color: '#D68910', bg: 'rgba(214,137,16,0.10)', icon: '🟡' },
  GREEN:          { label: 'En buen estado', color: '#1E8449', bg: 'rgba(30,132,73,0.10)',  icon: '🟢' },
  NOT_APPLICABLE: { label: 'Sin vencimiento',color: '#8C7B6B', bg: 'rgba(140,123,107,0.10)',icon: '⚪' },
};

const BATCH_STATUS_LABELS = {
  AVAILABLE: { label: 'Disponible', color: '#2E7D32', bg: 'rgba(46,125,50,0.10)'      },
  DEPLETED:  { label: 'Agotado',   color: '#C0392B', bg: 'rgba(192,57,43,0.10)'      },
  DISCARDED: { label: 'Descartado',color: '#8C7B6B', bg: 'rgba(140,123,107,0.10)'    },
};

const STORAGE_LABELS = {
  ROOM_TEMPERATURE: '🌡 Ambiente',
  FRIDGE:   '❄️ Heladera',
  FREEZER:  '🧊 Freezer',
  DISPLAY:  '🍰 Vitrina',
  STORAGE:  '📦 Depósito',
};

const formatQty  = (v) => v != null ? Number(v).toLocaleString('es-AR') : '—';
const formatARS  = (v) => v != null && v !== 0
  ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v)
  : '—';
const formatDate = (d) => d
  ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function ExpirationPill({ status }) {
  const cfg = EXPIRATION_CONFIG[status] || EXPIRATION_CONFIG.NOT_APPLICABLE;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function BatchStatusPill({ status }) {
  const cfg = BATCH_STATUS_LABELS[status] || { label: status, color: 'var(--warm-gray)', bg: 'var(--cream-dark)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Stock summary card ───────────────────────────────────────────────────────
function StockCard({ item }) {
  const exp = item.nearestExpirationDate;
  const daysLeft = exp
    ? Math.ceil((new Date(exp + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000)
    : null;
  const isUrgent = daysLeft != null && daysLeft <= 2;

  return (
    <div className={`sc-card ${isUrgent ? 'urgent' : ''}`}>
      <div className="sc-top">
        <span className="sc-name">{item.productName}</span>
        <span className="sc-qty">
          {formatQty(item.totalQuantity)}
          <span className="sc-unit"> u.</span>
        </span>
      </div>
      {exp && (
        <div className="sc-exp" style={{ color: isUrgent ? '#C0392B' : 'var(--warm-gray)' }}>
          ⏰ Vence: {formatDate(exp)}
          {daysLeft != null && (
            <span style={{ marginLeft: 6, fontWeight: 700 }}>
              {daysLeft < 0 ? '(vencido)' : daysLeft === 0 ? '(hoy)' : `(${daysLeft}d)`}
            </span>
          )}
        </div>
      )}
      <style>{`
        .sc-card {
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); padding: 12px 14px;
          display: flex; flex-direction: column; gap: 6px;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
        }
        .sc-card.urgent { border-color: rgba(192,57,43,0.4); background: rgba(192,57,43,0.03); }
        .sc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .sc-name { font-weight: 600; font-size: 0.88rem; color: var(--espresso); flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sc-qty  { font-weight: 800; font-size: 1rem; color: var(--espresso); flex-shrink: 0; }
        .sc-unit { font-size: 0.72rem; color: var(--warm-gray); font-weight: 400; }
        .sc-exp  { font-size: 0.76rem; }
      `}</style>
    </div>
  );
}

// ─── Batch row ────────────────────────────────────────────────────────────────
function BatchRow({ batch }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="br-wrap">
      <div
        className={`br-row ${batch.batchStatus === 'DEPLETED' ? 'depleted' : ''} ${expanded ? 'open' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="br-main">
          <div className="br-left">
            <span className="br-name">{batch.productName}</span>
            <span className="br-supplier">{batch.supplierName || '—'}</span>
          </div>
          <div className="br-badges">
            <ExpirationPill status={batch.expirationStatus} />
            <BatchStatusPill status={batch.batchStatus} />
          </div>
        </div>
        <div className="br-meta">
          <div className="br-meta-item">
            <span className="br-meta-label">Stock actual</span>
            <span className="br-meta-value">{formatQty(batch.currentQuantity)} u.</span>
          </div>
          <div className="br-meta-item">
            <span className="br-meta-label">Vencimiento</span>
            <span className="br-meta-value">{formatDate(batch.expirationDate)}</span>
          </div>
          <div className="br-meta-item">
            <span className="br-meta-label">Ingreso</span>
            <span className="br-meta-value">{formatDate(batch.receivedDate)}</span>
          </div>
          <span className="br-expand-icon">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="br-detail">
          <div className="br-detail-grid">
            <div className="bd-item">
              <span className="bd-label">Cant. inicial</span>
              <span>{formatQty(batch.initialQuantity)} u.</span>
            </div>
            <div className="bd-item">
              <span className="bd-label">Almacenamiento</span>
              <span>{STORAGE_LABELS[batch.storageType] || batch.storageType || '—'}</span>
            </div>
            <div className="bd-item">
              <span className="bd-label">Costo unitario</span>
              <span>{formatARS(batch.unitCost)}</span>
            </div>
            <div className="bd-item">
              <span className="bd-label">Precio venta</span>
              <span>{formatARS(batch.unitSalePrice)}</span>
            </div>
            <div className="bd-item">
              <span className="bd-label">Lote ID</span>
              <span className="bd-mono">#{batch.id}</span>
            </div>
          </div>
          {batch.notes && (
            <p className="bd-notes">📝 {batch.notes}</p>
          )}
        </div>
      )}

      <style>{`
        .br-wrap { display: flex; flex-direction: column; }
        .br-row {
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-md); padding: 14px 16px;
          cursor: pointer; animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
          display: flex; flex-direction: column; gap: 10px;
        }
        .br-row:hover  { box-shadow: var(--shadow-md); border-color: rgba(200,137,58,0.2); }
        .br-row.depleted { opacity: 0.5; }
        .br-row.open {
          border-color: var(--amber); border-bottom-left-radius: 0;
          border-bottom-right-radius: 0; border-bottom: none;
        }
        .br-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .br-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .br-name { font-weight: 700; font-size: 0.95rem; color: var(--espresso); }
        .br-supplier { font-size: 0.76rem; color: var(--warm-gray); }
        .br-badges { display: flex; flex-wrap: wrap; gap: 5px; flex-shrink: 0; }
        .br-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .br-meta-item { display: flex; flex-direction: column; gap: 1px; }
        .br-meta-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--warm-gray-light); font-weight: 600; }
        .br-meta-value { font-size: 0.82rem; font-weight: 600; color: var(--espresso); }
        .br-expand-icon { font-size: 0.7rem; color: var(--warm-gray-light); margin-left: auto; align-self: center; }
        .br-detail {
          border: 1px solid var(--amber); border-top: none;
          border-bottom-left-radius: var(--radius-md); border-bottom-right-radius: var(--radius-md);
          padding: 12px 16px; background: rgba(200,137,58,0.03);
          animation: fadeIn 0.2s ease;
        }
        .br-detail-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .bd-item  { display: flex; flex-direction: column; gap: 2px; }
        .bd-label {
          font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--warm-gray-light); font-weight: 600;
        }
        .bd-mono  { font-family: monospace; font-size: 0.82rem; color: var(--warm-gray); }
        .bd-notes { font-size: 0.8rem; color: var(--warm-gray); margin-top: 10px; line-height: 1.5; }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StockPage() {
  const dispatch      = useDispatch();
  const token         = useSelector(selectToken);
  const summary       = useSelector(selectStockSummary);
  const summaryStatus = useSelector(selectStockSummaryStatus);
  const batches       = useSelector(selectBatches);
  const batchesStatus = useSelector(selectBatchesStatus);

  // 'entry' | 'sale' | null
  const [activeModal, setActiveModal]  = useState(null);
  const [view,        setView]         = useState('summary');
  const [search,      setSearch]       = useState('');
  const [statusFilter,setStatusFilter] = useState('AVAILABLE');

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      dispatch(fetchStockSummary({ token }));
      dispatch(fetchBatches({ token }));
    }
  }, [token, dispatch]);

  const refresh = () => {
    dispatch(fetchStockSummary({ token }));
    dispatch(fetchBatches({ token }));
  };

  // ── Filtered batches ───────────────────────────────────────────────────────
  const filteredBatches = useMemo(() => {
    let list = [...batches];
    if (statusFilter) list = list.filter((b) => b.batchStatus === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          (b.productName  || '').toLowerCase().includes(q) ||
          (b.supplierName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [batches, statusFilter, search]);

  // ── Filtered summary ───────────────────────────────────────────────────────
  const filteredSummary = useMemo(() => {
    if (!search.trim()) return summary;
    const q = search.trim().toLowerCase();
    return summary.filter((s) => (s.productName || '').toLowerCase().includes(q));
  }, [summary, search]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const availableBatches = batches.filter((b) => b.batchStatus === 'AVAILABLE').length;
  const urgentBatches    = batches.filter((b) =>
    b.batchStatus === 'AVAILABLE' &&
    (b.expirationStatus === 'EXPIRED' || b.expirationStatus === 'RED' || b.expirationStatus === 'YELLOW')
  ).length;

  const isLoading = summaryStatus === 'loading' || batchesStatus === 'loading';

  const handleModalSuccess = () => {
    setActiveModal(null);
    refresh();
  };

  return (
    <div className="stock-page">
      <AppTopbar />

      <div className="stock-content">

        {/* ── Header ── */}
        <div className="stock-header">
          <div>
            <h1 className="stock-title">📦 Stock</h1>
            <p className="stock-sub">
              {summary.length} producto{summary.length !== 1 ? 's' : ''} ·{' '}
              {availableBatches} lote{availableBatches !== 1 ? 's' : ''} disponible{availableBatches !== 1 ? 's' : ''}
              {urgentBatches > 0 && (
                <span className="stock-urgent-badge">{urgentBatches} con alerta</span>
              )}
            </p>
          </div>

          <button
            className="stock-refresh-btn"
            onClick={refresh}
            disabled={isLoading}
            title="Actualizar"
          >
            <span className={isLoading ? 'spin' : ''}>↻</span>
          </button>
        </div>

        {/* ── Action buttons — both roles can use both ── */}
        <div className="stock-actions-row">
          <button
            className="stock-action-btn entry"
            onClick={() => setActiveModal('entry')}
          >
            <span className="sab-icon">📥</span>
            <div className="sab-text">
              <span className="sab-title">Registrar ingreso</span>
              <span className="sab-sub">Agregar stock / nuevo lote</span>
            </div>
          </button>

          <button
            className="stock-action-btn sale"
            onClick={() => setActiveModal('sale')}
          >
            <span className="sab-icon">🛒</span>
            <div className="sab-text">
              <span className="sab-title">Registrar venta</span>
              <span className="sab-sub">Descontar del inventario</span>
            </div>
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div className="stock-stats">
          <div className="stat-item">
            <span className="stat-value">{summary.length}</span>
            <span className="stat-label">Productos</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item">
            <span className="stat-value">{availableBatches}</span>
            <span className="stat-label">Lotes activos</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item">
            <span
              className="stat-value"
              style={{ color: urgentBatches > 0 ? '#C0392B' : 'var(--espresso)' }}
            >
              {urgentBatches}
            </span>
            <span className="stat-label">Con alerta</span>
          </div>
        </div>

        {/* ── View toggle + search ── */}
        <div className="stock-controls">
          <div className="stock-tabs">
            <button
              className={`stock-tab ${view === 'summary' ? 'active' : ''}`}
              onClick={() => setView('summary')}
            >
              📊 Resumen
            </button>
            <button
              className={`stock-tab ${view === 'batches' ? 'active' : ''}`}
              onClick={() => setView('batches')}
            >
              🗂 Lotes
            </button>
          </div>

          <div className="stock-search-wrap">
            <span className="stock-search-icon">🔍</span>
            <input
              className="stock-search"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="stock-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {view === 'batches' && (
            <select
              className="stock-filter-sel"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="AVAILABLE">✅ Disponible</option>
              <option value="DEPLETED">🔴 Agotado</option>
              <option value="DISCARDED">⚫ Descartado</option>
            </select>
          )}
        </div>

        {/* ── Loading ── */}
        {isLoading && <TableSkeleton rows={6} />}

        {/* ── Summary view ── */}
        {!isLoading && view === 'summary' && (
          <>
            {filteredSummary.length === 0 ? (
              <div className="stock-empty">
                <span>📦</span>
                <p>
                  {search
                    ? 'Sin resultados para esa búsqueda'
                    : 'No hay stock registrado aún'}
                </p>
                {!search && (
                  <button
                    className="stock-action-btn-inline"
                    onClick={() => setActiveModal('entry')}
                  >
                    + Registrar primer ingreso
                  </button>
                )}
              </div>
            ) : (
              <div className="stock-summary-grid">
                {filteredSummary.map((item) => (
                  <StockCard key={item.productId} item={item} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Batches view ── */}
        {!isLoading && view === 'batches' && (
          <>
            {filteredBatches.length === 0 ? (
              <div className="stock-empty">
                <span>🗂</span>
                <p>
                  {search || statusFilter
                    ? 'Sin resultados para los filtros aplicados'
                    : 'No hay lotes registrados aún'}
                </p>
              </div>
            ) : (
              <div className="stock-batches-list">
                {filteredBatches.map((batch, i) => (
                  <div key={batch.id} style={{ animationDelay: `${i * 0.03}s` }}>
                    <BatchRow batch={batch} />
                  </div>
                ))}
              </div>
            )}
            <p className="stock-count">
              {filteredBatches.length} lote{filteredBatches.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      {/* ── Modal: Stock Entry ── */}
      <Modal
        isOpen={activeModal === 'entry'}
        onClose={() => setActiveModal(null)}
        title="Registrar ingreso de mercadería"
        width="560px"
      >
        <StockEntryForm
          onSuccess={handleModalSuccess}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* ── Modal: Sale ── */}
      <Modal
        isOpen={activeModal === 'sale'}
        onClose={() => setActiveModal(null)}
        title="Registrar venta manual"
        width="480px"
      >
        <StockSaleForm
          onSuccess={handleModalSuccess}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <style>{`
        .stock-page    { min-height: 100vh; background: var(--cream); }
        .stock-content {
          max-width: 960px; margin: 0 auto;
          padding: var(--space-lg) var(--space-md);
        }

        /* Header */
        .stock-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: var(--space-md); flex-wrap: wrap;
        }
        .stock-title { font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; color: var(--espresso); margin-bottom: 4px; }
        .stock-sub {
          font-size: 0.84rem; color: var(--warm-gray);
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .stock-urgent-badge {
          display: inline-flex; align-items: center; padding: 2px 9px;
          border-radius: 20px; background: rgba(192,57,43,0.10); color: #C0392B;
          font-size: 0.72rem; font-weight: 700;
        }
        .stock-refresh-btn {
          width: 38px; height: 38px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-size: 1.1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--warm-gray); transition: all var(--transition-fast);
          flex-shrink: 0;
        }
        .stock-refresh-btn:hover:not(:disabled) { border-color: var(--amber); color: var(--amber); }
        .stock-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { display: inline-block; animation: spin 0.7s linear infinite; }

        /* ── Action buttons row ── */
        .stock-actions-row {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: var(--space-lg);
        }
        .stock-action-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; border: 2px solid transparent;
          border-radius: var(--radius-lg); cursor: pointer;
          font-family: var(--font-body); text-align: left;
          transition: all var(--transition-fast);
        }
        .stock-action-btn.entry {
          background: var(--espresso); color: var(--cream);
          box-shadow: var(--shadow-md);
        }
        .stock-action-btn.entry:hover {
          background: var(--espresso-mid); transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }
        .stock-action-btn.sale {
          background: #2E7D32; color: white;
          box-shadow: 0 4px 16px rgba(46,125,50,0.22);
        }
        .stock-action-btn.sale:hover {
          filter: brightness(1.08); transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(46,125,50,0.3);
        }
        .sab-icon  { font-size: 1.5rem; flex-shrink: 0; }
        .sab-text  { display: flex; flex-direction: column; gap: 1px; }
        .sab-title { font-weight: 700; font-size: 0.92rem; }
        .sab-sub   { font-size: 0.73rem; opacity: 0.75; }

        /* Stats */
        .stock-stats {
          display: flex; align-items: center;
          background: white; border: 1px solid var(--cream-dark); border-radius: var(--radius-lg);
          padding: 14px 20px; margin-bottom: var(--space-lg);
          box-shadow: var(--shadow-sm);
        }
        .stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
        .stat-value{ font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--espresso); line-height: 1; }
        .stat-label{ font-size: 0.72rem; color: var(--warm-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-sep  { width: 1px; height: 36px; background: var(--cream-dark); flex-shrink: 0; }

        /* Controls */
        .stock-controls {
          display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
          margin-bottom: var(--space-lg);
        }
        .stock-tabs { display: flex; background: var(--cream-dark); border-radius: var(--radius-md); padding: 3px; }
        .stock-tab {
          padding: 8px 16px; border: none; border-radius: calc(var(--radius-md) - 2px);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
          cursor: pointer; color: var(--warm-gray); background: none;
          transition: all var(--transition-fast); white-space: nowrap;
        }
        .stock-tab.active { background: white; color: var(--espresso); box-shadow: var(--shadow-sm); }

        .stock-search-wrap { position: relative; flex: 1; min-width: 160px; }
        .stock-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .stock-search {
          width: 100%; padding: 9px 32px;
          font-family: var(--font-body); font-size: 0.86rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .stock-search:focus { border-color: var(--amber); }
        .stock-search-clear {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .stock-filter-sel {
          padding: 9px 12px; font-family: var(--font-body); font-size: 0.84rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .stock-filter-sel:focus { border-color: var(--amber); }

        /* Summary grid */
        .stock-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }

        /* Batches list */
        .stock-batches-list { display: flex; flex-direction: column; gap: 8px; }

        /* Empty */
        .stock-empty {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 56px 24px; text-align: center;
        }
        .stock-empty > span { font-size: 2.5rem; opacity: 0.4; }
        .stock-empty > p { font-family: var(--font-display); font-size: 1rem; color: var(--espresso); font-weight: 700; }

        .stock-action-btn-inline {
          padding: 11px 22px; background: var(--espresso); color: var(--cream);
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast); box-shadow: var(--shadow-md);
        }
        .stock-action-btn-inline:hover { background: var(--espresso-mid); transform: translateY(-1px); }

        .stock-count { text-align: right; font-size: 0.76rem; color: var(--warm-gray-light); margin-top: 10px; }

        @media (max-width: 500px) {
          .stock-actions-row { grid-template-columns: 1fr; }
          .stock-summary-grid { grid-template-columns: 1fr 1fr; }
          .stock-controls { flex-direction: column; align-items: stretch; }
          .stock-tabs { align-self: flex-start; }
        }
        @media (max-width: 340px) {
          .stock-summary-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
