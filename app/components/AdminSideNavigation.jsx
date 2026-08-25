import {
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  MapPin,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound
} from 'lucide-react';

const adminGroups = [
  {
    label: 'Admin Console',
    icon: LayoutDashboard,
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Employees', href: '/admin#employees', icon: UsersRound },
      { label: 'Profile Sections', href: '/admin#sections', icon: ClipboardList },
      { label: 'Governance', href: '/admin#governance', icon: ShieldCheck }
    ]
  },
  {
    label: 'Core HR Masters',
    icon: SlidersHorizontal,
    items: [
      { label: 'Organization Setup', href: '/admin#masters', icon: Building2 },
      { label: 'Employment Setup', href: '/admin#masters', icon: BriefcaseBusiness },
      { label: 'Location Setup', href: '/admin#masters', icon: MapPin },
      { label: 'Document Setup', href: '/admin#masters', icon: FileCheck2 }
    ]
  },
  {
    label: 'Sensitive Setup',
    icon: Settings2,
    items: [
      { label: 'Bank Setup', href: '/admin#masters', icon: Banknote },
      { label: 'Statutory Setup', href: '/admin#masters', icon: IdCard },
      { label: 'Education Setup', href: '/admin#masters', icon: GraduationCap },
      { label: 'Salary Setup', href: '/admin#masters', icon: CircleDollarSign },
      { label: 'Readiness Rules', href: '/admin#sections', icon: BadgeCheck }
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
        {adminGroups.map(({ label, icon: Icon, items }) => (
          <details key={label} open>
            <summary>
              <span><Icon size={17} />{label}</span>
              <ChevronDown size={16} />
            </summary>
            <div>
              {items.map(({ label: itemLabel, href, icon: ItemIcon }) => (
                <a className={href === activePath ? 'active' : ''} href={href} key={`${label}-${itemLabel}`}>
                  <ItemIcon size={15} />
                  {itemLabel}
                </a>
              ))}
            </div>
          </details>
        ))}
      </nav>
    </aside>
  );
}
