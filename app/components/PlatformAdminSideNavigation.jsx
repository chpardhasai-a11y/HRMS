'use client';

import { useState } from 'react';
import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  Clock,
  Coins,
  Factory,
  Gauge,
  Globe,
  HeartPulse,
  Layers,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound
} from 'lucide-react';
import LogoutButton from './LogoutButton';

const navItemsBefore = [
  { label: 'Platform Dashboard', href: '/platform-admin', icon: Gauge },
  { label: 'Tenant Management', href: '/platform-admin/companies', icon: Building2 },
  { label: 'Organization Admins', href: '/platform-admin/companies#org-admins', icon: UsersRound }
];

const masterItems = [
  { label: 'Industry Master', href: '/platform-admin/masters/industries', icon: Factory },
  { label: 'Country Master', href: '/platform-admin/masters/countries', icon: Globe },
  { label: 'Currency Master', href: '/platform-admin/masters/currencies', icon: Coins },
  { label: 'Time Zone Master', href: '/platform-admin/masters/time-zones', icon: Clock }
];

const navItemsAfter = [
  { label: 'Module Control', href: '/platform-admin#modules', icon: LayoutGrid },
  { label: 'Audit Logs', href: '/platform-admin#audit', icon: ClipboardList },
  { label: 'System Health', href: '/platform-admin#health', icon: HeartPulse },
  { label: 'Usage Analytics', href: '/platform-admin#usage', icon: BarChart3 }
];

export default function PlatformAdminSideNavigation({ activePath = '/platform-admin' }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMasterActive = activePath.startsWith('/platform-admin/masters');
  const [isMasterOpen, setIsMasterOpen] = useState(isMasterActive || true);

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
        {navItemsBefore.map(({ label, href, icon: Icon }) => (
          <a className={href === activePath ? 'active' : ''} href={href} key={label} title={isCollapsed ? label : undefined}>
            <Icon size={16} />
            <span>{label}</span>
          </a>
        ))}

        <details
          open={isMasterOpen}
          onToggle={(e) => setIsMasterOpen(e.currentTarget.open)}
        >
          <summary title={isCollapsed ? 'Master Catalog' : undefined}>
            <span>
              <Layers size={16} />
              <span>Master Catalog</span>
            </span>
            {!isCollapsed && <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isMasterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />}
          </summary>
          <div>
            {masterItems.map(({ label, href, icon: Icon }) => (
              <a
                className={activePath === href ? 'active' : ''}
                href={href}
                key={label}
                title={isCollapsed ? label : undefined}
                style={{ paddingLeft: isCollapsed ? undefined : '28px' }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </details>

        {navItemsAfter.map(({ label, href, icon: Icon }) => (
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

