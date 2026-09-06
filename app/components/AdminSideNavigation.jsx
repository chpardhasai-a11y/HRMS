import {
  BarChart3,
  Banknote,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Database,
  FileCheck2,
  FileText,
  GitBranch,
  GraduationCap,
  IdCard,
  Laptop,
  MapPin,
  Network,
  PackageCheck,
  Plug,
  Settings2,
  ShieldCheck,
  Upload,
  UserRound,
  Workflow,
  UsersRound
} from 'lucide-react';

const adminGroups = [
  {
    label: 'Company Control',
    icon: Building2,
    items: [
      { label: 'Company Management', href: '/admin/companies', icon: Building2 },
      { label: 'Selected Company Dashboard', href: '/admin', icon: BarChart3 },
      { label: 'Company Settings', href: '/admin/companies#settings', icon: Settings2 }
    ]
  },
  {
    label: 'People Operations',
    icon: UsersRound,
    items: [
      { label: 'Employee Master', href: '/admin#employees', icon: UserRound },
      { label: 'Lifecycle Changes', href: '/admin#lifecycle', icon: GitBranch },
      { label: 'Bulk Upload & Import', href: '/admin#bulk', icon: Upload },
      { label: 'Data Change Requests', href: '/admin#governance', icon: ClipboardList }
    ]
  },
  {
    label: 'Org Structure',
    icon: Network,
    items: [
      { label: 'Legal Entities', href: '/admin#structure', icon: Building2 },
      { label: 'Departments & Teams', href: '/admin#structure', icon: Network },
      { label: 'Jobs, Grades & Locations', href: '/admin#structure', icon: BriefcaseBusiness },
      { label: 'Reporting Matrix', href: '/admin#structure', icon: Workflow }
    ]
  },
  {
    label: 'Payroll & Benefits',
    icon: CircleDollarSign,
    items: [
      { label: 'Compensation Setup', href: '/admin#payroll', icon: CircleDollarSign },
      { label: 'Bank & Payment Info', href: '/admin#payroll', icon: Banknote },
      { label: 'Benefits Eligibility', href: '/admin#payroll', icon: PackageCheck },
      { label: 'Statutory Details', href: '/admin#payroll', icon: IdCard }
    ]
  },
  {
    label: 'Policy & Workflow',
    icon: ShieldCheck,
    items: [
      { label: 'HR Policies', href: '/admin#governance', icon: FileText },
      { label: 'Approvals & Escalations', href: '/admin#governance', icon: Workflow },
      { label: 'Access & Role Management', href: '/admin#governance', icon: ShieldCheck },
      { label: 'Compliance Calendar', href: '/admin#governance', icon: CalendarDays }
    ]
  },
  {
    label: 'Documents & Communication',
    icon: FileCheck2,
    items: [
      { label: 'Document Management', href: '/admin#documents', icon: FileCheck2 },
      { label: 'Letter Templates', href: '/admin#documents', icon: FileText },
      { label: 'Notifications & Reminders', href: '/admin#governance', icon: Bell }
    ]
  },
  {
    label: 'Assets & Integrations',
    icon: Laptop,
    items: [
      { label: 'Asset Mapping', href: '/admin#assets', icon: Laptop },
      { label: 'Locations & Facilities', href: '/admin#structure', icon: MapPin },
      { label: 'System Integrations', href: '/admin#reports', icon: Plug },
      { label: 'Master Data', href: '/admin#masters', icon: Database }
    ]
  },
  {
    label: 'Reports',
    icon: BarChart3,
    items: [
      { label: 'HR Dashboard', href: '/admin#reports', icon: BarChart3 },
      { label: 'Headcount Reports', href: '/admin#reports', icon: UsersRound },
      { label: 'Education & Skills', href: '/admin#reports', icon: GraduationCap }
    ]
  }
];

export default function AdminSideNavigation({ activePath = '/admin' }) {
  return (
    <aside className="app-sidenav admin-only-sidenav">
      <a className="sidenav-brand" href="/admin">
        <span>A</span>
        <strong>Admin</strong>
      </a>
      <nav className="sidenav-accordion" aria-label="Admin navigation">
        {adminGroups.map(({ label, icon: Icon, items }, index) => (
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
    </aside>
  );
}
