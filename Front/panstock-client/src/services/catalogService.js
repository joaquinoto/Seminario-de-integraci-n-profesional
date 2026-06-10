//const BASE_URL = import.meta.env.VITE_API_URL;
const BASE_URL = import.meta.env.MODE === 'development' 
  ? '' 
  : import.meta.env.VITE_API_URL;


// ─── Helpers ──────────────────────────────────────────────────────────────────

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/**
 * Unified response handler.
 * - 204 No Content → null
 * - Non-OK → throws with backend message
 * - Backend may wrap in { ok, data } OR return plain object
 */
const handleResponse = async (res) => {
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Backend error format: { status, message, timestamp }  OR  { ok, error }
    const msg = data?.message || data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }

  // Some auth endpoints wrap in { ok: true, data: {...} }
  // Catalog endpoints return plain arrays/objects
  if (data && typeof data === 'object' && 'ok' in data) {
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    return data.data ?? data;
  }

  return data;
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoryService = {
  /**
   * GET /api/categories  (authenticated — OWNER + EMPLOYEE can read)
   * GET /api/categories?activeOnly=true
   */
  getAll: (token, activeOnly = false) => {
    const qs = activeOnly ? '?activeOnly=true' : '';
    return fetch(`${BASE_URL}/api/categories${qs}`, {
      headers: authHeaders(token),
    }).then(handleResponse);
  },

  getById: (token, id) =>
    fetch(`${BASE_URL}/api/categories/${id}`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  /** POST /api/categories — OWNER only */
  create: (token, body) =>
    fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /** PUT /api/categories/{id} — OWNER only */
  update: (token, id, body) =>
    fetch(`${BASE_URL}/api/categories/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /** DELETE /api/categories/{id} — OWNER only (sets active=false) */
  delete: (token, id) =>
    fetch(`${BASE_URL}/api/categories/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const productService = {
  /**
   * GET /api/products  (GET is public per SecurityConfig)
   * Supports: ?activeOnly=true|false  ?origin=FRANCHISE|EXTERNAL  ?categoryId=N
   */
  getAll: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.activeOnly !== undefined) q.set('activeOnly', String(params.activeOnly));
    if (params.origin)     q.set('origin',     params.origin);
    if (params.categoryId) q.set('categoryId', String(params.categoryId));
    const qs = q.toString();
    return fetch(`${BASE_URL}/api/products${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(token),
    }).then(handleResponse);
  },

  getById: (token, id) =>
    fetch(`${BASE_URL}/api/products/${id}`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  /** POST /api/products — OWNER only */
  create: (token, body) =>
    fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /** PUT /api/products/{id} — OWNER only */
  update: (token, id, body) =>
    fetch(`${BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /** DELETE /api/products/{id} — OWNER only (sets active=false) */
  delete: (token, id) =>
    fetch(`${BASE_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const supplierService = {
  /**
   * GET /api/suppliers  (authenticated — any role)
   * Supports: ?activeOnly=true  ?supplierType=FRANCHISE|WHOLESALER|EXTERNAL
   */
  getAll: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.activeOnly !== undefined) q.set('activeOnly', String(params.activeOnly));
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

  /** POST /api/suppliers — OWNER only */
  create: (token, body) =>
    fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /** PUT /api/suppliers/{id} — OWNER only */
  update: (token, id, body) =>
    fetch(`${BASE_URL}/api/suppliers/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /** DELETE /api/suppliers/{id} — OWNER only */
  delete: (token, id) =>
    fetch(`${BASE_URL}/api/suppliers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),
};