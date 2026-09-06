'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  Download,
  Edit3,
  FileClock,
  FileDown,
  FileUp,
  Filter,
  GitBranch,
  MoreHorizontal,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  Upload,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import AdminSideNavigation from '../components/AdminSideNavigation';
import {
  formatDate,
  getActiveCompanyId,
  getCompanies,
  getEmployeeAudit,
  getEmployees,
  recordDocumentNote,
  setActiveCompanyId,
  statusLabel,
  transferEmployee,
  updateEmployee as apiUpdateEmployee,
  updateEmployeeManager,
  updateEmployeeStatus
} from '../lib/hrmsApi';

const statusOptions = ['Active', 'On Leave', 'Inactive', 'Resigned', 'Terminated'];
const departmentOptions = ['Engineering', 'Product', 'Design', 'People Ops', 'Finance', 'Sales'];
const locationOptions = ['Mumbai HQ', 'Bengaluru', 'Delhi NCR', 'Remote', 'Hyderabad'];
const typeOptions = ['Permanent', 'Contract', 'Intern', 'Consultant'];
const gradeOptions = ['G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'C3'];

const adminModules = [
  { title: 'People Operations', icon: UsersRound, href: '#employees', status: 'Live', summary: 'Employee master, profile changes, bulk onboarding and lifecycle actions.' },
  { title: 'Org Structure', icon: Network, href: '#structure', status: 'Setup', summary: 'Legal entities, departments, teams, reporting matrix, grades and locations.' },
  { title: 'Payroll & Benefits', icon: BarChart3, href: '#payroll', status: 'Planned', summary: 'Compensation setup, statutory IDs, bank details and benefit eligibility.' },
  { title: 'Policy & Workflow', icon: ShieldCheck, href: '#governance', status: 'Planned', summary: 'Roles, approvals, data visibility, escalation rules and compliance calendar.' },
  { title: 'Documents', icon: FileClock, href: '#documents', status: 'Partial', summary: 'Employee document metadata, verification states, letters and reminders.' },
  { title: 'Reports', icon: CalendarDays, href: '#reports', status: 'Planned', summary: 'Headcount, movement, readiness, expiry and workforce dashboards.' }
];

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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [modal, setModal] = useState(null);
  const [formState, setFormState] = useState({});
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditItems, setAuditItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState('');

  useEffect(() => {
    loadAdminContext();
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.code === modal?.employeeCode),
    [employees, modal]
  );

  async function loadEmployees() {
    try {
      setIsLoading(true);
      setError('');
      setEmployees(await getEmployees());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load employees.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAdminContext() {
    try {
      setIsLoading(true);
      setError('');
      const companyList = await getCompanies();
      setCompanies(companyList);
      const storedCompanyId = getActiveCompanyId();
      const nextCompanyId = storedCompanyId || companyList[0]?.id || '';
      if (nextCompanyId) setActiveCompanyId(nextCompanyId);
      setActiveCompanyIdState(nextCompanyId);
      setEmployees(await getEmployees());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load admin workspace.');
    } finally {
      setIsLoading(false);
    }
  }

  async function selectCompany(companyId) {
    setActiveCompanyIdState(companyId);
    setActiveCompanyId(companyId);
    await loadEmployees();
  }

  async function openModal(type, employee) {
    setOpenMenuCode(null);
    setFormState(createFormState(employee));
    setModal({ type, employeeCode: employee.code });
    if (type === 'audit') {
      try {
        setAuditItems(await getEmployeeAudit(employee.code));
      } catch {
        setAuditItems([]);
      }
    }
  }

  function toggleRowMenu(event, employeeCode) {
    event.stopPropagation();
    if (openMenuCode === employeeCode) {
      setOpenMenuCode(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 340;
    setMenuPosition({
      top: Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 12),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12))
    });
    setOpenMenuCode(employeeCode);
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

  function handleFormChange(field, value) {
    setFormState((current) => ({ ...current, [field]: value }));
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
        <Field label="Employee Name" value={formState.name} onChange={(value) => handleFormChange('name', value)} />
        <Field label="Role" value={formState.role} onChange={(value) => handleFormChange('role', value)} />
        <Field label="Legal Entity" value={formState.entity} onChange={(value) => handleFormChange('entity', value)} />
        <SelectField label="Department" value={formState.department} options={departmentOptions} onChange={(value) => handleFormChange('department', value)} />
        <SelectField label="Location" value={formState.location} options={locationOptions} onChange={(value) => handleFormChange('location', value)} />
        <SelectField label="Employment Type" value={formState.type} options={typeOptions} onChange={(value) => handleFormChange('type', value)} />
        <SelectField label="Grade" value={formState.grade} options={gradeOptions} onChange={(value) => handleFormChange('grade', value)} />
        <Field label="Reporting Manager" value={formState.manager} onChange={(value) => handleFormChange('manager', value)} />
      </div>
    );
  }

  function renderModalBody() {
    if (!selectedEmployee) return null;
    if (modal.type === 'edit') return renderEditForm();
    if (modal.type === 'status') {
      return <SelectField label="Employee Status" value={formState.status} options={statusOptions} onChange={(value) => handleFormChange('status', value)} />;
    }
    if (modal.type === 'manager') {
      return <Field label="Reporting Manager" value={formState.manager} onChange={(value) => handleFormChange('manager', value)} />;
    }
    if (modal.type === 'transfer') {
      return (
        <div className="form-grid">
          <SelectField label="Department" value={formState.department} options={departmentOptions} onChange={(value) => handleFormChange('department', value)} />
          <SelectField label="Location" value={formState.location} options={locationOptions} onChange={(value) => handleFormChange('location', value)} />
          <Field label="Role" value={formState.role} onChange={(value) => handleFormChange('role', value)} />
          <SelectField label="Grade" value={formState.grade} options={gradeOptions} onChange={(value) => handleFormChange('grade', value)} />
        </div>
      );
    }
    if (modal.type === 'upload') {
      return (
        <div className="form-grid single">
          <SelectField label="Document Type" value={formState.documentType || 'Address Proof'} options={['Address Proof', 'PAN Card', 'Aadhaar', 'Employment Contract', 'Education Certificate']} onChange={(value) => handleFormChange('documentType', value)} />
          <Field label="Upload Note" value={formState.uploadNote || ''} onChange={(value) => handleFormChange('uploadNote', value)} placeholder="Example: Signed copy received" />
        </div>
      );
    }
    if (modal.type === 'audit') {
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
    if (modal.type === 'deactivate') {
      return (
        <div className="danger-copy">
          <ShieldAlert size={28} />
          <p>This will set {selectedEmployee.name} to Inactive in the local Employee Master table. This action is frontend-only and can be reset by refreshing the page.</p>
        </div>
      );
    }
    return null;
  }

  function renderModalFooter() {
    if (!selectedEmployee || modal.type === 'audit') {
      return <button className="btn btn-secondary" type="button" onClick={closeModal}>Close</button>;
    }
    if (modal.type === 'edit') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => apiUpdateEmployee(selectedEmployee.code, formState), `Updated ${selectedEmployee.code}.`)}>Save Employee</button>;
    }
    if (modal.type === 'status') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => updateEmployeeStatus(selectedEmployee.code, formState.status), `Status updated for ${selectedEmployee.code}.`)}>Update Status</button>;
    }
    if (modal.type === 'manager') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => updateEmployeeManager(selectedEmployee.code, formState.manager), `Manager updated for ${selectedEmployee.code}.`)}>Update Manager</button>;
    }
    if (modal.type === 'transfer') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => transferEmployee(selectedEmployee.code, { department: formState.department, location: formState.location, role: formState.role, grade: formState.grade }), `Transfer details updated for ${selectedEmployee.code}.`)}>Save Change</button>;
    }
    if (modal.type === 'upload') {
      return <button className="btn btn-primary" type="button" onClick={() => applyEmployeeUpdate(selectedEmployee.code, () => recordDocumentNote(selectedEmployee.code, { documentType: formState.documentType || 'Document', uploadNote: formState.uploadNote }), `Document note added for ${selectedEmployee.code}.`)}>Record Upload</button>;
    }
    if (modal.type === 'deactivate') {
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
      deactivate: 'Deactivate Employee'
    };
    return titles[modal?.type] || 'Employee Action';
  }

  const activeCompany = companies.find((company) => company.id === activeCompanyId);
  const activeCount = employees.filter((employee) => statusLabel(employee.status) === 'Active').length;
  const onLeaveCount = employees.filter((employee) => statusLabel(employee.status) === 'On Leave').length;
  const departmentsCount = new Set(employees.map((employee) => employee.department)).size;

  return (
    <main className="app-shell-with-nav" onClick={() => setOpenMenuCode(null)}>
      <style>{`
        :root {
          --admin-primary: #2563eb;
          --admin-primary-hover: #1d4ed8;
          --admin-primary-10: #eff6ff;
          --admin-border: #e5e7eb;
          --admin-page: #f7f9fc;
          --admin-text: #111827;
          --admin-muted: #6b7280;
          --admin-panel: #ffffff;
          --admin-radius: 8px;
          --admin-shadow: 0 2px 4px rgba(16, 24, 40, 0.08);
        }

        body {
          margin: 0;
          background: var(--admin-page);
          color: var(--admin-text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 13px;
          line-height: 1.5;
        }

        * {
          box-sizing: border-box;
        }

        button,
        input,
        select {
          font: inherit;
        }

        h1,
        h2,
        p {
          margin-top: 0;
          letter-spacing: 0;
        }

        .employee-master-workspace {
          min-width: 0;
          padding: 20px;
        }

        .employee-master-shell {
          display: grid;
          gap: 16px;
          max-width: 1480px;
          margin: 0 auto;
        }

        .employee-master-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .admin-command-center {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 16px;
        }

        .company-context-panel,
        .module-map-panel {
          min-width: 0;
          padding: 18px;
        }

        .company-context-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .company-picker {
          display: grid;
          gap: 6px;
        }

        .company-picker span {
          color: var(--admin-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .company-picker select {
          min-width: 250px;
          min-height: 38px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          padding: 0 10px;
        }

        .company-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .company-stat {
          display: grid;
          gap: 4px;
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          background: #fbfdff;
          padding: 12px;
        }

        .company-stat span {
          color: var(--admin-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .company-stat strong {
          color: var(--admin-text);
          font-size: 20px;
          line-height: 1.2;
        }

        .company-detail-list {
          display: grid;
          gap: 10px;
        }

        .company-detail-list div {
          display: grid;
          gap: 2px;
          border-bottom: 1px solid var(--admin-border);
          padding-bottom: 10px;
        }

        .company-detail-list div:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .company-detail-list span {
          color: var(--admin-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .module-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .module-card {
          display: grid;
          gap: 10px;
          min-width: 0;
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          background: white;
          color: inherit;
          padding: 14px;
          text-decoration: none;
        }

        .module-card:hover {
          border-color: #bfdbfe;
          box-shadow: var(--admin-shadow);
        }

        .module-card header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .module-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--admin-primary-10);
          color: var(--admin-primary);
        }

        .module-card h3 {
          margin: 0;
          font-size: 15px;
          line-height: 1.2;
        }

        .module-card p {
          margin: 0;
          color: var(--admin-muted);
          font-size: 12px;
        }

        .eyebrow {
          margin-bottom: 6px;
          color: var(--admin-primary);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .employee-master-header h1 {
          margin-bottom: 6px;
          font-size: 30px;
          line-height: 1.2;
        }

        .employee-master-header p,
        .panel-copy,
        .employee-subtext {
          margin-bottom: 0;
          color: var(--admin-muted);
        }

        .admin-actions,
        .panel-tools,
        .modal-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 36px;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 0 14px;
          color: inherit;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        .btn-primary {
          background: var(--admin-primary);
          color: white;
        }

        .btn-primary:hover {
          background: var(--admin-primary-hover);
        }

        .btn-secondary {
          border-color: var(--admin-border);
          background: white;
          color: #374151;
        }

        .btn-danger {
          background: #dc2626;
          color: white;
        }

        .card {
          border: 1px solid var(--admin-border);
          border-radius: var(--admin-radius);
          background: var(--admin-panel);
          box-shadow: var(--admin-shadow);
        }

        .employee-master-card {
          min-width: 0;
          padding: 18px;
        }

        .panel-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .panel-top h2 {
          margin-bottom: 4px;
          font-size: 19px;
          line-height: 1.2;
        }

        .filter-strip {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) repeat(4, minmax(130px, 180px)) auto;
          gap: 10px;
          margin-bottom: 14px;
        }

        .admin-search,
        .admin-select,
        .form-field {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: var(--admin-muted);
          padding: 0 10px;
        }

        .form-field {
          display: grid;
          align-content: center;
          gap: 4px;
          min-height: 62px;
          padding: 8px 10px;
        }

        .form-field span {
          color: var(--admin-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .admin-search input,
        .admin-select select,
        .form-field input,
        .form-field select {
          min-width: 0;
          width: 100%;
          border: 0;
          background: transparent;
          color: #374151;
          outline: 0;
        }

        .icon-btn {
          display: inline-grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
        }

        .employee-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--admin-border);
          border-radius: 8px;
        }

        .employee-table {
          width: 100%;
          min-width: 1040px;
          border-collapse: collapse;
        }

        .employee-table th,
        .employee-table td {
          border-bottom: 1px solid var(--admin-border);
          padding: 13px 14px;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .employee-table th {
          background: #f8fafc;
          color: #374151;
          font-size: 12px;
          font-weight: 800;
        }

        .employee-table tr:last-child td {
          border-bottom: 0;
        }

        .employee-name {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 230px;
        }

        .avatar {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--admin-primary-10);
          color: var(--admin-primary);
          font-weight: 900;
        }

        .employee-name strong {
          display: block;
          color: var(--admin-text);
          font-size: 14px;
        }

        .employee-subtext {
          display: block;
          font-size: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .badge-success {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-warning {
          background: #ffedd5;
          color: #c2410c;
        }

        .badge-neutral {
          background: #e5e7eb;
          color: #374151;
        }

        .actions-cell {
          width: 70px;
        }

        .row-menu {
          position: fixed;
          z-index: 30;
          display: grid;
          width: 240px;
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          background: white;
          box-shadow: 0 18px 32px rgba(16, 24, 40, 0.16);
          padding: 6px;
        }

        .row-menu button {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 34px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #374151;
          padding: 0 10px;
          text-align: left;
          cursor: pointer;
        }

        .row-menu a {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 34px;
          border-radius: 6px;
          color: #374151;
          padding: 0 10px;
          text-align: left;
          text-decoration: none;
        }

        .row-menu button:hover,
        .row-menu a:hover {
          background: var(--admin-primary-10);
          color: var(--admin-primary);
        }

        .row-menu .danger-action {
          margin-top: 6px;
          border-top: 1px solid var(--admin-border);
          border-radius: 0 0 6px 6px;
          color: #dc2626;
          padding-top: 8px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(17, 24, 39, 0.42);
          padding: 0;
        }

        .modal-panel {
          display: grid;
          width: min(720px, 100%);
          max-height: min(720px, calc(100vh - 40px));
          overflow: auto;
          border-radius: 8px;
          background: white;
          box-shadow: 0 24px 60px rgba(16, 24, 40, 0.2);
        }

        .modal-header,
        .modal-footer {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .modal-header {
          border-bottom: 1px solid var(--admin-border);
        }

        .modal-header h2 {
          margin-bottom: 4px;
          font-size: 20px;
        }

        .modal-body {
          padding: 16px;
        }

        .modal-footer {
          border-top: 1px solid var(--admin-border);
          justify-content: flex-end;
        }

        .detail-grid,
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .form-grid.single {
          grid-template-columns: 1fr;
        }

        .detail-field {
          display: grid;
          gap: 4px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          background: #fbfdff;
          padding: 10px;
        }

        .detail-field span {
          color: var(--admin-muted);
          font-size: 12px;
          font-weight: 800;
          text-transform: capitalize;
        }

        .detail-field strong {
          overflow-wrap: anywhere;
        }

        .audit-list {
          display: grid;
          gap: 8px;
        }

        .audit-list span,
        .danger-copy {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 42px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          background: #fbfdff;
          padding: 10px;
        }

        .danger-copy {
          align-items: flex-start;
          background: #fef2f2;
          color: #991b1b;
        }

        .danger-copy p {
          margin-bottom: 0;
        }

        .toast {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 70;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          background: #f0fdf4;
          color: #166534;
          padding: 12px 14px;
          font-weight: 800;
          box-shadow: 0 12px 28px rgba(16, 24, 40, 0.12);
        }

        @media (max-width: 1280px) {
          .filter-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-command-center,
          .module-grid,
          .company-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .employee-master-workspace {
            padding: 12px;
          }

          .employee-master-header,
          .company-context-header,
          .panel-top {
            display: grid;
          }

          .admin-actions,
          .panel-tools,
          .modal-actions {
            justify-content: stretch;
          }

          .filter-strip,
          .detail-grid,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .row-menu {
            right: 12px;
            left: auto !important;
            width: min(240px, calc(100vw - 24px));
          }
        }
      `}</style>
      <AdminSideNavigation activePath="/admin" />

      <section className="employee-master-workspace">
        <div className="employee-master-shell">
          <header className="employee-master-header">
            <div>
              <p className="eyebrow">Enterprise Admin</p>
              <h1>{activeCompany?.name || 'Company Workspace'}</h1>
              <p>Select a company first, then manage every HRMS module inside that company boundary.</p>
            </div>
            <div className="admin-actions">
              <a className="btn btn-secondary" href="/admin/companies"><Building2 size={16} />Companies</a>
              <button className="btn btn-secondary" type="button"><Upload size={16} />Bulk Upload</button>
              <button className="btn btn-secondary" type="button"><Download size={16} />Export</button>
              <button className="btn btn-primary" type="button"><Plus size={16} />Add Employee</button>
            </div>
          </header>

          <section className="admin-command-center">
            <div className="card module-map-panel">
              <div className="company-context-header">
                <div>
                  <h2>Company Module Map</h2>
                  <p className="panel-copy">Each module below operates against the selected company context.</p>
                </div>
                <label className="company-picker">
                  <span>Selected Company</span>
                  <select value={activeCompanyId} onChange={(event) => selectCompany(event.target.value)}>
                    {companies.map((company) => (
                      <option value={company.id} key={company.id}>{company.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="module-grid">
                {adminModules.map(({ title, icon: Icon, href, status, summary }) => (
                  <a className="module-card" href={href} key={title}>
                    <header>
                      <span className="module-icon"><Icon size={18} /></span>
                      <span className="badge badge-neutral">{status}</span>
                    </header>
                    <div>
                      <h3>{title}</h3>
                      <p>{summary}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <aside className="card company-context-panel">
              <div className="panel-top">
                <div>
                  <h2>Company Context</h2>
                  <p className="panel-copy">Active tenant for admin operations.</p>
                </div>
                <Settings2 size={18} />
              </div>
              <div className="company-detail-list">
                <div><span>Company</span><strong>{activeCompany?.name || '-'}</strong></div>
                <div><span>Domain</span><strong>{activeCompany?.domain || activeCompany?.slug || '-'}</strong></div>
                <div><span>Country / Timezone</span><strong>{activeCompany ? `${activeCompany.country} / ${activeCompany.timezone}` : '-'}</strong></div>
                <div><span>HR Contact</span><strong>{activeCompany?.hrContactEmail || '-'}</strong></div>
              </div>
            </aside>
          </section>

          <section className="company-stat-grid" aria-label="Selected company snapshot">
            <div className="company-stat"><span>Total Employees</span><strong>{employees.length}</strong></div>
            <div className="company-stat"><span>Active</span><strong>{activeCount}</strong></div>
            <div className="company-stat"><span>On Leave</span><strong>{onLeaveCount}</strong></div>
            <div className="company-stat"><span>Departments</span><strong>{departmentsCount}</strong></div>
          </section>

          <section className="card employee-master-card" id="employees">
            <div className="panel-top">
              <div>
                <h2>Employee Master</h2>
                <p className="panel-copy">Search, filter and manage employee records for {activeCompany?.name || 'the selected company'}.</p>
              </div>
              <div className="panel-tools">
                <button className="btn btn-secondary" type="button"><UsersRound size={16} />{employees.length} Records</button>
              </div>
            </div>

            <div className="filter-strip" aria-label="Employee filters">
              <label className="admin-search">
                <Search size={16} />
                <input placeholder="Search by name, code, role or manager" />
              </label>
              <label className="admin-select">
                <select aria-label="Status"><option>Status</option><option>Active</option><option>On Leave</option><option>Inactive</option></select>
              </label>
              <label className="admin-select">
                <select aria-label="Department"><option>Department</option><option>Engineering</option><option>Product</option><option>Finance</option></select>
              </label>
              <label className="admin-select">
                <select aria-label="Location"><option>Location</option><option>Mumbai HQ</option><option>Bengaluru</option><option>Delhi NCR</option></select>
              </label>
              <label className="admin-select">
                <select aria-label="Employee type"><option>Type</option><option>Permanent</option><option>Contract</option></select>
              </label>
              <button className="icon-btn" type="button" aria-label="Open advanced filters"><Filter size={16} /></button>
            </div>

            <div className="employee-table-wrap">
              {isLoading && <div className="detail-field"><strong>Loading employee records...</strong></div>}
              {error && <div className="danger-copy"><ShieldAlert size={22} /><p>{error}</p></div>}
              {!isLoading && !error && employees.length === 0 && <div className="detail-field"><strong>No employees found.</strong></div>}
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
                  {employees.map((employee) => (
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
                          onClick={(event) => toggleRowMenu(event, employee.code)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      {openMenuCode && (
        <div
          className="row-menu"
          role="menu"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const employee = employees.find((item) => item.code === openMenuCode);
            if (!employee) return null;
            return (
              <>
                <a href={`/admin/profile/${employee.code}`}><UserRound size={15} />View Profile</a>
                <button type="button" onClick={() => openModal('edit', employee)}><Edit3 size={15} />Edit Employee</button>
                <button type="button" onClick={() => openModal('status', employee)}><ToggleLeft size={15} />Change Status</button>
                <button type="button" onClick={() => openModal('manager', employee)}><UsersRound size={15} />Update Reporting Manager</button>
                <button type="button" onClick={() => openModal('transfer', employee)}><GitBranch size={15} />Transfer / Role Change</button>
                <button type="button" onClick={() => openModal('upload', employee)}><FileUp size={15} />Upload Documents</button>
                <button type="button" onClick={() => openModal('audit', employee)}><FileClock size={15} />View Audit History</button>
                <button type="button" onClick={() => downloadEmployee(employee)}><FileDown size={15} />Download Employee Record</button>
                <button className="danger-action" type="button" onClick={() => openModal('deactivate', employee)}><ShieldAlert size={15} />Deactivate Employee</button>
              </>
            );
          })()}
        </div>
      )}

      {modal && selectedEmployee && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="employee-action-title" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h2 id="employee-action-title">{modalTitle()}</h2>
                <p className="panel-copy">{selectedEmployee.name} | {selectedEmployee.code}</p>
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
    </main>
  );
}

function Field({ label, value = '', onChange, placeholder = '' }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function SelectField({ label, value = '', options, onChange }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
