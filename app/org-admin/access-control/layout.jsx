"use client";
import AdminRouteGuard from "../../components/AdminRouteGuard";
import "./access-control.css";
export default function AccessControlLayout({ children }) {
  return <AdminRouteGuard allowedRole="org_admin">{children}</AdminRouteGuard>;
}
