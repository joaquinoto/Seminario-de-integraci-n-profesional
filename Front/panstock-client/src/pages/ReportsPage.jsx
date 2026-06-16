import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectToken, selectUser } from '../features/auth/authSlice';
import {
  fetchWasteSummary, fetchWasteByCategory, fetchWasteBySupplier,
  fetchSalesSummary, fetchSalesByProduct, fetchSalesByCategory,
  fetchStockBalance, fetchStockBalanceByProduct,
  clearReports,
  selectWasteSummary, selectWasteByCategory, selectWasteBySupplier,
  selectSalesSummary, selectSalesByProduct, selectSalesByCategory,
  selectStockBalance, selectStockBalanceByProduct,
} from '../features/reports/reportsSlice';
import AppTopbar from '../components/layout/AppTopbar';

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmt = {
  ars: (v) =>
    v != null
      ? new Intl.NumberFormat('es-AR', {
          style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
        }).format(v)
      : '—',
  qty: (v) =>
    v != null ? `${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 3 })}` : '—',
  pct: (v) =>
    v != null ? `${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : '—',
  date: (d) =>
    d
      ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : '—',
};

const isoToday = () => new Date().toISOString().split('T')[0];
const isoMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// ── Quick date ranges ──────────────────────────────────────────────────────────
const QUICK_RANGES = [
  {
    label: 'Hoy',
    get: () => { const t = isoToday(); return { from: t, to: t }; },
  },
  {
    label: 'Esta semana',
    get: () => {
      const d = new Date();
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      return { from: mon.toISOString().split('T')[0], to: isoToday() };
    },
  },
  {
    label: 'Este mes',
    get: () => ({ from: isoMonthStart(), to: isoToday() }),
  },
  {
    label: 'Últimos 30 días',
    get: () => {
      const d = new Date(); d.setDate(d.getDate() - 30);
      return { from: d.toISOString().split('T')[0], to: isoToday() };
    },
  },
  {
    label: 'Últimos 3 meses',
    get: () => {
      const d = new Date(); d.setMonth(d.getMonth() - 3);
      return { from: d.toISOString().split('T')[0], to: isoToday() };
    },
  },
];

// ── Small reusable components ──────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = 'var(--espresso)', accent }) {
  return (
    <div className="rp-kpi" style={{ '--kpi-accent': accent || color }}>
      <span className="rp-kpi-icon">{icon}</span>
      <div className="rp-kpi-body">
        <span className="rp-kpi-label">{label}</span>
        <span className="rp-kpi-value" style={{ color }}>{value}</span>
        {sub && <span className="rp-kpi-sub">{sub}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="rp-section-title">{children}</h3>;
}

function EmptyData({ label = 'Sin datos para el período seleccionado' }) {
  return (
    <div className="rp-empty">
      <span>📭</span>
      <p>{label}</p>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="rp-loading-row">
      <div className="rp-skel" style={{ width: '60%' }} />
      <div className="rp-skel" style={{ width: '20%' }} />
      <div className="rp-skel" style={{ width: '20%' }} />
    </div>
  );
}

function ErrorBanner({ msg }) {
  return <div className="rp-error-banner">⚠ {msg}</div>;
}

// ── Bar chart row ──────────────────────────────────────────────────────────────
function BarRow({ label, value, max, formattedValue, color, sub }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="br-row">
      <div className="br-meta">
        <span className="br-label">{label}</span>
        {sub && <span className="br-sub">{sub}</span>}
      </div>
      <div className="br-bar-wrap">
        <div className="br-bar-track">
          <div className="br-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="br-value" style={{ color }}>{formattedValue}</span>
      </div>
    </div>
  );
}

// ── Efficiency gauge ───────────────────────────────────────────────────────────
function GaugeBar({ value, label, color, bg }) {
  const clamped = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <div className="gauge-row">
      <div className="gauge-label-row">
        <span className="gauge-label">{label}</span>
        <span className="gauge-pct" style={{ color }}>{fmt.pct(value)}</span>
      </div>
      <div className="gauge-track" style={{ background: bg }}>
        <div
          className="gauge-fill"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Date picker panel ──────────────────────────────────────────────────────────
function DatePicker({ from, to, onFromChange, onToChange, onApply, loading }) {
  return (
    <div className="rp-datepicker">
      <div className="rp-date-fields">
        <div className="rp-date-field">
          <label className="rp-date-label">Desde</label>
          <input
            type="date"
            className="rp-date-input"
            value={from}
            max={to || isoToday()}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <div className="rp-date-field">
          <label className="rp-date-label">Hasta</label>
          <input
            type="date"
            className="rp-date-input"
            value={to}
            min={from || undefined}
            max={isoToday()}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
        <button
          className="rp-apply-btn"
          onClick={onApply}
          disabled={!from || !to || loading}
        >
          {loading ? <span className="rp-spinner" /> : '🔍 Generar'}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 1 — MERMAS
// ═════════════════════════════════════════════════════════════════════════════
function WasteReport({ token, from, to }) {
  const dispatch        = useDispatch();
  const summary         = useSelector(selectWasteSummary);
  const byCategory      = useSelector(selectWasteByCategory);
  const bySupplier      = useSelector(selectWasteBySupplier);

  const isLoading = [summary, byCategory, bySupplier].some(
    (s) => s.status === 'loading'
  );

  const load = useCallback(() => {
    if (!from || !to) return;
    dispatch(fetchWasteSummary({ token, from, to }));
    dispatch(fetchWasteByCategory({ token, from, to }));
    dispatch(fetchWasteBySupplier({ token, from, to }));
  }, [dispatch, token, from, to]);

  useEffect(() => { load(); }, [load]);

  const maxCatLoss  = useMemo(() =>
    Math.max(...(byCategory.data || []).map((c) => Number(c.totalEconomicLoss) || 0), 0),
    [byCategory.data]);

  const maxSuppLoss = useMemo(() =>
    Math.max(...(bySupplier.data || []).map((s) => Number(s.totalEconomicLoss) || 0), 0),
    [bySupplier.data]);

  const CAT_COLORS  = ['#C0392B','#E74C3C','#E67E22','#D68910','#A93226','#CB4335'];
  const SUPP_COLORS = ['#8E44AD','#7D3C98','#6C3483','#5B2C6F','#4A235A','#9B59B6'];

  if (summary.status === 'idle') {
    return <EmptyData label="Seleccioná un período y hacé clic en «Generar»" />;
  }

  const err = summary.error || byCategory.error || bySupplier.error;
  if (err) return <ErrorBanner msg={err} />;

  const s = summary.data;

  return (
    <div className="rp-tab-content">
      {/* KPIs */}
      <div className="rp-kpi-grid">
        <KpiCard
          icon="🗑️"
          label="Registros de merma"
          value={s ? Number(s.totalWasteRecords).toLocaleString('es-AR') : '—'}
          color="var(--espresso)"
          accent="#C0392B"
        />
        <KpiCard
          icon="📦"
          label="Unidades perdidas"
          value={s ? fmt.qty(s.totalQuantity) : '—'}
          sub="unidades totales"
          color="#E67E22"
          accent="#E67E22"
        />
        <KpiCard
          icon="💸"
          label="Pérdida económica"
          value={s ? fmt.ars(s.totalEconomicLoss) : '—'}
          sub={s && s.totalWasteRecords > 0
            ? `~${fmt.ars(Number(s.totalEconomicLoss) / Number(s.totalWasteRecords))} promedio`
            : undefined}
          color="#C0392B"
          accent="#C0392B"
        />
      </div>

      {isLoading && (
        <div className="rp-loading-stack">
          {[0,1,2,3,4].map((i) => <LoadingRow key={i} />)}
        </div>
      )}

      {!isLoading && (
        <>
          {/* By category */}
          <div className="rp-card">
            <SectionTitle>📂 Pérdidas por categoría</SectionTitle>
            {(byCategory.data?.length ?? 0) === 0
              ? <EmptyData />
              : (byCategory.data || []).map((c, i) => (
                  <BarRow
                    key={c.categoryId}
                    label={c.categoryName}
                    sub={`${c.wasteRecordsCount} reg. · ${fmt.qty(c.totalQuantity)} u.`}
                    value={Number(c.totalEconomicLoss)}
                    max={maxCatLoss}
                    formattedValue={fmt.ars(c.totalEconomicLoss)}
                    color={CAT_COLORS[i % CAT_COLORS.length]}
                  />
                ))}
          </div>

          {/* By supplier */}
          <div className="rp-card">
            <SectionTitle>🚚 Pérdidas por proveedor</SectionTitle>
            {(bySupplier.data?.length ?? 0) === 0
              ? <EmptyData />
              : (bySupplier.data || []).map((s, i) => (
                  <BarRow
                    key={s.supplierId ?? 'sin-prov'}
                    label={s.supplierName}
                    sub={`${s.wasteRecordsCount} reg. · ${fmt.qty(s.totalQuantity)} u.`}
                    value={Number(s.totalEconomicLoss)}
                    max={maxSuppLoss}
                    formattedValue={fmt.ars(s.totalEconomicLoss)}
                    color={SUPP_COLORS[i % SUPP_COLORS.length]}
                  />
                ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2 — VENTAS
// ═════════════════════════════════════════════════════════════════════════════
function SalesReport({ token, from, to }) {
  const dispatch     = useDispatch();
  const summary      = useSelector(selectSalesSummary);
  const byProduct    = useSelector(selectSalesByProduct);
  const byCategory   = useSelector(selectSalesByCategory);

  const [viewMode, setViewMode] = useState('product'); // 'product' | 'category'

  const isLoading = [summary, byProduct, byCategory].some(
    (s) => s.status === 'loading'
  );

  const load = useCallback(() => {
    if (!from || !to) return;
    dispatch(fetchSalesSummary({ token, from, to }));
    dispatch(fetchSalesByProduct({ token, from, to }));
    dispatch(fetchSalesByCategory({ token, from, to }));
  }, [dispatch, token, from, to]);

  useEffect(() => { load(); }, [load]);

  const maxProdRev = useMemo(() =>
    Math.max(...(byProduct.data || []).map((p) => Number(p.totalRevenue) || 0), 0),
    [byProduct.data]);

  const maxCatRev = useMemo(() =>
    Math.max(...(byCategory.data || []).map((c) => Number(c.totalRevenue) || 0), 0),
    [byCategory.data]);

  const PROD_COLORS = ['#2E7D32','#388E3C','#43A047','#4CAF50','#1B5E20','#1E8449'];
  const CAT_COLORS  = ['#1565C0','#1976D2','#1E88E5','#2196F3','#0D47A1','#0A3D91'];

  if (summary.status === 'idle') {
    return <EmptyData label="Seleccioná un período y hacé clic en «Generar»" />;
  }

  const err = summary.error || byProduct.error || byCategory.error;
  if (err) return <ErrorBanner msg={err} />;

  const s = summary.data;

  return (
    <div className="rp-tab-content">
      {/* KPIs */}
      <div className="rp-kpi-grid">
        <KpiCard
          icon="🛒"
          label="Movimientos de venta"
          value={s ? Number(s.totalMovements).toLocaleString('es-AR') : '—'}
          color="var(--espresso)"
          accent="#2E7D32"
        />
        <KpiCard
          icon="📦"
          label="Unidades vendidas"
          value={s ? fmt.qty(s.totalQuantitySold) : '—'}
          sub="unidades totales"
          color="#2E7D32"
          accent="#2E7D32"
        />
        <KpiCard
          icon="💰"
          label="Ingresos totales"
          value={s ? fmt.ars(s.totalRevenue) : '—'}
          sub={s && s.totalMovements > 0
            ? `~${fmt.ars(s.averageRevenuePerMovement)} promedio/mov.`
            : undefined}
          color="#1565C0"
          accent="#1565C0"
        />
      </div>

      {isLoading && (
        <div className="rp-loading-stack">
          {[0,1,2,3,4].map((i) => <LoadingRow key={i} />)}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Sub-tabs product/category */}
          <div className="rp-subtabs">
            <button
              className={`rp-subtab ${viewMode === 'product' ? 'active' : ''}`}
              onClick={() => setViewMode('product')}
            >
              🥐 Por producto
            </button>
            <button
              className={`rp-subtab ${viewMode === 'category' ? 'active' : ''}`}
              onClick={() => setViewMode('category')}
            >
              🗂 Por categoría
            </button>
          </div>

          {viewMode === 'product' && (
            <div className="rp-card">
              <SectionTitle>🥐 Ventas por producto</SectionTitle>
              {(byProduct.data?.length ?? 0) === 0
                ? <EmptyData />
                : (byProduct.data || []).map((p, i) => (
                    <BarRow
                      key={p.productId}
                      label={p.productName}
                      sub={`${p.movementsCount} mov. · ${fmt.qty(p.totalQuantitySold)} u. · precio prom. ${fmt.ars(p.averageUnitPrice)}`}
                      value={Number(p.totalRevenue)}
                      max={maxProdRev}
                      formattedValue={fmt.ars(p.totalRevenue)}
                      color={PROD_COLORS[i % PROD_COLORS.length]}
                    />
                  ))}
            </div>
          )}

          {viewMode === 'category' && (
            <div className="rp-card">
              <SectionTitle>🗂 Ventas por categoría</SectionTitle>
              {(byCategory.data?.length ?? 0) === 0
                ? <EmptyData />
                : (byCategory.data || []).map((c, i) => (
                    <BarRow
                      key={c.categoryId}
                      label={c.categoryName}
                      sub={`${c.movementsCount} mov. · ${fmt.qty(c.totalQuantitySold)} u.`}
                      value={Number(c.totalRevenue)}
                      max={maxCatRev}
                      formattedValue={fmt.ars(c.totalRevenue)}
                      color={CAT_COLORS[i % CAT_COLORS.length]}
                    />
                  ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3 — BALANCE DE STOCK
// ═════════════════════════════════════════════════════════════════════════════
function BalanceReport({ token, from, to }) {
  const dispatch    = useDispatch();
  const balance     = useSelector(selectStockBalance);
  const byProduct   = useSelector(selectStockBalanceByProduct);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('entered'); // entered | sold | wasted | efficiency

  const isLoading = [balance, byProduct].some((s) => s.status === 'loading');

  const load = useCallback(() => {
    if (!from || !to) return;
    dispatch(fetchStockBalance({ token, from, to }));
    dispatch(fetchStockBalanceByProduct({ token, from, to }));
  }, [dispatch, token, from, to]);

  useEffect(() => { load(); }, [load]);

  // Filter + sort product list
  const filteredProducts = useMemo(() => {
    let list = [...(byProduct.data || [])];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.categoryName || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'sold':       return Number(b.totalSold)       - Number(a.totalSold);
        case 'wasted':     return Number(b.totalWasted)     - Number(a.totalWasted);
        case 'efficiency': return Number(b.efficiencyRate)  - Number(a.efficiencyRate);
        default:           return Number(b.totalEntered)    - Number(a.totalEntered);
      }
    });
  }, [byProduct.data, search, sortBy]);

  if (balance.status === 'idle') {
    return <EmptyData label="Seleccioná un período y hacé clic en «Generar»" />;
  }

  const err = balance.error || byProduct.error;
  if (err) return <ErrorBanner msg={err} />;

  const b = balance.data;

  return (
    <div className="rp-tab-content">
      {/* Global KPIs */}
      <div className="rp-kpi-grid rp-kpi-grid--4">
        <KpiCard icon="📥" label="Stock ingresado"    value={b ? fmt.qty(b.totalEntered) : '—'} sub="unidades" color="var(--espresso)" accent="var(--amber)" />
        <KpiCard icon="🛒" label="Stock vendido"      value={b ? fmt.qty(b.totalSold)    : '—'} sub="unidades" color="#2E7D32"  accent="#2E7D32" />
        <KpiCard icon="🗑️" label="Stock descartado"   value={b ? fmt.qty(b.totalWasted)  : '—'} sub="unidades" color="#C0392B"  accent="#C0392B" />
        <KpiCard icon="📦" label="Stock restante"     value={b ? fmt.qty(b.remainingStock): '—'} sub="unidades" color="#1565C0" accent="#1565C0" />
      </div>

      {/* Efficiency gauges */}
      {b && (
        <div className="rp-card rp-gauges-card">
          <SectionTitle>📊 Índices de eficiencia del período</SectionTitle>
          <div className="rp-gauges">
            <GaugeBar
              label="Tasa de ventas (vendido / ingresado)"
              value={b.efficiencyRate}
              color="#2E7D32"
              bg="rgba(46,125,50,0.12)"
            />
            <GaugeBar
              label="Tasa de descarte (descartado / ingresado)"
              value={b.wasteRate}
              color="#C0392B"
              bg="rgba(192,57,43,0.10)"
            />
            <GaugeBar
              label="Rotación total (vendido + descartado / ingresado)"
              value={b.sellThroughRate}
              color="#1565C0"
              bg="rgba(21,101,192,0.10)"
            />
          </div>
          <div className="rp-gauge-legend">
            <span className="rp-gauge-tip">
              💡 <strong>Tasa de ventas ideal:</strong> lo más alta posible.
              <strong> Tasa de descarte ideal:</strong> la más baja posible.
            </span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rp-loading-stack">
          {[0,1,2,3,4,5].map((i) => <LoadingRow key={i} />)}
        </div>
      )}

      {/* Product breakdown */}
      {!isLoading && (
        <div className="rp-card">
          <SectionTitle>🥐 Balance por producto</SectionTitle>

          {/* Controls */}
          <div className="rp-balance-controls">
            <div className="rp-balance-search-wrap">
              <span className="rp-bs-icon">🔍</span>
              <input
                className="rp-balance-search"
                placeholder="Buscar producto o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="rp-bs-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <select
              className="rp-sort-sel"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="entered">Ordenar: Mayor ingreso</option>
              <option value="sold">Ordenar: Mayor venta</option>
              <option value="wasted">Ordenar: Mayor descarte</option>
              <option value="efficiency">Ordenar: Mayor eficiencia</option>
            </select>
          </div>

          {filteredProducts.length === 0
            ? <EmptyData />
            : (
              <div className="rp-balance-table-wrap">
                {/* Header */}
                <div className="rp-balance-header">
                  <span className="rbc-product">Producto</span>
                  <span className="rbc-num">Ingresado</span>
                  <span className="rbc-num">Vendido</span>
                  <span className="rbc-num">Descartado</span>
                  <span className="rbc-num">Restante</span>
                  <span className="rbc-eff">Eficiencia</span>
                </div>

                {filteredProducts.map((p) => {
                  const effNum    = Number(p.efficiencyRate)  || 0;
                  const wasteNum  = Number(p.wasteRate)       || 0;
                  const effColor  = effNum >= 70 ? '#2E7D32' : effNum >= 40 ? '#D68910' : '#C0392B';
                  const wasteColor = wasteNum <= 5 ? '#2E7D32' : wasteNum <= 15 ? '#D68910' : '#C0392B';

                  return (
                    <div key={p.productId} className="rp-balance-row">
                      <div className="rbc-product">
                        <span className="rbc-name">{p.productName}</span>
                        <span className="rbc-cat">{p.categoryName}</span>
                      </div>
                      <span className="rbc-num rbc-entered">{fmt.qty(p.totalEntered)}</span>
                      <span className="rbc-num rbc-sold">{fmt.qty(p.totalSold)}</span>
                      <span className="rbc-num rbc-wasted" style={{ color: wasteColor }}>
                        {fmt.qty(p.totalWasted)}
                      </span>
                      <span className="rbc-num rbc-remaining">{fmt.qty(p.remainingStock)}</span>
                      <div className="rbc-eff">
                        <span className="rbc-eff-val" style={{ color: effColor }}>
                          {fmt.pct(p.efficiencyRate)}
                        </span>
                        <div className="rbc-eff-bar">
                          <div
                            className="rbc-eff-fill"
                            style={{ width: `${Math.min(effNum, 100)}%`, background: effColor }}
                          />
                        </div>
                        {wasteNum > 0 && (
                          <span className="rbc-waste-chip" style={{ color: wasteColor }}>
                            descarte {fmt.pct(p.wasteRate)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {filteredProducts.length > 0 && (
            <p className="rp-balance-count">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
              {search && ' (filtrados)'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const token     = useSelector(selectToken);
  const user      = useSelector(selectUser);

  const [activeTab, setActiveTab]   = useState('waste');
  const [from,      setFrom]        = useState(isoMonthStart());
  const [to,        setTo]          = useState(isoToday());
  const [applied,   setApplied]     = useState({ from: null, to: null });
  const [loading,   setLoading]     = useState(false);

  // Guard: redirect non-OWNER
  useEffect(() => {
    if (user && user.role !== 'OWNER') navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleApply = useCallback(() => {
    if (!from || !to) return;
    setLoading(true);
    setApplied({ from, to });
    setTimeout(() => setLoading(false), 300);
  }, [from, to]);

  const handleQuickRange = (range) => {
    const { from: f, to: t } = range.get();
    setFrom(f);
    setTo(t);
    setApplied({ from: f, to: t });
  };

  useEffect(() => {
    return () => { dispatch(clearReports()); };
  }, [dispatch]);

  if (user && user.role !== 'OWNER') return null;

  const TABS = [
    { key: 'waste',   label: '🗑️ Mermas',   desc: 'Pérdidas y descarte' },
    { key: 'sales',   label: '💰 Ventas',    desc: 'Ingresos y productos vendidos' },
    { key: 'balance', label: '📊 Balance',   desc: 'Stock ingresado vs vendido vs descartado' },
  ];

  const periodLabel = applied.from && applied.to
    ? `${fmt.date(applied.from)} — ${fmt.date(applied.to)}`
    : null;

  return (
    <div className="rp-page">
      <AppTopbar />

      <div className="rp-content">

        {/* ── Header ── */}
        <div className="rp-header">
          <div>
            <h1 className="rp-title">📊 Reportes</h1>
            <p className="rp-subtitle">
              Análisis automático basado en los registros del sistema
              {periodLabel && (
                <span className="rp-period-chip"> · {periodLabel}</span>
              )}
            </p>
          </div>
        </div>

        {/* ── Info banner ── */}
        <div className="rp-info-banner">
          <span>ℹ️</span>
          <p>
            Los reportes se generan <strong>automáticamente</strong> a partir de
            los ingresos, ventas y mermas ya registradas en el sistema.
            No requieren carga manual adicional.
          </p>
        </div>

        {/* ── Quick ranges ── */}
        <div className="rp-quick-wrap">
          <span className="rp-quick-label">Período rápido:</span>
          <div className="rp-quick-chips">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.label}
                className="rp-quick-chip"
                onClick={() => handleQuickRange(r)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Date picker ── */}
        <div className="rp-picker-card">
          <DatePicker
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            onApply={handleApply}
            loading={loading}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="rp-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`rp-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="rp-tab-label">{tab.label}</span>
              <span className="rp-tab-desc">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="rp-tab-body">
          {activeTab === 'waste' && (
            <WasteReport
              token={token}
              from={applied.from}
              to={applied.to}
            />
          )}
          {activeTab === 'sales' && (
            <SalesReport
              token={token}
              from={applied.from}
              to={applied.to}
            />
          )}
          {activeTab === 'balance' && (
            <BalanceReport
              token={token}
              from={applied.from}
              to={applied.to}
            />
          )}
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        /* ── Page shell ── */
        .rp-page    { min-height: 100vh; background: var(--cream); }
        .rp-content {
          max-width: 900px; margin: 0 auto;
          padding: var(--space-lg) var(--space-md);
          display: flex; flex-direction: column; gap: var(--space-md);
        }

        /* ── Header ── */
        .rp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .rp-title  { font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; color: var(--espresso); margin-bottom: 4px; }
        .rp-subtitle { font-size: 0.84rem; color: var(--warm-gray); line-height: 1.5; }
        .rp-period-chip {
          display: inline-flex; align-items: center;
          padding: 2px 9px; border-radius: 20px;
          background: rgba(200,137,58,0.12); color: var(--amber-dark);
          font-size: 0.76rem; font-weight: 600;
        }

        /* ── Info banner ── */
        .rp-info-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.07); border: 1px solid rgba(200,137,58,0.22);
        }
        .rp-info-banner p { font-size: 0.82rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }

        /* ── Quick ranges ── */
        .rp-quick-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .rp-quick-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--warm-gray); flex-shrink: 0;
        }
        .rp-quick-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .rp-quick-chip {
          padding: 6px 13px; border-radius: 20px;
          border: 1.5px solid var(--cream-dark); background: white;
          font-family: var(--font-body); font-size: 0.78rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .rp-quick-chip:hover { border-color: var(--amber); color: var(--amber-dark); }

        /* ── Date picker card ── */
        .rp-picker-card {
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-lg); padding: 16px 18px;
          box-shadow: var(--shadow-sm);
        }
        .rp-datepicker { display: flex; flex-direction: column; gap: 12px; }
        .rp-date-fields { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
        .rp-date-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 140px; }
        .rp-date-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--warm-gray);
        }
        .rp-date-input {
          width: 100%; padding: 10px 12px;
          font-family: var(--font-body); font-size: 0.9rem;
          color: var(--espresso); background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; -webkit-appearance: none; box-sizing: border-box;
          transition: border-color var(--transition-base);
        }
        .rp-date-input:focus { border-color: var(--amber); background: #fff; }
        .rp-apply-btn {
          padding: 11px 22px; background: var(--espresso); color: var(--cream);
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 700;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          transition: all var(--transition-fast); box-shadow: var(--shadow-md);
          display: flex; align-items: center; gap: 8px; height: 42px;
        }
        .rp-apply-btn:hover:not(:disabled) { background: var(--espresso-mid); transform: translateY(-1px); }
        .rp-apply-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .rp-spinner {
          width: 17px; height: 17px; border: 2px solid var(--cream);
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Tabs ── */
        .rp-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .rp-tab {
          display: flex; flex-direction: column; gap: 2px;
          padding: 12px 14px;
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-lg); cursor: pointer;
          font-family: var(--font-body); text-align: left;
          transition: all var(--transition-fast);
        }
        .rp-tab:hover { border-color: rgba(200,137,58,0.4); box-shadow: var(--shadow-sm); }
        .rp-tab.active {
          border-color: var(--amber); background: rgba(200,137,58,0.05);
          box-shadow: 0 2px 12px rgba(200,137,58,0.18);
        }
        .rp-tab-label { font-size: 0.88rem; font-weight: 700; color: var(--espresso); }
        .rp-tab-desc  { font-size: 0.72rem; color: var(--warm-gray); line-height: 1.3; }
        .rp-tab.active .rp-tab-label { color: var(--amber-dark); }

        /* ── Tab body ── */
        .rp-tab-body { display: flex; flex-direction: column; }
        .rp-tab-content { display: flex; flex-direction: column; gap: var(--space-md); }

        /* ── KPI grid ── */
        .rp-kpi-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
        }
        .rp-kpi-grid--4 { grid-template-columns: repeat(2, 1fr); }
        .rp-kpi {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-lg);
          border-top: 3px solid var(--kpi-accent, var(--amber));
          box-shadow: var(--shadow-sm);
        }
        .rp-kpi-icon  { font-size: 1.35rem; flex-shrink: 0; margin-top: 2px; }
        .rp-kpi-body  { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .rp-kpi-label {
          font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--warm-gray); line-height: 1;
        }
        .rp-kpi-value {
          font-family: var(--font-display); font-size: 1.15rem; font-weight: 700;
          line-height: 1.2; word-break: break-word;
        }
        .rp-kpi-sub { font-size: 0.7rem; color: var(--warm-gray); }

        /* ── Section card ── */
        .rp-card {
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-lg); padding: 18px 20px;
          box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 14px;
        }
        .rp-section-title {
          font-family: var(--font-display); font-size: 0.96rem; font-weight: 700;
          color: var(--espresso); padding-bottom: 10px;
          border-bottom: 1px solid var(--cream-dark); margin-bottom: 2px;
        }

        /* ── Bar row ── */
        .br-row  { display: flex; flex-direction: column; gap: 6px; }
        .br-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .br-label { font-size: 0.88rem; font-weight: 600; color: var(--espresso); }
        .br-sub   { font-size: 0.72rem; color: var(--warm-gray); }
        .br-bar-wrap { display: flex; align-items: center; gap: 10px; }
        .br-bar-track {
          flex: 1; height: 10px; border-radius: 5px;
          background: var(--cream-dark); overflow: hidden;
        }
        .br-bar-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; min-width: 4px; }
        .br-value { font-size: 0.84rem; font-weight: 700; min-width: 80px; text-align: right; white-space: nowrap; }

        /* ── Gauges ── */
        .rp-gauges-card { gap: 16px; }
        .rp-gauges  { display: flex; flex-direction: column; gap: 14px; }
        .gauge-row  { display: flex; flex-direction: column; gap: 6px; }
        .gauge-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .gauge-label { font-size: 0.84rem; color: var(--espresso); font-weight: 500; }
        .gauge-pct   { font-size: 1rem; font-weight: 800; min-width: 52px; text-align: right; flex-shrink: 0; }
        .gauge-track { height: 12px; border-radius: 6px; overflow: hidden; }
        .gauge-fill  { height: 100%; border-radius: 6px; transition: width 0.6s ease; min-width: 4px; }
        .rp-gauge-legend { padding-top: 4px; }
        .rp-gauge-tip { font-size: 0.78rem; color: var(--warm-gray); line-height: 1.5; }

        /* ── Sub-tabs ── */
        .rp-subtabs {
          display: flex; background: var(--cream-dark);
          border-radius: var(--radius-md); padding: 3px; align-self: flex-start;
        }
        .rp-subtab {
          padding: 8px 18px; border: none; border-radius: calc(var(--radius-md) - 2px);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
          cursor: pointer; color: var(--warm-gray); background: none;
          transition: all var(--transition-fast); white-space: nowrap;
        }
        .rp-subtab.active { background: white; color: var(--espresso); box-shadow: var(--shadow-sm); }

        /* ── Balance table ── */
        .rp-balance-controls {
          display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
        }
        .rp-balance-search-wrap { position: relative; flex: 1; min-width: 160px; }
        .rp-bs-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .rp-balance-search {
          width: 100%; padding: 9px 34px; box-sizing: border-box;
          font-family: var(--font-body); font-size: 0.86rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: var(--cream); color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .rp-balance-search:focus { border-color: var(--amber); background: #fff; }
        .rp-bs-clear {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .rp-sort-sel {
          padding: 9px 12px; font-family: var(--font-body); font-size: 0.82rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .rp-sort-sel:focus { border-color: var(--amber); }

        .rp-balance-table-wrap { display: flex; flex-direction: column; gap: 0; }
        .rp-balance-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1.5fr;
          gap: 8px; padding: 8px 12px;
          background: var(--espresso); border-radius: var(--radius-md) var(--radius-md) 0 0;
          font-size: 0.64rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: rgba(247,243,238,0.8);
        }
        .rp-balance-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1.5fr;
          gap: 8px; padding: 10px 12px;
          border-bottom: 1px solid var(--cream-dark);
          align-items: center;
          transition: background var(--transition-fast);
        }
        .rp-balance-row:last-child { border-bottom: none; }
        .rp-balance-row:hover { background: var(--cream); }
        .rbc-product { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .rbc-name { font-size: 0.84rem; font-weight: 700; color: var(--espresso); word-break: break-word; }
        .rbc-cat  { font-size: 0.68rem; color: var(--warm-gray); }
        .rbc-num  { font-size: 0.82rem; font-weight: 600; color: var(--espresso); text-align: right; }
        .rbc-entered   { color: var(--espresso) !important; }
        .rbc-sold      { color: #2E7D32 !important; }
        .rbc-remaining { color: #1565C0 !important; }
        .rbc-eff { display: flex; flex-direction: column; gap: 4px; }
        .rbc-eff-val  { font-size: 0.82rem; font-weight: 800; text-align: right; }
        .rbc-eff-bar  { height: 5px; border-radius: 3px; background: var(--cream-dark); overflow: hidden; }
        .rbc-eff-fill { height: 100%; border-radius: 3px; min-width: 2px; transition: width 0.4s ease; }
        .rbc-waste-chip {
          font-size: 0.62rem; font-weight: 600; text-align: right;
          line-height: 1.3;
        }

        .rp-balance-count { font-size: 0.75rem; color: var(--warm-gray-light); text-align: right; margin-top: 4px; }

        /* ── Loading ── */
        .rp-loading-stack { display: flex; flex-direction: column; gap: 8px; }
        .rp-loading-row {
          display: flex; gap: 10px; padding: 14px 16px;
          background: white; border-radius: var(--radius-md);
          border: 1px solid var(--cream-dark);
        }
        .rp-skel {
          height: 14px; border-radius: 6px;
          background: linear-gradient(90deg,var(--cream-dark) 25%,var(--cream-medium) 50%,var(--cream-dark) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }

        /* ── Empty / Error ── */
        .rp-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 40px 24px; text-align: center;
        }
        .rp-empty > span { font-size: 2rem; opacity: 0.45; }
        .rp-empty > p { font-size: 0.88rem; color: var(--warm-gray); font-weight: 600; }

        .rp-error-banner {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem;
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .rp-content    { padding: var(--space-md) var(--space-sm); }
          .rp-tabs       { grid-template-columns: 1fr; }
          .rp-tab        { flex-direction: row; align-items: center; gap: 10px; padding: 11px 14px; }
          .rp-tab-desc   { display: none; }
          .rp-kpi-grid   { grid-template-columns: 1fr 1fr; }
          .rp-kpi-grid--4{ grid-template-columns: 1fr 1fr; }
          .rp-kpi-value  { font-size: 1rem; }
          .rp-date-fields { flex-direction: column; }
          .rp-apply-btn  { width: 100%; justify-content: center; }
          .rp-balance-header,
          .rp-balance-row {
            grid-template-columns: 1.8fr repeat(3, 0.8fr);
          }
          .rbc-remaining,
          .rbc-eff,
          .rp-balance-header > span:nth-child(5),
          .rp-balance-header > span:nth-child(6) { display: none; }
          .rp-subtabs { width: 100%; }
          .rp-subtab  { flex: 1; text-align: center; }
          .rp-balance-controls { flex-direction: column; align-items: stretch; }
          .rp-sort-sel { width: 100%; }
        }

        @media (max-width: 380px) {
          .rp-kpi-grid   { grid-template-columns: 1fr; }
          .rp-kpi-grid--4{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
