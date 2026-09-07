'use client';

import { useEffect, useState } from 'react';
import { Eye, Layers3, MoreHorizontal, PackageCheck, Plus, RefreshCw, ShieldBan, ShieldCheck, X } from 'lucide-react';
import AdminRouteGuard from '../../components/AdminRouteGuard';
import Breadcrumbs from '../../components/Breadcrumbs';
import PlatformAdminSideNavigation from '../../components/PlatformAdminSideNavigation';
import { getCompanies } from '../../lib/hrmsApi';

function statusClass(company) {
  return company.isActive ? 'tenant-chip-ok' : 'tenant-chip-muted';
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [actionsMenu, setActionsMenu] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setIsLoading(true);
      const companyList = await getCompanies();
      setCompanies(companyList);
    } catch (error) {
      setToast(error.message || 'Unable to load companies.');
    } finally {
      setIsLoading(false);
    }
  }

  function showPlaceholder(message) {
    setActionsMenu(null);
    setToast(message);
  }

  function openOrganization(company) {
    setActionsMenu(null);
    setSelectedCompany(company);
  }

  function toggleActionsMenu(company, event) {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    const left = Math.max(12, Math.min(buttonRect.right - menuWidth, window.innerWidth - menuWidth - 12));
    setActionsMenu((current) => (
      current?.company.id === company.id
        ? null
        : { company, top: buttonRect.bottom + 8, left }
    ));
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

            .tenant-shell {
              display: grid;
              gap: 14px;
              max-width: 1400px;
              margin: 0 auto;
            }

            .tenant-header,
            .tenant-table-header,
            .tenant-modal-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 14px;
            }

            .tenant-header {
              border-bottom: 1px solid var(--color-border);
              padding-bottom: 14px;
            }

            .tenant-header h1 {
              margin: 0 0 5px;
              font-size: 28px;
              line-height: 1.2;
            }

            .tenant-header p,
            .tenant-muted {
              margin: 0;
              color: var(--color-neutral-500);
            }

            .tenant-actions {
              display: flex;
              flex-wrap: wrap;
              justify-content: flex-end;
              gap: 8px;
            }

            .tenant-actions .btn-primary {
              background: #102a43;
              box-shadow: 0 8px 18px rgba(16, 42, 67, 0.16);
            }

            .tenant-actions .btn-primary:hover {
              background: #0b1f33;
            }

            .tenant-table-card {
              min-width: 0;
              border: 1px solid var(--color-border);
              border-radius: 8px;
              background: var(--color-white);
              box-shadow: var(--shadow-xs);
              padding: 16px;
            }

            .tenant-table-header {
              margin-bottom: 12px;
            }

            .tenant-table-header h2 {
              margin: 0 0 4px;
              font-size: 19px;
              line-height: 1.2;
            }

            .tenant-table-scroll {
              overflow: visible;
            }

            .tenant-table {
              width: 100%;
              min-width: 0;
              table-layout: fixed;
              border-collapse: separate;
              border-spacing: 0;
            }

            .tenant-table th,
            .tenant-table td {
              border-bottom: 1px solid var(--color-border);
              background: var(--color-white);
              padding: 11px 10px;
              text-align: left;
              vertical-align: middle;
            }

            .tenant-table th {
              color: var(--color-neutral-500);
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .tenant-table tr:last-child td {
              border-bottom: 0;
            }

            .tenant-table th,
            .tenant-table td,
            .tenant-muted,
            .tenant-domain {
              min-width: 0;
              overflow-wrap: anywhere;
            }

            .tenant-org {
              display: grid;
              gap: 2px;
            }

            .tenant-org strong {
              font-size: 14px;
            }

            .tenant-domain {
              color: var(--color-neutral-700);
              font-weight: 700;
            }

            .tenant-chip {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              min-height: 28px;
              width: max-content;
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

            .tenant-row-actions {
              display: flex;
              justify-content: flex-end;
            }

            .tenant-icon-button {
              display: inline-grid;
              place-items: center;
              width: 34px;
              height: 34px;
              border: 1px solid var(--color-border);
              border-radius: var(--radius-sm);
              background: var(--color-white);
              color: var(--color-neutral-700);
            }

            .tenant-icon-button:hover {
              border-color: #102a43;
              color: #102a43;
            }

            .tenant-menu {
              position: fixed;
              z-index: 90;
              display: grid;
              gap: 2px;
              width: 220px;
              border: 1px solid var(--color-border);
              border-radius: 8px;
              background: var(--color-white);
              box-shadow: var(--shadow-lg);
              padding: 6px;
            }

            .tenant-menu-scrim {
              position: fixed;
              inset: 0;
              z-index: 89;
              border: 0;
              background: transparent;
              cursor: default;
            }

            .tenant-menu button {
              display: flex;
              align-items: center;
              gap: 8px;
              min-height: 34px;
              width: 100%;
              border: 0;
              border-radius: var(--radius-sm);
              background: transparent;
              color: var(--color-neutral-700);
              font-size: 12px;
              font-weight: 800;
              padding: 0 8px;
              text-align: left;
            }

            .tenant-menu button:hover {
              background: #f1f5f9;
              color: #102a43;
            }

            .tenant-empty {
              border: 1px dashed var(--color-border);
              border-radius: 8px;
              color: var(--color-neutral-500);
              padding: 18px;
              text-align: center;
            }

            .tenant-modal-backdrop {
              position: fixed;
              inset: 0;
              z-index: 80;
              display: grid;
              place-items: center;
              background: rgba(15, 23, 42, 0.38);
              padding: 18px;
            }

            .tenant-modal {
              display: grid;
              grid-template-rows: auto minmax(0, 1fr);
              width: min(100%, 760px);
              max-height: calc(100vh - 36px);
              border-radius: 8px;
              background: var(--color-white);
              box-shadow: var(--shadow-xl);
              overflow: hidden;
            }

            .tenant-modal-header {
              border-bottom: 1px solid var(--color-border);
              padding: 18px 20px;
            }

            .tenant-modal-title {
              display: grid;
              gap: 3px;
            }

            .tenant-modal-title span {
              color: #102a43;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .tenant-modal-header h2 {
              margin: 0;
              font-size: 22px;
              line-height: 1.2;
            }

            .tenant-detail-body {
              display: grid;
              align-content: start;
              gap: 18px;
              overflow-y: auto;
              padding: 20px;
            }

            .tenant-detail-section {
              display: grid;
              gap: 10px;
              border-bottom: 1px solid var(--color-border);
              padding-bottom: 16px;
            }

            .tenant-detail-section:last-child {
              border-bottom: 0;
            }

            .tenant-detail-section h3 {
              margin: 0;
              font-size: 16px;
            }

            .tenant-detail-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .tenant-detail-field {
              display: grid;
              gap: 3px;
              min-width: 0;
            }

            .tenant-detail-field span {
              color: var(--color-neutral-500);
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .tenant-detail-field strong {
              min-width: 0;
              overflow-wrap: anywhere;
              color: var(--color-neutral-900);
            }

            .tenant-usage-row {
              display: grid;
              grid-template-columns: 130px minmax(0, 1fr) auto;
              align-items: center;
              gap: 10px;
            }

            .tenant-usage-track {
              height: 8px;
              overflow: hidden;
              border-radius: var(--radius-pill);
              background: var(--color-neutral-100);
            }

            .tenant-usage-track span {
              display: block;
              height: 100%;
              border-radius: inherit;
              background: #102a43;
            }

            .toast {
              position: fixed;
              right: 18px;
              bottom: 18px;
              z-index: 100;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
              background: #f0fdf4;
              color: #166534;
              padding: 12px 14px;
              font-weight: 800;
              box-shadow: var(--shadow-lg);
            }

            @media (max-width: 760px) {
              .platform-tenant-workspace {
                padding: 12px;
              }

              .tenant-header,
              .tenant-table-header,
              .tenant-actions {
                display: grid;
                grid-template-columns: 1fr;
              }

              .tenant-actions .btn {
                width: 100%;
              }

              .tenant-detail-grid,
              .tenant-usage-row {
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          <div className="tenant-shell">
            <header className="tenant-header">
              <div>
                <Breadcrumbs
                  items={[
                    { label: 'Platform Admin', href: '/platform-admin' },
                    { label: 'Tenant Management' }
                  ]}
                />
                <h1>Tenant Management</h1>
              </div>
              <div className="tenant-actions">
                <a className="btn btn-primary" href="/platform-admin/companies/new">
                  <Plus size={16} />
                  Add Tenant
                </a>
                <button className="btn btn-secondary" type="button" onClick={loadCompanies} disabled={isLoading}>
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </header>

            <section className="tenant-table-card">
              <div className="tenant-table-header">
                <div>
                  <h2>Tenant Registry</h2>
                </div>
              </div>

              {isLoading && <div className="tenant-empty">Loading companies...</div>}
              {!isLoading && companies.length === 0 && <div className="tenant-empty">No companies registered.</div>}
              {!isLoading && companies.length > 0 && (
                <div className="tenant-table-scroll">
                  <table className="tenant-table">
                    <colgroup>
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '6%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Organization</th>
                        <th>Domain</th>
                        <th>Country / Timezone</th>
                        <th>Users</th>
                        <th>Employees</th>
                        <th>Status</th>
                        <th>HR Contact</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td>
                            <span className="tenant-org">
                              <strong>{company.name}</strong>
                              <span className="tenant-muted">{company.slug}</span>
                            </span>
                          </td>
                          <td><span className="tenant-domain">{company.domain || '-'}</span></td>
                          <td>
                            <span className="tenant-org">
                              <strong>{company.country || '-'}</strong>
                              <span className="tenant-muted">{company.timezone || '-'}</span>
                            </span>
                          </td>
                          <td>{(company._count?.users || 0).toLocaleString('en-IN')}</td>
                          <td>{(company._count?.employees || 0).toLocaleString('en-IN')}</td>
                          <td>
                            <span className={`tenant-chip ${statusClass(company)}`}>
                              {company.isActive ? <ShieldCheck size={14} /> : <ShieldBan size={14} />}
                              {company.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td>{company.hrContactEmail || '-'}</td>
                          <td>
                            <div className="tenant-row-actions">
                              <button
                                className="tenant-icon-button"
                                type="button"
                                aria-label={`Open actions for ${company.name}`}
                                title="Actions"
                                onClick={(event) => toggleActionsMenu(company, event)}
                              >
                                <MoreHorizontal size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>

        {actionsMenu && (
          <>
            <button className="tenant-menu-scrim" type="button" aria-label="Close actions menu" onClick={() => setActionsMenu(null)} />
            <div className="tenant-menu" style={{ top: actionsMenu.top, left: actionsMenu.left }}>
              <button type="button" onClick={() => openOrganization(actionsMenu.company)}><Eye size={15} />View Organization</button>
              <button type="button" onClick={() => showPlaceholder('Plan management is planned for Phase 2.')}><PackageCheck size={15} />Manage Plan</button>
              <button type="button" onClick={() => showPlaceholder('Module controls are planned for Phase 2.')}><Layers3 size={15} />Manage Modules</button>
              <button type="button" onClick={() => showPlaceholder(`${actionsMenu.company.isActive ? 'Suspend' : 'Activate'} tenant is planned for Phase 2.`)}>
                {actionsMenu.company.isActive ? <ShieldBan size={15} /> : <ShieldCheck size={15} />}
                {actionsMenu.company.isActive ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </>
        )}

        {selectedCompany && (
          <div className="tenant-modal-backdrop" role="presentation" onClick={() => setSelectedCompany(null)}>
            <aside className="tenant-modal" role="dialog" aria-modal="true" aria-labelledby="tenant-detail-title" onClick={(event) => event.stopPropagation()}>
              <div className="tenant-modal-header">
                <div className="tenant-modal-title">
                  <span>Organization record</span>
                  <h2 id="tenant-detail-title">{selectedCompany.name}</h2>
                </div>
                <button className="tenant-icon-button" type="button" aria-label="Close organization details" title="Close" onClick={() => setSelectedCompany(null)}>
                  <X size={17} />
                </button>
              </div>

              <div className="tenant-detail-body">
                <section className="tenant-detail-section">
                  <h3>Organization</h3>
                  <div className="tenant-detail-grid">
                    <DetailField label="Name" value={selectedCompany.name} />
                    <DetailField label="Code" value={selectedCompany.slug} />
                    <DetailField label="Domain" value={selectedCompany.domain || '-'} />
                    <DetailField label="Country / Time Zone" value={`${selectedCompany.country || '-'} / ${selectedCompany.timezone || '-'}`} />
                    <DetailField label="HR Contact" value={selectedCompany.hrContactEmail || '-'} />
                    <DetailField label="Status" value={selectedCompany.isActive ? 'Active' : 'Suspended'} />
                  </div>
                </section>

                <section className="tenant-detail-section">
                  <h3>Current Usage</h3>
                  <UsageRow label="Employees" current={selectedCompany._count?.employees || 0} limit={500} />
                  <UsageRow label="Admin Users" current={selectedCompany._count?.users || 0} limit={10} />
                </section>

                <section className="tenant-detail-section">
                  <h3>Access & Modules</h3>
                  <div className="tenant-detail-grid">
                    <DetailField label="Access Start" value="06 Sep 2026" />
                    <DetailField label="Access End" value="05 Sep 2027" />
                    <DetailField label="Enabled Modules" value="Core HR" />
                    <DetailField label="Environment" value="Production" />
                  </div>
                </section>
              </div>
            </aside>
          </div>
        )}

        {toast && <button className="toast" type="button" onClick={() => setToast('')}>{toast}</button>}
      </main>
    </AdminRouteGuard>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="tenant-detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
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
