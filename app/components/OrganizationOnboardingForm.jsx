'use client';

import { useMemo, useState } from 'react';
import { Building2, Check } from 'lucide-react';
import { createCompany } from '../lib/hrmsApi';

const moduleOptions = ['Core HR', 'Leave Management', 'Attendance', 'Payroll', 'Recruitment', 'Onboarding', 'Performance Management', 'Documents'];
const steps = [
  { id: 'organization', label: 'Organization' },
  { id: 'admin', label: 'Admin' },
  { id: 'access', label: 'Access Limits' },
  { id: 'modules', label: 'Modules' },
  { id: 'status', label: 'Status' },
  { id: 'billing', label: 'Billing' }
];

const initialForm = {
  name: '',
  code: '',
  legalName: '',
  industry: '',
  companySize: '',
  domain: '',
  country: 'India',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  dateFormat: 'DD MMM YYYY',
  logoUrl: '',
  adminFirstName: '',
  adminLastName: '',
  orgAdminEmail: '',
  phone: '',
  designation: '',
  role: 'Organization Super Admin',
  sendInvitation: true,
  accessStartDate: '2026-09-06',
  accessEndDate: '2027-09-05',
  maxEmployees: '500',
  maxAdminUsers: '10',
  billingCycle: 'Annual',
  contractReference: '',
  modules: ['Core HR'],
  organizationStatus: 'Active',
  environment: 'Production',
  billingSameAsOrganization: true,
  billingContactName: '',
  billingEmail: '',
  taxId: '',
  billingAddress: '',
  billingCity: '',
  billingState: '',
  billingCountry: 'India',
  postalCode: '',
  poNumber: '',
  orgAdminPassword: 'Password@123'
};

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function codeFromName(value) {
  return value.toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 18);
}

function SwitchControl({ checked, label, onClick }) {
  return (
    <button
      className={`tenant-switch ${checked ? 'checked' : ''}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <span className="tenant-switch-track">
        <span className="tenant-switch-thumb" />
      </span>
    </button>
  );
}

function fieldError(formState, field) {
  const messages = {
    name: 'Organization name is required.',
    code: 'Organization code is required.',
    country: 'Country is required.',
    timezone: 'Time zone is required.',
    currency: 'Default currency is required.',
    adminFirstName: 'First name is required.',
    adminLastName: 'Last name is required.',
    orgAdminEmail: 'Work email is required.',
    accessStartDate: 'Access start date is required.',
    maxEmployees: 'Maximum employees is required.'
  };
  return !String(formState[field] || '').trim() ? messages[field] : '';
}

export default function OrganizationOnboardingForm({ onCreated }) {
  const [formState, setFormState] = useState(initialForm);
  const [activeStep, setActiveStep] = useState('organization');
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const requiredErrors = useMemo(() => ({
    name: fieldError(formState, 'name'),
    code: fieldError(formState, 'code'),
    country: fieldError(formState, 'country'),
    timezone: fieldError(formState, 'timezone'),
    currency: fieldError(formState, 'currency'),
    adminFirstName: fieldError(formState, 'adminFirstName'),
    adminLastName: fieldError(formState, 'adminLastName'),
    orgAdminEmail: fieldError(formState, 'orgAdminEmail'),
    accessStartDate: fieldError(formState, 'accessStartDate'),
    maxEmployees: fieldError(formState, 'maxEmployees')
  }), [formState]);

  const canSubmit = Object.values(requiredErrors).every((error) => !error) && formState.modules.length > 0;
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);
  const isReviewStep = activeStep === 'review';

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && !current.code ? { code: codeFromName(value) } : {})
    }));
  }

  function stepComplete(stepId) {
    if (stepId === 'organization') return !requiredErrors.name && !requiredErrors.code && !requiredErrors.country && !requiredErrors.timezone && !requiredErrors.currency;
    if (stepId === 'admin') return !requiredErrors.adminFirstName && !requiredErrors.adminLastName && !requiredErrors.orgAdminEmail;
    if (stepId === 'access') return !requiredErrors.accessStartDate && !requiredErrors.maxEmployees;
    if (stepId === 'modules') return formState.modules.length > 0;
    if (stepId === 'status') return Boolean(formState.organizationStatus);
    return stepId === 'billing';
  }

  function markAllRequiredTouched() {
    setTouched({
      name: true,
      code: true,
      country: true,
      timezone: true,
      currency: true,
      adminFirstName: true,
      adminLastName: true,
      orgAdminEmail: true,
      accessStartDate: true,
      maxEmployees: true
    });
  }

  function toggleModule(moduleName) {
    setFormState((current) => ({
      ...current,
      modules: current.modules.includes(moduleName)
        ? current.modules.filter((module) => module !== moduleName)
        : [...current.modules, moduleName]
    }));
  }

  function goBack() {
    if (isReviewStep) {
      setActiveStep('billing');
      return;
    }
    if (activeStepIndex > 0) setActiveStep(steps[activeStepIndex - 1].id);
  }

  function goNext() {
    if (activeStepIndex < steps.length - 1) {
      setActiveStep(steps[activeStepIndex + 1].id);
      return;
    }
    markAllRequiredTouched();
    setActiveStep('review');
  }

  async function submitCompany(event) {
    event.preventDefault();
    markAllRequiredTouched();
    if (!isReviewStep) {
      setActiveStep('review');
      return;
    }
    if (!canSubmit || isSubmitting) {
      setMessage('Complete the required onboarding fields before creating the organization.');
      return;
    }

    try {
      setIsSubmitting(true);
      const company = await createCompany({
        name: formState.name,
        slug: slugify(formState.code),
        domain: formState.domain || undefined,
        country: formState.country,
        timezone: formState.timezone,
        logoUrl: formState.logoUrl || undefined,
        hrContactEmail: formState.orgAdminEmail,
        legalName: formState.legalName || undefined,
        adminFirstName: formState.adminFirstName,
        adminLastName: formState.adminLastName,
        adminPhone: formState.phone || undefined,
        adminDesignation: formState.designation || undefined,
        adminRole: formState.role,
        orgAdminEmail: formState.orgAdminEmail,
        orgAdminPassword: formState.orgAdminPassword
      });
      setMessage(`Created ${company.name} and first organization admin.`);
      if (onCreated) onCreated(company);
    } catch (error) {
      setMessage(error.message || 'Unable to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="tenant-onboard-page">
      <style>{`
        .tenant-onboard-page {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          min-height: 620px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-white);
          box-shadow: var(--shadow-xs);
          overflow: hidden;
        }

        .tenant-stepnav {
          border-right: 1px solid var(--color-border);
          background: #f8fafc;
          padding: 18px 14px;
        }

        .tenant-stepnav ol {
          display: grid;
          gap: 4px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .tenant-stepnav button {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          width: 100%;
          min-height: 38px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--color-neutral-700);
          padding: 0 8px;
          text-align: left;
        }

        .tenant-stepnav button:hover,
        .tenant-stepnav button.active {
          background: #e7edf4;
          color: #102a43;
        }

        .tenant-step-number {
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: var(--color-white);
          font-size: 11px;
          font-weight: 900;
        }

        .tenant-stepnav button.complete .tenant-step-number,
        .tenant-stepnav button.active .tenant-step-number {
          border-color: #102a43;
          background: #102a43;
          color: var(--color-white);
        }

        .tenant-step-label {
          overflow-wrap: anywhere;
          font-size: 12px;
          font-weight: 900;
        }

        .tenant-form {
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          min-width: 0;
        }

        .tenant-form-body {
          width: min(100%, 820px);
          padding: 22px 26px 28px;
        }

        .tenant-section {
          display: grid;
          gap: 16px;
        }

        .tenant-section-header {
          display: grid;
          gap: 4px;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 12px;
        }

        .tenant-section-header h3 {
          margin: 0;
          color: #111827;
          font-size: 20px;
          line-height: 1.2;
        }

        .tenant-section-header p,
        .tenant-helper {
          margin: 0;
          color: var(--color-neutral-500);
        }

        .tenant-field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px 14px;
        }

        .tenant-field,
        .tenant-toggle-row {
          display: grid;
          gap: 5px;
        }

        .tenant-field.full,
        .tenant-toggle-row {
          grid-column: 1 / -1;
        }

        .tenant-field span,
        .tenant-small-label {
          color: var(--color-neutral-700);
          font-size: 12px;
          font-weight: 900;
        }

        .tenant-field input,
        .tenant-field select,
        .tenant-field textarea {
          min-height: 38px;
          border-color: #cbd5e1;
          border-radius: 6px;
        }

        .tenant-field textarea {
          min-height: 74px;
        }

        .tenant-error {
          min-height: 16px;
          color: var(--color-error);
          font-size: 11px;
          font-weight: 800;
        }

        .tenant-toggle-row {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          border-top: 1px solid var(--color-border);
          padding-top: 12px;
        }

        .tenant-toggle {
          display: grid;
          place-items: center;
        }

        .tenant-switch {
          display: inline-grid;
          place-items: center;
          width: 44px;
          height: 26px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          padding: 0;
        }

        .tenant-switch-track {
          position: relative;
          display: block;
          width: 40px;
          height: 22px;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #e5e7eb;
          transition: background 160ms ease, border-color 160ms ease;
        }

        .tenant-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: var(--color-white);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
          transition: transform 160ms ease;
        }

        .tenant-switch.checked .tenant-switch-track {
          border-color: #102a43;
          background: #102a43;
        }

        .tenant-switch.checked .tenant-switch-thumb {
          transform: translateX(18px);
        }

        .tenant-switch:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 3px;
        }

        .tenant-modules {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .tenant-module {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 48px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: var(--color-white);
          color: var(--color-neutral-700);
          padding: 0 12px;
          font-weight: 900;
        }

        .tenant-module.enabled {
          border-color: #102a43;
          background: #f8fafc;
          color: #102a43;
        }

        .tenant-status-help,
        .tenant-review-block {
          display: grid;
          gap: 7px;
          border-top: 1px solid var(--color-border);
          padding-top: 12px;
        }

        .tenant-status-help div,
        .tenant-review-row {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 12px;
        }

        .tenant-status-help strong,
        .tenant-review-row span {
          color: var(--color-neutral-700);
          font-size: 12px;
        }

        .tenant-review-grid {
          display: grid;
          gap: 10px;
        }

        .tenant-review-block h4 {
          margin: 0;
          font-size: 15px;
        }

        .tenant-review-row strong {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .tenant-form-actions {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid var(--color-border);
          background: var(--color-white);
          padding: 14px 20px;
        }

        .tenant-form-actions > div {
          display: flex;
          gap: 8px;
        }

        .tenant-form-actions .btn-primary {
          background: #102a43;
          box-shadow: 0 8px 18px rgba(16, 42, 67, 0.16);
        }

        .tenant-form-actions .btn-primary:hover {
          background: #0b1f33;
        }

        .tenant-message {
          color: var(--color-neutral-700);
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .tenant-onboard-page {
            grid-template-columns: 1fr;
          }

          .tenant-stepnav {
            border-right: 0;
            border-bottom: 1px solid var(--color-border);
            overflow-x: auto;
          }

          .tenant-stepnav ol {
            grid-auto-flow: column;
            grid-auto-columns: minmax(150px, 1fr);
          }
        }

        @media (max-width: 760px) {
          .tenant-field-grid,
          .tenant-modules {
            grid-template-columns: 1fr;
          }

          .tenant-form-actions,
          .tenant-form-actions > div {
            display: grid;
            grid-template-columns: 1fr;
          }

          .tenant-form-actions .btn {
            width: 100%;
          }

          .tenant-form-body {
            padding: 18px;
          }
        }
      `}</style>

      <nav className="tenant-stepnav" aria-label="Onboard organization steps">
        <ol>
          {steps.map((step, index) => (
            <li key={step.id}>
              <button
                className={`${activeStep === step.id ? 'active' : ''} ${stepComplete(step.id) ? 'complete' : ''}`}
                type="button"
                onClick={() => setActiveStep(step.id)}
              >
                <span className="tenant-step-number">{stepComplete(step.id) ? <Check size={13} /> : index + 1}</span>
                <span className="tenant-step-label">{step.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <form className="tenant-form" onSubmit={submitCompany}>
        <div className="tenant-form-body">
          {activeStep === 'organization' && (
            <FormSection title="Organization Details" copy="Define the tenant identity and operating locale.">
              <div className="tenant-field-grid">
                <Field required label="Organization Name" value={formState.name} error={touched.name && requiredErrors.name} onBlur={() => setTouched((current) => ({ ...current, name: true }))} onChange={(value) => updateField('name', value)} />
                <Field required label="Organization Code" value={formState.code} error={touched.code && requiredErrors.code} onBlur={() => setTouched((current) => ({ ...current, code: true }))} onChange={(value) => updateField('code', codeFromName(value))} />
                <Field label="Legal Company Name" value={formState.legalName} onChange={(value) => updateField('legalName', value)} />
                <SelectField label="Industry" value={formState.industry} onChange={(value) => updateField('industry', value)} options={['', 'Media', 'Technology', 'Financial Services', 'Manufacturing', 'Retail', 'Healthcare']} />
                <SelectField label="Company Size" value={formState.companySize} onChange={(value) => updateField('companySize', value)} options={['', '1-50', '51-200', '201-500', '501-1000', '1000+']} />
                <Field label="Domain" value={formState.domain} onChange={(value) => updateField('domain', value)} placeholder="example.com" />
                <Field required label="Country" value={formState.country} error={touched.country && requiredErrors.country} onBlur={() => setTouched((current) => ({ ...current, country: true }))} onChange={(value) => updateField('country', value)} />
                <Field required label="Time Zone" value={formState.timezone} error={touched.timezone && requiredErrors.timezone} onBlur={() => setTouched((current) => ({ ...current, timezone: true }))} onChange={(value) => updateField('timezone', value)} />
                <SelectField required label="Default Currency" value={formState.currency} error={touched.currency && requiredErrors.currency} onBlur={() => setTouched((current) => ({ ...current, currency: true }))} onChange={(value) => updateField('currency', value)} options={['INR', 'USD', 'EUR', 'GBP', 'AED']} />
                <SelectField label="Date Format" value={formState.dateFormat} onChange={(value) => updateField('dateFormat', value)} options={['DD MMM YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} />
                <Field className="full" label="Organization Logo" value={formState.logoUrl} onChange={(value) => updateField('logoUrl', value)} placeholder="Logo URL" />
              </div>
            </FormSection>
          )}

          {activeStep === 'admin' && (
            <FormSection title="Primary Organization Admin" copy="Create the organization's first Super Admin.">
              <div className="tenant-field-grid">
                <Field required label="First Name" value={formState.adminFirstName} error={touched.adminFirstName && requiredErrors.adminFirstName} onBlur={() => setTouched((current) => ({ ...current, adminFirstName: true }))} onChange={(value) => updateField('adminFirstName', value)} />
                <Field required label="Last Name" value={formState.adminLastName} error={touched.adminLastName && requiredErrors.adminLastName} onBlur={() => setTouched((current) => ({ ...current, adminLastName: true }))} onChange={(value) => updateField('adminLastName', value)} />
                <Field required label="Work Email" value={formState.orgAdminEmail} error={touched.orgAdminEmail && requiredErrors.orgAdminEmail} onBlur={() => setTouched((current) => ({ ...current, orgAdminEmail: true }))} onChange={(value) => updateField('orgAdminEmail', value)} placeholder="admin@example.com" type="email" />
                <Field label="Phone Number" value={formState.phone} onChange={(value) => updateField('phone', value)} />
                <Field label="Designation" value={formState.designation} onChange={(value) => updateField('designation', value)} />
                <Field label="Role" value={formState.role} onChange={(value) => updateField('role', value)} />
                <div className="tenant-toggle-row">
                  <div>
                    <span className="tenant-small-label">Send invitation email after organization creation</span>
                    <p className="tenant-helper">The administrator will receive an invitation to activate their account and set their password.</p>
                  </div>
                  <SwitchControl checked={formState.sendInvitation} label="Send invitation email after organization creation" onClick={() => updateField('sendInvitation', !formState.sendInvitation)} />
                </div>
              </div>
            </FormSection>
          )}

          {activeStep === 'access' && (
            <FormSection title="License & Access Limits" copy="Manually define allowed usage for this organization.">
              <div className="tenant-field-grid">
                <Field required label="Access Start Date" value={formState.accessStartDate} error={touched.accessStartDate && requiredErrors.accessStartDate} onBlur={() => setTouched((current) => ({ ...current, accessStartDate: true }))} onChange={(value) => updateField('accessStartDate', value)} type="date" />
                <Field label="Access End / Renewal Date" value={formState.accessEndDate} onChange={(value) => updateField('accessEndDate', value)} type="date" />
                <Field required label="Maximum Employees" value={formState.maxEmployees} error={touched.maxEmployees && requiredErrors.maxEmployees} onBlur={() => setTouched((current) => ({ ...current, maxEmployees: true }))} onChange={(value) => updateField('maxEmployees', value)} type="number" />
                <Field label="Maximum Admin Users" value={formState.maxAdminUsers} onChange={(value) => updateField('maxAdminUsers', value)} type="number" />
                <SelectField label="Billing Cycle" value={formState.billingCycle} onChange={(value) => updateField('billingCycle', value)} options={['Monthly', 'Quarterly', 'Annual', 'Not Applicable']} />
                <Field label="Contract / Agreement Reference" value={formState.contractReference} onChange={(value) => updateField('contractReference', value)} />
              </div>
            </FormSection>
          )}

          {activeStep === 'modules' && (
            <FormSection title="Module Access" copy="Select which purchased HRMS modules this organization can use.">
              <div className="tenant-modules">
                {moduleOptions.map((moduleName) => (
                  <button
                    className={`tenant-module ${formState.modules.includes(moduleName) ? 'enabled' : ''}`}
                    type="button"
                    role="switch"
                    aria-checked={formState.modules.includes(moduleName)}
                    key={moduleName}
                    onClick={() => toggleModule(moduleName)}
                  >
                    <span>{moduleName}</span>
                    <span className={`tenant-switch ${formState.modules.includes(moduleName) ? 'checked' : ''}`} aria-hidden="true">
                      <span className="tenant-switch-track">
                        <span className="tenant-switch-thumb" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {formState.modules.length === 0 && <p className="tenant-error">Enable at least one module.</p>}
            </FormSection>
          )}

          {activeStep === 'status' && (
            <FormSection title="Organization Status" copy="Set the operating state and environment for this tenant.">
              <div className="tenant-field-grid">
                <SelectField label="Organization Status" value={formState.organizationStatus} onChange={(value) => updateField('organizationStatus', value)} options={['Trial', 'Active', 'Suspended', 'Inactive']} />
                <SelectField label="Environment" value={formState.environment} onChange={(value) => updateField('environment', value)} options={['Production', 'Demo / Sandbox']} />
              </div>
              <div className="tenant-status-help">
                <div><strong>Active</strong><span>Organization and users can access the platform.</span></div>
                <div><strong>Trial</strong><span>Temporary evaluation access.</span></div>
                <div><strong>Suspended</strong><span>Organization access is temporarily blocked.</span></div>
                <div><strong>Inactive</strong><span>Organization is no longer operational.</span></div>
              </div>
            </FormSection>
          )}

          {activeStep === 'billing' && (
            <FormSection title="Billing Details" copy="Optional billing information for MVP.">
              <div className="tenant-field-grid">
                <div className="tenant-toggle-row">
                  <div>
                    <span className="tenant-small-label">Billing details same as organization details</span>
                    <p className="tenant-helper">Use the organization country and primary admin email as billing defaults.</p>
                  </div>
                  <SwitchControl checked={formState.billingSameAsOrganization} label="Billing details same as organization details" onClick={() => updateField('billingSameAsOrganization', !formState.billingSameAsOrganization)} />
                </div>
                <Field label="Billing Contact Name" value={formState.billingContactName} onChange={(value) => updateField('billingContactName', value)} />
                <Field label="Billing Email" value={formState.billingEmail} onChange={(value) => updateField('billingEmail', value)} type="email" />
                <Field label="GST / Tax ID" value={formState.taxId} onChange={(value) => updateField('taxId', value)} />
                <Field label="PO / Contract Number" value={formState.poNumber} onChange={(value) => updateField('poNumber', value)} />
                <Field className="full" label="Billing Address" value={formState.billingAddress} onChange={(value) => updateField('billingAddress', value)} multiline />
                <Field label="City" value={formState.billingCity} onChange={(value) => updateField('billingCity', value)} />
                <Field label="State" value={formState.billingState} onChange={(value) => updateField('billingState', value)} />
                <Field label="Country" value={formState.billingCountry} onChange={(value) => updateField('billingCountry', value)} />
                <Field label="Postal Code" value={formState.postalCode} onChange={(value) => updateField('postalCode', value)} />
              </div>
            </FormSection>
          )}

          {activeStep === 'review' && (
            <FormSection title="Review & Create" copy="Confirm the organization setup before provisioning the tenant.">
              <div className="tenant-review-grid">
                <ReviewBlock title="Organization" rows={[['Name', formState.name || '-'], ['Code', formState.code || '-'], ['Country', formState.country || '-']]} />
                <ReviewBlock title="Administrator" rows={[['Name', `${formState.adminFirstName} ${formState.adminLastName}`.trim() || '-'], ['Email', formState.orgAdminEmail || '-']]} />
                <ReviewBlock title="Access" rows={[['Start Date', formState.accessStartDate || '-'], ['End Date', formState.accessEndDate || '-'], ['Employee Limit', formState.maxEmployees || '-'], ['Admin Limit', formState.maxAdminUsers || '-']]} />
                <ReviewBlock title="Modules" rows={[['Enabled modules', formState.modules.join(', ') || '-']]} />
                <ReviewBlock title="Status" rows={[['Organization Status', formState.organizationStatus || '-']]} />
              </div>
            </FormSection>
          )}
        </div>

        <div className="tenant-form-actions">
          <button className="btn btn-secondary" type="button" onClick={() => setMessage('Draft onboarding is planned for the next backend milestone.')}>Save as Draft</button>
          <div>
            {(isReviewStep || activeStepIndex > 0) && <button className="btn btn-secondary" type="button" onClick={goBack}>Back</button>}
            <a className="btn btn-secondary" href="/platform-admin/companies">Cancel</a>
            {isReviewStep ? (
              <button className="btn btn-primary" type="submit" disabled={!canSubmit || isSubmitting}>
                <Building2 size={16} />
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={goNext}>{activeStep === 'billing' ? 'Review & Create' : 'Continue'}</button>
            )}
          </div>
          {message && <span className="tenant-message">{message}</span>}
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, copy, children }) {
  return (
    <section className="tenant-section">
      <header className="tenant-section-header">
        <h3>{title}</h3>
        <p>{copy}</p>
      </header>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, onBlur, placeholder = '', type = 'text', required = false, error = '', className = '', multiline = false }) {
  return (
    <label className={`tenant-field ${className}`}>
      <span>{label}{required ? ' *' : ''}</span>
      {multiline ? (
        <textarea value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
      <small className="tenant-error">{error || ''}</small>
    </label>
  );
}

function SelectField({ label, value, onChange, onBlur, required = false, error = '', options = [] }) {
  return (
    <label className="tenant-field">
      <span>{label}{required ? ' *' : ''}</span>
      <select value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option} key={option || 'blank'}>{option || 'Select'}</option>
        ))}
      </select>
      <small className="tenant-error">{error || ''}</small>
    </label>
  );
}

function ReviewBlock({ title, rows }) {
  return (
    <section className="tenant-review-block">
      <h4>{title}</h4>
      {rows.map(([label, value]) => (
        <div className="tenant-review-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
