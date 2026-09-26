'use client';

import { useState } from 'react';
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ChevronDown,
  Clock,
  Coins,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  FolderTree,
  GitBranch,
  Laptop,
  MapPin,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Upload,
  UserCheck,
  UserRound,
  UsersRound
} from 'lucide-react';
import LogoutButton from './LogoutButton';

const orgAdminGroups = [
  {
    label: 'People Operations',
    icon: UsersRound,
    items: [
      { label: 'Employee Master', href: '/org-admin', icon: UserRound },
      { label: 'Onboarding Module', href: '/org-admin/onboarding', icon: UserCheck },
      { label: 'Pending Approvals', href: '/org-admin/approvals', icon: ShieldCheck },
      { label: 'Lifecycle Changes', href: '/org-admin#lifecycle', icon: GitBranch },
      { label: 'Bulk Upload & Import', href: '/org-admin#bulk', icon: Upload }
    ]
  },
  {
    label: 'Master Catalog',
    icon: Database,
    items: [
      { label: 'Legal Entities', href: '/org-admin/masters/legal-entities', icon: Building2 },
      { label: 'Business Units', href: '/org-admin/masters/business-units', icon: Network },
      { label: 'Departments', href: '/org-admin/masters/departments', icon: Network },
      { label: 'Teams', href: '/org-admin/masters/teams', icon: UsersRound },
      { label: 'Job Families', href: '/org-admin/masters/job-families', icon: FolderTree },
      { label: 'Job Titles / Designations', href: '/org-admin/masters/job-titles', icon: Briefcase },
      { label: 'Grades & Salary Bands', href: '/org-admin/masters/grade-bands', icon: Award },
      { label: 'Pay Components', href: '/org-admin/masters/pay-components', icon: Coins },
      { label: 'Employment Types', href: '/org-admin/masters/employment-types', icon: UserCheck },
      { label: 'Work Modes', href: '/org-admin/masters/work-modes', icon: Laptop },
      { label: 'Work Shifts & Schedules', href: '/org-admin/masters/work-shifts', icon: Clock },
      { label: 'Holiday Calendars', href: '/org-admin/masters/holiday-calendars', icon: Calendar },
      { label: 'Office Locations', href: '/org-admin/masters/locations', icon: MapPin },
      { label: 'Cost Centers', href: '/org-admin/masters/cost-centers', icon: CreditCard }
    ]
  },
  {
    label: 'Org Structure',
    icon: Network,
    items: [
      { label: 'Departments & Teams', href: '/org-admin#structure', icon: Network },
      { label: 'Jobs, Grades & Locations', href: '/org-admin#structure', icon: Building2 },
      { label: 'Reporting Matrix', href: '/org-admin#structure', icon: GitBranch }
    ]
  },
  {
    label: 'Documents & Policy',
    icon: FileCheck2,
    items: [
      { label: 'Documents', href: '/org-admin#documents', icon: FileCheck2 },
      { label: 'Letter Templates', href: '/org-admin#documents', icon: FileText },
      { label: 'Approvals & Governance', href: '/org-admin/approvals', icon: ShieldCheck }
    ]
  },
  {
    label: 'Reports & Settings',
    icon: BarChart3,
    items: [
      { label: 'Dashboard', href: '/org-admin', icon: BarChart3 },
      { label: 'Reports', href: '/org-admin#reports', icon: CalendarDays },
      { label: 'Settings', href: '/org-admin#settings', icon: Settings2 }
    ]
  }
];

export default function OrgAdminSideNavigation({ activePath = '/org-admin' }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`app-sidenav admin-only-sidenav ${isCollapsed ? 'app-sidenav-collapsed' : ''}`}>
      <div className="sidenav-top">
        <a className="sidenav-brand" href="/org-admin" title="Org Admin">
          <span>O</span>
          <strong>Org Admin</strong>
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
      <nav className="sidenav-accordion" aria-label="Organization admin navigation">
        {orgAdminGroups.map(({ label, icon: Icon, items }, index) => (
          <details key={label} open={index === 0}>
            <summary title={isCollapsed ? label : undefined}>
              <span>
                <Icon size={17} />
                <span>{label}</span>
              </span>
              {!isCollapsed && <ChevronDown size={16} />}
            </summary>
            <div>
              {items.map(({ label: itemLabel, href, icon: ItemIcon }) => (
                <a
                  className={href === activePath ? 'active' : ''}
                  href={href}
                  key={`${label}-${itemLabel}`}
                  title={isCollapsed ? itemLabel : undefined}
                >
                  <ItemIcon size={15} />
                  <span>{itemLabel}</span>
                </a>
              ))}
            </div>
          </details>
        ))}
      </nav>
      <div className="sidenav-footer">
        <LogoutButton audience="org" collapsed={isCollapsed} />
      </div>
    </aside>
  );
}
