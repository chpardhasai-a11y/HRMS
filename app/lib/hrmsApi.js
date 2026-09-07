const API_BASE_URL = process.env.NEXT_PUBLIC_HRMS_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'hrms_token';
const USER_KEY = 'hrms_user';
const COMPANY_KEY = 'hrms_active_company_id';

function storage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function statusLabel(status) {
  return status === 'OnLeave' ? 'On Leave' : status;
}

export function statusValue(label) {
  return label === 'On Leave' ? 'OnLeave' : label;
}

export function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export async function loginUser(email, password) {
  const response = await request(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error(await responseMessage(response, 'Invalid email or password'));
  const data = await parseJson(response, {});
  storage()?.setItem(TOKEN_KEY, data.accessToken);
  storage()?.setItem(USER_KEY, JSON.stringify(data.user));
  storage()?.setItem(COMPANY_KEY, data.user.companyId);
  return data;
}

export function logoutUser() {
  storage()?.removeItem(TOKEN_KEY);
  storage()?.removeItem(USER_KEY);
  storage()?.removeItem(COMPANY_KEY);
}

export function getStoredUser() {
  const value = storage()?.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    logoutUser();
    return null;
  }
}

export function hasSession() {
  return Boolean(storage()?.getItem(TOKEN_KEY));
}

async function token() {
  const existing = storage()?.getItem(TOKEN_KEY);
  if (!existing) {
    redirectToLogin();
    throw new Error('Please login to continue.');
  }
  return existing;
}

export async function apiRequest(path, options = {}) {
  const accessToken = await token();
  const response = await request(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    storage()?.removeItem(TOKEN_KEY);
    storage()?.removeItem(USER_KEY);
    redirectToLogin();
    throw new Error('Your session expired. Please login again.');
  }

  if (!response.ok) {
    throw new Error(await responseMessage(response, `HRMS API request failed: ${response.status}`));
  }

  if (response.status === 204) return null;
  return parseJson(response, null);
}

export function getEmployees(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return apiRequest(`/employees${query ? `?${query}` : ''}`);
}

export function getActiveCompanyId() {
  return storage()?.getItem(COMPANY_KEY) || null;
}

export function setActiveCompanyId(companyId) {
  storage()?.setItem(COMPANY_KEY, companyId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hrms-company-change', { detail: { companyId } }));
  }
}

export function getCompanies() {
  return apiRequest('/companies');
}

export function getCurrentCompany() {
  return apiRequest('/companies/current');
}

export function getPlatformHealth() {
  return request(`${API_BASE_URL}/health`).then(async (response) => {
    const data = await parseJson(response, {});
    if (!response.ok) throw new Error(data.message || 'Unable to load platform health.');
    return data;
  });
}

export function createCompany(payload) {
  return apiRequest('/companies', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getEmployee(code) {
  return apiRequest(`/employees/${code}`);
}

export function createEmployee(payload) {
  return apiRequest('/employees', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateEmployee(code, updates) {
  return apiRequest(`/employees/${code}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export function updateEmployeeStatus(code, status) {
  return apiRequest(`/employees/${code}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: statusValue(status) })
  });
}

export function updateEmployeeManager(code, manager) {
  return apiRequest(`/employees/${code}/manager`, {
    method: 'PATCH',
    body: JSON.stringify({ manager })
  });
}

export function transferEmployee(code, payload) {
  return apiRequest(`/employees/${code}/transfer`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function recordDocumentNote(code, payload) {
  return apiRequest(`/employees/${code}/documents`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function getEmployeeAudit(code) {
  return apiRequest(`/employees/${code}/audit`);
}

export function forgotPassword(email, audience = 'employee') {
  return request(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, audience })
  }).then(async (response) => {
    const data = await parseJson(response, {});
    if (!response.ok) throw new Error(data.message || 'Unable to request password reset.');
    return data;
  });
}

export function resetPassword(tokenValue, password) {
  return request(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenValue, password })
  }).then(async (response) => {
    const data = await parseJson(response, {});
    if (!response.ok) throw new Error(data.message || 'Unable to reset password.');
    return data;
  });
}

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Unable to reach the HRMS server. Please check that the backend is running.');
  }
}

async function parseJson(response, fallback) {
  const body = await response.text();
  if (!body) return fallback;
  try {
    return JSON.parse(body);
  } catch {
    return fallback;
  }
}

async function responseMessage(response, fallback) {
  const body = await response.text();
  if (!body) return fallback;
  try {
    const data = JSON.parse(body);
    return Array.isArray(data.message) ? data.message.join(', ') : data.message || fallback;
  } catch {
    return body || fallback;
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.includes('login') || path.includes('password')) return;
  if (path.startsWith('/platform-admin')) {
    window.location.href = '/platform-admin/login';
    return;
  }
  if (path.startsWith('/org-admin') || path.startsWith('/admin')) {
    window.location.href = '/org-admin/login';
    return;
  }
  window.location.href = '/login';
}
