'use client';

import OrgAdminSideNavigation from '../components/OrgAdminSideNavigation';
import { usePathname } from 'next/navigation';

export default function OrgAdminLayout({ children }) {
  const pathname = usePathname();

  if (pathname?.includes('/login') || pathname?.includes('password')) {
    return children;
  }

  return (
    <div className="app-shell-with-nav">
      <OrgAdminSideNavigation activePath={pathname || '/org-admin'} />
      {children}
    </div>
  );
}
