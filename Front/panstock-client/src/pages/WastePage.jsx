import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWasteRecords,
  selectWasteRecords,
  selectWasteListStatus,
  selectWasteListError,
} from '../features/waste/wasteSlice';
import { fetchBatches } from '../features/stock/stockSlice';
import { selectToken } from '../features/auth/authSlice';
import { Modal, TableSkeleton } from '../components/ui/CatalogUI';
import WasteForm from '../components/waste/WasteForm';
import AppTopbar from '../components/layout/AppTopbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REASON_LABELS = {
  EXPIRED:              { label: '💀 Vencido',            color: '#C0392B', bg: 'rgba(192,57,43,0.08)'  },
  DAMAGED:              { label: '💥 Dañado / Roto',      color: '#E67E22', bg: 'rgba(230,126,34,0.08)' },
  INTERNAL_CONSUMPTION: { label: '🍽 Consumo interno',    color: '#2980B9', bg: 'rgba(41,128,185,0.08)' },
  QUALITY_ISSUE:        { label: '⚠️ Calidad',            color: '#8E44AD', bg: 'rgba(142,68,173,0.08)' },
  OTHER:                { label: '📝 Otro',               color: '#7F8C8D', bg: 'rgba(127,140,141,0.08)' },
};

const formatARS = (v) =>
  v != null
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(v)
    : '—';

const formatDateTime = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function ReasonBadge({ reason }) {
  const cfg = REASON_LABELS[reason] || REASON_LABELS.OTHER;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────
function WasteSummary({ records }) {
  const totalQty  = records.reduce((s, r) => s + Number(r.quantity  || 0), 0);
  const totalLoss = records.reduce((s, r) => s + Number(r.economicLoss || 0), 0);

  return (
    <div className="ws-strip">
      <div className="ws-item">
        <span className="ws-value">{records.length}</span>
        <span className="ws-label">Registros</span>
      </div>
      <div className="ws-sep" />
      <div className="ws-item">
        <span className="ws-value">{totalQty.toLocaleString('es-AR')}</span>
        <span className="ws-label">Unidades</span>
      </div>
      <div className="ws-sep" />
      <div className="ws-item">
        <span className="ws-value" style={{ color: totalLoss > 0 ? '#C0392B' : 'var(--espresso)' }}>
          {formatARS(totalLoss)}
        </span>
        <span className="ws-label">Pérdida total</span>
      </div>
      <style>{`
        .ws-strip {
          display: flex; align-items: center;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); padding: 14px 20px;
          box-shadow: var(--shadow-sm); margin-bottom: var(--space-lg);
        }
        .ws-item  { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
        .ws-value { font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; color: var(--espresso); line-height: 1; }
        .ws-label {
          font-size: 0.68rem; color: var(--warm-gray); font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .ws-sep   { width: 1px; height: 36px; background: var(--cream-dark); flex-shrink: 0; }
      `}</style>
    </div>
  );
}

// ─── Waste record row ─────────────────────────────────────────────────────────
function WasteRow({ record, idx }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="wr-wrap" style={{ animationDelay: `${idx * 0.03}s` }}>
      <div
        className={`wr-row ${expanded ? 'open' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="wr-main">
          <div className="wr-left">
            <span className="wr-product">{record.productName}</span>
            <span className="wr-date">{formatDateTime(record.wasteDate)}</span>
          </div>
          <div className="wr-right">
            <ReasonBadge reason={record.reason} />
            <span className="wr-qty">−{record.quantity} u.</span>
          </div>
        </div>
        <div className="wr-footer">
          <span className="wr-loss" style={{ color: Number(record.economicLoss) > 0 ? '#C0392B' : 'var(--warm-gray)' }}>
            Pérdida: {formatARS(record.economicLoss)}
          </span>
          <span className="wr-id">Lote #{record.batchId}</span>
          <span className="wr-expand">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="wr-detail">
          <div className="wr-detail-grid">
            {record.createdByName && (
              <div className="wrd-item">
                <span className="wrd-label">Registrado por</span>
                <span>{record.createdByName}</span>
              </div>
            )}
            <div className="wrd-item">
              <span className="wrd-label">Costo unitario</span>
              <span>{formatARS(record.unitCost)}</span>
            </div>
            <div className="wrd-item">
              <span className="wrd-label">Precio venta unit.</span>
              <span>{formatARS(record.unitSalePrice)}</span>
            </div>
            <div className="wrd-item">
              <span className="wrd-label">Registro ID</span>
              <span className="wrd-mono">#{record.id}</span>
            </div>
          </div>
          {record.notes && (
            <p className="wrd-notes">📝 {record.notes}</p>
          )}
        </div>
      )}

      <style>{`
        .wr-wrap { animation: fadeIn 0.3s ease both; }
        .wr-row {
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-md); padding: 14px 16px;
          cursor: pointer; display: flex; flex-direction: column; gap: 8px;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
        }
        .wr-row:hover { box-shadow: var(--shadow-md); border-color: rgba(192,57,43,0.2); }
        .wr-row.open  {
          border-color: #C0392B; border-bottom-left-radius: 0;
          border-bottom-right-radius: 0; border-bottom: none;
        }
        .wr-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .wr-left { display: flex; flex-direction: column; gap: 2px; }
        .wr-product { font-weight: 700; font-size: 0.95rem; color: var(--espresso); }
        .wr-date    { font-size: 0.74rem; color: var(--warm-gray); }
        .wr-right   { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .wr-qty     { font-weight: 800; font-size: 1rem; color: #C0392B; }
        .wr-footer  { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .wr-loss    { font-size: 0.8rem; font-weight: 600; }
        .wr-id      { font-size: 0.72rem; color: var(--warm-gray-light); }
        .wr-expand  { font-size: 0.68rem; color: var(--warm-gray-light); margin-left: auto; }

        .wr-detail {
          border: 1px solid #C0392B; border-top: none;
          border-bottom-left-radius: var(--radius-md);
          border-bottom-right-radius: var(--radius-md);
          padding: 12px 16px; background: rgba(192,57,43,0.02);
          animation: fadeIn 0.2s ease;
        }
        .wr-detail-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .wrd-item  { display: flex; flex-direction: column; gap: 2px; }
        .wrd-label {
          font-size: 0.65rem; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--warm-gray-light); font-weight: 600;
        }
        .wrd-mono  { font-family: monospace; font-size: 0.82rem; color: var(--warm-gray); }
        .wrd-notes { font-size: 0.8rem; color: var(--warm-gray); margin-top: 10px; line-height: 1.5; }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WastePage() {
  const dispatch    = useDispatch();
  const token       = useSelector(selectToken);
  const records     = useSelector(selectWasteRecords);
  const listStatus  = useSelector(selectWasteListStatus);
  const listError   = useSelector(selectWasteListError);

  const [modalOpen, setModalOpen] = useState(false);
  const [search,    setSearch]    = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  useEffect(() => {
    if (token) {
      dispatch(fetchWasteRecords({ token }));
      dispatch(fetchBatches({ token }));
    }
  }, [token, dispatch]);

  const refresh = () => {
    dispatch(fetchWasteRecords({ token }));
    dispatch(fetchBatches({ token }));
  };

  const filtered = useMemo(() => {
    let list = [...records];
    if (reasonFilter) list = list.filter((r) => r.reason === reasonFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.productName    || '').toLowerCase().includes(q) ||
          (r.createdByName  || '').toLowerCase().includes(q) ||
          (r.notes          || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, search, reasonFilter]);

  const handleSuccess = () => {
    setModalOpen(false);
    refresh();
  };

  const isLoading = listStatus === 'loading';

  return (
    <div className="waste-page">
      <AppTopbar />

      <div className="waste-content">

        {/* Header */}
        <div className="waste-header">
          <div>
            <h1 className="waste-title">🗑️ Mermas</h1>
            <p className="waste-sub">
              Descarte de productos vencidos, dañados o consumidos
              {listStatus === 'succeeded' && ` · ${records.length} registro${records.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="waste-header-actions">
            <button
              className="waste-refresh-btn"
              onClick={refresh}
              disabled={isLoading}
              title="Actualizar"
            >
              <span className={isLoading ? 'spin' : ''}>↻</span>
            </button>
            <button
              className="waste-new-btn"
              onClick={() => setModalOpen(true)}
            >
              + Registrar merma
            </button>
          </div>
        </div>

        {/* Error */}
        {listError && (
          <div className="waste-error">⚠ {listError}</div>
        )}

        {/* Summary strip */}
        {listStatus === 'succeeded' && filtered.length > 0 && (
          <WasteSummary records={filtered} />
        )}

        {/* CTA when empty */}
        {listStatus === 'succeeded' && records.length === 0 && (
          <div className="waste-cta">
            <div className="waste-cta-inner">
              <span className="waste-cta-icon">🗑️</span>
              <h3 className="waste-cta-title">Sin mermas registradas</h3>
              <p className="waste-cta-desc">
                Registrá los productos vencidos, dañados o descartados para mantener
                el inventario actualizado y calcular pérdidas económicas.
              </p>
              <button className="waste-new-btn" onClick={() => setModalOpen(true)}>
                + Registrar primera merma
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        {records.length > 0 && (
          <div className="waste-controls">
            <div className="waste-search-wrap">
              <span className="waste-search-icon">🔍</span>
              <input
                className="waste-search"
                placeholder="Buscar por producto, responsable..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="waste-search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>

            <select
              className="waste-filter-sel"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="">Todos los motivos</option>
              {Object.entries(REASON_LABELS).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Loading */}
        {isLoading && <TableSkeleton rows={5} />}

        {/* Empty filtered */}
        {!isLoading && records.length > 0 && filtered.length === 0 && (
          <div className="waste-empty">
            <span>🔍</span>
            <p>Sin resultados para los filtros aplicados</p>
            <button
              className="waste-reset-btn"
              onClick={() => { setSearch(''); setReasonFilter(''); }}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* List */}
        {!isLoading && filtered.length > 0 && (
          <div className="waste-list">
            {filtered.map((r, i) => (
              <WasteRow key={r.id} record={r} idx={i} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <p className="waste-count">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar merma"
        width="540px"
      >
        <WasteForm
          onSuccess={handleSuccess}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <style>{`
        .waste-page    { min-height: 100vh; background: var(--cream); }
        .waste-content {
          max-width: 860px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }

        /* Header */
        .waste-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: var(--space-xl); flex-wrap: wrap;
        }
        .waste-title { font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: var(--espresso); margin-bottom: 4px; }
        .waste-sub   { font-size: 0.85rem; color: var(--warm-gray); }
        .waste-header-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

        .waste-refresh-btn {
          width: 38px; height: 38px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-size: 1.1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--warm-gray); transition: all var(--transition-fast);
        }
        .waste-refresh-btn:hover:not(:disabled) { border-color: #C0392B; color: #C0392B; }
        .waste-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { display: inline-block; animation: spin 0.7s linear infinite; }

        .waste-new-btn {
          padding: 10px 18px; background: #C0392B; color: white;
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
          box-shadow: 0 4px 16px rgba(192,57,43,0.22);
          white-space: nowrap;
        }
        .waste-new-btn:hover {
          filter: brightness(1.08); transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(192,57,43,0.3);
        }

        /* Error */
        .waste-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        /* CTA empty state */
        .waste-cta {
          display: flex; justify-content: center; padding: 40px 0;
        }
        .waste-cta-inner {
          max-width: 380px; display: flex; flex-direction: column;
          align-items: center; gap: 14px; text-align: center;
          padding: 32px 24px; background: white;
          border-radius: var(--radius-xl); border: 1px solid var(--cream-dark);
          box-shadow: var(--shadow-md);
        }
        .waste-cta-icon  { font-size: 2.5rem; opacity: 0.6; }
        .waste-cta-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--espresso); }
        .waste-cta-desc  { font-size: 0.84rem; color: var(--warm-gray); line-height: 1.6; }

        /* Controls */
        .waste-controls {
          display: flex; gap: 10px; flex-wrap: wrap;
          align-items: center; margin-bottom: var(--space-lg);
        }
        .waste-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .waste-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .waste-search {
          width: 100%; padding: 9px 32px;
          font-family: var(--font-body); font-size: 0.86rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .waste-search:focus { border-color: #C0392B; }
        .waste-search-clear {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .waste-filter-sel {
          padding: 9px 12px; font-family: var(--font-body); font-size: 0.84rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .waste-filter-sel:focus { border-color: #C0392B; }

        /* List */
        .waste-list { display: flex; flex-direction: column; gap: 8px; }

        /* Empty filtered */
        .waste-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 50px 24px; text-align: center;
        }
        .waste-empty > span { font-size: 2rem; opacity: 0.4; }
        .waste-empty > p { font-family: var(--font-display); font-size: 1rem; color: var(--espresso); font-weight: 700; }
        .waste-reset-btn {
          padding: 8px 18px; background: var(--cream-dark); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.84rem; font-weight: 600; color: var(--warm-gray);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .waste-reset-btn:hover { background: var(--cream-medium); color: var(--espresso); }

        .waste-count { text-align: right; font-size: 0.76rem; color: var(--warm-gray-light); margin-top: 10px; }

        @media (max-width: 500px) {
          .waste-header { flex-direction: column; }
          .waste-header-actions { width: 100%; }
          .waste-new-btn { flex: 1; text-align: center; }
          .waste-controls { flex-direction: column; align-items: stretch; }
          .waste-content { padding: var(--space-lg) var(--space-md); }
        }
      `}</style>
    </div>
  );
}