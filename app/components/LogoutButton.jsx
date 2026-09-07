'use client';

import { LogOut } from 'lucide-react';
import { logoutUser } from '../lib/hrmsApi';

export default function LogoutButton({ audience = 'employee', collapsed = false }) {
  function handleLogout() {
    logoutUser();
    if (audience === 'platform') {
      window.location.href = '/platform-admin/login';
      return;
    }
    if (audience === 'org' || audience === 'admin') {
      window.location.href = '/org-admin/login';
      return;
    }
    window.location.href = '/login';
  }

  const label = 'Logout';

  return (
    <button
      aria-label={label}
      className="sidenav-logout"
      onClick={handleLogout}
      title={label}
      type="button"
    >
      <LogOut size={17} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
