'use client';

import {
  ChevronLeft,
  ChevronRight,
  UserRound
} from 'lucide-react';
import { useState } from 'react';
import LogoutButton from './LogoutButton';

export default function SideNavigation({ activePath = '/' }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside className={`app-sidenav ${collapsed ? 'app-sidenav-collapsed' : ''}`} aria-label={collapsed ? 'Collapsed user navigation' : 'User navigation'}>
      <div className="sidenav-top">
        <a className="sidenav-brand" href="/" title="HRMS">
          <span>H</span>
          <strong>HRMS</strong>
        </a>
        <button
          className="sidenav-toggle"
          type="button"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
      <nav className="sidenav-accordion" aria-label="Primary navigation">
        <a className={activePath === '/' || activePath === '/profile/edit' ? 'active' : ''} href="/" title="Profile" aria-label="Profile">
          <UserRound size={17} />
          <span>Profile</span>
        </a>
      </nav>
      <div className="sidenav-footer">
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
