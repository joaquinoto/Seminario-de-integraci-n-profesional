import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCategories,
  deleteCategory,
  clearCategoryActionState,
  selectCategories,
  selectCategoriesStatus,
  selectCategoriesError,
  selectCategoryAction,
} from '../features/catalog/categoriesSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import {
  Modal, ConfirmDialog, StatusBadge, EmptyState,
  SectionHeader, FilterBar, ActionBtn, TableSkeleton, PrimaryBtn,
} from '../components/ui/CatalogUI';
import CategoryForm from '../components/catalog/CategoryForm';
import AppTopbar    from '../components/layout/AppTopbar';

const isOwner = (user) => user?.role === 'OWNER';

export default function CategoriesPage() {
  const dispatch  = useDispatch();
  const token     = useSelector(selectToken);
  const user      = useSelector(selectUser);
  const items     = useSelector(selectCategories);
  const status    = useSelector(selectCategoriesStatus);
  const fetchErr  = useSelector(selectCategoriesError);
  const { status: actStatus, error: actError } = useSelector(selectCategoryAction);

  const [search,    setSearch]    = useState('');
  const [showAll,   setShowAll]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    dispatch(fetchCategories({ token }));
  }, [dispatch, token]);

  const filtered = useMemo(() => {
    let list = showAll ? items : items.filter((c) => c.active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, search, showAll]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (cat) => { setEditing(cat); setModalOpen(true); };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    dispatch(clearCategoryActionState());
  };

  const handleFormSuccess = () => {
    closeModal();
    dispatch(fetchCategories({ token }));
  };

  const handleDeleteConfirm = () => {
    if (!confirmId) return;
    dispatch(deleteCategory({ token, id: confirmId })).then(() => {
      setConfirmId(null);
      dispatch(clearCategoryActionState());
    });
  };

  const confirmTarget = items.find((c) => c.id === confirmId);
  const deleting      = actStatus === 'loading' && confirmId !== null;

  return (
    <div className="cats-page">
      <AppTopbar />

      <div className="cats-content">
        <SectionHeader
          title="Categorías"
          subtitle={`${items.filter((c) => c.active).length} categorías activas`}
          action={
            isOwner(user) && (
              <PrimaryBtn onClick={openCreate}>+ Nueva categoría</PrimaryBtn>
            )
          }
        />

        <FilterBar>
          <div className="cats-search-wrap">
            <span className="cats-search-icon">🔍</span>
            <input
              className="cats-search"
              placeholder="Buscar categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="cats-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <label className="cats-toggle-all">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Ver inactivas
          </label>
        </FilterBar>

        {/* Error */}
        {fetchErr && (
          <div className="cats-error">⚠ {fetchErr}</div>
        )}

        {/* Loading */}
        {status === 'loading' && <TableSkeleton rows={6} />}

        {/* Empty */}
        {status === 'succeeded' && filtered.length === 0 && (
          <EmptyState
            icon="🗂"
            title="No hay categorías"
            description={
              search
                ? 'Probá con otra búsqueda.'
                : 'Creá la primera categoría para empezar.'
            }
            action={
              isOwner(user) && !search && (
                <PrimaryBtn onClick={openCreate}>+ Nueva categoría</PrimaryBtn>
              )
            }
          />
        )}

        {/* List */}
        {status === 'succeeded' && filtered.length > 0 && (
          <div className="cats-list">
            {filtered.map((cat, i) => (
              <div
                key={cat.id}
                className={`cat-row ${!cat.active ? 'inactive' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="cat-row-main">
                  <div
                    className="cat-color-chip"
                    style={{ background: colorForId(cat.id) }}
                  />
                  <div className="cat-info">
                    <span className="cat-name">{cat.name}</span>
                    {cat.description && (
                      <span className="cat-desc">{cat.description}</span>
                    )}
                  </div>
                </div>

                <div className="cat-row-meta">
                  <StatusBadge active={cat.active} />

                  {/* Action buttons — OWNER only */}
                  {isOwner(user) && (
                    <div className="cat-actions">
                      <ActionBtn
                        variant="edit"
                        onClick={() => openEdit(cat)}
                        title="Editar categoría"
                      />
                      <ActionBtn
                        variant="delete"
                        onClick={() => setConfirmId(cat.id)}
                        title={cat.active ? 'Desactivar categoría' : 'Ya inactiva'}
                        disabled={!cat.active}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Count */}
        {status === 'succeeded' && filtered.length > 0 && (
          <p className="cats-count">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? `Editar: ${editing.name}` : 'Nueva categoría'}
        width="460px"
      >
        <CategoryForm
          category={editing}
          onSuccess={handleFormSuccess}
          onCancel={closeModal}
        />
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={Boolean(confirmId)}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDeleteConfirm}
        title="Desactivar categoría"
        message={`¿Desactivar "${confirmTarget?.name}"? Los productos asociados no se verán afectados, pero la categoría dejará de aparecer en los formularios.`}
        confirmLabel="Desactivar"
        danger
        loading={deleting}
      />

      <style>{`
        .cats-page { min-height: 100vh; background: var(--cream); }
        .cats-content {
          max-width: 900px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }

        /* Search */
        .cats-search-wrap { position: relative; flex: 1; min-width: 200px; }
        .cats-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); font-size: 0.85rem; pointer-events: none;
        }
        .cats-search {
          width: 100%; padding: 9px 36px 9px 36px;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .cats-search:focus { border-color: var(--amber); }
        .cats-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .cats-search-clear:hover { color: var(--espresso); }

        .cats-toggle-all {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.85rem; color: var(--warm-gray); cursor: pointer; white-space: nowrap;
        }
        .cats-toggle-all input { accent-color: var(--amber); }

        /* Error */
        .cats-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        /* List */
        .cats-list { display: flex; flex-direction: column; gap: 8px; }

        .cat-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 16px 18px;
          background: white; border-radius: var(--radius-lg);
          border: 1px solid var(--cream-dark); box-shadow: var(--shadow-sm);
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
        }
        .cat-row:hover { box-shadow: var(--shadow-md); border-color: rgba(200,137,58,0.25); }
        .cat-row.inactive { opacity: 0.55; }

        .cat-row-main {
          display: flex; align-items: center; gap: 14px;
          flex: 1; min-width: 0;
        }
        .cat-color-chip { width: 10px; height: 36px; border-radius: 5px; flex-shrink: 0; }
        .cat-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .cat-name { font-weight: 700; font-size: 0.95rem; color: var(--espresso); }
        .cat-desc {
          font-size: 0.78rem; color: var(--warm-gray);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px;
        }

        .cat-row-meta {
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        .cat-actions { display: flex; gap: 6px; }

        .cats-count {
          text-align: right; font-size: 0.78rem;
          color: var(--warm-gray-light); margin-top: 12px;
        }

        @media (max-width: 540px) {
          .cat-row { flex-direction: column; align-items: flex-start; }
          .cat-row-meta { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </div>
  );
}

// Deterministic color per category id
function colorForId(id) {
  const palette = [
    '#C8893A','#D4A853','#8B6914','#5C8A4A','#4A7A8A',
    '#7A5C8A','#8A4A5C','#6B8A7A','#A07850','#7A8A4A',
  ];
  return palette[id % palette.length];
}
