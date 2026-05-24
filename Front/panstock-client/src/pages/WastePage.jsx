import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWasteRecords,
  selectWasteRecords,
  selectWasteListStatus,
  selectWasteListError,
  selectWasteMetrics,
  setWasteFilters,
  selectWasteFilters,
} from '../features/waste/wasteSlice';
import { fetchBatches } from '../features/stock/stockSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import { Modal, TableSkeleton } from '../components/ui/CatalogUI';
import WasteForm from '../components/waste/WasteForm';
import AppTopbar from '../components/layout/AppTopbar';

// ─── Guard ────────────────────────────────────────────────────────────────────
const isOwner = (user) => user?.role === 'OWNER';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REASON_LABELS = {
  EXPIRED:              { label: 'Vencido',          color: '#C0392B', bg: 'rgba(192,57,43,0.08)',  emoji: '💀' },
  DAMAGED:              { label: 'Dañado / Roto',    color: '#E67E22', bg: 'rgba(230,126,34,0.08)', emoji: '💥' },
  INTERNAL_CONSUMPTION: { label: 'Consumo interno',  color: '#2980B9', bg: 'rgba(41,128,185,0.08)', emoji: '🍽' },
  QUALITY_ISSUE:        { label: 'Calidad',          color: '#8E44AD', bg: 'rgba(142,68,173,0.08)', emoji: '⚠️' },
  OTHER:                { label: 'Otro',             color: '#7F8C8D', bg: 'rgba(127,140,141,0.08)',emoji: '📝' },
};

const REASON_KEYS = Object.keys(REASON_LABELS);

const formatARS = (v) =>
  v != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v)
    : '—';

const formatDateTime = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

function ReasonBadge({ reason }) {
  const cfg = REASON_LABELS[reason] || REASON_LABELS.OTHER;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─── Panel de impacto económico (solo visible para OWNER) ─────────────────────
function EconomicImpactPanel({ metrics, records }) {
  const { totalRecords, totalQty, totalLoss, avgLoss, byReason, byProduct } = metrics;

  if (totalRecords === 0) return null;

  const maxLoss = Math.max(...byProduct.map((p) => p.loss), 1);

  return (
    <div className="eip-wrap">
      {/* Header */}
      <div className="eip-header">
        <span className="eip-crown">👑</span>
        <div>
          <h2 className="eip-title">Impacto económico</h2>
          <p className="eip-sub">Panel exclusivo para dueño/encargado</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="eip-kpis">
        <div className="eip-kpi kpi-loss">
          <span className="eip-kpi-value">{formatARS(totalLoss)}</span>
          <span className="eip-kpi-label">Pérdida total</span>
        </div>
        <div className="eip-kpi">
          <span className="eip-kpi-value">{formatARS(avgLoss)}</span>
          <span className="eip-kpi-label">Promedio / merma</span>
        </div>
        <div className="eip-kpi">
          <span className="eip-kpi-value">{Number(totalQty).toLocaleString('es-AR')}</span>
          <span className="eip-kpi-label">Unidades perdidas</span>
        </div>
        <div className="eip-kpi">
          <span className="eip-kpi-value">{totalRecords}</span>
          <span className="eip-kpi-label">Registros</span>
        </div>
      </div>

      <div className="eip-body">
        {/* Pérdida por motivo */}
        <div className="eip-section">
          <h3 className="eip-section-title">Por motivo</h3>
          <div className="eip-reasons">
            {REASON_KEYS.filter((k) => byReason[k]).map((key) => {
              const cfg  = REASON_LABELS[key];
              const data = byReason[key];
              const pct  = totalLoss > 0 ? (data.loss / totalLoss) * 100 : 0;
              return (
                <div key={key} className="eip-reason-row">
                  <div className="eip-reason-left">
                    <span className="eip-reason-badge" style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="eip-reason-count">{data.count} registro{data.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="eip-reason-right">
                    <div className="eip-bar-wrap">
                      <div className="eip-bar" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                    <span className="eip-reason-loss" style={{ color: cfg.color }}>{formatARS(data.loss)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productos más afectados */}
        {byProduct.length > 0 && (
          <div className="eip-section">
            <h3 className="eip-section-title">Productos más afectados</h3>
            <div className="eip-products">
              {byProduct.map((p, i) => {
                const barPct = (p.loss / maxLoss) * 100;
                return (
                  <div key={p.productId} className="eip-prod-row">
                    <span className="eip-prod-rank">#{i + 1}</span>
                    <div className="eip-prod-info">
                      <span className="eip-prod-name">{p.productName}</span>
                      <div className="eip-prod-bar-wrap">
                        <div className="eip-prod-bar" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                    <div className="eip-prod-right">
                      <span className="eip-prod-loss">{formatARS(p.loss)}</span>
                      <span className="eip-prod-qty">{p.qty.toLocaleString('es-AR')} u.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .eip-wrap {
          background: white; border: 1.5px solid rgba(192,57,43,0.2);
          border-radius: var(--radius-xl); margin-bottom: var(--space-xl);
          overflow: hidden; animation: fadeIn 0.4s ease;
        }
        .eip-header {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 20px; background: rgba(192,57,43,0.04);
          border-bottom: 1px solid rgba(192,57,43,0.12);
        }
        .eip-crown  { font-size: 1.3rem; flex-shrink: 0; }
        .eip-title  {
          font-family: var(--font-display); font-size: 1rem; font-weight: 700;
          color: var(--espresso); margin: 0 0 2px;
        }
        .eip-sub { font-size: 0.75rem; color: var(--warm-gray); margin: 0; }

        .eip-kpis {
          display: grid; grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid var(--cream-dark);
        }
        .eip-kpi {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; padding: 16px 12px;
          border-right: 1px solid var(--cream-dark);
        }
        .eip-kpi:last-child { border-right: none; }
        .eip-kpi-value {
          font-family: var(--font-display); font-size: 1.15rem; font-weight: 700;
          color: var(--espresso); line-height: 1;
        }
        .eip-kpi.kpi-loss .eip-kpi-value { color: #C0392B; }
        .eip-kpi-label {
          font-size: 0.65rem; color: var(--warm-gray); font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em; text-align: center;
        }

        .eip-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .eip-section {
          padding: 16px 20px;
          border-right: 1px solid var(--cream-dark);
        }
        .eip-section:last-child { border-right: none; }
        .eip-section-title {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--warm-gray-light);
          margin: 0 0 12px;
        }

        .eip-reasons { display: flex; flex-direction: column; gap: 8px; }
        .eip-reason-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .eip-reason-left { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; min-width: 0; max-width: 55%; }
        .eip-reason-badge {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 2px 7px; border-radius: 12px; font-size: 0.68rem; font-weight: 700;
          white-space: nowrap; flex-shrink: 0;
        }
        .eip-reason-count { font-size: 0.7rem; color: var(--warm-gray); white-space: nowrap; }
        .eip-reason-right { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .eip-bar-wrap { flex: 1; height: 5px; background: var(--cream-dark); border-radius: 3px; overflow: hidden; }
        .eip-bar { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
        .eip-reason-loss { font-size: 0.78rem; font-weight: 700; color: #C0392B; white-space: nowrap; }

        .eip-products { display: flex; flex-direction: column; gap: 10px; }
        .eip-prod-row { display: flex; align-items: center; gap: 10px; }
        .eip-prod-rank {
          font-size: 0.72rem; font-weight: 700; color: var(--warm-gray-light);
          width: 20px; flex-shrink: 0; text-align: center;
        }
        .eip-prod-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .eip-prod-name {
          font-size: 0.82rem; font-weight: 600; color: var(--espresso);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eip-prod-bar-wrap {
          height: 5px; background: var(--cream-dark);
          border-radius: 3px; overflow: hidden;
        }
        .eip-prod-bar {
          height: 100%; border-radius: 3px;
          background: linear-gradient(90deg, #C0392B, #E74C3C);
          transition: width 0.6s ease;
        }
        .eip-prod-right { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex-shrink: 0; }
        .eip-prod-loss { font-size: 0.82rem; font-weight: 700; color: #C0392B; }
        .eip-prod-qty  { font-size: 0.68rem; color: var(--warm-gray); }

        @media (max-width: 640px) {
          .eip-kpis { grid-template-columns: 1fr 1fr; }
          .eip-kpi  { border-bottom: 1px solid var(--cream-dark); }
          .eip-body { grid-template-columns: 1fr; }
          .eip-section { border-right: none; border-bottom: 1px solid var(--cream-dark); }
          .eip-section:last-child { border-bottom: none; }
        }
        @media (max-width: 380px) {
          .eip-kpis { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ─── Filtro de fechas ─────────────────────────────────────────────────────────
function DateRangeFilter({ filters, onChange, onApply, onClear, loading }) {
  return (
    <div className="drf-wrap">
      <span className="drf-label">Período</span>
      <div className="drf-inputs">
        <input
          className="drf-input"
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ from: e.target.value })}
          disabled={loading}
          max={filters.to || undefined}
        />
        <span className="drf-sep">→</span>
        <input
          className="drf-input"
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ to: e.target.value })}
          disabled={loading}
          min={filters.from || undefined}
        />
      </div>
      <button className="drf-apply" onClick={onApply} disabled={loading || (!filters.from && !filters.to)}>
        Filtrar
      </button>
      {(filters.from || filters.to) && (
        <button className="drf-clear" onClick={onClear} disabled={loading}>✕ Limpiar</button>
      )}
      <style>{`
        .drf-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .drf-label {
          font-size: 0.78rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--warm-gray); white-space: nowrap;
        }
        .drf-inputs { display: flex; align-items: center; gap: 6px; }
        .drf-input {
          padding: 8px 10px; font-family: var(--font-body); font-size: 0.84rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .drf-input:focus { border-color: #C0392B; }
        .drf-input:disabled { opacity: 0.5; }
        .drf-sep { font-size: 0.8rem; color: var(--warm-gray); }
        .drf-apply {
          padding: 8px 16px; background: var(--espresso); color: var(--cream);
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
        }
        .drf-apply:hover:not(:disabled) { background: var(--espresso-mid); }
        .drf-apply:disabled { opacity: 0.45; cursor: not-allowed; }
        .drf-clear {
          padding: 7px 12px; background: none; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.78rem; font-weight: 600; color: var(--warm-gray); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .drf-clear:hover { border-color: var(--warm-gray); color: var(--espresso); }
      `}</style>
    </div>
  );
}

// ─── Waste record row ─────────────────────────────────────────────────────────
function WasteRow({ record, idx, showEconomic }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="wr-wrap" style={{ animationDelay: `${idx * 0.03}s` }}>
      <div className={`wr-row ${expanded ? 'open' : ''}`} onClick={() => setExpanded(!expanded)}>
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
          {showEconomic && (
            <span className="wr-loss" style={{ color: Number(record.economicLoss) > 0 ? '#C0392B' : 'var(--warm-gray)' }}>
              Pérdida: {formatARS(record.economicLoss)}
            </span>
          )}
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
            {showEconomic && (
              <>
                <div className="wrd-item">
                  <span className="wrd-label">Costo unitario</span>
                  <span>{formatARS(record.unitCost)}</span>
                </div>
                <div className="wrd-item">
                  <span className="wrd-label">Precio venta unit.</span>
                  <span>{formatARS(record.unitSalePrice)}</span>
                </div>
                <div className="wrd-item">
                  <span className="wrd-label">Pérdida económica</span>
                  <span style={{ color: '#C0392B', fontWeight: 700 }}>{formatARS(record.economicLoss)}</span>
                </div>
              </>
            )}
            <div className="wrd-item">
              <span className="wrd-label">Registro ID</span>
              <span className="wrd-mono">#{record.id}</span>
            </div>
          </div>
          {record.notes && <p className="wrd-notes">📝 {record.notes}</p>}
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
          border-bottom-left-radius: var(--radius-md); border-bottom-right-radius: var(--radius-md);
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
  const user        = useSelector(selectUser);
  const records     = useSelector(selectWasteRecords);
  const listStatus  = useSelector(selectWasteListStatus);
  const listError   = useSelector(selectWasteListError);
  const metrics     = useSelector(selectWasteMetrics);
  const filters     = useSelector(selectWasteFilters);

  const owner = isOwner(user);

  const [modalOpen,    setModalOpen]    = useState(false);
  const [search,       setSearch]       = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  const loadData = (from, to) => {
    dispatch(fetchWasteRecords({ token, from: from || null, to: to || null }));
    if (owner) dispatch(fetchBatches({ token }));
  };

  useEffect(() => {
    if (token) loadData(filters.from, filters.to);
  }, [token]); // eslint-disable-line

  const handleApplyFilter = () => {
    loadData(filters.from, filters.to);
  };

  const handleClearFilter = () => {
    dispatch(setWasteFilters({ from: '', to: '' }));
    dispatch(fetchWasteRecords({ token, from: null, to: null }));
  };

  const filtered = useMemo(() => {
    let list = [...records];
    if (reasonFilter) list = list.filter((r) => r.reason === reasonFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.productName   || '').toLowerCase().includes(q) ||
          (r.createdByName || '').toLowerCase().includes(q) ||
          (r.notes         || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, search, reasonFilter]);

  const handleSuccess = () => {
    setModalOpen(false);
    loadData(filters.from, filters.to);
  };

  const isLoading = listStatus === 'loading';

  return (
    <div className="waste-page">
      <AppTopbar />

      <div className="waste-content">

        {/* ── Header ── */}
        <div className="waste-header">
          <div>
            <h1 className="waste-title">🗑️ Mermas</h1>
            <p className="waste-sub">
              {owner
                ? 'Registro y análisis de pérdidas — solo dueño/encargado'
                : 'Historial de mermas registradas'}
              {listStatus === 'succeeded' && ` · ${records.length} registro${records.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="waste-header-actions">
            <button
              className="waste-refresh-btn"
              onClick={() => loadData(filters.from, filters.to)}
              disabled={isLoading}
              title="Actualizar"
            >
              <span className={isLoading ? 'spin' : ''}>↻</span>
            </button>

            {/* Solo OWNER puede registrar mermas */}
            {owner && (
              <button className="waste-new-btn" onClick={() => setModalOpen(true)}>
                + Registrar merma
              </button>
            )}
          </div>
        </div>

        {/* Aviso para empleados */}
        {!owner && (
          <div className="waste-employee-notice">
            <span>ℹ️</span>
            <p>Solo el dueño/encargado puede registrar mermas. Podés consultar el historial aquí.</p>
          </div>
        )}

        {/* Error */}
        {listError && <div className="waste-error">⚠ {listError}</div>}

        {/* Panel de impacto económico — solo OWNER */}
        {owner && listStatus === 'succeeded' && (
          <EconomicImpactPanel metrics={metrics} records={records} />
        )}

        {/* CTA vacío (solo OWNER) */}
        {owner && listStatus === 'succeeded' && records.length === 0 && (
          <div className="waste-cta">
            <div className="waste-cta-inner">
              <span className="waste-cta-icon">🗑️</span>
              <h3 className="waste-cta-title">Sin mermas registradas</h3>
              <p className="waste-cta-desc">
                Registrá los productos vencidos, dañados o descartados para mantener el inventario actualizado
                y cuantificar el impacto económico real del desperdicio.
              </p>
              <button className="waste-new-btn" onClick={() => setModalOpen(true)}>
                + Registrar primera merma
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="waste-filters-bar">
          {/* Filtro por fecha */}
          <DateRangeFilter
            filters={filters}
            onChange={(v) => dispatch(setWasteFilters(v))}
            onApply={handleApplyFilter}
            onClear={handleClearFilter}
            loading={isLoading}
          />
        </div>

        {/* Búsqueda + filtro motivo */}
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
                <option key={val} value={val}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Loading */}
        {isLoading && <TableSkeleton rows={5} />}

        {/* Lista vacía con filtros */}
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

        {/* Lista sin registros (empleado) */}
        {!isLoading && !owner && records.length === 0 && listStatus === 'succeeded' && (
          <div className="waste-empty">
            <span>📋</span>
            <p>No hay mermas registradas en el período seleccionado</p>
          </div>
        )}

        {/* Lista de registros */}
        {!isLoading && filtered.length > 0 && (
          <div className="waste-list">
            {filtered.map((r, i) => (
              <WasteRow key={r.id} record={r} idx={i} showEconomic={owner} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <p className="waste-count">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
            {owner && ` · pérdida total: ${formatARS(filtered.reduce((a, r) => a + Number(r.economicLoss || 0), 0))}`}
          </p>
        )}
      </div>

      {/* Modal — solo OWNER */}
      {owner && (
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
      )}

      <style>{`
        .waste-page    { min-height: 100vh; background: var(--cream); }
        .waste-content {
          max-width: 900px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }

        .waste-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: var(--space-lg); flex-wrap: wrap;
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
          box-shadow: 0 4px 16px rgba(192,57,43,0.22); white-space: nowrap;
        }
        .waste-new-btn:hover {
          filter: brightness(1.08); transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(192,57,43,0.3);
        }

        .waste-employee-notice {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 12px 16px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.07); border: 1px solid rgba(200,137,58,0.2);
          margin-bottom: var(--space-lg); font-size: 0.84rem; color: var(--warm-gray);
        }
        .waste-employee-notice p { margin: 0; line-height: 1.5; }

        .waste-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

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

        .waste-filters-bar {
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); padding: 14px 16px;
          margin-bottom: var(--space-md); box-shadow: var(--shadow-sm);
        }

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

        .waste-list { display: flex; flex-direction: column; gap: 8px; }

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

        .waste-count {
          text-align: right; font-size: 0.76rem;
          color: var(--warm-gray-light); margin-top: 10px;
        }

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