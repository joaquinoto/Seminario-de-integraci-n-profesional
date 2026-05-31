import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createProduct,
  updateProduct,
  clearProductActionState,
  selectProductAction,
} from '../../features/catalog/productsSlice';
import { selectToken } from '../../features/auth/authSlice';
import { selectActiveCategories } from '../../features/catalog/categoriesSlice';
import { selectActiveSuppliers }  from '../../features/catalog/suppliersSlice';
import { Alert } from '../ui/FormField';

// ─── Enum constants — must match backend Java enums exactly ──────────────────

const ORIGINS    = ['FRANCHISE', 'EXTERNAL'];
const UNIT_TYPES = ['UNIT', 'KG', 'GRAM', 'TRAY', 'BAG', 'LITER', 'PACK'];

const ORIGIN_LABELS = {
  FRANCHISE: '🏷 Franquicia',
  EXTERNAL:  '🌐 Externo',
};

const UNIT_LABELS = {
  UNIT:  'Unidad',
  KG:    'Kilogramo',
  GRAM:  'Gramo',
  TRAY:  'Bandeja',
  BAG:   'Bolsa',
  LITER: 'Litro',
  PACK:  'Pack',
};

const EMPTY = {
  name: '', description: '',
  categoryId: '', defaultSupplierId: '',
  origin: 'FRANCHISE', perishable: true,
  unitType: 'UNIT',
  costPrice: '', salePrice: '', minimumStock: '',
  active: true,
};

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div className="pf-field">
      {label && <label className="pf-label">{label}</label>}
      {children}
      {error && <span className="pf-error">{error}</span>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductForm({ product = null, onSuccess, onCancel }) {
  const dispatch          = useDispatch();
  const token             = useSelector(selectToken);
  const categories        = useSelector(selectActiveCategories);
  const suppliers         = useSelector(selectActiveSuppliers);
  const { status, error } = useSelector(selectProductAction);
  const isEdit            = Boolean(product);

  const [form, setForm]      = useState(EMPTY);
  const [fieldErrors, setFE] = useState({});

  // ── Populate on edit ────────────────────────────────────────────────────────
  useEffect(() => {
    if (product) {
      setForm({
        name:              product.name              || '',
        description:       product.description       || '',
        categoryId:        product.categoryId        ?? '',
        defaultSupplierId: product.defaultSupplierId ?? '',
        origin:            product.origin            || 'FRANCHISE',
        perishable:        product.perishable !== undefined ? product.perishable : true,
        unitType:          product.unitType          || 'UNIT',
        costPrice:         product.costPrice         ?? '',
        salePrice:         product.salePrice         ?? '',
        minimumStock:      product.minimumStock      ?? '',
        active:            product.active !== undefined ? product.active : true,
      });
    } else {
      setForm(EMPTY);
    }
    setFE({});
    dispatch(clearProductActionState());
  }, [product, dispatch]);

  // ── Auto-close on success ───────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'succeeded') {
      dispatch(clearProductActionState());
      onSuccess?.();
    }
  }, [status, dispatch, onSuccess]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name       = 'El nombre es obligatorio';
    if (!form.categoryId)   e.categoryId = 'La categoría es obligatoria';
    if (!form.origin)       e.origin     = 'El origen es obligatorio';
    if (!form.unitType)     e.unitType   = 'La unidad es obligatoria';
    const checkNum = (field) => {
      const v = form[field];
      if (v !== '' && (isNaN(Number(v)) || Number(v) < 0))
        e[field] = 'Debe ser un número positivo';
    };
    checkNum('costPrice');
    checkNum('salePrice');
    checkNum('minimumStock');
    return e;
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
    if (fieldErrors[field]) setFE((p) => ({ ...p, [field]: undefined }));
  };

  const toNum = (v) =>
    v === '' || v === null || v === undefined ? null : Number(v);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    const payload = {
      name:              form.name.trim(),
      description:       form.description.trim() || null,
      categoryId:        Number(form.categoryId),
      defaultSupplierId: form.defaultSupplierId ? Number(form.defaultSupplierId) : null,
      origin:            form.origin,
      perishable:        form.perishable,
      unitType:          form.unitType,
      costPrice:         toNum(form.costPrice),
      salePrice:         toNum(form.salePrice),
      minimumStock:      toNum(form.minimumStock),
      active:            form.active,
    };

    if (isEdit) {
      dispatch(updateProduct({ token, id: product.id, data: payload }));
    } else {
      dispatch(createProduct({ token, data: payload }));
    }
  };

  const isLoading = status === 'loading';

  return (
    <form onSubmit={handleSubmit} noValidate className="pf-form">
      {error && <Alert type="error">{error}</Alert>}

      {/* Row 1: Name + Category */}
      <div className="pf-grid-2">
        <Field label="Nombre *" error={fieldErrors.name}>
          <input
            className={`pf-input ${fieldErrors.name ? 'err' : ''}`}
            type="text"
            placeholder="Ej: Medialunas de manteca"
            value={form.name}
            onChange={handleChange('name')}
            disabled={isLoading}
            autoFocus
          />
        </Field>

        <Field label="Categoría *" error={fieldErrors.categoryId}>
          <select
            className={`pf-select ${fieldErrors.categoryId ? 'err' : ''}`}
            value={form.categoryId}
            onChange={handleChange('categoryId')}
            disabled={isLoading}
          >
            <option value="">— Seleccionar —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Description */}
      <Field label="Descripción">
        <textarea
          className="pf-textarea"
          placeholder="Descripción opcional..."
          value={form.description}
          onChange={handleChange('description')}
          disabled={isLoading}
          rows={2}
        />
      </Field>

      {/* Row 2: Origin + Unit + Supplier */}
      <div className="pf-grid-3">
        <Field label="Origen *" error={fieldErrors.origin}>
          <select
            className={`pf-select ${fieldErrors.origin ? 'err' : ''}`}
            value={form.origin}
            onChange={handleChange('origin')}
            disabled={isLoading}
          >
            {ORIGINS.map((o) => (
              <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>
            ))}
          </select>
        </Field>

        <Field label="Unidad *" error={fieldErrors.unitType}>
          <select
            className={`pf-select ${fieldErrors.unitType ? 'err' : ''}`}
            value={form.unitType}
            onChange={handleChange('unitType')}
            disabled={isLoading}
          >
            {UNIT_TYPES.map((u) => (
              <option key={u} value={u}>{UNIT_LABELS[u]}</option>
            ))}
          </select>
        </Field>

        <Field label="Proveedor por defecto">
          <select
            className="pf-select"
            value={form.defaultSupplierId}
            onChange={handleChange('defaultSupplierId')}
            disabled={isLoading}
          >
            <option value="">— Ninguno —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Row 3: Prices + Stock */}
      <div className="pf-grid-3">
        <Field label="Costo unitario ($)" error={fieldErrors.costPrice}>
          <input
            className={`pf-input ${fieldErrors.costPrice ? 'err' : ''}`}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={form.costPrice}
            onChange={handleChange('costPrice')}
            disabled={isLoading}
          />
        </Field>

        <Field label="Precio de venta ($)" error={fieldErrors.salePrice}>
          <input
            className={`pf-input ${fieldErrors.salePrice ? 'err' : ''}`}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={form.salePrice}
            onChange={handleChange('salePrice')}
            disabled={isLoading}
          />
        </Field>

        <Field label="Stock mínimo" error={fieldErrors.minimumStock}>
          <input
            className={`pf-input ${fieldErrors.minimumStock ? 'err' : ''}`}
            type="number" min="0" step="0.001" placeholder="0"
            value={form.minimumStock}
            onChange={handleChange('minimumStock')}
            disabled={isLoading}
          />
        </Field>
      </div>

      {/* Toggles */}
      <div className="pf-toggles">
        <label className="pf-toggle-row">
          <input
            type="checkbox" className="pf-checkbox"
            checked={form.perishable}
            onChange={handleChange('perishable')}
            disabled={isLoading}
          />
          <div>
            <span className="pf-toggle-title">⏰ Perecedero</span>
            <span className="pf-toggle-hint">Requiere fecha de vencimiento al ingresar stock</span>
          </div>
        </label>

        <label className="pf-toggle-row">
          <input
            type="checkbox" className="pf-checkbox"
            checked={form.active}
            onChange={handleChange('active')}
            disabled={isLoading}
          />
          <div>
            <span className="pf-toggle-title">✅ Activo</span>
            <span className="pf-toggle-hint">El producto aparece en listados y operaciones</span>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="pf-actions">
        <button
          type="button"
          className="pf-cancel"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button type="submit" className="pf-submit" disabled={isLoading}>
          {isLoading
            ? <span className="pf-spinner" />
            : (isEdit ? 'Guardar cambios' : 'Crear producto')}
        </button>
      </div>

      <style>{`
        .pf-form   { display: flex; flex-direction: column; gap: 16px; }
        .pf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        .pf-field { display: flex; flex-direction: column; gap: 5px; }
        .pf-label {
          font-family: var(--font-body); font-size: 0.75rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray);
        }
        .pf-error { font-size: 0.75rem; color: var(--error); font-weight: 500; }

        .pf-input, .pf-select, .pf-textarea {
          width: 100%; padding: 11px 13px;
          font-family: var(--font-body); font-size: 0.9rem;
          color: var(--espresso); background: rgba(255,255,255,0.7);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; transition: border-color var(--transition-base);
          -webkit-appearance: none; box-sizing: border-box;
        }
        .pf-select  { padding-right: 32px; cursor: pointer; }
        .pf-textarea { resize: vertical; }
        .pf-input:focus, .pf-select:focus, .pf-textarea:focus {
          border-color: var(--amber); background: #fff;
          box-shadow: 0 0 0 3px rgba(200,137,58,0.12);
        }
        .pf-input.err, .pf-select.err { border-color: var(--error); }

        .pf-toggles { display: flex; gap: 12px; flex-wrap: wrap; }
        .pf-toggle-row {
          flex: 1; min-width: 200px;
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px; border-radius: var(--radius-md);
          background: var(--cream); border: 1.5px solid var(--cream-dark);
          cursor: pointer; transition: border-color var(--transition-fast);
        }
        .pf-toggle-row:has(.pf-checkbox:checked) {
          border-color: var(--amber); background: rgba(200,137,58,0.05);
        }
        .pf-checkbox {
          width: 18px; height: 18px; accent-color: var(--amber);
          margin-top: 2px; cursor: pointer; flex-shrink: 0;
        }
        .pf-toggle-title {
          display: block; font-weight: 600; font-size: 0.88rem; color: var(--espresso);
        }
        .pf-toggle-hint {
          display: block; font-size: 0.75rem; color: var(--warm-gray);
          line-height: 1.4; margin-top: 2px;
        }

        .pf-actions {
          display: flex; gap: 10px; justify-content: flex-end;
          padding-top: 8px; border-top: 1px solid var(--cream-dark); margin-top: 4px;
        }
        .pf-cancel {
          padding: 11px 22px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .pf-cancel:hover    { border-color: var(--warm-gray); color: var(--espresso); }
        .pf-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
        .pf-submit {
          padding: 11px 24px; background: var(--amber); color: white;
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
          box-shadow: var(--shadow-amber);
          display: flex; align-items: center; gap: 8px;
          min-width: 150px; justify-content: center;
        }
        .pf-submit:hover:not(:disabled) { background: var(--amber-dark); transform: translateY(-1px); }
        .pf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .pf-spinner {
          width: 17px; height: 17px; border: 2px solid white;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @media (max-width: 560px) {
          .pf-grid-2, .pf-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </form>
  );
}
