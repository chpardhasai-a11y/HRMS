const API_BASE_URL = process.env.NEXT_PUBLIC_HRMS_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'hrms_token';
const USER_KEY = 'hrms_user';
const COMPANY_KEY = 'hrms_active_company_id';

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
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error('Invalid email or password');
  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  localStorage.setItem(COMPANY_KEY, data.user.companyId);
  return data;
}

export function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(COMPANY_KEY);
}

export function getStoredUser() {
  const value = localStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
}

export function hasSession() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

async function token() {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (!existing) {
    redirectToLogin();
    throw new Error('Please login to continue.');
  }
  return existing;
}

export async function apiRequest(path, options = {}) {
  const accessToken = await token();
  const activeCompanyId = localStorage.getItem(COMPANY_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(activeCompanyId ? { 'X-Company-Id': activeCompanyId } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    redirectToLogin();
    throw new Error('Your session expired. Please login again.');
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HRMS API request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function getEmployees() {
  return apiRequest('/employees');
}

export function getActiveCompanyId() {
  return localStorage.getItem(COMPANY_KEY);
}

export function setActiveCompanyId(companyId) {
  localStorage.setItem(COMPANY_KEY, companyId);
  window.dispatchEvent(new CustomEvent('hrms-company-change', { detail: { companyId } }));
}

export function getCompanies() {
  return apiRequest('/companies');
}

export function getCurrentCompany() {
  return apiRequest('/companies/current');
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
  return fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, audience })
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to request password reset.');
    return data;
  });
}

export function resetPassword(tokenValue, password) {
  return fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenValue, password })
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to reset password.');
    return data;
  });
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.includes('login') || path.includes('password')) return;
  window.location.href = path.startsWith('/admin') ? '/admin/login' : '/login';
}
