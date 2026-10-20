"use client";

import { useEffect, useRef, useState } from "react";
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
  Menu,
  X,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Upload,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getStoredUser, refreshStoredUser } from "../lib/hrmsApi";
import {
  canOpenOrganizationPage,
  firstOrganizationPage,
} from "../lib/accessControl";
import LogoutButton from "./LogoutButton";

const orgAdminGroups = [
  {
    label: "People Operations",
    icon: UsersRound,
    items: [
      { label: "Employee Master", href: "/org-admin", icon: UserRound },
      {
        label: "Onboarding Module",
        href: "/org-admin/onboarding",
        icon: UserCheck,
      },
      {
        label: "Pending Approvals",
        href: "/org-admin/approvals",
        icon: ShieldCheck,
      },
      {
        label: "Lifecycle Changes",
        href: "/org-admin#lifecycle",
        icon: GitBranch,
      },
      { label: "Bulk Upload & Import", href: "/org-admin#bulk", icon: Upload },
    ],
  },
  {
    label: "Workflows",
    icon: GitBranch,
    items: [
      { label: "Workflows", href: "/org-admin/workflows", icon: GitBranch },
      {
        label: "Task Inbox",
        href: "/org-admin/workflows/tasks",
        icon: FileText,
      },
      {
        label: "Templates",
        href: "/org-admin/workflows/templates",
        icon: FileText,
      },
      {
        label: "Monitoring",
        href: "/org-admin/workflows/monitoring",
        icon: Clock,
      },
    ],
  },
  {
    label: "Access Control",
    icon: ShieldCheck,
    items: [
      {
        label: "Overview",
        href: "/org-admin/access-control",
        icon: ShieldCheck,
      },
      {
        label: "User Management",
        href: "/org-admin/access-control/users",
        icon: UserRound,
      },
      {
        label: "Roles Management",
        href: "/org-admin/access-control/roles",
        icon: ShieldCheck,
      },
      {
        label: "Levels Management",
        href: "/org-admin/access-control/levels",
        icon: Network,
      },
      {
        label: "Teams Management",
        href: "/org-admin/access-control/teams",
        icon: UsersRound,
      },
      {
        label: "Permissions Management",
        href: "/org-admin/access-control/permissions",
        icon: FileCheck2,
      },
    ],
  },
  {
    label: "Master Catalog",
    icon: Database,
    items: [
      {
        label: "Legal Entities",
        href: "/org-admin/masters/legal-entities",
        icon: Building2,
      },
      {
        label: "Business Units",
        href: "/org-admin/masters/business-units",
        icon: Network,
      },
      {
        label: "Departments",
        href: "/org-admin/masters/departments",
        icon: Network,
      },
      {
        label: "Job Families",
        href: "/org-admin/masters/job-families",
        icon: FolderTree,
      },
      {
        label: "Job Titles / Designations",
        href: "/org-admin/masters/job-titles",
        icon: Briefcase,
      },
      {
        label: "Grades & Salary Bands",
        href: "/org-admin/masters/grade-bands",
        icon: Award,
      },
      {
        label: "Pay Components",
        href: "/org-admin/masters/pay-components",
        icon: Coins,
      },
      {
        label: "Employment Types",
        href: "/org-admin/masters/employment-types",
        icon: UserCheck,
      },
      {
        label: "Work Modes",
        href: "/org-admin/masters/work-modes",
        icon: Laptop,
      },
      {
        label: "Work Shifts & Schedules",
        href: "/org-admin/masters/work-shifts",
        icon: Clock,
      },
      {
        label: "Holiday Calendars",
        href: "/org-admin/masters/holiday-calendars",
        icon: Calendar,
      },
      {
        label: "Office Locations",
        href: "/org-admin/masters/locations",
        icon: MapPin,
      },
      {
        label: "Cost Centers",
        href: "/org-admin/masters/cost-centers",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "Org Structure",
    icon: Network,
    items: [
      {
        label: "Departments & Teams",
        href: "/org-admin#structure",
        icon: Network,
      },
      {
        label: "Jobs, Grades & Locations",
        href: "/org-admin#structure",
        icon: Building2,
      },
      {
        label: "Reporting Matrix",
        href: "/org-admin#structure",
        icon: GitBranch,
      },
    ],
  },
  {
    label: "Documents & Policy",
    icon: FileCheck2,
    items: [
      { label: "Documents", href: "/org-admin#documents", icon: FileCheck2 },
      {
        label: "Letter Templates",
        href: "/org-admin#documents",
        icon: FileText,
      },
      {
        label: "Approvals & Governance",
        href: "/org-admin/approvals",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "Reports & Settings",
    icon: BarChart3,
    items: [
      { label: "Dashboard", href: "/org-admin", icon: BarChart3 },
      { label: "Reports", href: "/org-admin#reports", icon: CalendarDays },
      { label: "Settings", href: "/org-admin#settings", icon: Settings2 },
    ],
  },
];

export default function OrgAdminSideNavigation({ activePath = "/org-admin" }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileToggle = useRef(null);
  const isAccessControl = activePath.startsWith("/org-admin/access-control");
  useEffect(() => {
    setMobileOpen(false);
  }, [activePath]);
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        mobileToggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [mobileOpen]);
  const [user, setUser] = useState(null);
  useEffect(() => {
    let live = true;
    setUser(getStoredUser());
    refreshStoredUser()
      .then((u) => {
        if (live) setUser(u);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const groups =
    user?.role === "employee"
      ? orgAdminGroups
          .map((g) => ({
            ...g,
            items: g.items.filter(
              (i) => i.href && canOpenOrganizationPage(user, i.href),
            ),
          }))
          .filter((g) => g.items.length)
      : orgAdminGroups;

  return (
    <aside
      className={`app-sidenav admin-only-sidenav ${isCollapsed ? "app-sidenav-collapsed" : ""} ${isAccessControl ? "access-sidenav" : ""} ${mobileOpen ? "access-sidenav-mobile-open" : ""}`}
    >
      <div className="sidenav-top">
        <a
          className="sidenav-brand"
          href={
            user?.role === "employee"
              ? firstOrganizationPage(user)
              : "/org-admin"
          }
          title="Org Admin"
        >
          <span>O</span>
          <strong>Org Admin</strong>
        </a>
        <button
          className="sidenav-toggle"
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
        {isAccessControl && (
          <button
            ref={mobileToggle}
            type="button"
            className="access-mobile-nav-toggle"
            aria-label={
              mobileOpen
                ? "Close organization navigation"
                : "Open organization navigation"
            }
            aria-expanded={mobileOpen}
            aria-controls="org-admin-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>
      <nav
        id="org-admin-navigation"
        className="sidenav-accordion"
        aria-label="Organization admin navigation"
      >
        {groups.map(({ label, icon: Icon, items }, index) => {
          const isOpen = items.some(
            (item) =>
              activePath === item.href ||
              (item.href &&
                item.href !== "/org-admin" &&
                activePath.startsWith(item.href)),
          );
          return (
            <details key={label} open={index === 0 || isOpen}>
              <summary title={isCollapsed ? label : undefined}>
                <span>
                  <Icon size={17} />
                  <span>{label}</span>
                </span>
                {!isCollapsed && <ChevronDown size={16} />}
              </summary>
              <div>
                {items.map(
                  ({ label: itemLabel, href, icon: ItemIcon, comingNext }) =>
                    comingNext ? (
                      <div
                        className="sidenav-coming-next"
                        aria-disabled="true"
                        key={itemLabel}
                        title={`${itemLabel} — Coming next`}
                      >
                        <ItemIcon size={15} />
                        <span>{itemLabel}</span>
                        <small>Coming next</small>
                      </div>
                    ) : (
                      <a
                        className={
                          activePath === href ||
                          (href === "/org-admin/workflows" &&
                            activePath.startsWith(`${href}/builder`))
                            ? "active"
                            : ""
                        }
                        href={href}
                        key={`${label}-${itemLabel}`}
                        title={isCollapsed ? itemLabel : undefined}
                      >
                        <ItemIcon size={15} />
                        <span>{itemLabel}</span>
                      </a>
                    ),
                )}
              </div>
            </details>
          );
        })}
      </nav>
      <div className="sidenav-footer">
        {user?.role === "employee" && (
          <a href="/" className="sidenav-self-service">
            Employee self-service
          </a>
        )}
        <LogoutButton audience="org" collapsed={isCollapsed} />
      </div>
    </aside>
  );
}
