'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Layers3,
  MoreHorizontal,
  PackageCheck,
  Plus,
  ShieldBan,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import AdminRouteGuard from '../../components/AdminRouteGuard';
import Breadcrumbs from '../../components/Breadcrumbs';
import PlatformAdminSideNavigation from '../../components/PlatformAdminSideNavigation';
import { deleteCompany, getCompanies } from '../../lib/hrmsApi';

function statusClass(company) {
  return company.isActive ? 'tenant-chip-ok' : 'tenant-chip-muted';
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionsMenu, setActionsMenu] = useState(null);
  const [toast, setToast] = useState('');
  const [deleteModalCompany, setDeleteModalCompany] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    router.push(`/platform-admin/companies/${company.id}`);
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
            .tenant-table-header {
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
              cursor: pointer;
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
              cursor: pointer;
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
                              <a
                                href={`/platform-admin/companies/${company.id}`}
                                style={{ color: '#0f172a', textDecoration: 'none' }}
                                className="hover:underline"
                              >
                                <strong>{company.name}</strong>
                              </a>
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
              <button
                type="button"
                onClick={() => {
                  setDeleteModalCompany(actionsMenu.company);
                  setActionsMenu(null);
                }}
                style={{ color: 'var(--color-error)' }}
              >
                <Trash2 size={15} />
                Delete Organization
              </button>
            </div>
          </>
        )}

        {deleteModalCompany && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.6)', display: 'grid', placeItems: 'center', padding: '16px' }}>
            <div className="card" style={{ width: 'min(100%, 440px)', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px', color: '#dc2626' }}>
                Delete Organization
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-neutral-700)', margin: '0 0 20px', lineHeight: '1.5' }}>
                Are you sure you want to delete <strong>{deleteModalCompany.name}</strong> ({deleteModalCompany.slug})? This will permanently remove the organization and all its associated employees, users, and data.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-tertiary" onClick={() => setDeleteModalCompany(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      await deleteCompany(deleteModalCompany.id);
                      setDeleteModalCompany(null);
                      setToast(`Deleted organization ${deleteModalCompany.name}`);
                      await loadCompanies();
                    } catch (err) {
                      setToast(err.message || 'Failed to delete organization');
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

        {toast && <button className="toast" type="button" onClick={() => setToast('')}>{toast}</button>}
      </main>
    </AdminRouteGuard>
  );
}
