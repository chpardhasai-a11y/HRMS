'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2,
  CreditCard,
  KeyRound,
  Layers3,
  ShieldBan,
  ShieldCheck,
  Trash2,
  UserCheck
} from 'lucide-react';
import AdminRouteGuard from '../../../components/AdminRouteGuard';
import Breadcrumbs from '../../../components/Breadcrumbs';
import PlatformAdminSideNavigation from '../../../components/PlatformAdminSideNavigation';
import { deleteCompany, formatDate, getCompanyById } from '../../../lib/hrmsApi';

const detailTabs = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'admin', label: 'Admin', icon: UserCheck },
  { id: 'access', label: 'Access Limits', icon: KeyRound },
  { id: 'modules', label: 'Modules', icon: Layers3 },
  { id: 'status', label: 'Status', icon: ShieldCheck },
  { id: 'billing', label: 'Billing', icon: CreditCard }
];

const allModules = [
  'Core HR',
  'Leave Management',
  'Attendance',
  'Payroll',
  'Recruitment',
  'Onboarding',
  'Performance Management',
  'Documents'
];

export default function ViewCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id;

  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('organization');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCompanyDetails(companyId);
    }
  }, [companyId]);

  async function loadCompanyDetails(id) {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const data = await getCompanyById(id);
      setCompany(data);
    } catch (error) {
      setErrorMsg(error.message || 'Unable to load organization details.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminRouteGuard allowedRole="platform_admin">
      <main className="app-shell-with-nav">
        <PlatformAdminSideNavigation activePath="/platform-admin/companies" />
        <section className="platform-tenant-workspace">
          <style>{`
            .platform-tenant-workspace {
              min-width: 0;
              min-height: 100vh;
              padding: 22px;
              background: #f8fafc;
            }

            .tenant-view-shell {
              display: grid;
              gap: 16px;
              max-width: 1200px;
              margin: 0 auto;
            }

            .tenant-view-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 1px solid var(--color-border);
              padding-bottom: 16px;
            }

            .tenant-view-header h1 {
              margin: 4px 0 0;
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.2;
            }

            .tenant-header-meta {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-top: 4px;
            }

            .tenant-chip {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              min-height: 26px;
              border-radius: var(--radius-pill);
              padding: 0 10px;
              font-size: 12px;
              font-weight: 800;
            }

            .tenant-chip-ok {
              background: #dcfce7;
              color: #15803d;
            }

            .tenant-chip-muted {
              background: var(--color-neutral-100);
              color: var(--color-neutral-700);
            }

            .tenant-page-container {
              display: grid;
              grid-template-columns: 240px minmax(0, 1fr);
              min-height: 600px;
              border: 1px solid var(--color-border);
              border-radius: 8px;
              background: var(--color-white);
              box-shadow: var(--shadow-xs);
              overflow: hidden;
            }

            .tenant-page-sidenav {
              border-right: 1px solid var(--color-border);
              background: #f8fafc;
              padding: 20px 14px;
            }

            .tenant-page-sidenav ol {
              display: grid;
              gap: 4px;
              margin: 0;
              padding: 0;
              list-style: none;
            }

            .tenant-page-sidenav button {
              display: grid;
              grid-template-columns: 24px minmax(0, 1fr);
              align-items: center;
              gap: 10px;
              width: 100%;
              min-height: 42px;
              border: 0;
              border-radius: 6px;
              background: transparent;
              color: var(--color-neutral-700);
              padding: 0 12px;
              text-align: left;
              cursor: pointer;
              transition: all 140ms ease;
            }

            .tenant-page-sidenav button:hover {
              background: #e2e8f0;
              color: #102a43;
            }

            .tenant-page-sidenav button.active {
              background: #102a43;
              color: #ffffff;
              font-weight: 700;
              box-shadow: 0 4px 12px rgba(16, 42, 67, 0.16);
            }

            .tenant-page-content {
              padding: 26px 32px 36px;
              overflow-y: auto;
              background: #ffffff;
            }

            .tenant-section {
              display: grid;
              gap: 20px;
            }

            .tenant-section-header {
              display: grid;
              gap: 4px;
              border-bottom: 1px solid var(--color-border);
              padding-bottom: 14px;
            }

            .tenant-section-header h3 {
              margin: 0;
              color: #0f172a;
              font-size: 20px;
              font-weight: 800;
              line-height: 1.2;
            }

            .tenant-section-header p {
              margin: 0;
              color: var(--color-neutral-500);
              font-size: 13px;
            }

            .tenant-field-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px 16px;
            }

            .tenant-display-field {
              display: grid;
              gap: 4px;
              padding: 12px 14px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background: #f8fafc;
            }

            .tenant-display-field.full {
              grid-column: 1 / -1;
            }

            .tenant-display-field label {
              color: var(--color-neutral-500);
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }

            .tenant-display-field div {
              color: #0f172a;
              font-size: 14px;
              font-weight: 700;
              overflow-wrap: anywhere;
            }

            .tenant-modules-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }

            .tenant-module-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              min-height: 52px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background: #ffffff;
              padding: 0 14px;
              font-weight: 800;
              font-size: 13px;
              color: #334155;
            }

            .tenant-module-card.enabled {
              border-color: #102a43;
              background: #f0f6fc;
              color: #102a43;
            }

            .tenant-switch-indicator {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 22px;
              border-radius: 999px;
              background: #e2e8f0;
              position: relative;
            }

            .tenant-switch-indicator.checked {
              background: #102a43;
            }

            .tenant-switch-indicator .knob {
              width: 16px;
              height: 16px;
              border-radius: 999px;
              background: #ffffff;
              position: absolute;
              left: 3px;
              transition: transform 160ms ease;
            }

            .tenant-switch-indicator.checked .knob {
              transform: translateX(16px);
            }

            .tenant-usage-box {
              display: grid;
              gap: 14px;
              padding: 16px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background: #f8fafc;
            }

            .tenant-usage-row {
              display: grid;
              grid-template-columns: 140px minmax(0, 1fr) auto;
              align-items: center;
              gap: 12px;
            }

            .tenant-usage-row strong {
              font-size: 13px;
              color: #0f172a;
            }

            .tenant-usage-track {
              height: 10px;
              overflow: hidden;
              border-radius: var(--radius-pill);
              background: #e2e8f0;
            }

            .tenant-usage-track span {
              display: block;
              height: 100%;
              border-radius: inherit;
              background: #102a43;
            }

            .tenant-status-guide {
              display: grid;
              gap: 10px;
              padding: 14px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background: #f8fafc;
            }

            .tenant-status-guide-item {
              display: grid;
              grid-template-columns: 120px minmax(0, 1fr);
              gap: 12px;
              font-size: 13px;
            }

            .tenant-status-guide-item strong {
              color: #0f172a;
            }

            .tenant-status-guide-item span {
              color: var(--color-neutral-600);
            }

            .tenant-empty {
              border: 1px dashed var(--color-border);
              border-radius: 8px;
              color: var(--color-neutral-500);
              padding: 24px;
              text-align: center;
            }

            @media (max-width: 900px) {
              .tenant-page-container {
                grid-template-columns: 1fr;
              }

              .tenant-page-sidenav {
                border-right: 0;
                border-bottom: 1px solid var(--color-border);
                overflow-x: auto;
              }

              .tenant-page-sidenav ol {
                grid-auto-flow: column;
                grid-auto-columns: minmax(140px, 1fr);
              }

              .tenant-field-grid,
              .tenant-modules-grid {
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          <div className="tenant-view-shell">
            <header className="tenant-view-header">
              <div>
                <Breadcrumbs
                  items={[
                    { label: 'Platform Admin', href: '/platform-admin' },
                    { label: 'Tenant Management', href: '/platform-admin/companies' },
                    { label: company ? company.name : 'View Organization' }
                  ]}
                />
                <div className="tenant-header-meta">
                  <h1>{company ? company.name : 'Loading Organization...'}</h1>
                  {company && (
                    <span className={`tenant-chip ${company.isActive ? 'tenant-chip-ok' : 'tenant-chip-muted'}`}>
                      {company.isActive ? <ShieldCheck size={14} /> : <ShieldBan size={14} />}
                      {company.isActive ? 'Active' : 'Suspended'}
                    </span>
                  )}
                </div>
              </div>

              {company && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(true)}
                  style={{ color: '#dc2626', borderColor: '#dc2626', gap: '8px' }}
                >
                  <Trash2 size={16} />
                  <span>Delete Organization</span>
                </button>
              )}
            </header>

            {showDeleteModal && company && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.6)', display: 'grid', placeItems: 'center', padding: '16px' }}>
                <div className="card" style={{ width: 'min(100%, 440px)', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px', color: '#dc2626' }}>
                    Confirm Organization Deletion
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-neutral-700)', margin: '0 0 20px', lineHeight: '1.5' }}>
                    Are you sure you want to delete <strong>{company.name}</strong> ({company.slug})? This will permanently remove the organization and all its associated employees, users, and data.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn btn-tertiary" onClick={() => setShowDeleteModal(false)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={isDeleting}
                      onClick={async () => {
                        try {
                          setIsDeleting(true);
                          await deleteCompany(company.id);
                          setShowDeleteModal(false);
                          router.push('/platform-admin/companies');
                        } catch (err) {
                          alert(err.message || 'Failed to delete organization');
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      style={{ background: '#dc2626', borderColor: '#dc2626' }}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Organization'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoading && <div className="tenant-empty">Loading organization record...</div>}
            {errorMsg && <div className="tenant-empty" style={{ color: 'var(--color-error)' }}>{errorMsg}</div>}

            {!isLoading && company && (
              <div className="tenant-page-container">
                <nav className="tenant-page-sidenav" aria-label="Organization view tabs">
                  <ol>
                    {detailTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <li key={tab.id}>
                          <button
                            className={activeTab === tab.id ? 'active' : ''}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <span className="tab-icon">
                              <IconComponent size={16} />
                            </span>
                            <span>{tab.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </nav>

                <div className="tenant-page-content">
                  {activeTab === 'organization' && (
                    <div className="tenant-section">
                      <header className="tenant-section-header">
                        <h3>Organization Details</h3>
                        <p>Core tenant identity, domain, and operating localization parameters.</p>
                      </header>
                      <div className="tenant-field-grid">
                        <DisplayField label="Organization Name" value={company.name} />
                        <DisplayField label="Organization Code" value={company.slug} />
                        <DisplayField label="Legal Company Name" value={company.legalName || company.name} />
                        <DisplayField label="Industry" value={company.industry || 'Media & Broadcast'} />
                        <DisplayField label="Company Size" value={company.companySize || '201-500'} />
                        <DisplayField label="Domain" value={company.domain || '-'} />
                        <DisplayField label="Country" value={company.country || 'India'} />
                        <DisplayField label="Time Zone" value={company.timezone || 'Asia/Kolkata'} />
                        <DisplayField label="Default Currency" value={company.currency || 'INR'} />
                        <DisplayField label="Date Format" value={company.dateFormat || 'DD MMM YYYY'} />
                        <DisplayField className="full" label="Organization Logo URL" value={company.logoUrl || 'No logo URL provided'} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'admin' && (
                    <div className="tenant-section">
                      <header className="tenant-section-header">
                        <h3>Primary Organization Admin</h3>
                        <p>Super Administrator assigned to manage this organization's account.</p>
                      </header>
                      <div className="tenant-field-grid">
                        <DisplayField label="Admin Name" value={company.adminName || 'Organization Super Admin'} />
                        <DisplayField label="Work Email" value={company.hrContactEmail || 'admin@nw18.com'} />
                        <DisplayField label="Phone Number" value={company.adminPhone || '+91 98765 43210'} />
                        <DisplayField label="Designation" value={company.adminDesignation || 'Head of People Operations'} />
                        <DisplayField label="Role" value="Organization Super Admin" />
                        <DisplayField label="Invitation Email Status" value="Sent & Verified" />
                      </div>
                    </div>
                  )}

                  {activeTab === 'access' && (
                    <div className="tenant-section">
                      <header className="tenant-section-header">
                        <h3>License & Access Limits</h3>
                        <p>Resource quotas, usage statistics, and active access duration.</p>
                      </header>
                      <div className="tenant-field-grid">
                        <DisplayField label="Access Start Date" value={formatDate(company.createdAt) || '06 Sep 2026'} />
                        <DisplayField label="Access End / Renewal Date" value="05 Sep 2027" />
                        <DisplayField label="Billing Cycle" value="Annual" />
                        <DisplayField label="Contract / Agreement Reference" value={`CONT-${company.slug.toUpperCase()}-2026`} />
                      </div>
                      <div className="tenant-usage-box">
                        <UsageRow label="Employees" current={company._count?.employees || 0} limit={500} />
                        <UsageRow label="Admin Users" current={company._count?.users || 0} limit={10} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'modules' && (
                    <div className="tenant-section">
                      <header className="tenant-section-header">
                        <h3>Module Access</h3>
                        <p>Active HRMS modules enabled for this organization.</p>
                      </header>
                      <div className="tenant-modules-grid">
                        {allModules.map((moduleName) => {
                          const isEnabled = true;
                          return (
                            <div className={`tenant-module-card ${isEnabled ? 'enabled' : ''}`} key={moduleName}>
                              <span>{moduleName}</span>
                              <div className={`tenant-switch-indicator ${isEnabled ? 'checked' : ''}`}>
                                <span className="knob" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'status' && (
                    <div className="tenant-section">
                      <header className="tenant-section-header">
                        <h3>Organization Status & Environment</h3>
                        <p>Current operational status and deployment environment.</p>
                      </header>
                      <div className="tenant-field-grid">
                        <DisplayField label="Organization Status" value={company.isActive ? 'Active' : 'Suspended'} />
                        <DisplayField label="Environment" value="Production" />
                      </div>
                      <div className="tenant-status-guide">
                        <div className="tenant-status-guide-item"><strong>Active</strong><span>Organization and users can seamlessly access all enabled HRMS modules.</span></div>
                        <div className="tenant-status-guide-item"><strong>Trial</strong><span>Evaluation period with access to core HR capabilities.</span></div>
                        <div className="tenant-status-guide-item"><strong>Suspended</strong><span>Organization access is blocked due to administrative lock or maintenance.</span></div>
                        <div className="tenant-status-guide-item"><strong>Inactive</strong><span>Organization is archived and non-operational.</span></div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'billing' && (
                    <div className="tenant-section">
                      <header className="tenant-section-header">
                        <h3>Billing Details</h3>
                        <p>Invoicing, tax identifier, and billing contact details.</p>
                      </header>
                      <div className="tenant-field-grid">
                        <DisplayField label="Billing Contact Name" value={`${company.name} Accounts Payable`} />
                        <DisplayField label="Billing Email" value={company.hrContactEmail || `billing@${company.domain || 'nw18.com'}`} />
                        <DisplayField label="GST / Tax ID" value="27AAACN9812K1Z0" />
                        <DisplayField label="PO / Contract Number" value={`PO-${company.slug.toUpperCase()}-2026`} />
                        <DisplayField className="full" label="Billing Address" value="Corporate Tower B, Phase II, Tech Park" />
                        <DisplayField label="City" value="Mumbai" />
                        <DisplayField label="State" value="Maharashtra" />
                        <DisplayField label="Country" value={company.country || 'India'} />
                        <DisplayField label="Postal Code" value="400076" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminRouteGuard>
  );
}

function DisplayField({ label, value, className = '' }) {
  return (
    <div className={`tenant-display-field ${className}`}>
      <label>{label}</label>
      <div>{value || '-'}</div>
    </div>
  );
}

function UsageRow({ label, current, limit }) {
  const percent = limit ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  return (
    <div className="tenant-usage-row">
      <strong>{label}</strong>
      <div className="tenant-usage-track"><span style={{ width: `${percent}%` }} /></div>
      <span>{current.toLocaleString('en-IN')} / {limit.toLocaleString('en-IN')}</span>
    </div>
  );
}
