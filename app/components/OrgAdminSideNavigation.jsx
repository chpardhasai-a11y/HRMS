import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  FileCheck2,
  FileText,
  GitBranch,
  Network,
  Settings2,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound
} from 'lucide-react';
import LogoutButton from './LogoutButton';

const orgAdminGroups = [
  {
    label: 'People Operations',
    icon: UsersRound,
    items: [
      { label: 'Employee Master', href: '/org-admin#employees', icon: UserRound },
      { label: 'Lifecycle Changes', href: '/org-admin#lifecycle', icon: GitBranch },
      { label: 'Bulk Upload & Import', href: '/org-admin#bulk', icon: Upload }
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
      { label: 'Approvals', href: '/org-admin#governance', icon: ShieldCheck }
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
  return (
    <aside className="app-sidenav admin-only-sidenav">
      <a className="sidenav-brand" href="/org-admin">
        <span>O</span>
        <strong>Org Admin</strong>
      </a>
      <nav className="sidenav-accordion" aria-label="Organization admin navigation">
        {orgAdminGroups.map(({ label, icon: Icon, items }, index) => (
          <details key={label} open={index === 0}>
            <summary>
              <span><Icon size={17} /><span>{label}</span></span>
              <ChevronDown size={16} />
            </summary>
            <div>
              {items.map(({ label: itemLabel, href, icon: ItemIcon }) => (
                <a className={href === activePath ? 'active' : ''} href={href} key={`${label}-${itemLabel}`}>
                  <ItemIcon size={15} />
                  <span>{itemLabel}</span>
                </a>
              ))}
            </div>
          </details>
        ))}
      </nav>
      <div className="sidenav-footer">
        <LogoutButton audience="org" />
      </div>
    </aside>
  );
}
