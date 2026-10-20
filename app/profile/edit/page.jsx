'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  FileCheck2,
  GraduationCap,
  Home,
  IdCard,
  Save,
  UserRound
} from 'lucide-react';
import DropdownSelect from '../../components/DropdownSelect';
import SideNavigation from '../../components/SideNavigation';
import { createApprovalRequest, getApprovals, getEmployee, getStoredUser, updateEmployee } from '../../lib/hrmsApi';

const sectionNav = [
  ['Personal Info', UserRound, 'personal-info'],
  ['Employment', BriefcaseBusiness, 'employment'],
  ['Organization Unit', Building2, 'organization-unit'],
  ['Location/Address', Home, 'location-address'],
  ['Previous Employment', ClipboardCheck, 'previous-employment'],
  ['Documents', FileCheck2, 'documents'],
  ['Bank Details', Banknote, 'bank-details'],
  ['Statutory Details', IdCard, 'statutory-details'],
  ['Education Details', GraduationCap, 'education-details'],
  ['Salary Details', CircleDollarSign, 'salary-details']
];

const defaultFormState = {
  // Personal Info (Editable)
  name: '',
  dob: '',
  gender: '',
  maritalStatus: '',
  bloodGroup: '',
  email: '',
  phone: '',
  emergencyContact: '',
  emergencyPhone: '',

  // Employment (HR Controlled - Read Only)
  code: '',
  type: '',
  status: '',
  workMode: '',
  joinDate: '',
  noticePeriod: '',
  shift: '',
  grade: '',

  // Organization Unit (HR Controlled - Read Only)
  entity: '',
  department: '',
  team: '',
  role: '',
  manager: '',
  costCenter: '',
  location: '',

  // Location / Address (Editable)
  city: '',
  currentAddress: '',
  permanentAddress: '',

  // Previous Employment (Editable)
  prevCompany: '',
  prevRole: '',
  prevStartYear: '',
  prevEndYear: '',
  prevSummary: '',

  // Documents (Editable - Goes for HR Approval)
  aadhaarStatus: 'Pending',
  panStatus: 'Pending',
  offerLetterStatus: 'Pending',
  expLetterStatus: 'Pending',
  documentUploadNote: '',

  // Bank Details (Editable - Goes for Payroll Approval)
  bankName: '',
  accountType: '',
  accountNumber: '',
  ifscCode: '',

  // Statutory Details (Editable - Goes for Compliance Approval)
  pan: '',
  aadhaar: '',
  uan: '',
  pfNumber: '',

  // Education (Editable)
  qualification: '',
  institution: '',
  eduStartYear: '',
  eduEndYear: '',

  // Salary (Payroll Controlled - Read Only)
  annualCtc: '',
  monthlyGross: '',
  payFrequency: '',
  effectiveFrom: ''
};

function Field({ label, children }) {
  return (
    <label className="edit-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, placeholder, type = 'text', disabled = false, onChange }) {
  if (disabled || !onChange) {
    return <input type={type} value={value || ''} placeholder={placeholder} readOnly disabled={disabled} />;
  }
  return <input type={type} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function SelectInput({ value, options, disabled = false, onChange }) {
  if (disabled) {
    return (
      <select value={value || ''} disabled>
        <option value={value}>{value}</option>
      </select>
    );
  }
  return <DropdownSelect value={value || ''} options={options} onChange={onChange} />;
}

function FormSection({ id, icon: Icon, title, helper, children }) {
  return (
    <section className="edit-section card" id={id}>
      <header className="edit-section-header">
        <div>
          <span className="section-icon"><Icon size={18} /></span>
          <div>
            <h2>{title}</h2>
            <p>{helper}</p>
          </div>
        </div>
      </header>
      <div className="edit-form-grid">{children}</div>
    </section>
  );
}

export default function EditProfilePage() {
  const [employee, setEmployee] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [initialState, setInitialState] = useState(defaultFormState);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const storedUser = getStoredUser();
    const code = storedUser?.employeeCode || 'EMP001245';

    getEmployee(code)
      .then((record) => {
        setEmployee(record);
        const profile = record.profile || {};
        const loaded = {
          ...defaultFormState,
          ...record,
          ...profile
        };
        setFormState(loaded);
        setInitialState(loaded);
        setIsDirty(false);
      })
      .catch(() => setToast('Using sample edit data until the HRMS API is available.'));

    getApprovals({ employeeCode: code })
      .then((list) => {
        if (Array.isArray(list)) {
          setPendingApprovals(list.filter((item) => ['Pending', 'In Progress', 'Awaiting Configuration'].includes(item.status)).map((item) => item.category));
        }
      })
      .catch(() => {});
  }, []);

  function updateField(field, value) {
    setFormState((current) => {
      const updated = { ...current, [field]: value };
      setIsDirty(JSON.stringify(updated) !== JSON.stringify(initialState));
      return updated;
    });
  }

  async function saveProfile() {
    setIsSaving(true);
    try {
      const code = employee?.code || 'EMP001245';
      const payload = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        location: formState.location,
        profile: {
          currentAddress: formState.currentAddress,
          permanentAddress: formState.permanentAddress,
          maritalStatus: formState.maritalStatus,
          bloodGroup: formState.bloodGroup,
          emergencyContact: formState.emergencyContact,
          emergencyPhone: formState.emergencyPhone
        }
      };

      await updateEmployee(code, payload);

      // Check Bank Details changes for approval submission
      const bankChanges = [];
      if (formState.bankName !== initialState.bankName) bankChanges.push({ field: 'Bank Name', current: initialState.bankName || '', requested: formState.bankName });
      if (formState.accountNumber !== initialState.accountNumber) bankChanges.push({ field: 'Account Number', current: initialState.accountNumber || '', requested: formState.accountNumber });
      if (formState.ifscCode !== initialState.ifscCode) bankChanges.push({ field: 'IFSC Code', current: initialState.ifscCode || '', requested: formState.ifscCode });
      if (formState.accountType !== initialState.accountType) bankChanges.push({ field: 'Account Type', current: initialState.accountType || '', requested: formState.accountType });

      let submittedApprovalCategories = [];

      if (bankChanges.length > 0) {
        await createApprovalRequest({
          employeeCode: code,
          employeeName: formState.name,
          department: formState.department,
          role: formState.role,
          category: 'Bank Details',
          changes: bankChanges,
          notes: 'Employee requested updated salary bank account details.'
        });
        submittedApprovalCategories.push('Bank Details');
      }

      // Check Statutory Details changes for approval submission
      const statChanges = [];
      if (formState.pan !== initialState.pan) statChanges.push({ field: 'PAN Number', current: initialState.pan || '', requested: formState.pan });
      if (formState.aadhaar !== initialState.aadhaar) statChanges.push({ field: 'Aadhaar Number', current: initialState.aadhaar || '', requested: formState.aadhaar });
      if (formState.uan !== initialState.uan) statChanges.push({ field: 'UAN Number', current: initialState.uan || '', requested: formState.uan });

      if (statChanges.length > 0) {
        await createApprovalRequest({
          employeeCode: code,
          employeeName: formState.name,
          department: formState.department,
          role: formState.role,
          category: 'Statutory Details',
          changes: statChanges,
          notes: 'Updated tax statutory identifiers following document update.'
        });
        submittedApprovalCategories.push('Statutory Details');
      }

      setInitialState(formState);
      setIsDirty(false);

      if (submittedApprovalCategories.length > 0) {
        setPendingApprovals(submittedApprovalCategories);
        setToast(`Changes saved! Submitted approval request for: ${submittedApprovalCategories.join(' & ')}.`);
      } else {
        setToast('Profile changes saved successfully!');
      }
    } catch (error) {
      setToast(error.message || 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell-with-nav">
      <SideNavigation activePath="/profile/edit" />
      <section className="edit-profile-page">
        <header className="edit-topbar card">
          <div className="edit-title">
            <a className="icon-btn" href="/" aria-label="Back to profile"><ArrowLeft size={17} /></a>
            <div>
              <p className="eyebrow">Profile Editor</p>
              <h1>{formState.name}</h1>
              <p>{employee?.code || 'EMP001245'} · {formState.role} · {formState.department}</p>
            </div>
          </div>

          <div className="edit-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isDirty ? (
              <span className="badge badge-warning" style={{ fontSize: 12, padding: '4px 8px' }}>
                ● Unsaved Changes
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ fontSize: 12, padding: '4px 8px' }}>
                All Saved
              </span>
            )}
            <a className="btn btn-secondary" href="/">Cancel</a>
            <button className="btn btn-primary" type="button" onClick={saveProfile} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        {pendingApprovals.length > 0 && (
          <div className="pending-approval-banner">
            <strong>
              <Clock size={18} />
              Approval Request Pending: Changes to Bank Details & Statutory Details have been submitted to HR / Payroll for approval.
            </strong>
          </div>
        )}

        <section className="edit-layout">
          <aside className="edit-nav card">
            <p className="eyebrow">Sections</p>
            <nav aria-label="Edit profile sections">
              {sectionNav.map(([label, Icon, key], index) => (
                <a className={index === 0 ? 'active' : ''} href={`#${key}`} key={label}>
                  <Icon size={16} />
                  <span>{label}</span>
                </a>
              ))}
            </nav>
          </aside>

          <div className="edit-content">
            {/* 1. PERSONAL INFO (Editable) */}
            <FormSection id="personal-info" icon={UserRound} title="Personal Info" helper="Identity and emergency contact details.">
              <Field label="Employee Name">
                <TextInput value={formState.name} onChange={(value) => updateField('name', value)} />
              </Field>
              <Field label="Date of Birth">
                <TextInput type="date" value={formState.dob || '1993-08-12'} onChange={(value) => updateField('dob', value)} />
              </Field>
              <Field label="Gender">
                <SelectInput value={formState.gender} options={['Male', 'Female', 'Non-binary', 'Prefer not to say']} onChange={(value) => updateField('gender', value)} />
              </Field>
              <Field label="Marital Status">
                <SelectInput value={formState.maritalStatus} options={['Single', 'Married', 'Separated']} onChange={(value) => updateField('maritalStatus', value)} />
              </Field>
              <Field label="Blood Group">
                <SelectInput value={formState.bloodGroup} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} onChange={(value) => updateField('bloodGroup', value)} />
              </Field>
              <Field label="Email">
                <TextInput type="email" value={formState.email} onChange={(value) => updateField('email', value)} />
              </Field>
              <Field label="Phone">
                <TextInput value={formState.phone} onChange={(value) => updateField('phone', value)} />
              </Field>
              <Field label="Emergency Contact">
                <TextInput value={formState.emergencyContact} onChange={(value) => updateField('emergencyContact', value)} />
              </Field>
              <Field label="Emergency Phone">
                <TextInput value={formState.emergencyPhone} onChange={(value) => updateField('emergencyPhone', value)} />
              </Field>
            </FormSection>

            {/* 2. EMPLOYMENT (HR Controlled - Read Only) */}
            <FormSection id="employment" icon={BriefcaseBusiness} title="Employment" helper="Employment status, work mode and grade (Managed by HR).">
              <Field label="Employee Code">
                <TextInput value={formState.code} disabled />
              </Field>
              <Field label="Employee Type">
                <SelectInput value={formState.type} options={['Permanent', 'Contract', 'Consultant', 'Intern']} disabled />
              </Field>
              <Field label="Employment Status">
                <SelectInput value={formState.status} options={['Active', 'On Leave', 'Inactive', 'Exited']} disabled />
              </Field>
              <Field label="Work Mode">
                <SelectInput value={formState.workMode} options={['Office', 'Hybrid', 'Remote']} disabled />
              </Field>
              <Field label="Joining Date">
                <TextInput type="date" value={formState.joinDate || '2022-02-15'} disabled />
              </Field>
              <Field label="Notice Period">
                <SelectInput value={formState.noticePeriod} options={['30 days', '60 days', '90 days']} disabled />
              </Field>
              <Field label="Shift">
                <SelectInput value={formState.shift} options={['General Shift', 'Morning Shift', 'Night Shift']} disabled />
              </Field>
              <Field label="Grade">
                <SelectInput value={formState.grade} options={['G4', 'G5', 'G6', 'G7', 'G8', 'C3']} disabled />
              </Field>
            </FormSection>

            {/* 3. ORGANIZATION UNIT (HR Controlled - Read Only) */}
            <FormSection id="organization-unit" icon={Building2} title="Organization Unit" helper="Reporting, department and business hierarchy (Managed by HR).">
              <Field label="Legal Entity">
                <TextInput value={formState.entity} disabled />
              </Field>
              <Field label="Department">
                <SelectInput value={formState.department} options={['Engineering', 'Product', 'Design', 'People Ops', 'Finance']} disabled />
              </Field>
              <Field label="Team">
                <SelectInput value={formState.team} options={['HRMS Platform', 'Ad Tech', 'Data Platform', 'Mobile Apps']} disabled />
              </Field>
              <Field label="Designation / Role">
                <TextInput value={formState.role} disabled />
              </Field>
              <Field label="Reporting Manager">
                <TextInput value={formState.manager} disabled />
              </Field>
              <Field label="Cost Center">
                <SelectInput value={formState.costCenter} options={['ENG-PLT-204', 'PROD-APP-112', 'CORP-HR-018']} disabled />
              </Field>
              <Field label="Office Location">
                <SelectInput value={formState.location} options={['Mumbai HQ', 'Bengaluru', 'Delhi NCR', 'Remote']} disabled />
              </Field>
            </FormSection>

            {/* 4. LOCATION / ADDRESS (Editable) */}
            <FormSection id="location-address" icon={Home} title="Location/Address" helper="Office location and residence records.">
              <Field label="City">
                <TextInput value={formState.city} onChange={(value) => updateField('city', value)} />
              </Field>
              <Field label="Current Address">
                <textarea value={formState.currentAddress} onChange={(e) => updateField('currentAddress', e.target.value)} />
              </Field>
              <Field label="Permanent Address">
                <textarea value={formState.permanentAddress} onChange={(e) => updateField('permanentAddress', e.target.value)} />
              </Field>
            </FormSection>

            {/* 5. PREVIOUS EMPLOYMENT (Editable) */}
            <FormSection id="previous-employment" icon={ClipboardCheck} title="Previous Employment" helper="Prior organization and experience details.">
              <Field label="Company"><TextInput value={formState.prevCompany} onChange={(v) => updateField('prevCompany', v)} /></Field>
              <Field label="Role"><TextInput value={formState.prevRole} onChange={(v) => updateField('prevRole', v)} /></Field>
              <Field label="Start Year"><TextInput value={formState.prevStartYear} onChange={(v) => updateField('prevStartYear', v)} /></Field>
              <Field label="End Year"><TextInput value={formState.prevEndYear} onChange={(v) => updateField('prevEndYear', v)} /></Field>
              <Field label="Summary"><textarea value={formState.prevSummary} onChange={(e) => updateField('prevSummary', e.target.value)} /></Field>
            </FormSection>

            {/* 6. DOCUMENTS (Editable - Goes for HR Approval) */}
            <FormSection id="documents" icon={FileCheck2} title="Documents" helper="Document metadata and verification status (Changes submitted for HR verification).">
              <Field label="Aadhaar Verification Status">
                <SelectInput value={formState.aadhaarStatus} options={['Pending', 'Verified', 'Rejected']} onChange={(v) => updateField('aadhaarStatus', v)} />
              </Field>
              <Field label="PAN Card Verification Status">
                <SelectInput value={formState.panStatus} options={['Pending', 'Verified', 'Rejected']} onChange={(v) => updateField('panStatus', v)} />
              </Field>
              <Field label="Document Upload / Note">
                <textarea value={formState.documentUploadNote} onChange={(e) => updateField('documentUploadNote', e.target.value)} placeholder="Provide details of document update..." />
              </Field>
            </FormSection>

            {/* 7. BANK DETAILS (Editable - Goes for Payroll Approval) */}
            <FormSection id="bank-details" icon={Banknote} title="Bank Details" helper="Salary account details (Changes submitted to Payroll for approval).">
              <Field label="Bank Name">
                <SelectInput value={formState.bankName} options={['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'State Bank of India']} onChange={(v) => updateField('bankName', v)} />
              </Field>
              <Field label="Account Type">
                <SelectInput value={formState.accountType} options={['Salary Account', 'Savings Account', 'Current Account']} onChange={(v) => updateField('accountType', v)} />
              </Field>
              <Field label="Account Number">
                <TextInput value={formState.accountNumber} onChange={(v) => updateField('accountNumber', v)} placeholder="Account Number" />
              </Field>
              <Field label="IFSC Code">
                <TextInput value={formState.ifscCode} onChange={(v) => updateField('ifscCode', v)} placeholder="IFSC Code" />
              </Field>
            </FormSection>

            {/* 8. STATUTORY DETAILS (Editable - Goes for Compliance Approval) */}
            <FormSection id="statutory-details" icon={IdCard} title="Statutory Details" helper="Government and statutory identifiers (Changes submitted for compliance approval).">
              <Field label="PAN"><TextInput value={formState.pan} onChange={(v) => updateField('pan', v)} /></Field>
              <Field label="Aadhaar"><TextInput value={formState.aadhaar} onChange={(v) => updateField('aadhaar', v)} /></Field>
              <Field label="UAN"><TextInput value={formState.uan} onChange={(v) => updateField('uan', v)} /></Field>
              <Field label="PF Number"><TextInput value={formState.pfNumber} onChange={(v) => updateField('pfNumber', v)} /></Field>
            </FormSection>

            {/* 9. EDUCATION DETAILS (Editable) */}
            <FormSection id="education-details" icon={GraduationCap} title="Education Details" helper="Highest qualifications and institution history.">
              <Field label="Qualification"><TextInput value={formState.qualification} onChange={(v) => updateField('qualification', v)} /></Field>
              <Field label="Institution"><TextInput value={formState.institution} onChange={(v) => updateField('institution', v)} /></Field>
              <Field label="Start Year"><TextInput value={formState.eduStartYear} onChange={(v) => updateField('eduStartYear', v)} /></Field>
              <Field label="End Year"><TextInput value={formState.eduEndYear} onChange={(v) => updateField('eduEndYear', v)} /></Field>
            </FormSection>

            {/* 10. SALARY DETAILS (Payroll Controlled - Read Only) */}
            <FormSection id="salary-details" icon={CircleDollarSign} title="Salary Details" helper="Compensation summary (Managed by Payroll).">
              <Field label="Annual CTC">
                <TextInput value={formState.annualCtc} disabled />
              </Field>
              <Field label="Monthly Gross">
                <TextInput value={formState.monthlyGross} disabled />
              </Field>
              <Field label="Pay Frequency">
                <SelectInput value={formState.payFrequency} options={['Monthly', 'Bi-weekly', 'Weekly']} disabled />
              </Field>
              <Field label="Effective From">
                <TextInput type="date" value={formState.effectiveFrom} disabled />
              </Field>
            </FormSection>
          </div>
        </section>

        {toast && (
          <button className="toast" type="button" onClick={() => setToast('')}>
            {toast}
          </button>
        )}
      </section>
    </main>
  );
}
