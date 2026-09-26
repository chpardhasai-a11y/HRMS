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

export async function loginUser(email, password, companySlug = null) {
  const payload = { email, password };
  if (companySlug) payload.companySlug = companySlug;
  const response = await request(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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

export function getCompanyById(id) {
  return apiRequest(`/companies/${id}`);
}

export function getPublicCompanyInfo(slug) {
  return request(`${API_BASE_URL}/companies/public/${encodeURIComponent(slug)}`).then(async (response) => {
    const data = await parseJson(response, null);
    if (!response.ok) throw new Error(data?.message || 'Organization not found.');
    return data;
  });
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

export function updateCompany(id, payload) {
  return apiRequest(`/companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deleteCompany(id) {
  return apiRequest(`/companies/${id}`, {
    method: 'DELETE'
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

export function resendEmployeeInvite(code) {
  return apiRequest(`/employees/${code}/resend-invite`, {
    method: 'POST'
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

export function getOnboardingQueue() {
  return apiRequest('/employees/onboarding/queue');
}

export function updateOnboardingStage(code, payload) {
  return apiRequest(`/employees/${code}/onboarding`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
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

export function verifyInvite(email, otpOrTempPassword, companyId = null) {
  const payload = { email, otpOrTempPassword };
  if (companyId) payload.companyId = companyId;
  return request(`${API_BASE_URL}/auth/verify-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(async (response) => {
    const data = await parseJson(response, {});
    if (!response.ok) throw new Error(data.message || 'Verification failed.');
    return data;
  });
}

export function setupEmployeeAccount(payload) {
  return request(`${API_BASE_URL}/auth/setup-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(async (response) => {
    const data = await parseJson(response, {});
    if (!response.ok) throw new Error(data.message || 'Account setup failed.');
    if (data.accessToken && data.user) {
      storage()?.setItem(TOKEN_KEY, data.accessToken);
      storage()?.setItem(USER_KEY, JSON.stringify(data.user));
      storage()?.setItem(COMPANY_KEY, data.user.companyId);
    }
    return data;
  });
}

export function getIndustries() {
  return request(`${API_BASE_URL}/industries`).then(async (response) => {
    const data = await parseJson(response, []);
    if (!response.ok) throw new Error('Unable to load industries list.');
    return data;
  });
}

export function getAdminIndustries(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return apiRequest(`/industries/admin${query ? `?${query}` : ''}`);
}

export function createIndustry(payload) {
  return apiRequest('/industries', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateIndustry(id, payload) {
  return apiRequest(`/industries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleIndustryStatus(id) {
  return apiRequest(`/industries/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteIndustry(id) {
  return apiRequest(`/industries/${id}`, {
    method: 'DELETE'
  });
}

// Countries API Helpers
export function getCountries() {
  return request(`${API_BASE_URL}/countries`).then(async (response) => {
    const data = await parseJson(response, []);
    if (!response.ok) throw new Error('Unable to load countries list.');
    return data;
  });
}

export function getAdminCountries(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return apiRequest(`/countries/admin${query ? `?${query}` : ''}`);
}

export function createCountry(payload) {
  return apiRequest('/countries', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCountry(id, payload) {
  return apiRequest(`/countries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleCountryStatus(id) {
  return apiRequest(`/countries/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteCountry(id) {
  return apiRequest(`/countries/${id}`, {
    method: 'DELETE'
  });
}

// Currencies API Helpers
export function getCurrencies() {
  return request(`${API_BASE_URL}/currencies`).then(async (response) => {
    const data = await parseJson(response, []);
    if (!response.ok) throw new Error('Unable to load currencies list.');
    return data;
  });
}

export function getAdminCurrencies(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return apiRequest(`/currencies/admin${query ? `?${query}` : ''}`);
}

export function createCurrency(payload) {
  return apiRequest('/currencies', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCurrency(id, payload) {
  return apiRequest(`/currencies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleCurrencyStatus(id) {
  return apiRequest(`/currencies/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteCurrency(id) {
  return apiRequest(`/currencies/${id}`, {
    method: 'DELETE'
  });
}

// Time Zones API Helpers
export function getTimeZones() {
  return request(`${API_BASE_URL}/time-zones`).then(async (response) => {
    const data = await parseJson(response, []);
    if (!response.ok) throw new Error('Unable to load time zones list.');
    return data;
  });
}

export function getAdminTimeZones(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return apiRequest(`/time-zones/admin${query ? `?${query}` : ''}`);
}

export function createTimeZone(payload) {
  return apiRequest('/time-zones', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateTimeZone(id, payload) {
  return apiRequest(`/time-zones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleTimeZoneStatus(id) {
  return apiRequest(`/time-zones/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteTimeZone(id) {
  return apiRequest(`/time-zones/${id}`, {
    method: 'DELETE'
  });
}

// ---------------------------------------------------------------------------
// ORGANIZATION MASTERS (Org Admin)
// ---------------------------------------------------------------------------

// Legal Entities
export function getLegalEntities(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/legal-entities?${params.toString()}`);
}

export function createLegalEntity(payload) {
  return apiRequest('/org-masters/legal-entities', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateLegalEntity(id, payload) {
  return apiRequest(`/org-masters/legal-entities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleLegalEntityStatus(id) {
  return apiRequest(`/org-masters/legal-entities/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteLegalEntity(id) {
  return apiRequest(`/org-masters/legal-entities/${id}`, {
    method: 'DELETE'
  });
}

// Business Units
export function getBusinessUnits(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/business-units?${params.toString()}`);
}

export function createBusinessUnit(payload) {
  return apiRequest('/org-masters/business-units', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateBusinessUnit(id, payload) {
  return apiRequest(`/org-masters/business-units/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleBusinessUnitStatus(id) {
  return apiRequest(`/org-masters/business-units/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteBusinessUnit(id) {
  return apiRequest(`/org-masters/business-units/${id}`, {
    method: 'DELETE'
  });
}

// Departments
export function getOrgDepartments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/departments?${params.toString()}`);
}

export function createOrgDepartment(payload) {
  return apiRequest('/org-masters/departments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateOrgDepartment(id, payload) {
  return apiRequest(`/org-masters/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleOrgDepartmentStatus(id) {
  return apiRequest(`/org-masters/departments/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteOrgDepartment(id) {
  return apiRequest(`/org-masters/departments/${id}`, {
    method: 'DELETE'
  });
}

// Teams
export function getTeams(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/teams?${params.toString()}`);
}

export function createTeam(payload) {
  return apiRequest('/org-masters/teams', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateTeam(id, payload) {
  return apiRequest(`/org-masters/teams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleTeamStatus(id) {
  return apiRequest(`/org-masters/teams/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteTeam(id) {
  return apiRequest(`/org-masters/teams/${id}`, {
    method: 'DELETE'
  });
}

// Locations
export function getOrgLocations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/locations?${params.toString()}`);
}

export function createOrgLocation(payload) {
  return apiRequest('/org-masters/locations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateOrgLocation(id, payload) {
  return apiRequest(`/org-masters/locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleOrgLocationStatus(id) {
  return apiRequest(`/org-masters/locations/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteOrgLocation(id) {
  return apiRequest(`/org-masters/locations/${id}`, {
    method: 'DELETE'
  });
}

// Cost Centers
export function getCostCenters(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/cost-centers?${params.toString()}`);
}

export function createCostCenter(payload) {
  return apiRequest('/org-masters/cost-centers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCostCenter(id, payload) {
  return apiRequest(`/org-masters/cost-centers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleCostCenterStatus(id) {
  return apiRequest(`/org-masters/cost-centers/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteCostCenter(id) {
  return apiRequest(`/org-masters/cost-centers/${id}`, {
    method: 'DELETE'
  });
}

// Job Families
export function getJobFamilies(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/job-families?${params.toString()}`);
}

export function createJobFamily(payload) {
  return apiRequest('/org-masters/job-families', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateJobFamily(id, payload) {
  return apiRequest(`/org-masters/job-families/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleJobFamilyStatus(id) {
  return apiRequest(`/org-masters/job-families/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteJobFamily(id) {
  return apiRequest(`/org-masters/job-families/${id}`, {
    method: 'DELETE'
  });
}

// Grade Bands
export function getGradeBands(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/grade-bands?${params.toString()}`);
}

export function createGradeBand(payload) {
  return apiRequest('/org-masters/grade-bands', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateGradeBand(id, payload) {
  return apiRequest(`/org-masters/grade-bands/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleGradeBandStatus(id) {
  return apiRequest(`/org-masters/grade-bands/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteGradeBand(id) {
  return apiRequest(`/org-masters/grade-bands/${id}`, {
    method: 'DELETE'
  });
}

// Job Titles / Designations
export function getJobTitles(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/job-titles?${params.toString()}`);
}

export function createJobTitle(payload) {
  return apiRequest('/org-masters/job-titles', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateJobTitle(id, payload) {
  return apiRequest(`/org-masters/job-titles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleJobTitleStatus(id) {
  return apiRequest(`/org-masters/job-titles/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteJobTitle(id) {
  return apiRequest(`/org-masters/job-titles/${id}`, {
    method: 'DELETE'
  });
}

// Pay Components
export function getPayComponents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  return apiRequest(`/org-masters/pay-components?${params.toString()}`);
}

export function createPayComponent(payload) {
  return apiRequest('/org-masters/pay-components', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updatePayComponent(id, payload) {
  return apiRequest(`/org-masters/pay-components/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function togglePayComponentStatus(id) {
  return apiRequest(`/org-masters/pay-components/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deletePayComponent(id) {
  return apiRequest(`/org-masters/pay-components/${id}`, {
    method: 'DELETE'
  });
}

// Employment Types
export function getEmploymentTypes(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/employment-types?${params.toString()}`);
}

export function createEmploymentType(payload) {
  return apiRequest('/org-masters/employment-types', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateEmploymentType(id, payload) {
  return apiRequest(`/org-masters/employment-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleEmploymentTypeStatus(id) {
  return apiRequest(`/org-masters/employment-types/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteEmploymentType(id) {
  return apiRequest(`/org-masters/employment-types/${id}`, {
    method: 'DELETE'
  });
}

// Work Modes
export function getWorkModes(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/work-modes?${params.toString()}`);
}

export function createWorkMode(payload) {
  return apiRequest('/org-masters/work-modes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateWorkMode(id, payload) {
  return apiRequest(`/org-masters/work-modes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleWorkModeStatus(id) {
  return apiRequest(`/org-masters/work-modes/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteWorkMode(id) {
  return apiRequest(`/org-masters/work-modes/${id}`, {
    method: 'DELETE'
  });
}

// Work Shifts
export function getWorkShifts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return apiRequest(`/org-masters/work-shifts?${params.toString()}`);
}

export function createWorkShift(payload) {
  return apiRequest('/org-masters/work-shifts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateWorkShift(id, payload) {
  return apiRequest(`/org-masters/work-shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleWorkShiftStatus(id) {
  return apiRequest(`/org-masters/work-shifts/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteWorkShift(id) {
  return apiRequest(`/org-masters/work-shifts/${id}`, {
    method: 'DELETE'
  });
}

// Holiday Calendars
export function getHolidayCalendars(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  return apiRequest(`/org-masters/holiday-calendars?${params.toString()}`);
}

export function createHolidayCalendar(payload) {
  return apiRequest('/org-masters/holiday-calendars', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateHolidayCalendar(id, payload) {
  return apiRequest(`/org-masters/holiday-calendars/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function toggleHolidayCalendarStatus(id) {
  return apiRequest(`/org-masters/holiday-calendars/${id}/toggle-status`, {
    method: 'PATCH'
  });
}

export function deleteHolidayCalendar(id) {
  return apiRequest(`/org-masters/holiday-calendars/${id}`, {
    method: 'DELETE'
  });
}

// ---------------------------------------------------------------------------
// APPROVAL REQUESTS API
// ---------------------------------------------------------------------------

export function getApprovals(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.employeeCode) params.set('employeeCode', filters.employeeCode);
  const query = params.toString();
  return apiRequest(`/approvals${query ? `?${query}` : ''}`);
}

export function createApprovalRequest(payload) {
  return apiRequest('/approvals', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function approveRequest(id) {
  return apiRequest(`/approvals/${id}/approve`, {
    method: 'PATCH'
  });
}

export function rejectRequest(id, rejectionNote) {
  return apiRequest(`/approvals/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionNote })
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
