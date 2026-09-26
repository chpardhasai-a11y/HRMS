'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  Filter,
  KeyRound,
  Laptop,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  UsersRound,
  X
} from 'lucide-react';
import AdminRouteGuard from '../../components/AdminRouteGuard';
import Breadcrumbs from '../../components/Breadcrumbs';
import DropdownSelect from '../../components/DropdownSelect';
import { SkeletonTable } from '../../components/SkeletonLoader';
import {
  createEmployee,
  formatDate,
  getCurrentCompany,
  getEmploymentTypes,
  getGradeBands,
  getJobTitles,
  getLegalEntities,
  getOnboardingQueue,
  getOrgDepartments,
  getOrgLocations,
  resendEmployeeInvite,
  statusLabel,
  updateOnboardingStage
} from '../../lib/hrmsApi';
import '../org-admin.css';

const stageFilterOptions = [
  { value: '', label: 'All Stages' },
  { value: 'stage1', label: 'Stage 1: Invite Sent' },
  { value: 'stage2', label: 'Stage 2: Pending Docs' },
  { value: 'stage3', label: 'Stage 3: Pending IT Assets' },
  { value: 'stage4', label: 'Stage 4: Pending Bank/PF' },
  { value: 'ready', label: '100% Ready for Day 1' }
];

const defaultDepartmentOptions = ['Engineering', 'Product', 'Design', 'People Ops', 'Finance', 'Sales'];
const defaultLocationOptions = ['Mumbai HQ', 'Bengaluru', 'Delhi NCR', 'Remote', 'Hyderabad'];
const defaultTypeOptions = ['Permanent', 'Contract', 'Intern', 'Consultant'];
const defaultGradeOptions = ['G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'C3'];
const defaultRoleOptions = ['Senior Software Engineer', 'Product Manager', 'UX Designer', 'HR Business Partner', 'Financial Analyst', 'Account Executive'];

export default function OnboardingQueuePage() {
  const [queueData, setQueueData] = useState([]);
  const [metrics, setMetrics] = useState({ totalPreJoinees: 0, joiningThisWeek: 0, pendingVerification: 0, readyForDayOne: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [activeCompany, setActiveCompany] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modal, setModal] = useState(null);
  const [formState, setFormState] = useState({});
  const [filters, setFilters] = useState({ search: '', stage: '', department: '' });
  const [openMenuCode, setOpenMenuCode] = useState(null);
  const [masters, setMasters] = useState({
    legalEntities: [],
    departments: [],
    locations: [],
    employmentTypes: [],
    gradeBands: [],
    jobTitles: []
  });

  useEffect(() => {
    loadOnboardingData();
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

  async function loadOnboardingData() {
    try {
      setIsLoading(true);
      setError('');
      const [
        companyData,
        queueRes,
        legalEntitiesData,
        departmentsData,
        locationsData,
        employmentTypesData,
        gradeBandsData,
        jobTitlesData
      ] = await Promise.all([
        getCurrentCompany().catch(() => null),
        getOnboardingQueue(),
        getLegalEntities().catch(() => []),
        getOrgDepartments().catch(() => []),
        getOrgLocations().catch(() => []),
        getEmploymentTypes().catch(() => []),
        getGradeBands().catch(() => []),
        getJobTitles().catch(() => [])
      ]);
      setActiveCompany(companyData);
      setMetrics(queueRes?.metrics || { totalPreJoinees: 0, joiningThisWeek: 0, pendingVerification: 0, readyForDayOne: 0 });
      setQueueData(queueRes?.queue || []);
      setMasters({
        legalEntities: legalEntitiesData || [],
        departments: departmentsData || [],
        locations: locationsData || [],
        employmentTypes: employmentTypesData || [],
        gradeBands: gradeBandsData || [],
        jobTitles: jobTitlesData || []
      });
    } catch (err) {
      setError(err.message || 'Unable to load onboarding queue.');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredQueue = useMemo(() => {
    return queueData.filter((item) => {
      const prog = item.onboardingProgress || {};
      if (filters.stage === 'stage1' && prog.currentStageName !== 'Stage 1: Invite Sent') return false;
      if (filters.stage === 'stage2' && !prog.stages?.stage2_docsVerified) return true; // Matches pending docs
      if (filters.stage === 'stage3' && !prog.stages?.stage3_assetsAllocated) return true;
      if (filters.stage === 'stage4' && !prog.stages?.stage4_bankVerified) return true;
      if (filters.stage === 'ready' && !prog.isReadyForDayOne) return false;
      if (filters.department && item.department !== filters.department) return false;
      if (filters.search?.trim()) {
        const query = filters.search.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.code.toLowerCase().includes(query);
        const matchRole = item.role.toLowerCase().includes(query);
        const matchEmail = item.email.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchRole && !matchEmail) return false;
      }
      return true;
    });
  }, [queueData, filters]);

  function openAddEmployeeModal() {
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
    setModal({ type: 'create' });
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
      setToast(`Invitation dispatched to ${employee.name} (${employee.email}).`);
      setModal({ type: 'invite_sent', employee, inviteDetails: employee.inviteDetails });
      loadOnboardingData();
    } catch (saveError) {
      setToast(saveError.message || 'Unable to send invitation.');
    }
  }

  async function handleActivateDayOne(candidate) {
    try {
      await updateOnboardingStage(candidate.code, { markDayOneJoined: true });
      setToast(`Day 1 Activated! ${candidate.name} is now Active in Employee Master.`);
      loadOnboardingData();
      closeModal();
    } catch (err) {
      setToast(err.message || 'Failed to activate employee.');
    }
  }

  async function handleResendCandidateInvite(candidate) {
    setOpenMenuCode(null);
    try {
      const res = await resendEmployeeInvite(candidate.code);
      setToast(`Invitation & OTP resent to ${candidate.name}.`);
      setModal({ type: 'invite_sent', employee: res, inviteDetails: res.inviteDetails });
    } catch (err) {
      setToast(err.message || 'Failed to resend invitation.');
    }
  }

  function closeModal() {
    setModal(null);
    setSelectedCandidate(null);
    setFormState({});
  }

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
                      { label: 'Onboarding Module' }
                    ]}
                  />
                  <h1>Pre-Joining Onboarding Work Queue</h1>
                  <p className="panel-copy">
                    Source of truth: <strong>Employee Master</strong>. Use this workflow module to manage pre-joining candidates, verify documents, assign IT assets, and trigger Day-1 activation.
                  </p>
                </div>

                <div className="admin-actions">
                  <button className="btn btn-primary" type="button" onClick={openAddEmployeeModal}>
                    <Plus size={16} /> Add Employee
                  </button>
                </div>
              </header>

              {isLoading ? (
                <SkeletonTable rows={6} columns={7} />
              ) : (
                <>

                  {/* Main Work Queue Table */}
                  <section className="card employee-master-card" id="main-content">
                    <div className="panel-top">
                      <div>
                        <h2>Pre-Joining Candidates Work Queue</h2>
                        <p className="panel-copy">Track onboarding checklist completion per candidate before Day 1 joining.</p>
                      </div>
                      <div className="panel-tools">
                        <button className="btn btn-secondary" type="button">
                          <UserCheck size={16} /> {filteredQueue.length} Joinees Listed
                        </button>
                      </div>
                    </div>

                    <div className="filter-strip" aria-label="Onboarding filters">
                      <label className="admin-search">
                        <Search size={16} />
                        <input
                          value={filters.search}
                          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                          placeholder="Search candidate name, code, role or email..."
                        />
                      </label>
                      <DropdownSelect
                        ariaLabel="Filter by Onboarding Stage"
                        className="admin-select"
                        value={filters.stage}
                        placeholder="All Stages"
                        options={stageFilterOptions}
                        onChange={(value) => setFilters((f) => ({ ...f, stage: value }))}
                      />
                      <button
                        className="icon-btn"
                        type="button"
                        aria-label="Clear filters"
                        title="Clear filters"
                        onClick={() => setFilters({ search: '', stage: '', department: '' })}
                      >
                        <Filter size={16} />
                      </button>
                    </div>

                    <div className="employee-table-wrap">
                      {error && (
                        <div className="danger-copy" style={{ padding: 16 }}>
                          <AlertCircle size={22} />
                          <p>{error}</p>
                        </div>
                      )}

                      {!error && filteredQueue.length === 0 && (
                        <div className="detail-field" style={{ padding: 20 }}>
                          <strong>No pre-joining candidates matching selected filters.</strong>
                        </div>
                      )}

                      <table className="employee-table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Role & Department</th>
                            <th>Joining Date</th>
                            <th>Onboarding Progress</th>
                            <th>Current Stage</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQueue.map((item) => {
                            const prog = item.onboardingProgress || {};
                            return (
                              <tr key={item.code}>
                                <td>
                                  <div className="employee-name">
                                    <span className="avatar">{item.name.slice(0, 1)}</span>
                                    <div>
                                      <strong>{item.name}</strong>
                                      <span className="employee-subtext">{item.code} | {item.email}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <strong>{item.role}</strong>
                                  <span className="employee-subtext">{item.department} | {item.entity}</span>
                                </td>
                                <td>
                                  <strong>{formatDate(item.joinDate)}</strong>
                                  {prog.isJoiningThisWeek && (
                                    <span className="badge badge-warning" style={{ marginTop: 4, display: 'inline-flex' }}>
                                      <Clock size={12} style={{ marginRight: 4 }} /> Joining Soon
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'grid', gap: 4, minWidth: 140 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                                      <span>{prog.completedCount}/4 Stages</span>
                                      <span>{prog.completionPercentage}%</span>
                                    </div>
                                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          height: '100%',
                                          width: `${prog.completionPercentage}%`,
                                          background: prog.isReadyForDayOne ? '#16a34a' : '#2563eb',
                                          borderRadius: 999,
                                          transition: 'width 0.3s ease'
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: prog.isReadyForDayOne ? '#15803d' : '#334155' }}>
                                    {prog.currentStageName}
                                  </span>
                                </td>
                                <td>
                                  {item.status === 'Active' ? (
                                    <span className="badge badge-success">Day 1 Joined</span>
                                  ) : prog.isReadyForDayOne ? (
                                    <span className="badge badge-success">Ready for Day 1</span>
                                  ) : (
                                    <span className="badge badge-warning">Onboarding In Progress</span>
                                  )}
                                </td>
                                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className="icon-btn"
                                    type="button"
                                    aria-expanded={openMenuCode === item.code}
                                    aria-label={`Open onboarding actions for ${item.name}`}
                                    onClick={() => setOpenMenuCode((prev) => (prev === item.code ? null : item.code))}
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>

                                  {openMenuCode === item.code && (
                                    <div className="row-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedCandidate(item);
                                          setModal({ type: 'checklist' });
                                          setOpenMenuCode(null);
                                        }}
                                      >
                                        <FileCheck2 size={15} /> View Onboarding Checklist
                                      </button>
                                      <button type="button" onClick={() => handleResendCandidateInvite(item)}>
                                        <Send size={15} /> Resend Invite & Link
                                      </button>
                                      {item.status !== 'Active' && (
                                        <button
                                          type="button"
                                          style={{ color: '#16a34a', fontWeight: 800 }}
                                          onClick={() => handleActivateDayOne(item)}
                                        >
                                          <UserCheck size={15} /> Mark Day-1 Joined (Activate)
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </div>
          </section>

          {/* CHECKLIST & ACTION MODAL */}
          {modal?.type === 'checklist' && selectedCandidate && (
            <div className="modal-backdrop" role="presentation" onClick={closeModal}>
              <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                  <div>
                    <h2 id="onboarding-title">Candidate Onboarding Checklist</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                      {selectedCandidate.name} ({selectedCandidate.code}) • {selectedCandidate.role}
                    </p>
                  </div>
                  <button className="icon-btn" type="button" onClick={closeModal}><X size={16} /></button>
                </header>

                <div className="modal-body">
                  <div className="invite-sent-panel">
                    <div className="invite-hero-banner" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
                      <Sparkles size={32} color="#2563eb" />
                      <div>
                        <h3>Onboarding Completion: {selectedCandidate.onboardingProgress?.completionPercentage}%</h3>
                        <p>Joining Date: <strong>{formatDate(selectedCandidate.joinDate)}</strong> • Location: <strong>{selectedCandidate.location}</strong></p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
                      {/* Stage 1 */}
                      <div className="channel-pill" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CheckCircle2 size={18} color="#16a34a" />
                          <span><strong>Stage 1: HRMS Account Created & Invitation Sent</strong></span>
                        </div>
                        <span className="badge badge-success">Completed</span>
                      </div>

                      {/* Stage 2 */}
                      <div className="channel-pill" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {selectedCandidate.onboardingProgress?.stages?.stage2_docsVerified ? (
                            <CheckCircle2 size={18} color="#16a34a" />
                          ) : (
                            <Clock size={18} color="#c2410c" />
                          )}
                          <span><strong>Stage 2: Document Upload & HR Verification</strong></span>
                        </div>
                        {selectedCandidate.onboardingProgress?.stages?.stage2_docsVerified ? (
                          <span className="badge badge-success">Verified</span>
                        ) : (
                          <span className="badge badge-warning">Pending Upload</span>
                        )}
                      </div>

                      {/* Stage 3 */}
                      <div className="channel-pill" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {selectedCandidate.onboardingProgress?.stages?.stage3_assetsAllocated ? (
                            <CheckCircle2 size={18} color="#16a34a" />
                          ) : (
                            <Laptop size={18} color="#2563eb" />
                          )}
                          <span><strong>Stage 3: IT Asset & WorkShift Allocation</strong></span>
                        </div>
                        {selectedCandidate.onboardingProgress?.stages?.stage3_assetsAllocated ? (
                          <span className="badge badge-success">Allocated</span>
                        ) : (
                          <span className="badge badge-neutral">In Progress</span>
                        )}
                      </div>

                      {/* Stage 4 */}
                      <div className="channel-pill" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {selectedCandidate.onboardingProgress?.stages?.stage4_bankVerified ? (
                            <CheckCircle2 size={18} color="#16a34a" />
                          ) : (
                            <Clock size={18} color="#64748b" />
                          )}
                          <span><strong>Stage 4: Bank Account & Statutory Setup</strong></span>
                        </div>
                        {selectedCandidate.onboardingProgress?.stages?.stage4_bankVerified ? (
                          <span className="badge badge-success">Verified</span>
                        ) : (
                          <span className="badge badge-neutral">Pending Setup</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="modal-footer">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Close</button>
                  {selectedCandidate.status !== 'Active' && (
                    <button className="btn btn-success" type="button" onClick={() => handleActivateDayOne(selectedCandidate)}>
                      <UserCheck size={16} /> Mark Day-1 Joined (Activate in Employee Master)
                    </button>
                  )}
                </footer>
              </section>
            </div>
          )}

          {/* ADD EMPLOYEE MODAL */}
          {modal?.type === 'create' && (
            <div className="modal-backdrop" role="presentation" onClick={closeModal}>
              <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="add-employee-title" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                  <div>
                    <h2 id="add-employee-title">Add Employee & Send Invitation</h2>
                  </div>
                  <button className="icon-btn" type="button" onClick={closeModal}><X size={16} /></button>
                </header>

                <div className="modal-body">
                  <div className="form-grid">
                    <Field label="Employee Code" value={formState.code} onChange={(val) => setFormState((c) => ({ ...c, code: val }))} />
                    <Field label="Employee Name" value={formState.name} onChange={(val) => setFormState((c) => ({ ...c, name: val }))} />
                    <Field label="Email" value={formState.email} onChange={(val) => setFormState((c) => ({ ...c, email: val }))} />
                    <Field label="Phone" value={formState.phone} onChange={(val) => setFormState((c) => ({ ...c, phone: val }))} />
                    <SelectField label="Role / Designation" value={formState.role} options={roleOptions} onChange={(val) => setFormState((c) => ({ ...c, role: val }))} />
                    <SelectField label="Legal Entity" value={formState.entity} options={entityOptions} onChange={(val) => setFormState((c) => ({ ...c, entity: val }))} />
                    <SelectField label="Department" value={formState.department} options={departmentOptions} onChange={(val) => setFormState((c) => ({ ...c, department: val }))} />
                    <SelectField label="Location" value={formState.location} options={locationOptions} onChange={(val) => setFormState((c) => ({ ...c, location: val }))} />
                    <SelectField label="Employment Type" value={formState.type} options={typeOptions} onChange={(val) => setFormState((c) => ({ ...c, type: val }))} />
                    <SelectField label="Grade Band" value={formState.grade} options={gradeOptions} onChange={(val) => setFormState((c) => ({ ...c, grade: val }))} />
                    <Field label="Reporting Manager" value={formState.manager} onChange={(val) => setFormState((c) => ({ ...c, manager: val }))} />
                    <Field label="Join Date" type="date" value={formState.joinDate} onChange={(val) => setFormState((c) => ({ ...c, joinDate: val }))} />
                  </div>
                </div>

                <footer className="modal-footer">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary" type="button" onClick={createEmployeeRecord}><Send size={16} />Send Invite</button>
                </footer>
              </section>
            </div>
          )}

          {/* INVITATION CONFIRMATION MODAL */}
          {modal?.type === 'invite_sent' && (
            <div className="modal-backdrop" role="presentation" onClick={closeModal}>
              <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="invite-title" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                  <div>
                    <h2 id="invite-title">Invitation Dispatched</h2>
                  </div>
                  <button className="icon-btn" type="button" onClick={closeModal}><X size={16} /></button>
                </header>
                <div className="modal-body">
                  <div className="invite-sent-panel">
                    <div className="invite-hero-banner">
                      <CheckCircle2 size={36} className="invite-check-icon" />
                      <div>
                        <h3>Invitation Sent to {modal.employee?.name}</h3>
                        <p>HRMS setup link and temporary credentials sent via Email and SMS.</p>
                      </div>
                    </div>

                    <div className="invite-box">
                      <div className="invite-group">
                        <label>Onboarding Link</label>
                        <input className="input" readOnly value={modal.inviteDetails?.loginUrl || ''} />
                      </div>
                      <div className="invite-creds-grid">
                        <div className="invite-group">
                          <label>Temporary Password</label>
                          <input className="input" readOnly value={modal.inviteDetails?.tempPassword || ''} />
                        </div>
                        <div className="invite-group">
                          <label>Verification OTP</label>
                          <input className="input" readOnly value={modal.inviteDetails?.otpCode || ''} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <footer className="modal-footer">
                  <button className="btn btn-primary" type="button" onClick={closeModal}>Done</button>
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
      <input className="input" type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
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
