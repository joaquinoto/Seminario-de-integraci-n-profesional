import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProducts,
  deleteProduct,
  clearProductActionState,
  selectProducts,
  selectProductsStatus,
  selectProductsError,
  selectProductAction,
  setProductFilters,
  selectProductFilters,
} from '../features/catalog/productsSlice';
import { fetchCategories, selectCategories } from '../features/catalog/categoriesSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import {
  Modal, ConfirmDialog, StatusBadge, OriginBadge, EmptyState,
  SectionHeader, FilterBar, ActionBtn, TableSkeleton, PrimaryBtn,
} from '../components/ui/CatalogUI';
import ProductForm from '../components/catalog/ProductForm';
import AppTopbar from '../components/layout/AppTopbar';

const isOwner = (user) => user?.role === 'OWNER';

const UNIT_LABELS = { UNIT: 'Unid.', KG: 'kg', GRAM: 'g', TRAY: 'Band.', BAG: 'Bolsa', LITER: 'L', PACK: 'Pack' };

const formatARS = (v) =>
  v != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v) : '—';

export default function ProductsPage() {
  const dispatch  = useDispatch();
  const token     = useSelector(selectToken);
  const user      = useSelector(selectUser);
  const items     = useSelector(selectProducts);
  const status    = useSelector(selectProductsStatus);
  const fetchErr  = useSelector(selectProductsError);
  const filters   = useSelector(selectProductFilters);
  const categories= useSelector(selectCategories);
  const { status: actStatus } = useSelector(selectProductAction);

  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [expandedId, setExpanded] = useState(null);

  // We fetch all (activeOnly:false so owner can see everything)
  useEffect(() => {
    dispatch(fetchProducts({ token, params: { activeOnly: false } }));
    dispatch(fetchCategories({ token }));
  }, [dispatch, token]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (filters.activeOnly) list = list.filter((p) => p.active);
    if (filters.origin) list = list.filter((p) => p.origin === filters.origin);
    if (filters.categoryId) list = list.filter((p) => p.categoryId === Number(filters.categoryId));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filters, search]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (p)  => { setEditing(p);  setModalOpen(true); };
  const closeModal = ()   => { setModalOpen(false); setEditing(null); dispatch(clearProductActionState()); };

  const handleFormSuccess = () => {
    closeModal();
    dispatch(fetchProducts({ token, params: { activeOnly: false } }));
  };

  const handleDeleteConfirm = () => {
    if (!confirmId) return;
    dispatch(deleteProduct({ token, id: confirmId })).then(() => {
      setConfirmId(null);
      dispatch(clearProductActionState());
    });
  };

  const confirmTarget = items.find((p) => p.id === confirmId);
  const deleting = actStatus === 'loading' && confirmId !== null;

  const activeSuppliers = []; // Will be populated from suppliers slice in a future delivery

  // Active categories for filter
  const activeCategories = categories.filter((c) => c.active);

  return (
    <div className="prods-page">
      <AppTopbar />

      <div className="prods-content">
        <SectionHeader
          title="Productos"
          subtitle={`${items.filter((p) => p.active).length} productos activos · ${items.length} en total`}
          action={
            isOwner(user) && (
              <PrimaryBtn onClick={openCreate}>+ Nuevo producto</PrimaryBtn>
            )
          }
        />

        {/* Filters */}
        <FilterBar>
          <div className="prods-search-wrap">
            <span className="prods-search-icon">🔍</span>
            <input
              className="prods-search"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="prods-filter-sel"
            value={filters.categoryId || ''}
            onChange={(e) => dispatch(setProductFilters({ categoryId: e.target.value }))}
          >
            <option value="">Todas las categorías</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="prods-filter-sel"
            value={filters.origin || ''}
            onChange={(e) => dispatch(setProductFilters({ origin: e.target.value }))}
          >
            <option value="">Todos los orígenes</option>
            <option value="FRANCHISE">🏷 Franquicia</option>
            <option value="EXTERNAL">🌐 Externo</option>
          </select>

          <label className="prods-toggle-all">
            <input
              type="checkbox"
              checked={!filters.activeOnly}
              onChange={(e) => dispatch(setProductFilters({ activeOnly: !e.target.checked }))}
            />
            Ver inactivos
          </label>
        </FilterBar>

        {/* Error */}
        {fetchErr && <div className="prods-error">⚠ {fetchErr}</div>}

        {/* Loading */}
        {status === 'loading' && <TableSkeleton rows={8} />}

        {/* Empty */}
        {status === 'succeeded' && filtered.length === 0 && (
          <EmptyState
            icon="🥐"
            title="No hay productos"
            description={search ? 'Probá con otra búsqueda o cambiá los filtros.' : 'Creá el primer producto para empezar.'}
            action={
              isOwner(user) && !search && (
                <PrimaryBtn onClick={openCreate}>+ Nuevo producto</PrimaryBtn>
              )
            }
          />
        )}

        {/* Table */}
        {status === 'succeeded' && filtered.length > 0 && (
          <>
            {/* Header */}
            <div className="prod-table-header">
              <span style={{ flex: 3 }}>Producto</span>
              <span style={{ flex: 2 }}>Categoría</span>
              <span style={{ flex: 1, textAlign: 'center' }}>Origen</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Precio</span>
              <span style={{ flex: 1, textAlign: 'center' }}>Estado</span>
              {isOwner(user) && <span style={{ flex: 1, textAlign: 'center' }}>Acciones</span>}
            </div>

            <div className="prod-list">
              {filtered.map((p, i) => (
                <div key={p.id} style={{ animationDelay: `${i * 0.03}s` }}>
                  {/* Main row */}
                  <div
                    className={`prod-row ${!p.active ? 'inactive' : ''} ${expandedId === p.id ? 'expanded' : ''}`}
                    onClick={() => setExpanded(expandedId === p.id ? null : p.id)}
                  >
                    <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span className="prod-dot" style={{ background: perishableColor(p.perishable) }} title={p.perishable ? 'Perecedero' : 'No perecedero'} />
                      <div style={{ minWidth: 0 }}>
                        <p className="prod-name">{p.name}</p>
                        {p.description && <p className="prod-desc">{p.description}</p>}
                      </div>
                    </div>
                    <div style={{ flex: 2 }}>
                      <span className="prod-category">{p.categoryName || '—'}</span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <OriginBadge origin={p.origin} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <span className="prod-price">{formatARS(p.salePrice)}</span>
                      {p.costPrice != null && (
                        <span className="prod-cost">costo {formatARS(p.costPrice)}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <StatusBadge active={p.active} />
                    </div>
                    {isOwner(user) && (
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }}
                           onClick={(e) => e.stopPropagation()}>
                        <ActionBtn variant="edit"   onClick={() => openEdit(p)}        title="Editar" />
                        <ActionBtn variant="delete" onClick={() => setConfirmId(p.id)} title="Desactivar" disabled={!p.active} />
                      </div>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {expandedId === p.id && (
                    <div className="prod-detail">
                      <div className="prod-detail-grid">
                        <div className="pd-item"><span className="pd-label">Unidad</span><span>{UNIT_LABELS[p.unitType] || p.unitType}</span></div>
                        <div className="pd-item"><span className="pd-label">Perecedero</span><span>{p.perishable ? '✅ Sí' : '❌ No'}</span></div>
                        <div className="pd-item"><span className="pd-label">Stock mínimo</span><span>{p.minimumStock ?? '—'} {p.minimumStock != null && (UNIT_LABELS[p.unitType] || '')}</span></div>
                        <div className="pd-item"><span className="pd-label">Proveedor</span><span>{p.defaultSupplierName || '—'}</span></div>
                        <div className="pd-item"><span className="pd-label">ID interno</span><span className="pd-mono">#{p.id}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="prods-count">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
          </>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? `Editar: ${editing.name}` : 'Nuevo producto'}
        width="640px"
      >
        <ProductForm
          product={editing}
          suppliers={activeSuppliers}
          onSuccess={handleFormSuccess}
          onCancel={closeModal}
        />
      </Modal>

      {/* Confirm deactivate */}
      <ConfirmDialog
        isOpen={Boolean(confirmId)}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDeleteConfirm}
        title="Desactivar producto"
        message={`¿Desactivar "${confirmTarget?.name}"? El producto no podrá ser usado en nuevas operaciones de stock.`}
        confirmLabel="Desactivar"
        danger
        loading={deleting}
      />

      <style>{`
        .prods-page { min-height: 100vh; background: var(--cream); }
        .prods-content {
          max-width: 1100px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }

        .prods-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .prods-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .prods-search {
          width: 100%; padding: 9px 12px 9px 36px;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .prods-search:focus { border-color: var(--amber); }

        .prods-filter-sel {
          padding: 9px 30px 9px 12px;
          font-family: var(--font-body); font-size: 0.85rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .prods-filter-sel:focus { border-color: var(--amber); }

        .prods-toggle-all {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.85rem; color: var(--warm-gray); cursor: pointer; white-space: nowrap;
        }
        .prods-toggle-all input { accent-color: var(--amber); }
        .prods-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        .prod-table-header {
          display: flex; align-items: center; gap: 12px;
          padding: 8px 18px; margin-bottom: 6px;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--warm-gray-light);
        }

        .prod-list { display: flex; flex-direction: column; gap: 6px; }

        .prod-row {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px; background: white;
          border-radius: var(--radius-lg); border: 1px solid var(--cream-dark);
          box-shadow: var(--shadow-sm); cursor: pointer;
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast), border-radius var(--transition-fast);
        }
        .prod-row:hover { box-shadow: var(--shadow-md); border-color: rgba(200,137,58,0.2); }
        .prod-row.expanded { border-color: var(--amber); border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none; }
        .prod-row.inactive { opacity: 0.5; }

        .prod-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .prod-name { font-weight: 600; font-size: 0.92rem; color: var(--espresso); }
        .prod-desc { font-size: 0.75rem; color: var(--warm-gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
        .prod-category { font-size: 0.82rem; color: var(--espresso-soft); }
        .prod-price { display: block; font-weight: 700; font-size: 0.88rem; color: var(--espresso); }
        .prod-cost { display: block; font-size: 0.72rem; color: var(--warm-gray); }

        .prod-detail {
          padding: 14px 18px 16px;
          background: rgba(200,137,58,0.04);
          border: 1px solid var(--amber);
          border-top: none;
          border-bottom-left-radius: var(--radius-lg);
          border-bottom-right-radius: var(--radius-lg);
          animation: fadeIn 0.2s ease;
        }
        .prod-detail-grid {
          display: flex; flex-wrap: wrap; gap: 20px;
        }
        .pd-item { display: flex; flex-direction: column; gap: 3px; }
        .pd-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--warm-gray-light); }
        .pd-mono  { font-family: monospace; font-size: 0.82rem; color: var(--warm-gray); }

        .prods-count {
          text-align: right; font-size: 0.78rem; color: var(--warm-gray-light);
          margin-top: 12px;
        }

        @media (max-width: 700px) {
          .prod-table-header { display: none; }
          .prod-row { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}

function perishableColor(p) {
  return p ? '#F59E0B' : '#94A3B8';
}