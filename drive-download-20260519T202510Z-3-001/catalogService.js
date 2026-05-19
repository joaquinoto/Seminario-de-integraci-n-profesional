const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Error ${res.status}`);
  }
  return data;
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoryService = {
  getAll: (token, activeOnly = false) =>
    fetch(`${BASE_URL}/api/categories${activeOnly ? '?activeOnly=true' : ''}`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  getById: (token, id) =>
    fetch(`${BASE_URL}/api/categories/${id}`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  create: (token, body) =>
    fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  update: (token, id, body) =>
    fetch(`${BASE_URL}/api/categories/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  delete: (token, id) =>
    fetch(`${BASE_URL}/api/categories/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const productService = {
  getAll: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.activeOnly !== undefined) q.set('activeOnly', params.activeOnly);
    if (params.origin) q.set('origin', params.origin);
    if (params.categoryId) q.set('categoryId', params.categoryId);
    const qs = q.toString();
    return fetch(`${BASE_URL}/api/products${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(token),
    }).then(handleResponse);
  },

  getById: (token, id) =>
    fetch(`${BASE_URL}/api/products/${id}`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  create: (token, body) =>
    fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  update: (token, id, body) =>
    fetch(`${BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  delete: (token, id) =>
    fetch(`${BASE_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const supplierService = {
  getAll: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.activeOnly !== undefined) q.set('activeOnly', params.activeOnly);
    if (params.supplierType) q.set('supplierType', params.supplierType);
    const qs = q.toString();
    return fetch(`${BASE_URL}/api/suppliers${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(token),
    }).then(handleResponse);
  },

  getById: (token, id) =>
    fetch(`${BASE_URL}/api/suppliers/${id}`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  create: (token, body) =>
    fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  update: (token, id, body) =>
    fetch(`${BASE_URL}/api/suppliers/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  delete: (token, id) =>
    fetch(`${BASE_URL}/api/suppliers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),
};
