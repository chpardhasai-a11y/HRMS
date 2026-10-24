"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import { getStoredUser } from "../../lib/hrmsApi";
import { canOpenOrganizationPage } from "../../lib/accessControl";
import "./workflows.css";

const basePath = "/org-admin/workflows";
const sections = [
  { slug: "", label: "Workflows" },
  { slug: "tasks", label: "Task Inbox" },
  { slug: "templates", label: "Templates" },
  { slug: "monitoring", label: "Monitoring" },
];
const pageLabels = {
  builder: "Workflow Builder",
  tasks: "Task Inbox",
  templates: "Templates",
  monitoring: "Monitoring",
  forms: "Submit Request",
};

export default function WorkflowLayout({ children }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);
  const section = pathname?.slice(basePath.length).split("/")[1];
  const items = [
    { label: "Organization Admin", href: "/org-admin" },
    { label: "Workflows", href: basePath },
  ];
  if (pageLabels[section]) items.push({ label: pageLabels[section] });

  return (
    <main className="flow-workspace">
      <div className="flow-main">
        <Breadcrumbs items={items} />
        <nav className="flow-section-nav" aria-label="Workflow sections">
          {sections.map(({ slug, label }) => {
            const href = `${basePath}${slug ? `/${slug}` : ""}`;
            if (
              user?.role === "employee" &&
              !canOpenOrganizationPage(user, href)
            )
              return null;
            const active = slug
              ? section === slug ||
                (slug === "monitoring" && section === "instances")
              : !section || section === "builder" || section === "forms";
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </main>
  );
}
