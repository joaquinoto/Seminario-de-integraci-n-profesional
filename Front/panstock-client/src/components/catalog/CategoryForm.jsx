import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createCategory,
  updateCategory,
  clearCategoryActionState,
  selectCategoryAction,
} from '../../features/catalog/categoriesSlice';
import { selectToken } from '../../features/auth/authSlice';
import { Input, Button, Alert } from '../ui/FormField';

const EMPTY = { name: '', description: '', active: true };

export default function CategoryForm({ category = null, onSuccess, onCancel }) {
  const dispatch      = useDispatch();
  const token         = useSelector(selectToken);
  const { status, error } = useSelector(selectCategoryAction);
  const isEdit        = Boolean(category);

  const [form, setForm]         = useState(EMPTY);
  const [fieldErrors, setFE]    = useState({});

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        description: category.description || '',
        active: category.active !== undefined ? category.active : true,
      });
    } else {
      setForm(EMPTY);
    }
    setFE({});
    dispatch(clearCategoryActionState());
  }, [category, dispatch]);

  // Close on success
  useEffect(() => {
    if (status === 'succeeded') {
      dispatch(clearCategoryActionState());
      onSuccess?.();
    }
  }, [status, dispatch, onSuccess]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    else if (form.name.trim().length > 100) e.name = 'Máximo 100 caracteres';
    if (form.description && form.description.length > 255) e.description = 'Máximo 255 caracteres';
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
      name: form.name.trim(),
      description: form.description.trim() || null,
      active: form.active,
    };
    if (isEdit) {
      dispatch(updateCategory({ token, id: category.id, data: payload }));
    } else {
      dispatch(createCategory({ token, data: payload }));
    }
  };

  const isLoading = status === 'loading';

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error">{error}</Alert>}

      <Input
        label="Nombre de la categoría *"
        type="text"
        placeholder="Ej: Panadería, Bebidas..."
        value={form.name}
        onChange={handleChange('name')}
        error={fieldErrors.name}
        disabled={isLoading}
        autoFocus
      />

      <div className="field-wrapper">
        <label className="field-label">Descripción</label>
        <textarea
          className={`cf-textarea ${fieldErrors.description ? 'has-error' : ''}`}
          placeholder="Descripción opcional..."
          value={form.description}
          onChange={handleChange('description')}
          disabled={isLoading}
          rows={3}
        />
        {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
      </div>

      <label className="cf-checkbox-row">
        <input
          type="checkbox"
          checked={form.active}
          onChange={handleChange('active')}
          disabled={isLoading}
          className="cf-checkbox"
        />
        <span className="cf-checkbox-label">Categoría activa</span>
      </label>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button type="button" className="cf-cancel-btn" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </button>
        <Button type="submit" variant="amber" loading={isLoading}>
          {isEdit ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>

      <style>{`
        .field-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-family: var(--font-body); font-size: 0.78rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray);
        }
        .field-error { font-size: 0.78rem; color: var(--error); font-weight: 500; }
        .cf-textarea {
          width: 100%; padding: 12px 14px;
          font-family: var(--font-body); font-size: 0.92rem;
          color: var(--espresso); background: rgba(255,255,255,0.7);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          outline: none; resize: vertical; transition: border-color var(--transition-base);
        }
        .cf-textarea:focus { border-color: var(--amber); background: #fff; box-shadow: 0 0 0 3px rgba(200,137,58,0.12); }
        .cf-textarea.has-error { border-color: var(--error); }
        .cf-checkbox-row {
          display: flex; align-items: center; gap: 10px; cursor: pointer;
          font-size: 0.9rem; color: var(--espresso);
        }
        .cf-checkbox {
          width: 18px; height: 18px; accent-color: var(--amber); cursor: pointer;
        }
        .cf-checkbox-label { font-weight: 500; }
        .cf-cancel-btn {
          padding: 10px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .cf-cancel-btn:hover { border-color: var(--warm-gray); color: var(--espresso); }
        .cf-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </form>
  );
}