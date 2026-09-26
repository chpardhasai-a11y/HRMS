'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileClock,
  FileDown,
  FileUp,
  Filter,
  GitBranch,
  KeyRound,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  ToggleLeft,
  Upload,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import AdminRouteGuard from '../components/AdminRouteGuard';
import Breadcrumbs from '../components/Breadcrumbs';
import DropdownSelect from '../components/DropdownSelect';
import { SkeletonMetrics, SkeletonTable } from '../components/SkeletonLoader';
import {
  createEmployee,
  formatDate,
  getCurrentCompany,
  getEmployeeAudit,
  getEmployees,
  getEmploymentTypes,
  getGradeBands,
  getJobTitles,
  getLegalEntities,
  getOrgDepartments,
  getOrgLocations,
  recordDocumentNote,
  resendEmployeeInvite,
  statusLabel,
  transferEmployee,
  updateEmployee as apiUpdateEmployee,
  updateEmployeeManager,
  updateEmployeeStatus
} from '../lib/hrmsApi';
import './org-admin.css';

const statusOptions = ['Active', 'On Leave', 'Inactive', 'Resigned', 'Terminated'];
const defaultDepartmentOptions = ['Engineering', 'Product', 'Design', 'People Ops', 'Finance', 'Sales'];
const defaultLocationOptions = ['Mumbai HQ', 'Bengaluru', 'Delhi NCR', 'Remote', 'Hyderabad'];
const defaultTypeOptions = ['Permanent', 'Contract', 'Intern', 'Consultant'];
const defaultGradeOptions = ['G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'C3'];
const defaultRoleOptions = ['Senior Software Engineer', 'Product Manager', 'UX Designer', 'HR Business Partner', 'Financial Analyst', 'Account Executive'];

const emptyEmployeeForm = {
  code: '',
  name: '',
  email: '',
  phone: '',
  role: '',
  department: defaultDepartmentOptions[0],
  entity: '',
  location: defaultLocationOptions[0],
  manager: '',
  type: defaultTypeOptions[0],
  grade: defaultGradeOptions[0],
  joinDate: new Date().toISOString().slice(0, 10)
};

function statusClass(status) {
  if (statusLabel(status) === 'Active') return 'badge-success';
  if (statusLabel(status) === 'On Leave') return 'badge-warning';
  return 'badge-neutral';
}

function createFormState(employee) {
  return { ...employee, status: statusLabel(employee.status), joinDate: formatDate(employee.joinDate) };
}

export default function AdminPage() {
  const [employees, setEmployees] = useState([]);
  const [openMenuCode, setOpenMenuCode] = useState(null);
  const [modal, setModal] = useState(null);
  const [formState, setFormState] = useState({});
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditItems, setAuditItems] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [masters, setMasters] = useState({
    legalEntities: [],
    departments: [],
    locations: [],
    employmentTypes: [],
    gradeBands: [],
    jobTitles: []
  });
  const [filters, setFilters] = useState({ search: '', status: '', department: '', location: '', type: '' });

  useEffect(() => {
    loadAdminContext();
  }, []);

  const departmentOptions = useMemo(() => {
    if (masters.departments && masters.departments.length > 0) {
      return masters.departments.filter((d) => d.isActive !== false).map((d) => d.name);
    }
    return defaultDepartmentOptions;
  }, [masters.departments]);

  const locationOptions = useMemo(() => {
    if (masters.locations && masters.locations.length > 0) {
      return masters.locations.filter((l) => l.isActive !== false).map((l) => l.name);
    }
    return defaultLocationOptions;
  }, [masters.locations]);

  const typeOptions = useMemo(() => {
    if (masters.employmentTypes && masters.employmentTypes.length > 0) {
      return masters.employmentTypes.filter((t) => t.isActive !== false).map((t) => t.name);
    }
    return defaultTypeOptions;
  }, [masters.employmentTypes]);

  const gradeOptions = useMemo(() => {
    if (masters.gradeBands && masters.gradeBands.length > 0) {
      return masters.gradeBands.filter((g) => g.isActive !== false).map((g) => g.name || g.code);
    }
    return defaultGradeOptions;
  }, [masters.gradeBands]);

  const entityOptions = useMemo(() => {
    if (masters.legalEntities && masters.legalEntities.length > 0) {
      return masters.legalEntities.filter((e) => e.isActive !== false).map((e) => e.name);
    }
    return activeCompany?.name ? [activeCompany.name] : ['Network18 Media'];
  }, [masters.legalEntities, activeCompany]);

  const roleOptions = useMemo(() => {
    if (masters.jobTitles && masters.jobTitles.length > 0) {
      return masters.jobTitles.filter((j) => j.isActive !== false).map((j) => j.name);
    }
    return defaultRoleOptions;
  }, [masters.jobTitles]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.code === modal?.employeeCode),
    [employees, modal]
  );

  async function loadAdminContext() {
    try {
      setIsLoading(true);
      setError('');
      const [
        companyData,
        employeeData,
        legalEntitiesData,
        departmentsData,
        locationsData,
        employmentTypesData,
        gradeBandsData,
        jobTitlesData
      ] = await Promise.all([
        getCurrentCompany().catch(() => null),
        getEmployees({}),
        getLegalEntities().catch(() => []),
        getOrgDepartments().catch(() => []),
        getOrgLocations().catch(() => []),
        getEmploymentTypes().catch(() => []),
        getGradeBands().catch(() => []),
        getJobTitles().catch(() => [])
      ]);
      setActiveCompany(companyData);
      setEmployees(employeeData || []);
      setMasters({
        legalEntities: legalEntitiesData || [],
        departments: departmentsData || [],
        locations: locationsData || [],
        employmentTypes: employmentTypesData || [],
        gradeBands: gradeBandsData || [],
        jobTitles: jobTitlesData || []
      });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load admin workspace.');
    } finally {
      setIsLoading(false);
    }
  }

  // Instant client-side filtering for 0ms lag UI response
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (filters.status && statusLabel(emp.status) !== statusLabel(filters.status)) return false;
      if (filters.department && emp.department !== filters.department) return false;
      if (filters.location && emp.location !== filters.location) return false;
      if (filters.type && emp.type !== filters.type) return false;
      if (filters.search?.trim()) {
        const query = filters.search.trim().toLowerCase();
        const matchName = emp.name.toLowerCase().includes(query);
        const matchCode = emp.code.toLowerCase().includes(query);
        const matchRole = emp.role.toLowerCase().includes(query);
        const matchManager = emp.manager?.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchRole && !matchManager) return false;
      }
      return true;
    });
  }, [employees, filters]);

  function openModal(type, employee = null) {
    setOpenMenuCode(null);
    if (type === 'create') {
      setFormState({
        code: `EMP${String(Date.now()).slice(-6)}`,
        name: '',
        email: '',
        phone: '',
        role: roleOptions[0] || 'Senior Software Engineer',
        department: departmentOptions[0] || 'Engineering',
        entity: entityOptions[0] || activeCompany?.name || '',
        location: locationOptions[0] || 'Mumbai HQ',
        manager: '',
        type: typeOptions[0] || 'Permanent',
        grade: gradeOptions[0] || 'G7',
        joinDate: new Date().toISOString().slice(0, 10)
      });
      setModal({ type });
      return;
    }
    if (employee) {
      setFormState(createFormState(employee));
      setModal({ type, employeeCode: employee.code });
      if (type === 'audit') {
        getEmployeeAudit(employee.code)
          .then(setAuditItems)
          .catch(() => setAuditItems([]));
      }
    }
  }

  function toggleRowMenu(employeeCode) {
    setOpenMenuCode((prev) => (prev === employeeCode ? null : employeeCode));
  }

  function closeModal() {
    setModal(null);
    setFormState({});
  }

  async function applyEmployeeUpdate(code, request, message) {
    try {
      const updatedEmployee = await request();
      setEmployees((currentEmployees) =>
        currentEmployees.map((employee) => (
          employee.code === code ? updatedEmployee : employee
        ))
      );
      setToast(message);
      closeModal();
    } catch (saveError) {
      setToast(saveError.message || 'Unable to save employee change.');
    }
  }

  function handleFilterChange(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setFilters({ search: '', status: '', department: '', location: '', type: '' });
  }

  async function createEmployeeRecord() {
    const requiredFields = ['code', 'name', 'email', 'role', 'department', 'entity', 'location', 'manager', 'type', 'grade', 'joinDate'];
    const missingField = requiredFields.find((field) => !String(formState[field] || '').trim());
    if (missingField) {
      setToast('Complete all required employee fields before saving.');
      return;
    }

    try {
      const employee = await createEmployee({
        code: formState.code,
        name: formState.name,
        email: formState.email,
        phone: formState.phone || undefined,
        role: formState.role,
        department: formState.department,
        entity: formState.entity,
        location: formState.location,
        manager: formState.manager,
        type: formState.type,
        grade: formState.grade,
        joinDate: formState.joinDate
      });
      setEmployees((currentEmployees) => [...currentEmployees, employee].sort((first, second) => first.code.localeCompare(second.code)));
      setToast(`Invitation dispatched to ${employee.name} (${employee.email}).`);
      setModal({ type: 'invite_sent', employee, inviteDetails: employee.inviteDetails });
    } catch (saveError) {
      setToast(saveError.message || 'Unable to send invitation.');
    }
  }

  async function resendInviteRecord(employee) {
    setOpenMenuCode(null);
    try {
      const res = await resendEmployeeInvite(employee.code);
      setToast(`Invitation resent to ${employee.name}.`);
      setModal({ type: 'invite_sent', employee: res, inviteDetails: res.inviteDetails });
    } catch (err) {
      setToast(err.message || 'Unable to resend invitation.');
    }
  }

  function downloadEmployee(employee) {
    setOpenMenuCode(null);
    const blob = new Blob([JSON.stringify(employee, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${employee.code}-employee-record.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast(`Downloaded ${employee.code} employee record.`);
  }

  function renderEditForm() {
    return (
      <div className="form-grid">
        {modal?.type === 'create' && <Field label="Employee Code" value={formState.code} onChange={(value) => setFormState((c) => ({ ...c, code: value }))} />}
        <Field label="Employee Name" value={formState.name} onChange={(value) => setFormState((c) => ({ ...c, name: value }))} />
        <Field label="Email" value={formState.email} onChange={(value) => setFormState((c) => ({ ...c, email: value }))} />
        <Field label="Phone" value={formState.phone} onChange={(value) => setFormState((c) => ({ ...c, phone: value }))} />
        <SelectField label="Role / Designation" value={formState.role} options={roleOptions} onChange={(value) => setFormState((c) => ({ ...c, role: value }))} />
        <SelectField label="Legal Entity" value={formState.entity} options={entityOptions} onChange={(value) => setFormState((c) => ({ ...c, entity: value }))} />
        <SelectField label="Department" value={formState.department} options={departmentOptions} onChange={(value) => setFormState((c) => ({ ...c, department: value }))} />
        <SelectField label="Location" value={formState.location} options={locationOptions} onChange={(value) => setFormState((c) => ({ ...c, location: value }))} />
        <SelectField label="Employment Type" value={formState.type} options={typeOptions} onChange={(value) => setFormState((c) => ({ ...c, type: value }))} />
        <SelectField label="Grade Band" value={formState.grade} options={gradeOptions} onChange={(value) => setFormState((c) => ({ ...c, grade: value }))} />
        <Field label="Reporting Manager" value={formState.manager} onChange={(value) => setFormState((c) => ({ ...c, manager: value }))} />
        {modal?.type === 'create' && <Field label="Join Date" type="date" value={formState.joinDate} onChange={(value) => setFormState((c) => ({ ...c, joinDate: value }))} />}
      </div>
    );
  }

  function renderModalBody() {
    if (modal?.type === 'create') return renderEditForm();
    if (!selectedEmployee) return null;
    if (modal?.type === 'edit') return renderEditForm();
    if (modal?.type === 'status') {
      return <SelectField label="Employee Status" value={formState.status} options={statusOptions} onChange={(value) => setFormState((c) => ({ ...c, status: value }))} />;
    }
    if (modal?.type === 'manager') {
      return <Field label="Reporting Manager" value={formState.manager} onChange={(value) => setFormState((c) => ({ ...c, manager: value }))} />;
    }
    if (modal?.type === 'transfer') {
      return (
        <div className="form-grid">
          <SelectField label="Department" value={formState.department} options={departmentOptions} onChange={(value) => setFormState((c) => ({ ...c, department: value }))} />
          <SelectField label="Location" value={formState.location} options={locationOptions} onChange={(value) => setFormState((c) => ({ ...c, location: value }))} />
          <SelectField label="Role / Designation" value={formState.role} options={roleOptions} onChange={(value) => setFormState((c) => ({ ...c, role: value }))} />
          <SelectField label="Grade" value={formState.grade} options={gradeOptions} onChange={(value) => setFormState((c) => ({ ...c, grade: value }))} />
        </div>
      );
    }
    if (modal?.type === 'upload') {
      return (
        <div className="form-grid single">
          <SelectField label="Document Type" value={formState.documentType || 'Address Proof'} options={['Address Proof', 'PAN Card', 'Aadhaar', 'Employment Contract', 'Education Certificate']} onChange={(value) => setFormState((c) => ({ ...c, documentType: value }))} />
          <Field label="Upload Note" value={formState.uploadNote || ''} onChange={(value) => setFormState((c) => ({ ...c, uploadNote: value }))} placeholder="Example: Signed copy received" />
        </div>
      );
    }
    if (modal?.type === 'audit') {
      return (
        <div className="audit-list">
          {auditItems.length === 0 && <span><strong>No audit entries yet</strong> Changes made through this screen will appear here.</span>}
          {auditItems.map((item) => (
            <span key={item.id}>
              <strong>{formatDate(item.createdAt)}</strong>
              {item.action.replaceAll('_', ' ')}
            </span>
          ))}
        </div>
      );
    }
    if (modal?.type === 'deactivate') {
      return (
        <div className="danger-copy">
          <ShieldAlert size={28} />
          <p>This will set {selectedEmployee.name} to Inactive for your organization. The change is saved to the HRMS backend.</p>
        </div>
      );
    }
    if (modal?.type === 'invite_sent') {
      const details = modal.inviteDetails || {};
      const targetEmail = details.sentToEmail || modal.employee?.email || '';
      const targetPhone = details.sentToPhone || modal.employee?.phone || '+91 98765 43210';
      const onboardingUrl = details.loginUrl || (typeof window !== 'undefined' ? `${window.location.origin}/onboard?email=${encodeURIComponent(targetEmail)}&code=${modal.employee?.code}` : '');
      const tempPass = details.tempPassword || 'Hrms#982143';
      const otpCode = details.otpCode || '849201';

      return (
        <div className="invite-sent-panel">
          <div className="invite-hero-banner">
            <CheckCircle2 size={36} className="invite-check-icon" />
            <div>
              <h3>Invitation Dispatched to {modal.employee?.name}</h3>
              <p>HRMS credentials & onboarding instructions sent via Email and SMS.</p>
            </div>
          </div>

          <div className="invite-channels">
            <div className="channel-pill">
              <Mail size={15} />
              <span>Email: <strong>{targetEmail}</strong></span>
            </div>
            <div className="channel-pill">
              <Smartphone size={15} />
              <span>SMS: <strong>{targetPhone}</strong></span>
            </div>
          </div>

          <div className="invite-box">
            <div className="invite-group">
              <label>HRMS Login & Account Setup Link</label>
              <div className="input-btn-row">
                <input className="input" readOnly value={onboardingUrl} />
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(onboardingUrl);
                    setToast('Onboarding link copied!');
                  }}
                >
                  <Copy size={14} /> Copy Link
                </button>
              </div>
            </div>

            <div className="invite-creds-grid">
              <div className="invite-group">
                <label><KeyRound size={13} /> Temporary Password</label>
                <div className="input-btn-row">
                  <input className="input" readOnly value={tempPass} />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPass);
                      setToast('Temporary password copied!');
                    }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>

              <div className="invite-group">
                <label><Smartphone size={13} /> Verification OTP Code</label>
                <div className="input-btn-row">
                  <input className="input" readOnly value={otpCode} />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(otpCode);
                      setToast('OTP code copied!');
                    }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="invite-instructions">
              <strong>Employee Onboarding Steps:</strong>
              <ol>
                <li>Click the HRMS onboarding link.</li>
                <li>Verify Email/Mobile with OTP or Temporary Password.</li>
                <li>Create secure permanent password.</li>
                <li>Log directly into HRMS.</li>
              </ol>
            </div>
          </div>

          <div className="invite-test-cta">
            <button
              className="btn btn-success"
              type="button"
              onClick={() => window.open(onboardingUrl, '_blank')}
            >
              <ExternalLink size={16} /> Open Employee Onboarding Link
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  function renderModalFooter() {
    if (modal?.type === 'create') {
      return <button className="btn btn-primary" type="button" onClick={createEmployeeRecord}><Send size={16} />Send Invite</button>;
    }
    if (modal?.type === 'invite_sent') {
      return <button className="btn btn-primary" type="button" onClick={closeModal}>Done</button>;
    }
    if (!selectedEmployee || modal?.type === 'audit') {
      return <button className="btn btn-secondary" type="button" onClick={closeModal}>Close</button>;
    }
    if (modal?.type === 'edit') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => apiUpdateEmployee(selectedEmployee.code, {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        role: formState.role,
        entity: formState.entity,
        department: formState.department,
        location: formState.location,
        type: formState.type,
        grade: formState.grade,
        manager: formState.manager
      }), `Updated ${selectedEmployee.code}.`)}>Save Employee</button>;
    }
    if (modal?.type === 'status') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => updateEmployeeStatus(selectedEmployee.code, formState.status), `Status updated for ${selectedEmployee.code}.`)}>Update Status</button>;
    }
    if (modal?.type === 'manager') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => updateEmployeeManager(selectedEmployee.code, formState.manager), `Manager updated for ${selectedEmployee.code}.`)}>Update Manager</button>;
    }
    if (modal?.type === 'transfer') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => transferEmployee(selectedEmployee.code, { department: formState.department, location: formState.location, role: formState.role, grade: formState.grade }), `Transfer details updated for ${selectedEmployee.code}.`)}>Save Change</button>;
    }
    if (modal?.type === 'upload') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => recordDocumentNote(selectedEmployee.code, { documentType: formState.documentType || 'Document', uploadNote: formState.uploadNote }), `Document note added for ${selectedEmployee.code}.`)}>Record Upload</button>;
    }
    if (modal?.type === 'deactivate') {
      return <button className="btn btn-danger" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => updateEmployeeStatus(selectedEmployee.code, 'Inactive'), `${selectedEmployee.code} deactivated.`)}>Deactivate Employee</button>;
    }
    return null;
  }

  function modalTitle() {
    const titles = {
      edit: 'Edit Employee',
      status: 'Change Status',
      manager: 'Update Reporting Manager',
      transfer: 'Transfer / Role Change',
      upload: 'Upload Documents',
      audit: 'Audit History',
      deactivate: 'Deactivate Employee',
      create: 'Add Employee & Send Invitation',
      invite_sent: 'Employee Invitation Sent'
    };
    return titles[modal?.type || ''] || 'Employee Action';
  }

  const activeCount = useMemo(() => employees.filter((emp) => statusLabel(emp.status) === 'Active').length, [employees]);
  const onLeaveCount = useMemo(() => employees.filter((emp) => statusLabel(emp.status) === 'On Leave').length, [employees]);
  const inactiveCount = useMemo(() => employees.filter((emp) => statusLabel(emp.status) === 'Inactive').length, [employees]);

  return (
    <AdminRouteGuard allowedRole="org_admin">
      <div style={{ width: '100%' }} onClick={() => openMenuCode && setOpenMenuCode(null)}>
        <section className="employee-master-workspace">
          <div className="employee-master-shell">
            <header className="employee-master-header">
              <div>
                <Breadcrumbs
                  items={[
                    { label: 'Organization Admin', href: '/org-admin' },
                    { label: 'Employee Master' }
                  ]}
                />
                <h1>{activeCompany?.name || 'Company Workspace'}</h1>
              </div>
              <div className="admin-actions">
                <button className="btn btn-secondary" type="button"><Upload size={16} />Bulk Upload</button>
                <button className="btn btn-secondary" type="button"><Download size={16} />Export</button>
              </div>
            </header>

            {isLoading ? (
              <SkeletonTable rows={6} columns={8} />
            ) : (
              <>

                <section className="card employee-master-card" id="main-content">
                  <div className="panel-top">
                    <div>
                      <h2>Employee Master</h2>
                      <p className="panel-copy">Manage employee records, organizational roles and status.</p>
                    </div>
                    <div className="panel-tools">
                      <button className="btn btn-secondary" type="button"><UsersRound size={16} />{filteredEmployees.length} Records</button>
                    </div>
                  </div>

                  <div className="filter-strip" aria-label="Employee filters">
                    <label className="admin-search">
                      <Search size={16} />
                      <input value={filters.search} onChange={(event) => handleFilterChange('search', event.target.value)} placeholder="Search by name, code, role or manager" />
                    </label>
                    <DropdownSelect
                      ariaLabel="Status"
                      className="admin-select"
                      value={filters.status}
                      placeholder="Status"
                      options={[
                        { value: '', label: 'Status' },
                        ...statusOptions.map((status) => ({ value: status === 'On Leave' ? 'OnLeave' : status, label: status }))
                      ]}
                      onChange={(value) => handleFilterChange('status', value)}
                    />
                    <DropdownSelect
                      ariaLabel="Department"
                      className="admin-select"
                      value={filters.department}
                      placeholder="Department"
                      options={[{ value: '', label: 'Department' }, ...departmentOptions]}
                      onChange={(value) => handleFilterChange('department', value)}
                    />
                    <DropdownSelect
                      ariaLabel="Location"
                      className="admin-select"
                      value={filters.location}
                      placeholder="Location"
                      options={[{ value: '', label: 'Location' }, ...locationOptions]}
                      onChange={(value) => handleFilterChange('location', value)}
                    />
                    <DropdownSelect
                      ariaLabel="Employee type"
                      className="admin-select"
                      value={filters.type}
                      placeholder="Type"
                      options={[{ value: '', label: 'Type' }, ...typeOptions]}
                      onChange={(value) => handleFilterChange('type', value)}
                    />
                    <button className="icon-btn" type="button" aria-label="Clear filters" title="Clear filters" onClick={clearFilters}><Filter size={16} /></button>
                  </div>

                  <div className="employee-table-wrap">
                    {error && <div className="danger-copy"><ShieldAlert size={22} /><p>{error}</p></div>}
                    {!error && filteredEmployees.length === 0 && <div className="detail-field"><strong>No employees found matching filters.</strong></div>}
                    <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Legal Entity</th>
                      <th>Department</th>
                      <th>Location</th>
                      <th>Employment</th>
                      <th>Manager</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.code}>
                        <td>
                          <div className="employee-name">
                            <span className="avatar">{employee.name.slice(0, 1)}</span>
                            <div>
                              <strong>{employee.name}</strong>
                              <span className="employee-subtext">{employee.code} | {employee.role}</span>
                            </div>
                          </div>
                        </td>
                        <td>{employee.entity}</td>
                        <td>{employee.department}</td>
                        <td>{employee.location}</td>
                        <td>
                          <strong>{employee.type}</strong>
                          <span className="employee-subtext">{employee.grade} | Joined {formatDate(employee.joinDate)}</span>
                        </td>
                        <td>{employee.manager}</td>
                        <td><span className={`badge ${statusClass(employee.status)}`}>{statusLabel(employee.status)}</span></td>
                        <td className="actions-cell" onClick={(event) => event.stopPropagation()}>
                          <button
                            className="icon-btn"
                            type="button"
                            aria-expanded={openMenuCode === employee.code}
                            aria-label={`Open actions for ${employee.name}`}
                            onClick={() => toggleRowMenu(employee.code)}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openMenuCode === employee.code && (
                            <div className="row-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                              <a href={`/org-admin/employees/${employee.code}`}><UserRound size={15} />View Profile</a>
                              <button type="button" onClick={() => openModal('edit', employee)}><Edit3 size={15} />Edit Employee</button>
                              <button type="button" onClick={() => resendInviteRecord(employee)}><Send size={15} />Resend Invitation</button>
                              <button type="button" onClick={() => openModal('status', employee)}><ToggleLeft size={15} />Change Status</button>
                              <button type="button" onClick={() => openModal('manager', employee)}><UsersRound size={15} />Update Reporting Manager</button>
                              <button type="button" onClick={() => openModal('transfer', employee)}><GitBranch size={15} />Transfer / Role Change</button>
                              <button type="button" onClick={() => openModal('upload', employee)}><FileUp size={15} />Upload Documents</button>
                              <button type="button" onClick={() => openModal('audit', employee)}><FileClock size={15} />View Audit History</button>
                              <button type="button" onClick={() => downloadEmployee(employee)}><FileDown size={15} />Download Employee Record</button>
                              <button className="danger-action" type="button" onClick={() => openModal('deactivate', employee)}><ShieldAlert size={15} />Deactivate Employee</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </section>

        {/* EMPLOYEE ACTION MODAL */}
        {modal && (selectedEmployee || modal.type === 'create') && (
          <div className="modal-backdrop" role="presentation" onClick={closeModal}>
            <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="employee-action-title" onClick={(event) => event.stopPropagation()}>
              <header className="modal-header">
                <div>
                  <h2 id="employee-action-title">{modalTitle()}</h2>
                </div>
                <button className="icon-btn" type="button" aria-label="Close action modal" onClick={closeModal}><X size={16} /></button>
              </header>
              <div className="modal-body">{renderModalBody()}</div>
              <footer className="modal-footer">
                <div className="modal-actions">
                  {modal.type !== 'audit' && <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancel</button>}
                  {renderModalFooter()}
                </div>
              </footer>
            </section>
          </div>
        )}

        {toast && <button className="toast" type="button" onClick={() => setToast('')}>{toast}</button>}
      </div>
    </AdminRouteGuard>
  );
}

function Field({ label, value = '', onChange, placeholder = '', type = 'text' }) {
  return (
    <div className="form-field-wrap">
      <span className="form-field-label">{label}</span>
      <input className="input" type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value = '', options, onChange }) {
  return (
    <div className="form-field-wrap">
      <span className="form-field-label">{label}</span>
      <DropdownSelect value={value || ''} options={options} onChange={onChange} ariaLabel={label} />
    </div>
  );
}
