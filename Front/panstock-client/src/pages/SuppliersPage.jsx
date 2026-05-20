import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSuppliers,
  deleteSupplier,
  createSupplier,
  updateSupplier,
  clearSupplierActionState,
  selectSuppliers,
  selectSuppliersStatus,
  selectSuppliersError,
  selectSupplierAction,
} from '../features/catalog/suppliersSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import {
  Modal,
  ConfirmDialog,
  StatusBadge,
  EmptyState,
  SectionHeader,
  FilterBar,
  ActionBtn,
  TableSkeleton,
  PrimaryBtn,
} from '../components/ui/CatalogUI';
import AppTopbar from '../components/layout/AppTopbar';
import { Alert } from '../components/ui/FormField';

// ─── Guard ────────────────────────────────────────────────────────────────────
const isOwner = (user) => user?.role === 'OWNER';

// ─── Supplier type labels ─────────────────────────────────────────────────────
const TYPE_LABELS = {
  FRANCHISE:  { label: '🏷 Franquicia', color: '#A06C28', bg: 'rgba(200,137,58,0.12)' },
  WHOLESALER: { label: '🏪 Mayorista',  color: '#1565C0', bg: 'rgba(21,101,192,0.10)' },
  EXTERNAL:   { label: '🌐 Externo',    color: '#2E7D32', bg: 'rgba(46,125,50,0.10)'  },
};

function TypeBadge({ type }) {
  const cfg = TYPE_LABELS[type] || { label: type, color: 'var(--warm-gray)', bg: 'var(--cream-dark)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Supplier Form ─────────────────────────
const EMPTY_SUP = {
  name: '', supplierType: 'EXTERNAL',
  contactName: '', phone: '', email: '', notes: '', active: true,
};

function SupplierForm({ supplier = null, onSuccess, onCancel, token, dispatch }) {
  const { status, error } = useSelector(selectSupplierAction);
  const isEdit = Boolean(supplier);

  const [form, setForm]      = useState(EMPTY_SUP);
  const [fieldErrors, setFE] = useState({});

  useEffect(() => {
    if (supplier) {
      setForm({
        name:         supplier.name         || '',
        supplierType: supplier.supplierType || 'EXTERNAL',
        contactName:  supplier.contactName  || '',
        phone:        supplier.phone        || '',
        email:        supplier.email        || '',
        notes:        supplier.notes        || '',
        active:       supplier.active !== undefined ? supplier.active : true,
      });
    } else {
      setForm(EMPTY_SUP);
    }
    setFE({});
    dispatch(clearSupplierActionState());
  }, [supplier, dispatch]);

  useEffect(() => {
    if (status === 'succeeded') {
      dispatch(clearSupplierActionState());
      onSuccess?.();
    }
  }, [status, dispatch, onSuccess]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())         e.name  = 'El nombre es obligatorio';
    if (!form.supplierType)        e.supplierType = 'El tipo es obligatorio';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                   e.email = 'Email inválido';
    return e;
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
    if (fieldErrors[field]) setFE((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    const payload = {
      name:        form.name.trim(),
      supplierType: form.supplierType,
      contactName: form.contactName.trim() || null,
      phone:       form.phone.trim()       || null,
      email:       form.email.trim()       || null,
      notes:       form.notes.trim()       || null,
      active:      form.active,
    };

    if (isEdit) {
      dispatch(updateSupplier({ token, id: supplier.id, data: payload }));
    } else {
      dispatch(createSupplier({ token, data: payload }));
    }
  };

  const isLoading = status === 'loading';

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <Alert type="error">{error}</Alert>}

      {/* Name + Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="sf-field">
          <label className="sf-label">Nombre *</label>
          <input
            className={`sf-input ${fieldErrors.name ? 'err' : ''}`}
            placeholder="Ej: Guajira"
            value={form.name}
            onChange={handleChange('name')}
            disabled={isLoading}
            autoFocus
          />
          {fieldErrors.name && <span className="sf-err">{fieldErrors.name}</span>}
        </div>

        <div className="sf-field">
          <label className="sf-label">Tipo *</label>
          <select
            className={`sf-select ${fieldErrors.supplierType ? 'err' : ''}`}
            value={form.supplierType}
            onChange={handleChange('supplierType')}
            disabled={isLoading}
          >
            <option value="FRANCHISE">🏷 Franquicia</option>
            <option value="WHOLESALER">🏪 Mayorista</option>
            <option value="EXTERNAL">🌐 Externo</option>
          </select>
          {fieldErrors.supplierType && <span className="sf-err">{fieldErrors.supplierType}</span>}
        </div>
      </div>

      {/* Contact + Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="sf-field">
          <label className="sf-label">Contacto</label>
          <input
            className="sf-input"
            placeholder="Nombre del contacto"
            value={form.contactName}
            onChange={handleChange('contactName')}
            disabled={isLoading}
          />
        </div>
        <div className="sf-field">
          <label className="sf-label">Teléfono</label>
          <input
            className="sf-input"
            placeholder="+54 11 ..."
            value={form.phone}
            onChange={handleChange('phone')}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Email */}
      <div className="sf-field">
        <label className="sf-label">Email</label>
        <input
          className={`sf-input ${fieldErrors.email ? 'err' : ''}`}
          type="email"
          placeholder="contacto@proveedor.com"
          value={form.email}
          onChange={handleChange('email')}
          disabled={isLoading}
        />
        {fieldErrors.email && <span className="sf-err">{fieldErrors.email}</span>}
      </div>

      {/* Notes */}
      <div className="sf-field">
        <label className="sf-label">Notas</label>
        <textarea
          className="sf-textarea"
          placeholder="Productos que provee, condiciones, etc."
          value={form.notes}
          onChange={handleChange('notes')}
          disabled={isLoading}
          rows={3}
        />
      </div>

      {/* Active toggle */}
      <label className="sf-toggle">
        <input
          type="checkbox"
          checked={form.active}
          onChange={handleChange('active')}
          disabled={isLoading}
          className="sf-checkbox"
        />
        <span className="sf-toggle-label">Proveedor activo</span>
      </label>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button type="button" className="sf-cancel" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </button>
        <button type="submit" className="sf-submit" disabled={isLoading}>
          {isLoading
            ? <span className="sf-spinner" />
            : (isEdit ? 'Guardar cambios' : 'Crear proveedor')}
        </button>
      </div>

      <style>{`
        .sf-field { display: flex; flex-direction: column; gap: 5px; }
        .sf-label {
          font-family: var(--font-body); font-size: 0.75rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray);
        }
        .sf-err { font-size: 0.75rem; color: var(--error); font-weight: 500; }
        .sf-input, .sf-select, .sf-textarea {
          width: 100%; padding: 11px 13px;
          font-family: var(--font-body); font-size: 0.9rem;
          color: var(--espresso); background: rgba(255,255,255,0.7);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; transition: border-color var(--transition-base);
          -webkit-appearance: none; box-sizing: border-box;
        }
        .sf-select { cursor: pointer; }
        .sf-textarea { resize: vertical; }
        .sf-input:focus, .sf-select:focus, .sf-textarea:focus {
          border-color: var(--amber); background: #fff;
          box-shadow: 0 0 0 3px rgba(200,137,58,0.12);
        }
        .sf-input.err, .sf-select.err { border-color: var(--error); }

        .sf-toggle {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; font-size: 0.9rem;
        }
        .sf-checkbox { width: 18px; height: 18px; accent-color: var(--amber); cursor: pointer; }
        .sf-toggle-label { font-weight: 500; color: var(--espresso); }

        .sf-cancel {
          padding: 10px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .sf-cancel:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .sf-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
        .sf-submit {
          padding: 10px 24px; background: var(--amber); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.88rem; font-weight: 600; color: white; cursor: pointer;
          transition: all var(--transition-fast); box-shadow: var(--shadow-amber);
          display: flex; align-items: center; gap: 8px;
          min-width: 150px; justify-content: center;
        }
        .sf-submit:hover:not(:disabled) { background: var(--amber-dark); transform: translateY(-1px); }
        .sf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .sf-spinner {
          width: 17px; height: 17px; border: 2px solid white;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const dispatch = useDispatch();
  const token    = useSelector(selectToken);
  const user     = useSelector(selectUser);
  const items    = useSelector(selectSuppliers);
  const status   = useSelector(selectSuppliersStatus);
  const fetchErr = useSelector(selectSuppliersError);
  const { status: actStatus } = useSelector(selectSupplierAction);

  const [search,    setSearch]    = useState('');
  const [typeFilter,setTypeFilter]= useState('');
  const [showAll,   setShowAll]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchSuppliers({ token, params: {} })); // fetch all (active + inactive)
  }, [dispatch, token]);

  // ── Client-side filter ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = showAll ? items : items.filter((s) => s.active);
    if (typeFilter) list = list.filter((s) => s.supplierType === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contactName || '').toLowerCase().includes(q) ||
          (s.notes       || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, search, typeFilter, showAll]);

  // ── Modal handlers ──────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (s) => { setEditing(s);   setModalOpen(true); };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    dispatch(clearSupplierActionState());
  };
  const handleFormSuccess = () => {
    closeModal();
    dispatch(fetchSuppliers({ token, params: {} }));
  };

  // ── Deactivate ─────────────────────────────────────────────────────────────
  const handleDeleteConfirm = () => {
    if (!confirmId) return;
    dispatch(deleteSupplier({ token, id: confirmId })).then(() => {
      setConfirmId(null);
      dispatch(clearSupplierActionState());
    });
  };

  const confirmTarget = items.find((s) => s.id === confirmId);
  const deleting      = actStatus === 'loading' && confirmId !== null;
  const activeCount   = items.filter((s) => s.active).length;

  return (
    <div className="sup-page">
      <AppTopbar />

      <div className="sup-content">
        <SectionHeader
          title="Proveedores"
          subtitle={`${activeCount} proveedor${activeCount !== 1 ? 'es' : ''} activo${activeCount !== 1 ? 's' : ''}`}
          action={
            isOwner(user) && (
              <PrimaryBtn onClick={openCreate}>+ Nuevo proveedor</PrimaryBtn>
            )
          }
        />

        {/* ── Filters ── */}
        <FilterBar>
          <div className="sup-search-wrap">
            <span className="sup-search-icon">🔍</span>
            <input
              className="sup-search"
              placeholder="Buscar proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="sup-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <select
            className="sup-filter-sel"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="FRANCHISE">🏷 Franquicia</option>
            <option value="WHOLESALER">🏪 Mayorista</option>
            <option value="EXTERNAL">🌐 Externo</option>
          </select>

          <label className="sup-toggle-all">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Ver inactivos
          </label>
        </FilterBar>

        {/* ── Fetch error ── */}
        {fetchErr && (
          <div className="sup-error">⚠ {fetchErr}</div>
        )}

        {/* ── Loading ── */}
        {status === 'loading' && <TableSkeleton rows={6} />}

        {/* ── Empty state ── */}
        {status === 'succeeded' && filtered.length === 0 && (
          <EmptyState
            icon="🚚"
            title="No hay proveedores"
            description={
              search
                ? 'Probá con otra búsqueda.'
                : isOwner(user)
                  ? 'Creá el primer proveedor para empezar.'
                  : 'Todavía no hay proveedores cargados.'
            }
            action={
              isOwner(user) && !search && (
                <PrimaryBtn onClick={openCreate}>+ Nuevo proveedor</PrimaryBtn>
              )
            }
          />
        )}

        {/* ── List ── */}
        {status === 'succeeded' && filtered.length > 0 && (
          <div className="sup-list">
            {filtered.map((sup, i) => (
              <div
                key={sup.id}
                className={`sup-row ${!sup.active ? 'inactive' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {/* Left: avatar + info */}
                <div className="sup-row-main">
                  <div className="sup-avatar" style={{ background: colorForType(sup.supplierType) }}>
                    {sup.name[0].toUpperCase()}
                  </div>
                  <div className="sup-info">
                    <span className="sup-name">{sup.name}</span>
                    <div className="sup-meta">
                      <TypeBadge type={sup.supplierType} />
                      {sup.contactName && (
                        <span className="sup-contact">👤 {sup.contactName}</span>
                      )}
                      {sup.phone && (
                        <span className="sup-contact">📞 {sup.phone}</span>
                      )}
                    </div>
                    {sup.notes && (
                      <span className="sup-notes">{sup.notes}</span>
                    )}
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="sup-row-right">
                  <StatusBadge active={sup.active} />
                  {isOwner(user) && (
                    <div className="sup-actions">
                      <ActionBtn
                        variant="edit"
                        onClick={() => openEdit(sup)}
                        title="Editar proveedor"
                      />
                      <ActionBtn
                        variant="delete"
                        onClick={() => setConfirmId(sup.id)}
                        title={sup.active ? 'Desactivar proveedor' : 'Ya inactivo'}
                        disabled={!sup.active}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'succeeded' && filtered.length > 0 && (
          <p className="sup-count">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Create / Edit Modal — OWNER only ── */}
      {isOwner(user) && (
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editing ? `Editar: ${editing.name}` : 'Nuevo proveedor'}
          width="540px"
        >
          <SupplierForm
            supplier={editing}
            onSuccess={handleFormSuccess}
            onCancel={closeModal}
            token={token}
            dispatch={dispatch}
          />
        </Modal>
      )}

      {/* ── Deactivate confirm — OWNER only ── */}
      {isOwner(user) && (
        <ConfirmDialog
          isOpen={Boolean(confirmId)}
          onClose={() => setConfirmId(null)}
          onConfirm={handleDeleteConfirm}
          title="Desactivar proveedor"
          message={`¿Desactivar "${confirmTarget?.name}"? Los productos asociados no se verán afectados, pero el proveedor dejará de aparecer en los formularios.`}
          confirmLabel="Desactivar"
          danger
          loading={deleting}
        />
      )}

      <style>{`
        .sup-page    { min-height: 100vh; background: var(--cream); }
        .sup-content {
          max-width: 900px; margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }

        /* Search */
        .sup-search-wrap { position: relative; flex: 1; min-width: 200px; }
        .sup-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); font-size: 0.85rem; pointer-events: none;
        }
        .sup-search {
          width: 100%; padding: 9px 36px;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .sup-search:focus { border-color: var(--amber); }
        .sup-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .sup-search-clear:hover { color: var(--espresso); }

        .sup-filter-sel {
          padding: 9px 30px 9px 12px;
          font-family: var(--font-body); font-size: 0.85rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .sup-filter-sel:focus { border-color: var(--amber); }

        .sup-toggle-all {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.85rem; color: var(--warm-gray);
          cursor: pointer; white-space: nowrap;
        }
        .sup-toggle-all input { accent-color: var(--amber); }

        /* Error */
        .sup-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        /* List */
        .sup-list { display: flex; flex-direction: column; gap: 8px; }

        .sup-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; padding: 16px 18px;
          background: white; border-radius: var(--radius-lg);
          border: 1px solid var(--cream-dark); box-shadow: var(--shadow-sm);
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
        }
        .sup-row:hover { box-shadow: var(--shadow-md); border-color: rgba(200,137,58,0.2); }
        .sup-row.inactive { opacity: 0.5; }

        .sup-row-main { display: flex; gap: 14px; flex: 1; min-width: 0; }
        .sup-avatar {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 1.1rem;
          font-weight: 700; color: white;
        }
        .sup-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .sup-name { font-weight: 700; font-size: 0.95rem; color: var(--espresso); }
        .sup-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .sup-contact {
          font-size: 0.78rem; color: var(--warm-gray);
        }
        .sup-notes {
          font-size: 0.76rem; color: var(--warm-gray);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px;
          font-style: italic;
        }

        .sup-row-right {
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
          padding-top: 2px;
        }
        .sup-actions { display: flex; gap: 6px; }

        .sup-count {
          text-align: right; font-size: 0.78rem;
          color: var(--warm-gray-light); margin-top: 12px;
        }

        @media (max-width: 560px) {
          .sup-row { flex-direction: column; }
          .sup-row-right { justify-content: space-between; width: 100%; }
        }
      `}</style>
    </div>
  );
}

function colorForType(type) {
  const map = {
    FRANCHISE:  '#C8893A',
    WHOLESALER: '#1565C0',
    EXTERNAL:   '#2E7D32',
  };
  return map[type] || '#8C7B6B';
}