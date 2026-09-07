'use client';

import { useRouter } from 'next/navigation';
import AdminRouteGuard from '../../../components/AdminRouteGuard';
import Breadcrumbs from '../../../components/Breadcrumbs';
import OrganizationOnboardingForm from '../../../components/OrganizationOnboardingForm';
import PlatformAdminSideNavigation from '../../../components/PlatformAdminSideNavigation';

export default function NewCompanyPage() {
  const router = useRouter();

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

            .tenant-create-shell {
              display: grid;
              gap: 14px;
              max-width: 1180px;
              margin: 0 auto;
            }

            .tenant-create-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 14px;
              border-bottom: 1px solid var(--color-border);
              padding-bottom: 14px;
            }

            .tenant-create-header h1 {
              margin: 0 0 5px;
              font-size: 28px;
              line-height: 1.2;
            }

            .tenant-create-header p {
              margin: 0;
              color: var(--color-neutral-500);
            }

            @media (max-width: 760px) {
              .platform-tenant-workspace {
                padding: 12px;
              }
            }
          `}</style>

          <div className="tenant-create-shell">
            <header className="tenant-create-header">
              <div>
                <Breadcrumbs
                  items={[
                    { label: 'Platform Admin', href: '/platform-admin' },
                    { label: 'Tenant Management', href: '/platform-admin/companies' },
                    { label: 'Onboard Organization' }
                  ]}
                />
                <h1>Onboard Organization</h1>
              </div>
            </header>

            <OrganizationOnboardingForm onCreated={() => router.push('/platform-admin/companies')} />
          </div>
        </section>
      </main>
    </AdminRouteGuard>
  );
}
