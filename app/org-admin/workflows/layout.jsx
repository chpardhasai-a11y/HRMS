"use client";

import { usePathname } from "next/navigation";
import Breadcrumbs from "../../components/Breadcrumbs";
import "./workflows.css";

const basePath = "/org-admin/workflows";
const pageLabels = {
  builder: "Workflow Builder",
  tasks: "Task Inbox",
  templates: "Templates",
  monitoring: "Monitoring",
  forms: "Submit Request",
};

export default function WorkflowLayout({ children }) {
  const pathname = usePathname();
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
        {children}
      </div>
    </main>
  );
}
