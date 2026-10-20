"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  canOpenOrganizationPage,
  firstOrganizationPage,
} from "../lib/accessControl";
import { refreshStoredUser, hasSession } from "../lib/hrmsApi";

const roleHome = {
  platform_admin: "/platform-admin",
  org_admin: "/org-admin",
  employee: "/",
};

export default function AdminRouteGuard({ allowedRole, children }) {
  const [isAllowed, setIsAllowed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!hasSession()) {
      window.location.href =
        allowedRole === "platform_admin"
          ? "/platform-admin/login"
          : "/org-admin/login";
      return;
    }

    let live = true;
    setIsAllowed(false);
    refreshStoredUser()
      .then((user) => {
        if (!live) return;
        if (
          user?.role === allowedRole ||
          (allowedRole === "org_admin" &&
            canOpenOrganizationPage(user, pathname))
        ) {
          setIsAllowed(true);
          return;
        }
        window.location.href =
          user?.role === "employee"
            ? firstOrganizationPage(user)
            : roleHome[user?.role] || "/login";
      })
      .catch(() => {
        if (live)
          window.location.href =
            allowedRole === "platform_admin"
              ? "/platform-admin/login"
              : "/org-admin/login";
      });
    return () => {
      live = false;
    };
  }, [allowedRole, pathname]);

  if (!isAllowed) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <strong>Checking access...</strong>
        </div>
      </main>
    );
  }

  return children;
}
