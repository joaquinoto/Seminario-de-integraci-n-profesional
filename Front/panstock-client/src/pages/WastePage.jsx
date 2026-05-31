import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWasteRecords,
  selectWasteRecords,
  selectWasteListStatus,
  selectWasteListError,
  selectWasteFilters,
  setWasteFilters,
  clearWasteFilters,
  clearWasteActionState,
  fetchUsers,
  selectWasteUsers,
  selectWasteUsersStatus,
} from '../features/waste/wasteSlice';
import {
  fetchBatches,
} from '../features/stock/stockSlice';
import { fetchCategories, selectCategories } from '../features/catalog/categoriesSlice';
import { fetchSuppliers, selectSuppliers }   from '../features/catalog/suppliersSlice';
import { selectToken, selectUser }           from '../features/auth/authSlice';
import { Modal, TableSkeleton }              from '../components/ui/CatalogUI';
import WasteForm                             from '../components/waste/WasteForm';
import AppTopbar                             from '../components/layout/AppTopbar';

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_CONFIG = {
  EXPIRED:              { label: 'Vencido',          color: '#C0392B', bg: 'rgba(192,57,43,0.09)',  icon: '💀' },
  DAMAGED:              { label: 'Dañado / Roto',    color: '#E67E22', bg: 'rgba(230,126,34,0.09)', icon: '💥' },
  INTERNAL_CONSUMPTION: { label: 'Consumo interno',  color: '#2980B9', bg: 'rgba(41,128,185,0.09)', icon: '🍽' },
  QUALITY_ISSUE:        { label: 'Calidad',           color: '#8E44AD', bg: 'rgba(142,68,173,0.09)', icon: '⚠️' },
  OTHER:                { label: 'Otro',              color: '#7F8C8D', bg: 'rgba(127,140,141,0.09)',icon: '📝' },
};

const QUICK_RANGES = [
  { label: 'Hoy',        days: 0  },
  { label: 'Últimos 7d', days: 7  },
  { label: 'Últimos 30d',days: 30 },
  { label: 'Este mes',   days: -1 },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

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

const isoDate = (d) => d.toISOString().split('T')[0];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReasonBadge({ reason }) {
  const cfg = REASON_CONFIG[reason] || REASON_CONFIG.OTHER;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value" style={color ? { color } : {}}>
        {value}
      </span>
      {sub && <span className="stat-card-sub">{sub}</span>}
    </div>
  );
}

function BreakdownBar({ items, total, colorFn }) {
  if (!items.length) return <p style={{ color: 'var(--warm-gray)', fontSize: '0.84rem' }}>Sin datos</p>;
  return (
    <div className="breakdown-list">
      {items.map((item, i) => {
        const pct = total > 0 ? Math.round((item.loss / total) * 100) : 0;
        return (
          <div key={i} className="breakdown-row">
            <div className="breakdown-meta">
              <span className="breakdown-name">{item.name}</span>
              <span className="breakdown-vals">
                <span className="breakdown-loss">{formatARS(item.loss)}</span>
                <span className="breakdown-qty">{item.qty} u.</span>
                <span className="breakdown-count">{item.count} reg.</span>
              </span>
            </div>
            <div className="breakdown-bar-wrap">
              <div
                className="breakdown-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: colorFn ? colorFn(i) : 'var(--amber)',
                }}
              />
              <span className="breakdown-pct">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Row de una merma individual (expandible) */
function WasteRow({ record, idx }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = REASON_CONFIG[record.reason] || REASON_CONFIG.OTHER;

  return (
    <div className="wr-wrap" style={{ animationDelay: `${idx * 0.025}s` }}>
      <div
        className={`wr-row ${expanded ? 'open' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="wr-indicator" style={{ background: cfg.color }} />

        <div className="wr-body">
          <div className="wr-top">
            <div className="wr-left">
              <span className="wr-product">{record.productName}</span>
              <span className="wr-category">{record.categoryName || '—'}</span>
            </div>
            <div className="wr-right">
              <ReasonBadge reason={record.reason} />
              <span className="wr-qty">
                −{Number(record.quantity).toLocaleString('es-AR')} u.
              </span>
            </div>
          </div>

          <div className="wr-bottom">
            <span className="wr-date">📅 {formatDateTime(record.wasteDate)}</span>
            {record.supplierName && (
              <span className="wr-supplier">🚚 {record.supplierName}</span>
            )}
            <span
              className="wr-loss"
              style={{ color: Number(record.economicLoss) > 0 ? '#C0392B' : 'var(--warm-gray)' }}
            >
              {formatARS(record.economicLoss)}
            </span>
            {/* ── Quién registró — siempre visible ── */}
            {record.createdByName ? (
              <span className="wr-author">
                <span className="wr-author-avatar">
                  {record.createdByName.charAt(0).toUpperCase()}
                </span>
                {record.createdByName}
              </span>
            ) : (
              <span className="wr-author wr-author-unknown">Sin usuario asignado</span>
            )}
            <span className="wr-expand-icon">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="wr-detail">
          <div className="wr-detail-grid">
            <div className="wrd-item">
              <span className="wrd-label">Lote</span>
              <span>#{record.batchId}</span>
            </div>
            <div className="wrd-item">
              <span className="wrd-label">Registro #</span>
              <span>{record.id}</span>
            </div>
            <div className="wrd-item">
              <span className="wrd-label">Costo unit.</span>
              <span>{formatARS(record.unitCost)}</span>
            </div>
            <div className="wrd-item">
              <span className="wrd-label">P. venta unit.</span>
              <span>{formatARS(record.unitSalePrice)}</span>
            </div>
            <div className="wrd-item">
              <span className="wrd-label">Pérdida total</span>
              <span style={{ color: '#C0392B', fontWeight: 700 }}>
                {formatARS(record.economicLoss)}
              </span>
            </div>
            <div className="wrd-item">
              <span className="wrd-label">Registrado por</span>
              <span style={{ fontWeight: 600, color: 'var(--espresso)' }}>
                {record.createdByName || '—'}
                {record.createdById && (
                  <span style={{ color: 'var(--warm-gray)', fontWeight: 400, fontSize: '0.78rem' }}>
                    {' '}(ID #{record.createdById})
                  </span>
                )}
              </span>
            </div>
          </div>
          {record.notes && (
            <p className="wrd-notes">📝 {record.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WastePage() {
  const dispatch    = useDispatch();
  const token       = useSelector(selectToken);
  const authUser    = useSelector(selectUser);
  const records     = useSelector(selectWasteRecords);
  const listStatus  = useSelector(selectWasteListStatus);
  const listError   = useSelector(selectWasteListError);
  const filters     = useSelector(selectWasteFilters);
  const categories  = useSelector(selectCategories);
  const suppliers   = useSelector(selectSuppliers);
  const wasteUsers  = useSelector(selectWasteUsers);
  const usersStatus = useSelector(selectWasteUsersStatus);

  const isOwner = authUser?.role === 'OWNER';

  const [modalOpen,   setModalOpen]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [activeView,  setActiveView]  = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    loadRecords();
    dispatch(fetchCategories({ token, activeOnly: false }));
    dispatch(fetchSuppliers({ token, params: {} }));
    dispatch(fetchBatches({ token }));
    // Solo el OWNER puede ver todos los usuarios
    if (isOwner && usersStatus === 'idle') {
      dispatch(fetchUsers({ token }));
    }
  }, [token]); // eslint-disable-line

  const buildParams = useCallback(() => {
    const params = {};
    if (filters.from)        params.from        = filters.from;
    if (filters.to)          params.to          = filters.to;
    if (filters.categoryId)  params.categoryId  = filters.categoryId;
    if (filters.supplierId)  params.supplierId  = filters.supplierId;
    if (filters.reason)      params.reason      = filters.reason;
    if (filters.createdById) params.createdById = filters.createdById;
    return params;
  }, [filters]);

  const loadRecords = useCallback(() => {
    dispatch(fetchWasteRecords({ token, params: buildParams() }));
  }, [dispatch, token, buildParams]);

  const applyFilters = () => {
    loadRecords();
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    dispatch(clearWasteFilters());
    dispatch(fetchWasteRecords({ token, params: {} }));
    setFiltersOpen(false);
  };

  const applyQuickRange = (days) => {
    const today = new Date();
    const to = isoDate(today);
    let from;
    if (days === -1) {
      from = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (days === 0) {
      from = to;
    } else {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      from = isoDate(d);
    }
    const newFilters = { ...filters, from, to };
    dispatch(setWasteFilters({ from, to }));
    dispatch(fetchWasteRecords({ token, params: { ...newFilters } }));
  };

  // ── Búsqueda local ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        (r.productName     || '').toLowerCase().includes(q) ||
        (r.categoryName    || '').toLowerCase().includes(q) ||
        (r.supplierName    || '').toLowerCase().includes(q) ||
        (r.createdByName   || '').toLowerCase().includes(q) ||
        (r.notes           || '').toLowerCase().includes(q)
    );
  }, [records, search]);

  // ── Estadísticas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalQty  = filtered.reduce((s, r) => s + Number(r.quantity       || 0), 0);
    const totalLoss = filtered.reduce((s, r) => s + Number(r.economicLoss   || 0), 0);
    const count     = filtered.length;

    const accumulate = (keyFn, nameFn, items) => {
      const map = {};
      items.forEach((r) => {
        const key  = keyFn(r);
        const name = nameFn(r);
        if (!map[key]) map[key] = { name, loss: 0, qty: 0, count: 0 };
        map[key].loss  += Number(r.economicLoss || 0);
        map[key].qty   += Number(r.quantity     || 0);
        map[key].count += 1;
      });
      return Object.values(map).sort((a, b) => b.loss - a.loss);
    };

    const catItems    = accumulate(
      (r) => r.categoryId   || 'sin-cat',
      (r) => r.categoryName || 'Sin categoría',
      filtered
    );
    const suppItems   = accumulate(
      (r) => r.supplierId   || 'sin-prov',
      (r) => r.supplierName || 'Sin proveedor',
      filtered
    );
    const reasonItems = accumulate(
      (r) => r.reason || 'OTHER',
      (r) => REASON_CONFIG[r.reason]?.label || r.reason || 'Otro',
      filtered
    );
    const userItems   = Object.values(
      filtered.reduce((map, r) => {
        const key  = r.createdById   || 'anon';
        const name = r.createdByName || 'Sin asignar';
        if (!map[key]) map[key] = { name, loss: 0, qty: 0, count: 0 };
        map[key].loss  += Number(r.economicLoss || 0);
        map[key].qty   += Number(r.quantity     || 0);
        map[key].count += 1;
        return map;
      }, {})
    ).sort((a, b) => b.count - a.count);

    return { count, totalQty, totalLoss, catItems, suppItems, reasonItems, userItems };
  }, [filtered]);

  const handleFormSuccess = () => {
    setModalOpen(false);
    loadRecords();
    dispatch(fetchBatches({ token }));
  };

  const hasFilters = filters.from || filters.to || filters.categoryId
                  || filters.supplierId || filters.reason || filters.createdById;

  const isLoading = listStatus === 'loading';

  const CAT_COLORS  = ['#C8893A','#D4A853','#8B6914','#5C8A4A','#4A7A8A','#7A5C8A'];
  const SUPP_COLORS = ['#1565C0','#2E7D32','#6A1B9A','#0097A7','#E65100','#558B2F'];
  const USER_COLORS = ['#C8893A','#5C8A4A','#7A5C8A','#4A7A8A'];

  return (
    <div className="wp-page">
      <AppTopbar />

      <div className="wp-content">

        {/* ── Header ── */}
        <div className="wp-header">
          <div className="wp-header-text">
            <h1 className="wp-title">🗑️ Mermas</h1>
            <p className="wp-sub">
              Descarte de productos · pérdidas económicas
              {listStatus === 'succeeded' && (
                <> · <strong>{records.length}</strong> registro{records.length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>

          <div className="wp-header-actions">
            <button
              className="wp-btn-icon"
              onClick={loadRecords}
              disabled={isLoading}
              title="Actualizar"
              style={{ animation: isLoading ? 'spin 0.8s linear infinite' : 'none' }}
            >
              ↻
            </button>
            <button
              className="wp-btn-new"
              onClick={() => setModalOpen(true)}
            >
              + Registrar merma
            </button>
          </div>
        </div>

        {/* ── Rangos rápidos ── */}
        <div className="wp-quick-ranges">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.label}
              className="wp-range-chip"
              onClick={() => applyQuickRange(r.days)}
            >
              {r.label}
            </button>
          ))}
          {hasFilters && (
            <button className="wp-range-chip clear" onClick={handleClearFilters}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Panel de filtros ── */}
        <div className={`wp-filters-panel ${filtersOpen ? 'open' : ''}`}>
          <button
            className="wp-filters-toggle"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span>🔧 Filtros avanzados</span>
            {hasFilters && <span className="wp-filters-badge">activos</span>}
            <span className="wp-filters-chevron">{filtersOpen ? '▲' : '▼'}</span>
          </button>

          {filtersOpen && (
            <div className="wp-filters-body">
              {/* Período */}
              <div className="wp-filter-group">
                <span className="wp-filter-group-label">📅 Período</span>
                <div className="wp-filter-row">
                  <div className="wp-filter-field">
                    <label className="wp-field-label">Desde</label>
                    <input
                      type="date"
                      className="wp-date-input"
                      value={filters.from}
                      onChange={(e) => dispatch(setWasteFilters({ from: e.target.value }))}
                      max={filters.to || undefined}
                    />
                  </div>
                  <div className="wp-filter-field">
                    <label className="wp-field-label">Hasta</label>
                    <input
                      type="date"
                      className="wp-date-input"
                      value={filters.to}
                      onChange={(e) => dispatch(setWasteFilters({ to: e.target.value }))}
                      min={filters.from || undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Categoría */}
              <div className="wp-filter-group">
                <span className="wp-filter-group-label">🗂 Categoría</span>
                <select
                  className="wp-select"
                  value={filters.categoryId}
                  onChange={(e) => dispatch(setWasteFilters({ categoryId: e.target.value }))}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Proveedor */}
              <div className="wp-filter-group">
                <span className="wp-filter-group-label">🚚 Proveedor</span>
                <select
                  className="wp-select"
                  value={filters.supplierId}
                  onChange={(e) => dispatch(setWasteFilters({ supplierId: e.target.value }))}
                >
                  <option value="">Todos los proveedores</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Motivo */}
              <div className="wp-filter-group">
                <span className="wp-filter-group-label">⚠️ Motivo</span>
                <select
                  className="wp-select"
                  value={filters.reason}
                  onChange={(e) => dispatch(setWasteFilters({ reason: e.target.value }))}
                >
                  <option value="">Todos los motivos</option>
                  {Object.entries(REASON_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.icon} {cfg.label}</option>
                  ))}
                </select>
              </div>

              {/* Registrado por — visible para OWNER o para empleados (se filtra al propio usuario) */}
              <div className="wp-filter-group">
                <span className="wp-filter-group-label">👤 Registrado por</span>
                {isOwner ? (
                  /* OWNER: puede filtrar por cualquier usuario */
                  <select
                    className="wp-select"
                    value={filters.createdById}
                    onChange={(e) => dispatch(setWasteFilters({ createdById: e.target.value }))}
                  >
                    <option value="">Todos los usuarios</option>
                    {usersStatus === 'loading' && (
                      <option disabled>Cargando usuarios...</option>
                    )}
                    {wasteUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                        {u.role === 'OWNER' ? ' 👑' : ' 👤'}
                        {u.enabled === false ? ' (inactivo)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  /* EMPLOYEE: solo puede ver sus propias mermas */
                  <div className="wp-employee-filter">
                    <label className="wp-toggle-row">
                      <input
                        type="checkbox"
                        className="wp-checkbox"
                        checked={filters.createdById === String(authUser?.id)}
                        onChange={(e) =>
                          dispatch(setWasteFilters({
                            createdById: e.target.checked ? String(authUser?.id) : '',
                          }))
                        }
                      />
                      <span>Ver solo mis registros</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="wp-filter-actions">
                <button className="wp-btn-ghost" onClick={handleClearFilters}>
                  Limpiar
                </button>
                <button className="wp-btn-apply" onClick={applyFilters}>
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {listError && (
          <div className="wp-error">⚠ {listError}</div>
        )}

        {/* ── Resumen económico ── */}
        {(listStatus === 'succeeded' || records.length > 0) && (
          <div className="wp-summary-strip">
            <StatCard label="Registros" value={stats.count} />
            <div className="wp-summary-sep" />
            <StatCard
              label="Unidades perdidas"
              value={Number(stats.totalQty).toLocaleString('es-AR')}
            />
            <div className="wp-summary-sep" />
            <StatCard
              label="Pérdida económica"
              value={formatARS(stats.totalLoss)}
              color={stats.totalLoss > 0 ? '#C0392B' : undefined}
              sub={stats.count > 0 ? `~${formatARS(stats.totalLoss / stats.count)} promedio` : undefined}
            />
          </div>
        )}

        {/* ── Tabs: Lista / Estadísticas ── */}
        {records.length > 0 && (
          <div className="wp-tabs">
            <button
              className={`wp-tab ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => setActiveView('list')}
            >
              📋 Lista
            </button>
            <button
              className={`wp-tab ${activeView === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveView('stats')}
            >
              📊 Estadísticas
            </button>
          </div>
        )}

        {/* ── Vista de lista ── */}
        {activeView === 'list' && (
          <>
            {records.length > 0 && (
              <div className="wp-search-wrap">
                <span className="wp-search-icon">🔍</span>
                <input
                  className="wp-search"
                  placeholder="Buscar por producto, categoría, proveedor, usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="wp-search-clear" onClick={() => setSearch('')}>✕</button>
                )}
              </div>
            )}

            {isLoading && <TableSkeleton rows={5} />}

            {!isLoading && records.length === 0 && (
              <div className="wp-empty-cta">
                <span className="wp-empty-icon">🗑️</span>
                <h3 className="wp-empty-title">Sin mermas registradas</h3>
                <p className="wp-empty-desc">
                  Registrá los productos vencidos, dañados o descartados
                  para mantener el inventario actualizado y calcular pérdidas económicas.
                  {hasFilters && ' Probá limpiando los filtros.'}
                </p>
                <button className="wp-btn-new" onClick={() => setModalOpen(true)}>
                  + Registrar primera merma
                </button>
              </div>
            )}

            {!isLoading && records.length > 0 && filtered.length === 0 && (
              <div className="wp-empty-search">
                <span>🔍</span>
                <p>Sin resultados para "<strong>{search}</strong>"</p>
                <button className="wp-btn-reset" onClick={() => setSearch('')}>
                  Limpiar búsqueda
                </button>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <div className="wp-list">
                {filtered.map((r, i) => (
                  <WasteRow key={r.id} record={r} idx={i} />
                ))}
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <p className="wp-count">
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                {search && ` · búsqueda: "${search}"`}
              </p>
            )}
          </>
        )}

        {/* ── Vista de estadísticas ── */}
        {activeView === 'stats' && records.length > 0 && (
          <div className="wp-stats">
            <div className="wp-stats-card">
              <h3 className="wp-stats-title">📂 Pérdidas por categoría</h3>
              <BreakdownBar items={stats.catItems} total={stats.totalLoss} colorFn={(i) => CAT_COLORS[i % CAT_COLORS.length]} />
            </div>
            <div className="wp-stats-card">
              <h3 className="wp-stats-title">🚚 Pérdidas por proveedor</h3>
              <BreakdownBar items={stats.suppItems} total={stats.totalLoss} colorFn={(i) => SUPP_COLORS[i % SUPP_COLORS.length]} />
            </div>
            <div className="wp-stats-card">
              <h3 className="wp-stats-title">⚠️ Pérdidas por motivo</h3>
              <BreakdownBar items={stats.reasonItems} total={stats.totalLoss} colorFn={(i) => Object.values(REASON_CONFIG)[i % 5]?.color || '#888'} />
            </div>
            <div className="wp-stats-card">
              <h3 className="wp-stats-title">👤 Registros por usuario</h3>
              <div className="user-stats-list">
                {stats.userItems.map((u, i) => (
                  <div key={i} className="user-stat-row">
                    <div className="user-stat-avatar" style={{ background: USER_COLORS[i % USER_COLORS.length] }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-stat-info">
                      <span className="user-stat-name">{u.name}</span>
                      <span className="user-stat-detail">
                        {u.count} registro{u.count !== 1 ? 's' : ''} ·{' '}
                        {Number(u.qty).toLocaleString('es-AR')} u. ·{' '}
                        <span style={{ color: '#C0392B', fontWeight: 700 }}>{formatARS(u.loss)}</span>
                      </span>
                    </div>
                    <div className="user-stat-bar-wrap">
                      <div
                        className="user-stat-bar"
                        style={{
                          width: `${stats.count > 0 ? Math.round((u.count / stats.count) * 100) : 0}%`,
                          background: USER_COLORS[i % USER_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Modal: Registrar merma ── */}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          dispatch(clearWasteActionState());
        }}
        title="Registrar merma"
        width="540px"
      >
    
        <WasteForm
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            dispatch(clearWasteActionState());
          }}
        />
        
      </Modal>
      
      <style>{`
        .wp-page    { min-height: 100vh; background: var(--cream); }
        .wp-content {
          max-width: 860px; margin: 0 auto;
          padding: var(--space-lg) var(--space-md);
          display: flex; flex-direction: column; gap: var(--space-md);
        }

        .wp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .wp-title  { font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; color: var(--espresso); margin-bottom: 4px; }
        .wp-sub    { font-size: 0.84rem; color: var(--warm-gray); }
        .wp-header-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

        .wp-btn-icon {
          width: 38px; height: 38px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-size: 1.1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--warm-gray); transition: all var(--transition-fast);
        }
        .wp-btn-icon:hover:not(:disabled) { border-color: #C0392B; color: #C0392B; }
        .wp-btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }

        .wp-btn-new {
          padding: 10px 18px; background: #C0392B; color: white;
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
          box-shadow: 0 4px 14px rgba(192,57,43,0.22); white-space: nowrap;
        }
        .wp-btn-new:hover { filter: brightness(1.08); transform: translateY(-1px); }

        .wp-quick-ranges { display: flex; flex-wrap: wrap; gap: 7px; }
        .wp-range-chip {
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid var(--cream-dark); background: white;
          font-family: var(--font-body); font-size: 0.78rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .wp-range-chip:hover { border-color: var(--amber); color: var(--amber-dark); }
        .wp-range-chip.clear { border-color: rgba(192,57,43,0.4); color: #C0392B; background: rgba(192,57,43,0.05); }
        .wp-range-chip.clear:hover { background: rgba(192,57,43,0.1); }

        .wp-filters-panel {
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-lg);
          background: white; overflow: hidden;
        }
        .wp-filters-toggle {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: none; border: none;
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--espresso); cursor: pointer; text-align: left;
          transition: background var(--transition-fast);
        }
        .wp-filters-toggle:hover { background: var(--cream); }
        .wp-filters-badge {
          padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 700;
          background: rgba(192,57,43,0.10); color: #C0392B;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .wp-filters-chevron { margin-left: auto; font-size: 0.7rem; color: var(--warm-gray); }

        .wp-filters-body {
          padding: 14px 16px; border-top: 1px solid var(--cream-dark);
          display: flex; flex-direction: column; gap: 14px;
          animation: fadeIn 0.2s ease;
        }
        .wp-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .wp-filter-group-label {
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-gray);
        }
        .wp-filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .wp-filter-field { display: flex; flex-direction: column; gap: 4px; }
        .wp-field-label { font-size: 0.72rem; color: var(--warm-gray-light); font-weight: 600; }
        .wp-date-input, .wp-select {
          width: 100%; padding: 10px 12px;
          font-family: var(--font-body); font-size: 0.88rem;
          color: var(--espresso); background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; -webkit-appearance: none; box-sizing: border-box;
          transition: border-color var(--transition-base);
        }
        .wp-date-input:focus, .wp-select:focus { border-color: #C0392B; background: #fff; }

        /* Filtro de "mis registros" para EMPLOYEE */
        .wp-employee-filter {
          padding: 10px 12px; border-radius: var(--radius-md);
          background: var(--cream); border: 1.5px solid var(--cream-dark);
        }
        .wp-toggle-row {
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; font-size: 0.88rem; color: var(--espresso); font-weight: 500;
        }
        .wp-checkbox { width: 17px; height: 17px; accent-color: #C0392B; cursor: pointer; }

        .wp-filter-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
        .wp-btn-ghost {
          padding: 9px 18px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .wp-btn-ghost:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .wp-btn-apply {
          padding: 9px 20px; background: #C0392B; color: white;
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
        }
        .wp-btn-apply:hover { filter: brightness(1.08); }

        .wp-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem;
        }

        .wp-summary-strip {
          display: flex; align-items: stretch;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); padding: 14px 20px;
          box-shadow: var(--shadow-sm); gap: 0;
        }
        .wp-summary-sep { width: 1px; background: var(--cream-dark); flex-shrink: 0; margin: 0 4px; }
        .stat-card {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 3px; padding: 0 8px; text-align: center;
        }
        .stat-card-label {
          font-size: 0.66rem; color: var(--warm-gray); font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em; line-height: 1;
        }
        .stat-card-value {
          font-family: var(--font-display); font-size: 1.3rem;
          font-weight: 700; color: var(--espresso); line-height: 1.1;
        }
        .stat-card-sub { font-size: 0.68rem; color: var(--warm-gray-light); }

        .wp-tabs {
          display: flex; background: var(--cream-dark);
          border-radius: var(--radius-md); padding: 3px; align-self: flex-start;
        }
        .wp-tab {
          padding: 8px 16px; border: none; border-radius: calc(var(--radius-md) - 2px);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
          cursor: pointer; color: var(--warm-gray); background: none;
          transition: all var(--transition-fast); white-space: nowrap;
        }
        .wp-tab.active { background: white; color: var(--espresso); box-shadow: var(--shadow-sm); }

        .wp-search-wrap { position: relative; }
        .wp-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .wp-search {
          width: 100%; padding: 10px 36px;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none; box-sizing: border-box;
          transition: border-color var(--transition-base);
        }
        .wp-search:focus { border-color: #C0392B; }
        .wp-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }

        .wp-list { display: flex; flex-direction: column; gap: 7px; }

        /* Waste row */
        .wr-wrap { animation: fadeIn 0.3s ease both; }
        .wr-row {
          display: flex; align-items: stretch;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-md);
          cursor: pointer; overflow: hidden;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
        }
        .wr-row:hover { box-shadow: var(--shadow-md); border-color: rgba(192,57,43,0.2); }
        .wr-row.open  {
          border-color: #C0392B;
          border-bottom-left-radius: 0; border-bottom-right-radius: 0;
          border-bottom: none;
        }
        .wr-indicator { width: 4px; flex-shrink: 0; }
        .wr-body { flex: 1; padding: 13px 14px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .wr-top  { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .wr-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .wr-product  { font-weight: 700; font-size: 0.95rem; color: var(--espresso); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wr-category { font-size: 0.74rem; color: var(--warm-gray); }
        .wr-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
        .wr-qty   { font-weight: 800; font-size: 0.98rem; color: #C0392B; }
        .wr-bottom {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          font-size: 0.77rem; color: var(--warm-gray);
        }
        .wr-date, .wr-supplier { flex-shrink: 0; }
        .wr-loss { font-weight: 700; font-size: 0.82rem; flex-shrink: 0; }

        .wr-author {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.74rem; font-weight: 600; color: var(--espresso-soft);
          padding: 2px 8px; border-radius: 20px;
          background: rgba(200,137,58,0.08); border: 1px solid rgba(200,137,58,0.2);
          flex-shrink: 0;
        }
        .wr-author-avatar {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--amber); color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem; font-weight: 700; flex-shrink: 0;
        }
        .wr-author-unknown {
          color: var(--warm-gray-light); font-style: italic; font-size: 0.72rem;
          padding: 2px 8px; border-radius: 20px;
          background: var(--cream-dark); flex-shrink: 0;
        }
        .wr-expand-icon { font-size: 0.65rem; color: var(--warm-gray-light); margin-left: auto; }

        .wr-detail {
          border: 1px solid #C0392B; border-top: none;
          border-bottom-left-radius: var(--radius-md); border-bottom-right-radius: var(--radius-md);
          padding: 12px 18px; background: rgba(192,57,43,0.025);
          animation: fadeIn 0.2s ease;
        }
        .wr-detail-grid { display: flex; flex-wrap: wrap; gap: 18px; }
        .wrd-item  { display: flex; flex-direction: column; gap: 2px; }
        .wrd-label {
          font-size: 0.63rem; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--warm-gray-light); font-weight: 600;
        }
        .wrd-notes { font-size: 0.8rem; color: var(--warm-gray); margin-top: 10px; line-height: 1.5; }

        /* Stats */
        .wp-stats { display: flex; flex-direction: column; gap: 14px; }
        .wp-stats-card {
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); padding: 18px 20px;
          box-shadow: var(--shadow-sm);
        }
        .wp-stats-title {
          font-family: var(--font-display); font-size: 0.95rem; font-weight: 700;
          color: var(--espresso); margin-bottom: 16px;
          padding-bottom: 10px; border-bottom: 1px solid var(--cream-dark);
        }

        .breakdown-list { display: flex; flex-direction: column; gap: 12px; }
        .breakdown-row  { display: flex; flex-direction: column; gap: 5px; }
        .breakdown-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .breakdown-name { font-size: 0.85rem; font-weight: 600; color: var(--espresso); }
        .breakdown-vals { display: flex; align-items: center; gap: 10px; font-size: 0.74rem; color: var(--warm-gray); }
        .breakdown-loss { font-weight: 700; color: #C0392B; }
        .breakdown-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .breakdown-bar-fill { height: 8px; border-radius: 4px; min-width: 4px; transition: width 0.4s ease; }
        .breakdown-pct { font-size: 0.68rem; color: var(--warm-gray); white-space: nowrap; }

        .user-stats-list { display: flex; flex-direction: column; gap: 12px; }
        .user-stat-row   { display: flex; align-items: center; gap: 12px; }
        .user-stat-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 700; font-size: 0.9rem;
          color: white; flex-shrink: 0;
        }
        .user-stat-info  { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .user-stat-name  { font-weight: 600; font-size: 0.88rem; color: var(--espresso); }
        .user-stat-detail{ font-size: 0.74rem; color: var(--warm-gray); }
        .user-stat-bar-wrap { width: 80px; flex-shrink: 0; }
        .user-stat-bar   { height: 6px; border-radius: 3px; min-width: 4px; }

        .wp-empty-cta {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 48px 24px; text-align: center;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-xl); box-shadow: var(--shadow-sm);
        }
        .wp-empty-icon  { font-size: 2.8rem; opacity: 0.55; }
        .wp-empty-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--espresso); }
        .wp-empty-desc  { font-size: 0.84rem; color: var(--warm-gray); line-height: 1.6; max-width: 360px; }

        .wp-empty-search {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 44px 24px; text-align: center;
        }
        .wp-empty-search > span { font-size: 2rem; opacity: 0.4; }
        .wp-empty-search > p    { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--espresso); }

        .wp-btn-reset {
          padding: 8px 18px; background: var(--cream-dark); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.84rem; font-weight: 600; color: var(--warm-gray);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .wp-btn-reset:hover { background: var(--cream-medium); color: var(--espresso); }

        .wp-count { text-align: right; font-size: 0.75rem; color: var(--warm-gray-light); }

        @media (max-width: 540px) {
          .wp-header    { flex-direction: column; }
          .wp-header-actions { width: 100%; justify-content: flex-end; }
          .wp-filter-row { grid-template-columns: 1fr; }
          .wp-summary-strip { flex-direction: column; gap: 12px; }
          .wp-summary-sep { display: none; }
          .stat-card { align-items: flex-start; padding: 0; }
          .user-stat-bar-wrap { display: none; }
          .breakdown-vals { flex-wrap: wrap; }
          .wp-content { padding: var(--space-md) var(--space-sm); }
        }
      `}</style>
    </div>
  );
}