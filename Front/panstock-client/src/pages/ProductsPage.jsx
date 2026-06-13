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
import { fetchSuppliers }                    from '../features/catalog/suppliersSlice';
import { selectToken, selectUser }           from '../features/auth/authSlice';
import {
  Modal,
  ConfirmDialog,
  StatusBadge,
  OriginBadge,
  EmptyState,
  SectionHeader,
  FilterBar,
  ActionBtn,
  TableSkeleton,
  PrimaryBtn,
} from '../components/ui/CatalogUI';
import ProductForm from '../components/catalog/ProductForm';
import AppTopbar   from '../components/layout/AppTopbar';

const isOwner = (user) => user?.role === 'OWNER';

const UNIT_LABELS = {
  UNIT: 'Unid.', KG: 'kg', GRAM: 'g',
  TRAY: 'Band.', BAG: 'Bolsa', LITER: 'L', PACK: 'Pack',
};

const formatARS = (v) =>
  v != null
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(v)
    : '—';

export default function ProductsPage() {
  const dispatch   = useDispatch();
  const token      = useSelector(selectToken);
  const user       = useSelector(selectUser);
  const items      = useSelector(selectProducts);
  const status     = useSelector(selectProductsStatus);
  const fetchErr   = useSelector(selectProductsError);
  const filters    = useSelector(selectProductFilters);
  const categories = useSelector(selectCategories);
  const { status: actStatus } = useSelector(selectProductAction);

  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [confirmId,  setConfirmId]  = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    dispatch(fetchProducts({ token, params: { activeOnly: false } }));
    dispatch(fetchCategories({ token, activeOnly: false }));
    dispatch(fetchSuppliers({ token, params: { activeOnly: true } }));
  }, [dispatch, token]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (filters.activeOnly)  list = list.filter((p) => p.active);
    if (filters.origin)      list = list.filter((p) => p.origin === filters.origin);
    if (filters.categoryId)  list = list.filter((p) => p.categoryId === Number(filters.categoryId));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description          || '').toLowerCase().includes(q) ||
          (p.categoryName         || '').toLowerCase().includes(q) ||
          (p.defaultSupplierName  || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filters, search]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (p) => { setEditing(p); setModalOpen(true); };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    dispatch(clearProductActionState());
  };
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
  const deleting      = actStatus === 'loading' && confirmId !== null;
  const activeCategories = categories.filter((c) => c.active);
  const activeCount = items.filter((p) => p.active).length;

  return (
    <div className="prods-page">
      <AppTopbar />

      <div className="prods-content">
        <SectionHeader
          title="Productos"
          subtitle={`${activeCount} activo${activeCount !== 1 ? 's' : ''} · ${items.length} en total`}
          action={
            isOwner(user) && (
              <PrimaryBtn onClick={openCreate}>+ Nuevo producto</PrimaryBtn>
            )
          }
        />

        {/* ── Filters ── */}
        <FilterBar>
          <div className="prods-search-wrap">
            <span className="prods-search-icon">🔍</span>
            <input
              className="prods-search"
              placeholder="Buscar por nombre, categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="prods-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
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

        {fetchErr && <div className="prods-error">⚠ {fetchErr}</div>}
        {status === 'loading' && <TableSkeleton rows={8} />}

        {status === 'succeeded' && filtered.length === 0 && (
          <EmptyState
            icon="🥐"
            title="No hay productos"
            description={
              search
                ? 'Probá con otra búsqueda o cambiá los filtros.'
                : isOwner(user)
                  ? 'Creá el primer producto para empezar.'
                  : 'Todavía no hay productos cargados.'
            }
            action={
              isOwner(user) && !search && (
                <PrimaryBtn onClick={openCreate}>+ Nuevo producto</PrimaryBtn>
              )
            }
          />
        )}

        {/* ── Desktop table header (oculto en mobile) ── */}
        {status === 'succeeded' && filtered.length > 0 && (
          <>
            <div className="prod-table-header desktop-only">
              <span className="th-name">Producto</span>
              <span className="th-cat">Categoría</span>
              <span className="th-origin">Origen</span>
              <span className="th-price">Precio venta</span>
              <span className="th-status">Estado</span>
              {isOwner(user) && <span className="th-actions">Acciones</span>}
            </div>

            <div className="prod-list">
              {filtered.map((p, i) => (
                <div key={p.id} style={{ animationDelay: `${i * 0.03}s` }}>

                  {/* ── Fila desktop / Card mobile ── */}
                  <div
                    className={`prod-row ${!p.active ? 'inactive' : ''} ${expandedId === p.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    {/* Indicador perecedero */}
                    <span
                      className="prod-dot"
                      style={{ background: p.perishable ? '#F59E0B' : '#94A3B8' }}
                      title={p.perishable ? 'Perecedero' : 'No perecedero'}
                    />

                    {/* Nombre + descripción — ocupa todo el ancho en mobile */}
                    <div className="prod-name-col">
                      <p className="prod-name">{p.name}</p>
                      {p.description && (
                        <p className="prod-desc">{p.description}</p>
                      )}
                    </div>

                    {/* En mobile: badges en una fila compacta bajo el nombre */}
                    <div className="prod-badges-mobile">
                      <span className="prod-cat-chip">{p.categoryName || '—'}</span>
                      <OriginBadge origin={p.origin} />
                      <StatusBadge active={p.active} />
                    </div>

                    {/* En desktop: columnas individuales */}
                    <span className="prod-category desktop-only">{p.categoryName || '—'}</span>
                    <div className="prod-origin-col desktop-only">
                      <OriginBadge origin={p.origin} />
                    </div>
                    <div className="prod-price-col desktop-only">
                      <span className="prod-price">{formatARS(p.salePrice)}</span>
                      {p.costPrice != null && (
                        <span className="prod-cost">costo {formatARS(p.costPrice)}</span>
                      )}
                    </div>
                    <div className="prod-status-col desktop-only">
                      <StatusBadge active={p.active} />
                    </div>

                    {/* Acciones */}
                    {isOwner(user) && (
                      <div
                        className="prod-actions-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionBtn
                          variant="edit"
                          onClick={() => openEdit(p)}
                          title="Editar producto"
                        />
                        <ActionBtn
                          variant="delete"
                          onClick={() => setConfirmId(p.id)}
                          title={p.active ? 'Desactivar producto' : 'Ya inactivo'}
                          disabled={!p.active}
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Panel expandido ── */}
                  {expandedId === p.id && (
                    <div className="prod-detail">
                      <div className="prod-detail-grid">
                        <div className="pd-item">
                          <span className="pd-label">Precio de venta</span>
                          <span className="pd-value">{formatARS(p.salePrice)}</span>
                        </div>
                        <div className="pd-item">
                          <span className="pd-label">Costo unitario</span>
                          <span className="pd-value">{formatARS(p.costPrice)}</span>
                        </div>
                        <div className="pd-item">
                          <span className="pd-label">Unidad</span>
                          <span className="pd-value">{UNIT_LABELS[p.unitType] || p.unitType}</span>
                        </div>
                        <div className="pd-item">
                          <span className="pd-label">Perecedero</span>
                          <span className="pd-value">{p.perishable ? '✅ Sí' : '❌ No'}</span>
                        </div>
                        <div className="pd-item">
                          <span className="pd-label">Stock mínimo</span>
                          <span className="pd-value">
                            {p.minimumStock != null
                              ? `${p.minimumStock} ${UNIT_LABELS[p.unitType] || ''}`
                              : '—'}
                          </span>
                        </div>
                        <div className="pd-item">
                          <span className="pd-label">Proveedor</span>
                          <span className="pd-value">{p.defaultSupplierName || '—'}</span>
                        </div>
                        <div className="pd-item">
                          <span className="pd-label">ID</span>
                          <span className="pd-mono">#{p.id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="prods-count">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      {isOwner(user) && (
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editing ? `Editar: ${editing.name}` : 'Nuevo producto'}
          width="640px"
        >
          <ProductForm
            product={editing}
            onSuccess={handleFormSuccess}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {isOwner(user) && (
        <ConfirmDialog
          isOpen={Boolean(confirmId)}
          onClose={() => setConfirmId(null)}
          onConfirm={handleDeleteConfirm}
          title="Desactivar producto"
          message={`¿Desactivar "${confirmTarget?.name}"? El producto no podrá usarse en nuevas operaciones de stock, pero el historial se conserva.`}
          confirmLabel="Desactivar"
          danger
          loading={deleting}
        />
      )}

      <style>{`
        .prods-page    { min-height: 100vh; background: var(--cream); }
        .prods-content {
          max-width: 1100px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }

        /* ── Search ── */
        .prods-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .prods-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); font-size: 0.85rem; pointer-events: none;
        }
        .prods-search {
          width: 100%; padding: 9px 36px;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .prods-search:focus { border-color: var(--amber); }
        .prods-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }

        .prods-filter-sel {
          padding: 9px 12px;
          font-family: var(--font-body); font-size: 0.85rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .prods-filter-sel:focus { border-color: var(--amber); }

        .prods-toggle-all {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.85rem; color: var(--warm-gray);
          cursor: pointer; white-space: nowrap;
        }
        .prods-toggle-all input { accent-color: var(--amber); }

        .prods-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        /* ── Desktop table header ── */
        .desktop-only { display: none; }

        .prod-table-header {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 16px; margin-bottom: 4px;
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--warm-gray-light);
        }
        .th-name    { flex: 3; }
        .th-cat     { flex: 2; }
        .th-origin  { flex: 1.2; }
        .th-price   { flex: 1.5; text-align: right; }
        .th-status  { flex: 1; text-align: center; }
        .th-actions { flex: 1; text-align: center; }

        /* ── List ── */
        .prod-list { display: flex; flex-direction: column; gap: 8px; }

        /* ── Row / Card ── */
        .prod-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px 16px;
          background: white;
          border-radius: var(--radius-lg);
          border: 1.5px solid var(--cream-dark);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
          position: relative;
        }
        .prod-row:hover    { box-shadow: var(--shadow-md); border-color: rgba(200,137,58,0.25); }
        .prod-row.inactive { opacity: 0.55; }
        .prod-row.expanded {
          border-color: var(--amber);
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          border-bottom: none;
        }

        /* Dot indicador perecedero — posicionado en esquina superior */
        .prod-dot {
          position: absolute;
          top: 14px; left: 14px;
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Nombre — con padding izquierdo para el dot */
        .prod-name-col {
          padding-left: 20px;
          display: flex; flex-direction: column; gap: 2px;
          min-width: 0;
        }
        .prod-name {
          font-weight: 700;
          font-size: 0.96rem;
          color: var(--espresso);
          line-height: 1.3;
          word-break: break-word;
        }
        .prod-desc {
          font-size: 0.78rem;
          color: var(--warm-gray);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Badges en mobile — fila horizontal compacta */
        .prod-badges-mobile {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          padding-left: 20px;
        }
        .prod-cat-chip {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--warm-gray);
          background: var(--cream-dark);
          padding: 3px 9px;
          border-radius: 20px;
        }

        /* Acciones — alineadas a la derecha */
        .prod-actions-col {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding-left: 20px;
        }

        /* Panel de detalle expandido */
        .prod-detail {
          padding: 14px 16px 16px;
          background: rgba(200,137,58,0.04);
          border: 1.5px solid var(--amber);
          border-top: none;
          border-bottom-left-radius: var(--radius-lg);
          border-bottom-right-radius: var(--radius-lg);
          animation: fadeIn 0.2s ease;
        }
        .prod-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .pd-item  { display: flex; flex-direction: column; gap: 2px; }
        .pd-label {
          font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--warm-gray-light);
        }
        .pd-value { font-size: 0.86rem; font-weight: 600; color: var(--espresso); }
        .pd-mono  { font-family: monospace; font-size: 0.82rem; color: var(--warm-gray); }

        .prods-count {
          text-align: right;
          font-size: 0.78rem;
          color: var(--warm-gray-light);
          margin-top: 12px;
        }

        /* ═══════════════════════════════
           DESKTOP (≥ 700px)
           ═══════════════════════════════ */
        @media (min-width: 700px) {
          .desktop-only { display: unset; }

          .prod-row {
            flex-direction: row;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
          }

          .prod-dot {
            position: static;
            width: 8px; height: 8px;
            flex-shrink: 0;
          }

          .prod-name-col {
            flex: 3;
            padding-left: 0;
            min-width: 0;
          }
          .prod-name { font-size: 0.92rem; }
          .prod-desc { font-size: 0.75rem; }

          /* En desktop ocultamos los badges mobile */
          .prod-badges-mobile { display: none; }

          .prod-category {
            flex: 2;
            font-size: 0.84rem;
            color: var(--espresso-soft);
          }

          .prod-origin-col { flex: 1.2; }

          .prod-price-col {
            flex: 1.5;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .prod-price {
            display: block;
            font-weight: 700;
            font-size: 0.88rem;
            color: var(--espresso);
          }
          .prod-cost {
            display: block;
            font-size: 0.72rem;
            color: var(--warm-gray);
          }

          .prod-status-col {
            flex: 1;
            display: flex;
            justify-content: center;
          }

          .prod-actions-col {
            flex: 1;
            display: flex;
            justify-content: center;
            gap: 6px;
            padding-left: 0;
          }

          .prod-row.expanded {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
          }

          .prod-detail-grid {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 16px;
          }
        }

        /* ── Tablet intermedio ── */
        @media (min-width: 700px) and (max-width: 900px) {
          .prod-price-col { flex: 1.2; }
          .prod-category  { flex: 1.5; }
        }

        /* ── Mobile extra pequeño ── */
        @media (max-width: 380px) {
          .prods-content { padding: var(--space-lg) var(--space-md); }
          .prod-name { font-size: 0.88rem; }
        }
      `}</style>
    </div>
  );
}