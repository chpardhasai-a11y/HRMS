"use client";

import AdminRouteGuard from "../components/AdminRouteGuard";
import OrgAdminSideNavigation from "../components/OrgAdminSideNavigation";
import { usePathname } from "next/navigation";

export default function OrgAdminLayout({ children }) {
  const pathname = usePathname();

  if (pathname?.includes("/login") || pathname?.includes("password")) {
    return children;
  }

  return (
    <div className="app-shell-with-nav">
      <OrgAdminSideNavigation activePath={pathname || "/org-admin"} />
      {pathname?.startsWith("/org-admin/workflows") ? (
        children
      ) : (
        <AdminRouteGuard allowedRole="org_admin">{children}</AdminRouteGuard>
      )}
    </div>
  );
}
