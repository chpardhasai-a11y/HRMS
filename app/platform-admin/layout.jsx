'use client';

import PlatformAdminSideNavigation from '../components/PlatformAdminSideNavigation';
import { usePathname } from 'next/navigation';

export default function PlatformAdminLayout({ children }) {
  const pathname = usePathname();

  // Don't show sidebar on login/forgot/reset password pages
  if (pathname?.includes('/login') || pathname?.includes('password')) {
    return children;
  }

  return (
    <div className="app-shell-with-nav">
      <PlatformAdminSideNavigation activePath={pathname || '/platform-admin'} />
      {children}
    </div>
  );
}
