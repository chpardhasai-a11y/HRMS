'use client';

import { useEffect, useState } from 'react';
import { getStoredUser, hasSession } from '../lib/hrmsApi';

const roleHome = {
  platform_admin: '/platform-admin',
  org_admin: '/org-admin',
  employee: '/'
};

export default function AdminRouteGuard({ allowedRole, children }) {
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (!hasSession()) {
      window.location.href = allowedRole === 'platform_admin' ? '/platform-admin/login' : '/org-admin/login';
      return;
    }

    const user = getStoredUser();
    if (!user?.role) {
      window.location.href = allowedRole === 'platform_admin' ? '/platform-admin/login' : '/org-admin/login';
      return;
    }

    if (user?.role === allowedRole) {
      setIsAllowed(true);
      return;
    }

    window.location.href = roleHome[user?.role] || '/login';
  }, [allowedRole]);

  if (!isAllowed) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <strong>Checking access...</strong>
        </div>
      </main>
    );
  }

  return children;
}
