'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Home,
  IdCard,
  Save,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import SideNavigation from '../../components/SideNavigation';
import { getEmployee, updateEmployee } from '../../lib/hrmsApi';

const sectionNav = [
  ['Personal Info', UserRound],
  ['Employment', BriefcaseBusiness],
  ['Organization Unit', Building2],
  ['Location/Address', Home],
  ['Previous Employment', ClipboardCheck],
  ['Documents', FileCheck2],
  ['Bank Details', Banknote],
  ['Statutory Details', IdCard],
  ['Education Details', GraduationCap],
  ['Salary Details', CircleDollarSign]
];

function Field({ label, children }) {
  return (
    <label className="edit-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, placeholder, type = 'text', onChange }) {
  if (!onChange) return <input type={type} defaultValue={value || ''} placeholder={placeholder} readOnly />;
  return <input type={type} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function SelectInput({ value, options, onChange }) {
  if (!onChange) {
    return (
      <select defaultValue={value || ''}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
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
        <span className="badge badge-neutral">Draft</span>
      </header>
      <div className="edit-form-grid">{children}</div>
    </section>
  );
}

export default function EditProfilePage() {
  const [employee, setEmployee] = useState(null);
  const [formState, setFormState] = useState({
    name: 'Rahul Sharma',
    email: 'rahul.sharma@company.com',
    phone: '+91 98765 43210',
    role: 'Senior Software Engineer',
    department: 'Engineering',
    entity: 'Network18 Media',
    location: 'Mumbai HQ',
    manager: 'Sneha Iyer',
    type: 'Permanent',
    grade: 'G6'
  });
  const [toast, setToast] = useState('');

  useEffect(() => {
    getEmployee('EMP001245')
      .then((record) => {
        setEmployee(record);
        setFormState((current) => ({ ...current, ...record }));
      })
      .catch(() => setToast('Using sample edit data until the HRMS API is available.'));
  }, []);

  function updateField(field, value) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  async function saveDraft() {
    try {
      await updateEmployee(employee?.code || 'EMP001245', {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        role: formState.role,
        department: formState.department,
        entity: formState.entity,
        location: formState.location,
        manager: formState.manager,
        type: formState.type,
        grade: formState.grade
      });
      setToast('Profile saved to HRMS API.');
    } catch (error) {
      setToast(error.message || 'Unable to save profile.');
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
        <div className="edit-actions">
          <a className="btn btn-secondary" href="/">Cancel</a>
          <button className="btn btn-primary" type="button" onClick={saveDraft}><Save size={16} />Save Draft</button>
        </div>
        </header>

        <section className="edit-layout">
        <aside className="edit-nav card">
          <p className="eyebrow">Sections</p>
          <nav aria-label="Edit profile sections">
            {sectionNav.map(([label, Icon], index) => (
              <a className={index === 0 ? 'active' : ''} href={`#${label.toLowerCase().replaceAll(' ', '-').replace('/', '-')}`} key={label}>
                <Icon size={16} />
                {label}
              </a>
            ))}
          </nav>
          <div className="edit-readiness">
            <ShieldCheck size={18} />
            <div>
              <strong>Change controls</strong>
              <p>All edits are interface-only in this build. No data is saved.</p>
            </div>
          </div>
        </aside>

        <div className="edit-content">
          <FormSection id="personal-info" icon={UserRound} title="Personal Info" helper="Identity and emergency contact details.">
            <Field label="Employee Name"><TextInput value={formState.name} onChange={(value) => updateField('name', value)} /></Field>
            <Field label="Date of Birth"><TextInput type="date" value="1993-08-12" /></Field>
            <Field label="Gender"><SelectInput value="Male" options={['Male', 'Female', 'Non-binary', 'Prefer not to say']} /></Field>
            <Field label="Marital Status"><SelectInput value="Married" options={['Single', 'Married', 'Separated']} /></Field>
            <Field label="Blood Group"><SelectInput value="B+" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} /></Field>
            <Field label="Email"><TextInput type="email" value={formState.email} onChange={(value) => updateField('email', value)} /></Field>
            <Field label="Phone"><TextInput value={formState.phone} onChange={(value) => updateField('phone', value)} /></Field>
            <Field label="Emergency Contact"><TextInput value="Anita Sharma" /></Field>
            <Field label="Emergency Phone"><TextInput value="+91 99887 77665" /></Field>
          </FormSection>

          <FormSection id="employment" icon={BriefcaseBusiness} title="Employment" helper="Employment status, work mode and policy assignment.">
            <Field label="Employee Code"><TextInput value={employee?.code || 'EMP001245'} /></Field>
            <Field label="Employee Type"><SelectInput value={formState.type} options={['Permanent', 'Contract', 'Consultant', 'Intern']} onChange={(value) => updateField('type', value)} /></Field>
            <Field label="Employment Status"><SelectInput value="Active" options={['Active', 'On Leave', 'Inactive', 'Exited']} /></Field>
            <Field label="Work Mode"><SelectInput value="Hybrid" options={['Office', 'Hybrid', 'Remote']} /></Field>
            <Field label="Joining Date"><TextInput type="date" value="2022-02-15" /></Field>
            <Field label="Notice Period"><SelectInput value="60 days" options={['30 days', '60 days', '90 days']} /></Field>
            <Field label="Shift"><SelectInput value="General Shift" options={['General Shift', 'Morning Shift', 'Night Shift']} /></Field>
            <Field label="Grade"><SelectInput value={formState.grade} options={['G4', 'G5', 'G6', 'G7', 'G8', 'C3']} onChange={(value) => updateField('grade', value)} /></Field>
          </FormSection>

          <FormSection id="organization-unit" icon={Building2} title="Organization Unit" helper="Reporting, department and business hierarchy.">
            <Field label="Legal Entity"><TextInput value={formState.entity} onChange={(value) => updateField('entity', value)} /></Field>
            <Field label="Department"><SelectInput value={formState.department} options={['Engineering', 'Product', 'Design', 'People Ops', 'Finance']} onChange={(value) => updateField('department', value)} /></Field>
            <Field label="Team"><SelectInput value="HRMS Platform" options={['HRMS Platform', 'Ad Tech', 'Data Platform', 'Mobile Apps']} /></Field>
            <Field label="Designation"><TextInput value={formState.role} onChange={(value) => updateField('role', value)} /></Field>
            <Field label="Reporting Manager"><TextInput value={formState.manager} onChange={(value) => updateField('manager', value)} /></Field>
            <Field label="Cost Center"><SelectInput value="ENG-PLT-204" options={['ENG-PLT-204', 'PROD-APP-112', 'CORP-HR-018']} /></Field>
            <Field label="Office Location"><SelectInput value={formState.location} options={['Mumbai HQ', 'Bengaluru', 'Delhi NCR', 'Remote']} onChange={(value) => updateField('location', value)} /></Field>
          </FormSection>

          <FormSection id="location-address" icon={Home} title="Location/Address" helper="Office location and residence records.">
            <Field label="Office Location"><SelectInput value="Mumbai HQ" options={['Mumbai HQ', 'Bengaluru', 'Delhi NCR', 'Remote']} /></Field>
            <Field label="City"><TextInput value="Mumbai" /></Field>
            <Field label="Current Address"><textarea defaultValue="Flat 1402, Orchid Heights, Powai, Mumbai, Maharashtra 400076" /></Field>
            <Field label="Permanent Address"><textarea defaultValue="45 Green Park Road, Jaipur, Rajasthan 302004" /></Field>
          </FormSection>

          <FormSection id="previous-employment" icon={ClipboardCheck} title="Previous Employment" helper="Prior organization and experience details.">
            <Field label="Company"><TextInput value="Zentra Systems" /></Field>
            <Field label="Role"><TextInput value="Product Engineer" /></Field>
            <Field label="Start Year"><TextInput value="2020" /></Field>
            <Field label="End Year"><TextInput value="2022" /></Field>
            <Field label="Summary"><textarea defaultValue="Built internal workflow tools and employee self-service modules." /></Field>
          </FormSection>

          <FormSection id="documents" icon={FileCheck2} title="Documents" helper="Document metadata and verification status.">
            <Field label="Aadhaar Card"><SelectInput value="Verified" options={['Pending', 'Verified', 'Rejected', 'Expired']} /></Field>
            <Field label="PAN Card"><SelectInput value="Verified" options={['Pending', 'Verified', 'Rejected', 'Expired']} /></Field>
            <Field label="Offer Letter"><SelectInput value="Signed" options={['Pending', 'Signed', 'Missing']} /></Field>
            <Field label="Experience Letter"><SelectInput value="Pending" options={['Pending', 'Verified', 'Missing']} /></Field>
          </FormSection>

          <FormSection id="bank-details" icon={Banknote} title="Bank Details" helper="Salary account details with sensitive values masked by default.">
            <Field label="Bank Name"><SelectInput value="HDFC Bank" options={['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'State Bank of India']} /></Field>
            <Field label="Account Type"><SelectInput value="Salary Account" options={['Salary Account', 'Savings Account', 'Current Account']} /></Field>
            <Field label="Account Number"><TextInput value="•••• •••• 7421" /></Field>
            <Field label="IFSC Code"><TextInput value="HDFC0001234" /></Field>
          </FormSection>

          <FormSection id="statutory-details" icon={IdCard} title="Statutory Details" helper="Government and statutory identifiers.">
            <Field label="PAN"><TextInput value="ABCDE••••F" /></Field>
            <Field label="Aadhaar"><TextInput value="•••• •••• 3921" /></Field>
            <Field label="UAN"><TextInput value="1004•••••921" /></Field>
            <Field label="PF Number"><TextInput value="MH/BAN/••••/042" /></Field>
          </FormSection>

          <FormSection id="education-details" icon={GraduationCap} title="Education Details" helper="Highest qualifications and institution history.">
            <Field label="Qualification"><TextInput value="B.Tech Computer Science" /></Field>
            <Field label="Institution"><TextInput value="VJTI Mumbai" /></Field>
            <Field label="Start Year"><TextInput value="2013" /></Field>
            <Field label="End Year"><TextInput value="2017" /></Field>
          </FormSection>

          <FormSection id="salary-details" icon={CircleDollarSign} title="Salary Details" helper="Compensation summary fields. No payroll calculations here.">
            <Field label="Annual CTC"><TextInput value="₹24,00,000" /></Field>
            <Field label="Monthly Gross"><TextInput value="₹2,00,000" /></Field>
            <Field label="Pay Frequency"><SelectInput value="Monthly" options={['Monthly', 'Bi-weekly', 'Weekly']} /></Field>
            <Field label="Effective From"><TextInput type="date" value="2026-04-01" /></Field>
          </FormSection>
        </div>
        </section>
        {toast && <button className="toast" type="button" onClick={() => setToast('')}>{toast}</button>}
      </section>
    </main>
  );
}
