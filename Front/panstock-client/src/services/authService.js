// services/authService.js
// Centralizes all auth-related API calls to the PanStock backend

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    // Backend wraps errors in { ok: false, error: "message" }
    const message = data?.error || data?.message || `Error ${response.status}`;
    throw new Error(message);
  }
  
  // Some endpoints return { ok: true, data: {...} }
  // Others return the object directly
  if (data?.ok === false) {
    throw new Error(data.error || 'Error desconocido');
  }
  
  return data;
};

export const authService = {
  /**
   * POST /auth/authenticate
   * Returns: { ok: true, data: { access_token, username, email, role, firstName, lastName } }
   */
  login: async ({ username, password }) => {
    const response = await fetch(`${BASE_URL}/auth/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await handleResponse(response);
    // Backend returns { ok: true, data: { access_token, username, email, role } }
    return data.data || data;
  },

  /**
   * POST /auth/register
   * Body: { username, firstName, lastName, email, password, role }
   * Returns: { ok: true, data: { access_token, username, email, role } }
   */
  register: async ({ username, firstName, lastName, email, password, role }) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, firstName, lastName, email, password, role }),
    });
    
    const data = await handleResponse(response);
    return data.data || data;
  },

  /**
   * GET /users/data  (requires Bearer token)
   * Returns the authenticated user's profile
   */
  getProfile: async (token) => {
    const response = await fetch(`${BASE_URL}/users/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await handleResponse(response);
    return data.data || data;
  },
};
