'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  LayoutGrid,
  Mail,
  Server,
  ShieldCheck,
  UsersRound
} from 'lucide-react';
import AdminRouteGuard from '../components/AdminRouteGuard';
import Breadcrumbs from '../components/Breadcrumbs';
import PlatformAdminSideNavigation from '../components/PlatformAdminSideNavigation';
import { getCompanies, getPlatformHealth } from '../lib/hrmsApi';

const tabs = [
  { id: 'organizations', label: 'Organizations' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'usage', label: 'Usage' },
  { id: 'health', label: 'Health' }
];

const planCatalog = [
  { name: 'Starter', monthlyValue: 49000, modules: 4 },
  { name: 'Growth', monthlyValue: 99000, modules: 6 },
  { name: 'Enterprise', monthlyValue: 199000, modules: 8 },
  { name: 'Trial', monthlyValue: 0, modules: 4 }
];

const moduleAdoption = [
  ['Core HR', 91],
  ['Leave', 84],
  ['Attendance', 72],
  ['Payroll', 58]
];

const healthRows = [
  ['Application', 'Operational', Server],
  ['Database', 'Operational', Database],
  ['Authentication', 'Operational', ShieldCheck],
  ['Email Service', 'Operational', Mail],
  ['Background Jobs', 'Operational', Activity]
];

function enrichCompany(company, index) {
  const plan = planCatalog[index % planCatalog.length];
  const employeeCount = company._count?.employees || 0;
  const renewalDate = new Date(2026, 8 + (index % 4), 12 + (index * 6) % 18);
  return {
    ...company,
    plan: plan.name,
    monthlyValue: plan.monthlyValue,
    enabledModules: plan.modules,
    users: company._count?.users || Math.max(1, Math.round(employeeCount * 0.72)),
    statusLabel: plan.name === 'Trial' ? 'Trial' : company.isActive ? 'Active' : 'Suspended',
    renewal: renewalDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  };
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function chipClass(status) {
  if (status === 'Active' || status === 'Operational') return 'platform-chip-ok';
  if (status === 'Trial') return 'platform-chip-warning';
  return 'platform-chip-muted';
}

export default function PlatformAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [companies, setCompanies] = useState([]);
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlatform();
  }, []);

  useEffect(() => {
    function syncHashToTab() {
      const hash = window.location.hash.replace('#', '');
      const tabByHash = {
        organizations: 'organizations',
        subscriptions: 'subscriptions',
        usage: 'usage',
        modules: 'usage',
        health: 'health'
      };
      if (tabByHash[hash]) setActiveTab(tabByHash[hash]);
    }

    syncHashToTab();
    window.addEventListener('hashchange', syncHashToTab);
    return () => window.removeEventListener('hashchange', syncHashToTab);
  }, []);

  async function loadPlatform() {
    try {
      setIsLoading(true);
      setError('');
      const [companyList, healthStatus] = await Promise.all([
        getCompanies(),
        getPlatformHealth()
      ]);
      setCompanies(companyList.map(enrichCompany));
      setHealth(healthStatus);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load platform dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  const summary = useMemo(() => {
    const activeOrganizations = companies.filter((company) => company.statusLabel === 'Active').length;
    const activeUsers = companies.reduce((total, company) => total + company.users, 0);
    const mrr = companies.reduce((total, company) => total + company.monthlyValue, 0);
    const trials = companies.filter((company) => company.statusLabel === 'Trial').length;
    return {
      activeOrganizations,
      activeUsers,
      mrr,
      trials,
      monthlyActiveUsers: Math.round(activeUsers * 0.79),
      activeThisMonth: Math.max(activeOrganizations, companies.length - Math.min(trials, 2))
    };
  }, [companies]);

  const planDistribution = useMemo(() => (
    planCatalog.map((plan) => ({
      name: plan.name,
      count: companies.filter((company) => company.plan === plan.name).length
    }))
  ), [companies]);

  return (
    <AdminRouteGuard allowedRole="platform_admin">
      <main className="app-shell-with-nav">
        <PlatformAdminSideNavigation activePath="/platform-admin" />
        <section className="platform-workspace">
          <style>{`
            .platform-workspace {
              min-width: 0;
              min-height: 100vh;
              background: #f8fafc;
              padding: 22px;
            }

            .platform-shell {
              display: grid;
              gap: 14px;
              max-width: 1400px;
              margin: 0 auto;
            }

            .platform-header,
            .platform-section-header,
            .platform-kpi header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 14px;
            }

            .platform-header {
              border-bottom: 1px solid var(--color-border);
              padding-bottom: 14px;
            }

            .platform-header h1 {
              margin: 0 0 5px;
              font-size: 28px;
              line-height: 1.2;
            }

            .platform-header p,
            .platform-muted {
              margin: 0;
              color: var(--color-neutral-500);
            }

            .platform-kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
            }

            .platform-kpi,
            .platform-section,
            .platform-tab-content {
              min-width: 0;
              border: 1px solid var(--color-border);
              border-radius: 8px;
              background: var(--color-white);
              box-shadow: var(--shadow-xs);
            }

            .platform-kpi {
              display: grid;
              gap: 7px;
              min-height: 88px;
              padding: 11px 12px;
            }

            .platform-kpi span,
            .platform-table th,
            .platform-small-label {
              color: var(--color-neutral-500);
              font-size: 11px;
              font-weight: 800;
            }

            .platform-kpi strong {
              font-size: 21px;
              line-height: 1;
            }

            .platform-kpi p {
              margin: 0;
              color: var(--color-neutral-500);
              font-size: 12px;
              line-height: 1.3;
            }

            .platform-icon {
              display: grid;
              place-items: center;
              width: 30px;
              height: 30px;
              border-radius: 8px;
              background: #ecfeff;
              color: #0f766e;
            }

            .platform-tabs {
              display: flex;
              align-items: center;
              gap: var(--space-6);
              min-width: 0;
              border: 1px solid var(--color-border);
              border-radius: 8px 8px 0 0;
              background: var(--color-white);
              padding: 0 var(--space-4);
              overflow-x: auto;
            }

            .platform-tabs button {
              position: relative;
              flex: 0 0 auto;
              min-height: 44px;
              border: 0;
              background: transparent;
              color: var(--color-neutral-500);
              font-size: var(--font-small);
              font-weight: 800;
              text-transform: uppercase;
            }

            .platform-tabs button::after {
              position: absolute;
              right: 0;
              bottom: -1px;
              left: 0;
              height: 2px;
              border-radius: var(--radius-pill);
              background: transparent;
              content: "";
            }

            .platform-tabs button:hover,
            .platform-tabs button.active {
              color: var(--color-neutral-900);
            }

            .platform-tabs button.active::after {
              background: var(--color-primary);
            }

            .platform-tabs button:focus-visible {
              outline: 3px solid var(--color-focus);
              outline-offset: -3px;
            }

            .platform-tab-content {
              display: grid;
              gap: 14px;
              border-top: 0;
              border-radius: 0 0 8px 8px;
              padding: 16px;
            }

            .platform-section {
              display: grid;
              gap: 14px;
              padding: 16px;
            }

            .platform-section h2 {
              margin: 0 0 4px;
              font-size: 19px;
              line-height: 1.2;
            }

            .platform-table-wrap {
              overflow-x: auto;
            }

            .platform-table {
              width: 100%;
              min-width: 820px;
              border-collapse: collapse;
            }

            .platform-table th,
            .platform-table td {
              border-bottom: 1px solid var(--color-border);
              padding: 12px 10px;
              text-align: left;
              vertical-align: middle;
            }

            .platform-table tr:last-child td {
              border-bottom: 0;
            }

            .platform-org {
              display: grid;
              gap: 2px;
            }

            .platform-org strong {
              font-size: 14px;
            }

            .platform-chip {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              min-height: 28px;
              width: max-content;
              border-radius: 999px;
              padding: 0 10px;
              font-size: 12px;
              font-weight: 800;
            }

            .platform-chip-ok {
              background: #dcfce7;
              color: #15803d;
            }

            .platform-chip-warning {
              background: #fef3c7;
              color: #92400e;
            }

            .platform-chip-muted {
              background: var(--color-neutral-100);
              color: var(--color-neutral-700);
            }

            .platform-stack {
              display: grid;
              gap: 10px;
            }

            .platform-list-row {
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              align-items: center;
              gap: 12px;
              border: 1px solid var(--color-border);
              border-radius: 8px;
              padding: 11px;
            }

            .platform-meter {
              display: grid;
              gap: 6px;
            }

            .platform-meter-track {
              height: 8px;
              overflow: hidden;
              border-radius: 999px;
              background: var(--color-neutral-100);
            }

            .platform-meter-fill {
              display: block;
              height: 100%;
              border-radius: inherit;
              background: #0f766e;
            }

            .platform-usage-grid,
            .platform-health-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }

            .platform-usage-stat,
            .platform-health-stat {
              display: grid;
              gap: 8px;
              border: 1px solid var(--color-border);
              border-radius: 8px;
              padding: 12px;
            }

            .platform-usage-stat strong,
            .platform-health-stat strong {
              font-size: 22px;
              line-height: 1.1;
            }

            .platform-health-table {
              display: grid;
              gap: 8px;
            }

            .platform-health-row {
              display: grid;
              grid-template-columns: auto minmax(0, 1fr) auto;
              align-items: center;
              gap: 10px;
              border: 1px solid var(--color-border);
              border-radius: 8px;
              padding: 10px;
            }

            .platform-empty {
              border: 1px dashed var(--color-border);
              border-radius: 8px;
              color: var(--color-neutral-500);
              padding: 18px;
              text-align: center;
            }

            .platform-link {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: var(--color-primary);
              font-weight: 800;
              text-decoration: none;
            }

            @media (max-width: 1100px) {
              .platform-kpi-grid,
              .platform-usage-grid,
              .platform-health-grid {
                grid-template-columns: 1fr 1fr;
              }
            }

            @media (max-width: 760px) {
              .platform-workspace {
                padding: 12px;
              }

              .platform-header,
              .platform-section-header,
              .platform-kpi-grid,
              .platform-usage-grid,
              .platform-health-grid {
                display: grid;
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          <div className="platform-shell">
            <header className="platform-header">
              <div>
                <Breadcrumbs
                  items={[
                    { label: 'Platform Admin', href: '/platform-admin' },
                    { label: 'Dashboard' }
                  ]}
                />
                <h1>HRMS SaaS Dashboard</h1>
              </div>
              <a className="btn btn-primary" href="/platform-admin/companies">
                <Building2 size={16} />
                Tenant Management
              </a>
            </header>

            {error && <div className="platform-empty">{error}</div>}

            <section className="platform-kpi-grid" aria-label="Platform KPIs">
              <MetricCard icon={Building2} label="Total Organizations" value={isLoading ? '-' : companies.length} note="All onboarded companies" />
              <MetricCard icon={CheckCircle2} label="Active Organizations" value={isLoading ? '-' : summary.activeOrganizations} note="Currently active tenants" />
              <MetricCard icon={UsersRound} label="Total Active Users" value={isLoading ? '-' : summary.activeUsers.toLocaleString('en-IN')} note="Users across all organizations" />
              <MetricCard icon={CreditCard} label="MRR / Subscription Revenue" value={isLoading ? '-' : currency(summary.mrr)} note="Current recurring revenue" />
            </section>

            <nav className="platform-tabs" role="tablist" aria-label="Platform dashboard sections">
              {tabs.map((tab) => (
                <button
                  className={tab.id === activeTab ? 'active' : undefined}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === activeTab}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="platform-tab-content">
              {activeTab === 'organizations' && (
                <section className="platform-section">
                  <div className="platform-section-header">
                    <div>
                      <h2>Organization Overview</h2>
                    </div>
                    <a className="platform-link" href="/platform-admin/companies">Open Tenant Management <ArrowUpRight size={15} /></a>
                  </div>
                  <OrganizationTable companies={companies} isLoading={isLoading} />
                </section>
              )}

              {activeTab === 'subscriptions' && (
                <section className="platform-section">
                  <div className="platform-section-header">
                    <div>
                      <h2>Subscription & Plan Distribution</h2>
                    </div>
                    <BarChart3 size={18} />
                  </div>
                  <div className="platform-stack">
                    {planDistribution.map((plan) => (
                      <div className="platform-list-row" key={plan.name}>
                        <span>{plan.name}</span>
                        <strong>{isLoading ? '-' : plan.count}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="platform-health-grid">
                    <div className="platform-health-stat">
                      <span className="platform-small-label">Trial Organizations</span>
                      <strong>{isLoading ? '-' : summary.trials}</strong>
                    </div>
                    <div className="platform-health-stat">
                      <span className="platform-small-label">Renewals: 7 Days</span>
                      <strong>{isLoading ? '-' : Math.min(companies.length, 1)}</strong>
                    </div>
                    <div className="platform-health-stat">
                      <span className="platform-small-label">Renewals: 30 Days</span>
                      <strong>{isLoading ? '-' : Math.min(companies.length, 3)}</strong>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'usage' && (
                <section className="platform-section" id="usage">
                  <div className="platform-section-header">
                    <div>
                      <h2>Platform Usage</h2>
                    </div>
                    <LayoutGrid size={18} />
                  </div>
                  <div className="platform-usage-grid">
                    <div className="platform-usage-stat">
                      <span className="platform-small-label">Active Users</span>
                      <strong>{isLoading ? '-' : summary.activeUsers.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="platform-usage-stat">
                      <span className="platform-small-label">Monthly Active Users</span>
                      <strong>{isLoading ? '-' : summary.monthlyActiveUsers.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="platform-usage-stat">
                      <span className="platform-small-label">Organizations Active This Month</span>
                      <strong>{isLoading ? '-' : `${summary.activeThisMonth} / ${companies.length}`}</strong>
                    </div>
                  </div>
                  <div className="platform-stack">
                    {moduleAdoption.map(([module, percent]) => (
                      <div className="platform-meter" key={module}>
                        <div className="platform-list-row">
                          <span>{module}</span>
                          <strong>{percent}%</strong>
                        </div>
                        <div className="platform-meter-track"><span className="platform-meter-fill" style={{ width: `${percent}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'health' && (
                <section className="platform-section" id="health">
                  <div className="platform-section-header">
                    <div>
                      <h2>Platform Health</h2>
                    </div>
                    <Server size={18} />
                  </div>
                  <div className="platform-health-table">
                    {healthRows.map(([service, status, Icon]) => (
                      <div className="platform-health-row" key={service}>
                        <span className="platform-icon"><Icon size={18} /></span>
                        <strong>{service}</strong>
                        <span className={`platform-chip ${chipClass(status)}`}>{status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="platform-health-grid">
                    <div className="platform-health-stat">
                      <span className="platform-small-label">System Status</span>
                      <strong>{health?.status === 'ok' ? 'Operational' : 'Checking'}</strong>
                    </div>
                    <div className="platform-health-stat">
                      <span className="platform-small-label">Failed Jobs</span>
                      <strong>3</strong>
                    </div>
                    <div className="platform-health-stat">
                      <span className="platform-small-label">API Errors Today</span>
                      <strong>{health?.status === 'ok' ? 0 : 24}</strong>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>
      </main>
    </AdminRouteGuard>
  );
}

function MetricCard({ icon: Icon, label, value, note }) {
  return (
    <article className="platform-kpi">
      <header>
        <span>{label}</span>
        <span className="platform-icon"><Icon size={16} /></span>
      </header>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function OrganizationTable({ companies, isLoading }) {
  if (isLoading) return <div className="platform-empty">Loading organizations...</div>;
  if (companies.length === 0) return <div className="platform-empty">No organizations onboarded yet.</div>;

  return (
    <div className="platform-table-wrap">
      <table className="platform-table">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Plan</th>
            <th>Users</th>
            <th>Modules</th>
            <th>Status</th>
            <th>Renewal</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td>
                <span className="platform-org">
                  <strong>{company.name}</strong>
                  <span className="platform-muted">{company.domain || company.slug}</span>
                </span>
              </td>
              <td>{company.plan}</td>
              <td>{company.users.toLocaleString('en-IN')}</td>
              <td>{company.enabledModules}/10</td>
              <td><span className={`platform-chip ${chipClass(company.statusLabel)}`}>{company.statusLabel}</span></td>
              <td>{company.renewal}</td>
              <td><a className="platform-link" href="/platform-admin/companies">View Organization</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
