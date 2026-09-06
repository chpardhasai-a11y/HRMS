'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import AdminSideNavigation from '../../components/AdminSideNavigation';
import { createCompany, getActiveCompanyId, getCompanies, setActiveCompanyId } from '../../lib/hrmsApi';

const initialForm = {
  name: '',
  slug: '',
  domain: '',
  country: 'India',
  timezone: 'Asia/Kolkata',
  hrContactEmail: ''
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [formState, setFormState] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [activeCompanyId, setActiveCompanyIdState] = useState('');

  useEffect(() => {
    setActiveCompanyIdState(getActiveCompanyId() || '');
    loadCompanies();
  }, []);

  const canSubmit = useMemo(() => formState.name.trim() && formState.slug.trim(), [formState.name, formState.slug]);

  async function loadCompanies() {
    try {
      setIsLoading(true);
      const companyList = await getCompanies();
      setCompanies(companyList);
      const storedCompanyId = getActiveCompanyId();
      const nextCompanyId = storedCompanyId || companyList[0]?.id || '';
      if (nextCompanyId) {
        setActiveCompanyId(nextCompanyId);
        setActiveCompanyIdState(nextCompanyId);
      }
    } catch (error) {
      setToast(error.message || 'Unable to load companies.');
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && !current.slug ? { slug: slugify(value) } : {})
    }));
  }

  async function submitCompany(event) {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      const company = await createCompany({
        name: formState.name,
        slug: formState.slug,
        domain: formState.domain || undefined,
        country: formState.country,
        timezone: formState.timezone,
        hrContactEmail: formState.hrContactEmail || undefined
      });
      setToast(`Created ${formState.name}.`);
      setActiveCompanyId(company.id);
      setActiveCompanyIdState(company.id);
      setFormState(initialForm);
      await loadCompanies();
    } catch (error) {
      setToast(error.message || 'Unable to create company.');
    }
  }

  function selectCompany(company) {
    setActiveCompanyId(company.id);
    setActiveCompanyIdState(company.id);
    setToast(`${company.name} selected for admin management.`);
  }

  return (
    <main className="app-shell-with-nav">
      <AdminSideNavigation activePath="/admin/companies" />
      <section className="employee-master-workspace">
        <style>{`
          .company-admin-shell {
            display: grid;
            gap: 16px;
            max-width: 1280px;
            margin: 0 auto;
          }

          .employee-master-workspace {
            min-width: 0;
            padding: 20px;
            background: var(--color-page);
          }

          .company-admin-header,
          .company-admin-grid,
          .company-card,
          .company-form {
            min-width: 0;
          }

          .company-admin-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .company-admin-header h1 {
            margin-bottom: 6px;
            font-size: 30px;
            line-height: 1.2;
          }

          .company-admin-header p,
          .company-card p {
            margin-bottom: 0;
            color: var(--color-neutral-500);
          }

          .company-admin-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 390px;
            gap: 16px;
          }

          .company-list,
          .company-form {
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

          .panel-copy {
            margin-bottom: 0;
            color: var(--color-neutral-500);
          }

          .company-list-header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }

          .company-list-stack {
            display: grid;
            gap: 10px;
          }

          .company-card {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto auto;
            align-items: center;
            gap: 12px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-white);
            padding: 14px;
          }

          .company-card-icon {
            display: grid;
            place-items: center;
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: var(--color-primary-10);
            color: var(--color-primary);
          }

          .company-card h2 {
            margin: 0 0 4px;
            font-size: 17px;
            line-height: 1.2;
          }

          .company-counts {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            color: var(--color-neutral-500);
            font-size: 12px;
            font-weight: 800;
          }

          .company-active-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            min-height: 28px;
            border-radius: 999px;
            background: #dcfce7;
            color: #15803d;
            padding: 0 10px;
            font-size: 12px;
            font-weight: 800;
          }

          .company-form-grid {
            display: grid;
            gap: 10px;
          }

          .form-field {
            display: grid;
            align-content: center;
            gap: 4px;
            min-height: 62px;
            border: 1px solid var(--color-neutral-300);
            border-radius: 6px;
            background: white;
            color: var(--color-neutral-500);
            padding: 8px 10px;
          }

          .form-field span {
            color: var(--color-neutral-500);
            font-size: 12px;
            font-weight: 800;
          }

          .form-field input {
            min-width: 0;
            width: 100%;
            border: 0;
            background: transparent;
            color: var(--color-neutral-700);
            outline: 0;
          }

          .detail-field {
            display: grid;
            gap: 4px;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            background: #fbfdff;
            padding: 10px;
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
            box-shadow: var(--shadow-lg);
          }

          @media (max-width: 980px) {
            .company-admin-header,
            .company-admin-grid {
              display: grid;
              grid-template-columns: 1fr;
            }

            .employee-master-workspace {
              padding: 12px;
            }
          }
        `}</style>

        <div className="company-admin-shell">
          <header className="company-admin-header">
            <div>
              <p className="eyebrow">Enterprise Setup</p>
              <h1>Company Management</h1>
              <p>Register and manage companies that use this HRMS instance.</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={loadCompanies}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </header>

          <section className="company-admin-grid">
            <div className="card company-list">
              <div className="company-list-header">
                <div>
                  <h2>Companies</h2>
                  <p>{companies.length} registered companies</p>
                </div>
              </div>
              <div className="company-list-stack">
                {isLoading && <div className="detail-field"><strong>Loading companies...</strong></div>}
                {!isLoading && companies.length === 0 && <div className="detail-field"><strong>No companies registered.</strong></div>}
                {companies.map((company) => (
                  <article className="company-card" key={company.id}>
                    <span className="company-card-icon"><Building2 size={19} /></span>
                    <div>
                      <h2>{company.name}</h2>
                      <p>{company.domain || company.slug} · {company.country} · {company.timezone}</p>
                    </div>
                    <div className="company-counts">
                      <span>{company._count?.employees || 0} Employees</span>
                      <span>{company._count?.users || 0} Users</span>
                    </div>
                    {activeCompanyId === company.id ? (
                      <span className="company-active-chip"><CheckCircle2 size={14} />Active</span>
                    ) : (
                      <button className="btn btn-secondary" type="button" onClick={() => selectCompany(company)}>Select</button>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <form className="card company-form" onSubmit={submitCompany}>
              <div className="panel-top">
                <div>
                  <h2>Register Company</h2>
                  <p className="panel-copy">Create a tenant boundary for employees, users and audit logs.</p>
                </div>
              </div>
              <div className="company-form-grid">
                <Field label="Company Name" value={formState.name} onChange={(value) => updateField('name', value)} />
                <Field label="Slug" value={formState.slug} onChange={(value) => updateField('slug', slugify(value))} />
                <Field label="Domain" value={formState.domain} onChange={(value) => updateField('domain', value)} placeholder="example.com" />
                <Field label="Country" value={formState.country} onChange={(value) => updateField('country', value)} />
                <Field label="Timezone" value={formState.timezone} onChange={(value) => updateField('timezone', value)} />
                <Field label="HR Contact Email" value={formState.hrContactEmail} onChange={(value) => updateField('hrContactEmail', value)} placeholder="hr@example.com" />
                <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
                  <Plus size={16} />
                  Add Company
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
      {toast && <button className="toast" type="button" onClick={() => setToast('')}>{toast}</button>}
    </main>
  );
}

function Field({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
