'use client';

import { useState } from 'react';
import {
  BarChart3,
  Building2,
  ClipboardList,
  Gauge,
  HeartPulse,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound
} from 'lucide-react';
import LogoutButton from './LogoutButton';

const items = [
  { label: 'Platform Dashboard', href: '/platform-admin', icon: Gauge },
  { label: 'Tenant Management', href: '/platform-admin/companies', icon: Building2 },
  { label: 'Organization Admins', href: '/platform-admin/companies#org-admins', icon: UsersRound },
  { label: 'Module Control', href: '/platform-admin#modules', icon: LayoutGrid },
  { label: 'Audit Logs', href: '/platform-admin#audit', icon: ClipboardList },
  { label: 'System Health', href: '/platform-admin#health', icon: HeartPulse },
  { label: 'Usage Analytics', href: '/platform-admin#usage', icon: BarChart3 }
];

export default function PlatformAdminSideNavigation({ activePath = '/platform-admin' }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`app-sidenav admin-only-sidenav ${isCollapsed ? 'app-sidenav-collapsed' : ''}`}>
      <div className="sidenav-top">
        <a className="sidenav-brand" href="/platform-admin" title="Platform">
          <span>P</span>
          <strong>Platform</strong>
        </a>
        <button
          className="sidenav-toggle"
          type="button"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <nav className="sidenav-accordion" aria-label="Platform admin navigation">
        {items.map(({ label, href, icon: Icon }) => (
          <a className={href === activePath ? 'active' : ''} href={href} key={label} title={isCollapsed ? label : undefined}>
            <Icon size={16} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="sidenav-footer">
        <LogoutButton audience="platform" />
      </div>
    </aside>
  );
}
