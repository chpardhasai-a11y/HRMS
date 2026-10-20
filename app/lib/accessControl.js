export function permissionForPage(path) {
  if (path === "/org-admin") return "employees.findAll";
  if (path.startsWith("/org-admin/onboarding"))
    return "employees.getOnboardingQueue";
  if (path.startsWith("/org-admin/approvals")) return "approvals.findAll";
  if (path.startsWith("/org-admin/employees/")) return "employees.findOne";
  const master = path.match(/^\/org-admin\/masters\/([^/#]+)/);
  if (master) return `org-masters.${master[1]}.findAll`;
  if (path.startsWith("/org-admin/workflows/builder")) return "workflows.get";
  if (path.startsWith("/org-admin/workflows/templates"))
    return "workflows.templates";
  if (path === "/org-admin/workflows") return "workflows.list";
  return null;
}
export function canOpenOrganizationPage(user, path) {
  if (user?.role === "org_admin") return true;
  if (user?.role !== "employee" || path.startsWith("/org-admin/access-control"))
    return false;
  if (
    ["/org-admin/workflows/tasks", "/org-admin/workflows/monitoring"].some(
      (p) => path.startsWith(p),
    ) ||
    path.startsWith("/org-admin/workflows/forms/")
  )
    return true;
  const key = permissionForPage(path);
  return !!key && !!user.permissions?.includes(key);
}
export function firstOrganizationPage(user) {
  const choices = [
    "/org-admin",
    "/org-admin/onboarding",
    "/org-admin/approvals",
    ...[
      "legal-entities",
      "business-units",
      "departments",
      "job-families",
      "job-titles",
      "grade-bands",
      "pay-components",
      "employment-types",
      "work-modes",
      "work-shifts",
      "holiday-calendars",
      "locations",
      "cost-centers",
    ].map((s) => `/org-admin/masters/${s}`),
    "/org-admin/workflows",
  ];
  return choices.find((p) => canOpenOrganizationPage(user, p)) || "/";
}
